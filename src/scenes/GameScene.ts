// GameScene.ts
// Numtap | Gazetica Studio | Sprint 2 Day 3 | Task T-005
//
// Phaser scene: renders the grid, handles tap input, drives animations.
// Imports GridEngine's Cell TYPE only — all game logic goes through gameStore.
//
// NOTE (visibility fix): GridEngine starts every cell with revealed=false and
// only sets revealed=true for fog (onPointerMove) / countdown reveals or when a
// cell is tapped. So for the non-hiding modifiers (none/shuffle/mirror) numbers
// must render regardless of `revealed`. `isVisible()` encodes that: a cell is
// visible if it is tapped, the level's modifier does not hide numbers, or it has
// been revealed. Without this, a 'none' level (e.g. level 1) renders blank tiles
// and no gold target — failing device checks V6/V7/V8. GridEngine.ts is locked,
// so this is handled here in the render layer.

import Phaser from 'phaser';
import type { Cell } from '../game/GridEngine';
import { useGameStore } from '../store/gameStore';

export class GameScene extends Phaser.Scene {
  private tileObjects: Phaser.GameObjects.Container[][] = [];
  private hintGlowTween: Phaser.Tweens.Tween | null = null;

  // Countdown modifier is driven in the VIEW LAYER here, not the engine.
  // GridEngine.onCountdownTick only hides cells already flagged revealed+revealedAt,
  // but nothing reveals countdown cells (the reveal path is fog-only, and getGrid()
  // returns a copy so engine state can't be reveal-mutated externally), and
  // GridEngine is locked. So we: show all numbers at level start, then hide each
  // cell 3s after it was first shown. Player taps the (now-blank) tiles from memory.
  private countdownFirstSeen = new Map<string, number>();
  private countdownHidden = new Set<string>();
  private lastRunId = -1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.renderGrid();

    // Fog modifier: a GLOBAL pointer listener reveals cells within a 1-cell
    // radius of the pointer. This must be global (not per-tile) because a hidden
    // fog tile's bg can't reliably emit pointermove for a number you can't see.
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { engine, currentLevel } = useGameStore.getState();
      if (!engine || currentLevel?.modifier !== 'fog') return;

      // Convert pointer position to grid cell (same geometry as renderGrid).
      const n = currentLevel.grid;
      const screenW = this.scale.width;
      const screenH = this.scale.height;
      const padding = 24;
      const availableW = screenW - padding * 2;
      const availableH = screenH * 0.65;
      const tileSize = Math.floor(Math.min(availableW, availableH) / n) - 4;
      const gap = 4;
      const gridPixelSize = n * (tileSize + gap) - gap;
      const startX = (screenW - gridPixelSize) / 2;
      const startY = screenH * 0.2;

      const col = Math.floor((pointer.x - startX) / (tileSize + gap));
      const row = Math.floor((pointer.y - startY) / (tileSize + gap));

