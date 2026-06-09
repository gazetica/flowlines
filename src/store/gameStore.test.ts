// gameStore.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-005-FIX
//
// timeRemaining: the authoritative countdown value (written by TimerComponent.onTick)
// that the rescue threshold reads. It resets to the level's timeLimit on start and is
// updated by setTimeRemaining.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// gameStore pulls in supabase/analytics via endGame/tapCell; stub the network-y bits so
// importing the store never touches a real backend (startLevel/setTimeRemaining are pure).
vi.mock('../services/supabase', () => ({ supabase: {}, submitScore: async () => {} }));
vi.mock('../services/analytics', () => ({ tapCorrect: () => {}, tapWrong: () => {} }));
vi.mock('../services/dailyScores', () => ({ setLocalDailyScore: async () => {} }));

import { useGameStore } from './gameStore';
import { LevelManager } from '../game/LevelManager';

describe('gameStore — timeRemaining (F-005-FIX)', () => {
  it('resets timeRemaining to the level timeLimit on startLevel', () => {
    useGameStore.getState().startLevel(1, 'campaign');
    expect(useGameStore.getState().timeRemaining).toBe(LevelManager.getLevel(1).timeLimit);
  });

  it('setTimeRemaining updates the field', () => {
    useGameStore.getState().setTimeRemaining(17);
    expect(useGameStore.getState().timeRemaining).toBe(17);
  });

  // F-009: time-extension reward = setTimeRemaining(current + 15).
  it('time extension adds +15 via setTimeRemaining(current + 15)', () => {
    useGameStore.getState().setTimeRemaining(10);
    const before = useGameStore.getState().timeRemaining;
    useGameStore.getState().setTimeRemaining(before + 15);
    expect(useGameStore.getState().timeRemaining).toBe(25);
  });
});

// F-009: the three one-use-per-attempt ad flags (GET A CLUE / LOW ON TIME / WATCH AD gem).
describe('gameStore — one-use ad flags (F-009)', () => {
  it('markCluePillUsed / markTimePillUsed / markGemAdUsed set their flags', () => {
    useGameStore.getState().startLevel(1, 'campaign'); // fresh attempt → all false
    expect(useGameStore.getState().cluePillUsed).toBe(false);
    expect(useGameStore.getState().timePillUsed).toBe(false);
    expect(useGameStore.getState().gemAdUsed).toBe(false);

    useGameStore.getState().markCluePillUsed();
    useGameStore.getState().markTimePillUsed();
    useGameStore.getState().markGemAdUsed();
    expect(useGameStore.getState().cluePillUsed).toBe(true);
    expect(useGameStore.getState().timePillUsed).toBe(true);
    expect(useGameStore.getState().gemAdUsed).toBe(true);
  });

  it('all three flags reset on a new attempt (startLevel)', () => {
    useGameStore.getState().markCluePillUsed();
    useGameStore.getState().markTimePillUsed();
    useGameStore.getState().markGemAdUsed();
    // A fresh attempt must clear every flag so all three ads are usable again.
    useGameStore.getState().startLevel(1, 'campaign');
    expect(useGameStore.getState().cluePillUsed).toBe(false);
    expect(useGameStore.getState().timePillUsed).toBe(false);
    expect(useGameStore.getState().gemAdUsed).toBe(false);
  });
});

// F-008 FIX 1: pause/resume the live countdown around rewarded ads, with a 3-2-1
// resume countdown. The round must stay 'paused' (TimerComponent frozen) for the
// whole ad + countdown, then return to 'playing' exactly once when it hits 0.
describe('gameStore — resume countdown (F-008 FIX 1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().startLevel(1, 'campaign'); // status → 'playing'
  });
  afterEach(() => {
    useGameStore.getState().resetGame(); // clears any in-flight interval
    vi.useRealTimers();
  });

  it('pauseTimer pauses (freezes timer); resumeTimer restores playing', () => {
    expect(useGameStore.getState().status).toBe('playing');
    useGameStore.getState().pauseTimer();
    expect(useGameStore.getState().status).toBe('paused');
    useGameStore.getState().resumeTimer();
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().resumeCountdown).toBeNull();
  });

  it('startResumeCountdown begins at 3 and does NOT resume synchronously', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().startResumeCountdown();
    // The resume is deferred (FIX 2): immediately after the call the overlay shows 3
    // and the round is still paused — no synchronous state flip back to playing.
    expect(useGameStore.getState().resumeCountdown).toBe(3);
    expect(useGameStore.getState().status).toBe('paused');
  });

  it('counts 3 → 2 → 1 then resets to null and resumes playing', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().startResumeCountdown();
    expect(useGameStore.getState().resumeCountdown).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(useGameStore.getState().resumeCountdown).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(useGameStore.getState().resumeCountdown).toBe(1);
    vi.advanceTimersByTime(1000);
    // After the final tick: overlay cleared (null) and the round is playing again.
    expect(useGameStore.getState().resumeCountdown).toBeNull();
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('is idempotent — a second call does not restart or extend the countdown', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().startResumeCountdown();
    vi.advanceTimersByTime(1000);
    expect(useGameStore.getState().resumeCountdown).toBe(2);
    useGameStore.getState().startResumeCountdown(); // ignored (already counting)
    expect(useGameStore.getState().resumeCountdown).toBe(2); // not reset to 3
    vi.advanceTimersByTime(2000);
    expect(useGameStore.getState().resumeCountdown).toBeNull();
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('starting a new level mid-countdown clears the countdown', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().startResumeCountdown();
    expect(useGameStore.getState().resumeCountdown).toBe(3);
    useGameStore.getState().startLevel(1, 'campaign'); // fresh round
    expect(useGameStore.getState().resumeCountdown).toBeNull();
    expect(useGameStore.getState().status).toBe('playing');
    // The stale interval must not resurrect the overlay on a later tick.
    vi.advanceTimersByTime(3000);
    expect(useGameStore.getState().resumeCountdown).toBeNull();
  });
});
