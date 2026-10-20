import { TELEGRAM_WALLET_URL, telegramWalletHref } from '../constants/support';
import { isAppleMobile, isStandaloneApp } from './pwaInstall';

/** Синхронное копирование — на iPhone async теряет жест и буфер пустой. */
export function copyToClipboardSync(text: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (ok) return true;
  } catch {
    /* clipboard API below */
  }
  return false;
}

/** После sync-пути (важно для жеста на iPhone). */
export async function copyToClipboardAsync(text: string): Promise<boolean> {
  if (copyToClipboardSync(text)) return true;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  return copyToClipboardAsync(text);
}

/**
 * Внешняя ссылка из PWA. Не откладывать вызов — только синхронно из клика.
 * t.me в standalone часто даёт белый экран; на телефоне — tg:// в приложение.
 */
export function openExternalUrl(url: string) {
  const href = url === TELEGRAM_WALLET_URL || url.includes('t.me/wallet')
    ? telegramWalletHref()
    : url;
  const isHttp = href.startsWith('http');

  if (!isHttp) {
    window.location.assign(href);
    return;
  }

  if (isStandaloneApp() && isAppleMobile()) {
    window.location.assign(href);
    return;
  }

  const opened = window.open(href, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(href);
  }
}

export function isMobilePhone() {
  return isAppleMobile() || /Android/i.test(navigator.userAgent);
}

export type SupportTransferMode = 'copy-only' | 'telegram';

export function openSupportTransfer(address: string): {
  mode: SupportTransferMode;
  copied: boolean;
} {
  const trimmed = address.trim();
  const copied = copyToClipboardSync(trimmed);

  if (!isMobilePhone()) {
    return { mode: 'copy-only', copied };
  }

  window.setTimeout(() => openExternalUrl(TELEGRAM_WALLET_URL), copied ? 400 : 0);
  return { mode: 'telegram', copied };
}

export { TELEGRAM_WALLET_URL };
