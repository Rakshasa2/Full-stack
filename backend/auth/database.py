from typing import Dict, Optional
from .models import UserCreate, UserResponse, verify_password, get_password_hash
import time

# Временная база данных (в продакшене заменить на реальную БД)
fake_users_db: Dict[str, dict] = {}


class DatabaseManager:
    def __init__(self):
        self.db = fake_users_db

    async def get_user_by_email(self, email: str) -> Optional[UserResponse]:
        """Получить пользователя по email"""
        user_data = self.db.get(email)
        if user_data:
            return UserResponse(**user_data)
        return None

    async def create_user(self, user: UserCreate) -> UserResponse:
        """Создать нового пользователя"""
        if user.email in self.db:
            raise ValueError("Пользователь с таким email уже существует")

        hashed_password = get_password_hash(user.password)
        user_data = {
            "id": len(self.db) + 1,
            "email": user.email,
            "username": user.username,
            "hashed_password": hashed_password,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        self.db[user.email] = user_data
        return UserResponse(**user_data)

    async def authenticate_user(self, email: str, password: str) -> Optional[UserResponse]:
        """Аутентификация пользователя"""
        user = await self.get_user_by_email(email)
        if not user:
            return None

        user_data = self.db.get(email)
        if not verify_password(password, user_data["hashed_password"]):
            return None

        return user

    async def get_all_users(self) -> list:
        """Получить всех пользователей"""
        return [UserResponse(**user_data) for user_data in self.db.values()]

    async def delete_user(self, email: str) -> bool:
        """Удалить пользователя"""
        if email in self.db:
            del self.db[email]
            return True
        return False

    async def delete_all_users(self) -> None:
        """Удалить всех пользователей"""
        self.db.clear()