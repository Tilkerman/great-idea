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

export function NavIcon({ name }: { name: NavIconName }) {
  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3.2v3.2M16 3.2v3.2" />
        <circle cx="8.2" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15.8" cy="11.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="8.2" cy="15.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15.2" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15.8" cy="15.2" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'growth') {
    return (
      <svg className="nav-spark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.2 4.8 10.7 10.1 16 11.6 10.7 13.1 9.2 18.4 7.7 13.1 2.4 11.6 7.7 10.1 9.2 4.8Z" />
        <path d="M18.4 2.2 19.15 4.15 21.1 4.9 19.15 5.65 18.4 7.6 17.65 5.65 15.7 4.9 17.65 4.15 18.4 2.2Z" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M10.5 3h3l.35 2.05c.5.15.95.4 1.35.7l1.9-1 2.15 2.15-1 1.9c.3.4.55.85.7 1.35L21 10.5v3l-2.05.35c-.15.5-.4.95-.7 1.35l1 1.9-2.15 2.15-1.9-1c-.4.3-.85.55-1.35.7L13.5 21h-3l-.35-2.05c-.5-.15-.95-.4-1.35-.7l-1.9 1-2.15-2.15 1-1.9c-.3-.4-.55-.85-.7-1.35L3 13.5v-3l2.05-.35c.15-.5.4-.95.7-1.35l-1-1.9L6.9 4.75l1.9 1c.4-.3.85-.55 1.35-.7L10.5 3Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.15" />
      <path d="M5.4 19.2c.9-3.5 3.3-5.2 6.6-5.2s5.7 1.7 6.6 5.2" />
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
          <span className="bottom-nav__icon bottom-nav__icon--add">
            <span
              className={`bottom-nav__plus${holdVisual || listening ? ' bottom-nav__plus--mic' : ''}${addPressed ? ' bottom-nav__plus--pressed' : ''}`}
              aria-hidden
            >
              {holdVisual || listening ? (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-1.08A7 7 0 0 0 19 11h-2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5.5v13M5.5 12h13" />
                </svg>
              )}
            </span>
          </span>
          <span className="bottom-nav__label bottom-nav__label--add-spacer" aria-hidden="true">
            {'\u00a0'}
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
