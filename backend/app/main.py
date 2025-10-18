# backend/app/main.py
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
import time
from pathlib import Path
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session
from typing import List

# Локальные импорты
from .schemas import (
    RepositoryAnalysisRequest,
    RepositoryAnalysisResponse,
    FileAnalysisResponse,
    AnalysisStatus,
    UserCreate,
    UserLogin,
    UserResponse,
    Token
)
from .ai.local_analyzer import local_analyzer
from .ai.generator import ml_generator
from .auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    timedelta
)
from .database import get_db
from .models import create_tables, User, AnalysisHistory

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем таблицы при запуске
create_tables()

app = FastAPI(title="Local Repository Documentation Generator")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Эндпоинты аутентификации
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    # Проверяем, существует ли пользователь с таким email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )

    # Проверяем, существует ли пользователь с таким username
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )

    # Создаем нового пользователя
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

    return user


@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Аутентификация пользователя"""
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь деактивирован"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    logger.info(f"✅ Пользователь вошел в систему: {user.username}")

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Получить информацию о текущем пользователе"""
    return current_user


# Публичные эндпоинты (без аутентификации для тестирования)
@app.get("/")
async def root():
    return {"message": "Local Repository Documentation Generator API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FastAPI"}


# Защищенные эндпоинты (пока временно сделаем публичными для тестирования)
@app.post("/api/local/repos/analyze", response_model=RepositoryAnalysisResponse)
async def analyze_local_repository(
        request: RepositoryAnalysisRequest,
        # current_user: User = Depends(get_current_active_user),  # временно отключаем аутентификацию
        db: Session = Depends(get_db)
):
    """Анализирует локальный репозиторий и генерирует документацию"""

    start_time = time.time()

    try:
        logger.info(f"🚀 Анализ репозитория: {request.local_path}")

        # Проверяем и нормализуем путь
        repo_path = local_analyzer.validate_path(request.local_path)

        # Получаем структуру проекта
        project_structure = local_analyzer.get_project_structure(repo_path)
        logger.info(f"📁 Структура проекта: {list(project_structure.keys())}")

        # Находим файлы с кодом
        code_files = local_analyzer.discover_code_files(
            repo_path=repo_path,
            include_patterns=request.include_patterns,
            exclude_patterns=request.exclude_patterns
        )

        if not code_files:
            raise HTTPException(
                status_code=400,
                detail="В указанной директории не найдено файлов с кодом"
            )

        # Анализируем каждый файл
        file_analyses = []
        successful_analyses = 0

        for file_path in code_files:
            try:
                # Читаем содержимое файла
                content = await local_analyzer.read_file_content(file_path)

                if not content.strip():
                    continue

                # Определяем язык
                language = local_analyzer.detect_language(file_path)

                if language == 'unknown':
                    continue

                # Генерируем документацию с помощью ML модели
                relative_path = file_path.relative_to(repo_path)

                logger.info(f"🔧 Анализируем файл: {relative_path} ({language})")

                analysis_result = ml_generator.generate_documentation(
                    code=content,
                    context={
                        "language": language,
                        "file_path": str(relative_path),
                        "project_structure": project_structure
                    }
                )

                file_analysis = FileAnalysisResponse(
                    file_path=str(relative_path),
                    language=language,
                    documentation=analysis_result["documentation"],
                    functions=analysis_result["functions"],
                    confidence=analysis_result["confidence"],
                    status=AnalysisStatus.COMPLETED
                )

                file_analyses.append(file_analysis)
                successful_analyses += 1

                logger.info(f"✅ Проанализирован файл: {relative_path}")

            except Exception as e:
                logger.error(f"❌ Ошибка анализа файла {file_path}: {e}")
                continue

        # Генерируем общую документацию
        overall_docs = await _generate_project_documentation(
            repo_path.name,
            file_analyses,
            project_structure
        )

        processing_time = time.time() - start_time

        response = RepositoryAnalysisResponse(
            repo_path=str(repo_path),
            status=AnalysisStatus.COMPLETED,
            total_files=len(code_files),
            analyzed_files=successful_analyses,
            documentation=overall_docs,
            file_analyses=file_analyses,
            summary={
                "languages": _count_languages(file_analyses),
                "total_functions": sum(len(analysis.functions) for analysis in file_analyses),
                "average_confidence": sum(analysis.confidence for analysis in file_analyses) / len(
                    file_analyses) if file_analyses else 0,
                "project_structure": project_structure
            },
            processing_time=round(processing_time, 2)
        )

        logger.info(f"🎉 Анализ завершен: {successful_analyses}/{len(code_files)} файлов")

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Критическая ошибка при анализе репозитория: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")


