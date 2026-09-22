import { Fragment } from 'react';
import type { Locale } from '../../../types';
import { useI18n } from '../../i18n';
import './LanguageToggle.css';

const LANGS: { id: Locale; label: string }[] = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' },
];

export default function LanguageToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`lumi-lang lumi-lang--${tone}`} aria-label={t('header.langLabel')}>
      {LANGS.map((lang, i) => (
        <Fragment key={lang.id}>
          {i > 0 && <span className="lumi-lang__sep">|</span>}
          <button
            type="button"
            className={`lumi-lang__btn ${locale === lang.id ? 'is-active' : ''}`}
            onClick={() => setLocale(lang.id)}
          >
            {lang.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
