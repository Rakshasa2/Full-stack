import requests
import json


def test_lm_studio():
    """Тест подключения к LM Studio"""
    print("🧪 Тестирование подключения к LM Studio...")

    try:
        # 1. Проверка доступности сервера
        response = requests.get("http://127.0.0.1:1234/v1/models", timeout=10)
        if response.status_code == 200:
            models = response.json()
            print("✅ LM Studio сервер запущен!")
            print(f"📊 Доступные модели: {len(models.get('data', []))}")

            for model in models.get('data', []):
                print(f"   - {model.get('id', 'Unknown')}")
        else:
            print(f"❌ Ошибка сервера: {response.status_code}")
            return False

        # 2. Тест генерации
        print("\n🧪 Тест генерации...")
        test_prompt = {
            "model": "llama2-7b-instruct",
            "messages": [
                {"role": "user", "content": "Напиши функцию 'Hello World' на Python"}
            ],
            "max_tokens": 100,
            "temperature": 0.3
        }

        response = requests.post(
            "http://localhost:1234/v1/chat/completions",
            json=test_prompt,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            generated_text = result["choices"][0]["message"]["content"]
            print("✅ Генерация работает!")
            print(f"📝 Ответ: {generated_text}")
            return True
        else:
            print(f"❌ Ошибка генерации: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Не удалось подключиться к LM Studio")
        print("💡 Убедитесь, что:")
        print("   - LM Studio запущен")
        print("   - Сервер работает на localhost:1234")
        print("   - Модель загружена")
        return False

    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False


if __name__ == "__main__":
    test_lm_studio()