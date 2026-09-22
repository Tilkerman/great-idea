import { useCallback } from 'react';
import { I18nProvider } from './i18n';
import LumiApp from './App';
import { useApp } from '../context/AppContext';
import type { Locale } from '../types';
import './index.css';

export function LumiEmbed() {
  const { settings, updateSettings } = useApp();
  const onLocaleChange = useCallback(
    (next: Locale) => {
      void updateSettings({ locale: next });
    },
    [updateSettings],
  );

  return (
    <div className="lumi-root">
      <I18nProvider locale={settings.locale} onLocaleChange={onLocaleChange}>
        <LumiApp />
      </I18nProvider>
    </div>
  );
}
