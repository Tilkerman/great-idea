import { TELEGRAM_WALLET_URL } from '../constants/support';
import { isAppleMobile } from './pwaInstall';

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
  try {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  return copyToClipboardSync(text);
}

/** Открыть Telegram снаружи PWA (iPhone: target=_blank → Safari → приложение). */
export function openExternalUrl(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
