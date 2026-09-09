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
    body: 'Разведи пальцы — приблизить, сведи — отдалить. На неделе сразу видна вся неделя; дальше можно уйти в месяц и год. Переходы плавные.',
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
  {
    title: 'Аккаунт — по желанию',
    body: 'Календарь работает сразу, без регистрации. Задачи остаются на этом телефоне. Аккаунт можно создать сейчас или позже в настройках. Он пригодится, когда появится синхронизация между устройствами — не для пушей, их пока нет.',
    emoji: '🔓',
  },
];

export function Onboarding() {
  const { completeOnboarding, openAuth } = useApp();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const skipToAccount = () => {
    if (!last) setStep(STEPS.length - 1);
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
            Уже есть аккаунт? Войти
          </button>
        )}
        <div className="onboarding__dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding__dot ${i === step ? 'onboarding__dot--active' : ''}`} />
          ))}
        </div>
      </div>
      <div className="onboarding__actions">
        <button type="button" className="btn btn--ghost onboarding__skip" onClick={skipToAccount}>
          {last ? 'Без аккаунта' : 'Пропустить'}
        </button>
        {last ? (
          <button type="button" className="btn btn--primary" onClick={() => openAuth('register', 'calendar')}>
            Создать аккаунт
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setStep(step + 1)}>
            Далее
          </button>
        )}
      </div>
    </div>
  );
}
