from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

from .database import engine

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    repo_url = Column(String(500))  # ← ДОБАВЛЕНО
    repo_name = Column(String(200))  # ← ДОБАВЛЕНО
    branch = Column(String(100), default="main")  # ← ДОБАВЛЕНО
    status = Column(String(50), default="completed")  # ← ДОБАВЛЕНО
    repo_path = Column(String(500))  # Существующее поле, можно оставить
    total_files = Column(Integer)
    analyzed_files = Column(Integer)
    processing_time = Column(Float)  # Изменил на Float для точности
    summary = Column(JSON)  # ← ДОБАВЛЕНО (если не поддерживает JSON, используйте Text)
    file_analyses = Column(JSON)  # ← ДОБАВЛЕНО
    documentation = Column(Text)  # ← ДОБАВЛЕНО
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))  # ← ДОБАВЛЕНО

def create_tables():
    """Создает таблицы в базе данных"""
    print("🔄 Создаем таблицы в базе данных...")
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы успешно!")
if __name__ == "__main__":
    create_tables()