import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uuid
import os
from dotenv import load_dotenv

from app.database import get_db
from app.models.models import User
from app.models.token import RefreshToken
from app.schemas import RefreshTokenInfo

load_dotenv()

# Секретные ключи для JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "your-refresh-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль с помощью bcrypt"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Генерирует хеш пароля с помощью bcrypt"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Создает access token с коротким сроком жизни"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4())
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
        data: Dict[str, Any],
        db: Session,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
) -> Tuple[str, RefreshToken]:
    """Создает refresh token с длительным сроком жизни и сохраняет в БД"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    token_id = str(uuid.uuid4())
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": token_id
    })

    refresh_token_str = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

    # Сохраняем refresh token в БД
    db_token = RefreshToken(
        token=refresh_token_str,
        user_id=int(data.get("sub")),
        expires_at=expire,
        user_agent=user_agent,
        ip_address=ip_address
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)

    return refresh_token_str, db_token


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """Верифицирует токен и возвращает payload"""
    try:
        secret_key = SECRET_KEY if token_type == "access" else REFRESH_SECRET_KEY
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])

        if payload.get("type") != token_type:
            return None

        return payload
    except JWTError:
        return None


async def get_current_user(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
) -> User:
    """Получает текущего пользователя из access token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    payload = verify_token(credentials.credentials, "access")
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception

    # Сохраняем jti токена в request state
    request.state.token_jti = payload.get("jti")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Проверяет, активен ли пользователь"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неактивный пользователь"
        )
    return current_user


async def refresh_access_token(
        refresh_token: str,
        db: Session,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
) -> Tuple[str, str]:
    """Обновляет access token с использованием refresh token (ротация токенов)"""

    # Верифицируем refresh token
    payload = verify_token(refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh token"
        )

    # Проверяем существование токена в БД
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.is_revoked == False
    ).first()

    if not db_token or not db_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token недействителен или отозван"
        )

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или неактивен"
        )

    # Отзываем старый refresh token (ротация)
    db_token.revoke()

    # Создаем новый refresh token
    new_refresh_token, new_db_token = create_refresh_token(
        {"sub": str(user.id)},
        db,
        user_agent,
        ip_address
    )

    # Связываем новый токен со старым
    new_db_token.replaced_by = db_token.id
    db.commit()

    # Создаем новый access token
    new_access_token = create_access_token({"sub": str(user.id)})

    return new_access_token, new_refresh_token


def revoke_all_user_tokens(user_id: int, db: Session, exclude_token_id: Optional[int] = None):
    """Отзывает все refresh токены пользователя"""
    query = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked == False
    )

    if exclude_token_id:
        query = query.filter(RefreshToken.id != exclude_token_id)

    tokens = query.all()
    for token in tokens:
        token.revoke()

    db.commit()


def cleanup_expired_tokens(db: Session):
    """Очищает истекшие токены"""
    db.query(RefreshToken).filter(
        RefreshToken.expires_at < datetime.utcnow()
    ).delete()
    db.commit()


def get_user_sessions(user_id: int, db: Session, current_token_jti: Optional[str] = None) -> List[RefreshTokenInfo]:
    """Получает список всех активных сессий пользователя"""
    tokens = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > datetime.utcnow()
    ).all()

    sessions = []
    for token in tokens:
        # Получаем jti из токена (нужно декодировать)
        try:
            payload = jwt.decode(token.token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
            token_jti = payload.get("jti")
        except:
            token_jti = None

        sessions.append(RefreshTokenInfo(
            id=token.id,
            created_at=token.created_at,
            expires_at=token.expires_at,
            revoked=token.is_revoked,
            user_agent=token.user_agent,
            ip_address=token.ip_address
        ))

    return sessions


def revoke_token_by_id(token_id: int, user_id: int, db: Session) -> bool:
    """Отзывает конкретный токен по ID"""
    token = db.query(RefreshToken).filter(
        RefreshToken.id == token_id,
        RefreshToken.user_id == user_id
    ).first()

    if token and not token.is_revoked:
        token.revoke()
        db.commit()
        return True

    return False


def get_token_expires_in(token: str) -> int:
    """Возвращает время жизни токена в секундах"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.fromtimestamp(exp)
            now = datetime.utcnow()
            if expires_at > now:
                return int((expires_at - now).total_seconds())
    except:
        pass
    return 0