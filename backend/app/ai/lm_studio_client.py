import logging
import requests
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class LMStudioClient:
    def __init__(self, base_url: str = "http://127.0.0.1:1234", default_model: str = "codellama-7b-instruct"):
        self.base_url = base_url
        self.default_model = default_model
        self.timeout = 30

    async def check_connection(self) -> Dict[str, Any]:
        try:
            response = requests.get(f"{self.base_url}/v1/models", timeout=5)
            if response.status_code == 200:
                models = response.json().get("data", [])
                return {
                    "status": "connected",
                    "models": [model["id"] for model in models if "id" in model],
                    "default_model": self.default_model
                }
            return {"status": "error", "error": f"HTTP {response.status_code}", "details": response.text}
        except requests.exceptions.ConnectionError:
            return {"status": "disconnected", "error": "Не удалось подключиться к LM Studio"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def generate_documentation(self, code: str, language: str, context: Dict[str, Any] = None) -> str:
        try:
            language = language.lower().strip()
            context = context or {}

            system_prompt = "Сгенерируй качественную документацию на русском в Markdown. Опиши функциональность, параметры, примеры использования."
            user_prompt = f"Создай документацию для {language} кода:\n\n```{language}\n{code}\n```"

            documentation = self._make_ai_request(system_prompt, user_prompt)
            return self._clean_ai_response(documentation)

        except Exception as e:
            logger.error(f"Ошибка генерации документации: {e}")
            return f"# Документация\n\nОшибка: {str(e)}\n\n```{language}\n{code}\n```"

    async def chat_completion(self, messages: List[Dict[str, str]], model: str = None, **kwargs) -> Dict[str, Any]:
        model = model or self.default_model
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 4000,
            "stream": False
        }

        response = requests.post(f"{self.base_url}/v1/chat/completions", json=payload, timeout=self.timeout)
        if response.status_code == 200:
            return response.json()
        raise Exception(f"HTTP {response.status_code}: {response.text}")

    async def _make_ai_request(self, system_prompt: str, user_prompt: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        response = await self.chat_completion(messages=messages)
        return response["choices"][0]["message"]["content"]

    def _clean_ai_response(self, response: str) -> str:
        if not response.startswith('#'):
            response = "# Документация\n\n" + response
        return response.strip()

lm_studio_client = LMStudioClient()