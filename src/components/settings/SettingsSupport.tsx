import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { SUPPORT_TG_WALLET_ADDRESS } from '../../constants/support';
import { copyToClipboard, openSupportTransfer } from '../../utils/openExternal';
import './Settings.css';

export function SettingsSupport() {
  const { setScreen } = useApp();
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<string | null>(null);
  const address = SUPPORT_TG_WALLET_ADDRESS.trim();
  const hasAddress = address.length > 0;

  const onCopy = async () => {
    if (!hasAddress) return;
    setFeedback(null);
    const ok = await copyToClipboard(address);
    setFeedback(ok ? t('supportCopied') : t('supportCopyFail'));
  };

  const onSend = async () => {
    if (!hasAddress) return;
    setFeedback(null);
    const { mode, copied } = await openSupportTransfer(address);
    if (mode === 'ton-deeplink') {
      setFeedback(copied ? t('supportSendTon') : t('supportSendTonNoCopy'));
      return;
    }
    setFeedback(copied ? t('supportSendWeb') : t('supportSendWebNoCopy'));
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('supportTitle')}</span>
        <span />
      </header>
      <div className="settings-form">
        <p className="settings-note">{t('supportLead')}</p>
        <p className="settings-note">{t('supportFreeNote')}</p>

        {hasAddress ? (
          <>
            <p className="settings-note">{t('supportNetworkNote')}</p>
            <div className="support-wallet" role="group" aria-label={t('supportWalletLabel')}>
              <code className="support-wallet__address">{address}</code>
            </div>
            <button type="button" className="btn btn--primary settings-full" onClick={() => { void onSend(); }}>
              {t('supportSendTelegram')}
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => { void onCopy(); }}>
              {t('supportCopyAddress')}
            </button>
          </>
        ) : (
          <p className="settings-note" role="status">{t('supportAddressPending')}</p>
        )}

        {feedback && (
          <p className="settings-note" role="status">{feedback}</p>
        )}
      </div>
    </div>
  );
}
