from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Схемы для аутентификации

class UserLogin(BaseModel):
    """Запрос на вход"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Ответ с токенами"""
    access_token: str
    refresh_token: str  # Сделал обязательным
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Запрос на обновление токена"""
    refresh_token: str  # Сделал обязательным


class LogoutResponse(BaseModel):
    """Ответ на выход"""
    message: str
    success: bool = True


class RefreshTokenInfo(BaseModel):
    """Информация о refresh токене"""
    id: int
    created_at: datetime
    expires_at: datetime
    revoked: bool
    user_agent: Optional[str]
    ip_address: Optional[str]
    is_current: bool = False

    class Config:
        from_attributes = True


# Схемы для пользователей

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = Field(None, min_length=6)

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        if v.isnumeric():
            raise ValueError('Пароль должен содержать буквы')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if v is not None and 'password' in values and v != values['password']:
            raise ValueError('Пароли не совпадают')
        return v

    @validator('username')
    def username_valid(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Имя пользователя может содержать только буквы, цифры, _ и -')
        return v


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None

    @validator('username')
    def username_valid(cls, v):
        if v is not None and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Имя пользователя может содержать только буквы, цифры, _ и -')
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Пароли не совпадают')
        return v

    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен содержать минимум 6 символов')
        if v.isnumeric():
            raise ValueError('Пароль должен содержать буквы')
        return v


# Схемы для ролей и разрешений

class PermissionBase(BaseModel):
    """Базовая схема разрешения"""
    name: str
    resource: str
    action: str
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Создание разрешения"""
    pass


class PermissionResponse(PermissionBase):
    """Ответ с разрешением"""
    id: int

    class Config:
        from_attributes = True


class PermissionSchema(PermissionResponse):
    """Алиас для PermissionResponse"""
    pass


class RoleBase(BaseModel):
    """Базовая схема роли"""
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Создание роли"""
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    """Обновление роли"""
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    """Ответ с ролью"""
    id: int
    permissions: List[PermissionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class RoleSchema(RoleResponse):
    """Алиас для RoleResponse"""
    pass


class UserRoleUpdate(BaseModel):
    """Обновление ролей пользователя"""
    user_id: int
    role_name: str
    action: str = Field(..., pattern="^(assign|remove)$")


class UserRoleResponse(BaseModel):
    """Ответ после обновления ролей"""
    message: str
    user_id: int
    username: str
    roles: List[str]


class AssignRoleRequest(BaseModel):
    """Запрос на назначение роли"""
    user_id: int
    role_name: str


class UserWithRolesResponse(UserResponse):
    """Пользователь с ролями и разрешениями"""
    roles: List[RoleResponse] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Ответ при успешном входе"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserWithRolesResponse


# Схемы для анализов

class AnalysisHistoryBase(BaseModel):
    repo_url: str
    repo_name: str
    branch: str
    status: str
    total_files: int
    analyzed_files: int
    processing_time: float
    summary: Dict[str, Any]
    file_analyses: List[Dict[str, Any]]
    documentation: str


class AnalysisHistory(AnalysisHistoryBase):
    id: int
    user_id: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnalysisHistoryResponse(BaseModel):
    analyses: List[AnalysisHistory]
    total_count: int
    page: int
    page_size: int


class UserStats(BaseModel):
    user_id: int
    username: str
    total_analyses: int
    total_files_analyzed: int
    total_processing_time: float
    last_analysis: Optional[datetime] = None


class UserAnalyticsStats(BaseModel):
    user_id: int
    username: str
    total_analyses: int
    total_files_analyzed: int
    total_processing_time: float
    preferred_languages: Dict[str, int] = Field(default_factory=dict)
    account_created: datetime
    active: bool
    last_analysis: Optional[datetime] = None


class GitHubAnalysisRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    include_patterns: List[str] = Field(default_factory=lambda: ["*.py", "*.js", "*.ts", "*.java", "*.cpp", "*.c", "*.go"])
    exclude_patterns: List[str] = Field(default_factory=lambda: [
        "*/test/*",
        "*/tests/*",
        "*/__pycache__/*",
        "*/node_modules/*",
        "*/dist/*",
        "*/build/*",
    ])
    max_files: int = 50


class FileAnalysisResult(BaseModel):
    file_path: str
    language: str
    documentation: str
    ai_documentation: Optional[str] = None
    functions: List[Dict[str, Any]]
    confidence: float
    status: str
    generation_time: Optional[float] = None
    source: Optional[str] = None
    structure: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class RepositoryAnalysisResult(BaseModel):
    status: str
    repo_url: str
    repo_name: str
    total_files: int
    analyzed_files: int
    successful_analyses: int
    processing_time: float
    average_confidence: float
    languages: Dict[str, int]
    file_analyses: List[FileAnalysisResult]
    summary: Dict[str, Any]
    history_id: Optional[int] = None
    created_at: Optional[datetime] = None
    documentation: Optional[str] = None


class RepositoryPreviewResponse(BaseModel):
    source: str = "github"
    full_name: str
    owner: str
    repo: str
    description: Optional[str] = None
    primary_language: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    watchers: int = 0
    default_branch: str
    license: Optional[str] = None
    homepage: Optional[str] = None
    is_private: bool = False
    archived: bool = False
    html_url: str
    avatar_url: Optional[str] = None
    last_pushed_at: Optional[datetime] = None
    last_updated_at: Optional[datetime] = None


# Системные схемы

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    uptime: float


class AdminStatsResponse(BaseModel):
    total_users: int
    total_analyses: int
    role_distribution: Dict[str, int]
    active_users: int
    timestamp: datetime


# Схемы для фильтрации и пагинации

class AnalysisFilterParams(BaseModel):
    """Параметры фильтрации анализов"""
    repo_name: Optional[str] = Field(None, description="Название репозитория (поиск по части)")
    status: Optional[str] = Field(None, pattern="^(completed|processing|failed)$")
    language: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_files: Optional[int] = Field(None, ge=0)
    max_files: Optional[int] = Field(None, ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "repo_name": "my-project",
                "status": "completed",
                "date_from": "2024-01-01T00:00:00",
                "date_to": "2024-12-31T23:59:59"
            }
        }


class AnalysisSortParams(BaseModel):
    """Параметры сортировки"""
    sort_by: str = Field("created_at", pattern="^(created_at|repo_name|total_files|processing_time)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Обертка для пагинированного ответа"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# Схемы для управления пользовательскими данными

class AnalysisCreate(BaseModel):
    """Создание нового анализа"""
    repo_url: str
    branch: str = "main"
    include_patterns: List[str] = ["*.py", "*.js", "*.ts", "*.java", "*.cpp", "*.c", "*.go"]
    exclude_patterns: List[str] = ["*/test/*", "*/tests/*", "*/__pycache__/*", "*/node_modules/*"]
    max_files: int = Field(50, ge=1, le=200)


class AnalysisUpdate(BaseModel):
    """Обновление анализа"""
    status: Optional[str] = Field(None, pattern="^(completed|processing|failed)$")
    documentation: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None


# Схемы для работы с файлами

class FileUploadResponse(BaseModel):
    """Ответ после загрузки файла"""
    file_id: str
    filename: str
    size: int
    content_type: str
    upload_url: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime


class FileInfo(BaseModel):
    """Информация о файле"""
    id: int
    filename: str
    original_name: str
    file_size: int
    content_type: str
    analysis_id: Optional[int]
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

Token = TokenResponse
LoginRequest = UserLogin
