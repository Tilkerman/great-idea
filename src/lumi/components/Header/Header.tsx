import '../../../components/settings/Settings.css';
import './Header.css';
import { useI18n } from '../../i18n';
import { LumiBrand } from './LumiBrand';

interface HeaderProps {
  onSettingsClick?: () => void;
  onLogoClick?: () => void;
  onBack?: () => void;
  title?: string;
}

export default function Header({ onLogoClick, onBack, title }: HeaderProps) {
  const { t } = useI18n();

  if (onBack) {
    return (
      <header className="settings-topbar">
        <button type="button" onClick={onBack}>{t('common.back')}</button>
        <span>{title ?? ''}</span>
        <span />
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          {onLogoClick ? (
            <button
              className="header-logo-btn"
              onClick={onLogoClick}
              aria-label={t('header.home')}
              type="button"
            >
              <LumiBrand title={t('header.appName')} />
            </button>
          ) : (
            <LumiBrand title={t('header.appName')} />
          )}
        </div>
        <div className="header-center" />
        <div className="header-right" aria-hidden="true" />
      </div>
    </header>
  );
}
