import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SeoHead from '../components/SeoHead';
import { getApiErrorMessage } from '../utils/apiErrors';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Эффект для редиректа когда пользователь загружен
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Ошибка входа'));
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-brand-soft)',
      padding: '24px'
    },
    formContainer: {
      background: 'rgba(255,255,255,0.96)',
      padding: '40px',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-deep)',
      border: '1px solid rgba(255,255,255,0.28)',
      width: '100%',
      maxWidth: '430px',
      backdropFilter: 'blur(14px)'
    },
    eyebrow: {
      textAlign: 'center' as const,
      marginBottom: '12px',
      color: 'var(--color-brand-600)',
      fontSize: '12px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
      fontWeight: 800
    },
    title: {
      textAlign: 'center' as const,
      marginBottom: '8px',
      color: 'var(--color-brand-900)',
      fontSize: '32px',
      fontWeight: '700'
    },
    subtitle: {
      textAlign: 'center' as const,
      marginBottom: '28px',
      color: 'var(--color-text-muted)',
      lineHeight: 1.6
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '18px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '5px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '700',
      color: 'var(--color-brand-800)',
      letterSpacing: '0.02em'
    },
    input: {
      padding: '14px 16px',
      border: '1px solid var(--color-border)',
      borderRadius: '14px',
      fontSize: '16px',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      background: 'var(--color-surface)',
      color: 'var(--color-brand-900)'
    },
    button: {
      padding: '14px 16px',
      background: 'var(--gradient-brand-soft)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'transform 0.3s, box-shadow 0.3s'
    },
    buttonDisabled: {
      background: '#93a5b8',
      cursor: 'not-allowed'
    },
    error: {
      color: 'var(--color-danger)',
      fontSize: '14px',
      textAlign: 'center' as const,
      marginTop: '4px',
      background: 'rgba(200, 92, 68, 0.08)',
      border: '1px solid rgba(200, 92, 68, 0.16)',
      padding: '12px',
      borderRadius: '12px'
    },
    links: {
      marginTop: '22px',
      textAlign: 'center' as const,
      fontSize: '14px'
    },
    link: {
      color: 'var(--color-brand-600)',
      textDecoration: 'none',
      fontWeight: '700'
    }
  };

  return (
    <div style={styles.container} className="auth-shell">
      <SeoHead
        title="Вход | CodeDoc AI"
        description="Страница входа в личный кабинет CodeDoc AI. Экран авторизации исключен из поисковой индексации."
        canonicalPath="/login"
        noindex
        imageAlt="Страница входа в CodeDoc AI"
      />
      <div style={styles.formContainer} className="auth-card-shell">
        <p style={styles.eyebrow}>Private Access</p>
        <h1 style={styles.title}>Вход в систему</h1>
        <p style={styles.subtitle}>
          Войдите в рабочее пространство CodeDoc AI и продолжайте анализировать репозитории в едином интерфейсе.
        </p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              placeholder="your@email.com"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading && styles.buttonDisabled)
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </form>
        <div style={styles.links}>
          Нет аккаунта?{' '}
          <Link to="/register" style={styles.link}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
