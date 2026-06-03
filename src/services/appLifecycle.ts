// appLifecycle.ts
// Numtap | Gazetica Studio | Sprint 3 Day 1 | Task T-007
//
// Capacitor App plugin listener. On resume from background / screen lock it
// nudges Phaser back to life so the canvas doesn't stay black.
//
// PHASER 4 NOTE (deviation from brief): the brief targets Phaser 3.60+
// (`renderer.restoreContext()`). Phaser 4 has no `restoreContext` — it uses
// contextLost/contextRestored handlers internally. In practice the T-006 black
// canvas after screen-lock is the game LOOP being suspended when the WebView
// backgrounds (visibilitychange doesn't fire reliably in the Android WebView),
// not a true GL context loss. So the primary fix here is `game.loop.wake()`,
// which restarts the render loop. The Phaser-3 `restoreContext()` call is kept
// behind a typeof guard (a safe no-op on Phaser 4), and we still emit `resume`
// on active scenes as the brief specifies.
//
// `Phaser` is a VALUE import (not `import type`) because `Phaser.WEBGL` is a
// runtime constant used in an expression — a type-only import can't provide it.

import { App } from '@capacitor/app';
import Phaser from 'phaser';

let _game: Phaser.Game | null = null;
let _listenerHandle: { remove: () => void } | null = null;

/**
 * Call once when Phaser boots.
 * Restores rendering if the app resumes after screen lock / backgrounding.
 */
export async function initAppLifecycle(game: Phaser.Game): Promise<void> {
  _game = game;

  // Remove any previous listener to avoid duplicates on hot reload.
  if (_listenerHandle) {
    _listenerHandle.remove();
    _listenerHandle = null;
  }

  _listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive || !_game) return;

    try {
      // Primary fix (Phaser 4): restart the render loop. When the WebView
      // backgrounds, Phaser's loop is suspended and is not always woken on
      // resume, leaving a frozen / black canvas. wake() resumes it seamlessly.
      _game.loop?.wake?.(true);

      // Phaser 3.60+ compatibility: explicit WebGL context restore if present.
      const renderer = _game.renderer as Phaser.Renderer.WebGL.WebGLRenderer | null;
      if (renderer && renderer.type === Phaser.WEBGL) {
        const restore = (renderer as unknown as { restoreContext?: () => void }).restoreContext;
        if (typeof restore === 'function') restore.call(renderer);
      }

      // Force active scenes to re-render on the next frame.
      _game.scene.scenes.forEach((scene) => {
        if (scene.sys.isActive()) {
          scene.sys.events.emit('resume');
        }
      });
    } catch (e) {
      console.warn('[AppLifecycle] Resume restore failed:', e);
    }
  });
}

/**
 * Call on GameScreen unmount to clean up the listener.
 */
export function removeAppLifecycle(): void {
  if (_listenerHandle) {
    _listenerHandle.remove();
    _listenerHandle = null;
  }
  _game = null;
}
