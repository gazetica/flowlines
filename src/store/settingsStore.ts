// settingsStore.ts
// Numtap | Gazetica Studio | Sprint 3 Day 2 | Task T-009
//
// Zustand store for all user settings and persistent game state. Hydrates from
// Capacitor Preferences on init and writes through on every change. No Phaser,
// no React. Separate from gameStore (which holds the live per-round state).

import { create } from 'zustand';
import {
  PREF_KEYS,
  prefGetBool,
  prefSetBool,
  prefGet,
  prefSet,
  prefGetNumber,
  prefSetNumber,
  prefGetJSON,
  prefSetJSON,
} from '../services/preferences';
import i18n from '../i18n';

export type Language = 'en' | 'de' | 'fr' | 'ko' | 'pt' | 'es';

export interface CompletedLevels {
  [levelId: number]: number; // stars earned (0–3)
}

export interface BestScores {
  [key: string]: number; // key = `${mode}_${levelId}` e.g. "campaign_47"
}

// T-002: PB completion time (seconds) per level, keyed identically to bestScores.
export interface BestTimes {
  [key: string]: number; // key = `${mode}_${levelId}` e.g. "campaign_47"
}

interface SettingsState {
  // Onboarding
  languageSelected: boolean;
  onboardingShown: boolean;

  // Settings
  language: Language;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  alias: string;
  country: string; // T-005: ISO 3166-1 alpha-2 (or 'XX' = prefer not to say)
  // B-023: permanent player identity (NTxxxxxx). Generated once on first launch,
  // persisted to Preferences, and NEVER changed (no setter). The alias is a display
  // label; this UID is the true leaderboard identity.
  playerUid: string;

  // IAP
  removeAdsPurchased: boolean;

  // Hint inventory (T-006) — unified hint currency (💎). Default 3 on fresh install.
  hintCount: number;

  // Progress
  dailyStreak: number;
  lastPlayedDate: string; // ISO date string 'YYYY-MM-DD' or '' (any-mode last play)
  lastDailyCompletionDate: string; // 'YYYY-MM-DD' all-3-daily submitted, or ''
  lastDailyRewardDate: string; // F-005: 'YYYY-MM-DD' UTC the daily-visit gems were granted, or ''
  completedLevels: CompletedLevels;
  bestScores: BestScores;
  bestTimes: BestTimes; // T-002: PB time per level (parallel to bestScores)

  // Hydration flag — true once loadFromPreferences completes
  hydrated: boolean;

  // Actions
  loadFromPreferences: () => Promise<void>;

  setLanguage: (lang: Language) => Promise<void>;
  setSoundEnabled: (v: boolean) => Promise<void>;
  setMusicEnabled: (v: boolean) => Promise<void>;
  setHapticsEnabled: (v: boolean) => Promise<void>;
  setAlias: (alias: string) => Promise<void>;
  setCountry: (c: string) => Promise<void>;

  setLanguageSelected: () => Promise<void>;
  setOnboardingShown: () => Promise<void>;

  setRemoveAds: () => Promise<void>;

  // Hint inventory (T-006). F-005: the balance is the "gem" economy in the UI (💎);
  // addGems is the gem-economy-facing alias for crediting the same hintCount balance.
  setHintCount: (n: number) => Promise<void>;
  addHints: (n: number) => Promise<void>;
  addGems: (n: number) => Promise<void>; // F-005: credit n gems (== hintCount balance)
  consumeHint: () => boolean; // false if 0 available (no decrement); true + decrement otherwise
  // F-005: grant the once-per-UTC-day daily-visit reward (3 gems). Returns true if
  // it was granted now (new day), false if already claimed today. Pass today's UTC date.
  claimDailyGems: (today: string) => Promise<boolean>;

