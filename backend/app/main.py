from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import time

from auth.routes import router as auth_router, get_current_user
from auth.models import UserResponse
from config import settings

# Создание приложения FastAPI
app = FastAPI(
    title="CodeDoc AI API",
    description="API для автоматической генерации документации кода с AI",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов (для фронтенда)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Подключение роутеров
app.include_router(auth_router, prefix="/api")


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


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    uptime: float


class UserStats(BaseModel):
    user_id: int
    analyses_count: int
    projects_count: int
    last_activity: str


# Глобальные переменные
app_start_time = time.time()


# Мидлвары
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Базовые эндпоинты с редиректами
@app.get("/", include_in_schema=False)
async def root():
    """Корневой эндпоинт - перенаправление на документацию"""
    return RedirectResponse(url="/api/docs")


@app.get("/docs", include_in_schema=False)
async def redirect_docs():
    """Редирект с /docs на /api/docs"""
    return RedirectResponse(url="/api/docs")


@app.get("/redoc", include_in_schema=False)
async def redirect_redoc():
    """Редирект с /redoc на /api/redoc"""
    return RedirectResponse(url="/api/redoc")


@app.get("/api", include_in_schema=False)
async def api_root():
    """Корневой эндпоинт API"""
    return {
        "message": "CodeDoc AI API",
        "version": "2.0.0",
        "endpoints": {
            "documentation": "/api/docs",
            "authentication": "/api/auth",
            "health": "/api/health",
            "status": "/api/status"
        }
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Проверка здоровья сервиса"""
    current_time = time.strftime("%Y-%m-%d %H:%M:%S")
    uptime = time.time() - app_start_time

    return HealthResponse(
        status="healthy",
        service="CodeDoc AI",
        version="2.0.0",
        timestamp=current_time,
        uptime=round(uptime, 2)
    )


@app.get("/api/status")
async def service_status():
    """Статус различных компонентов сервиса"""
    try:
        return {
            "status": "operational",
            "database": "available",
            "external_services": {
                "git_service": "available",
                "ai_processor": "available"
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )


# Эндпоинты анализа репозиториев
@app.post("/api/analyze-repo", response_model=AnalysisResult)
async def analyze_repository(
        request: RepositoryRequest,
        current_user: UserResponse = Depends(get_current_user)
):
    """Анализ репозитория и генерация документации"""
    try:
        # Валидация URL репозитория
        if not request.repo_url.startswith(('https://github.com/', 'https://gitlab.com/', 'https://bitbucket.org/')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только GitHub, GitLab и Bitbucket репозитории"
            )

        # Демо-результаты
        demo_results = [
            DocumentationResponse(
                file_path="main.py",
                documentation="# Главный файл приложения\n\n## Назначение\nЭтот файл содержит точку входа в приложение CodeDoc AI.\n\n## Основные функции\n- Инициализация FastAPI приложения\n- Настройка CORS и мидлваров\n- Регистрация маршрутов API\n- Запуск сервера разработки\n\n## Использование\n```bash\nuvicorn main:app --reload --host 0.0.0.0 --port 8000\n```\n\n## Зависимости\n- FastAPI для создания API\n- Uvicorn как ASGI сервер\n- Python-jose для JWT токенов",
                status="success"
            ),
            DocumentationResponse(
                file_path="auth/routes.py",
                documentation="# Маршруты аутентификации\n\n## Назначение\nОбработка запросов связанных с аутентификацией пользователей.\n\n## Основные эндпоинты\n- POST /auth/register - Регистрация нового пользователя\n- POST /auth/login - Вход в систему\n- GET /auth/me - Получение информации о текущем пользователе\n- GET /auth/users - Получение списка пользователей (админ)\n\n## Безопасность\n- Хеширование паролей с bcrypt\n- JWT токены для аутентификации\n- Защита маршрутов мидлварами",
                status="success"
            )
        ]

        return AnalysisResult(
            total_files=len(demo_results),
            processed_files=len(demo_results),
            results=demo_results
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка анализа репозитория: {str(e)}"
        )


@app.get("/api/user/stats", response_model=UserStats)
async def get_user_stats(current_user: UserResponse = Depends(get_current_user)):
    """Получить статистику пользователя"""
    try:
        return UserStats(
            user_id=current_user.id,
            analyses_count=5,
            projects_count=3,
            last_activity=time.strftime("%Y-%m-%d %H:%M:%S")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статистики: {str(e)}"
        )


# Эндпоинты для работы с проектами
@app.get("/api/projects")
async def get_user_projects(current_user: UserResponse = Depends(get_current_user)):
    """Получить список проектов пользователя"""
    try:
        projects = [
            {
                "id": 1,
                "name": "ecommerce-api",
                "url": "https://github.com/user/ecommerce-api",
                "last_analyzed": "2024-01-15",
                "files_count": 24,
                "status": "completed"
            },
            {
                "id": 2,
                "name": "auth-service",
                "url": "https://github.com/user/auth-service",
                "last_analyzed": "2024-01-10",
                "files_count": 18,
                "status": "completed"
            }
        ]
        return projects
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения проектов: {str(e)}"
        )


# Эндпоинты для обработки ошибок
@app.exception_handler(404)
async def not_found_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": "Ресурс не найден",
            "path": request.url.path,
            "available_endpoints": {
                "documentation": "/api/docs",
                "api_root": "/api",
                "health_check": "/api/health",
                "authentication": "/api/auth/*"
            }
        }
    )


@app.exception_handler(500)
async def internal_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Внутренняя ошибка сервера"}
    )


# Запуск приложения
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )