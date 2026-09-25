import {
  SUPPORT_TRANSFER_COMMENT,
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

export type SupportTransferMode = 'copy-only' | 'ton-deeplink' | 'telegram-web';

/**
 * Mac и PWA не умеют ton:// и Tonkeeper без установленного приложения.
 * На компьютере — только копируем адрес. На телефоне в PWA — Telegram. В Safari — ton://.
 */
export async function openSupportTransfer(address: string): Promise<{
  mode: SupportTransferMode;
  copied: boolean;
}> {
  const trimmed = address.trim();
  const copied = await copyToClipboard(trimmed);

  if (isDesktop()) {
    return { mode: 'copy-only', copied };
  }

  if (isStandaloneApp()) {
    openExternalUrl(TELEGRAM_WALLET_URL);
    return { mode: 'telegram-web', copied };
  }

  window.location.assign(supportTonTransferUrl(trimmed));
  return { mode: 'ton-deeplink', copied };
}

export { SUPPORT_TRANSFER_COMMENT, TELEGRAM_WALLET_URL };
