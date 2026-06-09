// TimerComponent.tsx
// Numtap | Gazetica Studio | Sprint 2 Day 2 | Task T-004
//
// Self-contained React countdown timer. UI only — no game logic, no Phaser,
// no Capacitor. Counts down from durationSeconds to 0, firing onTick every
// second and onExpire at zero. Turns danger red + pulses when remaining <= 10.
//
// The `timerPulse` keyframe used by the danger state is defined globally in
// src/index.css (Option A from the T-004 brief).

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  durationSeconds: number; // total countdown time
  onTick: (remaining: number) => void; // fires every second, remaining = seconds left
  onExpire: () => void; // fires once when timer reaches 0
  paused: boolean; // true = frozen, false = counting
  // F-008: optional live, render-independent pause check. When provided and it returns
  // true, a tick is skipped (no decrement, no onTick/onExpire) even if the interval is
  // still running. This covers the case where the `paused` prop changed but the React
  // commit that would clear the interval never ran — e.g. while a rewarded ad held the
  // WebView in the background. Reading it inside the tick is immune to render timing.
  getPaused?: () => boolean;
}

export function TimerComponent({
  durationSeconds,
  onTick,
  onExpire,
  paused,
  getPaused,
}: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  const onExpireRef = useRef(onExpire);
  const getPausedRef = useRef(getPaused);

  // Keep callback refs fresh without restarting the timer.
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    getPausedRef.current = getPaused;
  }, [getPaused]);

  // Reset remaining when durationSeconds changes (rule 6).
  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  // Interval management (rules 1, 2, 3, 4, 5).
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      // F-008: live pause gate — skip the tick entirely if the game is not actively
      // playing right now. Render-independent, so a background/burst interval that
      // outlived a missed pause-commit cannot drain the clock during an ad.
      if (getPausedRef.current?.()) return;
      setRemaining((prev) => {
        if (prev <= 1) {
          // Boundary: stop, fire onExpire exactly once, never go negative.
          // onTick is NOT called with 0 — onExpire replaces it here.
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          onExpireRef.current();
          return 0;
        }
        const next = prev - 1;
        onTickRef.current(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, durationSeconds]);

  const isDanger = remaining <= 10;

  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '36px',
        fontWeight: 400,
        color: isDanger ? '#E05050' : '#EEF4FF',
        animation: isDanger ? 'timerPulse 0.8s ease-in-out infinite' : 'none',
        display: 'inline-block',
      }}
    >
      {remaining}
    </span>
  );
}
