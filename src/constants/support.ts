/**
 * USDT (сеть TON): Кошелёк → Пополнить → USDT → TON → скопировать адрес.
 * Boosty добавим позже отдельной константой.
 */
export const SUPPORT_TG_WALLET_ADDRESS = 'UQCIwouZflLPjN5Rq_XAiFkoE0NOx6SrizGKc2-e5-tdwe21';

/** Комментарий к переводу (необязательно). */
export const SUPPORT_TRANSFER_COMMENT = 'TiLi';

/** Ссылка ton:// — открывает Telegram Wallet с уже указанным получателем. */
export function supportTonTransferUrl(address = SUPPORT_TG_WALLET_ADDRESS) {
  const trimmed = address.trim();
  const params = new URLSearchParams({ text: SUPPORT_TRANSFER_COMMENT });
  return `ton://transfer/${trimmed}?${params.toString()}`;
}
