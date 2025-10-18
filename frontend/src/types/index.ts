export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Repository analysis types
export interface RepositoryRequest {
  repo_url: string;
  branch?: string;
  file_types?: string[];
}

export interface DocumentationResponse {
  file_path: string;
  documentation: string;
  status: string;
}

export interface AnalysisResult {
  total_files: number;
  processed_files: number;
  results: DocumentationResponse[];
}

export interface Project {
  id: number;
  name: string;
  url: string;
  lastAnalyzed: string;
  filesCount: number;
  status: 'completed' | 'processing' | 'error';
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CSSProperties {
  [key: string]: string | number;
}