import {
  notificationPermission,
  notificationsBlockedReason,
  requestNotificationPermission,
} from './notifications';
import { subscribeTiliPush } from './webPush';

export type EnablePushResult = 'granted' | 'denied' | 'dismissed' | 'blocked' | 'unsupported';

/** Вызывать только из тапа/смены селекта — иначе iPhone не покажет системное окно. */
export async function enablePushFromGesture(): Promise<EnablePushResult> {
  const current = notificationPermission();
  if (current === 'unsupported') return 'unsupported';
  if (notificationsBlockedReason() && current !== 'granted') return 'blocked';
  const perm = current === 'granted' ? 'granted' : await requestNotificationPermission();
  if (perm === 'granted') {
    await subscribeTiliPush();
    return 'granted';
  }
  if (perm === 'denied') return 'denied';
  return 'dismissed';
}
