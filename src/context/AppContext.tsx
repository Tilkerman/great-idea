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
  seedIfEmpty,
} from '../db';
import {
  getDateStrFromTask,
  getHourFromTask,
  getTasksInHour,
  MAX_TASKS_PER_HOUR,
  rebalanceHourTasks,
} from '../utils/hourSlot';
import { toLocalDateString } from '../utils/date';
import {
  buildPastedTasks,
  idsInDay,
  idsInHour,
  idsInWeek,
} from '../utils/gridClipboard';
import { SEED_TASKS } from '../data/seedTasks';
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN } from '../constants/weekZoom';

const ONBOARDING_KEY = 'tili-onboarding-done';
const SESSION_KEY = 'tili-session';

interface AppContextValue {
  ready: boolean;
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
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
  placeTask: (task: Task, day: Date, hour: number) => Promise<'ok' | 'full'>;
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
}

const AppContext = createContext<AppContextValue | null>(null);

const ZOOM_ORDER: ZoomLevel[] = ['year', 'month', 'week', 'day'];

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [weekZoom, setWeekZoom] = useState(WEEK_ZOOM_MIN);
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettingsState] = useState<UserSettings>({ ...DEFAULT_SETTINGS });
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
      await seedIfEmpty(SEED_TASKS);
      const s = await getSettings();
      setSettingsState(s);
      await refreshTasks();
      const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === '1';
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          setSession(JSON.parse(savedSession) as UserSession);
        } catch {
          /* ignore */
        }
      }
      setScreen(onboardingDone ? 'calendar' : 'onboarding');
      setReady(true);
    })();
  }, [refreshTasks]);

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
  }, []);

  useEffect(() => {
    if (zoom === 'day') setWeekZoom(WEEK_ZOOM_MAX);
    if (zoom === 'month' || zoom === 'year') setWeekZoom(WEEK_ZOOM_MIN);
  }, [zoom]);

  const upsertTask = useCallback(async (task: Task) => {
    await saveTask({ ...task, updatedAt: new Date().toISOString() });
    await refreshTasks();
  }, [refreshTasks]);

  const saveHourSlot = useCallback(async (day: Date, hour: number, slotTasks: Task[]) => {
    const rebalanced = rebalanceHourTasks(day, hour, slotTasks);
    await saveTasks(rebalanced);
    await refreshTasks();
  }, [refreshTasks]);

  const placeTask = useCallback(async (task: Task, day: Date, hour: number): Promise<'ok' | 'full'> => {
    const all = await getAllTasks();
    const newDateStr = toLocalDateString(day);
    const existing = all.find((t) => t.id === task.id);
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
    await refreshTasks();
    return 'ok';
  }, [refreshTasks]);

  const deleteTaskInHour = useCallback(async (task: Task) => {
    const day = new Date(task.startAt);
    const hour = getHourFromTask(task);
    const dateStr = getDateStrFromTask(task);
    const remaining = getTasksInHour(await getAllTasks(), dateStr, hour)
      .filter((t) => t.id !== task.id);
    await deleteTask(task.id);
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
    await deleteTask(id);
    await refreshTasks();
  }, [refreshTasks]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    const next = { ...settings, ...partial };
    setSettingsState(next);
    await saveSettings(next);
  }, [settings]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setScreen('calendar');
  }, []);

  const openAuth = useCallback((start: AuthStart, back: AppScreen = 'calendar') => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setAuthStart(start);
    setAuthBackScreen(back);
    setScreen('auth');
  }, []);

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
    const all = await getAllTasks();
    const removeIds = target.kind === 'week'
      ? idsInWeek(all, target.focusDate, settings.weekStartsOn)
      : target.kind === 'day'
        ? idsInDay(all, target.day)
        : idsInHour(all, target.day, target.hour);
    await deleteTasks(removeIds);
    const incoming = buildPastedTasks(
      gridClipboard,
      target.kind === 'week'
        ? { kind: 'week', focusDate: target.focusDate, weekStartsOn: settings.weekStartsOn }
        : target,
    );
    await saveTasks(incoming);
    await refreshTasks();
  }, [gridClipboard, refreshTasks, settings.weekStartsOn]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session, ready]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme;
    if (theme === 'dark') root.dataset.theme = 'dark';
    else if (theme === 'light') root.dataset.theme = 'light';
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = prefersDark ? 'dark' : 'light';
    }
  }, [settings.theme]);

  const value = useMemo(
    () => ({
      ready,
      screen,
      setScreen,
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
    }),
    [
      ready, screen, zoom, zoomIn, zoomOut, weekZoom, setWeekZoom, weekZoomIn, weekZoomOut,
      focusDate, selectedDay, tasks,
      refreshTasks, upsertTask, saveHourSlot, placeTask, deleteTaskInHour, removeTask, settings, updateSettings,
      session, authStart, authBackScreen, editingTask, sheetOpen, pendingDelete, requestDelete, cancelDelete, confirmDelete, completeOnboarding, openAuth, taskClipboard, copyTaskToClipboard, gridClipboard, pasteGridClipboard,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
