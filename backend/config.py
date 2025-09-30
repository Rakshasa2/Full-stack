import secrets
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Секретный ключ для JWT (генерируется автоматически если не задан в .env)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-" + secrets.token_urlsafe(32))

    # Алгоритм шифрования JWT
    ALGORITHM: str = "HS256"

    # Время жизни токена
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Настройки базы данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./codedoc.db")

    # OpenAI API ключ (опционально)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Настройки CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Режим отладки
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"


# Создаем экземпляр настроек
settings = Settings()