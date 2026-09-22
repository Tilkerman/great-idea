import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import {
  type BeforeInstallPromptEvent,
  canWebShare,
  copyAppLink,
  isAppleMobile,
  isStandaloneApp,
  shareAppLink,
  trackInstallButtonClick,
  TILI_PUBLIC_URL,
} from '../../utils/pwaInstall';
import './Settings.css';

function InstallGuide({ ios }: { ios: boolean }) {
  const { t } = useI18n();
  if (ios) {
    return (
      <ol className="settings-install__steps">
        <li>{t('installIos1')}</li>
        <li>{t('installGo')} <strong>{TILI_PUBLIC_URL}</strong></li>
        <li>{t('installIos3')}</li>
        <li>{t('installIos4')}</li>
        <li>{t('installIos5')}</li>
      </ol>
    );
  }

  return (
    <ol className="settings-install__steps">
      <li>{t('installAnd1')}</li>
      <li>{t('installGo')} <strong>{TILI_PUBLIC_URL}</strong></li>
      <li>{t('installAnd3')}</li>
      <li>{t('installAnd4')}</li>
      <li>{t('installAnd5')}</li>
    </ol>
  );
}

export function SettingsInstall() {
  const { setScreen } = useApp();
  const { t, locale } = useI18n();
  const isInstalled = useMemo(() => isStandaloneApp(), []);
  const isIos = useMemo(() => isAppleMobile(), []);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  useEffect(() => {
    if (showGuide) {
      guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showGuide]);

  const showShare = canWebShare();

  const onInstall = async () => {
    trackInstallButtonClick();
    setFeedback(null);

    if (installPrompt) {
      setInstallBusy(true);
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          setFeedback(t('installBusy'));
          setInstallPrompt(null);
          setShowGuide(false);
        } else {
          setShowGuide(true);
        }
      } finally {
        setInstallBusy(false);
      }
      return;
    }

    setShowGuide(true);
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
        <p className="settings-install__heading">{t('installOnPhone')}</p>
        <p className="settings-install__lead">{t('installLead')}</p>

        <div className="settings-install__actions">
          {!isInstalled && (
            <button
              type="button"
              className="btn btn--primary settings-full"
              disabled={installBusy}
              data-track="install-button-click"
              onClick={() => { void onInstall(); }}
            >
              {t('installOnPhone')}
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

        {showGuide && !isInstalled && (
          <div ref={guideRef} className="settings-install__guide" role="region" aria-label={t('howInstall')}>
            <p className="settings-install__guide-title">
              {isIos ? t('installIos') : t('installAndroid')}
            </p>
            <InstallGuide ios={isIos} />
            <p className="settings-install__text">
              {t('afterInstall')}
            </p>
          </div>
        )}

        {isInstalled ? (
          <p className="settings-install__text">
            {t('alreadyHome')}
          </p>
        ) : (
          <>
            <p className="settings-install__text">
              {t('pwaExplainLong')}
            </p>
            <div className="settings-install__box">
              <p className="settings-install__box-title">{t('installOfflineTitle')}</p>
              <p className="settings-install__text">
                {t('installOfflineBody')}
              </p>
            </div>
            {!showGuide && (
              <>
                <p className="settings-install__subhead">{t('installBrief')}</p>
                <ul className="settings-install__list">
                  <li>{t('installBriefAndroid')}</li>
                  <li>{t('installBriefIos')}</li>
                </ul>
              </>
            )}
            <p className="settings-install__text">
              {t('installTapHint')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
