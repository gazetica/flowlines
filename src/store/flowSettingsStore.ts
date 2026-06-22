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
import type { Difficulty } from '../types/level';

// Preference key constants — FL_ prefix prevents collision with Numtap.
const KEYS = {
  ALIAS:           'FL_ALIAS',
  COUNTRY:         'FL_COUNTRY',
  PLAYER_UID:      'FL_PLAYER_UID',
  GEM_BALANCE:     'FL_GEM_BALANCE',
  REMOVE_ADS:      'FL_REMOVE_ADS',
  UNLOCK_ALL:      'FL_UNLOCK_ALL',   // FL-5A-029: Unlock All Levels IAP
  SOUND_ENABLED:   'FL_SOUND_ENABLED',
  MUSIC_ENABLED:   'FL_MUSIC_ENABLED',
  HAPTICS_ENABLED: 'FL_HAPTICS_ENABLED',
  LANGUAGE:        'FL_LANGUAGE',
  PACK_PROGRESS:   'FL_PACK_PROGRESS',
  DAILY_STREAK:    'FL_DAILY_STREAK',
  LAST_DAILY:      'FL_LAST_DAILY_DATE',
  LAST_DAILY_VISIT: 'FL_LAST_DAILY_VISIT_DATE', // FL-UX-D-015: +1 gem per day visited
  FIRST_LAUNCH:    'FL_FIRST_LAUNCH',
  CONSENT_REQ:     'FL_CONSENT_REQUESTED',
  NOTIF_SCHED:     'FL_NOTIF_SCHEDULED',
  DEV_UNLOCK:      'FL_DEV_UNLOCK',    // FL-5B-006 / T-018: QA dev unlock (temporary — removed in FL-5B-003)
  CAMPAIGN_PROG:   'FL_CAMPAIGN_PROGRESS',
  CLASSIC_PROG:    'FL_CLASSIC_PROGRESS',
  DAILY_PROG:      'FL_DAILY_PROGRESS',
  ZEN_CONFIG:      'FL_ZEN_CONFIG',
} as const;

// FL-UX-D-007: last-used Zen session configuration (persisted across launches).
export interface ZenConfig {
  grid: 6 | 7 | 8 | 9;
  difficulty: Difficulty;
  timerSeconds: number; // 0 = off
  moveLimit: number;    // 0 = off
}
function defaultZenConfig(): ZenConfig {
  return { grid: 6, difficulty: 'easy', timerSeconds: 0, moveLimit: 0 };
}

interface PackLevelProgress {
  solved: number;
  stars: Record<string, 0 | 1 | 2 | 3>;
}

// FL-UX-D-004: per-mode progression (Campaign / Classic tracked independently).
export interface PackModeProgress {
  solved: number;
  stars: Record<string, 0 | 1 | 2 | 3>;
  bestScores: Record<string, number>;
  bestTimes: Record<string, number>;  // Campaign — fastest timeElapsed (seconds)
  bestMoves: Record<string, number>;  // Classic — fewest gesture moves
  highestLevelReached: number;         // 1-indexed
}

export interface DailyProgress {
  lastDailyDate: string;
  campaignChallengeComplete: boolean;
  classicChallengeComplete: boolean;
  campaignRetryCount: number; // attempts made on C1 today (0..3); C2 unlocks at >=1
  classicRetryCount: number;  // attempts made on C2 today (0..3)
  streakCount: number;
  lastStreakDate: string;
  gemRewardClaimed: boolean;   // FL-UX-D-010: both-challenge gem reward claimed today
}

type ModeProgress = Record<number, PackModeProgress>;

