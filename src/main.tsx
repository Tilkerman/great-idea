import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import './index.css';
import { isAppleMobile, isStandaloneApp } from './utils/pwaInstall';

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
  // Installed PWA: aggressive skip-waiting + reload often → white screen / loop.
  const gentleSw = isStandaloneApp();
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'tili-push-resubscribe') return;
    void import('./utils/webPush').then(({ subscribeTiliPush, refreshCloudReminders }) => {
      void subscribeTiliPush().then((ok) => {
        if (ok === 'ok') void refreshCloudReminders();
      });
    });
  });
  const registerSw = () => {
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).then((reg) => {
      void reg.update();
      if (!gentleSw) {
        activateWaitingWorker(reg);
        reg.addEventListener('updatefound', () => activateWaitingWorker(reg));
      }
      if (!gentleSw) {
        window.setInterval(() => { void reg.update(); }, 5 * 60 * 1000);
      }
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
