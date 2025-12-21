from typing import Dict, Any, List, Optional
import logging
import re
from datetime import datetime
import time
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError

logger = logging.getLogger(__name__)

try:
    from .lm_studio_client import lm_studio_client

    logger.info("✅ Клиент LM Studio успешно импортирован")
except ImportError as e:
    logger.error(f"❌ Не удалось импортировать lm_studio_client: {e}")


    class MockLMStudioClient:
        def is_ready(self):
            return False

        def generate_documentation(self, code, context):
            return {"documentation": [{"content": "LM Studio недоступна"}], "success": False}


    lm_studio_client = MockLMStudioClient()

# Глобальный пул потоков для ML операций
ML_THREAD_POOL = ThreadPoolExecutor(max_workers=2)
TIMEOUT_SECONDS = 25
REQUEST_SEMAPHORE = threading.Semaphore(1)


class MLGenerator:
    def __init__(self, use_lm_studio: bool = True):
        self.use_lm_studio = use_lm_studio
        self.cache = {}
        logger.info(f"✅ MLGenerator инициализирован (use_lm_studio={use_lm_studio})")

    def generate_documentation(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        file_path = context.get("file_path", "unknown.py")
        language = context.get("language", "python")

        logger.info(f"📄 Генерация документации для {file_path} ({len(code)} chars)")

        try:
            structure = self._analyze_structure(code, language)

            if self._should_use_fallback(code, structure):
                logger.info(f"🔄 Используем быстрый fallback для {file_path}")
                return self._generate_fast_docs(code, file_path, structure, start_time)

            ai_result = None
            if self.use_lm_studio:
                ai_result = self._get_ai_documentation_with_timeout(code, file_path, language)

            if ai_result and ai_result.get("success"):
                formatted_docs = self._format_documentation(ai_result, file_path, structure)
                confidence = 0.9
                source = "lm_studio"
            else:
                formatted_docs = self._generate_smart_docs(code, file_path, structure)
                confidence = 0.5
                source = "fallback"

            generation_time = time.time() - start_time

            logger.info(f"✅ Документация для {file_path} сгенерирована за {generation_time:.2f} сек")

            return {
                "documentation": formatted_docs,
                "ai_documentation": ai_result.get("documentation", [{"content": ""}])[0].get("content",
                                                                                             "") if ai_result else "",
                "functions": structure.get("functions", []),
                "confidence": confidence,
                "generation_time": round(generation_time, 2),
                "file_type": self._detect_file_type(file_path, code),
                "source": source,
                "status": "success",
                "structure": {
                    "total_lines": structure.get("total_lines", 0),
                    "function_count": structure.get("function_count", 0),
                    "class_count": structure.get("class_count", 0)
                }
            }

        except Exception as e:
            logger.error(f"❌ Критическая ошибка генерации документации: {e}")
            return self._generate_fallback_docs(code, file_path, start_time, str(e))

    def _get_ai_documentation_with_timeout(self, code: str, file_path: str, language: str) -> Optional[Dict[str, Any]]:
        with REQUEST_SEMAPHORE:
            try:
                future = ML_THREAD_POOL.submit(
                    self._get_ai_documentation_sync,
                    code, file_path, language
                )
                return future.result(timeout=TIMEOUT_SECONDS)
            except TimeoutError:
                logger.warning(f"⏰ Таймаут запроса к LM Studio для {file_path}")
                return None
            except Exception as e:
                logger.error(f"Ошибка при запросе к LM Studio: {e}")
                return None

    def _get_ai_documentation_sync(self, code: str, file_path: str, language: str) -> Dict[str, Any]:
        try:
            max_code_length = 1200
            if len(code) > max_code_length:
                lines = code.split('\n')
                if len(lines) > 20:
                    code_for_request = '\n'.join(lines[:15] + ['... [код сокращен] ...'] + lines[-5:])
                else:
                    code_for_request = code[:max_code_length]
                logger.info(f"📉 Код сокращен для {file_path}: {len(code)} → {len(code_for_request)} chars")
            else:
                code_for_request = code

            from .lm_studio_client import lm_studio_client

            result = lm_studio_client.generate_documentation(
                code=code_for_request,
                context={
                    "language": language,
                    "file_path": file_path,
                    "timestamp": time.time(),
                    "hint": "Краткое описание"
                }
            )

            return result

        except ImportError:
            logger.warning("LM Studio клиент не найден")
            return {"success": False, "documentation": [{"content": ""}]}
        except Exception as e:
            logger.error(f"Ошибка в _get_ai_documentation_sync: {e}")
            return {"success": False, "documentation": [{"content": ""}], "error": str(e)}

    def _should_use_fallback(self, code: str, structure: Dict[str, Any]) -> bool:
        if len(code) < 100:
            return True
        if structure.get("function_count", 0) == 0 and structure.get("class_count", 0) == 0:
            return True
        if 'test' in structure.get("file_path", "").lower():
            return True
        return False

    def _generate_fast_docs(self, code: str, file_path: str, structure: Dict[str, Any], start_time: float) -> Dict[
        str, Any]:
        docs = f"""# {file_path}
*Сгенерировано автоматически*

**Основная информация:**
- 📏 Строк кода: {structure.get('total_lines', 0)}
- 🏗️ Функций: {structure.get('function_count', 0)}
- 🏛️ Классов: {structure.get('class_count', 0)}

**Краткое описание:**
{self._generate_brief_description(code, file_path)}

**Структура:**
{chr(10).join([f"- {f['name']}() (строка {f['line']})" for f in structure.get('functions', [])])}
{chr(10).join([f"- class {c['name']} (строка {c['line']})" for c in structure.get('classes', [])])}
"""

        return {
            "documentation": docs,
            "ai_documentation": "",
            "functions": structure.get("functions", []),
            "confidence": 0.6,
            "generation_time": round(time.time() - start_time, 2),
            "file_type": self._detect_file_type(file_path, code),
            "source": "fast_fallback",
            "status": "success",
            "structure": {
                "total_lines": structure.get("total_lines", 0),
                "function_count": structure.get("function_count", 0),
                "class_count": structure.get("class_count", 0)
            }
        }

    def _generate_smart_docs(self, code: str, file_path: str, structure: Dict[str, Any]) -> str:
        imports = self._extract_imports(code)
        functions_info = []

        for func in structure.get("functions", []):
            func_info = f"**{func['name']}()**"
            if func.get('type'):
                func_info += f" - {func['type']}"
            functions_info.append(func_info)

        docs = f"""# 📄 {file_path}
*Сгенерировано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*

---

## 📋 Основная информация
**Размер:** {structure.get('total_lines', 0)} строк
**Сложность:** {self._estimate_complexity(code)}
**Тип файла:** {self._detect_file_type(file_path, code)}

---

## 📦 Импорты
{chr(10).join([f"- `{imp}`" for imp in imports[:10]]) if imports else "Нет импортов"}

---

## 🏗️ Структура
**Функции ({structure.get('function_count', 0)}):**
{chr(10).join([f"- {info}" for info in functions_info]) if functions_info else "Нет функций"}

**Классы ({structure.get('class_count', 0)}):**
{chr(10).join([f"- `{c['name']}` (строка {c['line']})" for c in structure.get('classes', [])]) if structure.get('classes') else "Нет классов"}

---

## 💡 Рекомендации
{self._generate_recommendations(code, structure)}

---

⚠️ *AI анализ временно недоступен. Использован быстрый режим.*"""

        return docs

    def _extract_imports(self, code: str) -> List[str]:
        imports = []
        lines = code.split('\n')
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith('import ') or line_stripped.startswith('from '):
                imports.append(line_stripped)
        return imports[:15]

    def _estimate_complexity(self, code: str) -> str:
        lines = code.split('\n')
        line_count = len(lines)
        if line_count < 20:
            return "Низкая"
        elif line_count < 100:
            return "Средняя"
        else:
            return "Высокая"

    def _generate_brief_description(self, code: str, file_path: str) -> str:
        file_lower = file_path.lower()
        if 'test' in file_lower:
            return "Тестовый файл. Содержит unit-тесты."
        elif 'model' in file_lower:
            return "Файл модели данных."
        elif 'view' in file_lower or 'template' in file_lower:
            return "Файл представления."
        elif 'controller' in file_lower or 'handler' in file_lower:
            return "Контроллер."
        elif 'util' in file_lower or 'helper' in file_lower:
            return "Вспомогательный файл."
        elif 'config' in file_lower or 'settings' in file_lower:
            return "Файл конфигурации."
        else:
            return "Основной файл модуля."

    def _generate_recommendations(self, code: str, structure: Dict[str, Any]) -> str:
        recommendations = []
        if '"""' not in code and "'''" not in code:
            recommendations.append("Добавьте docstrings к функциям и классам")
        if structure.get("function_count", 0) > 15:
            recommendations.append("Рассмотрите возможность разделения на несколько модулей")
        if not recommendations:
            return "Код выглядит хорошо структурированным."
        else:
            return chr(10).join([f"- {rec}" for rec in recommendations])

    def _analyze_structure(self, code: str, language: str) -> Dict[str, Any]:
        lines = code.split('\n')
        functions = []
        classes = []

        if language in ['python', 'py']:
            for i, line in enumerate(lines):
                line_stripped = line.strip()
                if line_stripped.startswith('class '):
                    class_name = line_stripped[6:].split('(')[0].split(':')[0].split()[0].strip()
                    classes.append({"name": class_name, "line": i + 1, "type": "class"})
                elif line_stripped.startswith('def '):
                    func_def = line_stripped[4:].split('(')
                    func_name = func_def[0].strip()
                    params = []
                    if len(func_def) > 1:
                        params_text = func_def[1].split(')')[0]
                        params = [p.strip().split('=')[0] for p in params_text.split(',') if p.strip()]
                    functions.append({
                        "name": func_name,
                        "line": i + 1,
                        "type": self._guess_function_type(func_name),
                        "params": params
                    })

        return {
            "total_lines": len(lines),
            "functions": functions,
            "classes": classes,
            "function_count": len(functions),
            "class_count": len(classes)
        }

    def _guess_function_type(self, func_name: str) -> str:
        func_lower = func_name.lower()
        type_map = {
            'get_': 'Получение данных',
            'set_': 'Установка данных',
            'add_': 'Добавление',
            'create_': 'Создание',
            'update_': 'Обновление',
            'delete_': 'Удаление',
            'save_': 'Сохранение',
            'load_': 'Загрузка',
            'calculate_': 'Вычисления',
            'process_': 'Обработка',
            'validate_': 'Проверка',
            'test_': 'Тестирование',
        }
        for prefix, func_type in type_map.items():
            if func_lower.startswith(prefix):
                return func_type
        return "Операция"

    def _format_documentation(self, ai_result: Dict[str, Any], file_path: str,
                              structure: Dict[str, Any]) -> str:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ai_content = ""
        if ai_result.get("success") and ai_result.get("documentation"):
            docs = ai_result["documentation"]
            if docs and len(docs) > 0:
                ai_content = docs[0].get("content", "")
        if ai_content:
            ai_content = re.sub(r'^#+\s*.*?\n', '', ai_content, flags=re.MULTILINE)
            ai_content = ai_content.strip()

        docs = f"""# 📄 {file_path}
*Сгенерировано: {timestamp} | AI анализ | {structure.get('total_lines', 0)} строк*

---

## 🤖 AI Анализ
{ai_content if ai_content else "AI не предоставил детальный анализ."}

---

## 🏗️ Структура файла
**Всего функций:** {structure.get('function_count', 0)}
{chr(10).join([f"- `{f['name']}()` - {f.get('type', 'Операция')} (строка {f['line']})" for f in structure.get('functions', [])][:10])}

**Всего классов:** {structure.get('class_count', 0)}
{chr(10).join([f"- `{c['name']}` (строка {c['line']})" for c in structure.get('classes', [])][:5]) if structure.get('classes') else "Нет классов"}

---

✅ *Документация сгенерирована с использованием AI*"""

        return docs

    def _detect_file_type(self, file_path: str, code: str) -> str:
        file_lower = file_path.lower()
        if any(x in file_lower for x in ['test_', '_test', '.test.', 'spec.', '.spec']):
            return "test"
        elif 'conftest' in file_lower:
            return "test_config"
        elif 'main' in file_lower or '__main__' in code:
            return "main"
        elif any(x in file_lower for x in ['model', 'schema', 'dto']):
            return "model"
        elif any(x in file_lower for x in ['view', 'template', 'ui', 'component']):
            return "view"
        elif any(x in file_lower for x in ['controller', 'handler', 'route', 'api']):
            return "controller"
        elif any(x in file_lower for x in ['service', 'manager', 'provider']):
            return "service"
        elif any(x in file_lower for x in ['util', 'helper', 'tool', 'common']):
            return "utility"
        elif any(x in file_lower for x in ['config', 'settings', 'conf', 'setup']):
            return "config"
        elif any(x in file_lower for x in ['db', 'database', 'migration', 'seed']):
            return "database"
        else:
            return "module"

    def _generate_fallback_docs(self, code: str, file_path: str, start_time: float, error_msg: str = "") -> Dict[
        str, Any]:
        try:
            structure = self._analyze_structure(code, "python")
            docs = f"""# ⚠️ {file_path}
*Упрощенный режим из-за ошибки*

**Ошибка:** {error_msg[:200]}

**Базовая информация:**
- Строк кода: {structure.get('total_lines', 0)}
- Функций: {structure.get('function_count', 0)}
- Классов: {structure.get('class_count', 0)}"""

            return {
                "documentation": docs,
                "functions": structure.get("functions", []),
                "confidence": 0.3,
                "generation_time": round(time.time() - start_time, 2),
                "file_type": "error",
                "source": "error_fallback",
                "status": "error",
                "structure": {
                    "total_lines": structure.get("total_lines", 0),
                    "function_count": structure.get("function_count", 0),
                    "class_count": structure.get("class_count", 0)
                }
            }
        except Exception as e:
            return {
                "documentation": f"# {file_path}\nНе удалось проанализировать файл: {str(e)[:100]}",
                "functions": [],
                "confidence": 0.1,
                "generation_time": round(time.time() - start_time, 2),
                "file_type": "unknown",
                "source": "emergency",
                "status": "critical_error",
                "structure": {
                    "total_lines": 0,
                    "function_count": 0,
                    "class_count": 0
                }
            }


ml_generator = MLGenerator(use_lm_studio=True)