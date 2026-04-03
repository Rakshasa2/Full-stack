import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppstoreOutlined, DashboardOutlined, UserOutlined } from '@ant-design/icons';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';
import { User, Role, AdminStats } from '../types';
import SeoHead from '../components/SeoHead';
import { getRoleBadgeStyle } from '../utils/ui';
import { getApiErrorMessage } from '../utils/apiErrors';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFirstRender = useRef(true);

  const api = useApi();
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();

  const fetchData = useCallback(async (): Promise<void> => {
    if (!isAdmin()) return;

    try {
      setLoading(true);
      setErrorMessage('');
      const [usersRes, rolesRes, statsRes] = await Promise.all([
        api.get<User[]>('/api/admin/users'),
        api.get<Role[]>('/api/admin/roles'),
        api.get<AdminStats>('/api/admin/stats')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setStats(statsRes.data);
    } catch (error: unknown) {
      setUsers([]);
      setRoles([]);
      setStats(null);
      setErrorMessage(getApiErrorMessage(error, 'Не удалось загрузить данные админ-панели.'));
    } finally {
      setLoading(false);
    }
  }, [api, isAdmin]);

  // Загружаем данные только когда пользователь точно админ
  useEffect(() => {
    if (isFirstRender.current && isAdmin() && !permissionsLoading) {
      isFirstRender.current = false;
      fetchData();
    }
  }, [fetchData, isAdmin, permissionsLoading]);

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setActionLoading(true);
      setErrorMessage('');
      await api.post('/api/admin/users/assign-role', {
        user_id: selectedUser,
        role_name: selectedRole
      });
      await fetchData();
      setSelectedUser(null);
      setSelectedRole('');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось назначить роль.'));
    } finally {
      setActionLoading(false);
    }
  };

  const removeRole = async (userId: number, roleName: string) => {
    try {
      setActionLoading(true);
      setErrorMessage('');
      await api.delete(`/api/admin/users/${userId}/roles/${roleName}`);
      await fetchData();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось удалить роль.'));
    } finally {
      setActionLoading(false);
    }
  };

  // ПОКАЗЫВАЕМ ЗАГРУЗКУ, пока проверяются права
  if (permissionsLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--gradient-page)', padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Проверка прав доступа...</p>
      </div>
    );
  }

  // ЕСЛИ НЕ АДМИН - показываем сообщение
  if (!isAdmin()) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gradient-page)', padding: '40px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', width: '100%', background: 'rgba(255,255,255,0.96)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)', padding: '32px' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Доступ запрещен</h2>
          <p>У вас нет прав администратора для просмотра этой страницы.</p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 20px',
              marginTop: '20px',
              background: 'var(--gradient-brand-soft)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  // ЕСЛИ АДМИН, но данные еще грузятся
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--gradient-page)', padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      padding: '30px 24px 56px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'var(--gradient-page)'
    },
    header: {
      marginBottom: '30px',
      background: 'var(--gradient-brand-soft)',
      color: 'white',
      borderRadius: 'var(--radius-card)',
      padding: '28px 30px',
      boxShadow: 'var(--shadow-card)'
    },
    headerTitle: {
      margin: '0 0 10px 0',
      color: 'white'
    },
    headerText: {
      margin: 0,
      color: 'rgba(255,255,255,0.85)',
      maxWidth: '760px'
    },
    headerActions: {
      marginTop: '18px',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap' as const
    },
    ghostButton: {
      padding: '10px 18px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.1)',
      color: 'white',
      fontWeight: 700,
      cursor: 'pointer'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      background: 'rgba(255,255,255,0.96)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-soft)'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold' as const,
      margin: '10px 0 0 0'
    },
    roleDistribution: {
      background: 'rgba(255,255,255,0.96)',
      padding: '20px',
      borderRadius: 'var(--radius-card)',
      marginBottom: '30px',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-soft)'
    },
    errorBanner: {
      marginBottom: '24px',
      padding: '14px 18px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(200, 92, 68, 0.08)',
      border: '1px solid rgba(200, 92, 68, 0.16)',
      color: 'var(--color-danger)',
      fontWeight: 600
    },
    roleChips: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const
    },
    roleChip: {
      display: 'inline-flex',
      alignItems: 'center' as const,
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold' as const
    },
    assignForm: {
      background: 'rgba(255,255,255,0.96)',
      padding: '20px',
      borderRadius: 'var(--radius-card)',
      marginBottom: '30px',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-soft)'
    },
    formRow: {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-end' as const,
      flexWrap: 'wrap' as const
    },
    select: {
      flex: 1,
      minWidth: '220px',
      padding: '12px 14px',
      borderRadius: '14px',
      border: '1px solid var(--color-border)',
      color: 'var(--color-brand-900)'
    },
    button: {
      padding: '12px 20px',
      background: 'var(--gradient-brand-soft)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      cursor: 'pointer',
      fontWeight: 700
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    buttonLoading: {
      opacity: 0.7,
      cursor: 'wait'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      background: 'rgba(255,255,255,0.96)',
      borderRadius: 'var(--radius-card)',
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-soft)'
    },
    th: {
      padding: '12px',
      textAlign: 'left' as const,
      background: 'var(--color-surface-soft)',
      borderBottom: '2px solid var(--color-border)',
      color: 'var(--color-brand-900)'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid var(--color-border)',
      color: 'var(--color-brand-800)'
    },
    roleBadge: {
      display: 'inline-flex',
      alignItems: 'center' as const,
      gap: '6px',
      padding: '4px 8px',
      margin: '2px',
      borderRadius: 'var(--radius-pill)',
      fontSize: '12px'
    },
    deleteButton: {
      padding: '6px 10px',
      background: 'var(--color-danger)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    deleteButtonDisabled: {
      opacity: 0.5,
      cursor: 'wait'
    }
  };

  return (
    <div style={styles.container}>
      <SeoHead
        title="Админ-панель | CodeDoc AI"
        description="Административная панель CodeDoc AI. Закрытый служебный раздел, исключенный из индексации."
        canonicalPath="/admin"
        noindex
        imageAlt="Административная панель CodeDoc AI"
      />
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Административная панель</h1>
        <p style={styles.headerText}>
          Этот раздел оформлен в том же визуальном языке, что и dashboard: тёмный брендовый хедер,
          светлые аналитические карточки и единая система кнопок.
        </p>
        <div style={styles.headerActions} className="admin-header-actions">
          <button style={styles.ghostButton} onClick={() => navigate('/dashboard')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <DashboardOutlined />
              Вернуться в dashboard
            </span>
          </button>
          <button style={styles.ghostButton} onClick={() => navigate('/profile')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined />
              Открыть профиль
            </span>
          </button>
        </div>
      </div>

      {errorMessage && <div style={styles.errorBanner}>{errorMessage}</div>}

      {/* Статистика */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ color: 'var(--color-text-muted)' }}>Всего пользователей</div>
            <div style={{ ...styles.statValue, color: 'var(--color-brand-600)' }}>{stats.total_users}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: 'var(--color-text-muted)' }}>Всего анализов</div>
            <div style={{ ...styles.statValue, color: 'var(--color-success)' }}>{stats.total_analyses}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: 'var(--color-text-muted)' }}>Активных</div>
            <div style={{ ...styles.statValue, color: 'var(--color-accent-500)' }}>{stats.active_users}</div>
          </div>
        </div>
      )}

      {/* Распределение по ролям */}
      {stats && (
        <div style={styles.roleDistribution}>
          <h3 style={{ marginTop: 0 }}>Распределение по ролям</h3>
          <div style={styles.roleChips}>
            {Object.entries(stats.role_distribution).map(([role, count]) => (
              <div
                key={role}
                style={{
                  ...styles.roleChip,
                  ...getRoleBadgeStyle(role)
                }}
              >
                {role === 'admin' ? <AppstoreOutlined /> : <UserOutlined />}
                {role}: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Форма назначения роли */}
      <div style={styles.assignForm}>
        <h3 style={{ marginTop: 0 }}>Назначить роль</h3>
        <div style={styles.formRow} className="admin-form-row">
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(Number(e.target.value))}
            style={styles.select}
            disabled={actionLoading}
          >
            <option value="">Выберите пользователя</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email})
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={styles.select}
            disabled={actionLoading}
          >
            <option value="">Выберите роль</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            onClick={assignRole}
            disabled={!selectedUser || !selectedRole || actionLoading}
            style={{
              ...styles.button,
              ...((!selectedUser || !selectedRole) && styles.buttonDisabled),
              ...(actionLoading && styles.buttonLoading)
            }}
          >
            {actionLoading ? 'Назначение...' : 'Назначить'}
          </button>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="admin-table-scroll">
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Роли</th>
            <th style={styles.th}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td style={styles.td}>{user.id}</td>
              <td style={styles.td}>{user.username}</td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>
                {user.roles?.map(role => (
                  <span
                    key={role.id}
                    style={{
                      ...styles.roleBadge,
                      ...getRoleBadgeStyle(role.name)
                    }}
                  >
                    {role.name === 'admin' ? <AppstoreOutlined /> : <UserOutlined />}
                    {role.name}
                  </span>
                ))}
              </td>
              <td style={styles.td}>
                {user.roles?.map(role => (
                  role.name !== 'admin' && (
                    <button
                      key={role.id}
                      onClick={() => removeRole(user.id, role.name)}
                      disabled={actionLoading}
                      style={{
                        ...styles.deleteButton,
                        ...(actionLoading && styles.deleteButtonDisabled)
                      }}
                    >
                      Удалить {role.name}
                    </button>
                  )
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default AdminPanel;
