import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  notificationPermission,
  notificationsBlockedReason,
  requestNotificationPermission,
  REMINDER_NOTICE_BODY,
  showTiliNotification,
} from '../../utils/notifications';
import { isAppleMobile, isStandaloneApp, TILI_PUBLIC_URL } from '../../utils/pwaInstall';
import { cloudPushConfigured, subscribeTiliPush } from '../../utils/webPush';
import './Settings.css';

export function SettingsNotifications() {
  const { setScreen, settings, updateSettings } = useApp();
  const [perm, setPerm] = useState(() => notificationPermission());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const blocked = useMemo(() => notificationsBlockedReason(), []);
  const ios = useMemo(() => isAppleMobile(), []);
  const installed = useMemo(() => isStandaloneApp(), []);

  const onEnable = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const next = await requestNotificationPermission();
      setPerm(next);
      if (next === 'granted') {
        updateSettings({ notificationsEnabled: true });
        const sub = await subscribeTiliPush();
        if (sub === 'ok') {
          setFeedback('Разрешение есть, ящик для писем Apple открыт. Нажми «Проверить».');
        } else if (sub === 'skipped') {
          setFeedback('Разрешение есть. Нажми «Проверить». Почтальон в Яндексе ещё не подключён — закрытое приложение пока молчит.');
        } else {
          setFeedback('Разрешение есть, но ящик Apple не открылся. Нажми «Проверить» — локальный баннер всё равно может прийти.');
        }
      } else if (next === 'denied') {
        updateSettings({ notificationsEnabled: false });
        setFeedback('Запрещено в настройках iPhone: Настройки → Уведомления → TiLi.');
      } else {
        setFeedback('Запрос закрыт без разрешения.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      if (notificationPermission() !== 'granted') {
        setFeedback('Сначала нажми «Разрешить уведомления».');
        return;
      }
      await showTiliNotification('TiLi', REMINDER_NOTICE_BODY, 'tili-test');
      setFeedback('Баннер отправлен. Если его нет — открой TiLi с Домой, не из Safari.');
    } catch {
      setFeedback('Не удалось показать уведомление.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>‹ Назад</button>
        <span>Уведомления</span>
        <span />
      </header>
      <div className="settings-form">
        <p className="settings-note">
          На iPhone баннер — только с иконки на Домой и с сайта
          {' '}{TILI_PUBLIC_URL}. Если календарь открыт, напоминание придёт само.
          Чтобы стучаться, когда приложение закрыто, нужен почтальон в Яндексе.
          {cloudPushConfigured() ? ' Он уже указан в сборке.' : ' Его ещё нет — это следующий шаг.'}
        </p>

        {ios && !installed && (
          <p className="settings-note" role="status">
            Сейчас открыто не как приложение. Добавь TiLi на Домой и зайди с иконки.
          </p>
        )}

        {blocked && perm !== 'granted' && (
          <p className="settings-note" role="status">{blocked}</p>
        )}

        <p className="settings-note">
          Статус: {perm === 'granted' ? 'разрешено' : perm === 'denied' ? 'запрещено' : perm === 'unsupported' ? 'недоступно' : 'ещё не спрашивали'}
          {settings.notificationsEnabled ? ' · напоминания по делам включены' : ''}
        </p>

        <button
          type="button"
          className="btn btn--primary settings-full"
          disabled={busy || Boolean(blocked)}
          onClick={() => { void onEnable(); }}
        >
          Разрешить уведомления
        </button>
        <button
          type="button"
          className="btn btn--ghost settings-full"
          disabled={busy || perm !== 'granted'}
          onClick={() => { void onTest(); }}
        >
          Проверить баннером
        </button>
        {feedback && <p className="settings-note" role="status">{feedback}</p>}
      </div>
    </div>
  );
}
