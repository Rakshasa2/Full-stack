from fastapi import FastAPI, HTTPException, Depends, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse, PlainTextResponse, Response
from sqlalchemy import text
import time
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import tempfile
import shutil
from git import Repo
import boto3
import uuid
from botocore.exceptions import ClientError

from .schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    RefreshRequest,
    LogoutResponse,
    RefreshTokenInfo,
    LoginResponse,
    AnalysisHistory,
    AnalysisHistoryResponse,
    UserAnalyticsStats,
    GitHubAnalysisRequest,
    RepositoryAnalysisResult,
    HealthResponse,
    FileAnalysisResult,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserWithRolesResponse,
    AssignRoleRequest,
    AdminStatsResponse,
    RoleSchema,
    PaginatedResponse,
    FileUploadResponse,
    FileInfo,
    AnalysisUpdate,
    RepositoryPreviewResponse,
)

from app.auth.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_current_active_user,
    refresh_access_token,
    revoke_all_user_tokens,
    get_user_sessions,
    revoke_token_by_id,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

from .database import get_db, engine, Base
from app.models.models import User, AnalysisHistory as AnalysisHistoryModel
from app.models.token import RefreshToken
from app.models.role import Role
from app.models.file import UploadedFile
from app.auth.permissions import (
    PermissionChecker,
)
from app.services.github_preview_service import GitHubPreviewError, GitHubRepositoryPreviewService
from app.init_roles import (
    init_roles_and_permissions,
    ensure_admin_exists
)
from app.services.seo_service import build_robots_txt, build_sitemap_xml, resolve_site_url

# Инициализация ML генератора
try:
    from .ai.ml_generator import MLGenerator

    ml_generator = MLGenerator()
    ML_AVAILABLE = True
except ImportError as e:
    logging.warning(f"MLGenerator не доступен: {e}")
    ml_generator = None
    ML_AVAILABLE = False

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создание таблиц
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Таблицы базы данных созданы/проверены")
except Exception as e:
    logger.error(f"Ошибка создания таблиц: {e}")

# Инициализация S3 клиента
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "codedoc-files")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
ALLOWED_FILE_TYPES = os.getenv("ALLOWED_FILE_TYPES", ".pdf,.txt,.md,.json,.zip").split(",")

s3_client = None
S3_AVAILABLE = False


def initialize_s3_client(force: bool = False) -> bool:
    global s3_client, S3_AVAILABLE

    if s3_client is not None and S3_AVAILABLE and not force:
        return True

    was_available = S3_AVAILABLE

    try:
        client = boto3.client(
            's3',
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
            region_name=S3_REGION,
            config=boto3.session.Config(signature_version='s3v4')
        )

        try:
            client.head_bucket(Bucket=S3_BUCKET_NAME)
        except ClientError:
            try:
                client.create_bucket(Bucket=S3_BUCKET_NAME)
                logger.info(f"Создан бакет: {S3_BUCKET_NAME}")
            except ClientError as e:
                logger.warning(f"Не удалось создать бакет: {e}")

        s3_client = client
        S3_AVAILABLE = True

        if force or not was_available:
            logger.info("S3 хранилище подключено")

        return True
    except Exception as e:
        if force or was_available:
            logger.warning(f"S3 не доступен: {e}")

        s3_client = None
        S3_AVAILABLE = False
        return False


initialize_s3_client(force=True)

