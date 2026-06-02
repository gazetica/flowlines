// GridEngine.ts
// Numtap | Gazetica Studio | Sprint 2 Day 1 | Task T-001
//
// Core game logic engine. Pure TypeScript.
// ZERO Phaser imports. ZERO React imports. ZERO browser-rendering APIs.
// (Date.now() is used per the method specs in the task brief for fog/countdown
//  timestamps — this is the standard timing primitive, not a browser DOM API.)
//
// SPEC NOTE (genuine ambiguity resolved):
//   The T-001 brief's Cell interface lists: row, col, value, tapped, revealed, revealedAt.
//   docs/api_contracts.md (which the brief instructs us to follow) ALSO specifies a
//   `display: number` field ("what renders — same as value unless modifier changes it").
//   The api-contracts document is the authoritative inter-module contract, so `display`
//   is included here. It is kept in sync with the value via getDisplayValue() logic on
//   generation and reshuffle. The brief's unit tests do not reference `display`, so this
//   addition is non-breaking while satisfying the contract.

export type Modifier = 'none' | 'shuffle' | 'fog' | 'mirror' | 'countdown';
export type Direction = 'ascending' | 'descending';
export type TapResult = 'CORRECT' | 'WRONG' | 'ALREADY_TAPPED';

export interface Cell {
  row: number;
  col: number;
  value: number;             // actual number (1 to N²)
  display: number;           // what renders — same as value unless modifier changes it
  tapped: boolean;
  revealed: boolean;         // fog: true = currently visible to player
  revealedAt: number | null; // fog/countdown: timestamp (ms) when revealed
}

export class GridEngine {
  private n: number;
  private modifier: Modifier;
  private direction: Direction;
  private grid: Cell[][];
  private expectedNext: number;
  private shuffleAccumulator: number; // ms since last shuffle
  private readonly SHUFFLE_INTERVAL = 8000; // 8 seconds in ms
  private readonly COUNTDOWN_LIFETIME = 3000; // 3 seconds in ms

  constructor(n: number, modifier: Modifier, direction: Direction) {
    this.n = n;
    this.modifier = modifier;
    this.direction = direction;
    this.shuffleAccumulator = 0;
    this.expectedNext = 0;
    this.grid = [];
    this.generateGrid();
  }

  // --- Private helpers --------------------------------------------------

  // Fisher-Yates shuffle (exact implementation per brief).
  private shuffle(array: number[]): number[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Reverse the digits of the number. 12 → 21, 7 → 7, 49 → 94, 1 → 1.
  private mirrorNumber(n: number): number {
    return parseInt(String(n).split('').reverse().join(''), 10);
  }

  // Computes the display value for a raw value given the current modifier.
  // Used to keep cell.display in sync at generation / reshuffle time.
  private computeDisplay(value: number): number {
    return this.modifier === 'mirror' ? this.mirrorNumber(value) : value;
  }

  // --- Public API -------------------------------------------------------

  generateGrid(): Cell[][] {
    const total = this.n * this.n;

    // 1. Create array [1, 2, 3, ... N²]
    const values: number[] = [];
    for (let i = 1; i <= total; i++) {
      values.push(i);
    }

    // 2. Fisher-Yates shuffle.
    this.shuffle(values);

    // 3. Fill this.grid as NxN: grid[row][col].
    this.grid = [];
    let idx = 0;
    for (let row = 0; row < this.n; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < this.n; col++) {
        const value = values[idx++];
        rowCells.push({
          row,
          col,
          value,
          display: this.computeDisplay(value),
          tapped: false,
          revealed: false,
          revealedAt: null,
        });
      }
      this.grid.push(rowCells);
    }

    // 4. Set expectedNext based on direction.
    this.expectedNext = this.direction === 'ascending' ? 1 : total;

    return this.grid;
  }

  // Returns a deep copy of the grid — callers must not mutate engine state.
  getGrid(): Cell[][] {
    return this.grid.map((row) => row.map((cell) => ({ ...cell })));
  }

  getExpectedNext(): number {
    return this.expectedNext;
  }

  isComplete(): boolean {
    return this.grid.every((row) => row.every((cell) => cell.tapped === true));
  }

