import { useLayoutEffect } from 'react';
import { isStandaloneApp } from '../utils/pwaInstall';

/**
 * Mark installed PWA so CSS can use 100vh.
 * Do not set --app-height from innerHeight / visualViewport / 100dvh:
 * on iOS standalone + viewport-fit=cover those values omit the home-indicator
 * band and leave a white gap under the UI.
 */
export function useAppViewportHeight() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle('is-standalone', isStandaloneApp());
    };
    apply();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}
