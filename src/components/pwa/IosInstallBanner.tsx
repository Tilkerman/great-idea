import { useLayoutEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import {
  copyAppLink,
  isAppleMobile,
  isIosChrome,
  isIosInAppBrowser,
  isStandaloneApp,
} from '../../utils/pwaInstall';
import './IosInstallBanner.css';

export function IosInstallBanner() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const mode = useMemo(() => {
    if (!isAppleMobile() || isStandaloneApp()) return null;
    // Safari already has Share → Home Screen; don't cover the calendar on first visit.
    if (isIosInAppBrowser()) return 'inapp' as const;
    if (isIosChrome()) return 'chrome' as const;
    return null;
  }, []);

  const visible = Boolean(mode);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('has-ios-install-banner', visible);
    return () => document.documentElement.classList.remove('has-ios-install-banner');
  }, [visible]);

  if (!visible || !mode) return null;

  const onCopy = async () => {
    await copyAppLink();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const title = mode === 'inapp' ? t('installBannerInAppTitle') : t('installBannerChromeTitle');
  const body = mode === 'inapp' ? t('installBannerInAppBody') : t('installBannerChromeBody');

  return (
    <div className="ios-install-banner" role="status">
      <div className="ios-install-banner__inner">
        <p className="ios-install-banner__title">{title}</p>
        <p className="ios-install-banner__body">{body}</p>
        <div className="ios-install-banner__actions">
          <button type="button" className="ios-install-banner__btn" onClick={() => { void onCopy(); }}>
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
