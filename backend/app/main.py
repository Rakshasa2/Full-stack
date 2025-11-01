from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
import time
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import requests
from pydantic import BaseModel
import tempfile
import shutil
from git import Repo

from .schemas import (
    RepositoryAnalysisResponse,
    FileAnalysisResponse,
    AnalysisStatus,
    UserCreate,
    UserLogin,
    UserResponse,
    Token
)

from .auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# Импорты базы данных и моделей
from .database import get_db
from .models import create_tables, User

# Импорты сервисов
from .ai.ml_generator import MLGenerator

ml_generator = MLGenerator()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

create_tables()

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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Глобальные переменные
app_start_time = time.time()


# Модели Pydantic
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


class GitHubAnalysisRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    include_patterns: List[str] = ["*.py", "*.js", "*.ts", "*.java", "*.cpp", "*.c", "*.go", "*.rs"]
    exclude_patterns: List[str] = [".git/*", "node_modules/*", "__pycache__/*", "*.min.js", "*.min.css"]
    max_files: int = 50


class FileAnalysisResult(BaseModel):
    file_path: str
    language: str
    documentation: str
    functions: List[Dict[str, Any]]
    confidence: float
    status: str


class RepositoryAnalysisResult(BaseModel):
    repo_url: str
    repo_name: str
    status: str
    total_files: int
    analyzed_files: int
    documentation: str
    file_analyses: List[FileAnalysisResult]
    summary: Dict[str, Any]
    processing_time: float


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
            "github_analysis": "/api/analyze/github"
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
        ml_status = ml_generator.get_status()

        return {
            "status": "operational",
            "database": "available",
            "ml_model": {
                "status": ml_status["status"],
                "model_type": ml_status["model_type"],
                "device": ml_status["device"]
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )


# Эндпоинты аутентификации
@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"✅ Зарегистрирован новый пользователь: {user.username}")

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        created_at=user.created_at
    )


@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Аутентификация пользователя"""
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    logger.info(f"✅ Пользователь вошел в систему: {user.username}")

    return Token(
        access_token=access_token,
        token_type="bearer"
    )


@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Получить информацию о текущего пользователя"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at
    )


# Вспомогательные функции для работы с Git
def clone_repository(repo_url: str, branch: str = "main") -> str:
    """Клонирует репозиторий во временную директорию"""
    temp_dir = tempfile.mkdtemp()

    try:
        logger.info(f"📥 Клонируем репозиторий: {repo_url} (branch: {branch})")
        Repo.clone_from(repo_url, temp_dir, branch=branch, depth=1)
        logger.info(f"✅ Репозиторий успешно клонирован в: {temp_dir}")
        return temp_dir
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка клонирования репозитория: {str(e)}"
        )


def discover_code_files(repo_path: str, include_patterns: List[str], exclude_patterns: List[str]) -> List[str]:
    """Находит файлы с кодом в репозитории"""
    code_files = []

    for root, dirs, files in os.walk(repo_path):
        # Исключаем директории по паттернам
        dirs[:] = [d for d in dirs if not any(
            pattern in os.path.join(root, d) for pattern in exclude_patterns
        )]

        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, repo_path)

            # Проверяем include паттерны
            if any(relative_path.endswith(pattern.replace('*', '')) for pattern in include_patterns):
                # Проверяем exclude паттерны
                if not any(pattern in relative_path for pattern in exclude_patterns):
                    code_files.append(file_path)

    return code_files


def detect_language(file_path: str) -> str:
    """Определяет язык программирования по расширению файла"""
    ext_to_lang = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby',
        '.cs': 'csharp',
    }

    ext = os.path.splitext(file_path)[1].lower()
    return ext_to_lang.get(ext, 'unknown')


def read_file_content(file_path: str) -> str:
    """Читает содержимое файла"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        # Пробуем другие кодировки
        with open(file_path, 'r', encoding='latin-1') as f:
            return f.read()


