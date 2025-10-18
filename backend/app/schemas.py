from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Модели для аутентификации
class UserBase(BaseModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Существующие модели для анализа
class FileAnalysisResponse(BaseModel):
    file_path: str
    language: str
    documentation: str
    functions: List[str]
    confidence: float
    status: AnalysisStatus


class RepositoryAnalysisRequest(BaseModel):
    local_path: str
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None


class RepositoryAnalysisResponse(BaseModel):
    repo_path: str
    status: AnalysisStatus
    total_files: int
    analyzed_files: int
    documentation: str
    file_analyses: List[FileAnalysisResponse]
    summary: Dict[str, Any]
    processing_time: float