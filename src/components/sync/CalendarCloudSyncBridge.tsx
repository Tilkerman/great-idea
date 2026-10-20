import { useApp } from '../../context/AppContext';
import { useCalendarCloudAutoSync } from '../../hooks/useCalendarCloudAutoSync';

/** Wires background calendar sync when a verified cloud session is active. */
export function CalendarCloudSyncBridge() {
  const { session, refreshTasks } = useApp();
  useCalendarCloudAutoSync(session, refreshTasks);
  return null;
}
