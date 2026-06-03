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

  // IAP
  removeAdsPurchased: boolean;
  hintPackCount: number;

  // Progress
  dailyStreak: number;
  lastPlayedDate: string; // ISO date string 'YYYY-MM-DD' or ''
  completedLevels: CompletedLevels;
  bestScores: BestScores;

  // Hydration flag — true once loadFromPreferences completes
  hydrated: boolean;

  // Actions
  loadFromPreferences: () => Promise<void>;

  setLanguage: (lang: Language) => Promise<void>;
  setSoundEnabled: (v: boolean) => Promise<void>;
  setMusicEnabled: (v: boolean) => Promise<void>;
  setHapticsEnabled: (v: boolean) => Promise<void>;
  setAlias: (alias: string) => Promise<void>;

  setLanguageSelected: () => Promise<void>;
  setOnboardingShown: () => Promise<void>;

  setRemoveAds: () => Promise<void>;
  decrementHints: () => Promise<void>;
  addHints: (n: number) => Promise<void>;

  recordLevelComplete: (levelId: number, stars: number, score: number, mode: string) => Promise<void>;
  updateDailyStreak: () => Promise<void>;
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
  removeAdsPurchased: false,
  hintPackCount: 0,
  dailyStreak: 0,
  lastPlayedDate: '',
  completedLevels: {},
  bestScores: {},
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
      hintPackCount,
      dailyStreak,
      lastPlayedDate,
      completedLevels,
      bestScores,
    ] = await Promise.all([
      prefGetBool(PREF_KEYS.LANGUAGE_SELECTED, false),
      prefGetBool(PREF_KEYS.ONBOARDING_SHOWN, false),
      prefGet(PREF_KEYS.LANGUAGE),
      prefGetBool(PREF_KEYS.SOUND_ENABLED, true),
      prefGetBool(PREF_KEYS.MUSIC_ENABLED, false),
      prefGetBool(PREF_KEYS.HAPTICS_ENABLED, true),
      prefGet(PREF_KEYS.ALIAS),
      prefGetBool(PREF_KEYS.REMOVE_ADS, false),
      prefGetNumber(PREF_KEYS.HINT_PACK_COUNT, 0),
      prefGetNumber(PREF_KEYS.DAILY_STREAK, 0),
      prefGet(PREF_KEYS.LAST_PLAYED_DATE),
      prefGetJSON<CompletedLevels>(PREF_KEYS.COMPLETED_LEVELS, {}),
      prefGetJSON<BestScores>(PREF_KEYS.BEST_SCORES, {}),
    ]);

    set({
      languageSelected,
      onboardingShown,
      language: (language as Language) ?? 'en',
      soundEnabled,
      musicEnabled,
      hapticsEnabled,
      alias: alias ?? '',
      removeAdsPurchased,
      hintPackCount,
      dailyStreak,
      lastPlayedDate: lastPlayedDate ?? '',
      completedLevels,
      bestScores,
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
  decrementHints: async () => {
    const current = get().hintPackCount;
    const next = Math.max(0, current - 1);
    set({ hintPackCount: next });
    await prefSetNumber(PREF_KEYS.HINT_PACK_COUNT, next);
  },
  addHints: async (n) => {
    const next = get().hintPackCount + n;
    set({ hintPackCount: next });
    await prefSetNumber(PREF_KEYS.HINT_PACK_COUNT, next);
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
}));
