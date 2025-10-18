import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CSSProperties } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();

  interface Feature {
    icon: string;
    title: string;
    description: string;
  }

  const features: Feature[] = [
    {
      icon: '📚',
      title: 'Автоматическая документация',
      description: 'AI анализирует ваш код и генерирует понятную документацию'
    },
    {
      icon: '⚡',
      title: 'Мгновенное обновление',
      description: 'Документация обновляется автоматически при изменениях в коде'
    },
    {
      icon: '🔍',
      title: 'Глубокий анализ',
      description: 'Поддержка множества языков программирования и фреймворков'
    },
    {
      icon: '👥',
      title: 'Для команд',
      description: 'Совместная работа над документацией с коллегами'
    }
  ];

  const handleLearnMore = (): void => {
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const styles: { [key: string]: CSSProperties } = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    header: {
      padding: '20px 0',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      color: 'white'
    },
    nav: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'white'
    },
    logoIcon: {
      fontSize: '32px'
    },
    logoText: {
      background: 'linear-gradient(45deg, #fff, #e0e0e0)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    },
    navButtons: {
      display: 'flex',
      gap: '15px'
    },
    navButton: {
      padding: '10px 20px',
      background: 'transparent',
      color: 'white',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '25px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease'
    },
    primaryNavButton: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: '2px solid rgba(255, 255, 255, 0.5)'
    },
    hero: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '80px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '60px',
      alignItems: 'center',
      minHeight: '80vh',
      color: 'white'
    },
    heroContent: {
      color: 'white'
    },
    heroTitle: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      lineHeight: '1.2',
      marginBottom: '20px',
      color: 'white'
    },
    highlight: {
      background: 'linear-gradient(45deg, #ffd89b, #ff6e6e)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    },
    heroSubtitle: {
      fontSize: '1.2rem',
      opacity: 0.9,
      lineHeight: '1.6',
      marginBottom: '40px',
      color: 'white'
    },
    heroButtons: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    },
    primaryButton: {
      padding: '15px 30px',
      fontSize: '1.1rem',
      background: 'white',
      color: '#667eea',
      border: 'none',
      borderRadius: '25px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    },
    secondaryButton: {
      padding: '15px 30px',
      fontSize: '1.1rem',
      background: 'transparent',
      color: 'white',
      border: '2px solid white',
      borderRadius: '25px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    },
    heroVisual: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    codeWindow: {
      background: '#1e1e1e',
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      width: '100%',
      maxWidth: '500px'
    },
    codeHeader: {
      background: '#2d2d2d',
      padding: '15px',
      display: 'flex',
      alignItems: 'center'
    },
    codeDots: {
      display: 'flex',
      gap: '8px'
    },
    dot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%'
    },
    codeContent: {
      padding: '20px'
    },
    code: {
      margin: 0,
      color: '#d4d4d4',
      fontSize: '14px',
      lineHeight: '1.5',
      fontFamily: 'Monaco, Consolas, monospace'
    },
    features: {
      background: 'white',
      padding: '100px 20px',
      color: 'white'
    },
    featuresContainer: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    featuresTitle: {
      textAlign: 'center',
      fontSize: '2.5rem',
      marginBottom: '60px',
      color: '#2c3e50'
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '40px'
    },
    featureCard: {
      textAlign: 'center',
      padding: '40px 20px',
      background: '#f8f9fa',
      borderRadius: '15px',
      transition: 'all 0.3s ease',
      color: '#2c3e50'
    },
    featureIcon: {
      fontSize: '3rem',
      marginBottom: '20px'
    },
    featureTitle: {
      fontSize: '1.5rem',
      marginBottom: '15px',
      color: '#2c3e50'
    },
    featureDescription: {
      color: '#7f8c8d',
      lineHeight: '1.6'
    },
    cta: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '100px 20px',
      textAlign: 'center',
      color: 'white'
    },
    ctaContent: {
      maxWidth: '600px',
      margin: '0 auto',
      color: 'white'
    },
    ctaTitle: {
      fontSize: '2.5rem',
      marginBottom: '20px',
      color: 'white'
    },
    ctaText: {
      fontSize: '1.2rem',
      marginBottom: '40px',
      opacity: 0.9,
      color: 'white'
    },
    ctaButton: {
      padding: '18px 40px',
      fontSize: '1.2rem',
      background: 'white',
      color: '#667eea',
      border: 'none',
      borderRadius: '30px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    },
    footer: {
      background: '#2c3e50',
      color: 'white',
      padding: '40px 20px',
      textAlign: 'center'
    },
    footerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      color: 'white'
    },
    footerText: {
      opacity: 0.8,
      marginTop: '20px',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      {/* Хедер */}
      <header style={styles.header}>
        <div style={styles.nav}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🤖</span>
            <span style={styles.logoText}>CodeDoc AI</span>
          </div>
          <div style={styles.navButtons}>
            <button
              onClick={() => navigate('/login')}
              style={styles.navButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Войти
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{...styles.navButton, ...styles.primaryNavButton}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Начать бесплатно
            </button>
          </div>
        </div>
      </header>

      {/* Герой-секция */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Документация для вашего кода
            <span style={styles.highlight}> за секунды</span>
          </h1>
          <p style={styles.heroSubtitle}>
            CodeDoc AI автоматически анализирует ваши репозитории, генерирует понятную документацию
            и поддерживает её в актуальном состоянии. Экономьте время и сосредоточьтесь на коде.
          </p>
          <div style={styles.heroButtons}>
            <button
              onClick={() => navigate('/register')}
              style={styles.primaryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🚀 Попробовать бесплатно
            </button>
            <button
              onClick={handleLearnMore}
              style={styles.secondaryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'white';
              }}
            >
              📋 Узнать больше
            </button>
          </div>
        </div>
        <div style={styles.heroVisual}>
          <div style={styles.codeWindow}>
            <div style={styles.codeHeader}>
              <div style={styles.codeDots}>
                <span style={{...styles.dot, background: '#ff5f56'}}></span>
                <span style={{...styles.dot, background: '#ffbd2e'}}></span>
                <span style={{...styles.dot, background: '#27ca3f'}}></span>
              </div>
            </div>
            <div style={styles.codeContent}>
              <pre style={styles.code}>
{`// Автоматически сгенерировано CodeDoc AI
function calculateTotal(products) {
  return products.reduce((sum, product) =>
    sum + product.price * product.quantity, 0
  );
}

/**
 * Рассчитывает общую стоимость товаров
 * @param {Array} products - Массив товаров
 * @returns {number} Общая стоимость
 */`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Секция фич */}
      <section id="features" style={styles.features}>
        <div style={styles.featuresContainer}>
          <h2 style={styles.featuresTitle}>Почему CodeDoc AI?</h2>
          <div style={styles.featuresGrid}>
            {features.map((feature: Feature, index: number) => (
              <div
                key={index}
                style={styles.featureCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA секция */}
      <section style={styles.cta}>
        <div style={styles.ctaContent}>
          <h2 style={styles.ctaTitle}>Готовы начать?</h2>
          <p style={styles.ctaText}>
            Присоединяйтесь к тысячам разработчиков, которые уже используют CodeDoc AI
          </p>
          <button
            onClick={() => navigate('/register')}
            style={styles.ctaButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Создать аккаунт бесплатно
          </button>
        </div>
      </section>

      {/* Футер */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🤖</span>
            <span style={styles.logoText}>CodeDoc AI</span>
          </div>
          <p style={styles.footerText}>
            Сделано с ❤️ для разработчиков
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;