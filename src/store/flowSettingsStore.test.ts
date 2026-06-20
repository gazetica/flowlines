// flowSettingsStore.test.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-004
//
// Covers the mode-progress split + daily progress added in FL-UX-D-004:
// recordLevelComplete, isPackUnlocked, recordDailyComplete (streak + gems),
// resetDailyIfNewDay. Uses an in-memory Preferences mock.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mem.has(key) ? mem.get(key)! : null }),
    set: async ({ key, value }: { key: string; value: string }) => { mem.set(key, value); },
    remove: async ({ key }: { key: string }) => { mem.delete(key); },
  },
}));

import { useFlowSettingsStore } from './flowSettingsStore';

const set = () => useFlowSettingsStore.getState();
const tick = () => new Promise((r) => setTimeout(r, 0));

const dpp = () => ({ solved: 0, stars: {}, bestScores: {}, bestTimes: {}, bestMoves: {}, highestLevelReached: 1 });
const dmp = () => ({ 1: dpp(), 2: dpp(), 3: dpp(), 4: dpp() });

function reset() {
  mem.clear();
  useFlowSettingsStore.setState({
    campaignProgress: dmp(),
    classicProgress: dmp(),
    dailyProgress: { lastDailyDate: '', campaignChallengeComplete: false, classicChallengeComplete: false, campaignRetryCount: 0, classicRetryCount: 0, streakCount: 0, lastStreakDate: '', gemRewardClaimed: false },
    gemBalance: 0,
    lastDailyVisitDate: '',
    firstLaunchComplete: false,
    unlockAllPurchased: false,
  });
}

beforeEach(reset);

describe('claimDailyVisitGem (FL-UX-D-015)', () => {
  const today = () => new Date().toISOString().slice(0, 10);

  it('adds 1 gem on the first call of the day', () => {
    useFlowSettingsStore.setState({ lastDailyVisitDate: '2000-01-01', gemBalance: 5 });
    set().claimDailyVisitGem();
    expect(set().gemBalance).toBe(6);
    expect(set().lastDailyVisitDate).toBe(today());
  });

  it('does not add a gem if already claimed today', () => {
    useFlowSettingsStore.setState({ lastDailyVisitDate: today(), gemBalance: 5 });
    set().claimDailyVisitGem();
    expect(set().gemBalance).toBe(5);
  });
});

// FL-UX-D-020: onboarding gate — Splash routes to /language until this is true.
describe('firstLaunchComplete', () => {
  it('defaults to false on a fresh store', () => {
    expect(set().firstLaunchComplete).toBe(false);
  });

  it('completeFirstLaunch sets it to true', () => {
    set().completeFirstLaunch();
    expect(set().firstLaunchComplete).toBe(true);
  });

  it('once true, stays true (idempotent)', () => {
    set().completeFirstLaunch();
    set().completeFirstLaunch();
    expect(set().firstLaunchComplete).toBe(true);
  });
});

describe('recordLevelComplete', () => {
  it('updates campaignProgress (solved/stars/bestScore/bestTime)', () => {
    set().recordLevelComplete({ mode: 'campaign', packId: 1, levelId: 'p1_001', levelIndex: 1, stars: 3, score: 900, timeElapsed: 30, gestureCount: 5 });
    const cp = set().campaignProgress[1];
    expect(cp.solved).toBe(1);
    expect(cp.stars['p1_001']).toBe(3);
    expect(cp.bestScores['p1_001']).toBe(900);
    expect(cp.bestTimes['p1_001']).toBe(30);
  });

  it('updates classicProgress independently of campaign', () => {
    set().recordLevelComplete({ mode: 'classic', packId: 1, levelId: 'p1_001', levelIndex: 1, stars: 2, score: 500, timeElapsed: 40, gestureCount: 7 });
    expect(set().classicProgress[1].solved).toBe(1);
    expect(set().classicProgress[1].bestMoves['p1_001']).toBe(7);
    expect(set().campaignProgress[1].solved).toBe(0); // untouched
  });

  it('best score only overwrites when the new score is higher', () => {
    const s = set();
    s.recordLevelComplete({ mode: 'campaign', packId: 1, levelId: 'p1_001', levelIndex: 1, stars: 3, score: 900, timeElapsed: 30, gestureCount: 5 });
    s.recordLevelComplete({ mode: 'campaign', packId: 1, levelId: 'p1_001', levelIndex: 1, stars: 1, score: 500, timeElapsed: 30, gestureCount: 5 });
    expect(set().campaignProgress[1].bestScores['p1_001']).toBe(900);
    expect(set().campaignProgress[1].solved).toBe(1); // not double-counted
  });
});

