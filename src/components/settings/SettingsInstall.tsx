import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  type BeforeInstallPromptEvent,
  canWebShare,
  copyAppLink,
  isAppleMobile,
  isStandaloneApp,
  shareAppLink,
  trackInstallButtonClick,
  TILI_PUBLIC_URL,
} from '../../utils/pwaInstall';
import './Settings.css';

function InstallGuide({ ios }: { ios: boolean }) {
  if (ios) {
    return (
      <ol className="settings-install__steps">
        <li>Открой <strong>Safari</strong> (на iPhone установка только через него).</li>
        <li>Перейди на <strong>{TILI_PUBLIC_URL}</strong></li>
        <li>Нажми кнопку <strong>«Поделиться»</strong> (квадрат со стрелкой вниз).</li>
        <li>Выбери <strong>«На экран Домой»</strong>.</li>
        <li>Нажми <strong>«Добавить»</strong> — иконка TiLi появится на главном экране.</li>
      </ol>
    );
  }

  return (
    <ol className="settings-install__steps">
      <li>Открой <strong>Chrome</strong> на Android.</li>
      <li>Перейди на <strong>{TILI_PUBLIC_URL}</strong></li>
      <li>Нажми меню <strong>(⋮)</strong> справа вверху.</li>
      <li>Выбери <strong>«Установить приложение»</strong> или <strong>«На главный экран»</strong>.</li>
      <li>Подтверди — иконка TiLi появится рядом с другими приложениями.</li>
    </ol>
  );
}

export function SettingsInstall() {
  const { setScreen } = useApp();
  const isInstalled = useMemo(() => isStandaloneApp(), []);
  const isIos = useMemo(() => isAppleMobile(), []);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installBusy, setInstallBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const guideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  useEffect(() => {
    if (showGuide) {
      guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showGuide]);

  const showShare = canWebShare();

  const onInstall = async () => {
    trackInstallButtonClick();
    setFeedback(null);

    if (installPrompt) {
      setInstallBusy(true);
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          setFeedback('Устанавливаем… Иконка скоро появится на главном экране.');
          setInstallPrompt(null);
          setShowGuide(false);
        } else {
          setShowGuide(true);
        }
      } finally {
        setInstallBusy(false);
      }
      return;
    }

    setShowGuide(true);
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
          {!isInstalled && (
            <button
              type="button"
              className="btn btn--primary settings-full"
              disabled={installBusy}
              data-track="install-button-click"
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

        {showGuide && !isInstalled && (
          <div ref={guideRef} className="settings-install__guide" role="region" aria-label="Как установить">
            <p className="settings-install__guide-title">
              {isIos ? 'Установка на iPhone' : 'Установка на Android'}
            </p>
            <InstallGuide ios={isIos} />
            <p className="settings-install__text">
              После этого открывай TiLi с главного экрана — так работает офлайн и быстрее запуск.
            </p>
          </div>
        )}

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
            {!showGuide && (
              <>
                <p className="settings-install__subhead">Кратко</p>
                <ul className="settings-install__list">
                  <li>
                    <strong>Android:</strong> Chrome → меню (⋮) → «Установить приложение»
                  </li>
                  <li>
                    <strong>iPhone:</strong> Safari → «Поделиться» → «На экран Домой»
                  </li>
                </ul>
              </>
            )}
            <p className="settings-install__text">
              Нажми «Установить на телефон» — откроется подробная инструкция или системное окно
              установки.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
