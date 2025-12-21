from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# Модели для аутентификации
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# Модели для анализа GitHub репозитория
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


# Модель для DocumentationResponse из типов фронтенда
class DocumentationResponse(BaseModel):
    id: Optional[int] = None
    file_path: str
    documentation: str
    status: str
    confidence: Optional[float] = None
    functions: Optional[List[Dict[str, Any]]] = []
    error: Optional[str] = None
    language: Optional[str] = None


# Модели для истории анализов
class AnalysisHistory(BaseModel):
    id: int
    user_id: int
    repo_url: str
    repo_name: str
    branch: str
    status: str
    total_files: int
    analyzed_files: int
    processing_time: float
    summary: Dict[str, Any]
    file_analyses: List[DocumentationResponse]
    documentation: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalysisHistoryResponse(BaseModel):
    analyses: List[AnalysisHistory]
    total_count: int
    page: int
    page_size: int


# Модель для статистики пользователя
class UserStats(BaseModel):
    user_id: int
    username: str
    total_analyses: int
    total_files_analyzed: int
    total_processing_time: float
    last_analysis: Optional[datetime] = None

    class Config:
        from_attributes = True


# Модель для RepositoryRequest из типов фронтенда
class RepositoryRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    file_types: List[str] = ["*.py", "*.js", "*.ts", "*.java", "*.cpp", "*.c", "*.go", "*.rs"]


# Модель для GitHubAnalysisResponse
class GitHubAnalysisResponse(RepositoryAnalysisResult):
    pass


# Модель для проверки здоровья
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    uptime: float


# Модель для статуса сервиса
class ServiceStatus(BaseModel):
    status: str
    database: str
    ml_model: Dict[str, Any]
    timestamp: str


# Модель для ошибок
class ErrorResponse(BaseModel):
    detail: str


# Модель для успешного ответа
class SuccessResponse(BaseModel):
    message: str
    success: bool = True