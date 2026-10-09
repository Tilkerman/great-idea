import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppScreen, AuthStart, GridClipboard, Task, TaskClipboard, UserSession, UserSettings, ZoomLevel,
} from '../types';
import { DEFAULT_SETTINGS } from '../constants/categories';
import {
  deleteTask,
  deleteTasks,
  getAllTasks,
  getSettings,
  saveSettings,
  saveTask,
  saveTasks,
  replaceAllTasks,
} from '../db';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
  MAX_TASKS_PER_HOUR,
  rebalanceHourTasks,
} from '../utils/hourSlot';
import { getWeekDays, isLockedCreateDay, toLocalDateString } from '../utils/date';
import {
  buildPastedTasks,
  idsInDay,
  idsInHour,
} from '../utils/gridClipboard';
import { buildThreeWeekDemoTasks } from '../data/seedTasks';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN } from '../constants/weekZoom';
import { afterTaskDeleted, afterTaskWritten } from '../utils/wishTaskBridge';
import { resolveLaunchLocale, setAnalyticsConsent, trackCalendarTask, trackOnboardingComplete } from '../utils/productAnalytics';

const ONBOARDING_KEY = 'tili-onboarding-done';
const MOBILE_ONBOARDING_KEY = 'tili-onboarding-mobile-done';
const DESKTOP_ONBOARDING_KEY = 'tili-onboarding-desktop-done';
const SESSION_KEY = 'tili-session';
const MAIN_TAB_KEY = 'tili-main-tab';

function isDesktopOnboarding() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

function hasCompletedOnboardingForLayout() {
  const key = isDesktopOnboarding() ? DESKTOP_ONBOARDING_KEY : MOBILE_ONBOARDING_KEY;
  // People who completed the original, phone-only tour should not see it again
  // on mobile. They still receive the new desktop tour the first time on a wide screen.
  return localStorage.getItem(key) === '1'
    || (!isDesktopOnboarding() && localStorage.getItem(ONBOARDING_KEY) === '1');
}

function markOnboardingCompletedForLayout() {
  localStorage.setItem(isDesktopOnboarding() ? DESKTOP_ONBOARDING_KEY : MOBILE_ONBOARDING_KEY, '1');
  localStorage.setItem(ONBOARDING_KEY, '1');
}

function readMainTab(): 'calendar' | 'lumi' {
  try {
    return sessionStorage.getItem(MAIN_TAB_KEY) === 'lumi' ? 'lumi' : 'calendar';
  } catch {
    return 'calendar';
  }
}

function writeMainTab(tab: 'calendar' | 'lumi') {
  try {
    sessionStorage.setItem(MAIN_TAB_KEY, tab);
  } catch {
    /* private mode */
  }
}

