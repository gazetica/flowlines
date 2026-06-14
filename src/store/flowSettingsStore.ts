// flowSettingsStore.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 6 | Task FL-S1-006
//
// Persistent player settings via Capacitor Preferences. Kept SEPARATE from
// Numtap's legacy src/store/settingsStore.ts. All keys use the FL_ prefix to
// avoid collision with Numtap's stored keys on a shared device.
//
// Exports `useFlowSettingsStore`. No Phaser, no React beyond Zustand.

import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';

// Preference key constants — FL_ prefix prevents collision with Numtap.
const KEYS = {
  ALIAS:           'FL_ALIAS',
  COUNTRY:         'FL_COUNTRY',
  PLAYER_UID:      'FL_PLAYER_UID',
  GEM_BALANCE:     'FL_GEM_BALANCE',
  REMOVE_ADS:      'FL_REMOVE_ADS',
  SOUND_ENABLED:   'FL_SOUND_ENABLED',
  MUSIC_ENABLED:   'FL_MUSIC_ENABLED',
  HAPTICS_ENABLED: 'FL_HAPTICS_ENABLED',
  LANGUAGE:        'FL_LANGUAGE',
  PACK_PROGRESS:   'FL_PACK_PROGRESS',
  DAILY_STREAK:    'FL_DAILY_STREAK',
  LAST_DAILY:      'FL_LAST_DAILY_DATE',
  FIRST_LAUNCH:    'FL_FIRST_LAUNCH',
  CONSENT_REQ:     'FL_CONSENT_REQUESTED',
} as const;

interface PackLevelProgress {
  solved: number;
  stars: Record<string, 0 | 1 | 2 | 3>;
}

interface FlowSettingsState {
  // Player identity
  alias: string;
  country: string;
  playerUid: string;   // NTxxxxxx format — shared with Numtap cross-game

  // Economy
  gemBalance: number;
  removeAdsPurchased: boolean;

  // Preferences
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  language: string;

  // Progress
  packProgress: Record<number, PackLevelProgress>;
  dailyStreakFL: number;
  lastDailyDateFL: string;

  // Onboarding
  firstLaunchComplete: boolean;
  consentRequested: boolean;

  // Hydration flag
  hydrated: boolean;

  // Actions
  setAlias: (v: string) => Promise<void>;
  setCountry: (v: string) => Promise<void>;
  setLanguage: (v: string) => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleMusic: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
  addGems: (n: number) => Promise<void>;
  setRemoveAds: (v: boolean) => Promise<void>;
  markLevelSolved: (packId: number, levelId: string, stars: 1 | 2 | 3) => Promise<void>;
  saveStars: (levelId: string, packId: number, stars: 0 | 1 | 2 | 3) => void;
  incrementDailyStreak: () => Promise<void>;
  resetDailyStreak: () => Promise<void>;
  completeFirstLaunch: () => void;
  markConsentRequested: () => void;
  hydrate: () => Promise<void>;
}

