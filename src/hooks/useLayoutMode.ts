import { useEffect, useState } from 'react';
import { DESKTOP_LAYOUT_MIN_PX } from '../constants/layout';

const QUERY = `(min-width: ${DESKTOP_LAYOUT_MIN_PX}px)`;

export function useLayoutMode() {
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setIsDesktopLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return { isDesktopLayout };
}

export function syncDesktopLayoutClass() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(
    'is-desktop-layout',
    window.matchMedia(QUERY).matches,
  );
}