@app.get("/api/local/repos/structure")
async def get_project_structure(local_path: str):
    """Возвращает структуру проекта без глубокого анализа"""
    try:
        repo_path = local_analyzer.validate_path(local_path)
        structure = local_analyzer.get_project_structure(repo_path)

        return {
            "project_path": str(repo_path),
            "project_name": repo_path.name,
            "structure": structure
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/ml/status")
async def get_ml_status():
    """Проверка статуса ML модели"""
    status = ml_generator.get_status()

    return {
        "status": status["status"],
        "model_type": status["model_type"],
        "device": status["device"],
        "has_model": status["has_model"],
        "message": f"ML модель готова к работе (тип: {status['model_type']})" if status["status"] == "ready" else "ML модель не готова к работе"
    }


# Вспомогательные функции
async def _generate_project_documentation(
        project_name: str,
        file_analyses: List[FileAnalysisResponse],
        project_structure: Dict[str, Any]
) -> str:
    """Генерирует общую документацию для проекта"""

    languages = _count_languages(file_analyses)
    total_functions = sum(len(analysis.functions) for analysis in file_analyses)

    docs = f"""
# Документация проекта: {project_name}

## Общая информация

- **Всего проанализированных файлов**: {len(file_analyses)}
- **Языки программирования**: {', '.join(f'{lang} ({count})' for lang, count in languages.items())}
- **Всего функций/методов**: {total_functions}

## Детальный анализ файлов"""

    from collections import defaultdict
    dir_structure = defaultdict(list)

    for analysis in file_analyses:
        dir_path = str(Path(analysis.file_path).parent)
        dir_structure[dir_path].append(analysis)
    # Добавляем анализ по директориям
    for dir_path, analyses in sorted(dir_structure.items()):
        if dir_path == ".":
            docs += "\n### Корневая директория\n"
        else:
            docs += f"\n### Директория: {dir_path}\n"
        for analysis in analyses:
            filename = Path(analysis.file_path).name
            docs += f"\n#### Файл: {filename}\n"
            docs += f"- **Язык**: {analysis.language}\n"
            docs += f"- **Уверенность**: {analysis.confidence:.2f}\n"
            docs += f"- **Функции**: {len(analysis.functions)}\n"
            docs += f"\n**Документация**:\n\n{analysis.documentation}\n"

    return docs


def _format_project_structure(structure: Dict[str, Any], indent: int = 0) -> str:
    """Форматирует структуру проекта в виде дерева """
    result = ""
    prefix = "    " * indent
    for name, value in structure.items():
        if isinstance(value, dict):
            result += f"{prefix}📁 {name}/\n"
            result += _format_project_structure(value, indent + 1)
        else:
            result += f"{prefix}📄 {name}\n"

    return result


def _count_languages(file_analyses: List[FileAnalysisResponse]) -> Dict[str, int]:
    """ Подсчитывает количество файлов по языкам """
    languages = {}
    for analysis in file_analyses:
        languages[analysis.language] = languages.get(analysis.language, 0) + 1
    return languages


def main():
    """ Точка входа для запуска сервера """
    try:
        print("Запуск FastAPI сервера...")
        print("Адрес: http://localhost:8000")
        print("Документация: http://localhost:8000/docs")
        print("Для остановки нажмите Ctrl+C")

        import uvicorn
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"❌ Ошибка запуска сервера: {e}")
        print(f"❌ Не удалось запустить сервер: {e}")


if __name__ == "__main__":
    main()
