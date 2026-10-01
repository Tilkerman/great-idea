import type { Task, UserSession, UserSettings } from '../types';
import type { ActionItem, Contact, Desire, Feedback, LifeAreaRating } from '../lumi/types';
import { DEFAULT_SETTINGS } from '../constants/categories';
import { getAllTasks, getSettings, saveSettings, db as calendarDb } from '../db';
import { db as lumiDb } from '../lumi/services/db';
import { readAllAccounts, replaceAllAccounts, type LocalAccount } from './authLocal';

export const TILI_BACKUP_FORMAT = 'tili-backup' as const;
export const TILI_BACKUP_VERSION = 1;

const SESSION_KEY = 'tili-session';

export type TiliBackupPayload = {
  format: typeof TILI_BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  calendar: {
    tasks: Task[];
    settings: UserSettings;
  };
  lumi: {
    desires: Desire[];
    contacts: Contact[];
    lifeAreas: LifeAreaRating[];
    feedbacks: Feedback[];
    actionItems: ActionItem[];
  };
  profile: {
    session: UserSession | null;
    accounts: LocalAccount[];
  };
};

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function writeSession(session: UserSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function buildFullBackup(): Promise<TiliBackupPayload> {
  await lumiDb.open();
  const [tasks, settings] = await Promise.all([getAllTasks(), getSettings()]);
  const [desires, contacts, lifeAreas, feedbacks, actionItems] = await Promise.all([
    lumiDb.desires.toArray(),
    lumiDb.contacts.toArray(),
    lumiDb.lifeAreas.toArray(),
    lumiDb.feedbacks.toArray(),
    lumiDb.actionItems.toArray(),
  ]);

  return {
    format: TILI_BACKUP_FORMAT,
    version: TILI_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    calendar: { tasks, settings },
    lumi: { desires, contacts, lifeAreas, feedbacks, actionItems },
    profile: {
      session: readSession(),
      accounts: readAllAccounts(),
    },
  };
}

export function backupFileName(date = new Date()): string {
  const day = date.toISOString().split('T')[0];
  return `tili-backup-${day}.json`;
}

export function downloadBackupJson(payload: TiliBackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Старые файлы: только Lumi или только календарь. */
export function normalizeBackup(raw: unknown): TiliBackupPayload {
  if (!isRecord(raw)) {
    throw new Error('invalid');
  }

  if (raw.format === TILI_BACKUP_FORMAT && isRecord(raw.calendar) && isRecord(raw.lumi)) {
    const calendar = raw.calendar as { tasks?: Task[]; settings?: UserSettings };
    const lumi = raw.lumi as {
      desires?: Desire[];
      contacts?: Contact[];
      lifeAreas?: LifeAreaRating[];
      feedbacks?: Feedback[];
      actionItems?: ActionItem[];
    };
    const profile = isRecord(raw.profile)
      ? raw.profile
      : { session: null, accounts: [] };

    return {
      format: TILI_BACKUP_FORMAT,
      version: typeof raw.version === 'number' ? raw.version : 1,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      calendar: {
        tasks: Array.isArray(calendar.tasks) ? calendar.tasks : [],
        settings: { ...DEFAULT_SETTINGS, ...(calendar.settings ?? {}) },
      },
      lumi: {
        desires: Array.isArray(lumi.desires) ? lumi.desires : [],
        contacts: Array.isArray(lumi.contacts) ? lumi.contacts : [],
        lifeAreas: Array.isArray(lumi.lifeAreas) ? lumi.lifeAreas : [],
        feedbacks: Array.isArray(lumi.feedbacks) ? lumi.feedbacks : [],
        actionItems: Array.isArray(lumi.actionItems) ? lumi.actionItems : [],
      },
      profile: {
        session: (profile.session as UserSession | null) ?? null,
        accounts: Array.isArray(profile.accounts) ? (profile.accounts as LocalAccount[]) : [],
      },
    };
  }

  if (Array.isArray(raw.desires)) {
    return {
      format: TILI_BACKUP_FORMAT,
      version: 1,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      calendar: { tasks: [], settings: { ...DEFAULT_SETTINGS } },
      lumi: {
        desires: raw.desires as Desire[],
        contacts: Array.isArray(raw.contacts) ? (raw.contacts as Contact[]) : [],
        lifeAreas: Array.isArray(raw.lifeAreas) ? (raw.lifeAreas as LifeAreaRating[]) : [],
        feedbacks: Array.isArray(raw.feedbacks) ? (raw.feedbacks as Feedback[]) : [],
        actionItems: [],
      },
      profile: { session: null, accounts: [] },
    };
  }

  if (Array.isArray(raw.tasks)) {
    return {
      format: TILI_BACKUP_FORMAT,
      version: 1,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      calendar: {
        tasks: raw.tasks as Task[],
        settings: { ...DEFAULT_SETTINGS, ...((raw.settings as UserSettings) ?? {}) },
      },
      lumi: {
        desires: [],
        contacts: [],
        lifeAreas: [],
        feedbacks: [],
        actionItems: [],
      },
      profile: { session: null, accounts: [] },
    };
  }

  throw new Error('invalid');
}

export async function importFullBackup(payload: TiliBackupPayload): Promise<void> {
  await lumiDb.open();

  await calendarDb.transaction('rw', calendarDb.tasks, calendarDb.settings, async () => {
    await calendarDb.tasks.clear();
    if (payload.calendar.tasks.length > 0) {
      await calendarDb.tasks.bulkPut(payload.calendar.tasks);
    }
    await saveSettings(payload.calendar.settings);
  });

  await lumiDb.transaction(
    'rw',
    lumiDb.desires,
    lumiDb.contacts,
    lumiDb.lifeAreas,
    lumiDb.feedbacks,
    lumiDb.actionItems,
    async () => {
      await lumiDb.desires.clear();
      await lumiDb.contacts.clear();
      await lumiDb.lifeAreas.clear();
      await lumiDb.feedbacks.clear();
      await lumiDb.actionItems.clear();

      if (payload.lumi.desires.length > 0) await lumiDb.desires.bulkPut(payload.lumi.desires);
      if (payload.lumi.contacts.length > 0) await lumiDb.contacts.bulkPut(payload.lumi.contacts);
      if (payload.lumi.lifeAreas.length > 0) await lumiDb.lifeAreas.bulkPut(payload.lumi.lifeAreas);
      if (payload.lumi.feedbacks.length > 0) await lumiDb.feedbacks.bulkPut(payload.lumi.feedbacks);
      if (payload.lumi.actionItems.length > 0) await lumiDb.actionItems.bulkPut(payload.lumi.actionItems);
    },
  );

  replaceAllAccounts(payload.profile.accounts);
  writeSession(payload.profile.session);
}
