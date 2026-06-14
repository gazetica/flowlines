// notificationService.ts
// Flow Lines | Gazetica Studio | UX Sprint C | Task FL-UX-C.1
//
// Local (no-server) daily-challenge reminder via @capacitor/local-notifications.
// The daily puzzle resets at UTC midnight; we nudge the player at 20:00 local
// each day to finish today's challenge before the reset. Permission is requested
// after the first win (ResultScreen), not on launch. Native-only; every call is
// defensive so the web build / a denied permission never throws.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DAILY_ID = 1001; // fixed → reschedule cancels + replaces the same slot

/**
 * Ask for notification permission (Android 13+ shows a system prompt). Returns
 * true if granted. No-op → false on web or any error.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch (err) {
    console.warn('[notificationService] permission request failed:', err);
    return false;
  }
}

/**
 * Schedule the repeating 20:00-local daily reminder. Idempotent: cancels the
 * existing DAILY_ID first so repeated calls never stack duplicates.
 */
export async function scheduleDailyReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_ID,
          title: '🎯 Daily Challenge Waiting',
          body: "Today's Flow Lines puzzle is ready. Can you beat yesterday's top score?",
          schedule: { on: { hour: 20, minute: 0 }, repeats: true, allowWhileIdle: true },
          smallIcon: 'ic_stat_notification',
        },
      ],
    });
  } catch (err) {
    console.warn('[notificationService] schedule failed:', err);
  }
}

/** Cancel the daily reminder. */
export async function cancelDailyReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] });
  } catch (err) {
    console.warn('[notificationService] cancel failed:', err);
  }
}
