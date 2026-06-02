// GameScreen.tsx
// Numtap | Gazetica Studio | Sprint 2 Day 3 | Task T-005
//
// React wrapper: boots Phaser with GameScene, renders the HUD (timer / next /
// score) over the canvas, listens to gameStore, and starts level 1 on mount.
//
// NOTE: the brief's draft computed a `stars` value via `require('../game/LevelManager')`
// inside the complete-handler. `require` is undefined in the ESM/Vite browser
// runtime (it would throw a ReferenceError), and the value was never used in the
// alert. That dead block is removed here. Unused store selectors (grid, pauseGame,
// resumeGame) are also dropped to satisfy noUnusedLocals.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { TimerComponent } from './TimerComponent';
import { GameScene } from '../scenes/GameScene';

export function GameScreen() {
  const phaserRef = useRef<Phaser.Game | null>(null);
  const { status, currentLevel, score, runId, startLevel, tickTimer, endGame, engine } =
    useGameStore();

  // Boot Phaser once on mount
  useEffect(() => {
    if (phaserRef.current) return;
    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#07111F',
      transparent: false,
      parent: 'phaser-container',
      scene: [GameScene],
    });
    // Start level 1 campaign
    startLevel(1, 'campaign');
    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When level starts, trigger grid render in Phaser
  useEffect(() => {
    if (status === 'playing') {
      const scene = phaserRef.current?.scene.getScene('GameScene') as GameScene | null;
      scene?.renderGrid();
    }
  }, [status]);

  // Handle game end — show basic alert for now (Sprint 3 replaces with ResultScreen)
  useEffect(() => {
    if (status === 'complete') {
      setTimeout(() => {
        alert(`Level Complete!\nScore: ${score}\nTap OK to play again.`);
        startLevel(1, 'campaign');
      }, 300);
    }
    if (status === 'failed') {
      setTimeout(() => {
        alert("Time's Up! Try again.");
        startLevel(1, 'campaign');
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const expectedNext = engine?.getExpectedNext() ?? 1;
  const isPaused = status === 'paused';
  const timeLimit = currentLevel?.timeLimit ?? 30;

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#07111F',
        overflow: 'hidden',
      }}
    >
      {/* Phaser canvas container */}
      <div id="phaser-container" style={{ position: 'absolute', inset: 0 }} />

      {/* HUD overlay — rendered by React over the Phaser canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '14%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(10,26,46,0.9)',
          borderBottom: '1px solid rgba(30,139,195,0.2)',
          zIndex: 10,
        }}
      >
        {/* Timer */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '10px',
              color: '#5E7A9C',
              letterSpacing: '1px',
            }}
          >
            TIMER
          </div>
          <TimerComponent
            key={runId}
            durationSeconds={timeLimit}
            paused={isPaused || status !== 'playing'}
            onTick={(remaining) => {
              tickTimer(timeLimit - remaining);
            }}
            onExpire={() => endGame('expired')}
          />
        </div>

        {/* Next target */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '10px',
              color: '#5E7A9C',
              letterSpacing: '1px',
            }}
          >
            NEXT
          </div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '32px',
              color: '#FFD700',
              textShadow: '0 0 10px rgba(255,215,0,0.5)',
            }}
          >
            {String(expectedNext).padStart(2, '0')}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '10px',
              color: '#5E7A9C',
              letterSpacing: '1px',
            }}
          >
            SCORE
          </div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '18px',
              color: '#EEF4FF',
            }}
          >
            {score.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
