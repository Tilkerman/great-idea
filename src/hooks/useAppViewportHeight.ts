import { useEffect } from 'react';

/** Keeps --app-height in sync with the visible viewport (iOS Safari / standalone PWA). */
export function useAppViewportHeight() {
  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);
}
