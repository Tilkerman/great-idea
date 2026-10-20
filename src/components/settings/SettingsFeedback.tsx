import { useState, type FormEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/useI18n';
import { sendFeedback } from '../../utils/feedbackApi';
import './Settings.css';

export function SettingsFeedback() {
  const { setScreen } = useApp();
  const { t, locale } = useI18n();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limited'>('idle');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (text.length < 10 || status === 'sending') return;

    setStatus('sending');
    try {
      await sendFeedback({
        message: text,
        contact: contact.trim(),
        locale,
      });
      setMessage('');
      setStatus('sent');
    } catch (error) {
      setStatus(error instanceof Error && error.message === 'too_many_requests' ? 'limited' : 'error');
    }
  };

  return (
    <div className="settings-page settings-feedback-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>{t('back')}</button>
        <span>{t('feedbackTitle')}</span>
        <span />
      </header>

      <form className="settings-form settings-feedback-form" onSubmit={(event) => { void onSubmit(event); }}>
        <p className="settings-feedback__lead">{t('feedbackLead')}</p>

        <label className="settings-feedback__field">
          <span>{t('feedbackMessageLabel')}</span>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (status !== 'sending') setStatus('idle');
            }}
            placeholder={t('feedbackMessagePlaceholder')}
            minLength={10}
            maxLength={4000}
            rows={8}
            required
          />
          <small>{message.length} / 4000</small>
        </label>

        <label className="settings-feedback__field">
          <span>{t('feedbackContactLabel')}</span>
          <input
            type="email"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={t('feedbackContactPlaceholder')}
            maxLength={254}
            autoComplete="email"
          />
        </label>

        <p className="settings-feedback__privacy">{t('feedbackPrivacy')}</p>

        {status === 'sent' && <p className="settings-feedback__status settings-feedback__status--ok" role="status">{t('feedbackSent')}</p>}
        {status === 'error' && <p className="settings-feedback__status settings-feedback__status--error" role="alert">{t('feedbackError')}</p>}
        {status === 'limited' && <p className="settings-feedback__status settings-feedback__status--error" role="alert">{t('feedbackLimited')}</p>}

        <button
          type="submit"
          className="btn btn--primary settings-full"
          disabled={message.trim().length < 10 || status === 'sending'}
        >
          {status === 'sending' ? t('feedbackSending') : t('feedbackSend')}
        </button>
      </form>
    </div>
  );
}
