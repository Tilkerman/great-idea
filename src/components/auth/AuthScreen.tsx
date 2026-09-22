import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
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
  const { t } = useI18n();
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
    step.startsWith('register') ? t('authRegister')
      : step.startsWith('forgot') ? t('authPassword')
        : step.startsWith('login') ? t('authLogin')
          : t('authAccount');

  const progress =
    step === 'register-name' ? '1 / 3'
      : step === 'register-email' ? '2 / 3'
        : step === 'register-password' ? '3 / 3'
          : '';

  async function submitRegister() {
    if (password.length < 6) {
      setError(t('authPasswordMinShort'));
      return;
    }
    if (password !== password2) {
      setError(t('passwordMismatch'));
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
        ? t('authEmailTakenLogin')
        : t('authCreateFail'));
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
          ? t('authBadPassword')
          : t('authNoAccount'));
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
      setError(t('authPasswordMinShort'));
      return;
    }
    if (password !== password2) {
      setError(t('passwordMismatch'));
      return;
    }
    setBusy(true);
    try {
      const ok = await resetPassword(email, password);
      if (!ok) {
        setError(t('authNoAccount'));
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
        <button type="button" onClick={goBack}>{t('back')}</button>
        <span>{title}</span>
        <span className="auth-progress">{progress}</span>
      </header>

      <div className="settings-form auth-form">
        {step === 'choice' && (
          <>
            <p className="auth-form__intro">
              {t('authIntro')}
            </p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => { setError(''); setStep('register-name'); }}>
              {t('onbRegister')}
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={() => { setError(''); setStep('login-email'); }}>
              {t('authHaveAccount')}
            </button>
            <button type="button" className="btn btn--ghost settings-full" onClick={backToApp}>
              {t('authContinueGuest')}
            </button>
          </>
        )}

        {step === 'register-name' && (
          <>
            <h2 className="auth-form__title">{t('authHowAddress')}</h2>
            <p className="auth-form__intro">{t('authNameLater')}</p>
            <label className="settings-field">
              {t('name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('authNamePh')}
                autoComplete="name"
                autoFocus
              />
            </label>
            <button
              type="button"
              className="btn btn--primary settings-full"
              onClick={() => {
                if (name.trim().length < 2) {
                  setError(t('nameTooShort'));
                  return;
                }
                setError('');
                setStep('register-email');
              }}
            >
              {t('onbNext')}
            </button>
          </>
        )}

        {step === 'register-email' && (
          <>
            <h2 className="auth-form__title">{t('email')}</h2>
            <p className="auth-form__intro">{t('authEmailDevice')}</p>
            <label className="settings-field">
              {t('email')}
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
                  setError(t('badEmail'));
                  return;
                }
                if (findAccount(email)) {
                  setError(t('authEmailExistsOther'));
                  return;
                }
                setError('');
                setStep('register-password');
              }}
            >
              {t('onbNext')}
            </button>
          </>
        )}

        {step === 'register-password' && (
          <>
            <h2 className="auth-form__title">{t('authPickPassword')}</h2>
            <p className="auth-form__intro">{t('authPasswordHint')}</p>
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
              {t('onbRegister')}
            </button>
          </>
        )}

        {step === 'register-done' && (
          <>
            <h2 className="auth-form__title">{t('authDoneHello', { name: session.name ?? '' })}</h2>
            <p className="auth-form__intro">
              {t('authDoneBody')}
            </p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => setScreen('calendar')}>
              {t('authOpenCalendar')}
            </button>
          </>
        )}

        {step === 'login-email' && (
          <>
            <h2 className="auth-form__title">{t('authLogin')}</h2>
            <p className="auth-form__intro">{t('authLoginIntro')}</p>
            <label className="settings-field">
              {t('email')}
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
                  setError(t('badEmail'));
                  return;
                }
                setError('');
                setPassword('');
                setStep('login-password');
              }}
            >
              {t('onbNext')}
            </button>
            <button type="button" className="auth-form__switch" onClick={() => { setError(''); setStep('register-name'); }}>
              {t('authNoAccountRegister')}
            </button>
          </>
        )}

        {step === 'login-password' && (
          <>
            <h2 className="auth-form__title">{t('password')}</h2>
            <p className="auth-form__intro">{normalizeEmail(email)}</p>
            <label className="settings-field">
              {t('password')}
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </label>
            <button type="button" className="auth-form__switch" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? t('hidePassword') : t('showPassword')}
            </button>
            <button type="button" className="btn btn--primary settings-full" disabled={busy} onClick={() => { void submitLogin(); }}>
              {t('authSignIn')}
            </button>
            <button type="button" className="auth-form__switch" onClick={() => { setError(''); setPassword(''); setPassword2(''); setStep('forgot-email'); }}>
              {t('authForgot')}
            </button>
          </>
        )}

        {step === 'forgot-email' && (
          <>
            <h2 className="auth-form__title">{t('authResetTitle')}</h2>
            <p className="auth-form__intro">
              {t('authResetIntro')}
            </p>
            <label className="settings-field">
              {t('email')}
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
                  setError(t('badEmail'));
                  return;
                }
                if (!findAccount(email)) {
                  setError(t('authNoAccountOnPhone'));
                  return;
                }
                setError('');
                setPassword('');
                setPassword2('');
                setStep('forgot-password');
              }}
            >
              {t('onbNext')}
            </button>
          </>
        )}

        {step === 'forgot-password' && (
          <>
            <h2 className="auth-form__title">{t('newPassword')}</h2>
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
              {t('savePassword')}
            </button>
          </>
        )}

        {step === 'forgot-done' && (
          <>
            <h2 className="auth-form__title">{t('authPasswordUpdated')}</h2>
            <p className="auth-form__intro">{t('authPasswordUpdatedBody')}</p>
            <button type="button" className="btn btn--primary settings-full" onClick={() => { setPassword(''); setStep('login-password'); }}>
              {t('authSignIn')}
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
  const { t } = useI18n();
  const type = show ? 'text' : 'password';
  return (
    <>
      <label className="settings-field">
        {t('password')}
        <input type={type} value={password} onChange={(e) => onPassword(e.target.value)} autoComplete={autoComplete} />
      </label>
      <label className="settings-field">
        {t('authPasswordAgain')}
        <input type={type} value={password2} onChange={(e) => onPassword2(e.target.value)} autoComplete={autoComplete} />
      </label>
      <button type="button" className="auth-form__switch" onClick={onToggle}>
        {show ? t('hidePassword') : t('showPassword')}
      </button>
    </>
  );
}