  validateTap(row: number, col: number): TapResult {
    const cell = this.grid[row][col];

    // 2. Already tapped.
    if (cell.tapped === true) {
      return 'ALREADY_TAPPED';
    }

    // 3/4. Effective value is cell.value for both directions
    //      (expectedNext counts down for descending).
    if (cell.value !== this.expectedNext) {
      return 'WRONG';
    }

    // 5. Correct tap.
    cell.tapped = true;
    cell.revealed = true; // tapped cells always show (fog)
    if (this.direction === 'ascending') {
      this.expectedNext += 1;
    } else {
      this.expectedNext -= 1;
    }
    return 'CORRECT';
  }

  // SHUFFLE modifier: call every frame with the frame delta (ms).
  // Returns true if a reshuffle occurred this tick.
  onShuffleTick(deltaMs: number): boolean {
    // 1. Only applies to shuffle modifier.
    if (this.modifier !== 'shuffle') {
      return false;
    }

    // 2/3. Accumulate; bail until interval reached.
    this.shuffleAccumulator += deltaMs;
    if (this.shuffleAccumulator < this.SHUFFLE_INTERVAL) {
      return false;
    }

    // 4. Reset accumulator.
    this.shuffleAccumulator = 0;

    // 5/6. Collect untapped cells and their values.
    const untapped: Cell[] = [];
    const values: number[] = [];
    for (const row of this.grid) {
      for (const cell of row) {
        if (!cell.tapped) {
          untapped.push(cell);
          values.push(cell.value);
        }
      }
    }

    // 7. Shuffle the values.
    this.shuffle(values);

    // 8. Redistribute shuffled values into the untapped cells.
    //    Tapped cells never move.
    for (let i = 0; i < untapped.length; i++) {
      const cell = untapped[i];
      cell.value = values[i];
      cell.display = this.computeDisplay(values[i]);
      cell.revealed = false; // fog: re-hide moved cells
      cell.revealedAt = null;
    }

    // 9.
    return true;
  }

  // FOG modifier: call on pointer/touch move. Reveals cells within
  // 1-cell Chebyshev radius of the pointer.
  onPointerMove(pointerRow: number, pointerCol: number): void {
    // 1. Only applies to fog modifier.
    if (this.modifier !== 'fog') {
      return;
    }

    // 2. Reveal nearby, untapped, currently-hidden cells.
    for (const row of this.grid) {
      for (const cell of row) {
        const distance = Math.max(
          Math.abs(cell.row - pointerRow),
          Math.abs(cell.col - pointerCol)
        );
        if (distance <= 1 && cell.tapped === false && cell.revealed === false) {
          cell.revealed = true;
          cell.revealedAt = Date.now();
        }
      }
    }
  }

  // COUNTDOWN modifier: call every frame. Hides cells revealed > 3s ago.
  // Returns the array of cells that became hidden this tick.
  // NOTE: api_contracts.md names this param `elapsedMs`, but the brief's logic
  // measures lifetime via Date.now() - revealedAt, so the param itself is unused.
  // Prefixed with `_` to satisfy noUnusedParameters while keeping the contract shape.
  onCountdownTick(_elapsedMs: number): Cell[] {
    // 1. Only applies to countdown modifier.
    if (this.modifier !== 'countdown') {
      return [];
    }

    const hiddenThisTick: Cell[] = [];
    const now = Date.now();

    for (const row of this.grid) {
      for (const cell of row) {
        if (
          cell.revealed === true &&
          cell.tapped === false &&
          cell.revealedAt !== null
        ) {
          if (now - cell.revealedAt > this.COUNTDOWN_LIFETIME) {
            cell.revealed = false;
            cell.revealedAt = null;
            hiddenThisTick.push(cell);
          }
        }
      }
    }

    return hiddenThisTick;
  }

  // Returns the number that should render on the tile.
  // Mirror modifier reverses digit order. (The visual horizontal flip is
  // handled by GameScene via CSS transform — this only reverses digits.)
  getDisplayValue(cell: Cell): number {
    if (this.modifier === 'mirror') {
      return this.mirrorNumber(cell.value);
    }
    return cell.value;
  }

  // Resets engine to a fresh state with the same n/modifier/direction.
  reset(): void {
    this.shuffleAccumulator = 0;
    this.generateGrid();
  }
}
