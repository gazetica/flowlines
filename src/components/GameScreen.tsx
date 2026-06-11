// GameScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 1 Day 4 | Task FL-S1-004
//
// Minimal Day-4 shell: mounts the Phaser GameScene and shows a skeleton HUD.
// Full HUD wiring comes in Days 5 and 6. No SKIN import — uses lowercase `skin`.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene, type LevelConfig } from '../game/scenes/GameScene';
import { skin } from '../styles/skin';

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

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
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
      {/* Skeleton HUD — replaced in Day 5/6 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.3)',
          fontFamily: skin.fontDisplay,
          color: skin.white,
          fontSize: 12,
        }}
      >
        <span>Moves: 0</span>
        <span>Coverage: 0%</span>
      </div>

      {/* Phaser mount point */}
      <div ref={phaserRef} style={{ flex: 1 }} />
    </div>
  );
}

export default GameScreen;
