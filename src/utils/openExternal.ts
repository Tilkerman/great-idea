import { TELEGRAM_WALLET_URL } from '../constants/support';
import { isAppleMobile } from './pwaInstall';

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

/** Открыть https-ссылку (Telegram). На iPhone надёжнее, чем ton:// или window.open. */
export function openExternalUrl(url: string) {
  window.location.assign(url);
}

function isMobilePhone() {
  return isAppleMobile() || /Android/i.test(navigator.userAgent);
}

export type SupportTransferMode = 'copy-only' | 'telegram';

/**
 * ton:// на iPhone в Safari не работает («адрес недействителен»).
 * Везде: копируем адрес; на телефоне открываем https://t.me/wallet.
 */
export async function openSupportTransfer(address: string): Promise<{
  mode: SupportTransferMode;
  copied: boolean;
}> {
  const trimmed = address.trim();
  const copied = await copyToClipboard(trimmed);

  if (!isMobilePhone()) {
    return { mode: 'copy-only', copied };
  }

  openExternalUrl(TELEGRAM_WALLET_URL);
  return { mode: 'telegram', copied };
}

export { TELEGRAM_WALLET_URL };
