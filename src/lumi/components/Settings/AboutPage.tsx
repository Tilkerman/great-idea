import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';

interface AboutPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function AboutPage({ onBack, onSettingsClick, onGoHome }: AboutPageProps) {
  const { t } = useI18n();

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.about.title')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.about.title')}</h1>
          <div className="settings-page-text">
            <div className="about-lumi-intro">
              <h2 className="about-lumi-subtitle">{t('settings.about.subtitle')}</h2>
              <p className="about-lumi-subtitle-ru">{t('settings.about.subtitleRu')}</p>
              <p className="about-lumi-description">{t('settings.about.description')}</p>
            </div>
            <p>{t('settings.about.text1')}</p>
            <p>{t('settings.about.text2')}</p>
            <p>{t('settings.about.text3')}</p>
            <p>{t('settings.about.text4')}</p>
            <p className="settings-page-heart">{t('settings.about.text5')}</p>
          </div>
        </div>
      </div>
    </>
  );
}

