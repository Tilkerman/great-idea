import {
  notificationPermission,
  notificationsBlockedReason,
  requestNotificationPermission,
} from './notifications';
import { refreshCloudReminders, subscribeTiliPush } from './webPush';

export type EnablePushResult =
  | 'granted'
  | 'granted-no-cloud'
  | 'granted-no-push'
  | 'granted-no-network'
  | 'denied'
  | 'dismissed'
  | 'blocked'
  | 'unsupported';

/** Вызывать только из тапа/смены селекта — иначе iPhone не покажет системное окно. */
export async function enablePushFromGesture(): Promise<EnablePushResult> {
  const current = notificationPermission();
  if (current === 'unsupported') return 'unsupported';
  if (notificationsBlockedReason() && current !== 'granted') return 'blocked';
  const perm = current === 'granted' ? 'granted' : await requestNotificationPermission();
  if (perm === 'granted') {
    const cloud = await subscribeTiliPush();
    if (cloud === 'ok') {
      await refreshCloudReminders();
      return 'granted';
    }
    if (cloud === 'no-push' || cloud === 'no-sw') return 'granted-no-push';
    if (cloud === 'network') return 'granted-no-network';
    return 'granted-no-cloud';
  }
  if (perm === 'denied') return 'denied';
  return 'dismissed';
}