app = FastAPI(
    title="CodeDoc AI API",
    description="API для автоматической генерации документации кода с AI",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

app_start_time = time.time()
github_preview_service = GitHubRepositoryPreviewService()


@app.on_event("startup")
async def startup_event():
    """Событие запуска приложения"""
    logger.info("CodeDoc AI API запускается...")
    try:
        initialize_s3_client(force=True)

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Подключение к базе данных успешно")

        db = next(get_db())
        try:
            init_roles_and_permissions(db)
            ensure_admin_exists(db)
            logger.info("Роли и разрешения инициализированы")
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Ошибка при запуске: {e}")


@app.get("/robots.txt", include_in_schema=False)
async def robots_txt(request: Request):
    site_url = resolve_site_url(request)
    return PlainTextResponse(
        content=build_robots_txt(site_url),
        headers={"Cache-Control": "public, max-age=3600"}
    )


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml(request: Request):
    site_url = resolve_site_url(request)
    return Response(
        content=build_sitemap_xml(site_url),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )


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
    return {
        "status": "operational",
        "database": "available",
        "ml_model": "available" if ML_AVAILABLE else "unavailable",
        "s3_storage": "available" if (S3_AVAILABLE or initialize_s3_client()) else "unavailable",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }


@app.get("/api/integrations/github/repository-preview", response_model=RepositoryPreviewResponse)
async def get_github_repository_preview(
        request: Request,
        repo_url: str = Query(..., description="GitHub repository URL"),
        current_user: User = Depends(PermissionChecker("analysis:create")),
):
    client_host = request.client.host if request.client else "unknown"
    client_key = f"{current_user.id}:{client_host}"

    try:
        preview = github_preview_service.get_repository_preview(repo_url=repo_url, client_key=client_key)
        return RepositoryPreviewResponse(**preview)
    except GitHubPreviewError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


# Аутентификация

@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Попытка регистрации пользователя: {user_data.email}")

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
        db.flush()

        user_role = db.query(Role).filter(Role.name == 'user').first()
        if user_role:
            user.roles.append(user_role)

        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            created_at=user.created_at
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка регистрации: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка регистрации: {str(e)}"
        )


@app.post("/api/auth/login", response_model=LoginResponse)
def login(
        request: Request,
        user_data: UserLogin,
        db: Session = Depends(get_db)
):
    try:
        logger.info(f"Попытка входа: {user_data.email}")

        user = db.query(User).filter(User.email == user_data.email).first()

        if not user or not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Учетная запись деактивирована"
            )

        access_token = create_access_token(
            {"sub": str(user.id)},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        refresh_token, _ = create_refresh_token(
            {"sub": str(user.id)},
            db,
            request.headers.get("user-agent"),
            request.client.host
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserWithRolesResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                created_at=user.created_at,
                roles=user.roles,
                permissions=user.permissions,
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка входа: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка входа: {str(e)}"
        )


@app.post("/api/auth/refresh", response_model=Token)
async def refresh_token(
        request: Request,
        token_data: RefreshRequest,
        db: Session = Depends(get_db)
):
    try:
        if not token_data.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token обязателен"
            )

        new_access_token, new_refresh_token = await refresh_access_token(
            token_data.refresh_token,
            db,
            request.headers.get("user-agent"),
            request.client.host
        )

        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )
    except Exception as e:
        logger.error(f"Ошибка обновления токена: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка обновления токена"
        )