function defaultPackModeProgress(): PackModeProgress {
  return { solved: 0, stars: {}, bestScores: {}, bestTimes: {}, bestMoves: {}, highestLevelReached: 1 };
}
// Fresh objects per pack (no shared references).
function defaultModeProgress(): ModeProgress {
  return { 1: defaultPackModeProgress(), 2: defaultPackModeProgress(), 3: defaultPackModeProgress(), 4: defaultPackModeProgress() };
}
function defaultDailyProgress(): DailyProgress {
  return { lastDailyDate: '', campaignChallengeComplete: false, classicChallengeComplete: false, campaignRetryCount: 0, classicRetryCount: 0, streakCount: 0, lastStreakDate: '', gemRewardClaimed: false };
}
const utcDay = (ms = Date.now()): string => new Date(ms).toISOString().slice(0, 10);

interface FlowSettingsState {
  // Player identity
  alias: string;
  country: string;
  playerUid: string;   // NTxxxxxx format — shared with Numtap cross-game

  // Economy
  gemBalance: number;
  removeAdsPurchased: boolean;
  unlockAllPurchased: boolean; // FL-5A-029: bypasses all sequential + pack unlock gates
  devUnlockActive: boolean;    // FL-5B-006 / T-018: QA-only unlock toggle (NOT the IAP — temporary, removed in FL-5B-003)

  // Preferences
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  language: string;

  // Progress (legacy single-mode — still read by HomeScreen/PackSelect/LevelSelect/Result)
  packProgress: Record<number, PackLevelProgress>;
  dailyStreakFL: number;
  lastDailyDateFL: string;
  lastDailyVisitDate: string; // FL-UX-D-015: UTC day the +1 visit gem was last granted

  // FL-UX-D-004 per-mode progression
  campaignProgress: ModeProgress;
  classicProgress: ModeProgress;
  dailyProgress: DailyProgress;

  // FL-UX-D-007 Zen session config
  zenConfig: ZenConfig;

  // Onboarding
  firstLaunchComplete: boolean;
  consentRequested: boolean;
  notificationScheduled: boolean;

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
  claimDailyVisitGem: () => void;
  setRemoveAds: (v: boolean) => Promise<void>;
  setUnlockAll: () => void; // FL-5A-029
  setDevUnlockActive: (value: boolean) => void; // FL-5B-006 / T-018 (temporary)
  markLevelSolved: (packId: number, levelId: string, stars: 1 | 2 | 3) => Promise<void>;
  saveStars: (levelId: string, packId: number, stars: 0 | 1 | 2 | 3) => void;
  incrementDailyStreak: () => Promise<void>;
  resetDailyStreak: () => Promise<void>;
  completeFirstLaunch: () => void;
  markConsentRequested: () => void;
  markNotificationScheduled: () => void;

  // FL-UX-D-004 mode actions
  recordLevelComplete: (params: {
    mode: 'campaign' | 'classic' | 'daily_campaign' | 'daily_classic';
    packId: number;
    levelId: string;
    levelIndex: number;
    stars: 0 | 1 | 2 | 3;
    score: number;
    timeElapsed: number;
    gestureCount: number;
  }) => void;
  isPackUnlocked: (packId: number, mode: 'campaign' | 'classic') => boolean;
  recordDailyComplete: (challenge: 'campaign' | 'classic') => void;
  incrementDailyRetry: (challenge: 'campaign' | 'classic') => void;
  claimDailyGemReward: () => void;
  resetDailyIfNewDay: () => void;
  setZenConfig: (config: Partial<ZenConfig>) => void;

  hydrate: () => Promise<void>;
}

