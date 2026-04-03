import React, { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';
import { buildAbsoluteUrl } from '../utils/seo';

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

  const steps = [
    'Проверяете репозиторий через защищенный GitHub preview endpoint.',
    'Запускаете AI-анализ только по нужным типам файлов.',
    'Получаете документацию, историю запусков и SEO-готовую публичную витрину.'
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CodeDoc AI',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'Веб-приложение для анализа GitHub-репозиториев и генерации документации с SEO-оптимизированной публичной витриной.',
    url: buildAbsoluteUrl('/'),
    image: buildAbsoluteUrl('/og-cover.svg'),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };

  const styles: { [key: string]: CSSProperties } = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #102542 0%, #1f4e79 36%, #f7fbff 36%, #ffffff 100%)',
      color: 'white'
    },
    header: {
      padding: '20px 0',
      background: 'rgba(16, 37, 66, 0.72)',
      backdropFilter: 'blur(12px)',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 10
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
      background: 'linear-gradient(45deg, #ffffff, #ffd3a2)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      flexWrap: 'wrap'
    },
    navLink: {
      color: 'rgba(255,255,255,0.88)',
      textDecoration: 'none',
      fontWeight: 600
    },
    navButtons: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap'
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
      padding: '72px 20px 86px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '60px',
      alignItems: 'center',
      minHeight: '80vh',
      color: 'white'
    },
    heroContent: {
      color: 'white'
    },
    heroTitle: {
      fontSize: 'clamp(2.8rem, 5vw, 4.6rem)',
      fontWeight: 'bold',
      lineHeight: '1.08',
      marginBottom: '20px',
      color: 'white'
    },
    highlight: {
      background: 'linear-gradient(45deg, #ffd89b, #f29c50)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    },
    heroSubtitle: {
      fontSize: '1.2rem',
      opacity: 0.92,
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
      background: '#f29c50',
      color: '#102542',
      border: 'none',
      borderRadius: '25px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    },
    secondaryButton: {
      padding: '15px 30px',
      fontSize: '1.1rem',
      background: 'rgba(255, 255, 255, 0.08)',
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
    heroImage: {
      width: '100%',
      height: 'auto',
      maxWidth: '560px',
      filter: 'drop-shadow(0 22px 34px rgba(0,0,0,0.22))'
    },
    features: {
      background: 'white',
      padding: '40px 20px 90px',
      color: '#333'
    },
    featuresContainer: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    sectionLead: {
      maxWidth: '780px',
      margin: '0 auto 40px',
      textAlign: 'center',
      color: '#4f6479',
      lineHeight: 1.7
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
      textAlign: 'left',
      padding: '32px 24px',
      background: '#f8fbff',
      borderRadius: '20px',
      transition: 'all 0.3s ease',
      color: '#2c3e50',
      border: '1px solid rgba(16, 37, 66, 0.08)'
    },
    featureIcon: {
      fontSize: '2.8rem',
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
    workflow: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '12px 20px 108px',
      color: '#17324d',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '28px',
      alignItems: 'stretch'
    },
    workflowCard: {
      background: '#102542',
      color: '#ffffff',
      borderRadius: '30px',
      padding: '42px clamp(28px, 3vw, 44px)',
      boxShadow: '0 28px 56px rgba(16, 37, 66, 0.15)',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    },
    workflowEyebrow: {
      margin: '0 0 14px 0',
      color: 'rgba(242, 156, 80, 0.92)',
      fontSize: '12px',
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase'
    },
    workflowTitle: {
      fontSize: 'clamp(2rem, 3vw, 2.5rem)',
      margin: '0 0 18px 0',
      lineHeight: 1.12
    },
    workflowText: {
      margin: '0 0 26px 0',
      lineHeight: 1.72,
      fontSize: '1.05rem',
      color: 'rgba(255,255,255,0.86)'
    },
    workflowList: {
      margin: 0,
      paddingLeft: '22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      lineHeight: 1.65,
      fontSize: '1.04rem'
    },
    workflowVisual: {
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '18px',
      borderRadius: '34px',
      background: 'linear-gradient(180deg, rgba(233, 242, 255, 0.84), rgba(244, 248, 255, 0.98))',
      border: '1px solid rgba(31, 78, 121, 0.1)',
      boxShadow: '0 28px 54px rgba(16, 37, 66, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    workflowImage: {
      width: '100%',
      height: 'auto',
      maxWidth: '560px',
      display: 'block'
    },
    cta: {
      background: 'linear-gradient(135deg, #17324d 0%, #1f4e79 60%, #f29c50 100%)',
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
      background: '#ffffff',
      color: '#17324d',
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
    },
    footerLink: {
      color: '#ffd3a2',
      textDecoration: 'none'
    }
  };

  return (
    <div style={styles.container}>
      <SeoHead
        title="CodeDoc AI | AI-документация кода, SEO и GitHub preview"
        description="CodeDoc AI анализирует GitHub-репозитории, генерирует документацию, показывает предпросмотр через GitHub API и поддерживает SEO-оптимизированную публичную витрину."
        canonicalPath="/"
        keywords={['AI документация кода', 'анализ GitHub репозитория', 'SEO для React и FastAPI', 'CodeDoc AI']}
        structuredData={structuredData}
        imageAlt="Главная страница CodeDoc AI с предпросмотром анализа репозитория"
      />

      <header style={styles.header}>
        <div style={styles.nav}>
          <Link to="/" style={{ ...styles.logo, textDecoration: 'none' }}>
            <span style={styles.logoIcon}>🤖</span>
            <span style={styles.logoText}>CodeDoc AI</span>
          </Link>
          <div style={styles.navLinks}>
            <a href="#features" style={styles.navLink}>Возможности</a>
            <a href="#workflow" style={styles.navLink}>Как это работает</a>
            <Link to="/guide" style={styles.navLink}>SEO-гид</Link>
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

      <main>
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Документация для вашего кода
              <span style={styles.highlight}> за секунды</span>
            </h1>
            <p style={styles.heroSubtitle}>
              CodeDoc AI автоматически анализирует репозитории, проверяет ключевые метаданные через GitHub API
              и показывает SEO-готовую публичную витрину без изменения основной бизнес-логики MVP.
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
                  e.currentTarget.style.color = '#17324d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }}
              >
                📋 Узнать больше
              </button>
            </div>
          </div>
          <div style={styles.heroVisual}>
            <img
              src="/hero-workflow.svg"
              alt="Схема работы CodeDoc AI: предпросмотр репозитория, SEO-метаданные и AI-анализ"
              width={560}
              height={420}
              loading="eager"
              style={styles.heroImage}
            />
          </div>
        </section>

        <section id="features" style={styles.features}>
          <div style={styles.featuresContainer}>
            <h2 style={styles.featuresTitle}>Почему CodeDoc AI?</h2>
            <p style={styles.sectionLead}>
              Главная публичная страница теперь построена как семантический лендинг: она объясняет продукт,
              содержит структурированный контент и готова для индексации и предпросмотра в соцсетях.
            </p>
            <div style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <article
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
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" style={styles.workflow}>
          <article style={styles.workflowCard}>
            <p style={styles.workflowEyebrow}>Workflow Preview</p>
            <h2 style={styles.workflowTitle}>Как выглядит обновленный пользовательский сценарий</h2>
            <p style={styles.workflowText}>
              Мы не меняли бизнес-логику анализа. Вместо этого вокруг существующего MVP появилась SEO-обвязка
              и дополнительный безопасный слой получения внешних данных.
            </p>
            <ol style={styles.workflowList}>
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <div style={styles.workflowVisual}>
            <img
              src="/repo-preview.svg"
              alt="Карточка предпросмотра репозитория с внешними данными GitHub API"
              width={640}
              height={480}
              loading="lazy"
              style={styles.workflowImage}
            />
          </div>
        </section>

        <section style={styles.cta}>
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>Готовы начать?</h2>
            <p style={styles.ctaText}>
              Откройте анализ репозитория, а затем посмотрите публичный{' '}
              <Link to="/guide" style={styles.footerLink}>SEO-гид</Link>, чтобы увидеть все изменения в действии.
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
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🤖</span>
            <span style={styles.logoText}>CodeDoc AI</span>
          </div>
          <p style={styles.footerText}>
            Публичные страницы канонизированы, приватные маршруты закрыты от индексации, а ссылочный предпросмотр
            использует Open Graph и структурированные данные.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
