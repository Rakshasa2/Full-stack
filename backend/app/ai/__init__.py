# AI сервис для интеграции с LM Studio
import requests
from typing import Optional


class LMStudioClient:
    def __init__(self, base_url: str = "http://localhost:1234"):
        self.base_url = base_url

    async def generate_documentation(self, code: str, language: str) -> str:
        """Генерация документации с помощью LM Studio"""

        system_prompt = """Ты - эксперт по документации кода. Сгенерируй подробную, понятную документацию на русском языке для предоставленного кода."""

        user_prompt = f"""Проанализируй следующий {language} код и создай подробную документацию:

```{language}
{code}Требования к документации:

Опиши назначение файла/функции

Объясни основные функции и методы

Укажи параметры и возвращаемые значения

Приведи примеры использования

Отметь важные особенности и предупреждения

Документация должна быть на русском языке в формате Markdown."""
        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": "llama2-7b-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                    "stream": False
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return f"Ошибка AI сервиса: {response.status_code}"

        except Exception as e:
            return f"Ошибка подключения к AI сервису: {str(e)}"