  recordLevelComplete: (levelId: number, stars: number, score: number, mode: string) => Promise<void>;
  // T-002: store a PB completion time (seconds) under `${mode}_${levelId}`.
  setBestTime: (key: string, time: number) => Promise<void>;
  updateDailyStreak: () => Promise<void>;
  // T-006: daily-challenge streak setters + completion-date tracking.
  setDailyStreak: (n: number) => Promise<void>;
  setLastDailyCompletionDate: (d: string) => Promise<void>;
}

// T-006: default hint inventory granted to a fresh install.
export const DEFAULT_HINT_COUNT = 3;

// B-023: generate a permanent player UID — "NT" + 6 chars from [A-Z0-9] (8 total).
// Called once on first launch when no playerUid exists in Preferences.
export function generatePlayerUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `NT${random}`;
}

/**
 * Pure daily-streak transition (T-006). Given the date all-3 challenges were last
 * completed, today's date, and the current streak, returns the new streak count.
 *  - already submitted today  → unchanged
 *  - last completion = yesterday → streak + 1
 *  - otherwise (gap / first ever) → reset to 1
 * Dates are 'YYYY-MM-DD' (UTC). Pure + side-effect-free for unit testing.
 */
export function nextDailyStreak(lastCompletionDate: string, today: string, currentStreak: number): number {
  if (lastCompletionDate === today) return currentStreak;
  const d = new Date(today + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  if (lastCompletionDate === yesterday) return currentStreak + 1;
  return 1;
}

// T-005: best-effort country guess from the device timezone (covers the brief's
// priority countries). Falls back to 'XX' (prefer not to say) when unknown.
function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const map: Record<string, string> = {
      'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'America/New_York': 'US',
      'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
      'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
      'Europe/Madrid': 'ES', 'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN', 'America/Sao_Paulo': 'BR', 'Europe/Moscow': 'RU',
      'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN',
      'Africa/Lagos': 'NG', 'Africa/Cairo': 'EG', 'Asia/Riyadh': 'SA',
      'Europe/Istanbul': 'TR', 'America/Mexico_City': 'MX',
    };
    return map[tz] ?? 'XX';
  } catch {
    return 'XX';
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Defaults (used before hydration)
  languageSelected: false,
  onboardingShown: false,
  language: 'en',
  soundEnabled: true,
  musicEnabled: false,
  hapticsEnabled: true,
  alias: '',
  country: 'XX',
  playerUid: '', // B-023: filled on first hydrate (generated if absent)
  removeAdsPurchased: false,
  hintCount: DEFAULT_HINT_COUNT,
  dailyStreak: 0,
  lastPlayedDate: '',
  lastDailyCompletionDate: '',
  lastDailyRewardDate: '',
  completedLevels: {},
  bestScores: {},
  bestTimes: {},
  hydrated: false,

  // —— Load all settings from Preferences ——
  loadFromPreferences: async () => {
    const [
      languageSelected,
      onboardingShown,
      language,
      soundEnabled,
      musicEnabled,
      hapticsEnabled,
      alias,
      removeAdsPurchased,
      hintCount,
      dailyStreak,
      lastPlayedDate,
      lastDailyCompletionDate,
      lastDailyRewardDate,
      completedLevels,
      bestScores,
      bestTimes,
      country,
      storedUid,
    ] = await Promise.all([
      prefGetBool(PREF_KEYS.LANGUAGE_SELECTED, false),
      prefGetBool(PREF_KEYS.ONBOARDING_SHOWN, false),
      prefGet(PREF_KEYS.LANGUAGE),
      prefGetBool(PREF_KEYS.SOUND_ENABLED, true),
      prefGetBool(PREF_KEYS.MUSIC_ENABLED, false),
      prefGetBool(PREF_KEYS.HAPTICS_ENABLED, true),
      prefGet(PREF_KEYS.ALIAS),
      prefGetBool(PREF_KEYS.REMOVE_ADS, false),
      prefGetNumber(PREF_KEYS.HINT_COUNT, DEFAULT_HINT_COUNT),
      prefGetNumber(PREF_KEYS.DAILY_STREAK, 0),
      prefGet(PREF_KEYS.LAST_PLAYED_DATE),
      prefGet(PREF_KEYS.LAST_DAILY_COMPLETION_DATE),
      prefGet(PREF_KEYS.LAST_DAILY_REWARD_DATE),
      prefGetJSON<CompletedLevels>(PREF_KEYS.COMPLETED_LEVELS, {}),
      prefGetJSON<BestScores>(PREF_KEYS.BEST_SCORES, {}),
      prefGetJSON<BestTimes>(PREF_KEYS.BEST_TIMES, {}),
      prefGet(PREF_KEYS.COUNTRY),
      prefGet(PREF_KEYS.PLAYER_UID),
    ]);

    // B-023: load the permanent UID, or generate + persist one on first launch.
    // Never regenerated once a value exists in Preferences.
    let playerUid = storedUid ?? '';
    if (!playerUid) {
      playerUid = generatePlayerUid();
      await prefSet(PREF_KEYS.PLAYER_UID, playerUid);
    }

    set({
      languageSelected,
      onboardingShown,
      language: (language as Language) ?? 'en',
      soundEnabled,
      musicEnabled,
      hapticsEnabled,
      alias: alias ?? '',
      removeAdsPurchased,
      hintCount,
      dailyStreak,
      lastPlayedDate: lastPlayedDate ?? '',
      lastDailyCompletionDate: lastDailyCompletionDate ?? '',
      lastDailyRewardDate: lastDailyRewardDate ?? '',
      completedLevels,
      bestScores,
      bestTimes,
      // T-005: stored country, else a best-effort guess from the device timezone.
      country: country ?? detectCountry(),
      playerUid, // B-023: permanent identity (loaded or freshly generated above)
      hydrated: true,
    });

    // Sync i18next with the loaded language.
    const loadedLang = (language as Language) ?? 'en';
    i18n.changeLanguage(loadedLang);
  },

  // —— Settings actions ——
  setLanguage: async (lang) => {
    set({ language: lang });
    await prefSet(PREF_KEYS.LANGUAGE, lang);
    i18n.changeLanguage(lang); // sync i18next with the store
  },
  setSoundEnabled: async (v) => {
    set({ soundEnabled: v });
    await prefSetBool(PREF_KEYS.SOUND_ENABLED, v);
  },
  setMusicEnabled: async (v) => {
    set({ musicEnabled: v });
    await prefSetBool(PREF_KEYS.MUSIC_ENABLED, v);
  },
  setHapticsEnabled: async (v) => {
    set({ hapticsEnabled: v });
    await prefSetBool(PREF_KEYS.HAPTICS_ENABLED, v);
  },
  setAlias: async (alias) => {
    // Enforce: max 16 chars, alphanumeric + underscore only
    const clean = alias.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
    set({ alias: clean });
    await prefSet(PREF_KEYS.ALIAS, clean);
  },
  setCountry: async (c) => {
    set({ country: c });
    await prefSet(PREF_KEYS.COUNTRY, c);
  },

  // —— Onboarding flags ——
  setLanguageSelected: async () => {
    set({ languageSelected: true });
    await prefSetBool(PREF_KEYS.LANGUAGE_SELECTED, true);
  },
  setOnboardingShown: async () => {
    set({ onboardingShown: true });
    await prefSetBool(PREF_KEYS.ONBOARDING_SHOWN, true);
  },

  // —— IAP ——
  setRemoveAds: async () => {
    set({ removeAdsPurchased: true });
    await prefSetBool(PREF_KEYS.REMOVE_ADS, true);
  },
  // —— Hint inventory (T-006) ——
  setHintCount: async (n) => {
    const next = Math.max(0, n);
    set({ hintCount: next });
    await prefSetNumber(PREF_KEYS.HINT_COUNT, next);
  },
  addHints: async (n) => {
    const next = get().hintCount + n;
    set({ hintCount: next });
    await prefSetNumber(PREF_KEYS.HINT_COUNT, next);
  },
  // F-005: gem-economy alias — credits the same hintCount balance shown as 💎.
  addGems: async (n) => {
    const next = get().hintCount + n;
    set({ hintCount: next });
    await prefSetNumber(PREF_KEYS.HINT_COUNT, next);
  },
  // F-005 Part 2: once-per-UTC-day daily-visit reward (3 gems). Idempotent per day.
  claimDailyGems: async (today) => {
    if (get().lastDailyRewardDate === today) return false; // already claimed today
    const next = get().hintCount + 3;
    set({ hintCount: next, lastDailyRewardDate: today });
    await Promise.all([
      prefSetNumber(PREF_KEYS.HINT_COUNT, next),
      prefSet(PREF_KEYS.LAST_DAILY_REWARD_DATE, today),
    ]);
    return true;
  },
  // Synchronous (returns the can-use result immediately so the UI can branch);
  // the Preferences write-through is fire-and-forget.
  consumeHint: () => {
    const current = get().hintCount;
    if (current <= 0) return false;
    const next = current - 1;
    set({ hintCount: next });
    prefSetNumber(PREF_KEYS.HINT_COUNT, next).catch((err) =>
      console.warn('[settingsStore] consumeHint persist failed:', err)
    );
    return true;
  },

  // —— Progress ——
  recordLevelComplete: async (levelId, stars, score, mode) => {
    const { completedLevels, bestScores } = get();

    // Update stars — only increase, never decrease
    const prevStars = completedLevels[levelId] ?? 0;
    const newCompleted = {
      ...completedLevels,
      [levelId]: Math.max(prevStars, stars),
    };

    // Update best score — only increase
    const scoreKey = `${mode}_${levelId}`;
    const prevScore = bestScores[scoreKey] ?? 0;
    const newBestScores = {
      ...bestScores,
      [scoreKey]: Math.max(prevScore, score),
    };

    set({ completedLevels: newCompleted, bestScores: newBestScores });
    await Promise.all([
      prefSetJSON(PREF_KEYS.COMPLETED_LEVELS, newCompleted),
      prefSetJSON(PREF_KEYS.BEST_SCORES, newBestScores),
    ]);
  },

  // T-002: persist a PB completion time under `${mode}_${levelId}`. Mirrors the
  // bestScores write-through (in-memory set + Preferences). The PB gate (only on a
  // best run) lives at the call site in campaignScores.submitCampaignScore.
  setBestTime: async (key, time) => {
    const next = { ...get().bestTimes, [key]: time };
    set({ bestTimes: next });
    await prefSetJSON(PREF_KEYS.BEST_TIMES, next);
  },

  // Updates dailyStreak and lastPlayedDate.
  // Call once per day when player completes daily challenge.
  updateDailyStreak: async () => {
    const { lastPlayedDate, dailyStreak } = get();
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    if (lastPlayedDate === today) return; // already counted today

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = lastPlayedDate === yesterday ? dailyStreak + 1 : 1;

    set({ dailyStreak: newStreak, lastPlayedDate: today });
    await Promise.all([
      prefSetNumber(PREF_KEYS.DAILY_STREAK, newStreak),
      prefSet(PREF_KEYS.LAST_PLAYED_DATE, today),
    ]);
  },

  // T-006: explicit streak setters used by the Daily Hub's SUBMIT / CLAIM flows
  // (which compute the new value via nextDailyStreak / reset to 0 on claim).
  setDailyStreak: async (n) => {
    const next = Math.max(0, n);
    set({ dailyStreak: next });
    await prefSetNumber(PREF_KEYS.DAILY_STREAK, next);
  },
  setLastDailyCompletionDate: async (d) => {
    set({ lastDailyCompletionDate: d });
    await prefSet(PREF_KEYS.LAST_DAILY_COMPLETION_DATE, d);
  },
}));
