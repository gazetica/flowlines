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

  // T-008 skin: current tile size (for refreshTileLabels' gradient redraw).
  // T-000: the pre-tap next-target highlight (gold fill + scale pulse) was REMOVED.
  // There is now NO visual cue on the next tile — the HUD NEXT value is the sole
  // pre-tap cue. The only gold tile is the most-recently tapped one (LAST_TAPPED).
  private tileSize = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Radial ambient glow behind the grid area (subtle gold->blue).
    const glow = this.add.graphics();
    glow.fillGradientStyle(0xffd700, 0xffd700, 0x1e8bc3, 0x1e8bc3, 0.06, 0.06, 0.04, 0.04);
    glow.fillCircle(this.scale.width / 2, this.scale.height * 0.55, Math.min(this.scale.width, this.scale.height) * 0.55);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(-1);

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
    // Clear existing tiles.
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
    this.tileSize = tileSize; // store for refreshTileLabels
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

        // Tile background — gradient via Graphics (drawTileBg).
        const bg = this.add.graphics();
        this.drawTileBg(bg, cell, tileSize);

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

        // Tap input — a transparent rectangle is the hit target (Graphics has no
        // intrinsic input geometry; a sized rect gives reliable taps). Fog reveal
        // is handled by the global pointermove listener in create().
        if (!cell.tapped) {
          const hit = this.add.rectangle(0, 0, tileSize, tileSize, 0x000000, 0);
          hit.setInteractive({ useHandCursor: true });
          hit.on('pointerdown', () => this.handleTap(r, c));
          container.add(hit);
        }

        this.tileObjects[r][c] = container;
      }
    }
  }

  // Is this tapped cell the most-recently tapped one (LAST_TAPPED)? Taps happen
  // in strict sequence, so the last tapped value is always one step behind
  // expectedNext — `expectedNext - 1` ascending, `expectedNext + 1` descending.
  // Once the level is complete there is no last tile (all render green).
  private isLastTapped(cell: Cell): boolean {
    if (!cell.tapped) return false;
    const { engine, currentLevel } = useGameStore.getState();
    if (!engine || !currentLevel || engine.isComplete()) return false;
    const expected = engine.getExpectedNext();
    const lastValue = currentLevel.direction === 'descending' ? expected + 1 : expected - 1;
    return cell.value === lastValue;
  }

  // Draw a tile's gradient background + border based on its state.
  //  - LAST_TAPPED (most recent correct tap): gold gradient + gold border
  //  - TAPPED (all earlier correct taps): green gradient + green border
  //  - DEFAULT (untapped, incl. the next target — NO pre-tap highlight): navy
  // Canvas has no box-shadow, so the spec'd gold/green glows are approximated by
  // the bright fill + coloured border (consistent with the T-008 skin approach).
  private drawTileBg(gfx: Phaser.GameObjects.Graphics, cell: Cell, size: number): void {
    gfx.clear();
    const half = size / 2;

    if (cell.tapped) {
      if (this.isLastTapped(cell)) {
        gfx.fillGradientStyle(0xffd700, 0xffd700, 0xc8a800, 0xc8a800, 1, 1, 1, 1);
        gfx.fillRect(-half, -half, size, size);
        gfx.lineStyle(2, 0xffd700, 1);
        gfx.strokeRect(-half, -half, size, size);
      } else {
        gfx.fillGradientStyle(0x0d2a1a, 0x0d2a1a, 0x091f12, 0x091f12, 1, 1, 1, 1);
        gfx.fillRect(-half, -half, size, size);
        gfx.lineStyle(1, 0x2ecc71, 0.5);
        gfx.strokeRect(-half, -half, size, size);
      }
      return;
    }

    gfx.fillGradientStyle(0x0f2a48, 0x0f2a48, 0x0a1e38, 0x0a1e38, 1, 1, 1, 1);
    gfx.fillRect(-half, -half, size, size);
    gfx.lineStyle(1, 0x1a3558, 0.6);
    gfx.strokeRect(-half, -half, size, size);
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

    // Shake.
    this.tweens.add({
      targets: container,
      x: container.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
    });

    // Red flash: redraw the tile bg red for 400ms, then restore its default look.
    const bg = container.list[0] as Phaser.GameObjects.Graphics;
    const half = this.tileSize / 2;
    bg.clear();
    bg.fillStyle(0x2a0d0d, 1);
    bg.fillRect(-half, -half, this.tileSize, this.tileSize);
    bg.lineStyle(2, 0xe05050, 1);
    bg.strokeRect(-half, -half, this.tileSize, this.tileSize);
    this.time.delayedCall(400, () => {
      if (!container.active) return;
      const cell = useGameStore.getState().grid[row]?.[col];
      if (cell) this.drawTileBg(bg, cell, this.tileSize);
    });

    // "−100" penalty float: red text rising from the tile centre, fading over 0.9s.
    const penalty = this.add
      .text(container.x, container.y, '−100', {
        fontFamily: "'Space Mono', monospace",
        fontSize: `${Math.max(14, Math.floor(this.tileSize * 0.3))}px`,
        fontStyle: 'bold',
        color: '#E05050',
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: penalty,
      y: container.y - 34,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => penalty.destroy(),
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
        const bg = container.list[0] as Phaser.GameObjects.Graphics;
        const label = container.list[1] as Phaser.GameObjects.Text;
        this.drawTileBg(bg, cell, this.tileSize);
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

  // Label colour helper — tile fill/border are handled by drawTileBg().
  //  - LAST_TAPPED: dark ✓ on the gold tile
  //  - TAPPED: green ✓
  //  - DEFAULT (untapped): light number, no pre-tap highlight
  private getTileTextColour(cell: Cell): string {
    if (cell.tapped) return this.isLastTapped(cell) ? '#07111F' : '#2ECC71';
    return '#EEF4FF';
  }
}
