import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import type { MascotPose } from './mascotTypes';
import { OnboardingMascot } from './OnboardingMascot';
import './Onboarding.css';

const SHORT_POSES: MascotPose[] = ['welcome', 'pinch', 'device'];

/** Короткое введение (3 слайда) — первый запуск. */
export function OnboardingShort() {
  const { completeOnboarding } = useApp();
  const { t } = useI18n();
  const { isDesktopLayout } = useLayoutMode();
  const [step, setStep] = useState(0);

  const steps = useMemo(() => [
    {
      title: t('onbShort1t'),
      body: isDesktopLayout ? t('onbShort1bDesktop') : t('onbShort1bMobile'),
    },
    {
      title: t('onbShort2t'),
      body: isDesktopLayout ? t('onbShort2bDesktop') : t('onbShort2bMobile'),
    },
    {
      title: t('onbShort3t'),
      body: t('onbShort3b'),
    },
  ], [t, isDesktopLayout]);

  const current = steps[step];
  const last = step === steps.length - 1;
  const stepLabel = String(step + 1).padStart(2, '0');

  const exitTour = () => completeOnboarding();

  const dots = (
    <div className="onboarding__dots onboarding__dots--footer" role="tablist" aria-label={t('onbProgress')}>
      {steps.map((_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={i === step}
          className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''}`}
        />
      ))}
    </div>
  );

  return (
    <div
      className={[
        'onboarding',
        'onboarding--short',
        isDesktopLayout && 'onboarding--desktop',
      ].filter(Boolean).join(' ')}
    >
      <div className="onboarding__scroll">
        <span className="onboarding__step-num" aria-hidden>{stepLabel}</span>

        <div className="onboarding__main">
          <div className="onboarding__content">
            <OnboardingMascot pose={SHORT_POSES[step] ?? 'welcome'} />
            <h1 className="onboarding__title">{current.title}</h1>
            <p className="onboarding__body">{current.body}</p>
          </div>
        </div>
      </div>

      {dots}

      <div
        className={[
          'onboarding__actions',
          last && 'onboarding__actions--final-short',
        ].filter(Boolean).join(' ')}
      >
        {!last && (
          <button type="button" className="onboarding__btn onboarding__btn--skip" onClick={exitTour}>
            {t('onbSkip')}
          </button>
        )}
        {last ? (
          <button
            type="button"
            className="onboarding__btn onboarding__btn--next onboarding__btn--start"
            onClick={exitTour}
          >
            {t('onbStart')}
          </button>
        ) : (
          <button type="button" className="onboarding__btn onboarding__btn--next" onClick={() => setStep(step + 1)}>
            {t('onbNext')}
          </button>
        )}
      </div>
    </div>
  );
}
