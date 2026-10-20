import { useCallback, useEffect, useState } from 'react';
import { I18nProvider } from './i18n';
import LumiApp from './App';
import { useApp } from '../context/AppContext';
import type { Locale } from '../types';
import './index.css';

export function LumiEmbed() {
  const { settings, updateSettings } = useApp();
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    const onSynced = () => setSyncKey((k) => k + 1);
    window.addEventListener('tili-lumi-cloud-sync', onSynced);
    return () => window.removeEventListener('tili-lumi-cloud-sync', onSynced);
  }, []);

  const onLocaleChange = useCallback(
    (next: Locale) => {
      void updateSettings({ locale: next });
    },
    [updateSettings],
  );

  return (
    <div className="lumi-root">
      <I18nProvider locale={settings.locale} onLocaleChange={onLocaleChange}>
        <LumiApp key={syncKey} />
      </I18nProvider>
    </div>
  );
}
