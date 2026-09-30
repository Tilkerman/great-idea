import {
  useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent,
} from 'react';
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
import { cleanTranscript, localVoiceDraftFromText } from '../../utils/voiceLocalParse';
import {
  createSpeechSession,
  speechLangForLocale,
  speechRecognitionSupported,
} from '../../utils/voiceSpeech';
import './BottomNav.css';

const TAB_IDS = ['calendar', 'growth', 'settings', 'profile'] as const;
const HOLD_MS = 420;
type NavIconName = (typeof TAB_IDS)[number];

function NavIcon({ name }: { name: NavIconName }) {
  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </svg>
    );
  }
  if (name === 'growth') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 9l2-5.5Z" />
        <path d="m18.5 3 .65 1.85L21 5.5l-1.85.65L18.5 8l-.65-1.85L16 5.5l1.85-.65L18.5 3Z" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M18 6l-1.5 1.5M7.5 16.5 6 18M18 18l-1.5-1.5M7.5 7.5 6 6" />
        <circle cx="12" cy="12" r="4.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-4 3.5-6 7.5-6s6.7 2 7.5 6" />
    </svg>
  );
}

export function BottomNav() {
  const {
    screen, setScreen, mainTab, setEditingTask, setSheetOpen,
    settings, updateSettings, tasks,
  } = useApp();
  const { api: lumi } = useLumiHost();
  const { t } = useI18n();

  const [listening, setListening] = useState(false);
  const [holdVisual, setHoldVisual] = useState(false);
  const [addPressed, setAddPressed] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [toast, setToast] = useState('');

  const holdTimer = useRef<number | null>(null);
  const voiceModeRef = useRef(false);
  const speechRef = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const pointerDownAt = useRef(0);
  const toastTimer = useRef<number | null>(null);

  const isLumiPlus = screen === 'lumi' || mainTab === 'lumi';

  useEffect(() => {
    const active = holdVisual || listening;
    document.body.classList.toggle('bottom-nav-voice-active', active);
    return () => document.body.classList.remove('bottom-nav-voice-active');
  }, [holdVisual, listening]);

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
    const raw = transcript.replace(/\s+/g, ' ').trim();
    const text = cleanTranscript(raw) || raw;
    if (!text) {
      showToast(t('voiceEmpty'));
      return;
    }
    showToast(t('voiceProcessing'));
    try {
      const parsed = settings.voiceAiEnabled
        ? await requestVoiceTaskParse(raw, settings)
        : localVoiceDraftFromText(raw, settings);
      const draft = buildTaskDraftFromVoice(parsed, raw, tasks, settings);
      setEditingTask(draft);
      setSheetOpen(true);
    } catch {
      const parsed = localVoiceDraftFromText(raw, settings);
      setEditingTask(buildTaskDraftFromVoice(parsed, raw, tasks, settings));
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
    setAddPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (isLumiPlus) return;
    e.preventDefault();
    pointerDownAt.current = Date.now();
    voiceModeRef.current = false;
    clearHoldTimer();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      startVoiceHold();
    }, HOLD_MS);
  };

  const onAddPointerUp = (e: ReactPointerEvent) => {
    setAddPressed(false);
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
    setAddPressed(false);
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
    { id: 'calendar' as const, label: t('navCalendar') },
    { id: 'growth' as const, label: t('navGrowth') },
    { id: 'settings' as const, label: t('navSettings') },
    { id: 'profile' as const, label: t('navProfile') },
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
            className={`bottom-nav__item bottom-nav__item--${tab.id} ${(tab.id === 'calendar' && screen === 'calendar') || (tab.id === 'growth' && screen === 'lumi') ? 'bottom-nav__item--active' : ''}`}
            onClick={() => onTab(tab.id)}
          >
            <span className="bottom-nav__icon"><NavIcon name={tab.id} /></span>
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
          <span
            className={`bottom-nav__plus${holdVisual || listening ? ' bottom-nav__plus--mic' : ''}${addPressed ? ' bottom-nav__plus--pressed' : ''}`}
            aria-hidden
          >
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
            className={`bottom-nav__item bottom-nav__item--${tab.id} ${tab.id === 'settings' && settingsOn ? 'bottom-nav__item--active' : ''} ${tab.id === 'profile' && profileOn ? 'bottom-nav__item--active' : ''}`}
            onClick={() => onTab(tab.id)}
          >
            <span className="bottom-nav__icon"><NavIcon name={tab.id} /></span>
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
