import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, AppstoreOutlined, UserOutlined } from '@ant-design/icons';
import { usePermissions } from '../hooks/usePermissions';
import { useApi } from '../hooks/useApi';
import { Role, UserAnalyticsStats } from '../types';
import SeoHead from '../components/SeoHead';
import { getRoleBadgeStyle, getRoleLabel } from '../utils/ui';

const Profile: React.FC = () => {
  const { user, loading } = usePermissions();
  const [stats, setStats] = useState<UserAnalyticsStats | null>(null);
  const navigate = useNavigate();
  const api = useApi();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (!user) {
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await api.get<UserAnalyticsStats>('/api/analytics/user-stats');
        setStats(response.data);
      } catch {
        setStats(null);
      }
    };

    fetchStats();
  }, [api, user, loading, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Навигация произойдет в useEffect
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'var(--gradient-page)'
    },
    header: {
      background: 'var(--gradient-brand-soft)',
      padding: '22px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white',
      boxShadow: 'var(--shadow-soft)'
    },
    content: {
      padding: '30px',
      maxWidth: '920px',
      margin: '0 auto'
    },
    card: {
      background: 'rgba(255,255,255,0.96)',
      borderRadius: 'var(--radius-card)',
      padding: '34px',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--color-border)'
    },
    title: {
      margin: '0 0 30px 0',
      color: 'var(--color-brand-900)'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    infoItem: {
      padding: '18px',
      background: 'var(--color-surface-tint)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)'
    },
    label: {
      fontSize: '12px',
      color: 'var(--color-text-muted)',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontWeight: 700
    },
    value: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'var(--color-brand-900)'
    },
    roleList: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const
    },
    roleBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: 'var(--radius-pill)',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    permissionList: {
      marginTop: '20px',
      padding: '20px',
      background: 'var(--color-surface-soft)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)'
    },
    permissionItem: {
      padding: '8px',
      borderBottom: '1px solid var(--color-border)',
      color: 'var(--color-brand-800)'
    },
    languageList: {
      marginTop: '20px',
      padding: '20px',
      background: 'var(--color-surface-soft)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap' as const
    },
    languageBadge: {
      display: 'inline-flex',
      alignItems: 'center' as const,
      gap: '8px',
      padding: '8px 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-surface-tint)',
      border: '1px solid rgba(31, 78, 121, 0.14)',
      color: 'var(--color-brand-800)',
      fontWeight: 700
    }
  };

  return (
    <div style={styles.container}>
      <SeoHead
        title="Профиль | CodeDoc AI"
        description="Личный профиль пользователя CodeDoc AI. Приватная страница исключена из индексации."
        canonicalPath="/profile"
        noindex
        imageAlt="Профиль пользователя CodeDoc AI"
      />
      <header style={styles.header} className="page-topbar workspace-header">
        <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          CodeDoc AI
        </h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeftOutlined />
            Назад
          </span>
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.title}>Профиль пользователя</h1>

          <div style={styles.infoGrid} className="profile-grid">
            <div style={styles.infoItem}>
              <div style={styles.label}>Имя пользователя</div>
              <div style={styles.value}>{user.username}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.label}>Email</div>
              <div style={styles.value}>{user.email}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.label}>Дата регистрации</div>
              <div style={styles.value}>
                {new Date(user.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.label}>ID пользователя</div>
              <div style={styles.value}>#{user.id}</div>
            </div>
          </div>

          <h2 style={{ margin: '30px 0 15px 0' }}>Роли</h2>
          <div style={styles.roleList}>
            {user.roles?.length > 0 ? (
              user.roles.map((role: Role) => (
                <span
                  key={role.id}
                  style={{
                    ...styles.roleBadge,
                    ...getRoleBadgeStyle(role.name)
                  }}
                >
                  {role.name === 'admin' ? <AppstoreOutlined /> : <UserOutlined />}
                  {getRoleLabel(role.name)} ({role.name})
                </span>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Нет ролей</p>
            )}
          </div>

          <h2 style={{ margin: '30px 0 15px 0' }}>Разрешения</h2>
          <div style={styles.permissionList}>
            {user.permissions?.length > 0 ? (
              user.permissions.map((perm: string, index: number) => (
                <div key={index} style={styles.permissionItem}>
                  {perm}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Нет разрешений</p>
            )}
          </div>

          {stats && (
            <>
              <h2 style={{ margin: '30px 0 15px 0' }}>Статистика</h2>
              <div style={styles.infoGrid} className="profile-grid">
                <div style={styles.infoItem}>
                  <div style={styles.label}>Всего анализов</div>
                  <div style={styles.value}>{stats.total_analyses}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.label}>Файлов проанализировано</div>
                  <div style={styles.value}>{stats.total_files_analyzed}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.label}>Время обработки</div>
                  <div style={styles.value}>{stats.total_processing_time} сек</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.label}>Последний анализ</div>
                  <div style={styles.value}>
                    {stats.last_analysis
                      ? new Date(stats.last_analysis).toLocaleDateString('ru-RU')
                      : 'нет'}
                  </div>
                </div>
              </div>
              {Object.keys(stats.preferred_languages).length > 0 && (
                <>
                  <h2 style={{ margin: '30px 0 15px 0' }}>Предпочитаемые языки</h2>
                  <div style={styles.languageList}>
                    {Object.entries(stats.preferred_languages).map(([language, count]) => (
                      <span key={language} style={styles.languageBadge}>
                        {language} ({count})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
