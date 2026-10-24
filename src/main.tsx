import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import './index.css';
import { isAppleMobile, isStandaloneApp } from './utils/pwaInstall';
import { reloadIfAppBuildChanged } from './utils/appUpdate';

reloadIfAppBuildChanged();

window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

function activateWaitingWorker(reg: ServiceWorkerRegistration) {
  const waiting = reg.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }
  const installing = reg.installing;
  if (!installing) return;
  installing.addEventListener('statechange', () => {
    if (installing.state === 'installed' && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

const iosSafariTab = isAppleMobile() && !isStandaloneApp();

if (import.meta.env.PROD && 'serviceWorker' in navigator && !iosSafariTab) {
  const base = import.meta.env.BASE_URL;
  const alreadyControlled = Boolean(navigator.serviceWorker.controller);
  // PWA и широкий десктоп: без авто-reload на controllerchange (ломало Cmd+Shift+R на Mac).
  const gentleSw = isStandaloneApp()
    || window.matchMedia('(min-width: 1024px)').matches;
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'tili-push-resubscribe') return;
    void import('./utils/webPush').then(({ subscribeTiliPush, refreshCloudReminders }) => {
      void subscribeTiliPush().then((ok) => {
        if (ok === 'ok') void refreshCloudReminders();
      });
    });
  });
  const tryReloadForWaitingWorker = (reg: ServiceWorkerRegistration) => {
    if (!navigator.serviceWorker.controller || !reg.waiting) return;
    const build = import.meta.env.VITE_APP_BUILD?.trim() || 'unknown';
    const reloadKey = `tili-sw-applied-${build}`;
    try {
      if (sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, '1');
    } catch {
      /* private mode */
    }
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  const registerSw = () => {
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).then((reg) => {
      void reg.update();
      if (gentleSw) {
        if (reg.waiting) tryReloadForWaitingWorker(reg);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') tryReloadForWaitingWorker(reg);
          });
        });
      } else {
        activateWaitingWorker(reg);
        reg.addEventListener('updatefound', () => activateWaitingWorker(reg));
      }
      window.setInterval(() => { void reg.update(); }, 5 * 60 * 1000);
    });
  };
  if (gentleSw) {
    if (document.readyState === 'complete') registerSw();
    else window.addEventListener('load', registerSw, { once: true });
  } else {
    registerSw();
  }
  // Reload only when a new worker replaces one that already ran this tab.
  // Reloading on the first claim loops: install → claim → reload → install…
  if (alreadyControlled && !gentleSw) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
