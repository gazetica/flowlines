// ============================================================
// GameScene.ts — LOCKED after FL-S3-013 (Sprint 3 Day 13)
// NO CHANGES to this file without explicit unlock scope approval
// from the main project thread.
// ============================================================
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

  // Hint pulse state (FL-S3-013 Task 13.3).
  private hintGraphics?: Phaser.GameObjects.Graphics;
  private hintTweens: Phaser.Tweens.Tween[] = [];
  private hintCell: { row: number; col: number } | null = null;

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
          this.playRetractFade(c, this.activeColour); // Task 13.4 — visual only
        }
      }
      this.renderPath(this.activeColour, this.activePath);
      this.dispatchCoverage();
      // Task 13.4 — let the React HUD flash the move counter.
      window.dispatchEvent(new CustomEvent('fl:undo'));
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

    // Task 13.3 — stop the hint pulse once the player reaches the hinted cell.
    if (this.hintCell && this.hintCell.row === cell.row && this.hintCell.col === cell.col) {
      this.hideHint();
    }

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
    this.playLockInAnimation(colour); // Task 13.1 — visual only
    this.checkWin();
  }

  private checkWin(): void {
    if (isWinCondition(this.grid, this.levelConfig!.dots)) {
      useFlowGameStore.getState().setStatus('complete');
      // Task 13.2 — play the cascade, then dispatch fl:win after 650ms so the
      // animation is visible before React navigates to /result. (Win detection
      // logic is unchanged; only the emit timing is delayed.)
      this.playWinCascade();
      this.time.delayedCall(650, () => {
        window.dispatchEvent(new CustomEvent('fl:win'));
      });
    }
  }

  private dispatchCoverage(): void {
    useFlowGameStore.getState().setCoverage(calculateCoverage(this.grid));
  }

  // ─── Animations (FL-S3-013 — visual only, no game-logic changes) ─────────────

  /**
   * Task 13.1 — Path lock-in shimmer (≤200ms): a bright glow sweeps along the
   * path source→target, and each endpoint's ring pulses radius 0→12→6.
   * Runs independently per call (multiple colours can lock in at once).
   */
  private playLockInAnimation(colour: Colour): void {
    const cells = this.allPaths.get(colour) ?? [];
    if (cells.length === 0) return;
    const hex = toHex(skin.pathColors[colour]);

    // Shimmer: a white additive glow travelling along the path cells.
    if (cells.length >= 2) {
      const shimmer = this.add.circle(
        this.cellCentreX(cells[0].col),
        this.cellCentreY(cells[0].row),
        Math.max(4, this.cellSize * 0.3),
        0xffffff,
        0.85,
      );
      shimmer.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.addCounter({
        from: 0,
        to: cells.length - 1,
        duration: 180,
        ease: 'Power2.easeOut',
        onUpdate: (tw) => {
          const v = tw.getValue() ?? 0;
          const i = Math.min(Math.floor(v), cells.length - 2);
          const f = v - i;
          const a = cells[i];
          const b = cells[i + 1];
          shimmer.x = Phaser.Math.Linear(this.cellCentreX(a.col), this.cellCentreX(b.col), f);
          shimmer.y = Phaser.Math.Linear(this.cellCentreY(a.row), this.cellCentreY(b.row), f);
        },
        onComplete: () => shimmer.destroy(),
      });
    }

    // Dot ring pulse: radius 0 → 12 → 6 over ~200ms ease-out, both endpoints.
    for (const cell of cells) {
      if (!cell.isEndpoint) continue;
      const ring = this.add.circle(this.cellCentreX(cell.col), this.cellCentreY(cell.row), 1, 0xffffff, 0);
      ring.setStrokeStyle(2, hex, 1);
      this.tweens.addCounter({
        from: 0,
        to: 12,
        duration: 100,
        ease: 'Power2.easeOut',
        onUpdate: (tw) => ring.setRadius(tw.getValue() ?? 0),
        onComplete: () => {
          this.tweens.addCounter({
            from: 12,
            to: 6,
            duration: 100,
            ease: 'Power2.easeOut',
            onUpdate: (tw) => ring.setRadius(tw.getValue() ?? 0),
            onComplete: () => ring.destroy(),
          });
        },
      });
    }
  }

  /**
   * Task 13.2 — Win cascade (600ms): all cells flash white (0–100ms), then each
   * cell's colour brightens 22%→85% in a radial cascade outward from centre
   * (100–600ms). Overlays are torn down with the scene/game on navigation.
   */
  private playWinCascade(): void {
    const N = this.N;
    const radius = skin.grid.cellRadius;
    const centre = (N - 1) / 2;

    // Phase 1 — simultaneous white flash over the whole board.
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 1);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        flash.fillRoundedRect(this.cellX(c), this.cellY(r), this.cellSize, this.cellSize, radius);
      }
    }
    flash.setAlpha(0);
    this.tweens.add({
      targets: flash,
      alpha: 0.6,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Phase 2 — radial colour brighten, staggered by distance band from centre.
    let maxBand = 1;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        maxBand = Math.max(maxBand, Math.round(Math.abs(r - centre) + Math.abs(c - centre)));
      }
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const colour = this.grid[r][c].colour;
        if (!colour) continue;
        const band = Math.round(Math.abs(r - centre) + Math.abs(c - centre));
        const overlay = this.add.graphics();
        overlay.fillStyle(toHex(skin.pathColors[colour]), 1);
        overlay.fillRoundedRect(this.cellX(c), this.cellY(r), this.cellSize, this.cellSize, radius);
        overlay.setAlpha(0);
        this.tweens.add({
          targets: overlay,
          alpha: 0.63, // stacks over the existing 22% fill → ~85%
          duration: 150,
          delay: 100 + (band / maxBand) * 350,
          ease: 'Power2.easeOut',
        });
      }
    }
  }

  /**
   * Task 13.4 — Undo retraction fade (150ms ease-in). The path data is already
   * updated (frame-accurate); this overlays the removed cell's colour and fades
   * it to empty for a smooth retract.
   */
  private playRetractFade(cell: Cell, colour: Colour): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(toHex(skin.pathColors[colour]), 0.22);
    overlay.fillRoundedRect(
      this.cellX(cell.col),
      this.cellY(cell.row),
      this.cellSize,
      this.cellSize,
      skin.grid.cellRadius,
    );
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 150,
      ease: 'Power2.easeIn',
      onComplete: () => overlay.destroy(),
    });
  }

  /**
   * Task 13.3 — Start the hint pulse on (row, col): white border 1→3px and a
   * white background flash 0→30%→0, both repeating every 800ms. Colour-agnostic.
   * React calls this on the GameScene instance when a hint is activated.
   */
  showHint(row: number, col: number): void {
    this.hideHint();
    this.hintCell = { row, col };

    const x = this.cellX(col);
    const y = this.cellY(row);
    const s = this.cellSize;
    const radius = skin.grid.cellRadius;
    const g = this.add.graphics();
    this.hintGraphics = g;

    const state = { border: 1, flash: 0 };
    const redraw = () => {
      g.clear();
      g.fillStyle(0xffffff, state.flash);
      g.fillRoundedRect(x, y, s, s, radius);
      g.lineStyle(state.border, 0xffffff, 1);
      g.strokeRoundedRect(x, y, s, s, radius);
    };
    redraw();

    this.hintTweens = [
      this.tweens.add({
        targets: state,
        border: 3,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: redraw,
      }),
      this.tweens.add({
        targets: state,
        flash: 0.3,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: redraw,
      }),
    ];
  }

  /** Task 13.3 — Stop the hint pulse and remove its overlay. */
  hideHint(): void {
    for (const t of this.hintTweens) t.remove();
    this.hintTweens = [];
    this.hintGraphics?.destroy();
    this.hintGraphics = undefined;
    this.hintCell = null;
  }
}
