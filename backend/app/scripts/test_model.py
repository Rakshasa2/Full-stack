import sys
import os

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.ai.generator import doc_generator


def test_generator():
    """Тестируем генератор документации"""
    print("🧪 Тестируем генератор документации...")

    test_cases = [
        {
            "name": "Простая функция",
            "code": """
def calculate_sum(a, b):
    return a + b
""",
            "language": "python"
        },
        {
            "name": "Класс с методами",
            "code": """
class Calculator:
    def __init__(self):
        self.value = 0

    def add(self, x):
        self.value += x
        return self.value

    def reset(self):
        self.value = 0
""",
            "language": "python"
        }
    ]

    for test in test_cases:
        print(f"\n📝 Тест: {test['name']}")
        print(f"Код: {test['code'].strip()}")

        result = doc_generator.generate_documentation(test['code'], {"language": test['language']})

        print(f"   Результат:")
        print(f"   Модель: {result['model']}")
        print(f"   Функций найдено: {len(result['functions'])}")
        print(f"   Документация: {result['documentation'][:200]}...")


if __name__ == "__main__":
    test_generator()