@app.post("/api/auth/logout", response_model=LogoutResponse)
def logout(
        request: Request,
        logout_data: Optional[RefreshRequest] = None,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    try:
        if logout_data and logout_data.refresh_token:
            token = db.query(RefreshToken).filter(
                RefreshToken.token == logout_data.refresh_token,
                RefreshToken.user_id == current_user.id
            ).first()

            if token and not token.is_revoked:
                token.revoke()
                db.commit()
                return LogoutResponse(message="Сессия успешно завершена")
            else:
                return LogoutResponse(message="Сессия не найдена или уже завершена")
        else:
            return LogoutResponse(message="Сессия завершена")

    except Exception as e:
        logger.error(f"Ошибка при выходе: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при завершении сессии"
        )


@app.post("/api/auth/logout-all", response_model=LogoutResponse)
def logout_all_devices(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    try:
        revoke_all_user_tokens(current_user.id, db)
        return LogoutResponse(message="Все сессии успешно завершены")
    except Exception as e:
        logger.error(f"Ошибка при выходе со всех устройств: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при завершении сессий"
        )


@app.get("/api/auth/sessions", response_model=List[RefreshTokenInfo])
def get_sessions(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    try:
        token_jti = getattr(request.state, "token_jti", None)
        sessions = get_user_sessions(current_user.id, db, token_jti)
        return sessions
    except Exception as e:
        logger.error(f"Ошибка получения сессий: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения списка сессий"
        )


@app.delete("/api/auth/sessions/{session_id}", response_model=LogoutResponse)
def revoke_session(
        session_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    try:
        if revoke_token_by_id(session_id, current_user.id, db):
            return LogoutResponse(message="Сессия успешно завершена")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Сессия не найдена"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка завершения сессии: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при завершении сессии"
        )


@app.get("/api/auth/me", response_model=UserWithRolesResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return UserWithRolesResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        roles=current_user.roles,
        permissions=current_user.permissions
    )


@app.get("/api/auth/token-info")
def get_token_info(
        request: Request,
        current_user: User = Depends(get_current_user)
):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")

    try:
        import jwt
        from app.auth.auth import SECRET_KEY, ALGORITHM

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_time = datetime.fromtimestamp(payload["exp"])
        now = datetime.utcnow()
        time_left = exp_time - now

        return {
            "token_type": payload.get("type"),
            "user_id": payload.get("sub"),
            "expires_at": exp_time.isoformat(),
            "time_left_minutes": round(time_left.total_seconds() / 60, 2),
            "jti": payload.get("jti"),
            "is_access_token": payload.get("type") == "access"
        }
    except Exception as e:
        return {"error": str(e)}


# Управление профилем

@app.put("/api/auth/update-profile", response_model=UserResponse)
def update_profile(
        profile_data: UpdateProfileRequest,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    if profile_data.username and profile_data.username != user.username:
        existing_user = db.query(User).filter(
            User.username == profile_data.username,
            User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким именем уже существует"
            )
        user.username = profile_data.username

    if profile_data.email and profile_data.email != user.email:
        existing_user = db.query(User).filter(
            User.email == profile_data.email,
            User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )
        user.email = profile_data.email

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        created_at=user.created_at
    )


@app.put("/api/auth/change-password", response_model=dict)
def change_password(
        password_data: ChangePasswordRequest,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль"
        )

    if password_data.new_password == password_data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен отличаться от текущего"
        )

    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Пароль успешно изменен", "status": "success"}


# Анализы с фильтрацией и пагинацией
@app.get("/api/analyses", response_model=PaginatedResponse)
async def get_analyses(
        page: int = Query(1, ge=1),
        page_size: int = Query(10, ge=1, le=100),
        repo_name: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort_by: str = Query("created_at"),  # ✅ Без regex
        sort_order: str = Query("desc"),  # ✅ Без regex
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    """Получить список анализов с фильтрацией, сортировкой и пагинацией"""

    # ✅ Маппинг полей сортировки
    sort_field_map = {
        'created_at': AnalysisHistoryModel.created_at,
        'repo_name': AnalysisHistoryModel.repo_name,
        'total_files': AnalysisHistoryModel.total_files,
        'processing_time': AnalysisHistoryModel.processing_time,
        # ✅ Алиасы для совместимости
        'files': AnalysisHistoryModel.total_files,
        'time': AnalysisHistoryModel.processing_time,
        'date': AnalysisHistoryModel.created_at,
    }

    # ✅ Получаем поле сортировки (с дефолтом)
    sort_column = sort_field_map.get(sort_by, AnalysisHistoryModel.created_at)

    # ✅ Нормализуем порядок сортировки
    order = sort_order.lower() if sort_order.lower() in ['asc', 'desc'] else 'desc'

    logger.info(f"Сортировка: {sort_by} {order} (поле: {sort_column})")

    query = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.user_id == current_user.id
    )

    # Фильтрация
    if repo_name:
        query = query.filter(AnalysisHistoryModel.repo_name.ilike(f"%{repo_name}%"))

    if status:
        query = query.filter(AnalysisHistoryModel.status == status)

    if date_from:
        query = query.filter(AnalysisHistoryModel.created_at >= date_from)

    if date_to:
        query = query.filter(AnalysisHistoryModel.created_at <= date_to)

    # Сортировка
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Пагинация
    total = query.count()
    offset = (page - 1) * page_size
    analyses = query.offset(offset).limit(page_size).all()

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

    items = [AnalysisHistory.model_validate(analysis) for analysis in analyses]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )

# НОВЫЙ ЭНДПОИНТ ДЛЯ СОВМЕСТИМОСТИ
@app.get("/api/analyses/history")
async def get_analyses_history_compat(
        skip: int = Query(0, ge=0, description="Количество пропускаемых записей"),
        limit: int = Query(10, ge=1, le=100, description="Количество записей на странице"),
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    logger.info(f"Запрос истории анализов: skip={skip}, limit={limit}, user_id={current_user.id}")

    # Базовый запрос
    query = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.user_id == current_user.id
    )

    # Получаем общее количество
    total = query.count()

    # Получаем анализы с пагинацией и сортировкой по убыванию даты
    analyses = query.order_by(
        AnalysisHistoryModel.created_at.desc()
    ).offset(skip).limit(limit).all()

    analyses_data = [AnalysisHistory.model_validate(analysis) for analysis in analyses]

    return {
        "analyses": analyses_data,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@app.get("/api/analyses/{analysis_id}", response_model=AnalysisHistory)
async def get_analysis_details(
        analysis_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.id == analysis_id,
        AnalysisHistoryModel.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )

    return analysis


@app.put("/api/analyses/{analysis_id}", response_model=AnalysisHistory)
async def update_analysis(
        analysis_id: int,
        analysis_data: AnalysisUpdate,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.id == analysis_id,
        AnalysisHistoryModel.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )

    update_data = analysis_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(analysis, field, value)

    db.commit()
    db.refresh(analysis)

    return AnalysisHistory.model_validate(analysis)


@app.delete("/api/analyses/{analysis_id}")
async def delete_analysis(
        analysis_id: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.id == analysis_id,
        AnalysisHistoryModel.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )

    db.delete(analysis)
    db.commit()

    return {"message": "Анализ успешно удален"}


# Работа с файлами (S3)

def generate_file_id() -> str:
    return str(uuid.uuid4())


def generate_presigned_upload_url(file_id: str, content_type: str) -> Optional[str]:
    if not initialize_s3_client():
        return None
    try:
        return s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': f"uploads/{file_id}",
                'ContentType': content_type
            },
            ExpiresIn=3600
        )
    except Exception as e:
        logger.error(f"Ошибка генерации upload URL: {e}")
        return None


