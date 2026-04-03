import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { AUTH_UNAUTHORIZED_EVENT, useApi } from '../hooks/useApi';
import { LoginResponse, User } from '../types';
import { getApiErrorMessage } from '../utils/apiErrors';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const initialFetchRef = useRef(false);
  const isMountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        if (isMountedRef.current) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const response = await api.get<User>('/api/auth/me');

      if (isMountedRef.current) {
        setUser(response.data);
        setLoading(false);
      }
    } catch {
      localStorage.removeItem('token');
      if (isMountedRef.current) {
        setUser(null);
        setLoading(false);
      }
    }
  }, [api]);

  // Эффект для монтирования/размонтирования
  useEffect(() => {
    isMountedRef.current = true;

    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      refreshUser();
    }

    const handleUnauthorized = () => {
      if (isMountedRef.current) {
        setUser(null);
        setLoading(false);
      }
    };

    // Centralized auth reset keeps public routes accessible
    // while ProtectedRoute handles redirects for private screens.
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      isMountedRef.current = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      if (isMountedRef.current) {
        setUser(response.data.user);
        setLoading(false);
      }
    } catch (error: unknown) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      throw new Error(getApiErrorMessage(error, 'Ошибка входа'));
    }
  }, [api]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    if (isMountedRef.current) {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    refreshUser,
  }), [loading, login, logout, refreshUser, user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
