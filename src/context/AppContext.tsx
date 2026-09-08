import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppScreen, Task, UserSession, UserSettings, ZoomLevel } from '../types';
import { DEFAULT_SETTINGS } from '../constants/categories';
import {
  deleteTask,
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
  rebalanceHourTasks,
} from '../utils/hourSlot';
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
  deleteTaskInHour: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  settings: UserSettings;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  session: UserSession;
  setSession: (s: UserSession) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  pendingDelete: Task | null;
  requestDelete: (task: Task) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  completeOnboarding: () => void;
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

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

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

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
      deleteTaskInHour,
      removeTask,
      settings,
      updateSettings,
      session,
      setSession,
      editingTask,
      setEditingTask,
      sheetOpen,
      setSheetOpen,
      pendingDelete,
      requestDelete,
      cancelDelete,
      confirmDelete,
      completeOnboarding,
    }),
    [
      ready, screen, zoom, zoomIn, zoomOut, weekZoom, setWeekZoom, weekZoomIn, weekZoomOut,
      focusDate, selectedDay, tasks,
      refreshTasks, upsertTask, saveHourSlot, deleteTaskInHour, removeTask, settings, updateSettings,
      session, editingTask, sheetOpen, pendingDelete, requestDelete, cancelDelete, confirmDelete, completeOnboarding,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
