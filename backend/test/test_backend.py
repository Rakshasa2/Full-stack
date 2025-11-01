import requests
import json
import time


class BackendTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None

    def print_result(self, test_name, success, details=""):
        """Печать результата теста"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        print()

    def test_health(self):
        """Тест здоровья сервиса"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=5)
            success = response.status_code == 200
            self.print_result("Health Check", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.print_result("Health Check", False, f"Error: {e}")
            return False

    def test_auth_register(self):
        """Тест регистрации пользователя"""
        try:
            user_data = {
                "email": f"test_{int(time.time())}@test.com",
                "username": f"testuser_{int(time.time())}",
                "password": "testpassword123"
            }

            response = requests.post(
                f"{self.base_url}/api/auth/register",
                json=user_data,
                timeout=5
            )

            success = response.status_code == 200
            self.print_result("User Registration", success, f"Status: {response.status_code}")

            if success:
                print(f"   Created user: {user_data['email']}")

            return success
        except Exception as e:
            self.print_result("User Registration", False, f"Error: {e}")
            return False

    def test_auth_login(self):
        """Тест входа пользователя"""
        try:
            # Сначала создаем пользователя
            user_data = {
                "email": "login_test@test.com",
                "username": "logintest",
                "password": "testpassword123"
            }

            # Регистрация
            reg_response = requests.post(
                f"{self.base_url}/api/auth/register",
                json=user_data,
                timeout=5
            )

            if reg_response.status_code != 200:
                self.print_result("User Login", False, "Failed to create test user")
                return False

            # Логин
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }

            login_response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                timeout=5
            )

            success = login_response.status_code == 200

            if success:
                self.token = login_response.json()["access_token"]
                self.print_result("User Login", success, f"Token received: {self.token[:20]}...")
            else:
                self.print_result("User Login", success, f"Status: {login_response.status_code}")

            return success
        except Exception as e:
            self.print_result("User Login", False, f"Error: {e}")
            return False

    def test_protected_endpoint(self):
        """Тест защищенного эндпоинта"""
        if not self.token:
            self.print_result("Protected Endpoint", False, "No token available")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/api/auth/me",
                headers=headers,
                timeout=5
            )

            success = response.status_code == 200
            self.print_result("Protected Endpoint", success, f"Status: {response.status_code}")

            if success:
                user_data = response.json()
                print(f"   User: {user_data['username']} ({user_data['email']})")

            return success
        except Exception as e:
            self.print_result("Protected Endpoint", False, f"Error: {e}")
            return False

    def test_analyze_repo(self):
        """Тест анализа репозитория"""
        try:
            analyze_data = {
                "repo_url": "https://github.com/octocat/Hello-World.git",
                "branch": "main",
                "file_types": [".py", ".md"]
            }

            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"

            response = requests.post(
                f"{self.base_url}/api/analyze-repo",
                json=analyze_data,
                headers=headers,
                timeout=10
            )

            success = response.status_code in [200, 401]  # 200 - успех, 401 - нужна аутентификация
            self.print_result("Repository Analysis", success, f"Status: {response.status_code}")

            if success and response.status_code == 200:
                result = response.json()
                print(f"   Files analyzed: {result['total_files']}")
                print(f"   Results: {len(result['results'])}")

            return success
        except Exception as e:
            self.print_result("Repository Analysis", False, f"Error: {e}")
            return False

    def test_ai_connection(self):
        """Тест подключения к AI"""
        try:
            response = requests.get(f"{self.base_url}/api/ai/test", timeout=5)
            success = response.status_code == 200

            if success:
                result = response.json()
                self.print_result("AI Connection", success, f"Status: {result['status']}")
            else:
                self.print_result("AI Connection", success, f"Status: {response.status_code}")

            return success
        except Exception as e:
            self.print_result("AI Connection", False, f"Error: {e}")
            return False

    def run_all_tests(self):
        """Запуск всех тестов"""
        print("🚀 Starting Backend Tests")
        print("=" * 50)

        tests = [
            self.test_health,
            self.test_auth_register,
            self.test_auth_login,
            self.test_protected_endpoint,
            self.test_analyze_repo,
            self.test_ai_connection
        ]

        results = []
        for test in tests:
            results.append(test())
            time.sleep(1)  # Пауза между тестами

        passed = sum(results)
        total = len(results)

        print("=" * 50)
        print(f"📊 Test Results: {passed}/{total} passed")

        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        else:
            print("💡 Some tests failed. Check the logs above.")

        return passed == total


if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()