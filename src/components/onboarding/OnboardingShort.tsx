import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import type { MascotPose } from './mascotTypes';
import { OnboardingMascot } from './OnboardingMascot';
import { ONBOARDING_IMAGES } from './onboardingAssets';
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
      body: '',
    },
    {
      title: t('onbShort3t'),
      body: isDesktopLayout ? t('onbShort3bDesktop') : t('onbShort3bMobile'),
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
            <h1 className="onboarding__title">{current.title}</h1>
            {step === 1 ? (
              <div className="onboarding__gestures">
                <section className="onboarding__gesture">
                  <OnboardingMascot pose="pinch" />
                  <div className="onboarding__gesture-copy">
                    <h2 className="onboarding__gesture-title">{t('onbShort2aTitle')}</h2>
                    <p className="onboarding__body">{isDesktopLayout ? t('onbShort2aDesktop') : t('onbShort2aMobile')}</p>
                  </div>
                </section>
                <section className="onboarding__gesture onboarding__gesture--flip">
                  <OnboardingMascot pose="swipe" />
                  <div className="onboarding__gesture-copy">
                    <h2 className="onboarding__gesture-title">{t('onbShort2bTitle')}</h2>
                    <p className="onboarding__body">{isDesktopLayout ? t('onbShort2bDesktop') : t('onbShort2bMobile')}</p>
                  </div>
                </section>
              </div>
            ) : step === 2 ? (
              <div className="onboarding__devices">
                <OnboardingMascot pose="device" />
                <div className="onboarding__devices-scene">
                  <img
                    className="onboarding__devices-cloud"
                    src={ONBOARDING_IMAGES.mascotCloud}
                    alt=""
                    decoding="async"
                    draggable={false}
                  />
                  <img
                    className="onboarding__devices-art"
                    src={ONBOARDING_IMAGES.devicesBackup}
                    alt=""
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
            ) : (
              <OnboardingMascot pose={SHORT_POSES[step] ?? 'welcome'} />
            )}
            {step === 0 && <p className="onboarding__lead">{t('onbShort1lead')}</p>}
            {step === 2 && <p className="onboarding__lead">{t('onbShort3lead')}</p>}
            {step !== 1 && <p className="onboarding__body">{current.body}</p>}
            {step === 0 && (
              <ul className="onboarding__palette" aria-label={t('onb3t')}>
                <li className="onboarding__palette-item onboarding__palette-item--work">
                  <span className="onboarding__palette-dot" aria-hidden />
                  <span className="onboarding__palette-label">{t('onbShortWork')}</span>
                </li>
                <li className="onboarding__palette-item onboarding__palette-item--personal">
                  <span className="onboarding__palette-dot" aria-hidden />
                  <span className="onboarding__palette-label">{t('onbShortPersonal')}</span>
                </li>
                <li className="onboarding__palette-item onboarding__palette-item--family">
                  <span className="onboarding__palette-dot" aria-hidden />
                  <span className="onboarding__palette-label">{t('onbShortFamily')}</span>
                </li>
              </ul>
            )}
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
