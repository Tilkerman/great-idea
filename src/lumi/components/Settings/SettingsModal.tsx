import { useEffect } from 'react';
import './SettingsModal.css';
import { useI18n } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuItemClick: (menuItem: string) => void;
}

const getIconColor = (id: string): string => {
  const colors: Record<string, string> = {
    about: '#4A90E2',      // Синий
    tutorial: '#9B59B6',   // Фиолетовый
    install: '#27AE60',    // Зеленый
    settings: '#E67E22',   // Оранжевый
    feedback: '#E74C3C',   // Красный
    statistics: '#3498DB',  // Голубой
    completed: '#F39C12',  // Желтый/золотой
  };
  return colors[id] || '#666';
};

export default function SettingsModal({ isOpen, onClose, onMenuItemClick }: SettingsModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Не возвращаем null, чтобы компонент всегда был в DOM (для отладки)
  if (!isOpen) {
    return null;
  }

  const menuItems = [
    { 
      id: 'about', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="8" r="1" fill="currentColor"/>
        </svg>
      ), 
      label: t('settings.menu.about') 
    },
    { 
      id: 'tutorial', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ), 
      label: t('settings.menu.tutorial') 
    },
    { 
      id: 'install', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ), 
      label: t('settings.menu.install') 
    },
    { 
      id: 'settings', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 1v6M12 17v6M23 12h-6M7 12H1M19.07 4.93l-4.24 4.24M9.17 9.17L4.93 4.93M19.07 19.07l-4.24-4.24M9.17 14.83L4.93 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ), 
      label: t('settings.menu.settings') 
    },
    { 
      id: 'feedback', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 9h8M8 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ), 
      label: t('settings.menu.feedback') 
    },
    { 
      id: 'statistics', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M7 16l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ), 
      label: t('settings.menu.statistics') 
    },
    { 
      id: 'completed', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ), 
      label: t('settings.menu.completed') 
    },
  ];

  const handleMenuItemClick = (itemId: string) => {
    onMenuItemClick(itemId);
    onClose();
  };

  return (
    <>
      <div className="settings-modal-overlay" onClick={onClose} />
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">{t('settings.menu.title')}</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="settings-modal-content">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="settings-menu-item"
              onClick={() => handleMenuItemClick(item.id)}
              type="button"
            >
              <span className="settings-menu-icon" style={{ color: getIconColor(item.id) }}>
                {item.icon}
              </span>
              <span className="settings-menu-label">{item.label}</span>
              <span className="settings-menu-arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

