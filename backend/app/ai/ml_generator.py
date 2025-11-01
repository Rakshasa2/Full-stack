from typing import Dict, Any
import requests
import logging

logger = logging.getLogger(__name__)


class MLGenerator:
    def __init__(self):
        self.base_url = "http://127.0.0.1:1234"
        self.model = "local-model"

    def get_status(self) -> Dict[str, Any]:
        """Проверяет статус ML модели"""
        try:
            response = requests.get(f"{self.base_url}/v1/models", timeout=5)
            if response.status_code == 200:
                models = response.json().get("data", [])
                return {
                    "status": "ready",
                    "model_type": "LM Studio",
                    "device": "local",
                    "has_model": len(models) > 0,
                    "available_models": [model.get("id", "unknown") for model in models]
                }
            else:
                return {
                    "status": "error",
                    "model_type": "LM Studio",
                    "device": "local",
                    "has_model": False,
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            return {
                "status": "error",
                "model_type": "LM Studio",
                "device": "local",
                "has_model": False,
                "error": str(e)
            }

    def generate_documentation(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Генерирует документацию с помощью LM Studio"""
        language = context.get("language", "unknown")
        file_path = context.get("file_path", "unknown")

        system_prompt = """Ты - эксперт по документации кода. Сгенерируй подробную, понятную документацию на русском языке.

Требования к документации:
1. Опиши назначение файла/функции
2. Объясни основные функции и методы
3. Укажи параметры и возвращаемые значения
4. Приведи примеры использования
5. Отметь важные особенности и предупреждения
6. Используй Markdown форматирование
7. Будь точным и информативным"""

        user_prompt = f"""Проанализируй следующий {language} код из файла {file_path} и создай подробную документацию:

```{language}
{code}Сгенерируй качественную документацию в формате Markdown на русском языке."""
        try:
            # Сначала проверяем доступность сервиса
            status = self.get_status()
            if status["status"] != "ready":
                return self._create_fallback_documentation(code, language, "ML сервис недоступен")

            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1500,
                    "stream": False
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                documentation = result["choices"][0]["message"]["content"].strip()

                return {
                    "documentation": documentation,
                    "functions": self._extract_functions(documentation, code),
                    "confidence": 0.85
                }
            else:
                logger.error(f"Ошибка AI запроса: {response.status_code} - {response.text}")
                return self._create_fallback_documentation(code, language, f"HTTP {response.status_code}")

        except Exception as e:
            logger.error(f"Ошибка подключения к AI сервису: {e}")
            return self._create_fallback_documentation(code, language, str(e))

    def _extract_functions(self, documentation: str, code: str) -> list:
        """Извлекает информацию о функциях из документации и кода"""
        functions = []

        # Простая эвристика для поиска функций в коде
        lines = code.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            # Ищем объявления функций/методов
            if line.startswith(('def ', 'async def ', 'function ', 'func ', 'public ', 'private ')):
                # Извлекаем имя функции
                if line.startswith('def ') or line.startswith('async def '):
                    func_name = line.split('(')[0].replace('def ', '').replace('async def ', '').strip()
                elif line.startswith('function '):
                    func_name = line.split('(')[0].replace('function ', '').strip()
                else:
                    func_name = line.split('(')[0].strip()

                # Ищем следующую строку с описанием
                description = ""
                for j in range(i + 1, min(i + 3, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and not next_line.startswith(('def ', 'async def ', 'function ', 'class ')):
                        description = next_line
                        break

                functions.append({
                    "name": func_name,
                    "description": description,
                    "line": i + 1
                })

        return functions[:10]  # Ограничиваем количество функций

    def _create_fallback_documentation(self, code: str, language: str, error: str) -> Dict[str, Any]:
        """Создает fallback документацию при ошибке"""
        fallback_docs = f"""# Документация (автоматически сгенерирована)
        Язык: {language}
        Код: {code}
        Примечания
        Ошибка AI: {error}

        Рекомендуется проверить и дополнить документацию вручную
        """
        return {
            "documentation": fallback_docs,
            "functions": self._extract_functions(fallback_docs, code),
            "confidence": 0.1
        }
ml_generator = MLGenerator()