export const useFlowSettingsStore = create<FlowSettingsState>((set, get) => ({
  alias: '',
  country: 'IN',
  playerUid: '',
  gemBalance: 0,
  removeAdsPurchased: false,
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  language: 'en',
  packProgress: {},
  dailyStreakFL: 0,
  lastDailyDateFL: '',
  firstLaunchComplete: false,
  consentRequested: false,
  hydrated: false,

  setAlias: async (v) => {
    await Preferences.set({ key: KEYS.ALIAS, value: v });
    set({ alias: v });
  },

  setCountry: async (v) => {
    await Preferences.set({ key: KEYS.COUNTRY, value: v });
    set({ country: v });
  },

  setLanguage: async (v) => {
    await Preferences.set({ key: KEYS.LANGUAGE, value: v });
    set({ language: v });
  },

  toggleSound: async () => {
    const next = !get().soundEnabled;
    await Preferences.set({ key: KEYS.SOUND_ENABLED, value: String(next) });
    set({ soundEnabled: next });
  },

  toggleMusic: async () => {
    const next = !get().musicEnabled;
    await Preferences.set({ key: KEYS.MUSIC_ENABLED, value: String(next) });
    set({ musicEnabled: next });
  },

  toggleHaptics: async () => {
    const next = !get().hapticsEnabled;
    await Preferences.set({ key: KEYS.HAPTICS_ENABLED, value: String(next) });
    set({ hapticsEnabled: next });
  },

  addGems: async (n) => {
    const next = get().gemBalance + n;
    await Preferences.set({ key: KEYS.GEM_BALANCE, value: String(next) });
    set({ gemBalance: next });
  },

  setRemoveAds: async (v) => {
    await Preferences.set({ key: KEYS.REMOVE_ADS, value: String(v) });
    set({ removeAdsPurchased: v });
  },

  markLevelSolved: async (packId, levelId, stars) => {
    const progress = { ...get().packProgress };
    if (!progress[packId]) progress[packId] = { solved: 0, stars: {} };
    const pack = { ...progress[packId], stars: { ...progress[packId].stars } };
    const existing = pack.stars[levelId] ?? 0;
    if (stars > existing) pack.stars[levelId] = stars;
    pack.solved = Object.keys(pack.stars).length;
    progress[packId] = pack;
    await Preferences.set({ key: KEYS.PACK_PROGRESS, value: JSON.stringify(progress) });
    set({ packProgress: progress });
  },

  // saveStars — called from flowGameStore.triggerWin. Never downgrades stars;
  // increments `solved` on first completion of a level. Persists synchronously
  // to state and fire-and-forgets the Preferences write. NOTE: uses the same
  // KEYS.PACK_PROGRESS ('FL_PACK_PROGRESS') key that hydrate() reads, so stars
  // round-trip on restart (the brief's literal 'packProgress' key would not).
  saveStars: (levelId, packId, stars) => {
    const progress = { ...get().packProgress };
    const existingPack = progress[packId] ?? { solved: 0, stars: {} };
    const pack = { ...existingPack, stars: { ...existingPack.stars } };
    const isFirstCompletion = !(levelId in pack.stars);
    const previous = pack.stars[levelId] ?? 0;
    if (stars >= previous) pack.stars[levelId] = stars;
    if (isFirstCompletion) pack.solved = pack.solved + 1;
    progress[packId] = pack;
    set({ packProgress: progress });
    void Preferences.set({ key: KEYS.PACK_PROGRESS, value: JSON.stringify(progress) });
  },

  incrementDailyStreak: async () => {
    const next = get().dailyStreakFL + 1;
    const today = new Date().toISOString().split('T')[0];
    await Preferences.set({ key: KEYS.DAILY_STREAK, value: String(next) });
    await Preferences.set({ key: KEYS.LAST_DAILY, value: today });
    set({ dailyStreakFL: next, lastDailyDateFL: today });
  },

  resetDailyStreak: async () => {
    await Preferences.set({ key: KEYS.DAILY_STREAK, value: '0' });
    set({ dailyStreakFL: 0 });
  },

  // completeFirstLaunch — called at the end of the onboarding flow (after the
  // tutorial's START PLAYING). Marks onboarding done so Splash routes straight
  // to /home on subsequent launches. Fire-and-forget Preferences write.
  completeFirstLaunch: () => {
    set({ firstLaunchComplete: true });
    void Preferences.set({ key: KEYS.FIRST_LAUNCH, value: 'true' });
  },

  // markConsentRequested — set once the UMP consent flow has been triggered
  // (FL-UX-B: deferred to after the first win) so it never fires twice.
  markConsentRequested: () => {
    set({ consentRequested: true });
    void Preferences.set({ key: KEYS.CONSENT_REQ, value: 'true' });
  },

  // Hydrate — called once on app startup to load persisted state.
  hydrate: async () => {
    const read = async (key: string) =>
      (await Preferences.get({ key })).value ?? '';

    const alias = (await read(KEYS.ALIAS)) || '';
    const country = (await read(KEYS.COUNTRY)) || 'IN';
    const language = (await read(KEYS.LANGUAGE)) || 'en';
    const sound = (await read(KEYS.SOUND_ENABLED)) !== 'false';
    const music = (await read(KEYS.MUSIC_ENABLED)) !== 'false';
    const haptics = (await read(KEYS.HAPTICS_ENABLED)) !== 'false';
    const gems = parseInt((await read(KEYS.GEM_BALANCE)) || '0', 10);
    const removeAds = (await read(KEYS.REMOVE_ADS)) === 'true';
    const streak = parseInt((await read(KEYS.DAILY_STREAK)) || '0', 10);
    const lastDaily = (await read(KEYS.LAST_DAILY)) || '';
    const firstLaunchComplete = (await read(KEYS.FIRST_LAUNCH)) === 'true';
    const consentRequested = (await read(KEYS.CONSENT_REQ)) === 'true';

    let packProgress: Record<number, PackLevelProgress> = {};
    try {
      const raw = await read(KEYS.PACK_PROGRESS);
      if (raw) packProgress = JSON.parse(raw);
    } catch {
      /* ignore parse errors — fall back to empty progress */
    }

    // Generate or load the player UID (NTxxxxxx — shared cross-game identity).
    let playerUid = await read(KEYS.PLAYER_UID);
    if (!playerUid) {
      playerUid = 'NT' + Math.random().toString(36).slice(2, 8).toUpperCase();
      await Preferences.set({ key: KEYS.PLAYER_UID, value: playerUid });
    }

    set({
      alias,
      country,
      language,
      playerUid,
      soundEnabled: sound,
      musicEnabled: music,
      hapticsEnabled: haptics,
      gemBalance: gems,
      removeAdsPurchased: removeAds,
      dailyStreakFL: streak,
      lastDailyDateFL: lastDaily,
      firstLaunchComplete,
      consentRequested,
      packProgress,
      hydrated: true,
    });
  },
}));
