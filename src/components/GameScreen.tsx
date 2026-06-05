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
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { TimerComponent } from './TimerComponent';
import { GameScene } from '../scenes/GameScene';
import { LeaderPanel } from './LeaderPanel';
import { BuyHintModal } from './BuyHintModal';
import { showRewarded } from '../services/admob';
import { initAppLifecycle, removeAppLifecycle } from '../services/appLifecycle';
import { SKIN } from '../styles/skin';

export function GameScreen() {
  const navigate = useNavigate();
  const phaserRef = useRef<Phaser.Game | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const { status, currentLevel, mode, score, runId, startLevel, tickTimer, endGame, engine, timed } =
    useGameStore();

  // T-006 Part 2.3: hint inventory + BuyHintModal (renamed T-008).
  const hintCount = useSettingsStore((s) => s.hintCount);
  const consumeHint = useSettingsStore((s) => s.consumeHint);
  const addHints = useSettingsStore((s) => s.addHints);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  // T-008 Part 3.4: brief in-game toast (e.g. ad dismissed / unavailable).
  const [toast, setToast] = useState<string | null>(null);
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

  // Highlight the current target tile (gold) for ~5s via the existing
  // GameScene.showHint tween, marking the hint active so the next tap clears it.
  const applyHintToTile = () => {
    const scene = phaserRef.current?.scene.getScene('GameScene') as GameScene | null;
    const next = useGameStore.getState().engine?.getExpectedNext() ?? 1;
    useGameStore.getState().useHint();
    scene?.showHint(next);
    // Safety: clear the active flag after the 5s highlight if no tap cleared it.
    setTimeout(() => useGameStore.getState().deactivateHint(), 5000);
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

  // Middle card (T-008 Part 3.4): pause → rewarded ad → on completion award +1
  // hint, immediately spend it on the current tile, and resume. On dismiss or
  // when no ad is available, resume with a brief toast. admob.ts has no separate
  // availability probe, so we pause then attempt; a failed/unavailable ad resumes
  // immediately (the pause is momentary).
  const handleWatchAd = async () => {
    if (status !== 'playing') return;
    useGameStore.getState().pauseGame();
    let rewarded = false;
    try {
      await showRewarded(() => {
        rewarded = true;
      });
    } catch {
      useGameStore.getState().resumeGame();
      showToast('No ads available right now');
      return;
    }
    if (rewarded) {
      await addHints(1);
      consumeHint();
      applyHintToTile();
      useGameStore.getState().resumeGame();
    } else {
      useGameStore.getState().resumeGame();
      showToast('Watch the full ad to get a hint');
    }
  };

  // T-007 Fix 4: left card → pause the timer, then go to the IAP screen. The
  // pause keeps timeElapsed frozen in the store; on return the screen remounts
  // 'paused' and the resume-on-mount effect below picks the game back up, with
  // the timer continuing from where it left off (see resumeDuration).
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
      <div id="phaser-container" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

      {/* HUD overlay — glassmorphism bar rendered over the Phaser canvas */}
      <div
        className="glass"
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
          {/* T-004B P2: untimed Free Play shows ∞ and never expires. */}
          {timed ? (
            <TimerComponent
              key={runId}
              durationSeconds={resumeDuration}
              paused={isPaused || status !== 'playing'}
              onTick={(remaining) => {
                tickTimer(timeLimit - remaining);
              }}
              onExpire={() => endGame('expired')}
            />
          ) : (
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '28px', color: '#EEF4FF' }}>∞</div>
          )}
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
            className="text-gold-glow"
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '32px',
              fontWeight: 700,
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
          }}
        >
          <span style={{ color: '#6B84A8' }}>LEVEL </span>
          <span style={{ color: '#F0F4FF' }}>{currentLevel.id}</span>
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
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#FFD700', letterSpacing: 0.3 }}>GET MORE HINTS</span>
                <span style={{ fontSize: 8, color: SKIN.muted }}>Tap to buy gem packs</span>
              </div>
              {/* State B — Remove Ads */}
              <div style={{ ...PROMO_CONTENT, opacity: promo === 'ads' ? 1 : 0, transition: 'opacity 0.3s' }}>
                <span style={{ fontSize: 20 }}>🚫</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: SKIN.white, letterSpacing: 0.3 }}>REMOVE ADS</span>
                <span style={{ fontSize: 8, color: SKIN.muted }}>Play without interruptions</span>
              </div>
            </button>

            {/* Middle card — WATCH AD (rewarded → +1 hint) */}
            <button
              onClick={handleWatchAd}
              style={{ ...HINT_CARD_BASE, border: '1px solid rgba(46,204,113,0.3)' }}
            >
              <span style={{ fontSize: 20 }}>📺</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: SKIN.white, letterSpacing: 0.3 }}>WATCH AD</span>
              <span style={{ fontSize: 8, color: SKIN.muted }}>Get 1 hint free</span>
            </button>

            {/* Right card — USE HINT */}
            <button
              onClick={handleHintTap}
              style={{ ...HINT_CARD_BASE, border: '1px solid rgba(0,210,200,0.3)' }}
            >
              <span style={{ fontSize: 20, color: '#FFD700' }}>💡</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#FFD700', letterSpacing: 0.3 }}>USE HINT</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: SKIN.white }}>💎 ×{hintCount} left</span>
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

    </div>
  );
}

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
