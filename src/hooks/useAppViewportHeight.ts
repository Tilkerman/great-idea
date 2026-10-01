import { useEffect } from 'react';

/** Full layout viewport height (includes home-indicator zone with viewport-fit=cover). */
export function useAppViewportHeight() {
  useEffect(() => {
    const apply = () => {
      const height = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.visualViewport?.addEventListener('resize', apply);

    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, []);
}
