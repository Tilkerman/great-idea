/** Работает и по http://192.168… на iPhone (не secure context). */
export function newTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* randomUUID есть, но недоступен вне HTTPS / localhost */
    }
  }
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
