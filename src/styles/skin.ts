// src/styles/skin.ts
// Flow Lines — complete design token system
// LOCKED once created — unlock per brief only

export const skin = {

  // ─── Background scale ───────────────────────────────────────────────
  bgDeep:        '#0D0620',
  bgMid:         '#130830',
  bgCard:        '#1C0E42',
  bgRaised:      '#24145A',
  bgBorder:      '#2E1A70',

  // ─── Brand accent ───────────────────────────────────────────────────
  purple:        '#7F77DD',
  purpleLight:   '#ADA7F0',
  purpleDim:     '#4A4399',
  gold:          '#FFD700',
  goldDim:       '#C8A800',
  white:         '#EDE8FF',
  muted:         '#6B5C99',
  muted2:        '#40306A',
  danger:        '#E05050',

  // ─── Game path colours — 8 total ────────────────────────────────────
  // Pack 1: red / blue / green / yellow / purple  (5 colours)
  // Pack 2: adds orange                           (6 colours)
  // Pack 3: adds teal                             (7 colours)
  // Pack 4: adds pink                             (8 colours)
  pathColors: {
    red:    '#E24B4A',
    blue:   '#378ADD',
    green:  '#639922',
    yellow: '#EF9F27',
    purple: '#7F77DD',
    orange: '#D85A30',
    teal:   '#1D9E75',
    pink:   '#D4537E',
  },

  // ─── Glow variants — path colour at 35% opacity ─────────────────────
  // Used for dot endpoint outer glow rings
  glowColors: {
    red:    'rgba(226,75,74,0.35)',
    blue:   'rgba(55,138,221,0.35)',
    green:  'rgba(99,153,34,0.35)',
    yellow: 'rgba(239,159,39,0.35)',
    purple: 'rgba(127,119,221,0.35)',
    orange: 'rgba(216,90,48,0.35)',
    teal:   'rgba(29,158,117,0.35)',
    pink:   'rgba(212,83,126,0.35)',
  },

  // ─── Cell fill variants — path colour at 22% opacity ────────────────
  // Used for occupied cell background fill
  cellFillColors: {
    red:    'rgba(226,75,74,0.22)',
    blue:   'rgba(55,138,221,0.22)',
    green:  'rgba(99,153,34,0.22)',
    yellow: 'rgba(239,159,39,0.22)',
    purple: 'rgba(127,119,221,0.22)',
    orange: 'rgba(216,90,48,0.22)',
    teal:   'rgba(29,158,117,0.22)',
    pink:   'rgba(212,83,126,0.22)',
  },

  // ─── Grid rendering constants (VDD spec — do not change) ────────────
  grid: {
    padTotal:        16,    // total horizontal padding around grid (px)
    gapSmall:         3,    // cell gap for 6×6 and 7×7 grids
    gapLarge:         2,    // cell gap for 8×8 and 9×9 grids
    cellMinSize:     28,    // minimum cell px for finger accuracy
    pathStrokeRatio: 0.40,  // path stroke width = cellSize × 0.40
    dotSizeRatio:    0.70,  // dot endpoint diameter = cellSize × 0.70
    cellRadius:       3,    // border-radius on grid cells (px)
  },

  // ─── Typography ─────────────────────────────────────────────────────
  fontDisplay: "'Space Mono', monospace",
  fontBody:    "'DM Sans', sans-serif",

  // ─── Coverage bar gradient (purple → gold) ──────────────────────────
  coverageGradient: 'linear-gradient(90deg, #7F77DD 0%, #FFD700 100%)',

  // ─── Glassmorphism card tokens ──────────────────────────────────────
  cardFill:   'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(127,119,221,0.25)',

  // ─── Locked pack / level opacity ────────────────────────────────────
  lockedAlpha: 0.42,

} as const;

// ─── Types ──────────────────────────────────────────────────────────────
export type PathColour = keyof typeof skin.pathColors;

// ─── Helpers ──────────────────────────────────────────────────────────────
export const getPathColor     = (c: PathColour): string => skin.pathColors[c];
export const getGlowColor     = (c: PathColour): string => skin.glowColors[c];
export const getCellFillColor = (c: PathColour): string => skin.cellFillColors[c];
