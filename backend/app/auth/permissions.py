from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import  Callable
from functools import wraps

from app.auth import get_current_active_user
from app.models.models import User


class PermissionChecker:
    """Класс для проверки разрешений"""

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        """Проверяет наличие необходимого разрешения у пользователя"""
        if not current_user.has_permission(self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуется разрешение: {self.required_permission}"
            )
        return current_user


def check_ownership(resource_user_id: int, current_user: User) -> bool:
    """
    Проверяет, является ли пользователь владельцем ресурса или администратором

    Args:
        resource_user_id: ID пользователя-владельца ресурса
        current_user: Текущий пользователь

    Returns:
        bool: True если есть доступ, иначе HTTPException
    """
    if current_user.id == resource_user_id or current_user.is_admin:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="У вас нет прав для доступа к этому ресурсу"
    )


def require_permission(permission_name: str):
    """Декоратор для проверки разрешений"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Получаем current_user из kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break

            if not current_user or not current_user.has_permission(permission_name):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Недостаточно прав. Требуется разрешение: {permission_name}"
                )
            return await func(*args, **kwargs)

        return wrapper

    return decorator
