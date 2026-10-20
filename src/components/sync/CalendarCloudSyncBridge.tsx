import { useApp } from '../../context/AppContext';
import { useCalendarCloudAutoSync } from '../../hooks/useCalendarCloudAutoSync';
import { useLumiCloudAutoSync } from '../../hooks/useLumiCloudAutoSync';

/** Background calendar + Lumi sync for verified cloud accounts. */
export function CalendarCloudSyncBridge() {
  const { session, refreshTasks } = useApp();
  useCalendarCloudAutoSync(session, refreshTasks);
  useLumiCloudAutoSync(session);
  return null;
}
