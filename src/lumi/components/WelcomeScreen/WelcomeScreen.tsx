import './WelcomeScreen.css';
import { useI18n } from '../../i18n';
import LanguageToggle from '../LanguageToggle/LanguageToggle';
import mandalaSvg from '../../assets/mandala.svg';
import logoMark from '../../assets/group-29.svg';

interface WelcomeScreenProps {
  onStart: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function WelcomeScreen({ onStart, onGoHome }: WelcomeScreenProps) {
  const { t } = useI18n();

  return (
    <div className="welcome-screen">
      <div className="welcome-lang-switcher">
        <LanguageToggle tone="dark" />
      </div>

      {/* Logo */}
      <button
        type="button"
        className="welcome-logo-btn"
        onClick={onGoHome}
        aria-label={t('header.home')}
      >
        <img className="welcome-logo-img" src={logoMark} alt={t('welcome.title')} draggable={false} />
      </button>

      {/* Mandala */}
      <div className="welcome-mandala" aria-hidden="true">
        <img className="welcome-mandala-img" src={mandalaSvg} alt="" draggable={false} loading="eager" />
      </div>

      {/* Subtitle */}
      <div className="welcome-subtitle">
        <div className="welcome-subtitle-line">{t('welcome.subtitle.line1')}</div>
        <div className="welcome-subtitle-line">{t('welcome.subtitle.line2')}</div>
      </div>

      {/* Primary button */}
      <button onClick={onStart} className="welcome-button" type="button" aria-label={t('welcome.button')}>
        <span className="welcome-button-text">{t('welcome.button')}</span>
      </button>
    </div>
  );
}
