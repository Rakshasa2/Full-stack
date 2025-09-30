import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        setMessage('Ошибка загрузки пользователей');
      }
    } catch (error) {
      setMessage('Ошибка соединения');
    }
  };

  const deleteAllUsers = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить ВСЕХ пользователей?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/auth/users', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage('Все пользователи удалены');
        setUsers([]);
      } else {
        const errorData = await response.json();
        setMessage('Ошибка: ' + errorData.detail);
      }
    } catch (error) {
      setMessage('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const createSuperuser = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/auth/users/superuser', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        fetchUsers(); // Обновляем список
      } else {
        const errorData = await response.json();
        setMessage('Ошибка: ' + errorData.detail);
      }
    } catch (error) {
      setMessage('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userEmail) => {
    if (!window.confirm(`Удалить пользователя ${userEmail}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/auth/users/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage(`Пользователь ${userEmail} удален`);
        fetchUsers(); // Обновляем список
      } else {
        const errorData = await response.json();
        setMessage('Ошибка: ' + errorData.detail);
      }
    } catch (error) {
      setMessage('Ошибка соединения');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🤖 Панель администратора</h1>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Назад к Dashboard
        </button>
      </div>

      {message && (
        <div style={styles.message}>
          {message}
          <button onClick={() => setMessage('')} style={styles.closeMessage}>×</button>
        </div>
      )}

      <div style={styles.actions}>
        <button
          onClick={createSuperuser}
          disabled={loading}
          style={styles.actionButton}
        >
          👑 Создать суперпользователя
        </button>

        <button
          onClick={deleteAllUsers}
          disabled={loading || users.length === 0}
          style={{...styles.actionButton, ...styles.dangerButton}}
        >
          🗑️ Удалить всех пользователей
        </button>
      </div>

      <div style={styles.usersSection}>
        <h2>Список пользователей ({users.length})</h2>

        {users.length === 0 ? (
          <p style={styles.noUsers}>Пользователей нет</p>
        ) : (
          <div style={styles.usersList}>
            {users.map(user => (
              <div key={user.email} style={styles.userCard}>
                <div style={styles.userInfo}>
                  <strong>{user.username}</strong>
                  <span>{user.email}</span>
                  <small>ID: {user.id}</small>
                </div>
                <button
                  onClick={() => deleteUser(user.email)}
                  style={styles.deleteUserButton}
                  title="Удалить пользователя"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.superuserInfo}>
        <h3>Суперпользователь по умолчанию:</h3>
        <p><strong>Email:</strong> admin@codedoc.ai</p>
        <p><strong>Пароль:</strong> admin123</p>
        <p><strong>Логин:</strong> admin</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '20px'
  },
  backButton: {
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  message: {
    background: '#d4edda',
    color: '#155724',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeMessage: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#155724'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '12px 20px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  dangerButton: {
    background: '#dc3545'
  },
  usersSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  noUsers: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic'
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '5px',
    border: '1px solid #e9ecef'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  deleteUserButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    padding: '5px 10px',
    fontSize: '12px'
  },
  superuserInfo: {
    background: '#fff3cd',
    padding: '15px',
    borderRadius: '5px',
    border: '1px solid #ffeaa7'
  }
};

export default Admin;