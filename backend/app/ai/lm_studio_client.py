import os
import logging
import requests
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import concurrent.futures
import threading

load_dotenv('.env')

logger = logging.getLogger(__name__)

# Глобальный семафор для ограничения параллельных запросов
REQUEST_SEMAPHORE = threading.Semaphore(1)  # Только 1 запрос одновременно


class LMStudioClient:

    def __init__(self, config=None):
        self.config = config or {
            'base_url': os.getenv('LM_STUDIO_URL', 'http://localhost:1234'),
            'timeout': 20,
            'max_tokens': 300,
            'temperature': 0.05,
            'model_name': os.getenv('LM_STUDIO_MODEL', 'qwen2.5-coder-1.5b-instruct'),
            'enable_fallback': True,
            'cache_enabled': True,
            'max_code_length': 600
        }

        self.base_url = self.config['base_url']
        self.model_name = self.config['model_name']
        self.cache = {}
        self.last_health_check = 0
        self.health_check_interval = 30  # Проверять раз в 30 секунд

        logger.info(f" Оптимизированный LM Studio клиент инициализирован")
        logger.info(f" URL: {self.base_url}")
        logger.info(f" Модель: {self.model_name}")
        logger.info(f"️  Таймаут: {self.config['timeout']}с, Токены: {self.config['max_tokens']}")

    def is_ready(self) -> bool:
        """проверка доступности"""
        current_time = time.time()

        # Кэшируем результат проверки здоровья
        if current_time - self.last_health_check < self.health_check_interval:
            return True  # Предполагаем, что всё ещё работает

        try:
            response = requests.get(
                f"{self.base_url}/v1/models",
                timeout=1.5
            )

            if response.status_code == 200:
                self.last_health_check = current_time
                return True
        except:
            pass

        return False

    def generate_documentation(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """генерация документации с таймаутом"""
        start_time = time.time()
        file_path = context.get("file_path", "unknown.py")
        language = context.get("language", "python")

        # Кэширование для одинаковых запросов
        cache_key = f"{file_path}:{hash(code[:500])}"
        if self.config['cache_enabled'] and cache_key in self.cache:
            logger.debug(f"Используем кэш для {file_path}")
            return self.cache[cache_key]

        logger.info(f" Быстрая генерация для {file_path}")

        # Используем ThreadPoolExecutor для таймаута
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                self._generate_with_semaphore,
                code, file_path, language
            )

            try:
                result = future.result(timeout=18)  # Таймаут 18 секунд

                # Сохраняем в кэш
                if self.config['cache_enabled']:
                    self.cache[cache_key] = result

                generation_time = time.time() - start_time
                logger.info(f" Документация сгенерирована за {generation_time:.2f}с")

                return result

            except concurrent.futures.TimeoutError:
                logger.warning(f" Таймаут генерации для {file_path}")
                return self._generate_fallback_docs(code, file_path, start_time, "Таймаут генерации")
            except Exception as e:
                logger.error(f" Ошибка генерации: {e}")
                return self._generate_fallback_docs(code, file_path, start_time, str(e))

    def _generate_with_semaphore(self, code: str, file_path: str, language: str) -> Dict[str, Any]:
        """Генерация с ограничением параллельных запросов"""
        with REQUEST_SEMAPHORE:  # Ограничиваем 1 запрос одновременно
            return self._generate_documentation_internal(code, file_path, language)

    def _generate_documentation_internal(self, code: str, file_path: str, language: str) -> Dict[str, Any]:
        """Внутренняя логика генерации"""
        start_time = time.time()

        # Создаем УЛЬТРАКОРОТКИЙ промпт
        prompt = self._create_ultrafast_prompt(code, file_path, language)

        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": "Отвечай очень кратко. Максимум 100 слов."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 150,  # ОЧЕНЬ МАЛО токенов!
                    "temperature": 0.01,  # Почти детерминировано
                    "stream": False
                },
                timeout=15  # 15 секунд максимум
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                # Очищаем и форматируем ответ
                cleaned_content = self._clean_ai_response(content)

                generation_time = time.time() - start_time

                return {
                    "documentation": [{"content": cleaned_content}],
                    "success": True,
                    "generation_time": round(generation_time, 2)
                }
            else:
                logger.warning(f"LM Studio ошибка: {response.status_code}")
                raise Exception(f"HTTP {response.status_code}")

        except requests.exceptions.Timeout:
            logger.warning("⏰ Таймаут запроса к LM Studio")
            raise
        except Exception as e:
            logger.error(f"Ошибка запроса: {e}")
            raise

    def _create_ultrafast_prompt(self, code: str, file_path: str, language: str) -> str:
        """Создает промпт"""

        # Берем СУПЕР МАЛО кода для анализа
        max_chars = self.config['max_code_length']
        if len(code) > max_chars:
            # Берем только первые строки (самое важное)
            lines = code.split('\n')
            important_lines = []
            for line in lines[:20]:  # Первые 20 строк
                if line.strip() and not line.strip().startswith('#'):
                    important_lines.append(line[:100])  # Обрезаем длинные строки
            code_preview = '\n'.join(important_lines[:15]) + "\n..."
        else:
            code_preview = code

        prompt = f"""Опиши кратко (2-3 предложения) что делает этот код:

{code_preview}

Кратко:"""

        return prompt

    def _clean_ai_response(self, content: str) -> str:
        """Очищает и форматирует ответ AI"""
        if not content:
            return "Нет информации"

        # Удаляем лишние пробелы и переносы
        content = ' '.join(content.split())

        # Обрезаем слишком длинный ответ
        if len(content) > 500:
            content = content[:497] + "..."

        # Убираем повторяющиеся фразы
        lines = content.split('. ')
        unique_lines = []
        seen = set()

        for line in lines:
            line_key = line[:50].lower()
            if line_key not in seen and line.strip():
                unique_lines.append(line.strip())
                seen.add(line_key)

        return '. '.join(unique_lines[:5]) + ('.' if unique_lines else '')

    def _generate_fallback_docs(self, code: str, file_path: str, start_time: float,
                                error_msg: str = "") -> Dict[str, Any]:
        """Быстрая генерация fallback документации"""
        # Простой анализ кода
        lines = code.split('\n')
        functions = []
        classes = []

        for i, line in enumerate(lines[:50]):  # Только первые 50 строк для скорости
            line_stripped = line.strip()
            if line_stripped.startswith('def '):
                func_name = line_stripped[4:].split('(')[0].strip()
                functions.append(func_name)
            elif line_stripped.startswith('class '):
                class_name = line_stripped[6:].split('(')[0].split(':')[0].strip()
                classes.append(class_name)

        docs = f"""# {file_path}
*Сгенерировано в упрощенном режиме*

**Основное назначение:**
Это файл на Python, содержащий {'классы' if classes else 'функции'}.

**Структура:**
- Строк: {len(lines)}
- Функций: {len(functions)}
- Классов: {len(classes)}

**Основные элементы:**
{', '.join(classes[:3]) if classes else ', '.join(functions[:5])}

{'' + error_msg if error_msg else ''}"""

        return {
            "documentation": [{"content": docs}],
            "success": False,
            "error": error_msg,
            "generation_time": round(time.time() - start_time, 2)
        }

    def quick_test(self) -> Dict[str, Any]:
        """Быстрый тест производительности"""
        logger.info("🔍 Тестируем производительность LM Studio...")

        test_code = """def calculate_sum(a, b):
    return a + b

class Calculator:
    def multiply(self, x, y):
        return x * y"""

        start_time = time.time()

        try:
            result = self.generate_documentation(
                code=test_code,
                context={"file_path": "test.py", "language": "python"}
            )

            test_time = time.time() - start_time

            return {
                "success": result.get("success", False),
                "time": round(test_time, 2),
                "has_content": bool(result.get("documentation", [{}])[0].get("content")),
                "status": " Отлично" if test_time < 5 else "⚠️ Медленно" if test_time < 15 else "❌ Очень медленно"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "time": round(time.time() - start_time, 2),
                "status": " Ошибка"
            }


# Создаем оптимизированный экземпляр
lm_studio_client = LMStudioClient()