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
  NOTIF_SCHED:     'FL_NOTIF_SCHEDULED',
  CAMPAIGN_PROG:   'FL_CAMPAIGN_PROGRESS',
  CLASSIC_PROG:    'FL_CLASSIC_PROGRESS',
  DAILY_PROG:      'FL_DAILY_PROGRESS',
} as const;

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
  campaignRetryCount: number;
  classicRetryCount: number;
  streakCount: number;
  lastStreakDate: string;
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
  return { lastDailyDate: '', campaignChallengeComplete: false, classicChallengeComplete: false, campaignRetryCount: 0, classicRetryCount: 0, streakCount: 0, lastStreakDate: '' };
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

  // Preferences
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  language: string;

  // Progress (legacy single-mode — still read by HomeScreen/PackSelect/LevelSelect/Result)
  packProgress: Record<number, PackLevelProgress>;
  dailyStreakFL: number;
  lastDailyDateFL: string;

  // FL-UX-D-004 per-mode progression
  campaignProgress: ModeProgress;
  classicProgress: ModeProgress;
  dailyProgress: DailyProgress;

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
  setRemoveAds: (v: boolean) => Promise<void>;
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
  resetDailyIfNewDay: () => void;

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
  campaignProgress: defaultModeProgress(),
  classicProgress: defaultModeProgress(),
  dailyProgress: defaultDailyProgress(),
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

  // Unlock thresholds (per mode, independent): P2 ≥25 in P1; P3 ≥50 in P1; P4 ≥50 in P2.
  isPackUnlocked: (packId, mode) => {
    const prog = mode === 'classic' ? get().classicProgress : get().campaignProgress;
    const solved = (pk: number) => prog[pk]?.solved ?? 0;
    switch (packId) {
      case 1: return true;
      case 2: return solved(1) >= 25;
      case 3: return solved(1) >= 50;
      case 4: return solved(2) >= 50;
      default: return false;
    }
  },

  // Mark a Daily challenge complete. When BOTH (campaign + classic) are done for
  // the day, bump the streak + award 3 gems (and +7 on every 7th day). Guarded by
  // lastStreakDate so the award fires once per day.
  recordDailyComplete: (challenge) => {
    const dp: DailyProgress = { ...get().dailyProgress };
    if (challenge === 'campaign') dp.campaignChallengeComplete = true;
    else dp.classicChallengeComplete = true;

    const today = utcDay();
    let gemAward = 0;
    if (dp.campaignChallengeComplete && dp.classicChallengeComplete && dp.lastStreakDate !== today) {
      dp.streakCount += 1;
      dp.lastStreakDate = today;
      gemAward = 3;
      if (dp.streakCount % 7 === 0) gemAward += 7;
    }

    set({ dailyProgress: dp });
    void Preferences.set({ key: KEYS.DAILY_PROG, value: JSON.stringify(dp) });
    if (gemAward > 0) void get().addGems(gemAward);
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
    const streak = parseInt((await read(KEYS.DAILY_STREAK)) || '0', 10);
    const lastDaily = (await read(KEYS.LAST_DAILY)) || '';
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
      notificationScheduled,
      packProgress,
      campaignProgress,
      classicProgress,
      dailyProgress,
      hydrated: true,
    });
  },
}));
