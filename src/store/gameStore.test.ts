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

// F-010: manual resume after rewarded ads. The 3-2-1 auto-countdown is gone; instead the
// round stays 'paused' and an adJustCompleted flag drives the RESUME GAME overlay. The
// player taps it to resume — there is no time-based auto-resume.
describe('gameStore — manual resume / adJustCompleted (F-010)', () => {
  beforeEach(() => {
    useGameStore.getState().startLevel(1, 'campaign'); // status → 'playing'
  });
  afterEach(() => {
    useGameStore.getState().resetGame();
  });

  it('1. adJustCompleted defaults to false on a fresh round', () => {
    expect(useGameStore.getState().adJustCompleted).toBe(false);
  });

  it('2. setAdJustCompleted(true) sets the flag (round stays paused)', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().setAdJustCompleted(true);
    expect(useGameStore.getState().adJustCompleted).toBe(true);
    expect(useGameStore.getState().status).toBe('paused'); // NO auto-resume
  });

  it('3. adJustCompleted resets to false on startLevel (new attempt)', () => {
    useGameStore.getState().setAdJustCompleted(true);
    useGameStore.getState().startLevel(1, 'campaign');
    expect(useGameStore.getState().adJustCompleted).toBe(false);
  });

  it('4. resumeTimer un-pauses and clears adJustCompleted (RESUME GAME tap)', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().setAdJustCompleted(true);
    // Mirrors the overlay button: clear the flag + resume.
    useGameStore.getState().setAdJustCompleted(false);
    useGameStore.getState().resumeTimer();
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().adJustCompleted).toBe(false);
  });

  it('5. pauseTimer freezes; resumeTimer restores playing', () => {
    expect(useGameStore.getState().status).toBe('playing');
    useGameStore.getState().pauseTimer();
    expect(useGameStore.getState().status).toBe('paused');
    useGameStore.getState().resumeTimer();
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().adJustCompleted).toBe(false);
  });

  it('6. no auto-resume — the flag persists until resumeTimer is called', () => {
    useGameStore.getState().pauseTimer();
    useGameStore.getState().setAdJustCompleted(true);
    // No timers/intervals involved: the paused state and flag just stay put.
    expect(useGameStore.getState().status).toBe('paused');
    expect(useGameStore.getState().adJustCompleted).toBe(true);
  });
});
