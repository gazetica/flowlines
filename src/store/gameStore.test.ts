// gameStore.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-005-FIX
//
// timeRemaining: the authoritative countdown value (written by TimerComponent.onTick)
// that the rescue threshold reads. It resets to the level's timeLimit on start and is
// updated by setTimeRemaining.

import { describe, it, expect, vi } from 'vitest';

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
});
