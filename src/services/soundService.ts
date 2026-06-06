// soundService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task B-002e
//
// Singleton gameplay SFX service — a thin Howler wrapper, same pattern as
// musicService.ts. Five one-shot effects: tick, correct, wrong, win, fail.
//
// Rules:
//  - NATIVE ONLY (AC12): every play is a no-op when !Capacitor.isNativePlatform().
//  - Respects the Sound toggle (AC10): every play is a no-op when soundEnabled is
//    false. Read live from settingsStore so a mid-game toggle takes effect at once.
//    This is INDEPENDENT of the Music (water-drip) toggle, which musicService owns
//    (AC11).
//  - Low latency (AC6/AC7): html5:false (Web Audio) + preload on GameScreen mount,
//    so correct/wrong fire with near-zero delay.
//  - The urgent <10s tick (AC5) reuses sfx_tick at rate 1.5 — no separate asset.

import { Howl } from 'howler';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from '../store/settingsStore';

interface Sfx {
  src: string;
  volume: number;
  howl: Howl | null;
}

const TICK = 'tick';
const CORRECT = 'correct';
const WRONG = 'wrong';
const WIN = 'win';
const FAIL = 'fail';

const SFX: Record<string, Sfx> = {
  [TICK]:    { src: '/assets/audio/sfx_tick.mp3',    volume: 0.45, howl: null },
  [CORRECT]: { src: '/assets/audio/sfx_correct.mp3', volume: 0.6,  howl: null },
  [WRONG]:   { src: '/assets/audio/sfx_wrong.mp3',   volume: 0.6,  howl: null },
  [WIN]:     { src: '/assets/audio/sfx_win.mp3',     volume: 0.7,  howl: null },
  [FAIL]:    { src: '/assets/audio/sfx_fail.mp3',    volume: 0.6,  howl: null },
};

const TICK_FAST_RATE = 1.5; // urgent tick when timer < 10s (AC5)

let loaded = false;

/** Build all Howl instances. Native-only; idempotent. Call on GameScreen mount. */
export function preload(): void {
  if (loaded || !Capacitor.isNativePlatform()) return;
  for (const key of Object.keys(SFX)) {
    const sfx = SFX[key];
    if (!sfx.howl) {
      sfx.howl = new Howl({ src: [sfx.src], volume: sfx.volume, html5: false, preload: true });
    }
  }
  loaded = true;
}

/** Shared gate: only emit SFX on native AND when the Sound toggle is on. */
function canPlay(): boolean {
  return Capacitor.isNativePlatform() && useSettingsStore.getState().soundEnabled;
}

function play(key: string): void {
  if (!canPlay()) return;
  const sfx = SFX[key];
  if (!sfx.howl) {
    // Defensive: if preload didn't run (e.g. play before mount), build lazily.
    sfx.howl = new Howl({ src: [sfx.src], volume: sfx.volume, html5: false, preload: true });
  }
  sfx.howl.play();
}

/** Clock tick — once per second. `fast` (timer < 10s) plays it at rate 1.5 (AC5). */
export function playTick(fast = false): void {
  if (!canPlay()) return;
  const sfx = SFX[TICK];
  if (!sfx.howl) {
    sfx.howl = new Howl({ src: [sfx.src], volume: sfx.volume, html5: false, preload: true });
  }
  sfx.howl.rate(fast ? TICK_FAST_RATE : 1.0);
  sfx.howl.play();
}

export function playCorrect(): void { play(CORRECT); }
export function playWrong(): void { play(WRONG); }
export function playWin(): void { play(WIN); }
export function playFail(): void { play(FAIL); }

/** Unload all Howls (call on GameScreen unmount to free the buffers). */
export function unload(): void {
  for (const key of Object.keys(SFX)) {
    SFX[key].howl?.unload();
    SFX[key].howl = null;
  }
  loaded = false;
}
