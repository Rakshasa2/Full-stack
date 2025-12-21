import { CSSProperties } from 'react';

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
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

export interface DocumentationResponse {
  id: string;
  file_path: string;
  language: string;
  documentation: string;
  ai_documentation?: string;
  functions: Array<{
    name: string;
    line?: number;
    type?: string;
    params?: string[];
  }>;
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

export interface RepositoryRequest {
  repo_url: string;
  branch: string;
  file_types: string[];
  max_files?: number;
}

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
  summary: Record<string, any>;
  file_analyses: any[];
  documentation: string;
  created_at: string;
  started_at: string;
  completed_at?: string;
}

export interface AnalysisHistoryResponse {
  analyses: AnalysisHistory[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface UserStats {
  user_id: number;
  username: string;
  total_analyses: number;
  total_files_analyzed: number;
  total_processing_time: number;
  last_analysis?: string;
}

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
  summary: {
    total_functions: number;
    successful_analyses: number;
    failed_analyses: number;
    timestamp: string;
  };
  history_id?: number;
  created_at?: string;
}

export type { CSSProperties };