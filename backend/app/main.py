from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse
import time
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
from pydantic import BaseModel
import tempfile
import shutil
from git import Repo

# ИСПРАВЛЕННЫЕ ИМПОРТЫ - используем то что есть в ваших схемах
from .schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    AnalysisHistory,           # Pydantic модель для истории
    AnalysisHistoryResponse,   # Для списка анализов с пагинацией
    UserStats,                # Для статистики пользователя
    GitHubAnalysisRequest,
    RepositoryAnalysisResult,
    HealthResponse,
    FileAnalysisResult
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
from .models import create_tables, User, AnalysisHistory as AnalysisHistoryModel  # Переименовываем модель БД

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


# Модель для ответа анализа (может быть локальной или использовать вашу)
class AnalysisResponse(BaseModel):
    repo_url: str
    repo_name: str
    total_files: int
    analyzed_files: int
    processing_time: float
    file_analyses: List[Dict[str, Any]]
    summary: Dict[str, Any]
    status: str = "success"


# Основные эндпоинты
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/api/docs")


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
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
    try:
        return {
            "status": "operational",
            "database": "available",
            "ml_model": "available",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )


# Аутентификация
@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
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
        hashed_password=hashed_password,
        is_active=True
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
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at
    )


# Вспомогательные функции для анализа (остаются без изменений)
def clone_repository(repo_url: str, branch: str = "main") -> str:
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
    code_files = []
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not any(
            pattern in os.path.join(root, d) for pattern in exclude_patterns
        )]
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, repo_path)
            if any(relative_path.endswith(pattern.replace('*', '')) for pattern in include_patterns):
                if not any(pattern in relative_path for pattern in exclude_patterns):
                    code_files.append(file_path)
    return code_files


def detect_language(file_path: str) -> str:
    ext_to_lang = {
        '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
        '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.go': 'go',
        '.rs': 'rust', '.php': 'php', '.rb': 'ruby',
    }
    ext = os.path.splitext(file_path)[1].lower()
    return ext_to_lang.get(ext, 'unknown')


def read_file_content(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as f:
            return f.read()


# Основной эндпоинт анализа
@app.post("/api/analyze/github")
def analyze_github_repository(
        request: GitHubAnalysisRequest,
        current_user: UserResponse = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    start_time = time.time()
    temp_dir = None

    try:
        logger.info(f"Анализ репозитория: {request.repo_url}")
        temp_dir = clone_repository(request.repo_url, request.branch)
        repo_name = request.repo_url.rstrip('/').split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]

        code_files = discover_code_files(temp_dir, request.include_patterns, request.exclude_patterns)
        if not code_files:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": "В репозитории не найдено файлов с кодом",
                    "repo_url": request.repo_url
                }
            )

        if len(code_files) > request.max_files:
            code_files = code_files[:request.max_files]
            logger.info(f"Ограничено до {request.max_files} файлов")

        file_analyses = []
        for file_path in code_files:
            try:
                content = read_file_content(file_path)
                if not content.strip():
                    continue

                language = detect_language(file_path)
                if language == 'unknown':
                    continue

                relative_path = os.path.relpath(file_path, temp_dir)
                logger.info(f"Анализ: {relative_path}")

                analysis_result = ml_generator.generate_documentation(
                    code=content,
                    context={
                        "language": language,
                        "file_path": relative_path,
                        "user_id": current_user.id,
                        "timestamp": time.time()
                    }
                )

                # Создаем объект FileAnalysisResult для ответа
                file_analysis_data = {
                    "file_path": relative_path,
                    "language": language,
                    "documentation": analysis_result.get("documentation", ""),
                    "functions": analysis_result.get("functions", []),
                    "confidence": analysis_result.get("confidence", 0),
                    "status": "success"
                }

                file_analyses.append(file_analysis_data)

            except Exception as e:
                logger.error(f"Ошибка анализа файла {file_path}: {e}")
                continue

        processing_time = time.time() - start_time

        languages_count = {}
        total_confidence = 0
        successful_analyses = 0

        for analysis in file_analyses:
            lang = analysis["language"]
            languages_count[lang] = languages_count.get(lang, 0) + 1
            if analysis["status"] == "success":
                total_confidence += analysis["confidence"]
                successful_analyses += 1

        avg_confidence = total_confidence / successful_analyses if successful_analyses > 0 else 0

        project_documentation = generate_project_documentation(repo_name, file_analyses)

        summary = {
            "total_functions": sum(len(a["functions"]) for a in file_analyses),
            "successful_analyses": successful_analyses,
            "failed_analyses": len(file_analyses) - successful_analyses,
            "average_confidence": round(avg_confidence, 2),
            "languages": languages_count,
            "timestamp": datetime.now().isoformat(),
            "total_processing_time": round(processing_time, 2)
        }

        # СОХРАНЕНИЕ В ИСТОРИЮ - создаем объект модели БД
        analysis_history = AnalysisHistoryModel(
            user_id=current_user.id,
            repo_url=request.repo_url,
            repo_name=repo_name,
            branch=request.branch,
            status="completed",
            total_files=len(code_files),
            analyzed_files=len(file_analyses),
            processing_time=processing_time,
            summary=summary,
            file_analyses=file_analyses,
            documentation=project_documentation,
            completed_at=datetime.utcnow()
        )

        db.add(analysis_history)
        db.commit()
        db.refresh(analysis_history)

        logger.info(f"📊 Анализ сохранен в историю с ID: {analysis_history.id}")

        # Создаем ответ в формате RepositoryAnalysisResult
        response_data = RepositoryAnalysisResult(
            repo_url=request.repo_url,
            repo_name=repo_name,
            status="completed",
            total_files=len(code_files),
            analyzed_files=len(file_analyses),
            documentation=project_documentation,
            file_analyses=[FileAnalysisResult(**fa) for fa in file_analyses],
            summary=summary,
            processing_time=round(processing_time, 2)
        )

        logger.info(
            f"✅ Анализ завершен: {successful_analyses}/{len(file_analyses)} файлов за {processing_time:.2f} сек")

        return response_data

    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка анализа: {str(e)}"
        )
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info("Временная директория очищена")


