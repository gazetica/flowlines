// GameScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 1 Day 4 / Sprint 2 Day 11 / UX Sprint D (FL-UX-D-008)
//
// Mounts the Phaser GameScene + a mode-aware React HUD (Campaign / Classic / Zen).
// The Phaser mounting logic is UNCHANGED — only the surrounding HUD, rescue pills,
// action row and overlays were rebuilt. GameScene.ts is PERMANENTLY LOCKED.
//   Campaign: countdown timer (large), coverage, moves, record row.
//   Classic:  moves-remaining (large), coverage, time elapsed, record row.
//   Zen:      moves taken + coverage only.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App } from '@capacitor/app';
import Phaser from 'phaser';
import { GameScene, type LevelConfig } from '../game/scenes/GameScene';
import { getLevel, type LevelData } from '../game/engine/LevelManager';
import type { DotPair } from '../game/engine/GridEngine';
import type { GameMode } from '../game/engine/ScoreEngine';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { flagOf } from '../data/countries';
import { showHintAd, loadHintAd } from '../services/rewardedAdService';
import { trackLevelStart, trackLevelAbandon, trackHintRequested, trackAdImpression } from '../services/analytics';
import {
  playPathDraw, stopPathDraw, playLockIn, playUndo, playWinFl, playHint,
} from '../services/soundService';
import { startGameMusic, stopGameMusic, pauseGameMusic, resumeGameMusic } from '../services/musicService';
import { hapticLockIn, hapticWin, hapticUndo } from '../services/hapticService';
import BuyHintModal from './BuyHintModal';

// CLAUDE.md §9 (locked monetisation rule): max 3 hints per level.
const MAX_HINTS = 3;

const ZEN_TEAL = '#1ABC9C';
const PURPLE = '#9B8FFF';
const ORANGE = '#E67E22';
const DANGER = '#E74C3C';

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

