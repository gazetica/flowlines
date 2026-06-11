// @ts-nocheck — Numtap component, broken SKIN import; replaced in Sprint 3 (FL-S1-004 Task 0)
// ParticleCanvas.tsx
// Numtap | Gazetica Studio | Sprint 4 (Pre) | Task T-003 | VDD v1.2
//
// Reusable atmospheric background layer used on every screen:
//   - a centred radial ambient glow (VDD v1.2 §2.1)
//   - faint floating numbers 1–49 drifting upward (VDD v1.2 §2.2)
// Both layers are fixed, behind content (z-index 0), pointer-events: none.
// The RAF loop pauses on `visibilitychange` (and Capacitor backgrounding fires
// it), so it costs nothing while the app is hidden.

import { useEffect, useRef } from 'react';
import { skin as SKIN } from '../styles/skin';

interface Particle {
  x: number;
  y: number;
  num: number;
  size: number; // px, 10–16
  speed: number; // upward px/frame, 0.18–0.40
  drift: number; // lateral px/frame, ±0.15
  opacity: number; // 0.04–0.09
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const spawn = (atRandomY = false): Particle => ({
      x: Math.random() * canvas.width,
      y: atRandomY ? Math.random() * canvas.height : canvas.height + 10,
      num: Math.floor(Math.random() * 49) + 1,
      size: 10 + Math.random() * 6, // 10–16px
      speed: 0.18 + Math.random() * 0.22, // 0.18–0.40
      drift: (Math.random() - 0.5) * 0.3, // ±0.15
      opacity: 0.2 + Math.random() * 0.05, // 0.20–0.25 (T-004A: raised from 0.04–0.09)
    });

    // Pre-populate 12 particles at random positions.
    const particles: Particle[] = Array.from({ length: 12 }, () => spawn(true));

    let frame = 0;
    let rafId = 0;
    let running = true;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      // Spawn 3 particles roughly every 4s (~240 frames at 60fps).
      if (frame % 240 === 0) {
        particles.push(spawn(), spawn(), spawn());
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y -= p.speed;
        p.x += p.drift;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = SKIN.gold;
        ctx.font = `${p.size}px 'Space Mono', monospace`;
        ctx.fillText(String(p.num).padStart(2, '0'), p.x, p.y);
        ctx.restore();
        if (p.y < -20) particles.splice(i, 1);
      }
      rafId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!running) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    };
    const stop = () => cancelAnimationFrame(rafId);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) start();
      else stop();
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      {/* Radial ambient glow centred on the play area (VDD v1.2 §2.1). */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '50%',
          top: '40%',
          width: 280,
          height: 280,
          transform: 'translate(-50%, -50%)',
          background: SKIN.ambientGlow,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Floating number particles (VDD v1.2 §2.2). */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      />
    </>
  );
}
