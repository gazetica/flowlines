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
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { TimerComponent } from './TimerComponent';
import { GameScene } from '../scenes/GameScene';
import { LeaderPanel } from './LeaderPanel';
import { initAppLifecycle, removeAppLifecycle } from '../services/appLifecycle';

export function GameScreen() {
  const navigate = useNavigate();
  const phaserRef = useRef<Phaser.Game | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const { status, currentLevel, mode, score, runId, startLevel, tickTimer, endGame, engine, timed } =
    useGameStore();

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
    // no active game (e.g. a direct navigation / reload).
    if (useGameStore.getState().status !== 'playing') {
      startLevel(1, 'campaign');
    }
    return () => {
      removeAppLifecycle();
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
              durationSeconds={timeLimit}
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

      {/* Per-level leader panel (YOU vs LEADER) — campaign only, in the dead
          space below the grid. Daily uses synthetic level id 0 → excluded. */}
      {mode === 'campaign' && currentLevel && currentLevel.id > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: 0,
            right: 0,
            padding: '0 16px',
            zIndex: 10,
          }}
        >
          <LeaderPanel levelId={currentLevel.id} compact={true} />
        </div>
      )}

      {/* DEV-only level selector for modifier testing. Removed in Sprint 3.
          Gated on DEV (true under `vite dev`) OR an explicit build-time flag
          VITE_DEV_TOOLS=true. Rationale: `import.meta.env.DEV` is always false
          for ANY `vite build` (incl. Capacitor APKs), and a `--mode development`
          build can't be used either — React StrictMode double-invokes effects in
          dev, which double-mounts/breaks the Phaser boot. So the test APK is
          built in PRODUCTION mode with VITE_DEV_TOOLS=true (selector visible, no
          StrictMode double-mount). Plain `npm run build` leaves the flag unset,
          so the shipped app hides it. */}
      {(import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === 'true') && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          {[
            { label: 'L1 none', id: 1 },
            { label: 'L9 shuffle', id: 9 },
            { label: 'L27 mirror', id: 27 },
            { label: 'L63 fog', id: 63 },
            { label: 'L69 countdown', id: 69 },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => {
                startLevel(id, 'campaign');
                setTimeout(() => {
                  const scene = phaserRef.current?.scene.getScene('GameScene') as GameScene | null;
                  scene?.renderGrid();
                }, 50);
              }}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '9px',
                background: 'rgba(10,26,46,0.9)',
                border: '1px solid rgba(30,139,195,0.4)',
                color: '#4FAEE0',
                padding: '6px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
