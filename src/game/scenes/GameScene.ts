// GameScene.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 5 | Task FL-S1-005
//
// Phaser scene: renders the Flow Lines grid (deep-purple background, ambient
// glow, dot-grid texture, cells, dot endpoints) AND handles drag-to-draw path
// input — extend, undo-on-drag, colour-conflict break, completion, live coverage.
//
// Engine logic stays in src/game/engine (pure TS). This scene imports from it;
// it never reimplements grid rules. Coverage/state flow to React via Zustand.

import Phaser from 'phaser';
import {
  occupyCell,
  initGrid,
  type Cell,
  type Colour,
  type DotPair,
  type Grid,
} from '../engine/GridEngine';
import { canExtendPath, isPathComplete } from '../engine/PathValidator';
import { calculateCoverage, isWinCondition } from '../engine/CoverageCalc';
import { skin } from '../../styles/skin';
import { useFlowGameStore } from '../../store/flowGameStore';

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

  private N = 0;
  private grid: Grid = [];

  private cellSize = 0;
  private gap = 0;
  private pad = 8;
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  // Static board layers.
  private gridGraphics?: Phaser.GameObjects.Graphics;
  private dotGraphics?: Phaser.GameObjects.Graphics;

  // Per-colour path layers (line + cell fill), kept separate so each can be
  // cleared and redrawn independently without accumulating draw calls.
  private readonly pathGraphics: Map<Colour, Phaser.GameObjects.Graphics> = new Map();
  private readonly cellFillGraphics: Map<Colour, Phaser.GameObjects.Graphics> = new Map();

  // Input state.
  private activeColour: Colour | null = null;
  private activePath: Cell[] = [];
  private readonly allPaths: Map<Colour, Cell[]> = new Map();
  private isDrawing = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Called by GameScreen (React) once the game is ready. Stores the level,
   * builds a fresh grid, and renders. Safe before or after create().
   */
  loadLevel(config: LevelConfig): void {
    this.levelConfig = config;
    this.N = config.grid;
    this.grid = initGrid(config.grid, config.dots);
    this.resetInputState();
    if (this.cameras?.main) {
      this.renderBoard();
    }
  }

  create(): void {
    this.registerInput();
    if (this.levelConfig) {
      this.renderBoard();
    }
  }

  private resetInputState(): void {
    this.activeColour = null;
    this.activePath = [];
    this.isDrawing = false;
    this.allPaths.clear();
    for (const g of this.pathGraphics.values()) g.destroy();
    for (const g of this.cellFillGraphics.values()) g.destroy();
    this.pathGraphics.clear();
    this.cellFillGraphics.clear();
  }

  private registerInput(): void {
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
  }

  // ─── Board rendering ────────────────────────────────────────────────────────

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
    const N = this.N;
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

    g.fillStyle(toHex(skin.purple), 0.09);
    g.fillCircle(w / 2, h * 0.18, w * 0.4);

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
    const N = this.N;
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
        g.fillStyle(hex, 0.35);
        g.fillCircle(cx, cy, glowRadius);
        g.fillStyle(hex, 1);
        g.fillCircle(cx, cy, dotRadius);
      }
    }
  }

  // ─── Path rendering ──────────────────────────────────────────────────────────

  /**
   * Render a colour's path: a thick line through cell centres (with rounded
   * joints) plus a 22%-opacity fill on each traversed non-endpoint cell.
   * Clears the colour's previous layers first (no draw-call accumulation).
   */
  private renderPath(colour: Colour, cells: Cell[]): void {
    let line = this.pathGraphics.get(colour);
    if (!line) {
      line = this.add.graphics();
      this.pathGraphics.set(colour, line);
    }
    let fill = this.cellFillGraphics.get(colour);
    if (!fill) {
      fill = this.add.graphics();
      this.cellFillGraphics.set(colour, fill);
    }
    line.clear();
    fill.clear();
    if (cells.length === 0) return;

    const hex = toHex(skin.pathColors[colour]);
    const strokeWidth = Math.max(2, this.cellSize * skin.grid.pathStrokeRatio);

    // Cell fills first (behind the line).
    for (const cell of cells) {
      if (cell.isEndpoint) continue;
      fill.fillStyle(hex, 0.22);
      fill.fillRoundedRect(
        this.cellX(cell.col),
        this.cellY(cell.row),
        this.cellSize,
        this.cellSize,
        skin.grid.cellRadius,
      );
    }

    // Path line through cell centres.
    line.lineStyle(strokeWidth, hex, 1);
    if (cells.length >= 2) {
      line.beginPath();
      line.moveTo(this.cellCentreX(cells[0].col), this.cellCentreY(cells[0].row));
      for (let i = 1; i < cells.length; i++) {
        line.lineTo(this.cellCentreX(cells[i].col), this.cellCentreY(cells[i].row));
      }
      line.strokePath();
    }
    // Rounded joints/caps: a dot at each vertex (cheap, avoids mitre spikes on turns).
    line.fillStyle(hex, 1);
    for (const cell of cells) {
      line.fillCircle(this.cellCentreX(cell.col), this.cellCentreY(cell.row), strokeWidth / 2);
    }
  }

  /** Public API: draw a colour's path (delegates to internal renderer). */
  drawPath(colour: Colour, cells: Cell[]): void {
    this.renderPath(colour, cells);
  }

  /** Public API: clear a colour's drawn path layers. */
  clearPath(colour: Colour): void {
    this.pathGraphics.get(colour)?.clear();
    this.cellFillGraphics.get(colour)?.clear();
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private getCellFromPointer(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - this.gridOffsetX) / (this.cellSize + this.gap));
    const row = Math.floor((y - this.gridOffsetY) / (this.cellSize + this.gap));
    if (row < 0 || row >= this.N || col < 0 || col >= this.N) return null;
    return { row, col };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.levelConfig || this.grid.length === 0) return;

    const cell = this.getCellFromPointer(pointer.x, pointer.y);
    if (!cell) return;

    const gridCell = this.grid[cell.row][cell.col];
    // Drag must start from a dot endpoint.
    if (!gridCell.isEndpoint || gridCell.colour === null) return;

    const colour = gridCell.colour;

    // If this colour already has a path, clear it first (start fresh).
    if (this.allPaths.has(colour)) {
      this.clearColourPath(colour);
    }

    this.activeColour = colour;
    this.activePath = [this.grid[cell.row][cell.col]];
    this.isDrawing = true;

    this.grid = occupyCell(this.grid, cell.row, cell.col, colour);
    this.renderPath(colour, this.activePath);
    this.dispatchCoverage();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDrawing || !this.activeColour) return;
    if (!pointer.isDown) return;

    const cell = this.getCellFromPointer(pointer.x, pointer.y);
    if (!cell) return;

    const lastCell = this.activePath[this.activePath.length - 1];
    if (!lastCell) return;

    // Same cell — no movement.
    if (cell.row === lastCell.row && cell.col === lastCell.col) return;

    // ── UNDO-ON-DRAG: pointer moved back over own path ──────────────────────
    const ownPathIndex = this.activePath.findIndex(
      (c) => c.row === cell.row && c.col === cell.col,
    );
    if (ownPathIndex !== -1 && ownPathIndex < this.activePath.length - 1) {
      const cellsToRemove = this.activePath.splice(ownPathIndex + 1);
      for (const c of cellsToRemove) {
        if (!c.isEndpoint) {
          this.grid = this.clearCellOccupancy(this.grid, c.row, c.col);
        }
      }
      this.renderPath(this.activeColour, this.activePath);
      this.dispatchCoverage();
      return;
    }

    // ── VALIDATE: must be a legal single orthogonal step ────────────────────
    if (!canExtendPath(this.grid, this.activeColour, this.activePath, cell.row, cell.col)) {
      return;
    }

    // ── COLOUR CONFLICT: target occupied by a different colour → break it ───
    const targetGridCell = this.grid[cell.row][cell.col];
    if (targetGridCell.colour !== null && targetGridCell.colour !== this.activeColour) {
      this.breakPathAt(targetGridCell.colour, cell.row, cell.col);
    }

    // ── EXTEND PATH ─────────────────────────────────────────────────────────
    this.grid = occupyCell(this.grid, cell.row, cell.col, this.activeColour);
    this.activePath.push(this.grid[cell.row][cell.col]);

    this.renderPath(this.activeColour, this.activePath);
    this.dispatchCoverage();

    // ── COMPLETION: reached the matching dot ────────────────────────────────
    if (isPathComplete(this.activePath, this.levelConfig!.dots, this.activeColour)) {
      this.onPathComplete(this.activeColour, this.activePath);
    }
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.isDrawing || !this.activeColour) return;

    this.allPaths.set(this.activeColour, [...this.activePath]);

    const store = useFlowGameStore.getState();
    store.setPath(this.activeColour, this.activePath);
    store.setMoveCount(store.moveCount + 1);

    this.isDrawing = false;
    this.activeColour = null;
    this.activePath = [];
  }

  // ─── Path helpers ────────────────────────────────────────────────────────────

  /** Break another colour's path at (row,col): clear that cell onwards, keep endpoints. */
  private breakPathAt(colour: Colour, breakRow: number, breakCol: number): void {
    const existingPath = this.allPaths.get(colour);
    if (!existingPath) return;

    const breakIndex = existingPath.findIndex((c) => c.row === breakRow && c.col === breakCol);
    if (breakIndex === -1) return;

    const cellsToRemove = existingPath.slice(breakIndex);
    for (const c of cellsToRemove) {
      if (!c.isEndpoint) {
        this.grid = this.clearCellOccupancy(this.grid, c.row, c.col);
      }
    }

    const truncated = existingPath.slice(0, breakIndex);
    this.allPaths.set(colour, truncated);
    this.renderPath(colour, truncated);
    useFlowGameStore.getState().setPath(colour, truncated);
    this.dispatchCoverage();
  }

  /** Clear a colour's whole path (non-endpoint cells) and its layers. */
  private clearColourPath(colour: Colour): void {
    const path = this.allPaths.get(colour) ?? [];
    for (const c of path) {
      if (!c.isEndpoint) {
        this.grid = this.clearCellOccupancy(this.grid, c.row, c.col);
      }
    }
    this.allPaths.delete(colour);
    this.pathGraphics.get(colour)?.clear();
    this.cellFillGraphics.get(colour)?.clear();
    useFlowGameStore.getState().clearPath(colour);
  }

  /** Single-cell clear (GridEngine.clearPath clears a whole colour; we need one cell). */
  private clearCellOccupancy(grid: Grid, row: number, col: number): Grid {
    return grid.map((r, ri) =>
      r.map((c, ci) => {
        if (ri === row && ci === col && !c.isEndpoint) {
          return { ...c, colour: null, isOccupied: false };
        }
        return c;
      }),
    );
  }

  private onPathComplete(colour: Colour, path: Cell[]): void {
    this.allPaths.set(colour, [...path]);
    useFlowGameStore.getState().setPath(colour, path);
    this.renderPath(colour, path);
    this.dispatchCoverage();
    this.checkWin();
  }

  private checkWin(): void {
    if (isWinCondition(this.grid, this.levelConfig!.dots)) {
      useFlowGameStore.getState().setStatus('complete');
      // Phaser has no React Router access — dispatch a DOM event that
      // GameScreen.tsx listens for and turns into navigate('/win').
      window.dispatchEvent(new CustomEvent('fl:win'));
    }
  }

  private dispatchCoverage(): void {
    useFlowGameStore.getState().setCoverage(calculateCoverage(this.grid));
  }
}