# Основной эндпоинт для анализа GitHub репозитория
@app.post("/api/analyze/github", response_model=RepositoryAnalysisResult)
async def analyze_github_repository(
        request: GitHubAnalysisRequest,
        current_user: UserResponse = Depends(get_current_active_user)
):
    """Анализ GitHub репозитория и генерация документации для всех файлов"""
    start_time = time.time()
    temp_dir = None

    try:
        logger.info(f"🚀 Начинаем анализ репозитория: {request.repo_url}")

        # Валидация URL
        if not request.repo_url.startswith(('https://github.com/', 'https://gitlab.com/')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только GitHub и GitLab репозитории"
            )

        # Клонируем репозиторий
        temp_dir = clone_repository(request.repo_url, request.branch)

        # Получаем имя репозитория из URL
        repo_name = request.repo_url.rstrip('/').split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]

        # Находим файлы с кодом
        code_files = discover_code_files(temp_dir, request.include_patterns, request.exclude_patterns)

        if not code_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="В репозитории не найдено файлов с кодом"
            )

        logger.info(f"📁 Найдено {len(code_files)} файлов с кодом")

        # Ограничиваем количество файлов для анализа
        if len(code_files) > request.max_files:
            code_files = code_files[:request.max_files]
            logger.info(f"⚡ Ограничиваем анализ до {request.max_files} файлов")

        # Анализируем каждый файл
        file_analyses = []
        successful_analyses = 0

        for file_path in code_files:
            try:
                # Читаем содержимое файла
                content = read_file_content(file_path)

                if not content.strip():
                    continue

                # Определяем язык
                language = detect_language(file_path)
                if language == 'unknown':
                    continue

                # Получаем относительный путь
                relative_path = os.path.relpath(file_path, temp_dir)

                logger.info(f"🔧 Анализируем файл: {relative_path} ({language})")

                # Генерируем документацию с помощью ML модели
                analysis_result = ml_generator.generate_documentation(
                    code=content,
                    context={
                        "language": language,
                        "file_path": relative_path,
                        "user_id": current_user.id
                    }
                )

                file_analysis = FileAnalysisResult(
                    file_path=relative_path,
                    language=language,
                    documentation=analysis_result["documentation"],
                    functions=analysis_result["functions"],
                    confidence=analysis_result["confidence"],
                    status="success"
                )

                file_analyses.append(file_analysis)
                successful_analyses += 1

                logger.info(f"✅ Проанализирован файл: {relative_path}")

            except Exception as e:
                logger.error(f"❌ Ошибка анализа файла {file_path}: {e}")
                continue

        # Генерируем общую документацию проекта
        overall_docs = await _generate_project_documentation(repo_name, file_analyses)
        processing_time = time.time() - start_time

        response = RepositoryAnalysisResult(
            repo_url=request.repo_url,
            repo_name=repo_name,
            status="completed",
            total_files=len(code_files),
            analyzed_files=successful_analyses,
            documentation=overall_docs,
            file_analyses=file_analyses,
            summary={
                "languages": _count_languages(file_analyses),
                "total_functions": sum(len(analysis.functions) for analysis in file_analyses),
                "average_confidence": sum(analysis.confidence for analysis in file_analyses) / len(
                    file_analyses) if file_analyses else 0,
            },
            processing_time=round(processing_time, 2)
        )

        logger.info(f"🎉 Анализ завершен: {successful_analyses}/{len(code_files)} файлов за {processing_time:.2f}с")

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Критическая ошибка при анализе репозитория: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка анализа репозитория: {str(e)}"
        )
    finally:
        # Очищаем временную директорию
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info("🧹 Временная директория очищена")


# Вспомогательные функции
async def _generate_project_documentation(project_name: str, file_analyses: List[FileAnalysisResult]) -> str:
    """Генерирует общую документацию для проекта"""
    languages = _count_languages(file_analyses)
    total_functions = sum(len(analysis.functions) for analysis in file_analyses)

    docs = f"""
# Документация проекта: {project_name}

## Общая информация

- **Всего проанализированных файлов**: {len(file_analyses)}
- **Языки программирования**: {', '.join(f'{lang} ({count})' for lang, count in languages.items())}
- **Всего функций/методов**: {total_functions}

## Детальный анализ файлов
"""

    for analysis in file_analyses:
        docs += f"\n### Файл: {analysis.file_path}\n"
        docs += f"- **Язык**: {analysis.language}\n"
        docs += f"- **Уверенность**: {analysis.confidence:.2f}\n"
        docs += f"- **Функции**: {len(analysis.functions)}\n"
        docs += f"\n**Документация**:\n\n{analysis.documentation}\n"

    return docs


def _count_languages(file_analyses: List[FileAnalysisResult]) -> Dict[str, int]:
    """Подсчитывает количество файлов по языкам"""
    languages = {}
    for analysis in file_analyses:
        languages[analysis.language] = languages.get(analysis.language, 0) + 1
    return languages


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
                "github_analysis": "/api/analyze/github"
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
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )