// GameScene.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 4 | Task FL-S1-004
//
// Phaser scene that renders the Flow Lines grid: deep-purple background, ambient
// radial glow, faint dot-grid texture, rounded grid cells, and coloured dot
// endpoints with glow rings. Input handling, timer, score and HUD live elsewhere
// (React owns the HUD; input arrives in Day 5).

import Phaser from 'phaser';
import type { Cell, Colour, DotPair } from '../engine/GridEngine';
import { skin } from '../../styles/skin';

export interface LevelConfig {
  grid: number;       // N — grid is N×N
  dots: DotPair[];    // dot pairs from GridEngine types
}

/** Parse an 'rgba(r,g,b,a)' or '#RRGGBB' string into a numeric 0xRRGGBB hex. */
function toHex(colour: string): number {
  return Phaser.Display.Color.ValueToColor(colour).color;
}

export class GameScene extends Phaser.Scene {
  private levelConfig: LevelConfig | null = null;

  private cellSize = 0;
  private gap = 0;
  private pad = 8;
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  private gridGraphics?: Phaser.GameObjects.Graphics;
  private dotGraphics?: Phaser.GameObjects.Graphics;
  private readonly pathGraphics: Map<Colour, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Called by GameScreen (React) after the game is ready. Stores the level and
   * renders it. Safe to call before or after create() — renders once the camera
   * is available.
   */
  loadLevel(config: LevelConfig): void {
    this.levelConfig = config;
    if (this.cameras?.main) {
      this.renderBoard();
    }
  }

  create(): void {
    if (this.levelConfig) {
      this.renderBoard();
    }
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  private renderBoard(): void {
    if (!this.levelConfig) return;

    this.computeLayout();
    this.cameras.main.setBackgroundColor(skin.bgDeep);

    this.drawAmbientGlow();
    this.drawDotGridTexture();
    this.drawCells();
    this.drawDots();
  }

  private computeLayout(): void {
    const N = this.levelConfig!.grid;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.gap = N <= 7 ? 3 : 2;
    this.pad = 8;
    this.cellSize = Math.max(
      skin.grid.cellMinSize,
      Math.floor((w - this.pad * 2 - this.gap * (N - 1)) / N),
    );

    const gridWidth = this.cellSize * N + this.gap * (N - 1);
    const gridHeight = gridWidth; // square
    this.gridOffsetX = (w - gridWidth) / 2;
    this.gridOffsetY = (h - gridHeight) / 2 + 20; // nudge down to leave HUD room
  }

  /** Two soft radial gradients — purple top, gold bottom — over the background. */
  private drawAmbientGlow(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const g = this.add.graphics();

    // Centre-top purple glow.
    g.fillStyle(toHex(skin.purple), 0.09);
    g.fillCircle(w / 2, h * 0.18, w * 0.4);

    // Centre-bottom gold glow.
    g.fillStyle(toHex(skin.gold), 0.03);
    g.fillCircle(w / 2, h * 0.82, w * 0.3);
  }

  /** Faint 16×16 purple dot pattern behind the grid. */
  private drawDotGridTexture(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.dotGraphics?.destroy();
    const g = this.add.graphics();
    this.dotGraphics = g;

    g.fillStyle(toHex(skin.purple), 0.10);
    const spacing = 16;
    for (let y = spacing; y < h; y += spacing) {
      for (let x = spacing; x < w; x += spacing) {
        g.fillCircle(x, y, 1);
      }
    }
  }

  private cellX(col: number): number {
    return this.gridOffsetX + col * (this.cellSize + this.gap);
  }

  private cellY(row: number): number {
    return this.gridOffsetY + row * (this.cellSize + this.gap);
  }

  private cellCentreX(col: number): number {
    return this.cellX(col) + this.cellSize / 2;
  }

  private cellCentreY(row: number): number {
    return this.cellY(row) + this.cellSize / 2;
  }

  private drawCells(): void {
    const N = this.levelConfig!.grid;
    this.gridGraphics?.destroy();
    const g = this.add.graphics();
    this.gridGraphics = g;

    const radius = skin.grid.cellRadius;
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = this.cellX(col);
        const y = this.cellY(row);
        g.fillStyle(0xffffff, 0.03);
        g.fillRoundedRect(x, y, this.cellSize, this.cellSize, radius);
        g.lineStyle(1, toHex(skin.purple), 0.12);
        g.strokeRoundedRect(x, y, this.cellSize, this.cellSize, radius);
      }
    }
  }

  private drawDots(): void {
    const g = this.add.graphics();
    const dotRadius = (this.cellSize * skin.grid.dotSizeRatio) / 2;
    const glowRadius = dotRadius + 4;

    for (const dot of this.levelConfig!.dots) {
      const hex = toHex(skin.pathColors[dot.colour]);
      for (const [r, c] of [[dot.r1, dot.c1], [dot.r2, dot.c2]] as const) {
        const cx = this.cellCentreX(c);
        const cy = this.cellCentreY(r);
        // Outer glow ring (path colour at 35% alpha).
        g.fillStyle(hex, 0.35);
        g.fillCircle(cx, cy, glowRadius);
        // Filled dot.
        g.fillStyle(hex, 1);
        g.fillCircle(cx, cy, dotRadius);
      }
    }
  }

  // ─── Public API (used from Day 5 onward) ────────────────────────────────────

  /**
   * Draw a colour's path as a thick rounded line through the given cell centres.
   * Replaces any existing line for that colour.
   */
  drawPath(colour: Colour, cells: Cell[]): void {
    let g = this.pathGraphics.get(colour);
    if (!g) {
      g = this.add.graphics();
      this.pathGraphics.set(colour, g);
    }
    g.clear();
    if (cells.length < 2) return;

    const strokeWidth = Math.max(2, this.cellSize * skin.grid.pathStrokeRatio);
    g.lineStyle(strokeWidth, toHex(skin.pathColors[colour]), 1);
    g.beginPath();
    g.moveTo(this.cellCentreX(cells[0].col), this.cellCentreY(cells[0].row));
    for (let i = 1; i < cells.length; i++) {
      g.lineTo(this.cellCentreX(cells[i].col), this.cellCentreY(cells[i].row));
    }
    g.strokePath();
  }

  /** Remove a colour's drawn path from the canvas. */
  clearPath(colour: Colour): void {
    const g = this.pathGraphics.get(colour);
    if (g) {
      g.clear();
    }
  }
}
