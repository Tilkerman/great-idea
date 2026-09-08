import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './Onboarding.css';

const STEPS = [
  {
    title: 'Добро пожаловать в TiLi',
    body: 'Управляй своей жизнью — начни с календаря задач и дел.',
    emoji: '👋',
  },
  {
    title: 'Щипок — меняй масштаб',
    body: 'Год → месяц → неделя → день. На неделе щипок увеличивает колонки — до ~2.5 дней на экране.',
    emoji: '🤏',
  },
  {
    title: 'Час — до 5 дел',
    body: 'В каждом часе — одно дело на 60 мин или до 5 коротких по 12–15 мин. Нажми + в карточке часа.',
    emoji: '⏱️',
  },
  {
    title: 'Три цвета — три сферы',
    body: 'Розовый — работа. Голубой — личное и отдых. Зелёный — семья.',
    emoji: '🎨',
  },
];

export function Onboarding() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="onboarding">
      <div className="onboarding__content">
        <span className="onboarding__emoji">{current.emoji}</span>
        <h1 className="onboarding__title">{current.title}</h1>
        <p className="onboarding__body">{current.body}</p>
        <div className="onboarding__dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''}`} />
          ))}
        </div>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--ghost onboarding__skip" onClick={completeOnboarding}>
          Пропустить
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={() => setStep(step + 1)}>
            Далее
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={completeOnboarding}>
            Начать
          </button>
        )}
      </div>
    </div>
  );
}
