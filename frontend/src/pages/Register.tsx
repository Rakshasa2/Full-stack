import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterFormData, CSSProperties } from '../types';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string>('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFocus = (fieldName: string): void => {
    setFocusedField(fieldName);
  };

  const handleBlur = (): void => {
    setFocusedField('');
  };

  const extractErrorMessage = (errorData: any): string => {
    if (typeof errorData === 'string') return errorData;
    if (errorData.detail) return errorData.detail;
    if (errorData.msg) return errorData.msg;
    if (Array.isArray(errorData)) return errorData.map(e => e.msg || JSON.stringify(e)).join(', ');
    return 'Произошла ошибка при регистрации';
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        navigate('/login');
      } else {
        setError(extractErrorMessage(data));
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    },
    card: {
      background: 'white',
      padding: '40px',
      borderRadius: '10px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      width: '100%',
      maxWidth: '400px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#7f8c8d',
      fontSize: '14px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #ecf0f1',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s'
    },
    inputFocused: {
      borderColor: '#3498db'
    },
    errorMessage: {
      background: '#fee',
      color: '#c33',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '14px',
      border: '1px solid #fcc'
    },
    submitButton: {
      padding: '12px',
      background: '#27ae60',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.3s'
    },
    submitButtonLoading: {
      opacity: 0.7,
      cursor: 'not-allowed'
    },
    footer: {
      textAlign: 'center',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #ecf0f1',
      color: '#7f8c8d',
      fontSize: '14px'
    },
    loginLink: {
      color: '#3498db',
      textDecoration: 'none',
      fontWeight: '600',
      marginLeft: '5px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Регистрация в CodeDoc AI</h2>
          <p style={styles.subtitle}>Создайте новый аккаунт</p>
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
              placeholder="Ваше имя"
              style={{
                ...styles.input,
                ...(focusedField === 'username' && styles.inputFocused)
              }}
              required
              disabled={loading}
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
                ...(focusedField === 'email' && styles.inputFocused)
              }}
              required
              disabled={loading}
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
                ...(focusedField === 'password' && styles.inputFocused)
              }}
              required
              disabled={loading}
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
                ...(focusedField === 'confirmPassword' && styles.inputFocused)
              }}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading && styles.submitButtonLoading)
            }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Уже есть аккаунт? </span>
          <Link to="/login" style={styles.loginLink}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;