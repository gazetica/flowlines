// GameScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 1 Day 4 | Task FL-S1-004
//
// Mounts the Phaser GameScene and shows the HUD with a live coverage bar that
// reads from the Flow Lines Zustand store. No SKIN import — uses lowercase `skin`.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { GameScene, type LevelConfig } from '../game/scenes/GameScene';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';

// Hardcoded test level for the Day 4 device check (5 dot pairs on a 6×6).
const TEST_LEVEL: LevelConfig = {
  grid: 6,
  dots: [
    { colour: 'red',    r1: 0, c1: 0, r2: 5, c2: 3 },
    { colour: 'blue',   r1: 0, c1: 5, r2: 4, c2: 1 },
    { colour: 'green',  r1: 2, c1: 2, r2: 3, c2: 5 },
    { colour: 'yellow', r1: 1, c1: 4, r2: 5, c2: 0 },
    { colour: 'purple', r1: 0, c1: 2, r2: 4, c2: 4 },
  ],
};

export function GameScreen() {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const navigate = useNavigate();
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);

  useEffect(() => {
    if (!phaserRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: phaserRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: skin.bgDeep,
      transparent: false,
      scene: [GameScene],
    });
    gameRef.current = game;

    // Pass level data to the scene once the game is ready.
    game.events.once('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene | null;
      scene?.loadLevel(TEST_LEVEL);
    });

    // GameScene dispatches 'fl:win' on win condition → navigate to the win screen.
    const handleWin = () => navigate('/win');
    window.addEventListener('fl:win', handleWin);

    return () => {
      window.removeEventListener('fl:win', handleWin);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: skin.bgDeep,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HUD — moves, coverage %, and live purple→gold coverage bar */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 16px 4px',
            fontFamily: skin.fontDisplay,
            color: skin.white,
            fontSize: 12,
          }}
        >
          <span>Moves: {moveCount}</span>
          <span>Coverage: {coverage}%</span>
        </div>
        <div
          style={{
            height: 4,
            margin: '0 16px 6px',
            background: skin.bgBorder,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${coverage}%`,
              background: skin.coverageGradient,
              borderRadius: 2,
              transition: 'width 0.1s ease-out',
            }}
          />
        </div>
      </div>

      {/* Phaser mount point */}
      <div ref={phaserRef} style={{ flex: 1 }} />
    </div>
  );
}

export default GameScreen;
