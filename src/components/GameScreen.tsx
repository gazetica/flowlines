// GameScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 1 Day 4 / Sprint 2 Day 11
//
// Mounts the Phaser GameScene + HUD coverage bar. On win → triggerWin() then
// navigate to /result. Android back mid-game → abandon confirmation dialog.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App } from '@capacitor/app';
import Phaser from 'phaser';
import { GameScene, type LevelConfig } from '../game/scenes/GameScene';
import { getLevel, type LevelData } from '../game/engine/LevelManager';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';

// Dev-harness fallback level (used at /game with no params). Real levels come
// from the URL (?pack=N&level=N) via LevelManager. optimalMoves = grid².
const TEST_LEVEL: LevelData = {
  id: '',
  pack: 0,
  grid: 6,
  colours: 5,
  optimalMoves: 36,
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
  const [searchParams] = useSearchParams();
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);

  // Resolve the level from URL params; fall back to TEST_LEVEL when absent/invalid.
  const packId = parseInt(searchParams.get('pack') ?? '1', 10);
  const levelIndex = parseInt(searchParams.get('level') ?? '1', 10);
  const levelData: LevelData = getLevel(packId, levelIndex) ?? TEST_LEVEL;

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

    const config: LevelConfig = { grid: levelData.grid, dots: levelData.dots as LevelConfig['dots'] };

    game.events.once('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene | null;
      const store = useFlowGameStore.getState();
      store.resetGame();
      store.setLevelId(levelData.id);
      scene?.loadLevel(config);
      store.setStatus('playing');
    });

    // Win → compute score/stars with the real optimalMoves, then go to /result.
    const handleWin = () => {
      useFlowGameStore.getState().triggerWin(levelData.optimalMoves);
      navigate('/result');
    };
    window.addEventListener('fl:win', handleWin);

    // Android hardware back mid-game → abandon confirmation (else default back).
    const backHandler = App.addListener('backButton', () => {
      if (useFlowGameStore.getState().status === 'playing') {
        setShowAbandonDialog(true);
      } else {
        navigate(-1);
      }
    });

    return () => {
      window.removeEventListener('fl:win', handleWin);
      void backHandler.then((h) => h.remove());
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmAbandon = () => {
    setShowAbandonDialog(false);
    useFlowGameStore.getState().triggerAbandon();
    navigate(-1);
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column' }}>
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
        <div style={{ height: 4, margin: '0 16px 6px', background: skin.bgBorder, borderRadius: 2, overflow: 'hidden' }}>
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

      {/* Abandon confirmation dialog (Sprint 3 restyles all modals) */}
      {showAbandonDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: skin.bgCard,
              border: '1px solid rgba(127,119,221,0.25)',
              borderRadius: 16,
              padding: 24,
              width: 280,
              textAlign: 'center',
              fontFamily: skin.fontBody,
            }}
          >
            <div style={{ color: skin.white, fontSize: 16, marginBottom: 20, fontFamily: skin.fontDisplay }}>
              Abandon this level?
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAbandonDialog(false)}
                style={{ flex: 1, padding: '10px', background: skin.bgRaised, color: skin.white, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
              >
                Keep Playing
              </button>
              <button
                onClick={confirmAbandon}
                style={{ flex: 1, padding: '10px', background: skin.danger, color: skin.white, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
