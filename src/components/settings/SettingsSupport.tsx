import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { SUPPORT_TG_WALLET_ADDRESS, telegramWalletHref } from '../../constants/support';
import { trackSupportAuthorClick } from '../../utils/productAnalytics';
import { copyToClipboardAsync, copyToClipboardSync, isMobilePhone } from '../../utils/openExternal';
import './Settings.css';

export function SettingsSupport() {
  const { setScreen, settings } = useApp();
  const { t } = useI18n();
  const [banner, setBanner] = useState<'idle' | 'ok' | 'fail'>('idle');
  const address = SUPPORT_TG_WALLET_ADDRESS.trim();
  const hasAddress = address.length > 0;
  const mobile = isMobilePhone();
  const walletHref = telegramWalletHref();
  const walletOpensInNewTab = walletHref.startsWith('http');

  /** Копирование до click — иначе setState в onClick ломает переход по ссылке. */
  const onWalletPointerDown = () => {
    if (!hasAddress) return;
    trackSupportAuthorClick(settings.analyticsEnabled, 'open_wallet');
    const copied = copyToClipboardSync(address);
    const showBanner = (ok: boolean) => {
      window.setTimeout(() => setBanner(ok ? 'ok' : 'fail'), 0);
    };
    if (copied) {
      showBanner(true);
      return;
    }
    void copyToClipboardAsync(address).then(showBanner);
  };

  return (
    <div className="settings-page settings-page--support">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('supportTitle')}</span>
        <span />
      </header>

      <div className="settings-form settings-form--support">
        <p className="settings-note">{t('supportLead')}</p>
        <p className="settings-note">{t('supportFreeNote')}</p>

        {hasAddress ? (
          <>
            <p className="settings-note">{t('supportNetworkNote')}</p>
            <ol className="support-steps">
              <li>{t('supportStepOpenWallet')}</li>
              <li>{t('supportStep2')}</li>
              <li>{t('supportStep3')}</li>
            </ol>
            <div className="support-wallet" role="group" aria-label={t('supportWalletLabel')}>
              <code className="support-wallet__address">{address}</code>
            </div>
            <p className="settings-note support-wallet-hint">{t('supportWalletManualCopy')}</p>
            <a
              href={walletHref}
              className="btn btn--primary settings-full support-wallet-link"
              {...(walletOpensInNewTab
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              onPointerDown={onWalletPointerDown}
            >
              {t('supportOpenWallet')}
            </a>
            {banner !== 'idle' && (
              <p
                className={`support-feedback${banner === 'ok' ? ' support-feedback--ok' : ' support-feedback--warn'}`}
                role="status"
              >
                {banner === 'ok'
                  ? (mobile ? t('supportCopiedOpenTelegram') : t('supportCopiedOpenTelegramDesktop'))
                  : t('supportCopyFail')}
              </p>
            )}
          </>
        ) : (
          <p className="settings-note" role="status">{t('supportAddressPending')}</p>
        )}
      </div>
    </div>
  );
}
