import { useLayoutEffect } from 'react';
import { syncDesktopLayoutClass } from './useLayoutMode';

/** Keeps `html.is-desktop-layout` in sync with `(min-width: 1024px)`. */
export function useDesktopLayoutClass() {
  useLayoutEffect(() => {
    syncDesktopLayoutClass();
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => syncDesktopLayoutClass();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
}
