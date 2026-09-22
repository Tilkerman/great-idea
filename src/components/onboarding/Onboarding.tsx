import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import './Onboarding.css';

export function Onboarding() {
  const { completeOnboarding, openAuth } = useApp();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const steps = [
    { title: t('onb0t'), body: t('onb0b'), emoji: '👋' },
    { title: t('onb1t'), body: t('onb1b'), emoji: '🤏' },
    { title: t('onb2t'), body: t('onb2b'), emoji: '⏱️' },
    { title: t('onb3t'), body: t('onb3b'), emoji: '🎨' },
    { title: t('onb4t'), body: t('onb4b'), emoji: '🔓' },
  ];
  const current = steps[step];
  const last = step === steps.length - 1;

  const skipToAccount = () => {
    if (!last) setStep(steps.length - 1);
    else completeOnboarding();
  };

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <span className="onboarding__emoji">{current.emoji}</span>
        <h1 className="onboarding__title">{current.title}</h1>
        <p className="onboarding__body">{current.body}</p>
        {last && (
          <button
            type="button"
            className="onboarding__link"
            onClick={() => openAuth('login', 'calendar')}
          >
            {t('onbLogin')}
          </button>
        )}
        <div className="onboarding__dots">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''}`} />
          ))}
        </div>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--ghost onboarding__skip" onClick={skipToAccount}>
          {last ? t('onbGuest') : t('onbSkip')}
        </button>
        {last ? (
          <button type="button" className="btn btn--primary" onClick={() => openAuth('register', 'calendar')}>
            {t('onbRegister')}
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setStep(step + 1)}>
            {t('onbNext')}
          </button>
        )}
      </div>
    </div>
  );
}
