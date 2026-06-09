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

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { TimerComponent } from './TimerComponent';
import { GameScene } from '../scenes/GameScene';
import { LeaderPanel } from './LeaderPanel';
import { BuyHintModal } from './BuyHintModal';
import { Capacitor } from '@capacitor/core';
import { loadRewarded, showRewarded } from '../services/rewardedAdService';
import { showRescueAd, isRescueEligible } from '../services/rescueAdService';
import { initAppLifecycle, removeAppLifecycle } from '../services/appLifecycle';
import * as soundService from '../services/soundService';
import * as musicService from '../services/musicService';
import { SKIN } from '../styles/skin';
import { App } from '@capacitor/app';
import { PauseModal, quitTarget } from './PauseModal';

export function GameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const phaserRef = useRef<Phaser.Game | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const { status, currentLevel, mode, score, runId, startLevel, tickTimer, endGame, engine, timed,
    grid, timeRemaining, setTimeRemaining, rescueTileIds, rescueBannerShown, markRescueBannerShown,
    resumeCountdown } =
    useGameStore();

  // T-006 Part 2.3: hint inventory + BuyHintModal (renamed T-008).
  const hintCount = useSettingsStore((s) => s.hintCount);
  const consumeHint = useSettingsStore((s) => s.consumeHint);
  const addGems = useSettingsStore((s) => s.addGems); // F-005 Part 5

  // F-005 Part 7: Rescue Flash banner local visibility (one per attempt). The
  // once-per-attempt guard lives in gameStore (rescueBannerShown); this stays true
  // while the banner is on screen and is cleared on tap / new attempt.
  const [rescueBannerVisible, setRescueBannerVisible] = useState(false);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  // F-001c (corr.3): cyan hint overlay — stays on the target tile until the
  // player taps it correctly (then removed instantly). `value` is the hinted
  // target; clearing is driven by expectedNext advancing past it (see effect).
  const [hint, setHint] = useState<{ left: number; top: number; size: number; value: number } | null>(null);
  // T-008 Part 3.4: brief in-game toast (e.g. ad dismissed / unavailable).
  const [toast, setToast] = useState<string | null>(null);
  // T-017 AC7: max 3 rewarded hints per game session (resets each new level/run).
  const MAX_SESSION_HINTS = 3;
  const [sessionHints, setSessionHints] = useState(0);

  // F-002: pause modal on Android back button during active play. pauseOpenRef
  // mirrors the state so the (once-registered) back listener reads it without a
  // stale closure.
  const [pauseOpen, setPauseOpen] = useState(false);
  const pauseOpenRef = useRef(false);

  const openPause = () => {
    if (pauseOpenRef.current) return;
    pauseOpenRef.current = true;
    setPauseOpen(true);
    useGameStore.getState().pauseGame();          // status → paused → TimerComponent freezes
    phaserRef.current?.scene.pause('GameScene');  // stop the scene update loop
  };
  const resumePause = () => {
    if (!pauseOpenRef.current) return;
    pauseOpenRef.current = false;
    setPauseOpen(false);
    phaserRef.current?.scene.resume('GameScene');
    useGameStore.getState().resumeGame();         // timer resumes from the frozen value
  };
  const restartFromPause = () => {
    pauseOpenRef.current = false;
    setPauseOpen(false);
    phaserRef.current?.scene.resume('GameScene'); // scene must run for the fresh render
    const st = useGameStore.getState();
    const lvl = st.currentLevel;
    if (!lvl) return;
    if (st.mode === 'freeplay') {
      st.startFreePlay({ gridSize: lvl.grid, difficulty: st.difficulty, timerSecs: st.timed ? lvl.timeLimit : null });
    } else if (st.mode === 'daily' && st.currentChallengeIndex) {
      st.startDailyChallenge(st.currentChallengeIndex);
    } else {
      // Campaign: keep pro/expert; omit difficulty for C1 ('easy') so the level's
      // own direction (e.g. descending levels) is preserved, not forced ascending.
      st.startLevel(lvl.id, st.mode, st.difficulty === 'easy' ? undefined : st.difficulty);
    }
  };
  const quitFromPause = () => {
    pauseOpenRef.current = false;
    setPauseOpen(false);
    navigate(quitTarget(useGameStore.getState().mode));
  };

  // Intercept the Android back button while GameScreen is mounted (native only).
  // While paused → resume; while actively playing → open the pause modal; else a
  // safe fallback to Home so the player is never trapped.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    App.addListener('backButton', () => {
      if (pauseOpenRef.current) { resumePause(); return; }
      if (useGameStore.getState().status === 'playing') { openPause(); return; }
      navigate('/home');
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  };

  // T-007 Fix 4: left promo card alternates GET MORE HINTS / REMOVE ADS every 5s.
  const [promo, setPromo] = useState<'hints' | 'ads'>('hints');
  useEffect(() => {
    const id = setInterval(() => setPromo((p) => (p === 'hints' ? 'ads' : 'hints')), 5000);
    return () => clearInterval(id);
  }, []);

  // T-007 Fix 4: the timer resumes from where it was paused after a trip to the
  // IAP screen. Navigating to /iap unmounts GameScreen, so the TimerComponent
  // would otherwise restart at the full limit. We capture the remaining time ONCE
  // at mount (timeLimit − elapsed-so-far) and feed it as the countdown duration —
  // a fresh game has elapsed 0 (= full limit); a resume picks up mid-countdown.
  const [resumeDuration] = useState(() => {
    const st = useGameStore.getState();
    const limit = st.currentLevel?.timeLimit ?? 30;
    return Math.max(1, Math.round(limit - st.timeElapsed));
  });

  // B-002e: gameplay audio lifecycle. Stop the menu water-drip while playing
  // (AC3) and preload the SFX for near-zero-latency taps (AC6/AC7). On exit,
  // unload the SFX and resume the drip — but only if the Music toggle is on, so
  // SFX (Sound toggle) and drip (Music toggle) stay independent (AC11). The
  // Result screen also resumes the drip on its own mount (AC3).
  useEffect(() => {
    musicService.pause();
    soundService.preload();
    return () => {
      soundService.unload();
      if (useSettingsStore.getState().musicEnabled) musicService.play();
    };
  }, []);

  // T-017 AC2: preload the rewarded ad on mount so it is ready when Hint is tapped
  // (native only — AdMob has no web implementation). The service reloads itself
  // after each show.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) void loadRewarded();
  }, []);

  // T-017 AC7: reset the per-session hint count whenever a new level/run starts.
  // F-005: also hide any rescue banner left over from the previous attempt.
  useEffect(() => {
    setSessionHints(0);
    setRescueBannerVisible(false);
  }, [runId]);

  // Highlight the current target tile (gold) for ~5s via the existing
  // GameScene.showHint tween, marking the hint active so the next tap clears it.
  const applyHintToTile = () => {
    const next = useGameStore.getState().engine?.getExpectedNext() ?? 1;
    useGameStore.getState().useHint();
    // F-001c Change 4: cyan overlay on the target tile (replaces the GameScene
    // scale-pulse — showHint is intentionally NOT called, so GameScene.ts stays
    // untouched). It persists until the correct tile is tapped (no 5s timer); the
    // expectedNext effect below clears it instantly on that correct tap.
    showHintOverlay(next);
  };

  // F-001c: compute the next-target tile's on-screen rect and highlight it cyan.
  // Same grid geometry the scene's renderGrid() uses (window dims + grid size).
  const showHintOverlay = (value: number) => {
    const st = useGameStore.getState();
    const grid = st.grid;
    const n = st.currentLevel?.grid ?? 0;
    let target: { r: number; c: number } | null = null;
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < (grid[r]?.length ?? 0); c++)
        if (grid[r][c].value === value && !grid[r][c].tapped) target = { r, c };
    if (!target || !n) return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const tileSize = Math.floor(Math.min(screenW - 48, screenH * 0.65) / n) - 4;
    const gap = 4;
    const gridPixelSize = n * (tileSize + gap) - gap;
    const startX = (screenW - gridPixelSize) / 2;
    const startY = screenH * 0.2;
    const left = startX + target.c * (tileSize + gap);
    const top = startY + target.r * (tileSize + gap);
    setHint({ left, top, size: tileSize, value });
  };

  // Right card: use a hint if available, else pause the game and open the
  // BuyHintModal (which resumes on every close path via closeHintModal).
  const handleHintTap = () => {
    if (status !== 'playing') return;
    if (consumeHint()) {
      applyHintToTile();
    } else {
      useGameStore.getState().pauseGame();
      setHintModalOpen(true);
    }
  };

  const closeHintModal = () => {
    setHintModalOpen(false);
    useGameStore.getState().resumeGame();
  };

  // Middle "WATCH AD" card = the T-017 rewarded-hint button. Tap → (cap check) →
  // if Remove Ads is owned, grant the highlight instantly (AC6); otherwise pause
  // and play the preloaded rewarded ad. Highlight the next tile only when the ad
  // is watched to completion (AC4); a skip/dismiss grants nothing and applies no
  // penalty (AC5); no fill shows a "No ad available" toast (no crash). The gem
  // "USE HINT" card and inventory are unaffected.
  const handleWatchAd = async () => {
    if (status !== 'playing') return;
    if (sessionHints >= MAX_SESSION_HINTS) {
      showToast(t('game.toast_no_hints'));
      return;
    }

    // F-005-FIX: the rewarded WATCH AD is an opt-in gem source available to ALL
    // players — including Remove Ads owners (the old AC6 instant-grant shortcut is
    // gone). Only auto interstitials are suppressed by removeAdsPurchased.
    // F-008 FIX 1: freeze the clock for the whole ad. pauseTimer flips status→paused;
    // TimerComponent's per-tick live check (getPaused) then refuses to decrement even if
    // a background-suspended WebView interval keeps firing during the ad. The round is
    // un-paused only at the END of the 3-2-1 countdown, so it can't expire under the ad.
    useGameStore.getState().pauseTimer();
    const outcome = await showRewarded();

    if (outcome === 'rewarded') {
      // F-008 FIX 2: defer the reward state writes onto a fresh JS task (setTimeout 0).
      // showRewarded resolves from the AdMob bridge as the native ad activity is
      // tearing down; applying Zustand updates synchronously on that tick is what made
      // the hint-card subtree unmount and "freeze". A 0ms hop runs them on a clean
      // React cycle after the ad activity is fully gone.
      setTimeout(() => {
        applyHintToTile();
        void addGems(3); // F-005 Part 5: +3 gems per rewarded watch (was a free hint only)
        setSessionHints((n) => n + 1);
      }, 0);
    } else if (outcome === 'unavailable') {
      showToast(t('game.toast_no_ad'));
    }
    // 'dismissed' → no highlight, no penalty, no toast (AC5)

    // F-008 FIX 1 Part B: 3-2-1 overlay, then resumeTimer() (fires at count 0).
    useGameStore.getState().startResumeCountdown();
  };

  // T-007 Fix 4: left card → pause the timer, then go to the IAP screen. The
  // pause keeps timeElapsed frozen in the store; on return the screen remounts
  // 'paused' and the resume-on-mount effect below picks the game back up, with
  // the timer continuing from where it left off (see timerDuration).
  const handleBuyNav = () => {
    useGameStore.getState().pauseGame();
    navigate('/iap');
  };

  // Background: drifting faint gold numbers on a canvas behind the grid.
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; num: number; size: number; speed: number; opacity: number; drift: number };
    const particles: Particle[] = [];

    const spawn = (): Particle => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      num: Math.floor(Math.random() * 49) + 1,
      size: 9 + Math.random() * 7,
      speed: 0.18 + Math.random() * 0.22,
      opacity: 0.04 + Math.random() * 0.05,
      drift: (Math.random() - 0.5) * 0.15,
    });

    // Pre-populate
    for (let i = 0; i < 14; i++) {
      const p = spawn();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    let frameId: number;
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;
      if (frameCount % 200 === 0) particles.push(spawn());

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y -= p.speed;
        p.x += p.drift;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#FFD700';
        ctx.font = `${p.size}px 'Space Mono', monospace`;
        ctx.fillText(String(p.num).padStart(2, '0'), p.x, p.y);
        ctx.restore();
        if (p.y < -20) particles.splice(i, 1);
      }
      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Boot Phaser once on mount
  useEffect(() => {
    if (phaserRef.current) return;
    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      // Transparent so the DOM background (navy + dot pattern + drifting particle
      // canvas, all z-index 0) shows through behind the Phaser grid (z-index 1).
      // The navy base comes from index.css (html/body), the grid + radial glow
      // render on the transparent canvas on top.
      transparent: true,
      parent: 'phaser-container',
      scene: [GameScene],
    });
    // Restore rendering on resume from screen lock / backgrounding (T-007).
    initAppLifecycle(phaserRef.current);
    // The level/mode is normally chosen by HomeScreen (startLevel before
    // navigating here). Only start a fallback level if we arrived at /game with
    // truly no active game (status 'idle' — a direct navigation / reload). A
    // 'paused' status means we are returning from the IAP screen mid-game (T-007
    // Fix 4): keep the existing game and resume it (handled in the effect below).
    if (useGameStore.getState().status === 'idle') {
      startLevel(1, 'campaign');
    }
    return () => {
      removeAppLifecycle();
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // T-007 Fix 4: returning from the IAP screen remounts this screen with the game
  // still 'paused'. Resume it once on mount so the timer continues counting and
  // the grid re-renders (give Phaser a moment to boot before renderGrid).
  useEffect(() => {
    if (useGameStore.getState().status === 'paused') {
      useGameStore.getState().resumeGame();
      const id = setTimeout(() => {
        const scene = phaserRef.current?.scene.getScene('GameScene') as GameScene | null;
        scene?.renderGrid();
      }, 80);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When level starts, trigger grid render in Phaser
  useEffect(() => {
    if (status === 'playing') {
      const scene = phaserRef.current?.scene.getScene('GameScene') as GameScene | null;
      scene?.renderGrid();
    }
  }, [status]);

  // Handle game end — go to ResultScreen, which shows stars/score and records
  // the completion (recording lives there now to avoid double-recording).
  useEffect(() => {
    if (status === 'complete' || status === 'failed') {
      // Short delay so the player sees the final board before the transition.
      const id = setTimeout(() => navigate('/result'), 600);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const expectedNext = engine?.getExpectedNext() ?? 1;
  const isPaused = status === 'paused';
  const timeLimit = currentLevel?.timeLimit ?? 30;

  // F-001b: campaign tier from the level id — Pro (101–200) / Expert (201–300).
  // Drives the right-aligned HUD label + the play-area border colour.
  const campaignTier: 'pro' | 'expert' | null = currentLevel
    ? currentLevel.id >= 201 ? 'expert' : currentLevel.id >= 101 ? 'pro' : null
    : null;
  const tierColor = campaignTier === 'expert' ? '#00f5ff' : campaignTier === 'pro' ? '#9B59B6' : undefined;

  // F-001c (corr.3): clear the hint overlay the instant the hinted tile is tapped
  // correctly — expectedNext advances past the hinted value. A wrong tap leaves
  // expectedNext unchanged, so the overlay stays.
  useEffect(() => {
    if (hint && hint.value !== expectedNext) setHint(null);
  }, [expectedNext, hint]);

  // —— F-005 Part 7: Rescue Flash ——————————————————————————————————————
  // Eligibility — ALL conditions must hold (grid > 3×3, timed level with a >15s
  // limit, in the final third of the clock, ≥3 tiles left, no Remove Ads, and the
  // banner not already shown this attempt).
  const gridSize = currentLevel?.grid ?? 0;
  const tilesRemaining = grid.reduce((acc, row) => acc + row.filter((cell) => !cell.tapped).length, 0);
  // F-005-FIX: read the real countdown from the store (set by TimerComponent.onTick),
  // and no longer gate on removeAdsPurchased (rescue is opt-in, available to all).
  const rescueEligible = isRescueEligible({
    playing: status === 'playing',
    timed,
    gridSize,
    timeLimit,
    timeRemaining,
    tilesRemaining,
    bannerShown: rescueBannerShown,
  });

  // Show the banner once eligibility is first met; mark it shown so a later dip
  // back below the threshold never re-shows it (one banner per attempt).
  useEffect(() => {
    if (rescueEligible) {
      setRescueBannerVisible(true);
      markRescueBannerShown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueEligible]);

  const rescueSub =
    tilesRemaining >= 5 ? t('game.rescue_sub_5') : tilesRemaining === 4 ? t('game.rescue_sub_4') : t('game.rescue_sub_3');

  const handleRescueTap = async () => {
    const reveal = Math.min(5, tilesRemaining);
    setRescueBannerVisible(false); // banner never shows twice in an attempt
    // F-008 FIX 1: freeze the clock for the whole rescue ad (per-tick live pause check
    // in TimerComponent makes this robust to a background-ticking WebView); resume only
    // after the 3-2-1 overlay. (showRescueAd reveals the amber tiles on reward.)
    useGameStore.getState().pauseTimer();
    await showRescueAd(reveal);
    useGameStore.getState().startResumeCountdown();
  };

  // On-screen rects for the amber rescue tiles (untapped only — they drop off as the
  // player taps them). Same grid geometry as the cyan hint overlay (window dims + n).
  const rescueRects: { left: number; top: number; size: number; value: number }[] = [];
  if (rescueTileIds.length && status === 'playing' && gridSize) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const rTileSize = Math.floor(Math.min(screenW - 48, screenH * 0.65) / gridSize) - 4;
    const rGap = 4;
    const rGridPixelSize = gridSize * (rTileSize + rGap) - rGap;
    const rStartX = (screenW - rGridPixelSize) / 2;
    const rStartY = screenH * 0.2;
    for (const value of rescueTileIds) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
          if (grid[r][c].value === value && !grid[r][c].tapped) {
            rescueRects.push({ left: rStartX + c * (rTileSize + rGap), top: rStartY + r * (rTileSize + rGap), size: rTileSize, value });
          }
        }
      }
    }
  }

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
      {/* Dot pattern background (z-index 0) */}
      <div className="bg-dots" />

      {/* Particle canvas — floating gold numbers (z-index 0) */}
      <canvas
        id="particle-canvas"
        ref={particleCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      />

      {/* Phaser canvas container (z-index 1, above background, below HUD) */}
      {/* F-001b: tier-coloured play-area border (Pro purple / Expert cyan); none for C1. */}
      {/* F-008 FIX 1 Part B: tiles non-interactive during the resume countdown so a
          stray tap during 3-2-1 can't register on the grid. */}
      <div id="phaser-container" style={{ position: 'absolute', inset: 0, zIndex: 1, border: tierColor ? `2px solid ${tierColor}` : 'none', boxShadow: tierColor ? `inset 0 0 24px ${tierColor}33` : 'none', pointerEvents: resumeCountdown !== null ? 'none' : 'auto' }} />

      {/* F-001c (corr.3): cyan hint highlight — stays on the target tile until the
          correct tap, then removed instantly (no fade). */}
      {hint && (
        <div
          style={{
            position: 'absolute',
            left: hint.left,
            top: hint.top,
            width: hint.size,
            height: hint.size,
            background: '#00f5ff',
            borderRadius: 6,
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.55,
            boxShadow: '0 0 18px rgba(0,245,255,0.7)',
          }}
        />
      )}

      {/* F-005 Part 7: amber rescue tiles — revealed numbers (white on amber),
          pulsing gold glow. pointer-events:none so taps pass through to Phaser. */}
      <style>{`@keyframes rescue-pulse { 0%,100% { box-shadow: 0 0 8px rgba(255,215,0,0.5); } 50% { box-shadow: 0 0 18px rgba(255,215,0,0.95); } }`}</style>
      {rescueRects.map((rect) => (
        <div
          key={rect.value}
          style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.size,
            height: rect.size,
            background: '#FF8C00',
            borderRadius: 6,
            border: '1px solid #FFD700',
            zIndex: 4,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'rescue-pulse 1.5s ease-in-out infinite',
          }}
        >
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: Math.floor(rect.size * 0.38), fontWeight: 700, color: '#FFFFFF' }}>
            {rect.value}
          </span>
        </div>
      ))}

      {/* HUD overlay — glassmorphism bar (T-009c: 2-row grid so the three labels
          align on one line and the three values share a baseline). The TIMER value
          is rendered by TimerComponent (own inline 36px); a scoped !important rule
          below resizes it to 22px without touching that component. */}
      <style>{`.hud-timer-value > span { font-size: 22px !important; line-height: 1 !important; }`}</style>
      <div
        className="glass"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '14%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: 'auto auto',
          alignContent: 'center',
          alignItems: 'baseline',
          justifyItems: 'center',
          rowGap: '3px',
          padding: '0 20px',
          zIndex: 10,
        }}
      >
        {/* Labels row — same size / colour / line for all three */}
        <div style={HUD_LABEL}>{t('game.hud_timer')}</div>
        <div style={HUD_LABEL}>{t('game.hud_next')}</div>
        <div style={HUD_LABEL}>{t('game.hud_score')}</div>

        {/* Values row — baseline-aligned. TIMER & SCORE 22px white; NEXT 28px gold. */}
        <div className="hud-timer-value" style={{ fontFamily: "'Space Mono',monospace", fontSize: '22px', lineHeight: 1, color: '#F0F4FF' }}>
          {/* T-004B P2: untimed Free Play shows ∞ and never expires. */}
          {timed ? (
            <TimerComponent
              key={runId}
              durationSeconds={resumeDuration}
              paused={isPaused || status !== 'playing'}
              // F-008 FIX 1: live, render-independent pause check. The `paused` prop
              // clears the interval, but that depends on a React commit that does NOT
              // happen while a rewarded ad holds the WebView in the background — so a
              // stale/burst interval could still drain the clock. This reads the store
              // synchronously every tick and refuses to decrement unless truly playing.
              getPaused={() => useGameStore.getState().status !== 'playing'}
              onTick={(remaining) => {
                tickTimer(timeLimit - remaining);
                setTimeRemaining(remaining); // F-005-FIX: real countdown value → store (rescue threshold)
                // B-002e AC4/AC5: clock tick every second; the same asset at rate
                // 1.5 when <=10s left (matches the timer's existing danger / red-
                // pulse threshold). onTick is the existing per-second callback —
                // no new timer created.
                soundService.playTick(remaining <= 10);
              }}
              onExpire={() => {
                // F-008 FIX 2: only end on a genuine in-play expiry. If a stray timer
                // tick lands while the round is paused for an ad / resume countdown, it
                // must not flip status to 'failed' — that no-op'd the post-ad resume and
                // left the hint cards (gated on status==='playing') unmounted (the freeze).
                if (useGameStore.getState().status === 'playing') endGame('expired');
              }}
            />
          ) : (
            <span>∞</span>
          )}
        </div>
        <div
          className="text-gold-glow"
          style={{ fontFamily: "'Space Mono',monospace", fontSize: '28px', fontWeight: 700, lineHeight: 1, color: '#FFD700' }}
        >
          {String(expectedNext).padStart(2, '0')}
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '22px', lineHeight: 1, color: '#F0F4FF' }}>
          {score.toLocaleString()}
        </div>
      </div>

      {/* Level badge (T-009b Fix 3) — moved out of the 4-column HUD bar to sit
          just below it, above the grid. Classic/Campaign only; sourced from
          currentLevel.id, never hardcoded. Absent in Daily/Endless/Speed/Free Play.
          Absolutely positioned so it never shifts the Phaser grid. */}
      {mode === 'campaign' && currentLevel && (
        <div
          style={{
            position: 'absolute',
            top: '14.5%',
            left: 0,
            right: 0,
            padding: '0 22px',
            zIndex: 10,
            fontFamily: "'Space Mono', monospace",
            fontSize: '11px',
            letterSpacing: '1px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            <span style={{ color: '#6B84A8' }}>{t('game.level_prefix')} </span>
            <span style={{ color: '#F0F4FF' }}>{currentLevel.id}</span>
          </span>
          {/* F-001b: PRO/EXPERT tier label, right-aligned (campaigns 2/3 only). */}
          {campaignTier && (
            <span style={{ color: tierColor, fontWeight: 700 }}>
              {t(campaignTier === 'expert' ? 'tier.expert' : 'tier.pro')}
            </span>
          )}
        </div>
      )}

      {/* T-008 Part 3: three hint cards (rotating promo · watch ad · use hint)
          stacked above the LeaderPanel in the dead space below the grid. Shown
          for all play modes (GameScreen is never reached during onboarding). */}
      {status === 'playing' && (
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: 0,
            right: 0,
            padding: '0 16px',
            zIndex: 10,
          }}
        >
          {/* F-005 Part 7: Rescue Flash banner — below the grid, above the hint cards.
              Tapping it watches a rescue ad and reveals min(5, remaining) amber tiles. */}
          {rescueBannerVisible && (
            <>
              {/* F-006 Change 1: orange glow settles from bright to pale over 0.6s. */}
              <style>{`@keyframes rescue-glow { 0% { box-shadow: 0 0 16px #FF8C00; } 100% { box-shadow: 0 0 6px rgba(255,140,0,0.4); } }`}</style>
              <button
                onClick={handleRescueTap}
                style={{
                  // F-007 FIX 1: pill at 80% width (−20%), centred horizontally (margin
                  // auto) and vertically in the gap (equal 8px top/bottom) between the
                  // grid above and the three hint cards below.
                  width: '80%',
                  margin: '8px auto',
                  background: 'rgba(7,17,31,0.95)',
                  border: '1px solid rgba(255,140,0,0.4)',
                  borderRadius: 50,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  animation: 'rescue-glow 0.6s ease-out',
                  boxShadow: '0 0 6px rgba(255,140,0,0.4)',
                }}
              >
                {/* Hero line — gold, bold; constant for all tile counts. */}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: '#FFD700', letterSpacing: 1 }}>
                  {t('game.rescue_heading')}
                </span>
                {/* Sub line — white; "Watch ad → reveal N tiles". */}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#FFFFFF' }}>
                  {rescueSub}
                </span>
              </button>
            </>
          )}

          {/* Three-card row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, margin: '6px 0', width: '100%' }}>
            {/* Left card — rotating promo (GET MORE HINTS / REMOVE ADS) */}
            <button
              onClick={handleBuyNav}
              style={{
                ...HINT_CARD_BASE,
                border: `1px solid ${promo === 'hints' ? 'rgba(255,215,0,0.3)' : 'rgba(30,139,195,0.3)'}`,
                position: 'relative',
                transition: 'border-color 0.3s',
              }}
            >
              {/* State A — Get More Hints */}
              <div style={{ ...PROMO_CONTENT, opacity: promo === 'hints' ? 1 : 0, transition: 'opacity 0.3s' }}>
                <span style={{ fontSize: 20, color: '#FFD700' }}>💎</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#FFD700', letterSpacing: 0.3 }}>{t('game.get_more_hints')}</span>
                <span style={{ fontSize: 8, color: SKIN.muted }}>{t('game.get_more_hints_sub')}</span>
              </div>
              {/* State B — Remove Ads */}
              <div style={{ ...PROMO_CONTENT, opacity: promo === 'ads' ? 1 : 0, transition: 'opacity 0.3s' }}>
                <span style={{ fontSize: 20 }}>🚫</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: SKIN.white, letterSpacing: 0.3 }}>{t('game.remove_ads')}</span>
                <span style={{ fontSize: 8, color: SKIN.muted }}>{t('game.remove_ads_sub')}</span>
              </div>
            </button>

            {/* Middle card — WATCH AD (rewarded → +1 hint) */}
            <button
              onClick={handleWatchAd}
              style={{ ...HINT_CARD_BASE, border: '1px solid rgba(46,204,113,0.3)' }}
            >
              <span style={{ fontSize: 20 }}>📺</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: SKIN.white, letterSpacing: 0.3 }}>{t('game.watch_ad')}</span>
              <span style={{ fontSize: 8, color: SKIN.muted }}>{t('game.watch_ad_sub')}</span>
            </button>

            {/* Right card — USE HINT */}
            <button
              onClick={handleHintTap}
              style={{ ...HINT_CARD_BASE, border: '1px solid rgba(0,210,200,0.3)' }}
            >
              <span style={{ fontSize: 20, color: '#FFD700' }}>💡</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#FFD700', letterSpacing: 0.3 }}>{t('game.use_hint')}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: SKIN.white }}>💎 {t('game.hints_left', { count: hintCount })}</span>
            </button>
          </div>

          {/* Per-level leader panel (YOU vs LEADER) — campaign only. Daily uses
              synthetic level id 0 → excluded. Sits directly below the cards. */}
          {mode === 'campaign' && currentLevel && currentLevel.id > 0 && (
            <LeaderPanel levelId={currentLevel.id} compact={true} />
          )}
        </div>
      )}

      {/* Brief toast (ad dismissed / unavailable) */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            bottom: '24%',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: SKIN.white,
              background: 'rgba(8,18,32,0.92)',
              border: '1px solid rgba(30,139,195,0.4)',
              borderRadius: 8,
              padding: '8px 14px',
            }}
          >
            {toast}
          </span>
        </div>
      )}

      {hintModalOpen && (
        <BuyHintModal onClose={closeHintModal} onApplyHint={applyHintToTile} />
      )}

      {/* F-002: pause overlay (Android back during play). Resume / Restart / Quit. */}
      {pauseOpen && (
        <PauseModal onResume={resumePause} onRestart={restartFromPause} onQuit={quitFromPause} />
      )}

      {/* F-008 FIX 1 Part B: 3-2-1 resume countdown overlay shown after a rewarded ad
          closes, before the timer resumes. Sits above ALL game UI; its full-screen
          backdrop also intercepts taps so the grid stays non-interactive. */}
      {resumeCountdown !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(7,17,31,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#FFFFFF', letterSpacing: 1 }}>
            {t('game.resuming_in')}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 48, fontWeight: 700, color: '#FFD700', textShadow: '0 0 16px rgba(255,215,0,0.4)' }}>
            {resumeCountdown}
          </span>
        </div>
      )}

    </div>
  );
}

// HUD label style (T-009c) — TIMER / NEXT / SCORE, all identical.
const HUD_LABEL: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '9px',
  color: '#6B84A8',
  letterSpacing: '1px',
};

// Shared base for the two hint cards (T-007 Fix 4) — equal-width halves.
const HINT_CARD_BASE: React.CSSProperties = {
  flex: 1,
  minHeight: 72,
  background: 'linear-gradient(145deg, #0F2A48 0%, #0A1E38 100%)',
  borderRadius: 8,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  cursor: 'pointer',
};

// Absolutely-stacked promo states so they cross-fade in place.
const PROMO_CONTENT: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
};
