import './Header.css';
import { useI18n } from '../../i18n';
import type { ReactNode } from 'react';
import logoMark from '../../assets/group-29.svg';

interface HeaderProps {
  onSettingsClick?: () => void;
  onLogoClick?: () => void;
  leftSlot?: ReactNode;
}

export default function Header({ onLogoClick, leftSlot }: HeaderProps) {
  const { t } = useI18n();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          {leftSlot}
          {/* Логотип */}
          {onLogoClick ? (
            <button
              className="header-logo-btn"
              onClick={onLogoClick}
              aria-label={t('header.home')}
              type="button"
            >
              <img className="header-logo-img" src={logoMark} alt={t('header.appName')} draggable={false} />
            </button>
          ) : (
            <img className="header-logo-img" src={logoMark} alt={t('header.appName')} draggable={false} />
          )}
        </div>

        <div className="header-center" />

        <div className="header-right" aria-hidden="true" />
      </div>
    </header>
  );
}

