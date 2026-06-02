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

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.renderGrid();
  }

  update(_time: number, delta: number) {
    const { status, engine } = useGameStore.getState();
    if (status !== 'playing' || !engine) return;

    // Shuffle modifier tick
    const reshuffled = engine.onShuffleTick(delta);
    if (reshuffled) {
      useGameStore.setState({ grid: engine.getGrid() });
      this.renderGrid();
    }

    // Countdown modifier tick
    const hidden = engine.onCountdownTick(delta);
    if (hidden.length > 0) {
      useGameStore.setState({ grid: engine.getGrid() });
      this.refreshTileLabels();
    }
  }

  // True when the current level's modifier hides numbers until revealed.
  private isHidingModifier(): boolean {
    const { currentLevel } = useGameStore.getState();
    return currentLevel?.modifier === 'fog' || currentLevel?.modifier === 'countdown';
  }

  // Whether a cell's number should currently render.
  private isVisible(cell: Cell): boolean {
    return cell.tapped || !this.isHidingModifier() || cell.revealed;
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

        container.add([bg, label]);

        // Tap input — only on untapped tiles
        if (!cell.tapped) {
          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerdown', () => this.handleTap(r, c));
          // Fog modifier: reveal on pointer move
          bg.on('pointermove', () => {
            useGameStore.getState().engine?.onPointerMove(r, c);
            useGameStore.setState({ grid: useGameStore.getState().engine!.getGrid() });
            this.refreshTileLabels();
          });
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
