from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base
from .role import user_roles


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Связи
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    analyses = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    files = relationship("UploadedFile", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_admin(self):
        """Проверка, является ли пользователь администратором"""
        return any(role.name == 'admin' for role in self.roles)

    @property
    def permissions(self):
        """Получить все разрешения пользователя через его роли"""
        perms = set()
        for role in self.roles:
            for perm in role.permissions:
                perms.add(perm.name)
        return list(perms)

    def has_permission(self, permission_name: str) -> bool:
        """Проверка наличия конкретного разрешения"""
        for role in self.roles:
            for perm in role.permissions:
                if perm.name == permission_name:
                    return True
        return False

    def has_any_permission(self, permission_names: list) -> bool:
        """Проверка наличия хотя бы одного разрешения из списка"""
        for role in self.roles:
            for perm in role.permissions:
                if perm.name in permission_names:
                    return True
        return False

    def has_all_permissions(self, permission_names: list) -> bool:
        """Проверка наличия всех разрешений из списка"""
        user_perms = set(self.permissions)
        required_perms = set(permission_names)
        return required_perms.issubset(user_perms)


class AnalysisHistory(Base):
    __tablename__ = 'analysis_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    repo_url = Column(String, nullable=False)
    repo_name = Column(String, nullable=False)
    branch = Column(String, default='main')
    status = Column(String, default='completed')  # completed, processing, failed
    total_files = Column(Integer, default=0)
    analyzed_files = Column(Integer, default=0)
    processing_time = Column(Float, default=0.0)
    summary = Column(JSON, default={})
    file_analyses = Column(JSON, default=[])
    documentation = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    files = relationship("UploadedFile", back_populates="analysis", cascade="all, delete-orphan")

    # Связь с пользователем
    user = relationship("User", back_populates="analyses")