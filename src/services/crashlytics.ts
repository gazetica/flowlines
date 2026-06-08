// crashlytics.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-021
//
// Thin Firebase Crashlytics wrapper. The Crashlytics SDK auto-initialises on the
// device (ContentProvider + google-services.json), so there is no init call here.
// Native-only; errors swallowed so the wrapper never affects the app.
//
// Uses @capacitor-firebase/crashlytics (Capacitor 8 compatible) — the brief's
// candidate @capacitor-community/firebase-crashlytics tops out at Capacitor 5.

import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

/**
 * Record a non-fatal error to Crashlytics (future use — not wired to a call-site
 * in T-021). Pass an Error or any value; its message is logged.
 */
export async function recordError(error: unknown): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const message = error instanceof Error ? error.message : String(error);
  try {
    await FirebaseCrashlytics.recordException({ message });
  } catch (err) {
    console.warn('[crashlytics] recordError failed:', err);
  }
}
