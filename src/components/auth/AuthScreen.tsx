import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import '../settings/Settings.css';
import './AuthScreen.css';

export function AuthScreen() {
  const { setScreen, setSession } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      alert('Email и пароль (мин. 6 символов) обязательны');
      return;
    }
    setSession({
      isGuest: false,
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
    });
    setScreen('calendar');
  };

  return (
    <div className="settings-page auth-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('calendar')}>‹ Назад</button>
        <span>{mode === 'register' ? 'Регистрация' : 'Вход'}</span>
        <span />
      </header>
      <form className="settings-form auth-form" onSubmit={submit}>
        <p className="auth-form__intro">
          {mode === 'register'
            ? 'Создай аккаунт для синхронизации (скоро). Пока данные хранятся локально.'
            : 'Войди в аккаунт TiLi'}
        </p>
        {mode === 'register' && (
          <label className="settings-field">
            Имя
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к тебе обращаться" />
          </label>
        )}
        <label className="settings-field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="settings-field">
          Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <button type="submit" className="btn btn--primary settings-full">
          {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
        </button>
        <button type="button" className="btn btn--ghost settings-full" onClick={() => setScreen('calendar')}>
          Продолжить без аккаунта
        </button>
        <button
          type="button"
          className="auth-form__switch"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        >
          {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}