// FL-UX-D-018 Fix 4: the GameScreen YOU row reads these stored personal bests for
// the current level. Verifies bestScore is written on first play and only improves.
describe('recordLevelComplete — personal best (FL-UX-D-018)', () => {
  const base = { mode: 'campaign' as const, packId: 1, levelId: 'p1_002', levelIndex: 2, stars: 3 as const };

  it('stores bestScore on first completion', () => {
    set().recordLevelComplete({ ...base, score: 640, timeElapsed: 50, gestureCount: 6 });
    expect(set().campaignProgress[1].bestScores['p1_002']).toBe(640);
  });

  it('updates bestScore only if the new score is higher', () => {
    set().recordLevelComplete({ ...base, score: 640, timeElapsed: 50, gestureCount: 6 });
    set().recordLevelComplete({ ...base, score: 880, timeElapsed: 40, gestureCount: 5 });
    expect(set().campaignProgress[1].bestScores['p1_002']).toBe(880);
  });

  it('does not downgrade bestScore on a worse run', () => {
    set().recordLevelComplete({ ...base, score: 880, timeElapsed: 40, gestureCount: 5 });
    set().recordLevelComplete({ ...base, score: 300, timeElapsed: 70, gestureCount: 9 });
    expect(set().campaignProgress[1].bestScores['p1_002']).toBe(880);
  });

  it('stores bestTime as the minimum (lower = better)', () => {
    set().recordLevelComplete({ ...base, score: 640, timeElapsed: 50, gestureCount: 6 });
    set().recordLevelComplete({ ...base, score: 600, timeElapsed: 32, gestureCount: 6 });
    expect(set().campaignProgress[1].bestTimes['p1_002']).toBe(32);
  });
});

// FL-5A-029 / Registry v1.1 §12: each pack requires ALL 50 of the previous pack.
describe('isPackUnlocked', () => {
  const setSolved = (mode: 'campaign' | 'classic', pk: number, n: number) =>
    useFlowSettingsStore.setState((s) => {
      const key = mode === 'classic' ? 'classicProgress' : 'campaignProgress';
      return { [key]: { ...s[key], [pk]: { ...s[key][pk], solved: n } } } as never;
    });

  it('Pack 1 is always unlocked', () => {
    expect(set().isPackUnlocked(1, 'classic')).toBe(true);
  });

  it('Pack 2 locked at 49 Pack 1 completions, unlocked at 50', () => {
    setSolved('campaign', 1, 49);
    expect(set().isPackUnlocked(2, 'campaign')).toBe(false);
    setSolved('campaign', 1, 50);
    expect(set().isPackUnlocked(2, 'campaign')).toBe(true);
  });

  it('Pack 3 requires 50 Pack 2 completions (not Pack 1)', () => {
    setSolved('campaign', 1, 50); // all Pack 1 done
    expect(set().isPackUnlocked(3, 'campaign')).toBe(false); // Pack 2 still 0
    setSolved('campaign', 2, 50);
    expect(set().isPackUnlocked(3, 'campaign')).toBe(true);
  });

  it('Pack 4 requires 50 Pack 3 completions', () => {
    setSolved('classic', 2, 50);
    expect(set().isPackUnlocked(4, 'classic')).toBe(false); // Pack 3 still 0
    setSolved('classic', 3, 50);
    expect(set().isPackUnlocked(4, 'classic')).toBe(true);
  });

  it('Unlock All IAP bypasses every pack gate', () => {
    useFlowSettingsStore.setState({ unlockAllPurchased: true });
    expect(set().isPackUnlocked(2, 'campaign')).toBe(true);
    expect(set().isPackUnlocked(3, 'campaign')).toBe(true);
    expect(set().isPackUnlocked(4, 'classic')).toBe(true);
  });
});

