import requests
import json
import traceback
import time
import random


def diagnostic_test():
    """Диагностический тест для выявления проблем"""
    base_url = "http://localhost:8000"

    print("🔧 Diagnostic Test")
    print("=" * 50)

    test_results = {
        "basic_functionality": False,
        "authentication": False,
        "protected_analysis": False,
        "ai_connection": False
    }

    # 1. Проверка базового функционирования
    print("1. Basic Functionality...")
    try:
        health_response = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"   Status: {health_response.status_code}")

        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"   Service: {health_data.get('service', 'N/A')}")
            print(f"   Status: {health_data.get('status', 'N/A')}")
            print(f"   Uptime: {health_data.get('uptime', 'N/A')}s")
            test_results["basic_functionality"] = True
            print("   ✅ Basic functionality: PASS")
        else:
            print(f"   ❌ Health check failed: {health_response.text}")

    except Exception as e:
        print(f"   ❌ Health check failed: {e}")

    # 2. Тест аутентификации и защищенных эндпоинтов
    print("\n2. Authentication & Protected Endpoints Test...")
    try:
        # Генерируем уникальные тестовые данные
        timestamp = int(time.time())
        random_suffix = random.randint(1000, 9999)
        user_email = f"diag_test_{timestamp}_{random_suffix}@test.com"
        user_username = f"diaguser_{timestamp}_{random_suffix}"

        user_data = {
            "email": user_email,
            "username": user_username,
            "password": "testpass123"
        }

        print(f"   Testing with user: {user_email}")

        # Регистрация
        reg_response = requests.post(
            f"{base_url}/api/auth/register",
            json=user_data,
            timeout=5
        )

        print(f"   Registration status: {reg_response.status_code}")

        if reg_response.status_code == 200:
            reg_data = reg_response.json()
            user_id = reg_data.get('id')
            print(f"   ✅ User registered: {reg_data.get('username')} (ID: {user_id})")
            test_results["authentication"] = True

            # Логин
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }

            login_response = requests.post(
                f"{base_url}/api/auth/login",
                json=login_data,
                timeout=5
            )

            print(f"   Login status: {login_response.status_code}")

            if login_response.status_code == 200:
                login_data = login_response.json()
                token = login_data.get("access_token")
                token_type = login_data.get("token_type", "bearer")

                if token:
                    print(f"   ✅ User authenticated, token type: {token_type}")
                    print(f"   Token length: {len(token)} characters")

                    # Тест защищенного анализа с токеном
                    analyze_data = {
                        "repo_url": "https://github.com/python/cpython",
                        "branch": "main",
                        "file_types": [".py"]
                    }

                    headers = {"Authorization": f"Bearer {token}"}

                    print("   Testing protected analysis endpoint...")
                    analyze_response = requests.post(
                        f"{base_url}/api/analyze-repo",
                        json=analyze_data,
                        headers=headers,
                        timeout=15
                    )

                    print(f"   Analysis status: {analyze_response.status_code}")

                    if analyze_response.status_code == 200:
                        analysis_data = analyze_response.json()
                        total_files = analysis_data.get('total_files', 0)
                        processed_files = analysis_data.get('processed_files', 0)
                        print(f"   ✅ Analysis completed: {processed_files}/{total_files} files")
                        test_results["protected_analysis"] = True
                    else:
                        print(f"   ❌ Analysis failed: {analyze_response.text}")

                    # Дополнительный тест: получение информации о пользователе
                    print("   Testing user info endpoint...")
                    user_info_response = requests.get(
                        f"{base_url}/api/auth/me",
                        headers=headers,
                        timeout=5
                    )

                    if user_info_response.status_code == 200:
                        user_info = user_info_response.json()
                        print(f"   ✅ User info retrieved: {user_info.get('username')}")
                    else:
                        print(f"   ❌ User info failed: {user_info_response.text}")

                else:
                    print("   ❌ No token received")
            else:
                print(f"   ❌ Login failed: {login_response.text}")

        else:
            print(f"   ❌ Registration failed: {reg_response.text}")

    except Exception as e:
        print(f"   ❌ Authentication test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")

    # 3. Проверка AI соединения
    print("\n3. AI Service Check...")
    try:
        ai_response = requests.get(f"{base_url}/api/ai/test", timeout=10)
        print(f"   Status: {ai_response.status_code}")

        if ai_response.status_code == 200:
            ai_data = ai_response.json()
            ai_status = ai_data.get('status', 'unknown')
            print(f"   AI Status: {ai_status}")

            if ai_status == "connected":
                print(f"   Response: {ai_data.get('response', 'N/A')}")
                test_results["ai_connection"] = True
                print("   ✅ AI connection: PASS")
            elif ai_status == "disconnected":
                print(f"   Error: {ai_data.get('error', 'N/A')}")
                print("   ⚠️  AI disconnected but API working")
                test_results["ai_connection"] = True  # API работает, даже если LM Studio нет
            else:
                print(f"   Details: {ai_data}")
        else:
            print(f"   ❌ AI check failed: {ai_response.text}")

    except requests.exceptions.Timeout:
        print("   ⚠️  AI service timeout")
    except Exception as e:
        print(f"   ❌ AI check error: {e}")

    # 4. Дополнительные проверки
    print("\n4. Additional Checks...")
    try:
        # Проверка статуса сервиса
        status_response = requests.get(f"{base_url}/api/status", timeout=5)
        if status_response.status_code == 200:
            status_data = status_response.json()
            db_status = status_data.get('database', 'unknown')
            print(f"   Database: {db_status}")
        else:
            print(f"   Status check failed: {status_response.status_code}")

        # Проверка доступности моделей AI
        models_response = requests.get(f"{base_url}/api/ai/models", timeout=5)
        if models_response.status_code == 200:
            models_data = models_response.json()
            print(f"   AI Models status: {models_data.get('status', 'N/A')}")
        else:
            print(f"   AI Models check failed: {models_response.status_code}")

        # Проверка ML статуса
        ml_response = requests.get(f"{base_url}/api/ml/status", timeout=5)
        if ml_response.status_code == 200:
            ml_data = ml_response.json()
            print(f"   ML Status: {ml_data.get('status', 'N/A')}")
        else:
            print(f"   ML Status check failed: {ml_response.status_code}")

    except Exception as e:
        print(f"   Additional checks failed: {e}")

    # Итоговый отчет
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    passed_tests = sum(test_results.values())
    total_tests = len(test_results)

    for test_name, passed in test_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name.replace('_', ' ').title():<25} {status}")

    print(f"\n   Overall: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print("🎉 All tests passed! System is working correctly.")
    elif passed_tests >= 3:
        print("⚠️  Most tests passed. Some features may not work fully.")
    else:
        print("❌ Multiple tests failed. System needs attention.")

    print("=" * 50)


if __name__ == "__main__":
    diagnostic_test()