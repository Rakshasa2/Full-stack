import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  DocumentationResponse,
  RepositoryRequest,
  AnalysisHistory,
  AnalysisHistoryResponse,
  GitHubAnalysisResponse
} from '../types';
import { useApi } from '../hooks/useApi';

// Стили
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f5f6fa',
    fontFamily: 'Arial, sans-serif'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#6c757d'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    color: 'white'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: 'white',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  userName: {
    fontWeight: '600',
    fontSize: '16px'
  },
  logoutButton: {
    padding: '8px 16px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  content: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '20px',
    background: 'white',
    borderRadius: '8px',
    padding: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tab: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6c757d',
    borderRadius: '6px',
    flex: 1,
    textAlign: 'center' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  },
  tabActive: {
    background: '#667eea',
    color: 'white'
  },
  tabContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '400px'
  },
  form: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '4px'
  },
  checkboxLabelChecked: {
    background: '#e3f2fd',
    border: '1px solid #007bff'
  },
  checkbox: {
    margin: 0
  },
  analyzeButton: {
    padding: '12px 24px',
    background: '#764ba2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
    width: '100%',
    marginTop: '20px'
  },
  analyzeButtonDisabled: {
    background: '#6c757d',
    cursor: 'not-allowed'
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  projectCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  projectName: {
    margin: '0 0 10px 0',
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: '600'
  },
  projectUrl: {
    color: '#6c757d',
    fontSize: '14px',
    margin: '0 0 15px 0',
    wordBreak: 'break-all' as const
  },
  projectMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '15px'
  },
  projectStats: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  projectActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  projectButton: {
    flex: 1,
    padding: '10px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  deleteButton: {
    padding: '10px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    minWidth: '40px'
  },
  deleteButtonDisabled: {
    background: '#95a5a6',
    cursor: 'not-allowed'
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  resultCard: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  resultHeader: {
    background: '#f8f9fa',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e9ecef'
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '600'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  fileStatus: {
    padding: '4px 8px',
    background: '#28a745',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  documentation: {
    margin: 0,
    padding: '20px',
    background: 'white',
    color: '#2c3e50',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    maxHeight: '400px',
    overflowY: 'auto',
    fontFamily: 'monospace'
  },
  errorMessage: {
    color: '#e74c3c',
    background: '#fdf2f2',
    padding: '10px',
    borderRadius: '4px',
    margin: '10px 15px',
    border: '1px solid #fadbd8'
  },
  noResults: {
    textAlign: 'center',
    color: '#6c757d',
    padding: '40px 20px'
  },
  functionsSection: {
    padding: '15px',
    background: '#f8f9fa',
    borderTop: '1px solid #e9ecef'
  },
  functionsTitle: {
    margin: '0 0 10px 0',
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '600'
  },
  functionsList: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  functionItem: {
    color: '#495057',
    fontSize: '13px',
    lineHeight: '1.4'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  confirmationDialog: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  confirmationContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  confirmationText: {
    marginBottom: '20px',
    fontSize: '16px',
    color: '#2c3e50',
    lineHeight: '1.5'
  },
  confirmationButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  confirmButton: {
    padding: '10px 20px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  notificationContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px'
  },
  notification: {
    padding: '15px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '400px'
  },
  notificationSuccess: {
    background: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724'
  },
  notificationError: {
    background: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24'
  },
  notificationWarning: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    color: '#856404'
  },
  notificationInfo: {
    background: '#d1ecf1',
    border: '1px solid #bee5eb',
    color: '#0c5460'
  },
  notificationMessage: {
    flex: 1,
    marginRight: '15px',
    fontSize: '14px',
    fontWeight: '500'
  },
  closeNotificationButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    opacity: 0.7,
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  validationError: {
    color: '#e74c3c',
    fontSize: '12px',
    marginTop: '5px',
    display: 'block'
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '20px'
  }
};

// CSS анимация
const spinnerStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

interface FileTypeCheckboxProps {
  type: string;
  checked: boolean;
  onChange: (type: string) => void;
}

const FileTypeCheckbox: React.FC<FileTypeCheckboxProps> = ({
  type,
  checked,
  onChange
}) => (
  <label
    style={{
      ...styles.checkboxLabel,
      ...(checked && styles.checkboxLabelChecked)
    }}
    onClick={() => onChange(type)}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={() => {}}
      style={styles.checkbox}
    />
    {type}
  </label>
);

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analyze');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [fileTypes, setFileTypes] = useState<string[]>(['.py', '.js', '.ts', '.java', '.cpp', '.go']);
  const [analysisResult, setAnalysisResult] = useState<DocumentationResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<AnalysisHistory[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<AnalysisHistory | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const api = useApi();

  // Функция для добавления уведомлений
  const addNotification = (message: string, type: Notification['type'] = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      id,
      message,
      type,
      duration
    };

    setNotifications(prev => [...prev, newNotification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  // Функция для удаления уведомления
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUserData();
    fetchProjects();
  }, [navigate]);

  const fetchUserData = async (): Promise<void> => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch (error: any) {
      addNotification('Ошибка загрузки данных пользователя', 'error');
      navigate('/login');
    }
  };

  const fetchProjects = async (): Promise<void> => {
    try {
      setProjectsLoading(true);
      const response = await api.get<AnalysisHistoryResponse>('/analyses/history');
      setProjects(response.data.analyses);
    } catch (error: any) {
      addNotification('Ошибка загрузки истории анализов', 'error');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!repoUrl.trim()) {
      setValidationError('Пожалуйста, введите URL репозитория');
      return;
    }

    // Проверка URL
    try {
      new URL(repoUrl);
    } catch {
      setValidationError('Пожалуйста, введите корректный URL');
      return;
    }

    setValidationError('');
    setLoading(true);
    setAnalysisResult(null);

    try {
      const requestData: RepositoryRequest = {
        repo_url: repoUrl,
        branch: branch,
        file_types: fileTypes
      };

      const response = await api.post<GitHubAnalysisResponse>('/analyze/github', requestData);
      const result = response.data;

      const processedResults = processBackendResponse(result);
      setAnalysisResult(processedResults);

      // Даем React время обновить состояние
      setTimeout(() => {
        setActiveTab('results');
      }, 100);

      addNotification(`Анализ завершен! Обработано ${processedResults.length} файлов`, 'success');
      await fetchProjects();

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      addNotification(`Ошибка анализа: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const processBackendResponse = (result: GitHubAnalysisResponse): DocumentationResponse[] => {
    if (!result) {
      return [];
    }

    if (result.status === 'error') {
      return [];
    }

    if (!result.file_analyses || !Array.isArray(result.file_analyses)) {
      return [];
    }

    return result.file_analyses.map((file, index) => {
      const processedFile: DocumentationResponse = {
        id: `${Date.now()}-${index}`,
        file_path: file.file_path || `file_${index}`,
        language: file.language || 'unknown',
        documentation: file.documentation || 'Документация не сгенерирована',
        ai_documentation: file.ai_documentation,
        functions: file.functions || [],
        confidence: file.confidence || 0,
        status: file.status || 'unknown',
        generation_time: file.generation_time,
        source: file.source,
        structure: file.structure
      };

      return processedFile;
    });
  };

  const extractRepoName = (url: string): string => {
    try {
      return url.split('/').pop()?.replace('.git', '') || 'unknown-repo';
    } catch {
      return 'unknown-repo';
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    addNotification('Вы успешно вышли из системы', 'info');
    navigate('/login');
  };

  const toggleFileType = (type: string): void => {
    setFileTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  };

  const renderDocumentationContent = (file: DocumentationResponse): string => {
    if (!file) return 'Нет данных о файле';

    let content = '';

    if (file.error) {
      content += `❌ Ошибка: ${file.error}\n\n`;
    }

    // Показываем AI документацию если есть
    if (file.ai_documentation) {
      content += `🤖 AI Анализ:\n${file.ai_documentation}\n\n`;
    }

    // Показываем основную документацию
    content += file.documentation || 'Документация не сгенерирована';

    // Добавляем информацию о структуре
    if (file.structure) {
      content += `\n\n📊 Структура файла:\n`;
      content += `• Строк: ${file.structure.total_lines}\n`;
      content += `• Функций: ${file.structure.function_count}\n`;
      content += `• Классов: ${file.structure.class_count}\n`;
    }

    return content;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success': return '#28a745';
      case 'processing': return '#ffc107';
      case 'failed':
      case 'error': return '#e74c3c';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success': return 'Успешно';
      case 'processing': return 'В процессе';
      case 'failed':
      case 'error': return 'Ошибка';
      default: return status || 'Неизвестно';
    }
  };

  // Функция для подтверждения удаления
  const confirmDelete = (project: AnalysisHistory): void => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  // Функция для отмены удаления
  const cancelDelete = (): void => {
    setProjectToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Функция для удаления проекта
  const deleteProject = async (): Promise<void> => {
    if (!projectToDelete) return;

    try {
      setDeletingId(projectToDelete.id);

      await api.delete(`/analyses/history/${projectToDelete.id}`);

      // Обновляем список проектов
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));

      // Показываем уведомление
      addNotification(`Проект "${projectToDelete.repo_name}" успешно удален`, 'success');

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      addNotification(`Ошибка удаления: ${errorMessage}`, 'error');
    } finally {
      setDeletingId(null);
      setProjectToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (!user) {
    return (
      <div style={styles.loading}>
        <style>{spinnerStyle}</style>
        <div style={styles.loadingSpinner}></div>
        Загрузка данных пользователя...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{spinnerStyle}</style>

      {/* Уведомления */}
      <div style={styles.notificationContainer}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              ...styles.notification,
              ...styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]
            }}
          >
            <div style={styles.notificationMessage}>
              {notification.message}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              style={styles.closeNotificationButton}
              aria-label="Закрыть уведомление"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Диалог подтверждения удаления */}
      {showDeleteConfirm && projectToDelete && (
        <div style={styles.confirmationDialog}>
          <div style={styles.confirmationContent}>
            <p style={styles.confirmationText}>
              Вы уверены, что хотите удалить проект <strong>"{projectToDelete.repo_name}"</strong>?
              <br />
              <br />
              Эта операция необратима. Все данные анализа будут удалены.
            </p>
            <div style={styles.confirmationButtons}>
              <button
                onClick={cancelDelete}
                style={styles.cancelButton}
                disabled={deletingId === projectToDelete.id}
              >
                Отмена
              </button>
              <button
                onClick={deleteProject}
                style={{
                  ...styles.confirmButton,
                  ...(deletingId === projectToDelete.id && styles.deleteButtonDisabled)
                }}
                disabled={deletingId === projectToDelete.id}
              >
                {deletingId === projectToDelete.id ? (
                  <>
                    <div style={styles.loadingSpinner}></div>
                    Удаление...
                  </>
                ) : (
                  'Удалить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.title}>CodeDoc AI</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>Привет, {user.username}!</span>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Выйти
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {/* Вкладки с иконками и счетчиками */}
        <div style={styles.tabs}>
          {[
            {
              id: 'analyze',
              label: 'Анализ репозитория',
              icon: '🔍'
            },
            {
              id: 'projects',
              label: 'Мои проекты',
              icon: '📁',
              count: projects.length
            },
            {
              id: 'results',
              label: 'Результаты',
              icon: '📊',
              count: analysisResult?.length || 0
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id && styles.tabActive)
              }}
            >
              <span>{tab.icon} {tab.label}</span>
              {(tab.count !== undefined && tab.count > 0) && (
                <span style={styles.tabBadge}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Содержимое вкладок */}
        <div style={styles.tabContent}>
          {activeTab === 'analyze' && (
            <>
              <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
                Анализ GitHub репозитория
              </h2>
              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>URL репозитория *</label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRepoUrl(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="https://github.com/username/repository.git"
                    style={{
                      ...styles.input,
                      ...(validationError && { borderColor: '#e74c3c' })
                    }}
                  />
                  {validationError && (
                    <span style={styles.validationError}>{validationError}</span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Ветка</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBranch(e.target.value)}
                    placeholder="main"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Типы файлов для анализа</label>
                  <div style={styles.checkboxGroup}>
                    {['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.php'].map((type) => (
                      <FileTypeCheckbox
                        key={type}
                        type={type}
                        checked={fileTypes.includes(type)}
                        onChange={toggleFileType}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !repoUrl}
                  style={{
                    ...styles.analyzeButton,
                    ...((loading || !repoUrl) && styles.analyzeButtonDisabled)
                  }}
                >
                  {loading ? (
                    <>
                      <div style={styles.loadingSpinner}></div>
                      Анализируем репозиторий...
                    </>
                  ) : (
                    'Начать анализ'
                  )}
                </button>
              </div>
            </>
          )}

          {activeTab === 'projects' && (
            <>
              <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>История анализов</h2>
              {projectsLoading ? (
                <div style={styles.loading}>
                  <div style={styles.loadingSpinner}></div>
                  Загрузка проектов...
                </div>
              ) : projects.length === 0 ? (
                <div style={styles.noResults}>
                  <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>Пока нет проанализированных проектов</h3>
                  <p style={{ color: '#8a8a8a' }}>Начните с анализа первого репозитория!</p>
                  <button
                    onClick={() => setActiveTab('analyze')}
                    style={{
                      marginTop: '20px',
                      padding: '10px 20px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Начать анализ
                  </button>
                </div>
              ) : (
                <div style={styles.projectsGrid}>
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      style={styles.projectCard}
                    >
                      <h3 style={styles.projectName}>{project.repo_name}</h3>
                      <p style={styles.projectUrl}>{project.repo_url}</p>

                      <div style={styles.projectMeta}>
                        <div style={styles.projectStats}>
                          <span>📄 {project.analyzed_files}/{project.total_files} файлов</span>
                          <span>⏱️ {project.processing_time.toFixed(1)}с</span>
                        </div>
                        <span style={{
                          padding: '4px 8px',
                          background: getStatusColor(project.status),
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {getStatusText(project.status)}
                        </span>
                      </div>

                      <div style={styles.projectMeta}>
                        <span>📅 {formatDate(project.created_at)}</span>
                        <span>🌿 {project.branch}</span>
                      </div>

                      <div style={styles.projectActions}>
                        <button
                          onClick={() => {
                            setRepoUrl(project.repo_url);
                            setBranch(project.branch);
                            setActiveTab('analyze');
                          }}
                          style={styles.projectButton}
                        >
                          Повторить анализ
                        </button>
                        <button
                          onClick={() => confirmDelete(project)}
                          style={{
                            ...styles.deleteButton,
                            ...(deletingId === project.id && styles.deleteButtonDisabled)
                          }}
                          disabled={deletingId === project.id}
                          title="Удалить проект"
                        >
                          {deletingId === project.id ? (
                            <div style={styles.loadingSpinner}></div>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'results' && (
            <>
              <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
                Результаты анализа: {extractRepoName(repoUrl)}
                {analysisResult && (
                  <span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '10px', fontWeight: 'normal' }}>
                    ({analysisResult.length} файлов)
                  </span>
                )}
              </h2>

              {!analysisResult || analysisResult.length === 0 ? (
                <div style={styles.noResults}>
                  <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>Нет результатов для отображения</h3>
                  <p style={{ color: '#8a8a8a' }}>
                    {loading ? 'Идет анализ...' : 'Попробуйте проанализировать репозиторий'}
                  </p>
                  <button
                    onClick={() => setActiveTab('analyze')}
                    style={{
                      marginTop: '20px',
                      padding: '10px 20px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Начать анализ
                  </button>
                </div>
              ) : (
                <>
                  {/* Статистика анализа */}
                  <div style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #e9ecef'
                  }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📊 Статистика анализа</h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px'
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                          📄 Файлов проанализировано
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {analysisResult.length}
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                          📈 Средняя уверенность
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {((analysisResult.reduce((sum, file) => sum + file.confidence, 0) / analysisResult.length) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                          🏗️ Всего функций
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {analysisResult.reduce((sum, file) => sum + (file.functions?.length || 0), 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.resultsList}>
                    {analysisResult
                      .filter(file => file && file.file_path)
                      .map((file, index) => (
                        <div
                          key={file.id || index}
                          style={styles.resultCard}
                        >
                          <div style={styles.resultHeader}>
                            <span style={styles.filePath}>
                              📄 {file.file_path}
                              <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '10px' }}>
                                ({file.language})
                              </span>
                            </span>
                            <div style={styles.fileInfo}>
                              <span style={{
                                fontSize: '12px',
                                color: file.confidence > 0.7 ? '#28a745' : file.confidence > 0.4 ? '#ffc107' : '#e74c3c',
                                fontWeight: 'bold'
                              }}>
                                Уверенность: {(file.confidence * 100).toFixed(1)}%
                              </span>
                              <span style={{
                                ...styles.fileStatus,
                                background: getStatusColor(file.status)
                              }}>
                                {getStatusText(file.status)}
                              </span>
                            </div>
                          </div>

                          {file.error && (
                            <div style={styles.errorMessage}>
                              ❌ Ошибка: {safeRender(file.error)}
                            </div>
                          )}

                          <pre style={styles.documentation}>
                            {renderDocumentationContent(file)}
                          </pre>

                          {file.functions && file.functions.length > 0 && (
                            <div style={styles.functionsSection}>
                              <h4 style={styles.functionsTitle}>
                                🏗️ Функции и методы ({file.functions.length}):
                              </h4>
                              <ul style={styles.functionsList}>
                                {file.functions.map((func, funcIndex) => (
                                  <li key={funcIndex} style={styles.functionItem}>
                                    <code style={{ color: '#007bff', fontWeight: 'bold' }}>{func.name}</code>
                                    {func.params && func.params.length > 0 && (
                                      <span style={{ color: '#6c757d', fontSize: '12px' }}>
                                        ({func.params.join(', ')})
                                      </span>
                                    )}
                                    {func.type && (
                                      <span style={{ color: '#28a745', marginLeft: '8px', fontSize: '12px' }}>
                                        - {func.type}
                                      </span>
                                    )}
                                    {func.line && (
                                      <span style={{ color: '#6c757d', marginLeft: '8px', fontSize: '12px' }}>
                                        (строка {func.line})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;