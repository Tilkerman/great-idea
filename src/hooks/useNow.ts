import { useEffect, useState } from 'react';

/** Текущее локальное время; тик раз в минуту по Date.now(), без дрифта счётчика. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId = 0;
    let timeoutId = 0;

    const tick = () => {
      setNow(new Date(Date.now()));
    };

    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, msToNextMinute);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}
