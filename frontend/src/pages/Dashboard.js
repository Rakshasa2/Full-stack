import React, { useState } from 'react';

const Dashboard = ({ token, user, onLogout }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!repoUrl) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch: 'main'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
      } else {
        alert('Ошибка анализа репозитория');
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav style={{
        background: 'white',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>🤖 CodeDoc AI</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>Привет, {user?.username}!</span>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Выйти
          </button>
        </div>
      </nav>

      <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2>Анализ репозитория</h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Введите URL репозитория GitHub"
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !repoUrl}
              style={{
                padding: '12px 24px',
                background: loading ? '#ccc' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Анализ...' : 'Анализировать'}
            </button>
          </div>
        </div>

        {analysisResult && (
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3>Результаты анализа:</h3>
            <pre style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '5px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;