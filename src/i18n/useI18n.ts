import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { dateTag, getPack, interpolate, type MsgKey } from './catalog';

export function useI18n() {
  const { settings } = useApp();
  const locale = settings.locale;
  const pack = getPack(locale);

  const t = useCallback((key: MsgKey, vars?: Record<string, string | number>) => {
    return interpolate(pack.msg[key], vars);
  }, [pack]);

  const taskWord = useCallback((n: number) => {
    if (locale !== 'ru') return n === 1 ? pack.msg.taskOne : pack.msg.taskMany;
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return pack.msg.taskOne;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 > 20)) return pack.msg.taskFew;
    return pack.msg.taskMany;
  }, [locale, pack]);

  return {
    locale,
    dateTag: dateTag(locale),
    months: pack.months,
    monthsShort: pack.monthsShort,
    monthsGen: pack.monthsGen,
    weekdays: pack.weekdays,
    weekdaysShort: pack.weekdaysShort,
    t,
    taskWord,
  };
}
