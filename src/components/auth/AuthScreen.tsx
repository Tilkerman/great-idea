import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { AuthStart } from '../../types';
import {
  createAccount,
  findAccount,
  isValidEmail,
  normalizeEmail,
  resetPassword,
  sessionFromAccount,
  verifyPassword,
} from '../../utils/authLocal';
import '../settings/Settings.css';
import './AuthScreen.css';

type Step =
  | 'choice'
  | 'register-name'
  | 'register-email'
  | 'register-password'
  | 'register-done'
  | 'login-email'
  | 'login-password'
  | 'forgot-email'
  | 'forgot-password'
  | 'forgot-done';

function stepFromStart(start: AuthStart): Step {
  if (start === 'register') return 'register-name';
  if (start === 'login') return 'login-email';
  return 'choice';
}

export function AuthScreen() {
  const { session, setSession, setScreen, authStart, authBackScreen } = useApp();
  const [step, setStep] = useState<Step>(() => stepFromStart(authStart));
  const [name, setName] = useState(session.name ?? '');
  const [email, setEmail] = useState(session.email ?? '');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const backToApp = () => setScreen(authBackScreen === 'auth' ? 'calendar' : authBackScreen);

  const goBack = () => {
    setError('');
    if (step === 'choice') backToApp();
    else if (step === 'register-name') {
      if (authStart === 'register') backToApp();
      else setStep('choice');
    }
    else if (step === 'register-email') setStep('register-name');
    else if (step === 'register-password') setStep('register-email');
    else if (step === 'register-done') setScreen('calendar');
    else if (step === 'login-email') {
      if (authStart === 'login') backToApp();
      else setStep('choice');
    }
    else if (step === 'login-password') setStep('login-email');
    else if (step === 'forgot-email') setStep('login-password');
    else if (step === 'forgot-password') setStep('forgot-email');
    else if (step === 'forgot-done') setStep('login-email');
  };

  const title =
    step.startsWith('register') ? 'Регистрация'
      : step.startsWith('forgot') ? 'Пароль'
        : step.startsWith('login') ? 'Вход'
          : 'Аккаунт';

  const progress =
    step === 'register-name' ? '1 / 3'
      : step === 'register-email' ? '2 / 3'
        : step === 'register-password' ? '3 / 3'
          : '';

  async function submitRegister() {
    if (password.length < 6) {
      setError('Пароль — минимум 6 символов');
      return;
    }
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      const account = await createAccount({
        name: name.trim() || normalizeEmail(email).split('@')[0] || 'TiLi',
        email,
        password,
      });
      setSession(sessionFromAccount(account));
      setPassword('');
      setPassword2('');
      setStep('register-done');
    } catch (e) {
      setError(e instanceof Error && e.message === 'exists'
        ? 'Этот email уже есть на этом телефоне. Войдите.'
        : 'Не получилось создать аккаунт');
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin() {
    setBusy(true);
    try {
      const account = await verifyPassword(email, password);
      if (!account) {
        setError(findAccount(email)
          ? 'Неверный пароль'
          : 'Аккаунта с этим email на этом телефоне нет');
        return;
      }
      setSession(sessionFromAccount(account));
      setScreen('calendar');
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (password.length < 6) {
      setError('Пароль — минимум 6 символов');
      return;
    }
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      const ok = await resetPassword(email, password);
      if (!ok) {
        setError('Аккаунта с этим email на этом телефоне нет');
        return;
      }
      setPassword('');
      setPassword2('');
      setStep('forgot-done');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-page auth-page">
      <header className="settings-topbar">
        <button type="button" onClick={goBack}>‹ Назад</button>
        <span>{title}</span>
        <span className="auth-progress">{progress}</span>
      </header>

      <div className="settings-form auth-form">
        {step === 'choice' && (
          <>
            <p className="auth-form__intro">
              Можно пользоваться без аккаунта — всё останется на этом телефоне.
              Регистрация нужна позже для синхронизации, не для уведомлений.
            </p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => { setError(''); setStep('register-name'); }}>
              Создать аккаунт
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => { setError(''); setStep('login-email'); }}>
              У меня уже есть аккаунт
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={backToApp}>
              Продолжить без аккаунта
            </button>
          </>
        )}

        {step === 'register-name' && (
          <>
            <h2 className="auth-form__title">Как к тебе обращаться?</h2>
            <p className="auth-form__intro">Имя можно сменить в настройках в любой момент.</p>
            <label className="settings-field">
              Имя
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Алекс"
                autoComplete="name"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="btn btn--primary settings-full"
              onClick={() => {
                if (name.trim().length < 2) {
                  setError('Имя — хотя бы 2 символа');
                  return;
                }
                setError('');
                setStep('register-email');
              }}
            >
              Далее
            </button>
          </>
        )}

        {step === 'register-email' && (
          <>
            <h2 className="auth-form__title">Email</h2>
            <p className="auth-form__intro">Пока аккаунт живёт только на этом устройстве. Облака ещё нет.</p>
            <label className="settings-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="btn btn--primary settings-full"
              onClick={() => {
                if (!isValidEmail(email)) {
                  setError('Введите нормальный email');
                  return;
                }
                if (findAccount(email)) {
                  setError('Этот email уже есть. Войдите или укажите другой.');
                  return;
                }
                setError('');
                setStep('register-password');
              }}
            >
              Далее
            </button>
          </>
        )}

        {step === 'register-password' && (
          <>
            <h2 className="auth-form__title">Придумай пароль</h2>
            <p className="auth-form__intro">Минимум 6 символов. Запомни его — восстановить получится только на этом телефоне.</p>
            <PasswordFields
              password={password}
              password2={password2}
              show={showPassword}
              onPassword={setPassword}
              onPassword2={setPassword2}
              onToggle={() => setShowPassword((v) => !v)}
              autoComplete="new-password"
            />
            <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void submitRegister(); }}>
              Создать аккаунт
            </button>
          </>
        )}

        {step === 'register-done' && (
          <>
            <h2 className="auth-form__title">Готово, {session.name}</h2>
            <p className="auth-form__intro">
              Аккаунт сохранён на этом телефоне. Календарь уже работает.
              Имя, email и пароль можно сменить в настройках.
            </p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => setScreen('calendar')}>
              Открыть календарь
            </button>
          </>
        )}

        {step === 'login-email' && (
          <>
            <h2 className="auth-form__title">Вход</h2>
            <p className="auth-form__intro">Войти можно в аккаунт, который создавали на этом устройстве.</p>
            <label className="settings-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="btn btn--primary settings-full"
              onClick={() => {
                if (!isValidEmail(email)) {
                  setError('Введите нормальный email');
                  return;
                }
                setError('');
                setPassword('');
                setStep('login-password');
              }}
            >
              Далее
            </button>
            <button type="button" className="auth-form__switch" onClick={() => { setError(''); setStep('register-name'); }}>
              Нет аккаунта? Зарегистрироваться
            </button>
          </>
        )}

        {step === 'login-password' && (
          <>
            <h2 className="auth-form__title">Пароль</h2>
            <p className="auth-form__intro">{normalizeEmail(email)}</p>
            <label className="settings-field">
              Пароль
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </label>
            <button type="button" className="auth-form__switch" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            </button>
            <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void submitLogin(); }}>
              Войти
            </button>
            <button type="button" className="auth-form__switch" onClick={() => { setError(''); setPassword(''); setPassword2(''); setStep('forgot-email'); }}>
              Не помню пароль
            </button>
          </>
        )}

        {step === 'forgot-email' && (
          <>
            <h2 className="auth-form__title">Сброс пароля</h2>
            <p className="auth-form__intro">
              Письма никуда не уходят. Новый пароль можно задать, только если аккаунт уже есть на этом телефоне.
            </p>
            <label className="settings-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="btn btn--primary settings-full"
              onClick={() => {
                if (!isValidEmail(email)) {
                  setError('Введите нормальный email');
                  return;
                }
                if (!findAccount(email)) {
                  setError('Этого аккаунта на этом телефоне нет');
                  return;
                }
                setError('');
                setPassword('');
                setPassword2('');
                setStep('forgot-password');
              }}
            >
              Далее
            </button>
          </>
        )}

        {step === 'forgot-password' && (
          <>
            <h2 className="auth-form__title">Новый пароль</h2>
            <PasswordFields
              password={password}
              password2={password2}
              show={showPassword}
              onPassword={setPassword}
              onPassword2={setPassword2}
              onToggle={() => setShowPassword((v) => !v)}
              autoComplete="new-password"
            />
            <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void submitReset(); }}>
              Сохранить пароль
            </button>
          </>
        )}

        {step === 'forgot-done' && (
          <>
            <h2 className="auth-form__title">Пароль обновлён</h2>
            <p className="auth-form__intro">Теперь можно войти с новым паролем.</p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => { setPassword(''); setStep('login-password'); }}>
              Войти
            </button>
          </>
        )}

        {error && <p className="auth-form__error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function PasswordFields({
  password,
  password2,
  show,
  onPassword,
  onPassword2,
  onToggle,
  autoComplete,
}: {
  password: string;
  password2: string;
  show: boolean;
  onPassword: (v: string) => void;
  onPassword2: (v: string) => void;
  onToggle: () => void;
  autoComplete: string;
}) {
  const type = show ? 'text' : 'password';
  return (
    <>
      <label className="settings-field">
        Пароль
        <input type={type} value={password} onChange={(e) => onPassword(e.target.value)} autoComplete={autoComplete} />
      </label>
      <label className="settings-field">
        Ещё раз
        <input type={type} value={password2} onChange={(e) => onPassword2(e.target.value)} autoComplete={autoComplete} />
      </label>
      <button type="button" className="auth-form__switch" onClick={onToggle}>
        {show ? 'Скрыть пароль' : 'Показать пароль'}
      </button>
    </>
  );
}