def generate_presigned_download_url(file_id: str) -> Optional[str]:
    if not initialize_s3_client():
        return None
    try:
        return s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': S3_BUCKET_NAME,
                'Key': f"uploads/{file_id}"
            },
            ExpiresIn=3600
        )
    except Exception as e:
        logger.error(f"Ошибка генерации download URL: {e}")
        return None


def delete_s3_file(file_id: str) -> bool:
    if not initialize_s3_client():
        return False
    try:
        s3_client.delete_object(
            Bucket=S3_BUCKET_NAME,
            Key=f"uploads/{file_id}"
        )
        return True
    except Exception as e:
        logger.error(f"Ошибка удаления файла из S3: {e}")
        return False


@app.post("/api/files/upload-url", response_model=FileUploadResponse)
async def get_file_upload_url(
        filename: str,
        content_type: str,
        analysis_id: Optional[int] = None,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    if not initialize_s3_client():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3 хранилище недоступно"
        )

    # Проверка типа файла
    file_ext = f".{filename.split('.')[-1].lower()}"
    if file_ext not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый тип файла. Разрешены: {ALLOWED_FILE_TYPES}"
        )

    # Проверка прав доступа к анализу
    if analysis_id:
        analysis = db.query(AnalysisHistoryModel).filter(
            AnalysisHistoryModel.id == analysis_id,
            AnalysisHistoryModel.user_id == current_user.id
        ).first()

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Анализ не найден"
            )

    file_id = generate_file_id()
    upload_url = generate_presigned_upload_url(file_id, content_type)

    if not upload_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сгенерировать URL для загрузки"
        )

    db_file = UploadedFile(
        file_id=file_id,
        filename=f"uploads/{file_id}",
        original_name=filename,
        file_size=0,
        content_type=content_type,
        analysis_id=analysis_id,
        user_id=current_user.id
    )

    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return FileUploadResponse(
        file_id=file_id,
        filename=filename,
        size=0,
        content_type=content_type,
        upload_url=upload_url,
        created_at=db_file.created_at
    )


