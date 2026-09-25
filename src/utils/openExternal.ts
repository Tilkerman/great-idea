import {
  SUPPORT_TRANSFER_COMMENT,
  supportTonkeeperTransferUrl,
  supportTonTransferUrl,
  TELEGRAM_WALLET_URL,
} from '../constants/support';
import { isAppleMobile, isStandaloneApp } from './pwaInstall';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Переход во внешний браузер — не in-app WebView с оплатой. */
export function openExternalUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function isMobilePhone() {
  return isAppleMobile() || /Android/i.test(navigator.userAgent);
}

function isDesktop() {
  return !isMobilePhone();
}

export type SupportTransferMode = 'ton-deeplink' | 'tonkeeper-web' | 'telegram-web';

/** Открыть перевод: на Mac/PWA ton:// не работает — копируем адрес и открываем https. */
export async function openSupportTransfer(address: string): Promise<{
  mode: SupportTransferMode;
  copied: boolean;
}> {
  const trimmed = address.trim();
  const copied = await copyToClipboard(trimmed);

  if (isDesktop() || isStandaloneApp()) {
    openExternalUrl(supportTonkeeperTransferUrl(trimmed));
    return { mode: 'tonkeeper-web', copied };
  }

  if (isMobilePhone()) {
    window.location.assign(supportTonTransferUrl(trimmed));
    return { mode: 'ton-deeplink', copied };
  }

  openExternalUrl(TELEGRAM_WALLET_URL);
  return { mode: 'telegram-web', copied };
}

export { SUPPORT_TRANSFER_COMMENT, TELEGRAM_WALLET_URL };
