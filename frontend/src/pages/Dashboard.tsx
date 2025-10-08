import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('analyze');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [fileTypes, setFileTypes] = useState(['.py', '.js', '.ts', '.java']);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  // Mock данные для демонстрации
  const mockProjects = [
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
    setProjects(mockProjects); // В реальном приложении загрузка с API
  }, [navigate]);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!repoUrl) {
      alert('Введите URL репозитория');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch: branch,
          file_types: fileTypes
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        setActiveTab('results');

        // Добавляем новый проект в список
        const newProject = {
          id: projects.length + 1,
          name: repoUrl.split('/').pop().replace('.git', ''),
          url: repoUrl,
          lastAnalyzed: new Date().toISOString().split('T')[0],
          filesCount: result.length,
          status: 'completed'
        };
        setProjects([newProject, ...projects]);
      } else {
        alert('Ошибка анализа репозитория');
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const FileTypeCheckbox = ({ type, checked, onChange }) => (
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

  if (!user) return <div style={styles.loading}>Загрузка...</div>;

  return (
    <div style={styles.container}>
      {/* Хедер */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🤖</span>
            <span style={styles.logoText}>CodeDoc AI</span>
          </div>

          <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>Привет, {user.username}!</span>
              <span style={styles.userEmail}>{user.email}</span>
            </div>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <div style={styles.main}>
        <div style={styles.sidebar}>
          <nav style={styles.nav}>
            <button
              onClick={() => setActiveTab('analyze')}
              style={{
                ...styles.navButton,
                ...(activeTab === 'analyze' && styles.navButtonActive)
              }}
            >
              📊 Анализ репозитория
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              style={{
                ...styles.navButton,
                ...(activeTab === 'projects' && styles.navButtonActive)
              }}
            >
              📁 Мои проекты
            </button>
            <button
              onClick={() => setActiveTab('results')}
              style={{
                ...styles.navButton,
                ...(activeTab === 'results' && styles.navButtonActive)
              }}
            >
              📋 Результаты
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                ...styles.navButton,
                ...(activeTab === 'settings' && styles.navButtonActive)
              }}
            >
            </button>
          </nav>
        </div>

        <div style={styles.content}>
          {/* Вкладка анализа */}
          {activeTab === 'analyze' && (
            <div style={styles.tabContent}>
              <h2 style={styles.tabTitle}>Анализ нового репозитория</h2>

              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>URL репозитория *</label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository.git"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Ветка</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Типы файлов для анализа</label>
                  <div style={styles.checkboxGroup}>
                    {['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs'].map(type => (
                      <FileTypeCheckbox
                        key={type}
                        type={type}
                        checked={fileTypes.includes(type)}
                        onChange={(type) => {
                          if (fileTypes.includes(type)) {
                            setFileTypes(fileTypes.filter(t => t !== type));
                          } else {
                            setFileTypes([...fileTypes, type]);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !repoUrl}
                  style={styles.analyzeButton}
                >
                  {loading ? '⏳ Анализируем...' : '🚀 Начать анализ'}
                </button>
              </div>
            </div>
          )}

          {/* Вкладка проектов */}
          {activeTab === 'projects' && (
            <div style={styles.tabContent}>
              <h2 style={styles.tabTitle}>Мои проекты</h2>

              <div style={styles.projectsGrid}>
                {projects.map(project => (
                  <div key={project.id} style={styles.projectCard}>
                    <div style={styles.projectHeader}>
                      <h3 style={styles.projectName}>{project.name}</h3>
                      <span style={styles.projectStatus}>{project.status === 'completed' ? '✅' : '⏳'}</span>
                    </div>
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

          {/* Вкладка результатов */}
          {activeTab === 'results' && analysisResult && (
            <div style={styles.tabContent}>
              <h2 style={styles.tabTitle}>
                Результаты анализа: {repoUrl.split('/').pop().replace('.git', '')}
              </h2>

              <div style={styles.resultsInfo}>
                <span>Проанализировано файлов: {analysisResult.length}</span>
                <span>Время анализа: {new Date().toLocaleTimeString()}</span>
              </div>

              <div style={styles.resultsList}>
                {analysisResult.map((file, index) => (
                  <div key={index} style={styles.resultCard}>
                    <div style={styles.resultHeader}>
                      <span style={styles.filePath}>{file.file_path}</span>
                      <span style={styles.fileStatus}>{file.status}</span>
                    </div>
                    <pre style={styles.documentation}>
                      {file.documentation}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вкладка настроек */}
          {activeTab === 'settings' && (
            <div style={styles.tabContent}>
              <h2 style={styles.tabTitle}>Настройки</h2>
              <p>Здесь будут настройки профиля и приложения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8f9fa'
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
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  logoIcon: {
    fontSize: '24px'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userInfo: {
    textAlign: 'right'
  },
  userName: {
    display: 'block',
    fontWeight: '600',
    color: '#2c3e50'
  },
  userEmail: {
    display: 'block',
    fontSize: '14px',
    color: '#7f8c8d'
  },
  logoutButton: {
    padding: '8px 16px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  main: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 80px)'
  },
  sidebar: {
    width: '250px',
    background: 'white',
    borderRight: '1px solid #e9ecef'
  },
  nav: {
    padding: '20px 0'
  },
  navButton: {
    width: '100%',
    padding: '15px 20px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    borderLeft: '3px solid transparent'
  },
  navButtonActive: {
    background: '#e3f2fd',
    borderLeft: '3px solid #2196f3',
    color: '#1976d2',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: '30px'
  },
  tabContent: {
    background: 'white',
    borderRadius: '10px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  tabTitle: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '24px'
  },
  form: {
    maxWidth: '600px'
  },
  formGroup: {
    marginBottom: '25px'
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
    border: '2px solid #e9ecef',
    borderRadius: '5px',
    fontSize: '16px',
    transition: 'border-color 0.3s ease'
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    marginTop: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  checkbox: {
    margin: 0
  },
  analyzeButton: {
    padding: '15px 30px',
    background: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  projectCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  projectName: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '18px'
  },
  projectStatus: {
    fontSize: '20px'
  },
  projectUrl: {
    color: '#7f8c8d',
    fontSize: '14px',
    margin: '0 0 15px 0',
    wordBreak: 'break-all'
  },
  projectMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#95a5a6',
    marginBottom: '15px'
  },
  projectButton: {
    width: '100%',
    padding: '8px',
    background: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  resultsInfo: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px',
    background: '#e3f2fd',
    borderRadius: '5px',
    fontSize: '14px'
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
    background: '#f8f9fa',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'monospace'
  }
};

// Hover эффекты
Object.assign(styles.analyzeButton, {
  ':hover': {
    background: '#1976d2',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.navButton, {
  ':hover': {
    background: '#f8f9fa'
  }
});

Object.assign(styles.projectButton, {
  ':hover': {
    background: '#1976d2'
  }
});

export default Dashboard;