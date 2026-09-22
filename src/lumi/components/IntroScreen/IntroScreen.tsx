import './IntroScreen.css';
import { useI18n } from '../../i18n';
import LanguageToggle from '../LanguageToggle/LanguageToggle';
import mandalaSvg from '../../assets/mandala.svg';

interface IntroScreenProps {
  onGo: () => void;
  onSettingsClick?: () => void;
}

export default function IntroScreen({ onGo }: IntroScreenProps) {
  const { t } = useI18n();

  return (
    <div className="intro-screen">
      <div className="intro-lang-switcher">
        <LanguageToggle tone="dark" />
      </div>

      <main className="intro-content">
        <div className="intro-upper">
          <h1 className="intro-title">{t('intro.title')}</h1>

          <div className="intro-steps-wrap" aria-label={t('tutorial.welcome.title')}>
            <ul className="intro-steps">
              <li className="intro-step">
                <span className="intro-checkbox" aria-hidden="true" />
                <span className="intro-step-text">{t('intro.step1')}</span>
              </li>
              <li className="intro-step">
                <span className="intro-checkbox" aria-hidden="true" />
                <span className="intro-step-text">{t('intro.step2')}</span>
              </li>
              <li className="intro-step">
                <span className="intro-checkbox" aria-hidden="true" />
                <span className="intro-step-text">{t('intro.step3')}</span>
              </li>
            </ul>
          </div>

          <div className="intro-mandala" aria-hidden="true">
            <img className="intro-mandala-img" src={mandalaSvg} alt="" draggable={false} loading="eager" />
          </div>
        </div>

        <div className="intro-mid">
          <p className="intro-footer-text">{t('intro.footer')}</p>
        </div>

        <div className="intro-bottom">
          <button
            className="intro-go"
            onClick={onGo}
            aria-label={t('intro.go')}
            type="button"
          >
            <span className="intro-go-text">{t('intro.go')}</span>
          </button>
        </div>
      </main>
    </div>
  );
}


