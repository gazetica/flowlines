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
import { buildDailyLevelConfig, type DailyMode } from '../utils/dailyPuzzleGenerator';
import type { DotPair } from '../game/engine/GridEngine';
import type { GameMode } from '../game/engine/ScoreEngine';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { flagOf } from '../data/countries';
import { showHintAd, loadHintAd } from '../services/rewardedAdService';
import { trackLevelStart, trackLevelAbandon, trackAdImpression } from '../services/analytics';
import {
  playPathDraw, stopPathDraw, playLockIn, playUndo, playWinFl, playHint,
} from '../services/soundService';
import { startGameMusic, stopGameMusic, pauseGameMusic, resumeGameMusic } from '../services/musicService';
import { hapticLockIn, hapticWin, hapticUndo } from '../services/hapticService';

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

// FL-UX-D-008j: synthesised timer tick (no audio file). Normal = subtle high
// click; intense (last 10s) = louder, lower, slightly longer for urgency.
function playTick(audioCtx: AudioContext, intensity: 'normal' | 'intense') {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(intensity === 'intense' ? 880 : 1200, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(intensity === 'intense' ? 0.18 : 0.08, audioCtx.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (intensity === 'intense' ? 0.12 : 0.06));
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.15);
}

export function GameScreen() {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null); // FL-UX-D-008j tick sound
  const adInFlightRef = useRef(false); // FL-UX-D-008L: freeze the timer during a rewarded ad

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Store-driven dynamic values
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const status = useFlowGameStore((s) => s.status);
  const timeElapsed = useFlowGameStore((s) => s.timeElapsed);
  const timeLimitSeconds = useFlowGameStore((s) => s.timeLimitSeconds);
  const movesRemaining = useFlowGameStore((s) => s.movesRemaining);
  const classicMoveLimitTotal = useFlowGameStore((s) => s.classicMoveLimitTotal);
  const onGestureComplete = useFlowGameStore((s) => s.onGestureComplete);
  const gestureCount = useFlowGameStore((s) => s.gestureCount);
  // FL-UX-D-008L assist flags + actions
  const clueUsed = useFlowGameStore((s) => s.clueUsed);
  const extensionUsed = useFlowGameStore((s) => s.extensionUsed);
  const watchAdUsed = useFlowGameStore((s) => s.watchAdUsed);
  const markClueUsed = useFlowGameStore((s) => s.markClueUsed);
  const markWatchAdUsed = useFlowGameStore((s) => s.markWatchAdUsed);
  const applyTimeExtension = useFlowGameStore((s) => s.applyTimeExtension);
  const applyMoveExtension = useFlowGameStore((s) => s.applyMoveExtension);

  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const addGems = useFlowSettingsStore((s) => s.addGems);
  const firstLaunchComplete = useFlowSettingsStore((s) => s.firstLaunchComplete);
  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);

  const [showTutorialHint, setShowTutorialHint] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [adBusy, setAdBusy] = useState(false); // a rewarded ad is in flight

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
  // FL-UX-D-010: daily challenges are generated at runtime (not from any pack).
  const isDailyMode = rawMode === 'daily_campaign' || rawMode === 'daily_classic';
  const retryParam = searchParams.get('retry') === 'true';
  const levelData: LevelData = useMemo(
    () => (isDailyMode ? buildDailyLevelConfig(rawMode as DailyMode) : getLevel(packId, levelIndex) ?? TEST_LEVEL),
    [isDailyMode, rawMode, packId, levelIndex],
  );

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
      const retryQ = retryParam ? '&retry=true' : '';
      navigate(isDaily ? '/daily?completed=true' : `/result?pack=${packId}&level=${levelIndex}&mode=${rawMode}${retryQ}`);
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
      if (adInFlightRef.current) return; // FL-UX-D-008L: paused while a rewarded ad is up
      const s = useFlowGameStore.getState();
      s.setTimeElapsed(s.timeElapsed + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCampaign, isClassic, status]);

  // ─── FL-UX-D-008c / 010c: gesture counter — GameScene fires fl:gestureComplete
  // on each completed drag gesture. Registered for ALL modes: gestureCount feeds
  // the ScoreEngine gesture bonus (Campaign included); onGestureComplete only
  // decrements the move budget in Classic (Bug 3 — was Classic-only → Campaign
  // bonus was always 0).
  useEffect(() => {
    const handleGesture = () => { onGestureComplete(); };
    window.addEventListener('fl:gestureComplete', handleGesture);
    return () => window.removeEventListener('fl:gestureComplete', handleGesture);
  }, [onGestureComplete]);

  // ─── FL-UX-D-008j: Campaign timer tick (Web Audio, fires each second). Skips
  // silently until the AudioContext is created on first pointer interaction.
  useEffect(() => {
    if (!isCampaign) return;
    if (status !== 'playing') return;
    if (!audioCtxRef.current) return;
    if (timeLimitSeconds <= 0) return;
    playTick(audioCtxRef.current, timeRemaining <= 10 ? 'intense' : 'normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeElapsed]);

  useEffect(() => () => { void audioCtxRef.current?.close(); }, []);

  // ─── FL-UX-D-008: Campaign timeout → fail.
  useEffect(() => {
    if (!isCampaign) return;
    // Guard on timeLimitSeconds>0 so we never fail before initLevel has set the
    // real ceiling (a stale status:'playing' + uninitialised limit would be 0).
    if (timeLimitSeconds > 0 && timeRemaining === 0 && status === 'playing') {
      useFlowGameStore.setState({ status: 'failed' });
    }
  }, [timeRemaining, status, isCampaign, timeLimitSeconds]);

  // FL-UX-D-009: on fail (timeout / out of moves), go to the ResultScreen fail state.
  useEffect(() => {
    if (status === 'failed') {
      const retryQ = retryParam ? '&retry=true' : '';
      navigate(`/result?pack=${packId}&level=${levelIndex}&mode=${rawMode}&fail=true${retryQ}`);
    }
  }, [status, navigate, packId, levelIndex, rawMode, retryParam]);

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

  // FL-UX-D-008L: §9 monetisation model updated per brief (approved override).
  // Watch one rewarded ad via the existing FL rewarded flow (showHintAd); we ignore
  // the computed hint cell and act on the outcome. isTesting=true → instant reward
  // in debug. Returns true only when the player actually earned the reward.
  const watchRewarded = async (): Promise<boolean> => {
    if (adBusy) return false;
    setAdBusy(true);
    adInFlightRef.current = true; // freeze the Campaign/Classic timer for the watch
    try {
      const outcome = await showHintAd({ grid: levelData.grid, dots: levelData.dots as DotPair[] }, () => {});
      if (outcome === 'rewarded') {
        trackAdImpression({ ad_type: 'rewarded' });
        return true;
      }
      if (outcome === 'unavailable') flashToast('Ad unavailable — try again');
      return false;
    } finally {
      adInFlightRef.current = false;
      setAdBusy(false);
    }
  };

  // WATCH AD → +3 gems, once per level.
  const handleWatchAd = async () => {
    if (watchAdUsed) return;
    if (await watchRewarded()) { void addGems(3); markWatchAdUsed(); }
  };

  // GET A CLUE → auto-complete the most-constrained colour, once per level.
  const handleClue = async () => {
    if (clueUsed) return;
    if (await watchRewarded()) {
      markClueUsed();
      window.dispatchEvent(new CustomEvent('fl:autoCompleteClue'));
    }
  };

  // TIME / MOVE EXTENSION → +30s (Campaign) / +5 moves (Classic), once per level.
  const handleExtension = async () => {
    if (extensionUsed) return;
    if (await watchRewarded()) {
      if (isCampaign) applyTimeExtension();
      else if (isClassic) applyMoveExtension();
    }
  };

  // USE HINT → spend 1 gem, ghost-draw the solution path for ~3s. Unlimited
  // (gem-limited) per the §9 override. Still bumps hintsUsed for the score penalty.
  const handleHint = () => {
    if (gemBalance <= 0) return;
    void addGems(-1);
    playHint();
    window.dispatchEvent(new CustomEvent('fl:showHintGhost'));
    useFlowGameStore.setState((s) => ({ hintsUsed: s.hintsUsed + 1 }));
  };

  // ─── Visibility (FL-UX-D-008L) — clue at 1/3 resource used, extension at 2/3 ──
  const clueThresholdMet = isCampaign
    ? (timeLimitSeconds > 0 && timeElapsed >= timeLimitSeconds * 0.333)
    : isClassic
      ? (classicMoveLimitTotal > 0 && gestureCount >= classicMoveLimitTotal * 0.333)
      : false;
  const showClue = clueThresholdMet && !clueUsed && status === 'playing';

  const extensionThresholdMet = isCampaign
    ? (timeLimitSeconds > 0 && timeElapsed >= timeLimitSeconds * 0.666)
    : isClassic
      ? (classicMoveLimitTotal > 0 && gestureCount >= classicMoveLimitTotal * 0.666)
      : false;
  const showExtension = extensionThresholdMet && !extensionUsed && status === 'playing';

  const watchAdAvailable = !watchAdUsed;
  const hintAvailable = gemBalance > 0;

  const coverageGradient = isCampaign
    ? 'linear-gradient(90deg, #E67E22, #FFD700)'
    : isClassic
      ? 'linear-gradient(90deg, #7F77DD, #9B59B6)'
      : 'linear-gradient(90deg, #1ABC9C, #2ECC71)';

  const statLabel: CSSProperties = { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 2 };
  const statValue: CSSProperties = { fontFamily: 'monospace', fontWeight: 700, lineHeight: 1 };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#110527', display: 'flex', flexDirection: 'column' }}>
      {/* ── HUD ────────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: 'rgba(13,6,32,0.92)', borderBottom: '1px solid rgba(127,119,221,0.25)' }}>
        <div style={{ padding: '8px 14px 6px' }}>
          {/* Breadcrumb row (no back arrow — device back button only, FL-UX-D-008g) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
              {isZen
                ? `Zen · ${zenGrid}×${zenGrid} · ${cap(String(difficulty))}`
                : isDailyMode
                  ? `Daily Challenge · ${isCampaign ? 'Campaign' : 'Classic'}`
                  : `Pack ${levelData.pack} · Level ${String(levelIndex).padStart(2, '0')} · ${cap(String(difficulty))}`}
            </span>
            {isZen ? (
              <span style={{ background: 'rgba(26,188,156,0.15)', border: '1px solid rgba(26,188,156,0.35)', borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: ZEN_TEAL }}>
                ZEN
              </span>
            ) : (
              // FL-UX-D-008k: Flow Lines branding pill (replaces the gem/hint pill —
              // hints live in the USE HINT card below).
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '4px 10px' }}>
                <svg width="14" height="14" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 32 Q32 6 54 32" stroke="#E24B4A" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M10 32 Q32 58 54 32" stroke="#378ADD" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <circle cx="32" cy="32" r="8" fill="#7F77DD" />
                </svg>
                <span style={{ fontFamily: skin.fontDisplay, fontSize: 11, fontWeight: 700, color: skin.gold, letterSpacing: 1 }}>FLOW LINES</span>
              </span>
            )}
          </div>

          {/* Stat row — baseline aligned, TILES primary (FL-UX-D-008j) */}
          {(isCampaign || isClassic) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0 2px' }}>
              <div style={{ textAlign: 'left', minWidth: 60 }}>
                <div style={statLabel}>{isCampaign ? 'TIMER' : 'MOVES LEFT'}</div>
                <div style={{
                  ...statValue, fontSize: 22,
                  color: (isCampaign ? timerDanger : movesDanger) ? DANGER : '#FFFFFF',
                  animation: (isCampaign && timerDanger) || (isClassic && movesDanger) ? 'flTimerPulse 0.5s ease-in-out infinite' : 'none',
                }}>
                  {isCampaign ? formatTime(timeRemaining) : movesRemaining}
                </div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={statLabel}>TILES</div>
                <div style={{ ...statValue, fontSize: 36, color: tilesRemaining === 0 ? '#2ECC71' : skin.gold }}>{tilesRemaining}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 60 }}>
                <div style={statLabel}>{isCampaign ? 'MOVES' : 'TIME'}</div>
                <div style={{ ...statValue, fontSize: 22, color: '#FFFFFF' }}>
                  {isCampaign ? moveCount : formatTime(timeElapsed)}
                </div>
              </div>
            </div>
          )}

          {isZen && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, alignItems: 'baseline', padding: '4px 0 2px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>MOVES</div>
                <div style={{ ...statValue, fontSize: 26, color: ZEN_TEAL }}>{moveCount}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={statLabel}>TILES</div>
                <div style={{ ...statValue, fontSize: 36, color: tilesRemaining === 0 ? '#2ECC71' : skin.gold }}>{tilesRemaining}</div>
              </div>
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
        onPointerDown={() => {
          // FL-UX-D-008j: WebView audio policy requires AudioContext creation
          // after a user gesture — lazily create it on first board touch.
          if (!audioCtxRef.current) {
            const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioCtxRef.current = new Ctor();
          }
        }}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          margin: '6px 10px',
          borderRadius: 14,
          border: '1px solid rgba(127,119,221,0.35)',
          background: '#0D0620',
          boxShadow: '0 0 0 1px rgba(127,119,221,0.1), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      />

      {/* ── Bottom panel — Numtap 3-layer pattern ──────────────────────────── */}

      {/* Layer 1 — rescue pills: GET A CLUE (@33%) + TIME/MOVE EXTENSION (@66%).
          FL-UX-D-010b: the row is ALWAYS rendered (a hidden placeholder reserves its
          height when no pill is active) so toggling the pills mid-game never resizes
          the flex:1 Phaser board — which otherwise left the grid drawn off-centre,
          since GameScene only re-centres on loadLevel, not on canvas resize. */}
      {(isCampaign || isClassic) && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px 4px' }}>
          {!showClue && !showExtension && (
            <div aria-hidden style={{ flex: 1, visibility: 'hidden', display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', border: '1.5px solid transparent', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 11 }}>&nbsp;</div>
              <div style={{ fontSize: 9 }}>&nbsp;</div>
            </div>
          )}
          {showClue && (
            <button
              onPointerDown={() => void handleClue()}
              disabled={adBusy}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(26,188,156,0.08)', border: '1.5px dashed rgba(26,188,156,0.5)', borderRadius: 20, padding: '8px 12px', cursor: adBusy ? 'default' : 'pointer' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: ZEN_TEAL }}>💡 GET A CLUE</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Watch ad · auto-complete 1 path</div>
            </button>
          )}
          {showExtension && isCampaign && (
            <button
              onPointerDown={() => void handleExtension()}
              disabled={adBusy}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(230,126,34,0.08)', border: '1.5px dashed rgba(230,126,34,0.55)', borderRadius: 20, padding: '8px 12px', cursor: adBusy ? 'default' : 'pointer' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE }}>⏱ LOW ON TIME</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Watch ad — Add +30s</div>
            </button>
          )}
          {showExtension && isClassic && (
            <button
              onPointerDown={() => void handleExtension()}
              disabled={adBusy}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(127,119,221,0.08)', border: '1.5px dashed rgba(127,119,221,0.55)', borderRadius: 20, padding: '8px 12px', cursor: adBusy ? 'default' : 'pointer' }}
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
          onPointerDown={watchAdAvailable ? () => void handleWatchAd() : undefined}
          disabled={!watchAdAvailable || adBusy}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: watchAdAvailable ? 'rgba(52,152,219,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${watchAdAvailable ? 'rgba(52,152,219,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '10px 6px', opacity: watchAdAvailable ? 1 : 0.4, pointerEvents: watchAdAvailable ? 'auto' : 'none', cursor: watchAdAvailable ? 'pointer' : 'default' }}
        >
          <span style={{ fontSize: 20 }}>📺</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: watchAdAvailable ? '#3498DB' : 'rgba(255,255,255,0.3)', letterSpacing: 0.5 }}>WATCH AD</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{watchAdAvailable ? '+3 gems free' : 'Watched'}</span>
        </button>
        <button
          onPointerDown={hintAvailable ? handleHint : undefined}
          disabled={!hintAvailable}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: hintAvailable ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hintAvailable ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '10px 6px', opacity: hintAvailable ? 1 : 0.4, pointerEvents: hintAvailable ? 'auto' : 'none', cursor: hintAvailable ? 'pointer' : 'default' }}
        >
          <span style={{ fontSize: 20 }}>💡</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: hintAvailable ? skin.gold : 'rgba(255,255,255,0.3)', letterSpacing: 0.5 }}>USE HINT</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>💎 ×{gemBalance} left</span>
        </button>
      </div>

      {/* Layer 3 — YOU vs LEADER, 2 rows × 2 equal columns each (FL-UX-D-008k) */}
      {(isCampaign || isClassic) && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 10px 8px' }}>
          {/* YOU card — left col = identity (name / YOU), right col = stats (Score / Time) */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 10, padding: '8px 10px' }}>
            {/* Row 1: A = flag+name, B = Score */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{leaderFlag} {alias || 'Player'}</span>
              <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Score <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>—</span></span>
            </div>
            {/* Row 2: A = YOU label, B = Time/Moves */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 8, fontWeight: 700, color: 'rgba(127,119,221,0.7)', letterSpacing: 1.5 }}>YOU</span>
              <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{isCampaign ? 'Time' : 'Moves'} <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{isCampaign ? formatTime(timeElapsed) : gestureCount}</span></span>
            </div>
          </div>
          {/* LEADER card */}
          <div style={{ flex: 1, background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.18)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: skin.gold }}>{leaderFlag} {leaderAlias}</span>
              <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Score <span style={{ fontSize: 11, fontWeight: 700, color: skin.gold }}>{leaderScore !== null ? leaderScore : '—'}</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 8, fontWeight: 700, color: 'rgba(255,215,0,0.6)', letterSpacing: 1.5 }}>LEADER</span>
              <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{isCampaign ? 'Time' : 'Moves'} <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,215,0,0.7)' }}>{isCampaign ? (leaderTime !== null ? formatTime(leaderTime) : '—') : (leaderMoves !== null ? leaderMoves : '—')}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Failed state now navigates to the ResultScreen fail layout (FL-UX-D-009). */}

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
