import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  type BeforeInstallPromptEvent,
  canWebShare,
  copyAppLink,
  isStandaloneApp,
  shareAppLink,
} from '../../utils/pwaInstall';
import './Settings.css';

export function SettingsInstall() {
  const { setScreen } = useApp();
  const isInstalled = useMemo(() => isStandaloneApp(), []);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  const showShare = canWebShare();

  const onInstall = async () => {
    if (!installPrompt) return;
    setFeedback(null);
    setInstallBusy(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setFeedback('Устанавливаем… Иконка скоро появится на главном экране.');
        setInstallPrompt(null);
      }
    } finally {
      setInstallBusy(false);
    }
  };

  const onShare = async () => {
    setFeedback(null);
    setShareBusy(true);
    try {
      const result = await shareAppLink();
      if (result === 'copied') {
        setFeedback('Ссылка скопирована — отправь её на телефон или в чат.');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      try {
        await copyAppLink();
        setFeedback('Ссылка скопирована — отправь её на телефон или в чат.');
      } catch {
        setFeedback('Не удалось поделиться. Скопируй ссылку из адресной строки Safari или Chrome.');
      }
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <button type="button" onClick={() => setScreen('settings')}>‹ Назад</button>
        <span>Установка</span>
        <span />
      </header>

      <div className="settings-form settings-install-page">
        <p className="settings-install__heading">Установить на телефон</p>
        <p className="settings-install__lead">PWA — как обычное приложение, но без App Store</p>

        <div className="settings-install__actions">
          {!isInstalled && installPrompt && (
            <button
              type="button"
              className="btn btn--primary settings-full"
              disabled={installBusy}
              onClick={() => { void onInstall(); }}
            >
              Установить на телефон
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost settings-full"
            disabled={shareBusy}
            onClick={() => { void onShare(); }}
          >
            {showShare ? 'Поделиться ссылкой' : 'Скопировать ссылку'}
          </button>
        </div>

        {feedback && <p className="settings-install__feedback" role="status">{feedback}</p>}

        {isInstalled ? (
          <p className="settings-install__text">
            TiLi уже на главном экране телефона. Данные хранятся только на этом устройстве.
          </p>
        ) : (
          <>
            <p className="settings-install__text">
              TiLi — Progressive Web App. Ставится на iPhone или Android прямо из браузера,
              работает офлайн после первой загрузки.
            </p>
            <div className="settings-install__box">
              <p className="settings-install__box-title">Работает без интернета</p>
              <p className="settings-install__text">
                Календарь и задачи хранятся на телефоне. Сеть нужна только чтобы один раз
                открыть и установить приложение.
              </p>
            </div>
            <p className="settings-install__subhead">Как установить на телефон</p>
            <ul className="settings-install__list">
              <li>
                <strong>Android:</strong> Chrome → меню (⋮) → «Установить приложение»
                или «На главный экран»
              </li>
              <li>
                <strong>iPhone:</strong> только Safari → «Поделиться» → «На экран Домой»
              </li>
            </ul>
            <p className="settings-install__text">
              После установки иконка TiLi появится на главном экране — запуск в один тап,
              как у обычного приложения. Данные никуда не отправляются.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
