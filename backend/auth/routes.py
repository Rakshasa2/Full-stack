from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import timedelta

from .models import UserCreate, UserLogin, Token, UserResponse, create_access_token, verify_token
from .database import DatabaseManager

# Инициализация роутера и зависимостей
router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
db_manager = DatabaseManager()


# Зависимости
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Получить текущего пользователя из JWT токена"""
    email = verify_token(credentials.credentials)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db_manager.get_user_by_email(email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return user


# Основные эндпоинты аутентификации
@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""
    try:
        user = await db_manager.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Вход пользователя"""
    user = await db_manager.authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Получить информацию о текущем пользователе"""
    return current_user


@router.post("/logout")
async def logout():
    """Выход пользователя"""
    return {"message": "Выход выполнен успешно"}


# Эндпоинты администрирования
@router.get("/users", response_model=List[UserResponse], dependencies=[Depends(get_current_user)])
async def get_all_users():
    """Получить список всех пользователей"""
    try:
        users = await db_manager.get_all_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users", dependencies=[Depends(get_current_user)])
async def delete_all_users():
    """Удалить всех пользователей"""
    try:
        await db_manager.delete_all_users()
        return {"message": "Все пользователи удалены"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/superuser", dependencies=[Depends(get_current_user)])
async def create_superuser():
    """Создать суперпользователя"""
    try:
        superuser_email = "admin@codedoc.ai"

        # Проверяем, нет ли уже суперпользователя
        existing_user = await db_manager.get_user_by_email(superuser_email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Суперпользователь уже существует")

        # Создаем суперпользователя
        superuser_data = UserCreate(
            email=superuser_email,
            username="admin",
            password="admin123"
        )

        user = await db_manager.create_user(superuser_data)
        return {
            "message": "Суперпользователь создан",
            "user": user,
            "credentials": {
                "email": superuser_email,
                "password": "admin123"
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_email}", dependencies=[Depends(get_current_user)])
async def delete_user(user_email: str):
    """Удалить конкретного пользователя"""
    try:
        success = await db_manager.delete_user(user_email)
        if not success:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        return {"message": f"Пользователь {user_email} удален"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))