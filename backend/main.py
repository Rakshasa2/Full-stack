from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from auth.routes import router as auth_router, get_current_user
from auth.models import UserResponse
from config import settings

# Создание приложения FastAPI
app = FastAPI(
    title="CodeDoc AI API",
    description="API для автоматической генерации документации кода",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth_router)


# Модели запросов/ответов
class RepositoryRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    file_types: List[str] = [".py", ".js", ".ts", ".java", ".cpp", ".c"]


class DocumentationResponse(BaseModel):
    file_path: str
    documentation: str
    status: str


class AnalysisResult(BaseModel):
    total_files: int
    processed_files: int
    results: List[DocumentationResponse]


# Основные эндпоинты
@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "CodeDoc AI API работает!",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": "CodeDoc AI",
        "timestamp": "2024-01-01T00:00:00Z"  # В реальном приложении использовать datetime
    }


@app.post("/analyze-repo", response_model=AnalysisResult)
async def analyze_repository(
        request: RepositoryRequest,
        current_user: UserResponse = Depends(get_current_user)
):
    """Анализ репозитория и генерация документации"""
    try:
        # Заглушка для демонстрации
        # В реальном приложении здесь будет логика анализа кода

        demo_results = [
            DocumentationResponse(
                file_path="main.py",
                documentation="""# Главный файл приложения

## Назначение
Этот файл содержит точку входа в приложение.

## Основные функции
- Инициализация приложения
- Настройка маршрутов
- Запуск сервера

## Использование
```python
python main.py
```""",
                status="success"
            ),
            DocumentationResponse(
                file_path="utils/helpers.py",
                documentation="""# Вспомогательные функции

## Назначение
Содержит вспомогательные функции для работы с данными.

## Функции
- `validate_email()` - проверка email
- `format_date()` - форматирование даты
- `calculate_hash()` - вычисление хеша

## Пример использования
```python
from utils.helpers import validate_email
result = validate_email("test@example.com")
```""",
                status="success"
            )
        ]

        return AnalysisResult(
            total_files=len(demo_results),
            processed_files=len(demo_results),
            results=demo_results
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")


@app.get("/user/stats")
async def get_user_stats(current_user: UserResponse = Depends(get_current_user)):
    """Получить статистику пользователя"""
    return {
        "user_id": current_user.id,
        "analyses_count": 5,  # Заглушка
        "projects_count": 3,  # Заглушка
        "last_activity": "2024-01-15T10:30:00Z"
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )