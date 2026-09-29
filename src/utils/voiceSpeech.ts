/** Браузерная диктовка (Web Speech API). Только TiLi, не отправляет текст на наш LLM. */

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );
}

function recognitionCtor(): typeof SpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function createSpeechSession(lang: string): {
  start: () => void;
  stop: () => void;
  done: Promise<string>;
} {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    return {
      start: () => {},
      stop: () => {},
      done: Promise.reject(new Error('unsupported')),
    };
  }

  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  const parts: string[] = [];
  let resolveDone: (v: string) => void;
  let rejectDone: (e: Error) => void;

  const done = new Promise<string>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  rec.onresult = (event: SpeechRecognitionEvent) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript?.trim();
      if (piece && event.results[i].isFinal) {
        parts.push(piece);
      }
    }
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') return;
    rejectDone(new Error(event.error || 'speech-error'));
  };

  rec.onend = () => {
    resolveDone(parts.join(' ').replace(/\s+/g, ' ').trim());
  };

  return {
    start: () => {
      try {
        rec.start();
      } catch {
        rejectDone(new Error('speech-start-failed'));
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        resolveDone(parts.join(' ').replace(/\s+/g, ' ').trim());
      }
    },
    done,
  };
}

export function speechLangForLocale(locale: string): string {
  if (locale === 'en') return 'en-US';
  if (locale === 'es') return 'es-ES';
  return 'ru-RU';
}
