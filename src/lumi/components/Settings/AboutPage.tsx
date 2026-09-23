import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';

interface AboutPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
  const { t } = useI18n();

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.about.title')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <article className="settings-about settings-about--lumi">
            <div className="settings-about__intro">
              <p className="settings-about__logo">{t('settings.about.headline')}</p>
              <p className="settings-about__tagline">{t('settings.about.lead')}</p>
            </div>
            <p>{t('settings.about.noGrid')}</p>
            <p>{t('settings.about.notTask')}</p>
            <p>{t('settings.about.image')}</p>

            <h2 className="settings-about__h">{t('settings.about.howTitle')}</h2>
            <h3 className="settings-about__h2">{t('settings.about.how1Title')}</h3>
            <p>{t('settings.about.how1a')}</p>
            <p>{t('settings.about.how1b')}</p>
            <ul className="settings-about__list">
              <li>{t('settings.about.exTravel')}</li>
              <li>{t('settings.about.exHome')}</li>
              <li>{t('settings.about.exHealth')}</li>
              <li>{t('settings.about.exGrowth')}</li>
              <li>{t('settings.about.exRel')}</li>
              <li>{t('settings.about.exArt')}</li>
              <li>{t('settings.about.exMoney')}</li>
            </ul>
            <p>{t('settings.about.how1c')}</p>

            <h3 className="settings-about__h2">{t('settings.about.how2Title')}</h3>
            <p>{t('settings.about.how2a')}</p>
            <p>{t('settings.about.how2b')}</p>
            <p>{t('settings.about.how2c')}</p>
            <p>{t('settings.about.how2d')}</p>

            <h3 className="settings-about__h2">{t('settings.about.how3Title')}</h3>
            <p>{t('settings.about.how3a')}</p>
            <p>{t('settings.about.how3b')}</p>
            <p className="settings-about__levels">{t('settings.about.wishLabel')}</p>
            <p className="settings-about__quote">{t('settings.about.wishJapan')}</p>
            <p className="settings-about__levels">{t('settings.about.stepsLabel')}</p>
            <ul className="settings-about__list">
              <li>{t('settings.about.step1')}</li>
              <li>{t('settings.about.step2')}</li>
              <li>{t('settings.about.step3')}</li>
              <li>{t('settings.about.step4')}</li>
              <li>{t('settings.about.step5')}</li>
            </ul>
            <p>{t('settings.about.how3c')}</p>

            <h3 className="settings-about__h2">{t('settings.about.how4Title')}</h3>
            <p>{t('settings.about.how4a')}</p>
            <p>{t('settings.about.how4b')}</p>
            <p>{t('settings.about.how4c')}</p>
            <ul className="settings-about__list">
              <li>{t('settings.about.hasWheel')}</li>
              <li>{t('settings.about.hasWishes')}</li>
              <li>{t('settings.about.hasFeel')}</li>
              <li>{t('settings.about.hasSteps')}</li>
              <li>{t('settings.about.hasCal')}</li>
              <li>{t('settings.about.hasStats')}</li>
              <li>{t('settings.about.hasArchive')}</li>
            </ul>

            <h2 className="settings-about__h">{t('settings.about.remindTitle')}</h2>
            <p>{t('settings.about.remindLead')}</p>
            <p>{t('settings.about.remindOne')}</p>
            <p>{t('settings.about.remindPause')}</p>
            <p className="settings-about__quote">{t('settings.about.remindAsk')}</p>
          </article>
        </div>
      </div>
    </>
  );
}
