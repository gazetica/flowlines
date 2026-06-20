// levelUtils.ts
// Flow Lines | Gazetica Studio | FL-UX-D-022 Fix 4
//
// Global (campaign-wide) level numbering. Each pack holds 50 levels, so the
// global number runs 1–200 across the four packs. Navigation still uses the
// per-pack index (1–50, the ?level= URL param); only DISPLAY uses the global #.

const PACK_SIZE = 50;

/** Global 1–200 level number from a 1-based pack and 1-based per-pack index. */
export function globalLevelNum(pack: number, levelInPack: number): number {
  return (pack - 1) * PACK_SIZE + levelInPack;
}

/** Global level number as a zero-padded 2-char string (for breadcrumbs/buttons). */
export function globalLevelStr(pack: number, levelInPack: number): string {
  return String(globalLevelNum(pack, levelInPack)).padStart(2, '0');
}