export const useFlowSettingsStore = create<FlowSettingsState>((set, get) => ({
  alias: '',
  country: 'IN',
  playerUid: '',
  gemBalance: 0,
  removeAdsPurchased: false,
  unlockAllPurchased: false,
  devUnlockActive: false,
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  language: 'en',
  packProgress: {},
  dailyStreakFL: 0,
  lastDailyDateFL: '',
  lastDailyVisitDate: '',
  campaignProgress: defaultModeProgress(),
  classicProgress: defaultModeProgress(),
  dailyProgress: defaultDailyProgress(),
  zenConfig: defaultZenConfig(),
  firstLaunchComplete: false,
  consentRequested: false,
  notificationScheduled: false,
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

  // FL-UX-D-015: grant +1 gem the first time the player opens the app each UTC day.
  // Idempotent — safe to call on every HomeScreen mount (guarded by lastDailyVisitDate).
  claimDailyVisitGem: () => {
    const today = utcDay();
    if (get().lastDailyVisitDate === today) return;
    const gemBalance = get().gemBalance + 1;
    set({ lastDailyVisitDate: today, gemBalance });
    void Preferences.set({ key: KEYS.LAST_DAILY_VISIT, value: today });
    void Preferences.set({ key: KEYS.GEM_BALANCE, value: String(gemBalance) });
  },

  setRemoveAds: async (v) => {
    await Preferences.set({ key: KEYS.REMOVE_ADS, value: String(v) });
    set({ removeAdsPurchased: v });
  },

  // FL-5A-029: Unlock All Levels IAP — non-consumable, permanent. Persisted so the
  // entitlement survives restarts (same pattern as removeAdsPurchased).
  setUnlockAll: () => {
    set({ unlockAllPurchased: true });
    void Preferences.set({ key: KEYS.UNLOCK_ALL, value: 'true' });
  },

  // FL-5B-006 / T-018: QA-only dev unlock toggle. Separate field from the IAP
  // (unlockAllPurchased is NEVER set by this). When true, all pack/level gates
  // behave as if Unlock All were purchased. Persisted so it survives kill/reopen.
  // TEMPORARY — this action and FL_DEV_UNLOCK are removed in FL-5B-003.
  setDevUnlockActive: (value) => {
    set({ devUnlockActive: value });
    void Preferences.set({ key: KEYS.DEV_UNLOCK, value: String(value) });
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

  // markNotificationScheduled — set once the daily reminder has been scheduled
  // (FL-UX-C: after first win) so the permission is never requested twice.
  markNotificationScheduled: () => {
    set({ notificationScheduled: true });
    void Preferences.set({ key: KEYS.NOTIF_SCHED, value: 'true' });
  },

  // ─── FL-UX-D-004 mode actions ──────────────────────────────────────────────

  recordLevelComplete: (p) => {
    const isClassic = p.mode === 'classic' || p.mode === 'daily_classic';
    const all: ModeProgress = { ...(isClassic ? get().classicProgress : get().campaignProgress) };
    const base = all[p.packId] ?? defaultPackModeProgress();
    const pack: PackModeProgress = {
      ...base,
      stars: { ...base.stars },
      bestScores: { ...base.bestScores },
      bestTimes: { ...base.bestTimes },
      bestMoves: { ...base.bestMoves },
    };

    const isFirst = !(p.levelId in pack.stars);
    if (p.stars >= (pack.stars[p.levelId] ?? 0)) pack.stars[p.levelId] = p.stars;
    if (p.score > (pack.bestScores[p.levelId] ?? -1)) pack.bestScores[p.levelId] = p.score;
    if (isClassic) {
      const prev = pack.bestMoves[p.levelId];
      if (prev === undefined || p.gestureCount < prev) pack.bestMoves[p.levelId] = p.gestureCount;
    } else {
      const prev = pack.bestTimes[p.levelId];
      if (prev === undefined || p.timeElapsed < prev) pack.bestTimes[p.levelId] = p.timeElapsed;
    }
    if (isFirst) pack.solved += 1;
    pack.highestLevelReached = Math.max(pack.highestLevelReached, p.levelIndex + 1);

    all[p.packId] = pack;
    if (isClassic) {
      set({ classicProgress: all });
      void Preferences.set({ key: KEYS.CLASSIC_PROG, value: JSON.stringify(all) });
    } else {
      set({ campaignProgress: all });
      void Preferences.set({ key: KEYS.CAMPAIGN_PROG, value: JSON.stringify(all) });
    }
  },

  // Unlock thresholds (per mode, independent). FL-5A-029 / Registry v1.1 §12:
  // each pack now requires ALL 50 levels of the PREVIOUS pack (P2←P1, P3←P2, P4←P3).
  // The Unlock All Levels IAP bypasses every gate.
  isPackUnlocked: (packId, mode) => {
    if (get().unlockAllPurchased) return true; // FL-5A-029 IAP bypass
    if (get().devUnlockActive) return true;    // FL-5B-006 / T-018 QA dev unlock (temporary)
    const prog = mode === 'classic' ? get().classicProgress : get().campaignProgress;
    const solved = (pk: number) => prog[pk]?.solved ?? 0;
    switch (packId) {
      case 1: return true;
      case 2: return solved(1) >= 50;
      case 3: return solved(2) >= 50;
      case 4: return solved(3) >= 50;
      default: return false;
    }
  },

  // Mark a Daily challenge complete. When BOTH (campaign + classic) are done for
  // the day, bump the streak (once per day, guarded by lastStreakDate). FL-UX-D-010:
  // the 3-gem reward is NO LONGER auto-awarded here — the player claims it manually
  // via claimDailyGemReward() on the DailyScreen.
  recordDailyComplete: (challenge) => {
    const dp: DailyProgress = { ...get().dailyProgress };
    if (challenge === 'campaign') dp.campaignChallengeComplete = true;
    else dp.classicChallengeComplete = true;

    const today = utcDay();
    if (dp.campaignChallengeComplete && dp.classicChallengeComplete && dp.lastStreakDate !== today) {
      dp.streakCount += 1;
      dp.lastStreakDate = today;
    }

    set({ dailyProgress: dp });
    void Preferences.set({ key: KEYS.DAILY_PROG, value: JSON.stringify(dp) });
  },

  // FL-UX-D-010: count an attempt on a daily challenge (incremented each launch,
  // pass or fail). C2 unlocks once campaignRetryCount >= 1. Capped at 3 attempts.
  incrementDailyRetry: (challenge) => {
    const dp: DailyProgress = { ...get().dailyProgress };
    if (challenge === 'campaign') dp.campaignRetryCount = Math.min(3, dp.campaignRetryCount + 1);
    else dp.classicRetryCount = Math.min(3, dp.classicRetryCount + 1);
    set({ dailyProgress: dp });
    void Preferences.set({ key: KEYS.DAILY_PROG, value: JSON.stringify(dp) });
  },

  // FL-UX-D-010 / 015b: manual claim of the both-challenges-complete gem reward.
  // Adds 2 gems exactly once per day; a no-op unless both challenges are done and unclaimed.
  claimDailyGemReward: () => {
    const dp = get().dailyProgress;
    if (dp.campaignChallengeComplete && dp.classicChallengeComplete && !dp.gemRewardClaimed) {
      const next: DailyProgress = { ...dp, gemRewardClaimed: true };
      set({ dailyProgress: next });
      void Preferences.set({ key: KEYS.DAILY_PROG, value: JSON.stringify(next) });
      void get().addGems(2);
    }
  },

  // FL-UX-D-007: merge + persist the last-used Zen session config.
  setZenConfig: (config) => {
    const next: ZenConfig = { ...get().zenConfig, ...config };
    set({ zenConfig: next });
    void Preferences.set({ key: KEYS.ZEN_CONFIG, value: JSON.stringify(next) });
  },

  // Reset per-day daily flags when the UTC day rolls over; reset the streak if the
  // last streak day was more than one day ago.
  resetDailyIfNewDay: () => {
    const today = utcDay();
    const yesterday = utcDay(Date.now() - 86400000);
    const dp: DailyProgress = { ...get().dailyProgress };
    let changed = false;
    if (dp.lastDailyDate !== today) {
      dp.lastDailyDate = today;
      dp.campaignChallengeComplete = false;
      dp.classicChallengeComplete = false;
      dp.campaignRetryCount = 0;
      dp.classicRetryCount = 0;
      dp.gemRewardClaimed = false; // FL-UX-D-010: reward re-claimable each new day
      changed = true;
    }
    if (dp.lastStreakDate && dp.lastStreakDate !== today && dp.lastStreakDate !== yesterday && dp.streakCount !== 0) {
      dp.streakCount = 0;
      changed = true;
    }
    if (changed) {
      set({ dailyProgress: dp });
      void Preferences.set({ key: KEYS.DAILY_PROG, value: JSON.stringify(dp) });
    }
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
    const unlockAll = (await read(KEYS.UNLOCK_ALL)) === 'true';
    const devUnlock = (await read(KEYS.DEV_UNLOCK)) === 'true'; // FL-5B-006 / T-018 (temporary)
    const streak = parseInt((await read(KEYS.DAILY_STREAK)) || '0', 10);
    const lastDaily = (await read(KEYS.LAST_DAILY)) || '';
    const lastDailyVisit = (await read(KEYS.LAST_DAILY_VISIT)) || '';
    const firstLaunchComplete = (await read(KEYS.FIRST_LAUNCH)) === 'true';
    const consentRequested = (await read(KEYS.CONSENT_REQ)) === 'true';
    const notificationScheduled = (await read(KEYS.NOTIF_SCHED)) === 'true';

    let packProgress: Record<number, PackLevelProgress> = {};
    try {
      const raw = await read(KEYS.PACK_PROGRESS);
      if (raw) packProgress = JSON.parse(raw);
    } catch {
      /* ignore parse errors — fall back to empty progress */
    }

    // FL-UX-D-004 per-mode progress (+ V1→V2 migration of legacy packProgress).
    const parseProg = (raw: string): ModeProgress | null => {
      try { return raw ? (JSON.parse(raw) as ModeProgress) : null; } catch { return null; }
    };
    const campaignRaw = await read(KEYS.CAMPAIGN_PROG);
    let campaignProgress = parseProg(campaignRaw) ?? defaultModeProgress();
    const classicProgress = parseProg(await read(KEYS.CLASSIC_PROG)) ?? defaultModeProgress();

    // One-time migration: if no campaignProgress yet but legacy packProgress has
    // data, fold it into Campaign (old single-mode progress was Campaign play).
    // packProgress itself is kept (screens still read it) — not deleted.
    if (!campaignRaw && Object.keys(packProgress).length > 0) {
      campaignProgress = defaultModeProgress();
      for (const pk of Object.keys(packProgress)) {
        const old = packProgress[Number(pk)];
        campaignProgress[Number(pk)] = { ...defaultPackModeProgress(), solved: old.solved ?? 0, stars: { ...(old.stars ?? {}) } };
      }
      await Preferences.set({ key: KEYS.CAMPAIGN_PROG, value: JSON.stringify(campaignProgress) });
    }

    let dailyProgress = defaultDailyProgress();
    try {
      const raw = await read(KEYS.DAILY_PROG);
      if (raw) dailyProgress = { ...dailyProgress, ...JSON.parse(raw) };
    } catch { /* ignore */ }

    let zenConfig = defaultZenConfig();
    try {
      const raw = await read(KEYS.ZEN_CONFIG);
      if (raw) zenConfig = { ...zenConfig, ...JSON.parse(raw) };
    } catch { /* ignore */ }

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
      unlockAllPurchased: unlockAll,
      devUnlockActive: devUnlock,
      dailyStreakFL: streak,
      lastDailyDateFL: lastDaily,
      lastDailyVisitDate: lastDailyVisit,
      firstLaunchComplete,
      consentRequested,
      notificationScheduled,
      packProgress,
      campaignProgress,
      classicProgress,
      dailyProgress,
      zenConfig,
      hydrated: true,
    });
  },
}));
