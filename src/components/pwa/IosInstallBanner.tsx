import { useLayoutEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  copyAppLink,
  isAppleMobile,
  isIosChrome,
  isIosInAppBrowser,
  isIosSafariBrowser,
  isStandaloneApp,
  TILI_PUBLIC_URL,
} from '../../utils/pwaInstall';
import './IosInstallBanner.css';

const DISMISS_KEY = 'tili-ios-install-banner-dismiss';

export function IosInstallBanner() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  const mode = useMemo(() => {
    if (!isAppleMobile() || isStandaloneApp()) return null;
    if (isIosInAppBrowser()) return 'inapp' as const;
    if (isIosChrome()) return 'chrome' as const;
    if (isIosSafariBrowser()) return 'safari' as const;
    return 'other' as const;
  }, []);

  const visible = Boolean(mode && !(mode === 'safari' && dismissed));

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('has-ios-install-banner', visible);
    return () => document.documentElement.classList.remove('has-ios-install-banner');
  }, [visible]);

  if (!visible) return null;

  const onCopy = async () => {
    await copyAppLink();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const onDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const title =
    mode === 'inapp'
      ? t('installBannerInAppTitle')
      : mode === 'chrome'
        ? t('installBannerChromeTitle')
        : mode === 'safari'
          ? t('installBannerSafariTitle')
          : t('installBannerOtherTitle');

  const body =
    mode === 'inapp'
      ? t('installBannerInAppBody')
      : mode === 'chrome'
        ? t('installBannerChromeBody')
        : mode === 'safari'
          ? t('installBannerSafariBody')
          : t('installBannerOtherBody');

  return (
    <div className="ios-install-banner" role="status">
      <div className="ios-install-banner__inner">
        <p className="ios-install-banner__title">{title}</p>
        <p className="ios-install-banner__body">{body}</p>
        {mode === 'safari' && (
          <p className="ios-install-banner__hint">
            {t('installBannerTest')}{' '}
            <a className="ios-install-banner__link" href={`${TILI_PUBLIC_URL}install-test.html`}>
              {t('installBannerTestLink')}
            </a>
          </p>
        )}
        <div className="ios-install-banner__actions">
          <button type="button" className="ios-install-banner__btn" onClick={() => { void onCopy(); }}>
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
          {mode === 'safari' && (
            <button type="button" className="ios-install-banner__btn ios-install-banner__btn--ghost" onClick={onDismiss}>
              {t('installBannerDismiss')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
