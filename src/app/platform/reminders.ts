import * as Notifications from 'expo-notifications';
import { BACKUP_REMINDER_DAYS } from '../../core/backup.ts';

/**
 * 백업 갱신 알림 (명세 6.3) — 기기 안에서만 도는 로컬 알림이다.
 * 알림 내용에 금고 내용은 넣지 않는다.
 */
const REMINDER_ID = 'jamgim-backup-reminder';

/** 알림에 쓸 말. 이 모듈은 말을 갖지 않는다 — 부르는 쪽이 넘긴다. */
export type ReminderText = { title: string; body: string };

export async function scheduleBackupReminder(lastBackupAt: number, text: ReminderText): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      if (asked.status !== 'granted') return;
    }
    await cancelBackupReminder();
    const dueAt = lastBackupAt + BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    const seconds = Math.max(60, Math.round((dueAt - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: text.title,
        body: text.body,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  } catch {
    // 알림을 못 걸어도 앱은 그대로 쓴다.
  }
}

export async function cancelBackupReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    /* 예약된 것이 없으면 무시 */
  }
}