interface AppContextValue {
  ready: boolean;
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  /** Календарь или желания: куда возвращать из Настроек / Профиля. */
  mainTab: 'calendar' | 'lumi';
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  weekZoom: number;
  setWeekZoom: (zoom: number) => void;
  weekZoomIn: () => void;
  weekZoomOut: () => void;
  focusDate: Date;
  setFocusDate: (d: Date) => void;
  selectedDay: Date | null;
  setSelectedDay: (d: Date | null) => void;
  tasks: Task[];
  refreshTasks: () => Promise<void>;
  upsertTask: (task: Task) => Promise<void>;
  saveHourSlot: (day: Date, hour: number, slotTasks: Task[]) => Promise<void>;
  placeTask: (task: Task, day: Date, hour: number) => Promise<'ok' | 'full' | 'past'>;
  deleteTaskInHour: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  settings: UserSettings;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  session: UserSession;
  setSession: (s: UserSession) => void;
  authStart: AuthStart;
  setAuthStart: (s: AuthStart) => void;
  authBackScreen: AppScreen;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  pendingDelete: Task | null;
  requestDelete: (task: Task) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  completeOnboarding: () => void;
  openAuth: (start: AuthStart, back?: AppScreen) => void;
  taskClipboard: TaskClipboard | null;
  copyTaskToClipboard: (data: TaskClipboard) => void;
  gridClipboard: GridClipboard | null;
  setGridClipboard: (clip: GridClipboard | null) => void;
  pasteGridClipboard: (
    target:
      | { kind: 'week'; focusDate: Date }
      | { kind: 'day'; day: Date }
      | { kind: 'hour'; day: Date; hour: number },
  ) => Promise<void>;
  loadDemoThreeWeeks: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [screen, setScreenState] = useState<AppScreen>('onboarding');
  const [mainTab, setMainTab] = useState<'calendar' | 'lumi'>(readMainTab);
  const setScreen = useCallback((s: AppScreen) => {
    setScreenState(s);
    if (s === 'calendar' || s === 'lumi') {
      setMainTab(s);
      writeMainTab(s);
    }
  }, []);

  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [weekZoom, setWeekZoom] = useState(WEEK_ZOOM_MIN);
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>(() => {
    const base: UserSettings = { ...DEFAULT_SETTINGS };
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light') {
      base.theme = 'light';
    }
    return base;
  });
  const [session, setSession] = useState<UserSession>({ isGuest: true });
  const [authStart, setAuthStart] = useState<AuthStart>('choice');
  const [authBackScreen, setAuthBackScreen] = useState<AppScreen>('calendar');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [taskClipboard, setTaskClipboard] = useState<TaskClipboard | null>(null);
  const [gridClipboard, setGridClipboard] = useState<GridClipboard | null>(null);

  const refreshTasks = useCallback(async () => {
    setTasks(await getAllTasks());
  }, []);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('seed') === 'demo3') {
        await replaceAllTasks(buildThreeWeekDemoTasks());
        params.delete('seed');
        const q = params.toString();
        const next = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', next);
      }
      let s = await getSettings();
      const migrated = localStorage.getItem('tili-analytics-on-by-default');
      if (migrated !== '1') {
        s = { ...s, analyticsEnabled: true };
        setAnalyticsConsent(true);
        await saveSettings(s);
        localStorage.setItem('tili-analytics-on-by-default', '1');
      }
      const resolved = resolveLaunchLocale(s.locale);
      if (resolved !== s.locale) {
        s = { ...s, locale: resolved };
        await saveSettings(s);
      }
      const launch = new URLSearchParams(window.location.search);
      let launchUrlDirty = false;
      if (launch.get('open') === 'lumi') {
        writeMainTab('lumi');
        launch.delete('open');
        launchUrlDirty = true;
      }
      if (launch.get('theme') === 'light') {
        if (s.theme !== 'light') {
          s = { ...s, theme: 'light' };
          await saveSettings(s);
        }
        launch.delete('theme');
        launchUrlDirty = true;
      }
      if (launchUrlDirty) {
        const q = launch.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
      }
      setSettingsState(s);
      await refreshTasks();
      const onboardingDone = hasCompletedOnboardingForLayout();
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          setSession(JSON.parse(savedSession) as UserSession);
        } catch {
          /* ignore */
        }
      }
      setScreen(onboardingDone ? readMainTab() : 'onboarding');
      setReady(true);
    })();
  }, [refreshTasks, setScreen]);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const i = ZOOM_ORDER.indexOf(z);
      return ZOOM_ORDER[Math.min(i + 1, ZOOM_ORDER.length - 1)] ?? z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const i = ZOOM_ORDER.indexOf(z);
      return ZOOM_ORDER[Math.max(i - 1, 0)] ?? z;
    });
  }, []);

  const weekZoomIn = useCallback(() => {
    setWeekZoom((w) => Math.min(w + 0.1, WEEK_ZOOM_MAX));
  }, []);

  const weekZoomOut = useCallback(() => {
    setWeekZoom((w) => Math.max(w - 0.1, WEEK_ZOOM_MIN));
    setZoom((z) => (z === 'day' ? 'week' : z));
  }, []);

  useEffect(() => {
    if (zoom === 'day') setWeekZoom(WEEK_ZOOM_MAX);
    if (zoom === 'month' || zoom === 'year') setWeekZoom(WEEK_ZOOM_MIN);
  }, [zoom]);

  const upsertTask = useCallback(async (task: Task) => {
    await saveTask({ ...task, updatedAt: new Date().toISOString() });
    await afterTaskWritten(task);
    await refreshTasks();
  }, [refreshTasks]);

  const saveHourSlot = useCallback(async (day: Date, hour: number, slotTasks: Task[]) => {
    const rebalanced = rebalanceHourTasks(day, hour, slotTasks);
    await saveTasks(rebalanced);
    await refreshTasks();
  }, [refreshTasks]);

  const placeTask = useCallback(async (task: Task, day: Date, hour: number): Promise<'ok' | 'full' | 'past'> => {
    const all = await getAllTasks();
    const newDateStr = toLocalDateString(day);
    const existing = all.find((t) => t.id === task.id);
    if (isLockedCreateDay(day) && (!existing || getDateStrFromTask(existing) !== newDateStr)) {
      return 'past';
    }
    const same = Boolean(
      existing
      && getDateStrFromTask(existing) === newDateStr
      && getHourFromTask(existing) === hour,
    );
    const others = getTasksInHour(all, newDateStr, hour).filter((t) => t.id !== task.id);
    if (!same && others.length >= MAX_TASKS_PER_HOUR) return 'full';

    if (existing && !same) {
      const oldDateStr = getDateStrFromTask(existing);
      const oldHour = getHourFromTask(existing);
      const remaining = getTasksInHour(all, oldDateStr, oldHour).filter((t) => t.id !== task.id);
      const oldDay = new Date(existing.startAt);
      oldDay.setHours(0, 0, 0, 0);
      if (remaining.length > 0) {
        await saveTasks(rebalanceHourTasks(oldDay, oldHour, remaining));
      }
    }

    const merged = same
      ? getTasksInHour(all, newDateStr, hour).map((t) => (t.id === task.id ? task : t))
      : [...others, task];
    await saveTasks(rebalanceHourTasks(day, hour, merged));
    await afterTaskWritten(task);
    await refreshTasks();
    trackCalendarTask(settings.analyticsEnabled, {
      isNew: !existing,
      completed: task.status === 'completed',
      category: task.category,
    });
    return 'ok';
  }, [refreshTasks, settings.analyticsEnabled]);

  const deleteTaskInHour = useCallback(async (task: Task) => {
    const day = new Date(task.startAt);
    const hour = getHourFromTask(task);
    const dateStr = getDateStrFromTask(task);
    const remaining = getTasksInHour(await getAllTasks(), dateStr, hour)
      .filter((t) => t.id !== task.id);
    await deleteTask(task.id);
    await afterTaskDeleted(task);
    if (remaining.length > 0) {
      await saveTasks(rebalanceHourTasks(day, hour, remaining));
    }
    await refreshTasks();
  }, [refreshTasks]);

  const requestDelete = useCallback((task: Task) => {
    setPendingDelete(task);
  }, []);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const task = pendingDelete;
    setPendingDelete(null);
    setSheetOpen(false);
    setEditingTask(null);
    await deleteTaskInHour(task);
  }, [pendingDelete, deleteTaskInHour]);

  const removeTask = useCallback(async (id: string) => {
    const task = (await getAllTasks()).find((row) => row.id === id);
    await deleteTask(id);
    if (task) await afterTaskDeleted(task);
    await refreshTasks();
  }, [refreshTasks]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    const next = { ...settings, ...partial };
    setSettingsState(next);
    await saveSettings(next);
  }, [settings]);

  const completeOnboarding = useCallback(() => {
    markOnboardingCompletedForLayout();
    trackOnboardingComplete(settings.analyticsEnabled, settings.locale);
    setScreen(readMainTab());
  }, [setScreen, settings.analyticsEnabled, settings.locale]);

  const openAuth = useCallback((start: AuthStart, back: AppScreen = 'calendar') => {
    markOnboardingCompletedForLayout();
    setAuthStart(start);
    setAuthBackScreen(back);
    setScreen('auth');
  }, [setScreen]);

  const copyTaskToClipboard = useCallback((data: TaskClipboard) => {
    setTaskClipboard(data);
  }, []);

  const pasteGridClipboard = useCallback(async (
    target:
      | { kind: 'week'; focusDate: Date }
      | { kind: 'day'; day: Date }
      | { kind: 'hour'; day: Date; hour: number },
  ) => {
    if (!gridClipboard || gridClipboard.kind !== target.kind) return;
    if ((target.kind === 'day' || target.kind === 'hour') && isLockedCreateDay(target.day)) return;
    const all = await getAllTasks();
    if (target.kind === 'week') {
      const days = getWeekDays(target.focusDate, settings.weekStartsOn);
      const liveDates = new Set(days.filter((d) => !isLockedCreateDay(d)).map(toLocalDateString));
      if (liveDates.size === 0) return;
      const removeRows = all.filter((task) => liveDates.has(toLocalDateString(new Date(task.startAt))));
      const removeIds = removeRows.map((task) => task.id);
      for (const row of removeRows) await afterTaskDeleted(row);
      await deleteTasks(removeIds);
      const incoming = buildPastedTasks(
        gridClipboard,
        { kind: 'week', focusDate: target.focusDate, weekStartsOn: settings.weekStartsOn },
      ).filter((task) => liveDates.has(toLocalDateString(new Date(task.startAt))));
      await saveTasks(incoming);
      await refreshTasks();
      return;
    }
    const removeRows = all.filter((task) => (target.kind === 'day'
      ? idsInDay(all, target.day).includes(task.id)
      : idsInHour(all, target.day, target.hour).includes(task.id)));
    const removeIds = target.kind === 'day'
      ? idsInDay(all, target.day)
      : idsInHour(all, target.day, target.hour);
    for (const row of removeRows) await afterTaskDeleted(row);
    await deleteTasks(removeIds);
    const incoming = buildPastedTasks(gridClipboard, target);
    await saveTasks(incoming);
    await refreshTasks();
  }, [gridClipboard, refreshTasks, settings.weekStartsOn]);

  const loadDemoThreeWeeks = useCallback(async () => {
    await replaceAllTasks(buildThreeWeekDemoTasks());
    await refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session, ready]);

  useEffect(() => {
    const root = document.documentElement;
    const fromOpen = new URLSearchParams(window.location.search).get('theme') === 'light';
    const theme = fromOpen ? 'light' : settings.theme;
    if (theme === 'dark') root.dataset.theme = 'dark';
    else if (theme === 'light') root.dataset.theme = 'light';
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = prefersDark ? 'dark' : 'light';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', root.dataset.theme === 'dark' ? '#0f1117' : '#ffffff');
    root.lang = settings.locale;
  }, [settings.theme, settings.locale]);

  const value = useMemo(
    () => ({
      ready,
      screen,
      setScreen,
      mainTab,
      zoom,
      setZoom,
      zoomIn,
      zoomOut,
      weekZoom,
      setWeekZoom,
      weekZoomIn,
      weekZoomOut,
      focusDate,
      setFocusDate,
      selectedDay,
      setSelectedDay,
      tasks,
      refreshTasks,
      upsertTask,
      saveHourSlot,
      placeTask,
      deleteTaskInHour,
      removeTask,
      settings,
      updateSettings,
      session,
      setSession,
      authStart,
      setAuthStart,
      authBackScreen,
      editingTask,
      setEditingTask,
      sheetOpen,
      setSheetOpen,
      pendingDelete,
      requestDelete,
      cancelDelete,
      confirmDelete,
      completeOnboarding,
      openAuth,
      taskClipboard,
      copyTaskToClipboard,
      gridClipboard,
      setGridClipboard,
      pasteGridClipboard,
      loadDemoThreeWeeks,
    }),
    [
      ready, screen, mainTab, setScreen, zoom, zoomIn, zoomOut, weekZoom, setWeekZoom, weekZoomIn, weekZoomOut,
      focusDate, selectedDay, tasks,
      refreshTasks, upsertTask, saveHourSlot, placeTask, deleteTaskInHour, removeTask, settings, updateSettings,
      session, authStart, authBackScreen, editingTask, sheetOpen, pendingDelete, requestDelete, cancelDelete, confirmDelete, completeOnboarding, openAuth, taskClipboard, copyTaskToClipboard, gridClipboard, pasteGridClipboard, loadDemoThreeWeeks,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
