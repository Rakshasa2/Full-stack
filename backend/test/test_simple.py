# test_simple.py
import requests
import json

BASE_URL = "http://localhost:8000"

def test_simple_analyze():
    """Тестируем простой анализ"""
    response = requests.post(
        f"{BASE_URL}/api/simple-analyze",
        json={
            "code": "def calculate_sum(a, b):\n    return a + b",
            "language": "python"
        }
    )
    print(f"Simple Analyze Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Simple Analyze: PASS")
        print(f"Response: {response.json()}")
    else:
        print("❌ Simple Analyze: FAIL")
        print(f"Error: {response.text}")

def test_health():
    """Тестируем health check"""
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Health Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Health Check: PASS")
    else:
        print("❌ Health Check: FAIL")

if __name__ == "__main__":
    test_health()
    test_simple_analyze()