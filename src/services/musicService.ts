// musicService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task B-002
//
// Singleton background-music service. Thin Howler.js wrapper around one looping
// ambient track. One Howl instance for the whole app lifecycle.
//
// Design notes:
//  - `html5: false` => Howler decodes the MP3 into a Web Audio buffer and loops
//    the buffer, which is gap-free (AC7). The asset (public/assets/audio/
//    bg_music.mp3) is a phase-continuous 64s loop whose breath envelope dips to a
//    soft trough at the seam, so the residual MP3 encoder padding is inaudible.
//  - Volume is capped at 0.35 (<= 40% — AC8) so it never overpowers SFX.
//  - Background/foreground is wired directly via @capacitor/app `appStateChange`
//    (AC6). The existing appLifecycle.ts is bound to the Phaser game instance and
//    is removed on GameScreen unmount, so it can't drive app-wide music — hence a
//    dedicated listener here. The Capacitor web shim maps `appStateChange` onto
//    `visibilitychange`, so this also works in browser builds (no native gate).
//
// `enabled` mirrors the user's toggle intent and is the single gate the lifecycle
// listener consults: music only resumes on foreground if the user wants it on.

import { Howl } from 'howler';
import { App } from '@capacitor/app';

const BG_MUSIC_SRC = '/assets/audio/bg_music.mp3';
const MUSIC_VOLUME = 0.35; // <= 0.40 of max (AC8)

let howl: Howl | null = null;
let enabled = false; // user's toggle intent (true => should be audible when foregrounded)
let backgrounded = false; // app currently in background
let lifecycleHandle: { remove: () => void } | null = null;

/** Lazily build the single Howl instance (also primes the audio buffer). */
function ensureHowl(): Howl {
  if (!howl) {
    howl = new Howl({
      src: [BG_MUSIC_SRC],
      loop: true,
      volume: MUSIC_VOLUME,
      html5: false, // Web Audio buffer loop -> seamless (AC7)
      preload: true,
    });
  }
  return howl;
}

/** Start (or restart) playback if it isn't already running. */
function startPlayback(): void {
  const h = ensureHowl();
  if (!h.playing()) h.play();
}

/**
 * Initialise the service: build the Howl and wire the app background/foreground
 * listener exactly once. Idempotent — safe to call on every app mount. Does NOT
 * auto-start; the caller decides whether to play() based on the saved toggle.
 */
export function init(): void {
  ensureHowl();

  if (!lifecycleHandle) {
    // App.addListener is async; register fire-and-forget and store the handle.
    void App.addListener('appStateChange', ({ isActive }) => {
      backgrounded = !isActive;
      if (!isActive) {
        howl?.pause(); // pause on background (AC6)
      } else if (enabled) {
        startPlayback(); // resume on foreground only if the user wants music (AC6)
      }
    }).then((handle) => {
      lifecycleHandle = handle;
    });
  }
}

/** Turn music ON. Plays immediately unless the app is backgrounded (then it
 *  resumes on foreground). Idempotent. */
export function play(): void {
  enabled = true;
  if (backgrounded) return; // will resume via the lifecycle listener
  startPlayback();
}

/** Turn music OFF and stop playback immediately. Idempotent. */
export function pause(): void {
  enabled = false;
  howl?.pause();
}

/** Set playback volume (0..1), clamped to the tasteful cap. */
export function setVolume(v: number): void {
  const clamped = Math.max(0, Math.min(MUSIC_VOLUME, v));
  ensureHowl().volume(clamped);
}

/** Test/cleanup helper — tears down the Howl and lifecycle listener. */
export function teardown(): void {
  lifecycleHandle?.remove();
  lifecycleHandle = null;
  howl?.unload();
  howl = null;
  enabled = false;
  backgrounded = false;
}
