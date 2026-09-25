import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type LumiHostApi = {
  createWish: () => void;
  showAllWishes: () => void;
  goWheel: () => void;
  toggleListAndWheel: () => void;
  openDesire: (desireId: string) => void;
};

export type LumiSettingsPage =
  | 'about'
  | 'tutorial'
  | 'install'
  | 'settings'
  | 'feedback'
  | 'statistics'
  | 'completed';

type LumiHostContextValue = {
  api: LumiHostApi | null;
  setApi: (api: LumiHostApi | null) => void;
  settingsOpenNonce: number;
  pendingSettingsPage: LumiSettingsPage | null;
  pendingDesireId: string | null;
  requestOpenDesire: (desireId: string) => void;
  consumePendingDesire: () => void;
  requestOpenSettings: () => void;
  requestOpenSettingsPage: (page: LumiSettingsPage) => void;
  consumePendingSettingsPage: () => void;
  consumeReturnToSettingsHub: () => boolean;
};

const LumiHostContext = createContext<LumiHostContextValue | null>(null);

export function LumiHostProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<LumiHostApi | null>(null);
  const [settingsOpenNonce, setSettingsOpenNonce] = useState(0);
  const [pendingSettingsPage, setPendingSettingsPage] = useState<LumiSettingsPage | null>(null);
  const [pendingDesireId, setPendingDesireId] = useState<string | null>(null);
  const returnToSettingsHubRef = useRef(false);

  const requestOpenDesire = useCallback((desireId: string) => {
    setPendingDesireId(desireId);
  }, []);

  const consumePendingDesire = useCallback(() => {
    setPendingDesireId(null);
  }, []);

  const requestOpenSettings = useCallback(() => {
    setSettingsOpenNonce((n) => n + 1);
  }, []);

  const requestOpenSettingsPage = useCallback((page: LumiSettingsPage) => {
    returnToSettingsHubRef.current = true;
    setPendingSettingsPage(page);
  }, []);

  const consumePendingSettingsPage = useCallback(() => {
    setPendingSettingsPage(null);
  }, []);

  const consumeReturnToSettingsHub = useCallback(() => {
    if (!returnToSettingsHubRef.current) return false;
    returnToSettingsHubRef.current = false;
    return true;
  }, []);

  const value = useMemo(
    () => ({
      api,
      setApi,
      settingsOpenNonce,
      pendingSettingsPage,
      pendingDesireId,
      requestOpenDesire,
      consumePendingDesire,
      requestOpenSettings,
      requestOpenSettingsPage,
      consumePendingSettingsPage,
      consumeReturnToSettingsHub,
    }),
    [
      api,
      settingsOpenNonce,
      pendingSettingsPage,
      pendingDesireId,
      requestOpenDesire,
      consumePendingDesire,
      requestOpenSettings,
      requestOpenSettingsPage,
      consumePendingSettingsPage,
      consumeReturnToSettingsHub,
    ],
  );
  return <LumiHostContext.Provider value={value}>{children}</LumiHostContext.Provider>;
}

export function useLumiHost() {
  const ctx = useContext(LumiHostContext);
  if (!ctx) throw new Error('useLumiHost outside LumiHostProvider');
  return ctx;
}
