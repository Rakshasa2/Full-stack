import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterFormData, CSSProperties } from '../types';
import SeoHead from '../components/SeoHead';
import { getApiErrorMessage } from '../utils/apiErrors';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string>('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccessMessage('');
  };

  const handleFocus = (fieldName: string): void => {
    setFocusedField(fieldName);
  };

  const handleBlur = (): void => {
    setFocusedField('');
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.email.trim() ||
        !formData.password || !formData.confirmPassword) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Введите корректный email адрес');
      return;
    }

    if (formData.username.includes(' ')) {
      setError('Имя пользователя не должно содержать пробелы');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Регистрация успешна! Перенаправляем на страницу входа...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(getApiErrorMessage({ response: { data } }, 'Неизвестная ошибка сервера'));
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Проверьте, что backend и прокси доступны.');
      setError(`Ошибка соединения с сервером: ${message}.`);
    } finally {
      setLoading(false);
    }
  };

  const styles: { [key: string]: CSSProperties } = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-brand-soft)',
      padding: '20px'
    },
    card: {
      background: 'rgba(255,255,255,0.96)',
      padding: '40px',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-deep)',
      border: '1px solid rgba(255,255,255,0.28)',
      width: '100%',
      maxWidth: '440px',
      backdropFilter: 'blur(14px)'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    eyebrow: {
      marginBottom: '12px',
      color: 'var(--color-brand-600)',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontWeight: 800
    },
    title: {
      fontSize: '30px',
      fontWeight: 'bold',
      color: 'var(--color-brand-900)',
      marginBottom: '8px'
    },
    subtitle: {
      color: 'var(--color-text-muted)',
      fontSize: '14px',
      lineHeight: 1.6
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--color-brand-800)',
      letterSpacing: '0.02em'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '1px solid var(--color-border)',
      borderRadius: '14px',
      fontSize: '16px',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      boxSizing: 'border-box'
    },
    inputFocused: {
      borderColor: 'var(--color-brand-600)',
      boxShadow: '0 0 0 3px rgba(31, 78, 121, 0.12)'
    },
    inputError: {
      borderColor: 'var(--color-danger)'
    },
    errorMessage: {
      background: 'rgba(200, 92, 68, 0.08)',
      color: 'var(--color-danger)',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '14px',
      border: '1px solid rgba(200, 92, 68, 0.16)',
      margin: '0'
    },
    successMessage: {
      background: 'rgba(47, 143, 104, 0.12)',
      color: '#1c674a',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '14px',
      border: '1px solid rgba(47, 143, 104, 0.18)',
      margin: '0'
    },
    submitButton: {
      padding: '14px',
      background: 'var(--gradient-brand-soft)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: 600,
      transition: 'transform 0.3s, box-shadow 0.3s',
      marginTop: '10px'
    },
    submitButtonLoading: {
      opacity: 0.7,
      cursor: 'not-allowed',
      background: '#95a5a6'
    },
    footer: {
      textAlign: 'center',
      marginTop: '25px',
      paddingTop: '20px',
      borderTop: '1px solid var(--color-border)',
      color: 'var(--color-text-muted)',
      fontSize: '14px'
    },
    loginLink: {
      color: 'var(--color-brand-600)',
      textDecoration: 'none',
      fontWeight: 600,
      marginLeft: '5px'
    }
  };

  const hasFieldError = error.toLowerCase().includes('поле') ||
                       error.toLowerCase().includes('username') ||
                       error.toLowerCase().includes('email') ||
                       error.toLowerCase().includes('password');

  return (
    <div style={styles.container} className="auth-shell">
      <SeoHead
        title="Регистрация | CodeDoc AI"
        description="Страница регистрации в CodeDoc AI. Форма создания аккаунта закрыта от поисковой индексации."
        canonicalPath="/register"
        noindex
        imageAlt="Страница регистрации CodeDoc AI"
      />
      <div style={styles.card} className="auth-card-shell">
        <div style={styles.header}>
          <p style={styles.eyebrow}>Workspace Access</p>
          <h2 style={styles.title}>Регистрация в CodeDoc AI</h2>
          <p style={styles.subtitle}>Создайте аккаунт и перейдите в единое рабочее пространство для анализа кода.</p>
        </div>

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Имя пользователя</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onFocus={() => handleFocus('username')}
              onBlur={handleBlur}
              placeholder="Ваше имя (без пробелов)"
              style={{
                ...styles.input,
                ...(focusedField === 'username' ? styles.inputFocused : {}),
                ...(hasFieldError && error.toLowerCase().includes('username') ? styles.inputError : {})
              } as React.CSSProperties}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => handleFocus('email')}
              onBlur={handleBlur}
              placeholder="your@email.com"
              style={{
                ...styles.input,
                ...(focusedField === 'email' ? styles.inputFocused : {}),
                ...(hasFieldError && error.toLowerCase().includes('email') ? styles.inputError : {})
              } as React.CSSProperties}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => handleFocus('password')}
              onBlur={handleBlur}
              placeholder="Минимум 6 символов"
              style={{
                ...styles.input,
                ...(focusedField === 'password' ? styles.inputFocused : {}),
                ...(hasFieldError && error.toLowerCase().includes('password') ? styles.inputError : {})
              } as React.CSSProperties}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Подтвердите пароль</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={() => handleFocus('confirmPassword')}
              onBlur={handleBlur}
              placeholder="Повторите пароль"
              style={{
                ...styles.input,
                ...(focusedField === 'confirmPassword' ? styles.inputFocused : {})
              } as React.CSSProperties}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div style={styles.errorMessage}>
              {error.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < error.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}

          {successMessage && (
            <div style={styles.successMessage}>
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonLoading : {})
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Уже есть аккаунт? </span>
          <Link
            to="/login"
            style={styles.loginLink}
            onMouseOver={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
