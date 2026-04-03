import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const AUTH_UNAUTHORIZED_EVENT = 'codedoc:auth-unauthorized';

const configuredBaseUrl = process.env.REACT_APP_API_URL?.trim();

const apiClient = axios.create({
  baseURL: configuredBaseUrl || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

const get = async <T,>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.get<T>(url, config);
};

const post = async <T,>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.post<T>(url, data, config);
};

const put = async <T,>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.put<T>(url, data, config);
};

const del = async <T,>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.delete<T>(url, config);
};

const api = {
  get,
  post,
  put,
  delete: del,
};

export const useApi = () => api;

export { apiClient };
