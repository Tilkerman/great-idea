import { useEffect, useState } from 'react';
import './Header.css';
import { useI18n } from '../../i18n';

interface HeaderActionsProps {
  onSettingsClick?: () => void;
}

export default function HeaderActions({ onSettingsClick }: HeaderActionsProps) {
  const { locale, setLocale, t } = useI18n();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSettingsClick = () => {
    console.log('[HeaderActions] Settings button clicked, onSettingsClick:', !!onSettingsClick);
    if (onSettingsClick) {
      console.log('[HeaderActions] Calling onSettingsClick');
      return onSettingsClick();
    }
    console.log('[HeaderActions] No onSettingsClick handler, showing alert');
    alert(t('settings.comingSoon'));
  };

  return (
    <div className="header-actions">
      {/* Язык */}
      <div className="header-lang" aria-label={t('header.langLabel')}>
        <button
          type="button"
          className={`header-lang-btn ${locale === 'ru' ? 'active' : ''}`}
          onClick={() => setLocale('ru')}
        >
          {t('header.lang.ru')}
        </button>
        <button
          type="button"
          className={`header-lang-btn ${locale === 'en' ? 'active' : ''}`}
          onClick={() => setLocale('en')}
        >
          {t('header.lang.en')}
        </button>
      </div>

      {/* Тема */}
      <button
        className={`theme-toggle-switch ${theme === 'dark' ? 'theme-toggle-dark' : 'theme-toggle-light'}`}
        onClick={toggleTheme}
        aria-label={theme === 'light' ? t('header.themeToDark') : t('header.themeToLight')}
        type="button"
      >
        <span className="theme-toggle-slider">
          <span className="theme-toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
        </span>
      </button>

      {/* Настройки */}
      <button className="header-settings" onClick={handleSettingsClick} aria-label={t('header.settings')}>
        ⚙️
      </button>
    </div>
  );
}


