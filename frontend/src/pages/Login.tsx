import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface LoginFormData {
  email: string;
  password: string;
}

interface CSSProperties {
  [key: string]: string | number;
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
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

  const togglePasswordVisibility = (): void => {
    setShowPassword(!showPassword);
  };

  const extractErrorMessage = (errorData: any): string => {
    if (typeof errorData === 'string') return errorData;
    if (errorData?.detail) return errorData.detail;
    if (errorData?.msg) return errorData.msg;
    if (Array.isArray(errorData)) return errorData.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    return 'Неверный email или пароль';
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Введите корректный email адрес');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Отправка запроса на:', 'http://localhost:8000/api/auth/login');

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Статус ответа:', response.status);

      const responseData = await response.json();
      console.log('Данные ответа:', responseData);

      if (!response.ok) {
        throw new Error(extractErrorMessage(responseData));
      }

      if (responseData.access_token) {
        localStorage.setItem('token', responseData.access_token);
        localStorage.setItem('user', JSON.stringify({
          email: formData.email,
          username: responseData.username || formData.email.split('@')[0]
        }));

        console.log('Токен сохранен, переход на dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        setError('Токен не получен от сервера');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Ошибка соединения с сервером');
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
      padding: '20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    card: {
      background: 'white',
      padding: '40px',
      borderRadius: '12px',
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
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    inputFocused: {
      borderColor: '#3498db',
      outline: 'none'
    },
    passwordContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    showPasswordButton: {
      position: 'absolute',
      right: '12px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      padding: '4px',
      color: '#7f8c8d'
    },
    errorMessage: {
      background: '#fee',
      color: '#c33',
      padding: '12px',
      borderRadius: '6px',
      fontSize: '14px',
      border: '1px solid #fcc'
    },
    submitButton: {
      padding: '14px',
      background: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.3s',
      marginTop: '10px'
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
    registerLink: {
      color: '#3498db',
      textDecoration: 'none',
      fontWeight: '600',
      marginLeft: '5px'
    },
    submitButtonHover: {
      background: '#2980b9',
      transform: 'translateY(-1px)'
    }
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Вход в CodeDoc AI</h2>
          <p style={styles.subtitle}>Введите ваши учетные данные</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
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
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => handleFocus('password')}
                onBlur={handleBlur}
                placeholder="Введите пароль"
                style={{
                  ...styles.input,
                  ...(focusedField === 'password' && styles.inputFocused)
                }}
                required
                disabled={loading}
              />
            </div>
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
              ...(loading && styles.submitButtonLoading),
              ...(isHovered && !loading && styles.submitButtonHover)
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Нет аккаунта? </span>
          <Link to="/register" style={styles.registerLink}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;