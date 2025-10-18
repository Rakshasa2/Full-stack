# test_auth.py
import requests

BASE_URL = "http://localhost:8000"


def test_auth_flow():
    # 1. Регистрация
    register_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    print(f"✅ Регистрация: {response.status_code}")
    if response.status_code == 200:
        print(f"   Создан пользователь: {response.json()}")

    # 2. Логин
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }

    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"✅ Логин: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"   Получен токен: {token[:20]}...")

        # 3. Получение информации о пользователе
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"✅ Информация о пользователе: {response.status_code}")
        print(f"   Пользователь: {response.json()}")

        # 4. Тест защищенного эндпоинта
        response = requests.get(f"{BASE_URL}/api/ml/status", headers=headers)
        print(f"✅ Защищенный эндпоинт: {response.status_code}")


if __name__ == "__main__":
    test_auth_flow()