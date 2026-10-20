/**
 * USDT (сеть TON): Кошелёк → Пополнить → USDT → TON → скопировать адрес.
 * Boosty добавим позже отдельной константой.
 */
export const SUPPORT_TG_WALLET_ADDRESS = 'UQCIwouZflLPjN5Rq_XAiFkoE0NOx6SrizGKc2-e5-tdwe21';

export const TELEGRAM_WALLET_URL = 'https://t.me/wallet';

/** Открывает приложение Telegram, не грузит t.me внутри PWA (иначе белый экран). */
export const TELEGRAM_WALLET_TG_SCHEME = 'tg://resolve?domain=wallet';

export function telegramWalletHref(): string {
  if (typeof navigator === 'undefined') return TELEGRAM_WALLET_URL;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return TELEGRAM_WALLET_TG_SCHEME;
  }
  return TELEGRAM_WALLET_URL;
}
