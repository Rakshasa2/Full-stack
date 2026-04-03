import React from 'react';
import { useNavigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--gradient-brand)',
      color: 'white',
      padding: '24px'
    },
    card: {
      maxWidth: '620px',
      width: '100%',
      textAlign: 'center' as const,
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 'var(--radius-card)',
      padding: '40px',
      boxShadow: 'var(--shadow-deep)',
      backdropFilter: 'blur(14px)'
    },
    code: {
      margin: '0 0 16px 0',
      fontSize: '0.95rem',
      letterSpacing: '0.24em',
      textTransform: 'uppercase' as const,
      opacity: 0.76
    },
    title: {
      fontSize: 'clamp(2.4rem, 6vw, 4.4rem)',
      margin: '0 0 18px 0',
      color: '#fff'
    },
    subtitle: {
      fontSize: '24px',
      margin: '0 0 14px 0',
      opacity: 0.9
    },
    text: {
      margin: '0 0 28px 0',
      lineHeight: 1.7,
      opacity: 0.88
    },
    button: {
      padding: '14px 24px',
      fontSize: '16px',
      background: '#ffffff',
      color: 'var(--color-brand-900)',
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      fontWeight: 800,
      transition: 'all 0.3s ease'
    }
  };

  return (
    <div style={styles.container}>
      <SeoHead
        title="403 | Доступ запрещен"
        description="Недостаточно прав для доступа к запрошенной странице CodeDoc AI."
        canonicalPath="/unauthorized"
        noindex
        imageAlt="403 страница CodeDoc AI"
      />
      <section style={styles.card}>
        <p style={styles.code}>HTTP 403</p>
        <h1 style={styles.title}>Доступ запрещён</h1>
        <h2 style={styles.subtitle}>Недостаточно прав для доступа</h2>
        <p style={styles.text}>
          Эта страница оформлена в том же визуальном стиле, что и весь сайт: тёмный брендовый фон,
          стеклянная карточка и ясное действие для возврата в рабочий поток.
        </p>
        <button
          style={styles.button}
          onClick={() => navigate(-1)}
        >
          Вернуться назад
        </button>
      </section>
    </div>
  );
};

export default Unauthorized;
