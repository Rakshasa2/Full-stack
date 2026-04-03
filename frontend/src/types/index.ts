import { CSSProperties } from 'react';

export interface FunctionInfo {
  name: string;
  line?: number;
  type?: string;
  params?: string[];
  description?: string;
}

// Базовый интерфейс пользователя
export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  created_at: string;
  roles: Role[];
  permissions: string[];
}

// Типы для форм
export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// Документация
export interface DocumentationResponse {
  id: string;
  file_path: string;
  language: string;
  documentation: string;
  ai_documentation?: string;
  functions: FunctionInfo[];
  confidence: number;
  status: string;
  generation_time?: number;
  source?: string;
  structure?: {
    total_lines: number;
    function_count: number;
    class_count: number;
  };
  error?: string;
}

// Запрос на анализ репозитория
export interface RepositoryRequest {
  repo_url: string;
  branch: string;
  file_types: string[];
  max_files?: number;
}

// История анализов
export interface AnalysisHistory {
  id: number;
  user_id: number;
  repo_url: string;
  repo_name: string;
  branch: string;
  status: string;
  total_files: number;
  analyzed_files: number;
  processing_time: number;
  summary: AnalysisSummary;
  file_analyses: DocumentationResponse[];
  documentation: string;
  created_at: string;
  started_at: string;
  completed_at?: string;
}

export interface AnalysisSummary {
  total_functions?: number;
  successful_analyses?: number;
  failed_analyses?: number;
  timestamp?: string;
  languages?: Record<string, number>;
  [key: string]: string | number | boolean | Record<string, number> | undefined;
}

export interface AnalysisHistoryResponse {
  analyses: AnalysisHistory[];
  total_count: number;
  page: number;
  page_size: number;
}

// Статистика пользователя
export interface UserAnalyticsStats {
  user_id: number;
  username: string;
  total_analyses: number;
  total_files_analyzed: number;
  total_processing_time: number;
  preferred_languages: Record<string, number>;
  account_created: string;
  active: boolean;
  last_analysis?: string;
}

// Ответ от GitHub анализа
export interface GitHubAnalysisResponse {
  status: string;
  repo_url: string;
  repo_name: string;
  total_files: number;
  analyzed_files: number;
  successful_analyses: number;
  processing_time: number;
  average_confidence: number;
  languages: Record<string, number>;
  file_analyses: DocumentationResponse[];
  summary: AnalysisSummary;
  history_id?: number;
  created_at?: string;
}

export interface RepositoryPreview {
  source: string;
  full_name: string;
  owner: string;
  repo: string;
  description?: string;
  primary_language?: string;
  topics: string[];
  stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  license?: string;
  homepage?: string;
  is_private: boolean;
  archived: boolean;
  html_url: string;
  avatar_url?: string;
  last_pushed_at?: string;
  last_updated_at?: string;
}

// === Роли и разрешения ===
export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

// Интерфейсы для управления ролями
export interface AssignRoleRequest {
  user_id: number;
  role_name: string;
}

export interface AdminStats {
  total_users: number;
  total_analyses: number;
  role_distribution: Record<string, number>;
  active_users: number;
  timestamp: string;
}

export interface UserWithRoles extends User {
  roles: Role[];
  permissions: string[];
}

// Аутентификация
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type AuthResponse = LoginResponse;

export interface Token {
  access_token: string;
  token_type: string;
}

export interface FileUploadUrlResponse {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
  upload_url: string;
  created_at: string;
}

export interface FileDownloadUrlResponse {
  download_url: string;
  expires_in: number;
  filename: string;
  file_size: number;
}

// Пагинация
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Информация о файле
export interface FileInfo {
  id: number;
  file_id: string;
  original_name: string;
  file_size: number;
  content_type: string;
  analysis_id?: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'uploaded' | 'processed' | 'error';
}

export type { CSSProperties };
