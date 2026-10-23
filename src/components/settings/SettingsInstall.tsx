import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import {
  type BeforeInstallPromptEvent,
  canWebShare,
  copyAppLink,
  isStandaloneApp,
  shareAppLink,
  trackInstallButtonClick,
  TILI_PUBLIC_URL,
} from '../../utils/pwaInstall';
import { trackInstallHintClick } from '../../utils/productAnalytics';
import './Settings.css';

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="settings-install__steps">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

export function SettingsInstall() {
  const { setScreen, settings } = useApp();
  const { t, locale } = useI18n();
  const isInstalled = useMemo(() => isStandaloneApp(), []);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  const showShare = canWebShare();

  const platformGuides = useMemo(
    () => [
      { id: 'install-iphone', label: t('installIos') },
      { id: 'install-android', label: t('installAndroid') },
      { id: 'install-mac', label: t('installMac') },
      { id: 'install-windows', label: t('installWindows') },
    ],
    [t],
  );

  const onInstallHere = async () => {
    if (!installPrompt) return;
    trackInstallButtonClick();
    trackInstallHintClick(settings.analyticsEnabled, 'android');
    setFeedback(null);
    setInstallBusy(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setFeedback(t('installBusy'));
        setInstallPrompt(null);
      }
    } finally {
      setInstallBusy(false);
    }
  };

  const onShare = async () => {
    setFeedback(null);
    setShareBusy(true);
    try {
      const result = await shareAppLink(locale);
      if (result === 'copied') {
        setFeedback(t('linkCopied'));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      try {
        await copyAppLink();
        setFeedback(t('linkCopied'));
      } catch {
        setFeedback(t('shareFail'));
      }
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('settingsInstall')}</span>
        <span />
      </header>

      <div className="settings-form settings-install-page">
        <p className="settings-install__heading">{t('installPageTitle')}</p>
        <p className="settings-install__lead">{t('installLead')}</p>
        <p className="settings-install__url">
          {t('installOneUrl')}
          {' '}
          <strong>{TILI_PUBLIC_URL}</strong>
        </p>

        <div className="settings-install__actions">
          {!isInstalled && installPrompt && (
            <button
              type="button"
              className="btn btn--primary settings-full"
              disabled={installBusy}
              data-track="install-button-click"
              onClick={() => { void onInstallHere(); }}
            >
              {t('installHere')}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost settings-full"
            disabled={shareBusy}
            onClick={() => { void onShare(); }}
          >
            {showShare ? t('shareLink') : t('copyLink')}
          </button>
        </div>

        {feedback && <p className="settings-install__feedback" role="status">{feedback}</p>}

        {isInstalled && (
          <p className="settings-install__text">{t('alreadyHome')}</p>
        )}

        <nav className="settings-install__jump" aria-label={t('installJumpLabel')}>
          {platformGuides.map((platform) => (
            <a key={platform.id} className="settings-install__jump-link" href={`#${platform.id}`}>
              {platform.label}
            </a>
          ))}
        </nav>

        <div className="settings-install__brief">
          <p className="settings-install__brief-title">{t('installBrief')}</p>
          <ul className="settings-install__brief-list">
            <li><strong>{t('installIos')}:</strong> {t('installBriefIos')}</li>
            <li><strong>{t('installAndroid')}:</strong> {t('installBriefAndroid')}</li>
            <li><strong>{t('installMac')}:</strong> {t('installBriefMac')}</li>
            <li><strong>{t('installWindows')}:</strong> {t('installBriefWin')}</li>
          </ul>
          <p className="settings-install__text settings-install__tap-hint">{t('installTapHint')}</p>
        </div>

        <section className="settings-install__guide" aria-labelledby="install-iphone">
          <h2 id="install-iphone" className="settings-install__guide-title">{t('installIos')}</h2>
          <StepList steps={[
            t('installIos1'),
            t('installIos2'),
            t('installIos3'),
            t('installIos4'),
            t('installIos5'),
            t('installIos6'),
          ]} />
          <p className="settings-install__guide-sub">{t('installIconFixTitle')}</p>
          <StepList steps={[
            t('installIconFix1'),
            t('installIconFix2'),
            t('installIconFix3'),
            t('installIconFix4'),
          ]} />
        </section>

        <section className="settings-install__guide" aria-labelledby="install-android">
          <h2 id="install-android" className="settings-install__guide-title">{t('installAndroid')}</h2>
          <StepList steps={[
            t('installAnd1'),
            t('installAnd2'),
            t('installAnd3'),
            t('installAnd4'),
            t('installAnd5'),
          ]} />
        </section>

        <section className="settings-install__guide" aria-labelledby="install-mac">
          <h2 id="install-mac" className="settings-install__guide-title">{t('installMac')}</h2>
          <p className="settings-install__guide-sub">{t('installMacSafari')}</p>
          <StepList steps={[
            t('installMacSafari1'),
            t('installMacSafari2'),
            t('installMacSafari3'),
            t('installMacSafari4'),
            t('installMacSafari5'),
          ]} />
          <p className="settings-install__text">{t('installMacSafariMissing')}</p>
          <p className="settings-install__guide-sub settings-install__guide-sub--next">{t('installMacChrome')}</p>
          <StepList steps={[
            t('installMacChrome1'),
            t('installMacChrome2'),
            t('installMacChrome3'),
            t('installMacChrome4'),
          ]} />
        </section>

        <section className="settings-install__guide" aria-labelledby="install-windows">
          <h2 id="install-windows" className="settings-install__guide-title">{t('installWindows')}</h2>
          <StepList steps={[
            t('installWin1'),
            t('installWin2'),
            t('installWin3'),
            t('installWin4'),
            t('installWin5'),
          ]} />
        </section>

        <p className="settings-install__text">{t('installAccountNote')}</p>
        <div className="settings-install__box">
          <p className="settings-install__box-title">{t('installOfflineTitle')}</p>
          <p className="settings-install__text">{t('installOfflineBody')}</p>
        </div>
      </div>
    </div>
  );
}