@app.post("/api/files/{file_id}/confirm")
async def confirm_file_upload(
        file_id: str,
        file_size: int,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    db_file = db.query(UploadedFile).filter(
        UploadedFile.file_id == file_id,
        UploadedFile.user_id == current_user.id
    ).first()

    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )

    db_file.file_size = file_size
    db.commit()

    return {"message": "Файл успешно загружен", "file_id": file_id}


@app.get("/api/files/{file_id}/download-url")
async def get_file_download_url(
        file_id: str,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    if not initialize_s3_client():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3 хранилище недоступно"
        )

    db_file = db.query(UploadedFile).filter(
        UploadedFile.file_id == file_id
    ).first()

    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )

    if db_file.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет прав для скачивания этого файла"
        )

    download_url = generate_presigned_download_url(file_id)

    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сгенерировать URL для скачивания"
        )

    return {
        "download_url": download_url,
        "expires_in": 3600,
        "filename": db_file.original_name,
        "file_size": db_file.file_size
    }


@app.delete("/api/files/{file_id}")
async def delete_file(
        file_id: str,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    db_file = db.query(UploadedFile).filter(
        UploadedFile.file_id == file_id
    ).first()

    if not db_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )

    if db_file.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет прав для удаления этого файла"
        )

    if initialize_s3_client():
        delete_s3_file(file_id)

    db.delete(db_file)
    db.commit()

    return {"message": "Файл успешно удален"}


@app.get("/api/files", response_model=List[FileInfo])
async def get_user_files(
        analysis_id: Optional[int] = None,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
):
    query = db.query(UploadedFile).filter(UploadedFile.user_id == current_user.id)

    if analysis_id:
        query = query.filter(UploadedFile.analysis_id == analysis_id)

    files = query.order_by(UploadedFile.created_at.desc()).all()

    return files


# Анализ репозитория

def clone_repository(repo_url: str, branch: str = "main") -> str:
    temp_dir = tempfile.mkdtemp()
    try:
        logger.info(f"Клонируем репозиторий: {repo_url}")
        Repo.clone_from(repo_url, temp_dir, branch=branch, depth=1)
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
        '.rs': 'rust', '.php': 'php',
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


