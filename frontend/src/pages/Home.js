import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>🤖 CodeDoc AI</h1>
        <p style={styles.subtitle}>Автоматическая генерация документации для вашего кода</p>
        <div style={styles.buttonGroup}>
          <button
            onClick={() => navigate('/login')}
            style={styles.primaryButton}
          >
            Войти
          </button>
          <button
            onClick={() => navigate('/register')}
            style={styles.secondaryButton}
          >
            Регистрация
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hero: {
    textAlign: 'center',
    color: 'white',
    maxWidth: '600px',
    padding: '40px'
  },
  title: {
    fontSize: '3rem',
    marginBottom: '20px'
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '40px',
    opacity: 0.9
  },
  buttonGroup: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center'
  },
  primaryButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  secondaryButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default Home;