def generate_project_documentation(project_name: str, file_analyses: List[Dict[str, Any]]) -> str:
    successful_analyses = [a for a in file_analyses if a.get("status") == "success"]

    if not successful_analyses:
        return f"# {project_name}\n\nНе удалось проанализировать ни одного файла."

    languages = {}
    total_functions = 0
    total_confidence = 0

    for analysis in successful_analyses:
        lang = analysis.get("language", "unknown")
        languages[lang] = languages.get(lang, 0) + 1
        total_functions += len(analysis.get("functions", []))
        total_confidence += analysis.get("confidence", 0)

    avg_confidence = total_confidence / len(successful_analyses) if successful_analyses else 0

    docs = f"""
# Документация проекта: {project_name}

## Общая информация

| Показатель | Значение |
|------------|----------|
| Всего файлов | {len(file_analyses)} |
| Успешно проанализировано | {len(successful_analyses)} |
| Языки программирования | {', '.join(f'{lang} ({count})' for lang, count in languages.items())} |
| Всего функций | {total_functions} |
| Средняя уверенность | {avg_confidence:.2%} |

## Детальный анализ файлов
"""

    for i, analysis in enumerate(successful_analyses[:10]):
        docs += f"\n### {analysis.get('file_path', f'file_{i}')}\n"
        docs += f"- **Язык**: {analysis.get('language', 'unknown')}\n"
        docs += f"- **Уверенность**: {analysis.get('confidence', 0):.2%}\n"
        docs += f"- **Функций**: {len(analysis.get('functions', []))}\n"

    if len(successful_analyses) > 10:
        docs += f"\n*... и еще {len(successful_analyses) - 10} файлов*\n"

    return docs


# Эндпоинты истории
@app.get("/api/analyses/history", response_model=AnalysisHistoryResponse)
def get_analysis_history(
        page: int = 1,
        page_size: int = 10,
        current_user: UserResponse = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    offset = (page - 1) * page_size
    analyses = db.query(AnalysisHistoryModel) \
        .filter(AnalysisHistoryModel.user_id == current_user.id) \
        .order_by(AnalysisHistoryModel.created_at.desc()) \
        .offset(offset) \
        .limit(page_size) \
        .all()

    total_count = db.query(AnalysisHistoryModel) \
        .filter(AnalysisHistoryModel.user_id == current_user.id) \
        .count()

    # Конвертируем модели БД в Pydantic модели
    analysis_schemas = [AnalysisHistory.from_orm(analysis) for analysis in analyses]

    return AnalysisHistoryResponse(
        analyses=analysis_schemas,
        total_count=total_count,
        page=page,
        page_size=page_size
    )


@app.get("/api/analyses/history/{analysis_id}", response_model=AnalysisHistory)
def get_analysis_details(
        analysis_id: int,
        current_user: UserResponse = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistoryModel) \
        .filter(AnalysisHistoryModel.id == analysis_id, AnalysisHistoryModel.user_id == current_user.id) \
        .first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )

    return AnalysisHistory.from_orm(analysis)


@app.delete("/api/analyses/history/{analysis_id}")
def delete_analysis(
        analysis_id: int,
        current_user: UserResponse = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistoryModel) \
        .filter(AnalysisHistoryModel.id == analysis_id, AnalysisHistoryModel.user_id == current_user.id) \
        .first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )

    db.delete(analysis)
    db.commit()
    logger.info(f"🗑️ Анализ удален из истории: ID {analysis_id}")

    return {"message": "Анализ успешно удален"}


@app.get("/api/user/stats", response_model=UserStats)
def get_user_stats(
        current_user: UserResponse = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analyses = db.query(AnalysisHistoryModel) \
        .filter(AnalysisHistoryModel.user_id == current_user.id, AnalysisHistoryModel.status == "completed") \
        .all()

    total_analyses = len(analyses)
    total_files_analyzed = sum(analysis.analyzed_files for analysis in analyses)
    total_processing_time = sum(analysis.processing_time for analysis in analyses)

    last_analysis = max(analyses, key=lambda x: x.created_at).created_at if analyses else None

    return UserStats(
        user_id=current_user.id,
        username=current_user.username,
        total_analyses=total_analyses,
        total_files_analyzed=total_files_analyzed,
        total_processing_time=round(total_processing_time, 2),
        last_analysis=last_analysis
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )