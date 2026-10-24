/** После деплоя: один раз перезагрузить вкладку, если сборка сменилась. */
export function reloadIfAppBuildChanged() {
  if (!import.meta.env.PROD) return;
  const build = import.meta.env.VITE_APP_BUILD?.trim();
  if (!build) return;

  const key = 'tili-app-build';
  const prev = localStorage.getItem(key);
  if (prev && prev !== build) {
    localStorage.setItem(key, build);
    window.location.reload();
    return;
  }
  if (!prev) localStorage.setItem(key, build);
}
