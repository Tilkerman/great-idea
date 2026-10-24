import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { isCloudAccountEnabled } from '../../utils/accountApi';
import { ONBOARDING_IMAGES } from './onboardingAssets';
import { OnboardingMascot, ONBOARDING_POSES } from './OnboardingMascot';
import './Onboarding.css';

type OnboardingStep = {
  title: string;
  body: string;
  mascot?: boolean;
  colorLegend?: boolean;
  imageDesktop?: string;
};

function ColorLegend() {
  const { t } = useI18n();
  return (
    <ul className="onboarding__legend" aria-label={t('onb3t')}>
      <li className="onboarding__legend-item onboarding__legend-item--work">
        <span className="onboarding__legend-swatch" aria-hidden />
        <span>{t('onb3Work')}</span>
      </li>
      <li className="onboarding__legend-item onboarding__legend-item--personal">
        <span className="onboarding__legend-swatch" aria-hidden />
        <span>{t('onb3Personal')}</span>
      </li>
      <li className="onboarding__legend-item onboarding__legend-item--family">
        <span className="onboarding__legend-swatch" aria-hidden />
        <span>{t('onb3Family')}</span>
      </li>
    </ul>
  );
}

function StepArt({ src }: { src: string }) {
  return (
    <div className="onboarding__art">
      <img src={src} alt="" className="onboarding__art-img" />
    </div>
  );
}

/** Полное введение (6 слайдов) — из «Показать введение» в справке. */
export function OnboardingLegacy() {
  const { completeOnboarding, openAuth } = useApp();
  const { t } = useI18n();
  const { isDesktopLayout } = useLayoutMode();
  const cloud = isCloudAccountEnabled();
  const [step, setStep] = useState(0);

  const steps = useMemo<OnboardingStep[]>(() => {
    const welcome: OnboardingStep = {
      title: t('onb0t'),
      body: t('onb0b'),
      mascot: true,
    };

    const colorsStep: OnboardingStep = {
      title: t('onb3t'),
      body: t('onb3b'),
      mascot: true,
      colorLegend: true,
      imageDesktop: ONBOARDING_IMAGES.colorsWeekDesktop,
    };

    const completeStep: OnboardingStep = {
      title: t('onb5t'),
      body: t('onb5b'),
      mascot: true,
      imageDesktop: ONBOARDING_IMAGES.swipeCardComplete,
    };

    const accountMobile: OnboardingStep = {
      title: cloud ? t('onb4tCloud') : t('onb4t'),
      body: cloud ? t('onb4bCloud') : t('onb4b'),
      mascot: true,
    };

    const accountDesktop: OnboardingStep = {
      title: cloud ? t('onbDesktop4tCloud') : t('onbDesktop4t'),
      body: cloud ? t('onbDesktop4bCloud') : t('onbDesktop4b'),
      mascot: true,
    };

    if (isDesktopLayout) {
      return [
        welcome,
        { title: t('onbDesktop2t'), body: t('onbDesktop2b'), mascot: true },
        { title: t('onbDesktop3t'), body: t('onbDesktop3b'), mascot: true },
        colorsStep,
        completeStep,
        accountDesktop,
      ];
    }

    return [
      welcome,
      { title: t('onb1t'), body: t('onb1b'), mascot: true },
      { title: t('onb2t'), body: t('onb2b'), mascot: true },
      colorsStep,
      completeStep,
      accountMobile,
    ];
  }, [t, cloud, isDesktopLayout]);

  const current = steps[step];
  const last = step === steps.length - 1;
  const stepLabel = String(step + 1).padStart(2, '0');
  const showMascot = current.mascot !== false;
  const desktopArt = isDesktopLayout && current.imageDesktop;

  const skipToAccount = () => {
    if (!last) setStep(steps.length - 1);
    else completeOnboarding();
  };

  return (
    <div
      className={[
        'onboarding',
        isDesktopLayout && 'onboarding--desktop',
        desktopArt && 'onboarding--with-art',
      ].filter(Boolean).join(' ')}
    >
      <div className="onboarding__scroll">
        <span className="onboarding__step-num" aria-hidden>{stepLabel}</span>

        <div className="onboarding__main">
          <div className="onboarding__content">
            {showMascot && (
              <OnboardingMascot pose={ONBOARDING_POSES[step] ?? 'welcome'} />
            )}
            <h1 className="onboarding__title">{current.title}</h1>
            <p className="onboarding__body">{current.body}</p>
            {current.colorLegend && <ColorLegend />}
            {last && (
              <button
                type="button"
                className="onboarding__link"
                onClick={() => openAuth('login', 'calendar')}
              >
                {t('onbLogin')}
              </button>
            )}
            <div className="onboarding__dots" role="tablist" aria-label={t('onbProgress')}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  role="tab"
                  aria-selected={i === step}
                  className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''}`}
                />
              ))}
            </div>
          </div>
          {desktopArt && <StepArt src={current.imageDesktop!} />}
        </div>
      </div>

      <div className="onboarding__actions">
        <button type="button" className="onboarding__btn onboarding__btn--skip" onClick={skipToAccount}>
          {last ? t('onbGuest') : t('onbSkip')}
        </button>
        {last ? (
          <button type="button" className="onboarding__btn onboarding__btn--next" onClick={() => openAuth('register', 'calendar')}>
            {t('onbRegister')}
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
