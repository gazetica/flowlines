// flowGameStore.test.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-004
//
// Covers the mode layer added in FL-UX-D-004: initLevel, onGestureComplete
// (Classic move budget + fail), setTimeElapsed, and retry handling.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: async () => ({ value: null }), set: async () => {}, remove: async () => {} },
}));

import { useFlowGameStore } from './flowGameStore';

const game = () => useFlowGameStore.getState();

beforeEach(() => {
  useFlowGameStore.setState({ retryCount: 0, status: 'idle', gestureCount: 0 });
});

describe('flowGameStore mode layer (FL-UX-D-004)', () => {
  it('initLevel resets fields for Campaign mode', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'campaign', timeLimit: 90, classicMoveLimit: 0 });
    const s = game();
    expect(s.gameMode).toBe('campaign');
    expect(s.status).toBe('playing');
    expect(s.timeLimitSeconds).toBe(90);
    expect(s.timeElapsed).toBe(0);
    expect(s.gestureCount).toBe(0);
    expect(s.hintsUsed).toBe(0);
  });

  it('initLevel resets fields for Classic mode (movesRemaining = limit)', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'classic', timeLimit: 0, classicMoveLimit: 10 });
    const s = game();
    expect(s.classicMoveLimitTotal).toBe(10);
    expect(s.movesRemaining).toBe(10);
  });

  it('onGestureComplete increments gestureCount and decrements movesRemaining', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'classic', timeLimit: 0, classicMoveLimit: 5 });
    game().onGestureComplete();
    expect(game().gestureCount).toBe(1);
    expect(game().movesRemaining).toBe(4);
  });

  it('onGestureComplete sets status:failed when movesRemaining hits 0 in Classic', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'classic', timeLimit: 0, classicMoveLimit: 1 });
    game().onGestureComplete();
    expect(game().status).toBe('failed');
  });

  it('onGestureComplete does NOT fail in Campaign mode', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'campaign', timeLimit: 90, classicMoveLimit: 0 });
    game().onGestureComplete();
    expect(game().status).toBe('playing');
  });

  // FL-UX-D-010c Bug 3: gestureCount must increment in ALL modes (it feeds the
  // ScoreEngine gesture bonus); only Classic touches the move budget.
  it('Campaign: gestureCount increments, movesRemaining unchanged', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'campaign', timeLimit: 90, classicMoveLimit: 0 });
    useFlowGameStore.setState({ movesRemaining: 10 });
    game().onGestureComplete();
    expect(game().gestureCount).toBe(1);
    expect(game().movesRemaining).toBe(10);
  });

  it('Classic: gestureCount increments, movesRemaining decrements', () => {
    game().initLevel({ levelId: 'p1_001', mode: 'classic', timeLimit: 0, classicMoveLimit: 10 });
    game().onGestureComplete();
    expect(game().gestureCount).toBe(1);
    expect(game().movesRemaining).toBe(9);
  });

  it('daily_campaign: gestureCount increments, movesRemaining unchanged', () => {
    game().initLevel({ levelId: 'daily', mode: 'daily_campaign', timeLimit: 120, classicMoveLimit: 0 });
    useFlowGameStore.setState({ movesRemaining: 7 });
    game().onGestureComplete();
    expect(game().gestureCount).toBe(1);
    expect(game().movesRemaining).toBe(7);
  });

  it('daily_classic: gestureCount increments, movesRemaining decrements', () => {
    game().initLevel({ levelId: 'daily', mode: 'daily_classic', timeLimit: 0, classicMoveLimit: 12 });
    game().onGestureComplete();
    expect(game().gestureCount).toBe(1);
    expect(game().movesRemaining).toBe(11);
  });

  it('setTimeElapsed updates timeElapsed', () => {
    game().setTimeElapsed(42);
    expect(game().timeElapsed).toBe(42);
  });

  it('retryCount is preserved across initLevel', () => {
    useFlowGameStore.setState({ retryCount: 1 });
    game().initLevel({ levelId: 'p1_001', mode: 'campaign', timeLimit: 90, classicMoveLimit: 0 });
    expect(game().retryCount).toBe(1);
  });

  it('incrementRetry caps at 2', () => {
    useFlowGameStore.setState({ retryCount: 0 });
    game().incrementRetry();
    game().incrementRetry();
    game().incrementRetry();
    expect(game().retryCount).toBe(2);
  });
});
