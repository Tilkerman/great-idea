let notifier: (() => void) | null = null;

export function registerLumiCloudDirtyNotifier(fn: (() => void) | null) {
  notifier = fn;
}

export function notifyLumiCloudDirty() {
  notifier?.();
}

export function dispatchLumiCloudSynced() {
  window.dispatchEvent(new Event('tili-lumi-cloud-sync'));
}
