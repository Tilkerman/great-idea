(function () {
  const STORAGE_LANG = 'tili-landing-lang';
  const UTM_KEY = 'tili-attribution-utm';
  const CANONICAL = 'https://tili.su/';
  function appBase() {
    const host = (location.hostname || '').toLowerCase();
    if (host === 'tili.su' || host === 'www.tili.su') return '/app/';
    return '/';
  }
  const BASE = appBase();

  const copy = {
    ru: {
      pageTitle: 'TiLi — календарь твоего времени',
      metaDescription: 'TiLi — календарь твоего времени. Lumi — желания. День как сетка часов, не список дел.',
      skipMain: 'К содержанию',
      brandTag: 'календарь твоего времени',
      navTili: 'TiLi',
      navLumi: 'Lumi',
      navPhilosophy: 'Философия',
      ctaTry: 'Попробовать',
      ctaTryFree: 'Попробовать TiLi',
      ctaLumi: 'Узнать про Lumi ↓',
      heroL1: 'У тебя есть время.',
      heroL2: 'Используй его по-настоящему.',
      heroEyebrow: 'TiLi',
      heroH1: 'Время по часам.',
      heroH2: 'Желания по шагам.',
      heroLead: 'TiLi — календарь твоего времени.\nLumi — календарь твоих желаний.\nОдна система не даёт дню пройти бесследно, другая — не даёт желанию остаться просто мечтой.',
      heroOpen: 'Открыть TiLi',
      heroMore: 'Узнать о Lumi',
      trust1: 'Работает в браузере',
      trust2: 'Без сложной регистрации',
      trust3: 'Можно на экран «Домой»',
      trust4: 'Данные на вашем устройстве',
      phDay: '[ REAL SCREENSHOT: TiLi Day View ]',
      phWeek: '[ REAL SCREENSHOT: TiLi Week View ]',
      phMonth: '[ REAL SCREENSHOT: TiLi Month/Year ]',
      phLumi: '[ REAL SCREENSHOT: Lumi ]',
      capDay: 'Сегодня, час за часом',
      capHeroTili: 'TiLi',
      capHeroLumi: 'Lumi',
      capWeek: 'Неделя целиком',
      capMonth: 'Месяц',
      altMonth: 'Вид месяца в TiLi',
      altWeek: 'Вид недели в TiLi',
      altDay: 'Текущий день с индикатором времени в TiLi',
      shotsAria: 'Месяц, неделя целиком, сегодня',
      capLumi: 'Реальный экран Lumi',
      tiliH: 'TiLi — календарь твоего времени',
      tiliSub: 'TiLi показывает не то, что тебе нужно сделать. Он показывает, когда в твоём дне это действительно произойдёт.',
      tiliP1: 'Обычный список задач говорит: «У тебя 8 дел». TiLi показывает другое: «Вот как выглядит твой сегодняшний день».',
      tiliP2: 'Каждое дело получает своё место во времени. День — часовая сетка: занятые часы, свободное пространство, куда уходит день.',
      m1t: 'Время', m1d: 'Каждая задача встаёт на своё место в течение дня — не абстрактный пункт списка, а конкретный час.',
      m2t: 'Свободное время', m2d: 'Пустое пространство в сетке — тоже часть дня.',
      m3t: 'Несколько уровней', m3d: 'Год → месяц → неделя → день.',
      m4t: 'Быстрое планирование', m4d: 'Создать задачу из нужного часа.',
      m5t: 'Напоминания вовремя', m5d: 'Напоминание придёт, даже если приложение закрыто. Включи уведомления один раз в настройках — и больше не думай об этом.',
      m6t: 'Категории', m6d: 'Работа, личное, семья — структура дня.',
      tiliQuote: 'Не список дел.\nСетка твоего времени.',
      lumiH: 'Lumi — календарь твоих желаний',
      lumiSub: 'Помогает не забывать о том, что действительно важно. Записывай желания, разбивай их на маленькие шаги и двигайся к мечте шаг за шагом.',
      lumiFe1: 'Желания и цели',
      lumiFe2: 'Маленькие шаги',
      lumiFe3: 'Чувства и состояния',
      lumiFe4: 'Отслеживание прогресса',
      lumiFe5: 'Напоминания и поддержка',
      lumiFe6: 'Визуализация и вдохновение',
      bookKicker: 'Вдохновлено книгой',
      bookName: '«СЧАСТЛИВЫЙ КАРМАН, ПОЛНЫЙ ДЕНЕГ»',
      bookNameShort: 'СЧАСТЛИВЫЙ КАРМАН, ПОЛНЫЙ ДЕНЕГ',
      bookAuthor: 'David Cameron Gikandi',
      bookBody: 'Идея автора: записать желание — первый шаг к его исполнению. Lumi помогает хранить образ, чувства и маленькие шаги в одном месте.',
      bookCta: 'Узнать больше о книге',
      lumiStepsQuote: 'Маленькие\u00a0шаги\nк большим\nизменениям',
      philH: 'Время и желания — рядом,\nно каждое на своём месте.',
      philTime: 'Время',
      philWish: 'Желания',
      philTogether: 'Вместе',
      philT1: 'Что я делаю?', philT2: 'Когда я это делаю?', philT3: 'Сколько времени у меня есть?',
      philL1: 'Чего я хочу?', philL2: 'Почему это важно?', philL3: 'Что я чувствую?', philL4: 'Какой маленький шаг могу сделать?',
      philChain: 'Желание → шаг → время → действие',
      bridgeH: 'Как Lumi и TiLi связаны',
      step1: 'У меня есть желание.', step2: 'Я записываю его в Lumi.', step3: 'Разбиваю на маленький шаг.',
      step4: 'Если шаг требует времени — отправляю его в TiLi.', step5: 'TiLi показывает, когда я это сделаю.',
      bridgeP: 'Lumi хранит то, чего ты хочешь. TiLi помогает найти для этого место в реальном времени.',
      flowWish: 'Желание', flowStep: 'Маленький шаг', flowTime: 'Реальное время', flowDo: 'Действие',
      ctaEyebrow: 'У тебя уже есть время.',
      ctaH: 'Вопрос только в том,\nна что ты его потратишь.',
      ctaFine: 'Работает в браузере. Без сложной регистрации.',
      footProd: 'Продукт', footAbout: 'О проекте', footDocs: 'Документы', footPrivacy: 'Конфиденциальность',
      footData: 'Без облачного sync задач. Резерв — JSON в настройках.',
    },
    en: {
      pageTitle: 'TiLi — a calendar for your time',
      metaDescription: 'TiLi shows your day as hours, not an endless list. Lumi holds your wishes. One calm PWA.',
      skipMain: 'Skip to content',
      brandTag: 'calendar for your time',
      navTili: 'TiLi', navLumi: 'Lumi', navPhilosophy: 'Philosophy',
      ctaTry: 'Try it', ctaTryFree: 'Try TiLi', ctaLumi: 'About Lumi ↓',
      heroL1: 'You have time.', heroL2: 'Use it for real.',
      heroEyebrow: 'TiLi',
      heroH1: 'Time by the hour.',
      heroH2: 'Wishes, step by step.',
      heroLead: 'TiLi is the calendar of your time.\nLumi is the calendar of your wishes.\nOne system keeps the day from passing unnoticed, the other keeps a wish from remaining just a dream.',
      heroOpen: 'Open TiLi',
      heroMore: 'Learn about Lumi',
      trust1: 'Works in the browser', trust2: 'No heavy sign-up', trust3: 'Add to home screen', trust4: 'Data stays on your device',
      phDay: '[ REAL SCREENSHOT: TiLi Day View ]', phWeek: '[ REAL SCREENSHOT: TiLi Week View ]',
      phMonth: '[ REAL SCREENSHOT: TiLi Month/Year ]', phLumi: '[ REAL SCREENSHOT: Lumi ]',
      capDay: 'Today, hour by hour', capHeroTili: 'TiLi', capHeroLumi: 'Lumi',
      capWeek: 'Full week', capMonth: 'Month', capLumi: 'Real Lumi screen',
      altMonth: 'Month view in TiLi',
      altWeek: 'Week view in TiLi',
      altDay: 'Current day with the time indicator in TiLi',
      shotsAria: 'Month, full week, today',
      tiliH: 'TiLi — a calendar for your time',
      tiliSub: 'TiLi doesn’t show what you need to do. It shows when in your day it will actually happen.',
      tiliP1: 'A usual list says: “You have 8 tasks.” TiLi says: “This is what your day looks like.”',
      tiliP2: 'Every task gets a place in time. The day is an hour grid — busy hours, open space, where your time goes.',
      m1t: 'Time', m1d: 'Each task takes its place in the day — not an abstract list item, but a specific hour.',
      m2t: 'Open time', m2d: 'Empty space in the grid is part of the day too.',
      m3t: 'Many zoom levels', m3d: 'Year → month → week → day.',
      m4t: 'Quick planning', m4d: 'Create a task from the hour you need.',
      m5t: 'Reminders on time', m5d: 'A reminder arrives even if the app is closed. Turn notifications on once in settings — and don’t think about it again.',
      m6t: 'Categories', m6d: 'Work, personal, family — structure of the day.',
      tiliQuote: 'Not a to-do list.\nA grid of your time.',
      lumiH: 'Lumi — a calendar of your wishes',
      lumiSub: 'Helps you remember what truly matters. Capture wishes, break them into small steps, and move toward your dream one step at a time.',
      lumiFe1: 'Wishes and goals',
      lumiFe2: 'Small steps',
      lumiFe3: 'Feelings and states',
      lumiFe4: 'Progress tracking',
      lumiFe5: 'Reminders and support',
      lumiFe6: 'Visualization and inspiration',
      bookKicker: 'Inspired by the book',
      bookName: '“A HAPPY POCKET FULL OF MONEY”',
      bookNameShort: 'A HAPPY POCKET',
      bookAuthor: 'David Cameron Gikandi',
      bookBody: 'The author’s idea: writing a wish down is the first step toward making it real. Lumi holds the image, feelings, and small steps in one place.',
      bookCta: 'Learn more about the book',
      lumiStepsQuote: 'Small steps\ntoward\u00a0big\nchanges',
      philH: 'Time and wishes — side by side,\neach in its place.',
      philTime: 'Time', philWish: 'Wishes', philTogether: 'Together',
      philT1: 'What am I doing?', philT2: 'When am I doing it?', philT3: 'How much time do I have?',
      philL1: 'What do I want?', philL2: 'Why does it matter?', philL3: 'What do I feel?', philL4: 'What small step can I take?',
      philChain: 'Wish → step → time → action',
      bridgeH: 'How Lumi and TiLi connect',
      step1: 'I have a wish.', step2: 'I write it in Lumi.', step3: 'I break it into a small step.',
      step4: 'If the step needs a time — I send it to TiLi.', step5: 'TiLi shows when I will do it.',
      bridgeP: 'Lumi holds what you want. TiLi finds a place for it in real time.',
      flowWish: 'Wish', flowStep: 'Small step', flowTime: 'Real time', flowDo: 'Action',
      ctaEyebrow: 'You already have time.',
      ctaH: 'The question is\nwhat you will spend it on.',
      ctaFine: 'Works in the browser. No heavy sign-up.',
      footProd: 'Product', footAbout: 'About', footDocs: 'Legal', footPrivacy: 'Privacy',
      footData: 'No cloud task sync. Backup via JSON in settings.',
    },
    es: {
      pageTitle: 'TiLi — calendario de tu tiempo',
      metaDescription: 'TiLi muestra el día por horas, no como lista infinita. Lumi guarda tus deseos. Una PWA tranquila.',
      skipMain: 'Ir al contenido',
      brandTag: 'calendario de tu tiempo',
      navTili: 'TiLi', navLumi: 'Lumi', navPhilosophy: 'Filosofía',
      ctaTry: 'Probar', ctaTryFree: 'Probar TiLi', ctaLumi: 'Sobre Lumi ↓',
      heroL1: 'Tienes tiempo.', heroL2: 'Úsalo de verdad.',
      heroEyebrow: 'TiLi',
      heroH1: 'Tiempo por horas.',
      heroH2: 'Deseos por pasos.',
      heroLead: 'TiLi es el calendario de tu tiempo.\nLumi es el calendario de tus deseos.\nUn sistema no deja que el día pase sin dejar rastro, el otro no deja que un deseo se quede en un simple sueño.',
      heroOpen: 'Abrir TiLi',
      heroMore: 'Saber más de Lumi',
      trust1: 'En el navegador', trust2: 'Sin registro pesado', trust3: 'Añadir a inicio', trust4: 'Datos en tu dispositivo',
      phDay: '[ CAPTURA REAL: TiLi día ]', phWeek: '[ CAPTURA REAL: TiLi semana ]',
      phMonth: '[ CAPTURA REAL: TiLi mes/año ]', phLumi: '[ CAPTURA REAL: Lumi ]',
      capDay: 'Hoy, hora a hora', capHeroTili: 'TiLi', capHeroLumi: 'Lumi',
      capWeek: 'Semana completa', capMonth: 'Mes', capLumi: 'Pantalla Lumi',
      altMonth: 'Vista de mes en TiLi',
      altWeek: 'Vista de semana en TiLi',
      altDay: 'Día actual con el indicador de hora en TiLi',
      shotsAria: 'Mes, semana completa, hoy',
      tiliH: 'TiLi — calendario de tu tiempo',
      tiliSub: 'TiLi no muestra lo que tienes que hacer. Muestra cuándo ocurrirá de verdad en tu día.',
      tiliP1: 'Una lista dice: «Tienes 8 tareas». TiLi dice: «Así se ve tu día».',
      tiliP2: 'Cada cosa tiene su lugar en el tiempo. El día es una cuadrícula de horas.',
      m1t: 'Tiempo', m1d: 'Cada tarea ocupa su lugar en el día: no un punto abstracto de la lista, sino una hora concreta.',
      m2t: 'Tiempo libre', m2d: 'El espacio vacío de la cuadrícula también es parte del día.',
      m3t: 'Varias escalas', m3d: 'Año → mes → semana → día.',
      m4t: 'Plan rápido', m4d: 'Crear desde la hora que necesitas.',
      m5t: 'Recordatorios a tiempo', m5d: 'El recordatorio llega aunque la app esté cerrada. Activa las notificaciones una vez en ajustes y no vuelvas a pensarlo.',
      m6t: 'Categorías', m6d: 'Trabajo, personal, familia.',
      tiliQuote: 'No es una lista.\nEs la cuadrícula de tu tiempo.',
      lumiH: 'Lumi — calendario de tus deseos',
      lumiSub: 'Te ayuda a no olvidar lo importante. Anota deseos, divídelos en pasos pequeños y avanza hacia tu sueño paso a paso.',
      lumiFe1: 'Deseos y metas',
      lumiFe2: 'Pasos pequeños',
      lumiFe3: 'Sentimientos y estados',
      lumiFe4: 'Seguimiento del progreso',
      lumiFe5: 'Recordatorios y apoyo',
      lumiFe6: 'Visualización e inspiración',
      bookKicker: 'Inspirado en el libro',
      bookName: '«A HAPPY POCKET FULL OF MONEY»',
      bookNameShort: 'HAPPY POCKET',
      bookAuthor: 'David Cameron Gikandi',
      bookBody: 'La idea del autor: escribir un deseo es el primer paso para cumplirlo. Lumi guarda imagen, sentimientos y pasos en un solo lugar.',
      bookCta: 'Saber más del libro',
      lumiStepsQuote: 'Pequeños pasos\na\u00a0grandes\ncambios',
      philH: 'Tiempo y deseos — juntos,\ncada uno en su lugar.',
      philTime: 'Tiempo', philWish: 'Deseos', philTogether: 'Juntos',
      philT1: '¿Qué hago?', philT2: '¿Cuándo?', philT3: '¿Cuánto tiempo tengo?',
      philL1: '¿Qué quiero?', philL2: '¿Por qué importa?', philL3: '¿Qué siento?', philL4: '¿Qué paso pequeño puedo dar?',
      philChain: 'Deseo → paso → tiempo → acción',
      bridgeH: 'Cómo se conectan Lumi y TiLi',
      step1: 'Tengo un deseo.', step2: 'Lo escribo en Lumi.', step3: 'Lo divido en un paso pequeño.',
      step4: 'Si el paso necesita hora — lo envío a TiLi.', step5: 'TiLi muestra cuándo lo haré.',
      bridgeP: 'Lumi guarda lo que quieres. TiLi encuentra lugar en el tiempo real.',
      flowWish: 'Deseo', flowStep: 'Paso pequeño', flowTime: 'Tiempo real', flowDo: 'Acción',
      ctaEyebrow: 'Ya tienes tiempo.',
      ctaH: 'La pregunta es\nen qué lo gastarás.',
      ctaFine: 'En el navegador. Sin registro pesado.',
      footProd: 'Producto', footAbout: 'Proyecto', footDocs: 'Documentos', footPrivacy: 'Privacidad',
      footData: 'Sin sync en la nube. Copia JSON en ajustes.',
    },
  };

  function persistUtm() {
    try {
      const p = new URLSearchParams(window.location.search);
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
      const bag = {};
      let any = false;
      keys.forEach((k) => {
        const v = p.get(k)?.trim();
        if (v) { bag[k] = v; any = true; }
      });
      if (any) localStorage.setItem(UTM_KEY, JSON.stringify(bag));
    } catch (_) {}
  }

  function appUrl(lang) {
    const params = new URLSearchParams();
    params.set('lang', lang);
    params.set('theme', 'light');
    try {
      const utm = JSON.parse(localStorage.getItem(UTM_KEY) || '{}');
      Object.entries(utm).forEach(([k, v]) => { if (v) params.set(k, v); });
    } catch (_) {}
    const q = params.toString();
    return BASE + (q ? '?' + q : '');
  }

  const LANG_FLAGS = { ru: '🇷🇺', en: '🇬🇧', es: '🇪🇸' };

  /** Реальные скрины приложения: EN — только английский UI; RU/ES — те же EN (по решению продукта). */
  const SCREENSHOTS = {
    en: {
      day: './screens/en/tili-day.png',
      week: './screens/en/tili-week.png',
      month: './screens/en/tili-month.png',
      lumi: './screens/en/lumi-wish.png',
      lumiHero: './screens/en/lumi-hero.png',
    },
    ru: {
      day: './screens/ru/tili-day.png',
      week: './screens/ru/tili-week.png',
      month: './screens/ru/tili-month.png',
      lumi: './screens/en/lumi-wish.png',
      lumiHero: './screens/en/lumi-hero.png',
    },
    es: {
      day: './screens/es/tili-day.png',
      week: './screens/es/tili-week.png',
      month: './screens/es/tili-month.png',
      lumi: './screens/en/lumi-wish.png',
      lumiHero: './screens/en/lumi-hero.png',
    },
  };

  let currentLang = 'ru';

  function applyScreenshots(lang) {
    const set = SCREENSHOTS[lang] || SCREENSHOTS.en;
    document.querySelectorAll('.shot__img[data-shot]').forEach((img) => {
      const key = img.getAttribute('data-shot');
      const src = key && set[key];
      if (!src) return;
      const webp = src.replace(/\.png(\?.*)?$/, '.webp$1');
      const picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
      const source = picture ? picture.querySelector('source') : null;
      if (source) source.setAttribute('srcset', webp);
      if (img.getAttribute('src') === src) return;
      img.setAttribute('src', src);
      const wrap = img.closest('[data-shot-wrap], [data-real-screen]');
      if (wrap) wrap.classList.add('is-missing');
      img.addEventListener('load', () => {
        if (wrap && img.naturalWidth > 0) wrap.classList.remove('is-missing');
      }, { once: true });
      img.addEventListener('error', () => {
        if (wrap) wrap.classList.add('is-missing');
      }, { once: true });
    });
  }

  function applyLang(lang) {
    const strings = copy[lang] || copy.ru;
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = strings.pageTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', strings.metaDescription);
    const ogT = document.getElementById('og-title');
    const ogD = document.getElementById('og-desc');
    if (ogT) ogT.setAttribute('content', strings.pageTitle);
    if (ogD) ogD.setAttribute('content', strings.metaDescription);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!strings[key]) return;
      const val = strings[key];
      if (val.indexOf('\n') >= 0 && el.tagName !== 'INPUT') {
        el.innerHTML = val.replace(/\n/g, '<br>');
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.getAttribute('data-i18n-alt');
      if (strings[key]) el.setAttribute('alt', strings[key]);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (strings[key]) el.setAttribute('aria-label', strings[key]);
    });

    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = lang;
    const langFlag = document.getElementById('lang-flag');
    if (langFlag) langFlag.textContent = LANG_FLAGS[lang] || LANG_FLAGS.ru;

    document.querySelectorAll('.js-app-open').forEach((a) => {
      a.setAttribute('href', appUrl(lang));
    });

    try { localStorage.setItem(STORAGE_LANG, lang); } catch (_) {}
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('lang', lang);
      window.history.replaceState({}, '', u.pathname + u.search);
    } catch (_) {}

    applyScreenshots(lang);
  }

  function detectLang() {
    try {
      const q = new URLSearchParams(window.location.search).get('lang');
      if (q && copy[q]) return q;
    } catch (_) {}
    try {
      const saved = localStorage.getItem(STORAGE_LANG);
      if (saved && copy[saved]) return saved;
    } catch (_) {}
    const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return copy[nav] ? nav : 'ru';
  }

  function initShots() {
    document.querySelectorAll('[data-shot-wrap], [data-real-screen]').forEach((wrap) => {
      const img = wrap.querySelector('.shot__img');
      if (!img) return;
      function check() {
        if (img.naturalWidth > 0) {
          wrap.classList.remove('is-missing');
          return;
        }
        /* lazy: пока не complete — не прятать img (иначе lazy не стартует) */
        if (img.complete) wrap.classList.add('is-missing');
      }
      img.addEventListener('error', () => wrap.classList.add('is-missing'));
      img.addEventListener('load', check);
      check();
    });
  }

  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
  }

  const sectionSent = {};
  function initSectionAnalytics() {
    const map = { tili: 'tili_section_view', lumi: 'lumi_section_view', philosophy: 'philosophy_section_view' };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.getAttribute('data-analytics-section');
        const ev = map[id];
        if (!ev || sectionSent[id]) return;
        sectionSent[id] = true;
        window.TiliLandingAnalytics?.capture(ev, { locale: currentLang });
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('[data-analytics-section]').forEach((el) => obs.observe(el));
  }

  function initCta() {
    document.querySelectorAll('.js-app-open').forEach((el) => {
      el.addEventListener('click', () => {
        window.TiliLandingAnalytics?.capture('pwa_open', { locale: currentLang, from: el.classList.contains('js-hero-cta') ? 'hero' : 'other' });
      });
    });
    const hero = document.querySelector('.js-hero-cta');
    if (hero) {
      hero.addEventListener('click', () => {
        window.TiliLandingAnalytics?.capture('hero_cta_click', { locale: currentLang });
      });
    }
  }

  function initMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-mobile');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initTiliCarousel() {
    const scroller = document.querySelector('#tili .shots-showcase--aside');
    const dots = document.querySelector('#tili .shots-dots');
    if (!scroller || !dots) return;
    const figures = scroller.querySelectorAll('.shot--showcase');
    const marks = dots.querySelectorAll('span');
    const update = () => {
      const card = figures[0];
      const w = card ? card.getBoundingClientRect().width : 1;
      const gap = 12;
      const i = Math.max(0, Math.min(marks.length - 1, Math.round(scroller.scrollLeft / (w + gap))));
      marks.forEach((d, n) => d.classList.toggle('is-on', n === i));
    };
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  persistUtm();
  applyLang(detectLang());
  initShots();
  initTiliCarousel();
  initReveal();
  initSectionAnalytics();
  initCta();
  initMenu();

  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      const lang = langSelect.value;
      if (!copy[lang]) return;
      applyLang(lang);
      window.TiliLandingAnalytics?.capture('language_changed', { locale: lang });
    });
  }

  window.TiliLandingAnalytics?.capture('landing_open', { locale: currentLang });
})();
