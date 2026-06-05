// tileFormat.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-009b Fix 1
//
// Pure tile-label formatting. Mirror-modifier levels zero-pad every tile to a
// fixed 2-character width so the horizontal flip (GameScene setScale(-1,1)) is
// visually symmetric. Without this, single digits (5) and digit-reversed values
// that lose a trailing zero (10 → 1) render as a single glyph and read
// ambiguously when flipped. Examples: 5 → "05", 1 → "01", 21 → "21", 94 → "94".

export function padTileLabel(displayValue: number): string {
  return String(displayValue).padStart(2, '0');
}
