import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { SUPPORT_TG_WALLET_ADDRESS, TELEGRAM_WALLET_URL } from '../../constants/support';
import {
  copyToClipboardSync,
  isMobilePhone,
  openExternalUrl,
} from '../../utils/openExternal';
import './Settings.css';

const TELEGRAM_OPEN_DELAY_MS = 2800;

export function SettingsSupport() {
  const { setScreen } = useApp();
  const { t } = useI18n();
  const [banner, setBanner] = useState<'idle' | 'ok' | 'fail'>('idle');
  const address = SUPPORT_TG_WALLET_ADDRESS.trim();
  const hasAddress = address.length > 0;
  const mobile = isMobilePhone();

  const onCopy = () => {
    if (!hasAddress) return;
    const ok = copyToClipboardSync(address);
    setBanner(ok ? 'ok' : 'fail');
  };

  const onSend = () => {
    if (!hasAddress) return;
    const copied = copyToClipboardSync(address);
    setBanner(copied ? 'ok' : 'fail');

    if (!mobile) return;

    window.setTimeout(() => {
      openExternalUrl(TELEGRAM_WALLET_URL);
    }, TELEGRAM_OPEN_DELAY_MS);
  };

  const onOpenTelegramOnly = () => {
    openExternalUrl(TELEGRAM_WALLET_URL);
  };

  return (
    <div className="settings-page settings-page--support">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('supportTitle')}</span>
        <span />
      </header>

      {banner !== 'idle' && (
        <div
          className={`support-banner ${banner === 'ok' ? 'support-banner--ok' : 'support-banner--warn'}`}
          role="status"
        >
          <p className="support-banner__title">
            {banner === 'ok' ? t('supportBannerTitle') : t('supportCopyFail')}
          </p>
          {banner === 'ok' && (
            <p className="support-banner__body">{t('supportBannerBody')}</p>
          )}
        </div>
      )}

      <div className="settings-form">
        <p className="settings-note">{t('supportLead')}</p>
        <p className="settings-note">{t('supportFreeNote')}</p>

        {hasAddress ? (
          <>
            <p className="settings-note support-how">{t('supportHowIntro')}</p>
            <p className="settings-note">{t('supportNetworkNote')}</p>
            <ol className="support-steps">
              <li>{t('supportStep1')}</li>
              <li>{t('supportStep2')}</li>
              <li>{t('supportStep3')}</li>
            </ol>
            <div className="support-wallet" role="group" aria-label={t('supportWalletLabel')}>
              <code className="support-wallet__address">{address}</code>
            </div>
            <button type="button" className="btn btn--primary settings-full" onClick={onSend}>
              {mobile ? t('supportSendTelegram') : t('supportCopyAddress')}
            </button>
            {mobile && (
              <button type="button" className="btn btn--ghost settings-full" onClick={onOpenTelegramOnly}>
                {t('supportOpenTelegramOnly')}
              </button>
            )}
            <button type="button" className="btn btn--ghost settings-full" onClick={onCopy}>
              {t('supportCopyAgain')}
            </button>
          </>
        ) : (
          <p className="settings-note" role="status">{t('supportAddressPending')}</p>
        )}
      </div>
    </div>
  );
}