@app.post("/api/analyze/github", response_model=RepositoryAnalysisResult)
async def analyze_github_repository(
        request: GitHubAnalysisRequest,
        current_user: User = Depends(PermissionChecker("analysis:create")),
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

                if ML_AVAILABLE and ml_generator:
                    analysis_result = ml_generator.generate_documentation(
                        code=content,
                        context={
                            "language": language,
                            "file_path": relative_path,
                            "user_id": current_user.id,
                            "timestamp": time.time()
                        }
                    )

                    file_analysis_data = {
                        "file_path": relative_path,
                        "language": language,
                        "documentation": analysis_result.get("documentation", ""),
                        "functions": analysis_result.get("functions", []),
                        "confidence": analysis_result.get("confidence", 0),
                        "status": "success"
                    }
                else:
                    file_analysis_data = {
                        "file_path": relative_path,
                        "language": language,
                        "documentation": f"# {relative_path}\n\nФайл на языке {language}",
                        "functions": [],
                        "confidence": 0.5,
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
            if analysis.get("status", "success") == "success":
                total_confidence += analysis.get("confidence", 0)
                successful_analyses += 1

        avg_confidence = total_confidence / successful_analyses if successful_analyses > 0 else 0

        project_documentation = generate_project_documentation(repo_name, file_analyses)

        summary = {
            "total_functions": sum(len(a.get("functions", [])) for a in file_analyses),
            "successful_analyses": successful_analyses,
            "failed_analyses": len(file_analyses) - successful_analyses,
            "average_confidence": round(avg_confidence, 2),
            "languages": languages_count,
            "timestamp": datetime.now().isoformat(),
            "total_processing_time": round(processing_time, 2)
        }

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

        response_data = RepositoryAnalysisResult(
            repo_url=request.repo_url,
            repo_name=repo_name,
            status="completed",
            total_files=len(code_files),
            analyzed_files=len(file_analyses),
            successful_analyses=successful_analyses,
            processing_time=round(processing_time, 2),
            average_confidence=round(avg_confidence, 2),
            languages=languages_count,
            file_analyses=[FileAnalysisResult(**fa) for fa in file_analyses],
            summary=summary,
            history_id=analysis_history.id,
            created_at=datetime.utcnow(),
            documentation=project_documentation
        )

        return response_data

    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка анализа: {str(e)}"
        )
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


@app.get("/api/analytics/user-stats", response_model=UserAnalyticsStats)
def get_analytics_user_stats(
        current_user: User = Depends(PermissionChecker("stats:view:own")),
        db: Session = Depends(get_db)
):
    analyses = db.query(AnalysisHistoryModel).filter(
        AnalysisHistoryModel.user_id == current_user.id,
        AnalysisHistoryModel.status == "completed"
    ).all()

    total_analyses = len(analyses)
    total_files_analyzed = sum(a.analyzed_files for a in analyses)
    total_processing_time = sum(a.processing_time for a in analyses)
    last_analysis = max(
        (analysis.completed_at or analysis.created_at for analysis in analyses),
        default=None
    )

    languages = {}
    for analysis in analyses:
        if analysis.summary and 'languages' in analysis.summary:
            for lang, count in analysis.summary['languages'].items():
                languages[lang] = languages.get(lang, 0) + count

    return UserAnalyticsStats(
        user_id=current_user.id,
        username=current_user.username,
        total_analyses=total_analyses,
        total_files_analyzed=total_files_analyzed,
        total_processing_time=round(total_processing_time, 2),
        preferred_languages=dict(sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]),
        account_created=current_user.created_at,
        active=current_user.is_active,
        last_analysis=last_analysis,
    )


# Админ-панель

@app.get("/api/admin/users", response_model=List[UserWithRolesResponse])
async def get_all_users(
        skip: int = 0,
        limit: int = 100,
        current_user: User = Depends(PermissionChecker("users:view:all")),
        db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return [
        UserWithRolesResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            created_at=user.created_at,
            roles=user.roles,
            permissions=user.permissions
        ) for user in users
    ]


@app.post("/api/admin/users/assign-role")
async def assign_role(
        request: AssignRoleRequest,
        current_user: User = Depends(PermissionChecker("roles:manage")),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    role = db.query(Role).filter(Role.name == request.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")

    if role not in user.roles:
        user.roles.append(role)
        db.commit()

    return {"message": f"Роль {request.role_name} назначена пользователю {user.username}"}


@app.delete("/api/admin/users/{user_id}/roles/{role_name}")
async def remove_role(
        user_id: int,
        role_name: str,
        current_user: User = Depends(PermissionChecker("roles:manage")),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")

    if role in user.roles:
        user.roles.remove(role)
        db.commit()

    return {"message": f"Роль {role_name} удалена у пользователя {user.username}"}


@app.get("/api/admin/roles", response_model=List[RoleSchema])
async def get_all_roles(
        current_user: User = Depends(PermissionChecker("roles:manage")),
        db: Session = Depends(get_db)
):
    return db.query(Role).all()


@app.get("/api/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
        current_user: User = Depends(PermissionChecker("stats:view:all")),
        db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_analyses = db.query(AnalysisHistoryModel).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    role_stats = {}
    roles = db.query(Role).all()
    for role in roles:
        role_stats[role.name] = len(role.users)

    return AdminStatsResponse(
        total_users=total_users,
        total_analyses=total_analyses,
        role_distribution=role_stats,
        active_users=active_users,
        timestamp=datetime.now()
    )


# Обработчики ошибок

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
                "health_check": "/api/health"
            }
        }
    )


@app.exception_handler(500)
async def internal_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Внутренняя ошибка сервера"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