      if (row >= 0 && row < n && col >= 0 && col < n) {
        engine.onPointerMove(row, col);
        useGameStore.setState({ grid: engine.getGrid() });
        this.refreshTileLabels();
      }
    });
  }

  update(_time: number, delta: number) {
    const { status, engine, grid, currentLevel, runId } = useGameStore.getState();
    if (status !== 'playing' || !engine) return;

    // Reset view-layer countdown state on a NEW level only. runId increments in
    // startLevel() but NOT on a tap (tapCell creates a new grid array, so keying
    // on grid identity would wrongly re-reveal everything after each correct tap).
    if (runId !== this.lastRunId) {
      this.lastRunId = runId;
      this.countdownFirstSeen.clear();
      this.countdownHidden.clear();
    }

    // Shuffle modifier tick
    const reshuffled = engine.onShuffleTick(delta);
    if (reshuffled) {
      useGameStore.setState({ grid: engine.getGrid() });
      // Flash untapped tiles briefly so the player sees the reshuffle happened.
      const { grid } = useGameStore.getState();
      this.tileObjects.forEach((row, r) => {
        row.forEach((container, c) => {
          if (!grid[r]?.[c]?.tapped) {
            this.tweens.add({
              targets: container,
              alpha: 0.3,
              duration: 120,
              yoyo: true,
              ease: 'Linear',
              onComplete: () => {
                if (container.active) container.setAlpha(1);
              },
            });
          }
        });
      });
      // Delay renderGrid slightly so the flash is visible before tiles re-render.
      this.time.delayedCall(150, () => this.renderGrid());
    }

    // Countdown modifier tick (engine call kept for contract; it is a no-op
    // here because countdown cells are never revealed in the engine).
    const hidden = engine.onCountdownTick(delta);
    if (hidden.length > 0) {
      useGameStore.setState({ grid: engine.getGrid() });
      this.refreshTileLabels();
    }

    // Countdown modifier (view-layer): hide each untapped cell 3s after first shown.
    if (currentLevel?.modifier === 'countdown') {
      const now = this.time.now;
      let changed = false;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].tapped) continue;
          const k = `${r},${c}`;
          const seen = this.countdownFirstSeen.get(k);
          if (seen === undefined) {
            this.countdownFirstSeen.set(k, now);
          } else if (!this.countdownHidden.has(k) && now - seen > 3000) {
            this.countdownHidden.add(k);
            changed = true;
          }
        }
      }
      if (changed) this.refreshTileLabels();
    }
  }

  // Whether a cell's number should currently render.
  //  - tapped cells: always (they show the green check)
  //  - fog: only while revealed (set by the pointer-move reveal)
  //  - countdown: visible until hidden by the 3s view-layer timer
  //  - none/shuffle/mirror: always visible
  private isVisible(cell: Cell): boolean {
    if (cell.tapped) return true;
    const mod = useGameStore.getState().currentLevel?.modifier;
    if (mod === 'fog') return cell.revealed;
    if (mod === 'countdown') return !this.countdownHidden.has(`${cell.row},${cell.col}`);
    return true;
  }

  renderGrid() {
    // Clear existing tiles
    this.tileObjects.forEach((row) => row.forEach((c) => c.destroy()));
    this.tileObjects = [];

    const { grid, engine, currentLevel } = useGameStore.getState();
    if (!grid.length || !engine || !currentLevel) return;

    const n = currentLevel.grid;
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const padding = 24;
    const availableW = screenW - padding * 2;
    const availableH = screenH * 0.65; // grid takes 65% of screen height
    const tileSize = Math.floor(Math.min(availableW, availableH) / n) - 4;
    const gap = 4;
    const gridPixelSize = n * (tileSize + gap) - gap;
    const startX = (screenW - gridPixelSize) / 2;
    const startY = screenH * 0.2; // start 20% from top (HUD above)

    for (let r = 0; r < n; r++) {
      this.tileObjects[r] = [];
      for (let c = 0; c < n; c++) {
        const cell = grid[r][c];
        const x = startX + c * (tileSize + gap);
        const y = startY + r * (tileSize + gap);

        const container = this.add.container(x + tileSize / 2, y + tileSize / 2);

        // Tile background
        const bg = this.add.rectangle(0, 0, tileSize, tileSize, this.getTileColour(cell));
        bg.setStrokeStyle(1, this.getTileBorderColour(cell));

        // Tile label
        const displayVal = engine.getDisplayValue(cell);
        const label = this.add
          .text(0, 0, cell.tapped ? '✓' : this.isVisible(cell) ? String(displayVal) : '', {
            fontFamily: "'Space Mono', monospace",
            fontSize: `${Math.floor(tileSize * 0.38)}px`,
            color: this.getTileTextColour(cell),
            align: 'center',
          })
          .setOrigin(0.5);

        // Mirror modifier: visually flip the label horizontally. Combines with
        // the digit-reversal already applied by engine.getDisplayValue().
        if (currentLevel.modifier === 'mirror') {
          label.setScale(-1, 1);
        }

        container.add([bg, label]);

        // Tap input — only on untapped tiles. Fog reveal is handled by the
        // global pointermove listener in create() (works over hidden tiles).
        if (!cell.tapped) {
          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerdown', () => this.handleTap(r, c));
        }

        this.tileObjects[r][c] = container;
      }
    }
  }

  private handleTap(row: number, col: number) {
    const result = useGameStore.getState().tapCell(row, col);
    if (result === 'CORRECT') {
      this.playCorrectAnimation(row, col);
      this.refreshTileLabels();
      // Check if hint was active on this tile
      if (useGameStore.getState().hintActive) {
        useGameStore.getState().deactivateHint();
        if (this.hintGlowTween) {
          this.hintGlowTween.stop();
          this.hintGlowTween = null;
        }
      }
    } else if (result === 'WRONG') {
      this.playWrongAnimation(row, col);
    }
  }

  private playCorrectAnimation(row: number, col: number) {
    const container = this.tileObjects[row]?.[col];
    if (!container) return;
    this.tweens.add({
      targets: container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => this.refreshTileLabels(),
    });
  }

  private playWrongAnimation(row: number, col: number) {
    const container = this.tileObjects[row]?.[col];
    if (!container) return;
    this.tweens.add({
      targets: container,
      x: container.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
    });
  }

  // Highlight the next target tile for hint
  showHint(expectedNext: number) {
    const { grid } = useGameStore.getState();
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].value === expectedNext && !grid[r][c].tapped) {
          const container = this.tileObjects[r]?.[c];
          if (!container) return;
          if (this.hintGlowTween) this.hintGlowTween.stop();
          this.hintGlowTween = this.tweens.add({
            targets: container,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 400,
            yoyo: true,
            repeat: 6, // ~5 seconds worth
            ease: 'Sine.easeInOut',
          });
          return;
        }
      }
    }
  }

  private refreshTileLabels() {
    const { grid, engine } = useGameStore.getState();
    if (!engine) return;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const container = this.tileObjects[r]?.[c];
        if (!container) continue;
        const bg = container.list[0] as Phaser.GameObjects.Rectangle;
        const label = container.list[1] as Phaser.GameObjects.Text;
        bg.setFillStyle(this.getTileColour(cell));
        bg.setStrokeStyle(1, this.getTileBorderColour(cell));
        label.setText(cell.tapped ? '✓' : this.isVisible(cell) ? String(engine.getDisplayValue(cell)) : '');
        label.setColor(this.getTileTextColour(cell));
        // Mirror modifier: re-apply the horizontal flip after setText; ensure
        // non-mirror levels are never left flipped.
        if (useGameStore.getState().currentLevel?.modifier === 'mirror') {
          label.setScale(-1, 1);
        } else {
          label.setScale(1, 1);
        }
      }
    }
  }

  // Colour helpers — use design system values
  private getTileColour(cell: Cell): number {
    if (cell.tapped) return 0x0d2a1a; // dark green
    const { engine } = useGameStore.getState();
    const expected = engine?.getExpectedNext();
    if (cell.value === expected && this.isVisible(cell)) return 0xffd700; // gold — next target
    return 0x0f2040; // navy card
  }

  private getTileBorderColour(cell: Cell): number {
    if (cell.tapped) return 0x2ecc71; // success green
    const { engine } = useGameStore.getState();
    if (cell.value === engine?.getExpectedNext() && this.isVisible(cell)) return 0xffd700; // gold border on target
    return 0x1a3558; // navy border
  }

  private getTileTextColour(cell: Cell): string {
    if (cell.tapped) return '#2ECC71';
    const { engine } = useGameStore.getState();
    if (cell.value === engine?.getExpectedNext()) return '#07111F'; // dark on gold bg
    return '#EEF4FF';
  }
}
