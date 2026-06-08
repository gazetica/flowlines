// preferences.ts
// Numtap | Gazetica Studio | Sprint 3 Day 2 | Task T-009
//
// Thin typed wrapper around @capacitor/preferences. All persistent reads/writes
// go through this service; typed keys prevent typos across the codebase.

import { Preferences } from '@capacitor/preferences';

/**
 * All Preferences keys used in Numtap.
 * Using a const object prevents typos and makes keys searchable.
 */
export const PREF_KEYS = {
  // Onboarding flags
  LANGUAGE_SELECTED:   'languageSelected',
  ONBOARDING_SHOWN:    'onboardingShown',

  // Settings
  LANGUAGE:            'language',
  SOUND_ENABLED:       'soundEnabled',
  MUSIC_ENABLED:       'musicEnabled',
  HAPTICS_ENABLED:     'hapticsEnabled',
  ALIAS:               'alias',
  COUNTRY:             'country',          // T-005: ISO 3166-1 alpha-2 (or 'XX')

  // IAP flags
  REMOVE_ADS:          'removeAdsPurchased',
  // T-019: Early-Access campaign unlocks (read by campaignGateService.isPurchased).
  CAMPAIGN2_PURCHASED: 'campaign2_purchased',
  CAMPAIGN3_PURCHASED: 'campaign3_purchased',

  // Hint inventory (T-006 — unified hint currency, default 3 on fresh install)
  HINT_COUNT:          'hintCount',

  // Progress
  DAILY_STREAK:        'dailyStreak',
  LAST_PLAYED_DATE:    'lastPlayedDate',
  // T-006: date all 3 daily challenges were last submitted ('YYYY-MM-DD').
  LAST_DAILY_COMPLETION_DATE: 'lastDailyCompletionDate',
  COMPLETED_LEVELS:    'completedLevels',   // JSON: { [levelId]: starsEarned }
  BEST_SCORES:         'bestScores',        // JSON: { [mode_levelId]: score }
} as const;

type PrefKey = typeof PREF_KEYS[keyof typeof PREF_KEYS];

/** Read a string value. Returns null if not set. */
export async function prefGet(key: PrefKey): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

/** Write a string value. */
export async function prefSet(key: PrefKey, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

/** Remove a key. */
export async function prefRemove(key: PrefKey): Promise<void> {
  await Preferences.remove({ key });
}

/** Read a boolean (stored as 'true'/'false'). Returns defaultValue if not set. */
export async function prefGetBool(key: PrefKey, defaultValue: boolean): Promise<boolean> {
  const val = await prefGet(key);
  if (val === null) return defaultValue;
  return val === 'true';
}

/** Write a boolean. */
export async function prefSetBool(key: PrefKey, value: boolean): Promise<void> {
  await prefSet(key, value ? 'true' : 'false');
}

/** Read a number. Returns defaultValue if not set or not parseable. */
export async function prefGetNumber(key: PrefKey, defaultValue: number): Promise<number> {
  const val = await prefGet(key);
  if (val === null) return defaultValue;
  const n = Number(val);
  return isNaN(n) ? defaultValue : n;
}

/** Write a number. */
export async function prefSetNumber(key: PrefKey, value: number): Promise<void> {
  await prefSet(key, String(value));
}

/** Read a JSON object. Returns defaultValue if not set or parse fails. */
export async function prefGetJSON<T>(key: PrefKey, defaultValue: T): Promise<T> {
  const val = await prefGet(key);
  if (val === null) return defaultValue;
  try {
    return JSON.parse(val) as T;
  } catch {
    return defaultValue;
  }
}

/** Write a JSON object. */
export async function prefSetJSON<T>(key: PrefKey, value: T): Promise<void> {
  await prefSet(key, JSON.stringify(value));
}