// FL-UX-D-008b: plain seconds under 3 minutes (all Pack timeLimits are ≤180s),
// switch to M:SS only at 180s+.
function formatTime(seconds: number): string {
  if (seconds < 180) return String(seconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function GameScreen() {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Store-driven dynamic values
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const hintsUsed = useFlowGameStore((s) => s.hintsUsed);
  const status = useFlowGameStore((s) => s.status);
  const timeElapsed = useFlowGameStore((s) => s.timeElapsed);
  const timeLimitSeconds = useFlowGameStore((s) => s.timeLimitSeconds);
  const movesRemaining = useFlowGameStore((s) => s.movesRemaining);

  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const firstLaunchComplete = useFlowSettingsStore((s) => s.firstLaunchComplete);
  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);
  const onGestureComplete = useFlowGameStore((s) => s.onGestureComplete);

  const [showTutorialHint, setShowTutorialHint] = useState(false);
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

  // Resolve the level + mode from URL params.
  const packId = parseInt(searchParams.get('pack') ?? '1', 10);
  const levelIndex = parseInt(searchParams.get('level') ?? '1', 10);
  const rawMode = searchParams.get('mode') ?? 'campaign';
  const mode = rawMode as GameMode;
  const isDaily = rawMode === 'daily'; // legacy daily flag (win nav) — unchanged
  const levelData: LevelData = useMemo(() => getLevel(packId, levelIndex) ?? TEST_LEVEL, [packId, levelIndex]);

  // Mode flags derived from the URL (stable, no first-frame flicker).
  const isCampaign = mode === 'campaign' || mode === 'daily_campaign';
  const isClassic = mode === 'classic' || mode === 'daily_classic';
  const isZen = mode === 'zen';

  // Zen reads grid/difficulty from URL (PackSelect zen config); others from JSON.
  const zenGrid = parseInt(searchParams.get('grid') ?? String(levelData.grid), 10);
  const difficulty = (isZen ? searchParams.get('difficulty') : levelData.difficulty) ?? 'easy';

  const timeRemaining = Math.max(0, timeLimitSeconds - timeElapsed);
  const timerDanger = timeRemaining <= 20 && timeRemaining > 0;
  const movesDanger = movesRemaining <= 3;

  const bestTime = campaignProgress[packId]?.bestTimes?.[levelData.id];
  const bestMoves = classicProgress[packId]?.bestMoves?.[levelData.id];

  // FL-UX-D-008b: tiles remaining (replaces the centre coverage% stat).
  const gridSize = levelData.grid ?? 6;
  const totalTiles = gridSize * gridSize;
  const filledTiles = Math.round((coverage / 100) * totalTiles);
  const tilesRemaining = Math.max(0, totalTiles - filledTiles);

  // FL-UX-D-008b: YOU vs LEADER panel — personal best stands in as "leader"
  // (self-competition) until the Supabase leaderboard fetch is wired separately.
  const modeProg = isClassic ? classicProgress[packId] : campaignProgress[packId];
  const leaderScore = modeProg?.bestScores?.[levelData.id] ?? null;
  const leaderTime = modeProg?.bestTimes?.[levelData.id] ?? null;
  const leaderMoves = modeProg?.bestMoves?.[levelData.id] ?? null;
  const leaderAlias = alias || 'Player';
  const leaderFlag = flagOf(country || 'IN');

  // ─── Phaser mount (UNCHANGED from prior implementation) ──────────────────────
  useEffect(() => {
    if (!phaserRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: skin.bgDeep,
      transparent: false,
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
      void loadHintAd();
      trackLevelStart({
        level_id: levelData.id,
        pack_id: levelData.pack,
        grid_size: levelData.grid,
        colour_count: levelData.colours,
      });
    });

    const resizeTimer = setTimeout(() => {
      const g = gameRef.current;
      if (!g) return;
      g.scale.refresh();
      const scene = g.scene.getScene('GameScene') as GameScene | null;
      scene?.loadLevel(config);
    }, 150);

    const handleWin = () => {
      useFlowGameStore.getState().triggerWin(levelData.optimalMoves);
      navigate(isDaily ? '/daily?completed=true' : '/result');
    };
    window.addEventListener('fl:win', handleWin);

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

  // ─── FL-UX-D-008: initLevel on mount — tell the store the active mode + limits.
  useEffect(() => {
    if (!levelData) return;
    useFlowGameStore.getState().initLevel({
      levelId: levelData.id,
      mode,
      timeLimit: isCampaign ? (levelData.timeLimit ?? 90) : 0,
      classicMoveLimit: isClassic ? (levelData.classicMoveLimit ?? 15) : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelData.id, mode]);

  // ─── FL-UX-D-008: timer tick (Campaign counts down via timeRemaining; Classic
  // counts up for the time bonus). Zen has no tick. Uses store.getState() so the
  // interval need not be recreated every second.
  useEffect(() => {
    if (!(isCampaign || isClassic)) return;
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      const s = useFlowGameStore.getState();
      s.setTimeElapsed(s.timeElapsed + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCampaign, isClassic, status]);

  // ─── FL-UX-D-008c: Classic gesture counter — GameScene fires fl:gestureComplete
  // on each completed drag gesture; decrement the Classic move budget here.
  useEffect(() => {
    if (!isClassic) return;
    const handleGesture = () => { onGestureComplete(); };
    window.addEventListener('fl:gestureComplete', handleGesture);
    return () => window.removeEventListener('fl:gestureComplete', handleGesture);
  }, [isClassic, onGestureComplete]);

  // ─── FL-UX-D-008: Campaign timeout → fail.
  useEffect(() => {
    if (!isCampaign) return;
    // Guard on timeLimitSeconds>0 so we never fail before initLevel has set the
    // real ceiling (a stale status:'playing' + uninitialised limit would be 0).
    if (timeLimitSeconds > 0 && timeRemaining === 0 && status === 'playing') {
      useFlowGameStore.setState({ status: 'failed' });
    }
  }, [timeRemaining, status, isCampaign, timeLimitSeconds]);

  // Audio + haptics (UNCHANGED).
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

  // Level 1 contextual tutorial overlay (UNCHANGED).
  useEffect(() => {
    if (levelData.id === 'p1_001' && !firstLaunchComplete) {
      const t = setTimeout(() => setShowTutorialHint(true), 1000);
      return () => clearTimeout(t);
    }
  }, [levelData.id, firstLaunchComplete]);

  useEffect(() => {
    const dismiss = () => setShowTutorialHint(false);
    window.addEventListener('fl:path-extend', dismiss);
    return () => window.removeEventListener('fl:path-extend', dismiss);
  }, []);

  const confirmAbandon = () => {
    setShowAbandonDialog(false);
    trackLevelAbandon({ level_id: levelData.id, coverage_pct: useFlowGameStore.getState().coverage });
    useFlowGameStore.getState().triggerAbandon();
    navigate(-1);
  };

  // HINT — real rewarded-ad flow (CLAUDE.md §9: rewarded ads = Hint button ONLY).
  // Kept fully wired (the brief's console stub would regress working monetisation).
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
          playHint();
          useFlowGameStore.getState().useHint();
        },
      );
      if (outcome === 'rewarded') trackAdImpression({ ad_type: 'rewarded' });
      if (outcome === 'unavailable') {
        if (gemBalance === 0) setShowBuyHintModal(true);
        else flashToast('Hint ad unavailable — try again');
      }
    } finally {
      setHintBusy(false);
    }
  };

  // Rescue / extension stubs (new; rewarded ads wired in a later brief).
  // Note: the UNDO and RESET buttons were removed in FL-UX-D-008b (Numtap pattern
  // has no dedicated undo/reset — drag-back over a path is the undo mechanic).
  const handleTimeExtension = () => console.log('Time extension requested — rewarded ad to be wired in ad brief');
  const handleMoveExtension = () => console.log('Move extension requested — rewarded ad to be wired in ad brief');

  const showRescuePills = (isCampaign || isClassic) && status === 'playing';
  const showTimePill = isCampaign && timeRemaining <= 30;
  const showMovePill = isClassic && movesRemaining <= 5;
  const hasRightPill = showTimePill || showMovePill;

  const coverageGradient = isCampaign
    ? 'linear-gradient(90deg, #E67E22, #FFD700)'
    : isClassic
      ? 'linear-gradient(90deg, #7F77DD, #9B59B6)'
      : 'linear-gradient(90deg, #1ABC9C, #2ECC71)';

  const statLabel: CSSProperties = { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#110527', display: 'flex', flexDirection: 'column' }}>
      {/* ── HUD ────────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: 'rgba(13,6,32,0.92)', borderBottom: '1px solid rgba(127,119,221,0.25)' }}>
        <div style={{ padding: '8px 14px 6px' }}>
          {/* Breadcrumb row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onPointerDown={() => navigate(-1)}
                style={{ background: 'none', border: 'none', color: skin.gold, fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0 }}
              >
                ‹
              </button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
                {isZen
                  ? `Zen · ${zenGrid}×${zenGrid} · ${cap(String(difficulty))}`
                  : `Pack ${levelData.pack} · L${String(levelIndex).padStart(2, '0')} · ${cap(String(difficulty))}`}
              </span>
            </div>
            {isZen ? (
              <span style={{ background: 'rgba(26,188,156,0.15)', border: '1px solid rgba(26,188,156,0.35)', borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: ZEN_TEAL }}>
                ZEN
              </span>
            ) : (
              <span style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '4px 10px', fontSize: 12, color: skin.gold }}>
                💡 {gemBalance}
              </span>
            )}
          </div>

          {/* Stat row */}
          {isCampaign && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={statLabel}>TIMER</div>
                <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: timerDanger ? DANGER : skin.gold, animation: timerDanger ? 'flTimerPulse 0.5s infinite' : undefined }}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>TILES</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: tilesRemaining === 0 ? '#2ECC71' : '#FFFFFF' }}>{tilesRemaining}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={statLabel}>MOVES</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{moveCount}</div>
              </div>
            </div>
          )}

          {isClassic && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={statLabel}>MOVES LEFT</div>
                <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: movesDanger ? DANGER : PURPLE, animation: movesDanger ? 'flTimerPulse 0.5s infinite' : undefined }}>
                  {movesRemaining}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>TILES</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: tilesRemaining === 0 ? '#2ECC71' : '#FFFFFF' }}>{tilesRemaining}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={statLabel}>TIME</div>
                <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>{formatTime(timeElapsed)}</div>
              </div>
            </div>
          )}

          {isZen && (
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>MOVES</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>{moveCount}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>TILES</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: tilesRemaining === 0 ? '#2ECC71' : '#FFFFFF' }}>{tilesRemaining}</div>
              </div>
            </div>
          )}

          {/* Record row (Campaign / Classic only) */}
          {isCampaign && (
            <div style={{ fontSize: 10, color: bestTime !== undefined && timeElapsed < bestTime ? '#2ECC71' : 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 4 }}>
              vs Record: {bestTime !== undefined ? formatTime(bestTime) : '—:——'}
            </div>
          )}
          {isClassic && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 4 }}>
              vs Record: {bestMoves !== undefined ? `${bestMoves}` : '—'} moves
            </div>
          )}
        </div>

        {/* Coverage bar — full width, mode gradient, with % label above */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px', marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 }}>{coverage}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${coverage}%`, background: coverageGradient, transition: 'width 300ms ease', borderRadius: '0 2px 2px 0' }} />
          </div>
        </div>
      </div>

      {/* ── Phaser mount (Numtap-style grid card) ──────────────────────────── */}
      <div
        id="phaser-container"
        ref={phaserRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          margin: '8px 12px',
          borderRadius: 16,
          border: '1px solid rgba(127,119,221,0.35)',
          background: '#0D0620',
          boxShadow: '0 0 0 1px rgba(127,119,221,0.1), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      />

      {/* ── Bottom panel — Numtap 3-layer pattern ──────────────────────────── */}

      {/* Layer 1 — rescue pills (Campaign / Classic, while playing) */}
      {showRescuePills && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px 4px' }}>
          <button
            onPointerDown={() => void onHint()}
            disabled={hintBusy}
            style={{ flex: hasRightPill ? 1 : undefined, width: hasRightPill ? undefined : '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(26,188,156,0.08)', border: '1.5px dashed rgba(26,188,156,0.5)', borderRadius: 20, padding: '8px 12px', cursor: hintBusy ? 'default' : 'pointer' }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: ZEN_TEAL }}>💡 GET A CLUE</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Watch ad · reveal next cell</div>
          </button>
          {showTimePill && (
            <button
              onPointerDown={handleTimeExtension}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(230,126,34,0.08)', border: '1.5px dashed rgba(230,126,34,0.55)', borderRadius: 20, padding: '8px 12px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE }}>⏱ LOW ON TIME</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Watch ad — Add +30s</div>
            </button>
          )}
          {showMovePill && (
            <button
              onPointerDown={handleMoveExtension}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(127,119,221,0.08)', border: '1.5px dashed rgba(127,119,221,0.55)', borderRadius: 20, padding: '8px 12px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE }}>➕ LOW ON MOVES</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Watch ad — Add +5 moves</div>
            </button>
          )}
        </div>
      )}

      {/* Layer 2 — action cards: REMOVE ADS | WATCH AD | USE HINT */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 12px 6px' }}>
        <button
          onPointerDown={() => navigate('/store')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 12, padding: '10px 6px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 20 }}>🚫</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>REMOVE ADS</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>Play without interruptions</span>
        </button>
        <button
          onPointerDown={() => console.log('Watch ad for gems — to be wired in ad brief')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 12, padding: '10px 6px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 20 }}>📺</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#3498DB', letterSpacing: 0.5 }}>WATCH AD</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>+3 gems free</span>
        </button>
        <button
          onPointerDown={() => void onHint()}
          disabled={hintBusy || hintsExhausted}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 6px', cursor: hintBusy ? 'default' : 'pointer', opacity: hintsExhausted ? 0.4 : 1, pointerEvents: hintsExhausted ? 'none' : 'auto' }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: skin.gold, letterSpacing: 0.5 }}>USE HINT</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>💡 ×{hintsRemaining} left</span>
        </button>
      </div>

      {/* Layer 3 — YOU vs LEADER (Campaign / Classic; self-competition for now) */}
      {(isCampaign || isClassic) && (
        <div style={{ margin: '4px 12px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid rgba(127,119,221,0.12)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 4 }}>YOU</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 4 }}>{leaderFlag} {alias || 'Player'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>Score</span>
              <span style={{ fontSize: 12, color: '#FFFFFF' }}>—</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{isClassic ? 'Moves' : 'Time'}</span>
              <span style={{ fontSize: 12, color: '#FFFFFF' }}>{isClassic ? moveCount : formatTime(timeElapsed)}</span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '8px 12px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.5)', letterSpacing: 1.5, marginBottom: 4 }}>LEADER</div>
            <div style={{ fontSize: 12, color: skin.gold, fontWeight: 600, marginBottom: 4 }}>{leaderFlag} {leaderAlias}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>Score</span>
              <span style={{ fontSize: 12, color: skin.gold }}>{leaderScore !== null ? leaderScore : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{isClassic ? 'Moves' : 'Time'}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,215,0,0.7)' }}>
                {isClassic
                  ? (leaderMoves !== null ? leaderMoves : '—')
                  : (leaderTime !== null ? formatTime(leaderTime) : '—')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Failed overlay (stub — full result UX is FL-UX-D-009) ───────────── */}
      {status === 'failed' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(13,6,32,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>⏱</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: DANGER }}>
            {isCampaign ? "TIME'S UP" : 'OUT OF MOVES'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            {isCampaign ? 'The timer ran out' : 'No moves remaining'}
          </div>
          <div
            onPointerDown={() => navigate(-1)}
            style={{ background: skin.gold, color: '#0D0620', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            ‹ BACK
          </div>
        </div>
      )}

      {/* B.2: Level 1 contextual tutorial overlay (first-time players only) */}
      {showTutorialHint && (
        <div
          onClick={() => setShowTutorialHint(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
        >
          <div style={{ fontSize: 40, animation: 'bounceDown 1s ease-in-out infinite', marginBottom: 12 }}>👇</div>
          <div style={{ background: 'rgba(127,119,221,0.9)', borderRadius: 12, padding: '10px 20px', fontSize: 15, color: 'white', fontFamily: skin.fontBody, textAlign: 'center' }}>
            Tap a dot and drag to its match
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tap anywhere to dismiss</div>
        </div>
      )}

      {/* Buy-hint sheet */}
      {showBuyHintModal && (
        <BuyHintModal onClose={() => setShowBuyHintModal(false)} onWatchAd={() => void onHint()} />
      )}

      {/* Hint toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '12%', left: 0, right: 0, textAlign: 'center', zIndex: 1100, pointerEvents: 'none' }}>
          <span style={{ fontFamily: skin.fontBody, fontSize: 13, color: skin.white, background: 'rgba(13,6,32,0.92)', border: '1px solid rgba(127,119,221,0.4)', borderRadius: 8, padding: '8px 14px' }}>
            {toast}
          </span>
        </div>
      )}

      {/* Abandon confirmation dialog */}
      {showAbandonDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: skin.bgCard, border: '1px solid rgba(127,119,221,0.25)', borderRadius: 16, padding: 24, width: 280, textAlign: 'center', fontFamily: skin.fontBody }}>
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