// FL-5A-029: Unlock All Levels IAP entitlement.
describe('unlockAllPurchased', () => {
  it('defaults to false', () => {
    expect(set().unlockAllPurchased).toBe(false);
  });
  it('setUnlockAll sets it to true', () => {
    set().setUnlockAll();
    expect(set().unlockAllPurchased).toBe(true);
  });
  it('persists to FL_UNLOCK_ALL', () => {
    set().setUnlockAll();
    expect(mem.get('FL_UNLOCK_ALL')).toBe('true');
  });
});

describe('recordDailyComplete', () => {
  it('campaign challenge sets the campaign flag', () => {
    set().recordDailyComplete('campaign');
    expect(set().dailyProgress.campaignChallengeComplete).toBe(true);
  });

  // FL-UX-D-010: the gem reward is no longer auto-awarded here — it is claimed
  // manually via claimDailyGemReward(). recordDailyComplete only bumps the streak.
  it('both complete → streak +1, no auto gem award', async () => {
    set().recordDailyComplete('campaign');
    set().recordDailyComplete('classic');
    expect(set().dailyProgress.streakCount).toBe(1);
    await tick();
    expect(set().gemBalance).toBe(0);
  });
});

describe('claimDailyGemReward (FL-UX-D-010)', () => {
  it('adds 2 gems when both challenges complete and unclaimed', async () => {
    set().recordDailyComplete('campaign');
    set().recordDailyComplete('classic');
    set().claimDailyGemReward();
    await tick();
    expect(set().gemBalance).toBe(2);
    expect(set().dailyProgress.gemRewardClaimed).toBe(true);
  });

  it('does nothing if already claimed', async () => {
    set().recordDailyComplete('campaign');
    set().recordDailyComplete('classic');
    set().claimDailyGemReward();
    set().claimDailyGemReward();
    await tick();
    expect(set().gemBalance).toBe(2);
  });

  it('does nothing if only one challenge complete', async () => {
    set().recordDailyComplete('campaign');
    set().claimDailyGemReward();
    await tick();
    expect(set().gemBalance).toBe(0);
    expect(set().dailyProgress.gemRewardClaimed).toBe(false);
  });
});

describe('incrementDailyRetry (FL-UX-D-010)', () => {
  it('increments per challenge and caps at 3', () => {
    set().incrementDailyRetry('campaign');
    expect(set().dailyProgress.campaignRetryCount).toBe(1);
    set().incrementDailyRetry('campaign');
    set().incrementDailyRetry('campaign');
    set().incrementDailyRetry('campaign');
    expect(set().dailyProgress.campaignRetryCount).toBe(3);
    expect(set().dailyProgress.classicRetryCount).toBe(0);
  });
});

describe('resetDailyIfNewDay', () => {
  it('resets challenge flags on a new day', () => {
    useFlowSettingsStore.setState((s) => ({ dailyProgress: { ...s.dailyProgress, lastDailyDate: '2000-01-01', campaignChallengeComplete: true } }));
    set().resetDailyIfNewDay();
    const dp = set().dailyProgress;
    expect(dp.campaignChallengeComplete).toBe(false);
    expect(dp.lastDailyDate).not.toBe('2000-01-01');
  });

  it('resets streak when the last streak day is more than 1 day ago', () => {
    useFlowSettingsStore.setState((s) => ({ dailyProgress: { ...s.dailyProgress, streakCount: 5, lastStreakDate: '2000-01-01', lastDailyDate: '2000-01-01' } }));
    set().resetDailyIfNewDay();
    expect(set().dailyProgress.streakCount).toBe(0);
  });

  it('resets gemRewardClaimed to false on a new day', () => {
    useFlowSettingsStore.setState((s) => ({ dailyProgress: { ...s.dailyProgress, lastDailyDate: '2000-01-01', gemRewardClaimed: true } }));
    set().resetDailyIfNewDay();
    expect(set().dailyProgress.gemRewardClaimed).toBe(false);
  });
});
