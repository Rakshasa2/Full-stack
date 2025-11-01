import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Project, DocumentationResponse, RepositoryRequest, CSSProperties } from '../types';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analyze');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [fileTypes, setFileTypes] = useState<string[]>(['.py', '.js', '.ts', '.java']);
  const [analysisResult, setAnalysisResult] = useState<DocumentationResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  // Стили вынесены в начало компонента
  const styles: { [key: string]: CSSProperties } = {
    container: {
      minHeight: '100vh',
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    },
    header: {
      background: 'white',
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    title: {
      margin: 0,
      color: '#2c3e50'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    userName: {
      fontWeight: '600',
      color: '#2c3e50'
    },
    logoutButton: {
      padding: '8px 16px',
      background: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    content: {
      padding: '40px 20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: '1px solid #e9ecef'
    },
    tab: {
      padding: '12px 24px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      color: '#6c757d',
      borderBottom: '2px solid transparent'
    },
    tabActive: {
      color: '#007bff',
      borderBottom: '2px solid #007bff'
    },
    tabContent: {
      background: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    form: {
      maxWidth: '600px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#2c3e50'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px'
    },
    checkboxGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginTop: '10px'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer'
    },
    checkbox: {
      margin: 0
    },
    analyzeButton: {
      padding: '12px 24px',
      background: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: '600'
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
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    },
    projectName: {
      margin: '0 0 10px 0',
      color: '#2c3e50'
    },
    projectUrl: {
      color: '#6c757d',
      fontSize: '14px',
      margin: '0 0 15px 0'
    },
    projectMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#6c757d',
      marginBottom: '15px'
    },
    projectButton: {
      width: '100%',
      padding: '8px',
      background: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    resultsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      color: 'black',
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
      alignItems: 'center'
    },
    filePath: {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#2c3e50'
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
      color: 'black',
      fontSize: '14px',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
      maxHeight: '200px',
      overflowY: 'auto',
      fontFamily: 'monospace'
    }
  };

  const mockProjects: Project[] = [
    {
      id: 1,
      name: 'ecommerce-api',
      url: 'https://github.com/user/ecommerce-api',
      lastAnalyzed: '2024-01-15',
      filesCount: 24,
      status: 'completed'
    },
    {
      id: 2,
      name: 'auth-service',
      url: 'https://github.com/user/auth-service',
      lastAnalyzed: '2024-01-10',
      filesCount: 18,
      status: 'completed'
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUserData(token);
    setProjects(mockProjects);
  }, [navigate]);

  const fetchUserData = async (token: string): Promise<void> => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/login');
    }
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!repoUrl) {
      alert('Введите URL репозитория');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const requestData: RepositoryRequest = {
        repo_url: repoUrl,
        branch: branch,
        file_types: fileTypes
      };

      const response = await fetch('http://localhost:8000/api/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result.results || result);
        setActiveTab('results');

        const newProject: Project = {
          id: projects.length + 1,
          name: extractRepoName(repoUrl),
          url: repoUrl,
          lastAnalyzed: new Date().toLocaleDateString(),
          filesCount: (result.results || result).length,
          status: 'completed'
        };
        setProjects([newProject, ...projects]);
      } else {
        alert('Ошибка анализа репозитория');
      }
    } catch (error) {
      alert('Ошибка соединения: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
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
    navigate('/login');
  };

  const toggleFileType = (type: string): void => {
    setFileTypes((prev: string[]) =>
      prev.includes(type)
        ? prev.filter((t: string) => t !== type)
        : [...prev, type]
    );
  };

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
    <label style={styles.checkboxLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(type)}
        style={styles.checkbox}
      />
      {type}
    </label>
  );

  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  };

  if (!user) {
    return (
      <div style={styles.loading}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🤖 CodeDoc AI Dashboard</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>Привет, {user.username}!</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('analyze')}
            style={{
              ...styles.tab,
              ...(activeTab === 'analyze' && styles.tabActive)
            }}
          >
            Анализ репозитория
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              ...styles.tab,
              ...(activeTab === 'projects' && styles.tabActive)
            }}
          >
            Мои проекты
          </button>
          <button
            onClick={() => setActiveTab('results')}
            disabled={!analysisResult}
            style={{
              ...styles.tab,
              ...(activeTab === 'results' && styles.tabActive),
              ...(!analysisResult && { opacity: 0.5, cursor: 'not-allowed' })
            }}
          >
            Результаты
          </button>
        </div>

        {activeTab === 'analyze' && (
          <div style={styles.tabContent}>
            <h2>Анализ нового репозитория</h2>
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>URL репозитория *</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository.git"
                  style={styles.input}
                />
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
                  {['.py', '.js', '.ts', '.java', '.cpp', '.c', '.tsx', '.go'].map((type: string) => (
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
                {loading ? '⏳ Анализируем...' : '🚀 Начать анализ'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div style={styles.tabContent}>
            <h2>Мои проекты</h2>
            <div style={styles.projectsGrid}>
              {projects.map((project: Project) => (
                <div key={project.id} style={styles.projectCard}>
                  <h3 style={styles.projectName}>{project.name}</h3>
                  <p style={styles.projectUrl}>{project.url}</p>
                  <div style={styles.projectMeta}>
                    <span>Файлов: {project.filesCount}</span>
                    <span>Анализ: {project.lastAnalyzed}</span>
                  </div>
                  <button
                    onClick={() => {
                      setRepoUrl(project.url);
                      setActiveTab('analyze');
                    }}
                    style={styles.projectButton}
                  >
                    🔄 Повторить анализ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'results' && analysisResult && (
          <div style={styles.tabContent}>
            <h2>Результаты анализа: {extractRepoName(repoUrl)}</h2>
            <div style={styles.resultsList}>
              {analysisResult.map((file: DocumentationResponse, index: number) => (
                <div key={index} style={styles.resultCard}>
                  <div style={styles.resultHeader}>
                    <span style={styles.filePath}>{safeRender(file.file_path)}</span>
                    <span style={styles.fileStatus}>{safeRender(file.status)}</span>
                  </div>
                  <pre style={styles.documentation}>
                    {safeRender(file.documentation)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;