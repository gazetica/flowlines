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
import type { DotPair } from '../game/engine/GridEngine';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { showHintAd, loadHintAd } from '../services/rewardedAdService';
import { trackLevelStart, trackLevelAbandon, trackHintRequested, trackAdImpression } from '../services/analytics';
import {
  playPathDraw, stopPathDraw, playLockIn, playUndo, playWinFl, playHint,
} from '../services/soundService';
import { startGameMusic, stopGameMusic, pauseGameMusic, resumeGameMusic } from '../services/musicService';
import { hapticLockIn, hapticWin, hapticUndo } from '../services/hapticService';
import BuyHintModal from './BuyHintModal';

const MAX_HINTS = 3;

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
  const hintsUsed = useFlowGameStore((s) => s.hintsUsed);
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showBuyHintModal, setShowBuyHintModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);

  const hintsRemaining = MAX_HINTS - hintsUsed;
  const hintsExhausted = hintsRemaining <= 0;

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  };

  // Resolve the level from URL params; fall back to TEST_LEVEL when absent/invalid.
  const packId = parseInt(searchParams.get('pack') ?? '1', 10);
  const levelIndex = parseInt(searchParams.get('level') ?? '1', 10);
  const isDaily = searchParams.get('mode') === 'daily';
  const levelData: LevelData = getLevel(packId, levelIndex) ?? TEST_LEVEL;

  useEffect(() => {
    if (!phaserRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: skin.bgDeep,
      transparent: false,
      // RESIZE mode sizes the canvas (and camera) to the parent container, so
      // GameScene's layout reads the real available height below the HUD rather
      // than the full viewport. Fixes the oversized ambient-glow / pushed grid.
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: phaserRef.current,
        width: '100%',
        height: '100%',
      },
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
      void loadHintAd(); // preload the hint rewarded ad so it's ready on tap
      trackLevelStart({
        level_id: levelData.id,
        pack_id: levelData.pack,
        grid_size: levelData.grid,
        colour_count: levelData.colours,
      });
    });

    // RESIZE mode sets cameras.main width/height only after its first (async)
    // resize event, which can land AFTER GameScene.create()/loadLevel() runs its
    // layout — leaving the grid computed against stale dims (rendered low). Once
    // the dims have settled, refresh the scale and re-run the public loadLevel so
    // computeLayout re-centres the grid with correct camera dimensions.
    const resizeTimer = setTimeout(() => {
      const g = gameRef.current;
      if (!g) return;
      g.scale.refresh();
      const scene = g.scene.getScene('GameScene') as GameScene | null;
      scene?.loadLevel(config);
    }, 150);

    // Win → compute score/stars with the real optimalMoves. Daily mode returns
    // to /daily (records streak + reward); otherwise go to the result screen.
    const handleWin = () => {
      useFlowGameStore.getState().triggerWin(levelData.optimalMoves);
      navigate(isDaily ? '/daily?completed=true' : '/result');
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
      clearTimeout(resizeTimer);
      window.removeEventListener('fl:win', handleWin);
      void backHandler.then((h) => h.remove());
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio + haptics: gameplay music on mount (fades out on unmount) and SFX/
  // haptics driven by the GameScene window events (fl:path-extend/release/
  // colour-locked/undo/win). Each play self-gates on its Settings toggle.
  useEffect(() => {
    startGameMusic();

    const onPathExtend = () => playPathDraw();
    const onPathRelease = () => stopPathDraw();
    const onColourLocked = () => { playLockIn(); void hapticLockIn(); };
    const onUndoFx = () => { playUndo(); void hapticUndo(); };
    const onWinFx = () => { playWinFl(); void hapticWin(); };

    window.addEventListener('fl:path-extend', onPathExtend);
    window.addEventListener('fl:path-release', onPathRelease);
    window.addEventListener('fl:colour-locked', onColourLocked);
    window.addEventListener('fl:undo', onUndoFx);
    window.addEventListener('fl:win', onWinFx);

    // Pause/resume the gameplay loop with app background/foreground.
    const lifecycle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) resumeGameMusic();
      else pauseGameMusic();
    });

    return () => {
      stopPathDraw();
      stopGameMusic();
      window.removeEventListener('fl:path-extend', onPathExtend);
      window.removeEventListener('fl:path-release', onPathRelease);
      window.removeEventListener('fl:colour-locked', onColourLocked);
      window.removeEventListener('fl:undo', onUndoFx);
      window.removeEventListener('fl:win', onWinFx);
      void lifecycle.then((h) => h.remove());
    };
  }, []);

  const confirmAbandon = () => {
    setShowAbandonDialog(false);
    trackLevelAbandon({ level_id: levelData.id, coverage_pct: useFlowGameStore.getState().coverage });
    useFlowGameStore.getState().triggerAbandon();
    navigate(-1);
  };

  // HINT button → watch a rewarded ad, then GameScene pulses the optimal next
  // cell. Max 3 hints/level; the store's hintsUsed feeds ScoreEngine's penalty
  // via triggerWin (no signature change needed — it reads state.hintsUsed).
  const onHint = async () => {
    if (hintsExhausted) {
      flashToast('No more hints this level');
      return;
    }
    if (hintBusy) return;
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene | undefined;
    if (!scene) return;
    setHintBusy(true);
    trackHintRequested({ level_id: levelData.id, hints_used_this_level: hintsUsed });
    try {
      const outcome = await showHintAd(
        { grid: levelData.grid, dots: levelData.dots as DotPair[] },
        (row, col) => {
          scene.showHint(row, col);
          playHint(); // soft ping on hint reveal
          useFlowGameStore.getState().useHint(); // 0 gems awarded (FL rule)
        },
      );
      if (outcome === 'rewarded') trackAdImpression({ ad_type: 'rewarded' });
      if (outcome === 'unavailable') {
        // No ad fill. If the player also has 0 gems, offer the IAP/retry sheet;
        // otherwise a simple toast (they can try again shortly).
        if (gemBalance === 0) setShowBuyHintModal(true);
        else flashToast('Hint ad unavailable — try again');
      }
    } finally {
      setHintBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100dvh', overflow: 'hidden', background: skin.bgDeep, display: 'flex', flexDirection: 'column' }}>
      {/* HUD — moves, coverage %, and live purple→gold coverage bar */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px 4px',
            fontFamily: skin.fontDisplay,
            color: skin.white,
            fontSize: 12,
          }}
        >
          {/* Level ID — top-centre, so players always know where they are. */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: 6,
              transform: 'translateX(-50%)',
              fontFamily: skin.fontDisplay,
              fontSize: 8,
              color: skin.muted,
              letterSpacing: 1,
            }}
          >
            P{levelData.pack} · L{String(levelIndex).padStart(3, '0')}
          </span>
          <span>Moves: <span style={{ color: skin.gold }}>{moveCount}</span></span>
          <span>Coverage: {coverage}%</span>
          {/* HINT — remaining count (not used). Gold/active until exhausted. */}
          <button
            onClick={() => void onHint()}
            disabled={hintBusy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              borderRadius: 12,
              fontFamily: skin.fontDisplay,
              fontSize: 12,
              cursor: hintBusy ? 'default' : 'pointer',
              background: 'none',
              color: hintsExhausted ? skin.muted : skin.gold,
              border: hintsExhausted ? '1px solid transparent' : `1px solid ${skin.gold}`,
              opacity: hintsExhausted ? 0.5 : 1,
            }}
          >
            💡 {hintsRemaining}
          </button>
        </div>
        <div style={{ height: 4, margin: '0 16px 6px', background: skin.bgBorder, borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${coverage}%`,
              background: 'linear-gradient(90deg, #7F77DD, #EF9F27)',
              borderRadius: 2,
              transition: 'width 0.1s ease-out',
            }}
          />
        </div>
      </div>

      {/* Phaser mount point — fills the space below the HUD. minHeight:0 lets the
          flex child shrink instead of overflowing; position:relative anchors the canvas. */}
      <div ref={phaserRef} style={{ flex: 1, minHeight: 0, position: 'relative' }} />

      {/* Buy-hint sheet — shown when a hint ad has no fill and gems are 0 */}
      {showBuyHintModal && (
        <BuyHintModal
          onClose={() => setShowBuyHintModal(false)}
          onWatchAd={() => void onHint()}
        />
      )}

      {/* Hint toast (hint exhausted / ad unavailable) */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '12%', left: 0, right: 0, textAlign: 'center', zIndex: 1100, pointerEvents: 'none' }}>
          <span
            style={{
              fontFamily: skin.fontBody,
              fontSize: 13,
              color: skin.white,
              background: 'rgba(13,6,32,0.92)',
              border: '1px solid rgba(127,119,221,0.4)',
              borderRadius: 8,
              padding: '8px 14px',
            }}
          >
            {toast}
          </span>
        </div>
      )}

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
