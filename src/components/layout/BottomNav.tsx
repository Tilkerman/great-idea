import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { createInboxDraft } from '../../utils/hourSlot';
import { useI18n } from '../../i18n/useI18n';
import { useLumiHost } from '../../lumi/LumiHost';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  buildTaskDraftFromVoice,
  requestVoiceTaskParse,
  voiceParseConfigured,
} from '../../utils/voiceTaskParse';
import {
  createSpeechSession,
  speechLangForLocale,
  speechRecognitionSupported,
} from '../../utils/voiceSpeech';
import './BottomNav.css';

const TAB_IDS = ['calendar', 'growth', 'settings', 'profile'] as const;
const HOLD_MS = 420;

export function BottomNav() {
  const {
    screen, setScreen, mainTab, setEditingTask, setSheetOpen,
    settings, updateSettings, tasks,
  } = useApp();
  const { api: lumi } = useLumiHost();
  const { t } = useI18n();

  const [listening, setListening] = useState(false);
  const [holdVisual, setHoldVisual] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [toast, setToast] = useState('');

  const holdTimer = useRef<number | null>(null);
  const voiceModeRef = useRef(false);
  const speechRef = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const pointerDownAt = useRef(0);
  const toastTimer = useRef<number | null>(null);

  const isLumiPlus = screen === 'lumi' || mainTab === 'lumi';

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const openNew = () => {
    if (isLumiPlus) {
      if (screen !== 'lumi') setScreen('lumi');
      lumi?.createWish();
      return;
    }
    setEditingTask(createInboxDraft());
    setSheetOpen(true);
  };

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const stopSpeech = () => {
    speechRef.current?.stop();
    speechRef.current = null;
    setListening(false);
    setHoldVisual(false);
  };

  const finishVoice = useCallback(async (transcript: string) => {
    const text = transcript.trim();
    if (!text) {
      showToast(t('voiceEmpty'));
      return;
    }
    if (!settings.voiceAiEnabled) {
      setEditingTask({ ...createInboxDraft(), title: text.slice(0, 120), description: text });
      setSheetOpen(true);
      return;
    }
    showToast(t('voiceProcessing'));
    try {
      const parsed = await requestVoiceTaskParse(text, settings);
      const draft = buildTaskDraftFromVoice(parsed, text, tasks, settings);
      setEditingTask(draft);
      setSheetOpen(true);
    } catch {
      setEditingTask({ ...createInboxDraft(), title: text.slice(0, 120), description: text });
      setSheetOpen(true);
      showToast(t('voiceParseFallback'));
    }
  }, [settings, tasks, setEditingTask, setSheetOpen, t]);

  const startVoiceHold = () => {
    if (isLumiPlus) return;
    if (!speechRecognitionSupported()) {
      showToast(t('voiceUnsupported'));
      return;
    }
    if (!settings.voiceAiEnabled && !voiceParseConfigured()) {
      openNew();
      return;
    }
    if (!settings.voiceAiEnabled) {
      setConsentOpen(true);
      return;
    }

    voiceModeRef.current = true;
    setHoldVisual(true);
    setListening(true);

    const session = createSpeechSession(speechLangForLocale(settings.locale));
    speechRef.current = session;
    session.start();
  };

  const onAddPointerDown = (e: ReactPointerEvent) => {
    if (isLumiPlus) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDownAt.current = Date.now();
    voiceModeRef.current = false;
    clearHoldTimer();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      startVoiceHold();
    }, HOLD_MS);
  };

  const onAddPointerUp = (e: ReactPointerEvent) => {
    if (isLumiPlus) return;
    clearHoldTimer();
    const wasVoice = voiceModeRef.current;
    voiceModeRef.current = false;

    if (wasVoice && speechRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const session = speechRef.current;
      session.stop();
      setListening(false);
      setHoldVisual(false);
      void session.done.then(finishVoice).catch(() => {
        showToast(t('voiceError'));
      });
      speechRef.current = null;
      return;
    }

    if (Date.now() - pointerDownAt.current < HOLD_MS + 50) {
      openNew();
    }
  };

  const onAddPointerCancel = () => {
    clearHoldTimer();
    stopSpeech();
    voiceModeRef.current = false;
  };

  const enableVoiceAi = () => {
    setConsentOpen(false);
    void updateSettings({ voiceAiEnabled: true }).then(() => {
      showToast(t('voiceEnabledHint'));
    });
  };

  const tabs = [
    { id: 'calendar' as const, label: t('navCalendar'), icon: '📅' },
    { id: 'growth' as const, label: t('navGrowth'), icon: '✨' },
    { id: 'settings' as const, label: t('navSettings'), icon: '⚙️' },
    { id: 'profile' as const, label: t('navProfile'), icon: '👤' },
  ];

  const onTab = (id: (typeof TAB_IDS)[number]) => {
    if (id === 'calendar') setScreen('calendar');
    else if (id === 'growth') {
      setScreen('lumi');
      lumi?.goWheel();
    } else if (id === 'settings') setScreen('settings');
    else if (id === 'profile') setScreen('settings-profile');
  };

  const settingsOn = screen.startsWith('settings') && screen !== 'settings-profile';
  const profileOn = screen === 'settings-profile' || screen === 'settings-password';

  return (
    <>
      {listening && (
        <div className="bottom-nav-voice-hint" role="status">
          {t('voiceHoldSpeak')}
        </div>
      )}
      {toast && <div className="bottom-nav-toast">{toast}</div>}
      <nav className="bottom-nav">
        {tabs.slice(0, 2).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`bottom-nav__item ${(tab.id === 'calendar' && screen === 'calendar') || (tab.id === 'growth' && screen === 'lumi') ? 'bottom-nav__item--active' : ''}`}
            onClick={() => onTab(tab.id)}
          >
            <span className="bottom-nav__icon">{tab.icon}</span>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`bottom-nav__item bottom-nav__item--add${holdVisual || listening ? ' bottom-nav__item--add-voice' : ''}`}
          aria-label={isLumiPlus ? t('navNewWish') : t('navNewTaskHoldHint')}
          onClick={isLumiPlus ? openNew : undefined}
          onPointerDown={onAddPointerDown}
          onPointerUp={onAddPointerUp}
          onPointerCancel={onAddPointerCancel}
        >
          <span className={`bottom-nav__plus${holdVisual || listening ? ' bottom-nav__plus--mic' : ''}`} aria-hidden>
            {holdVisual || listening ? (
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-1.08A7 7 0 0 0 19 11h-2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </span>
        </button>
        {tabs.slice(2).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`bottom-nav__item ${tab.id === 'settings' && settingsOn ? 'bottom-nav__item--active' : ''} ${tab.id === 'profile' && profileOn ? 'bottom-nav__item--active' : ''}`}
            onClick={() => onTab(tab.id)}
          >
            <span className="bottom-nav__icon">{tab.icon}</span>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        ))}
      </nav>
      {consentOpen && (
        <ConfirmDialog
          title={t('voiceConsentTitle')}
          message={t('voiceConsentBody')}
          confirmLabel={t('voiceConsentAllow')}
          cancelLabel={t('cancel')}
          onCancel={() => setConsentOpen(false)}
          onConfirm={enableVoiceAi}
        />
      )}
    </>
  );
}
