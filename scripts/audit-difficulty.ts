// audit-difficulty.ts
// Flow Lines | Gazetica Studio | UX Sprint C | Task FL-UX-C.3
//
// BUILD-TIME ONLY (scripts/ is Node-only — never bundled). Analyses every level
// in Pack 1 + Pack 2 and flags difficulty outliers using proxy metrics derived
// from the solver's solution (we have no real win-rate data yet):
//   - minPathLength  : shortest individual colour path (<=2 => near-freebie)
//   - variance       : max path length - min path length (spread of the board)
//   - ratio          : variance / gridSize^2  (normalised across pack sizes)
// It only IDENTIFIES regeneration candidates; it never modifies level JSON.
//
// Run:  npx ts-node scripts/audit-difficulty.ts [--deep]
//       npx ts-node scripts/audit-difficulty.ts > scripts/difficulty-report.txt

import * as fs from 'fs';
import * as path from 'path';
import { solve, type DotPair } from './PathSolver';

interface Level {
  id: string;
  pack: number;
  grid: number;
  colours: number;
  optimalMoves: number;
  dots: DotPair[];
}

type Rating = 'trivial' | 'easy' | 'medium' | 'hard' | 'unknown';

interface LevelAudit {
  id: string;
  grid: number;
  colours: number;
  optimalMoves: number;
  minPath: number;
  maxPath: number;
  variance: number;
  rating: Rating;
  flag: string | null;
}

const DEEP = process.argv.includes('--deep');

function loadPack(file: string): Level[] {
  const p = path.join(__dirname, '..', 'src', 'levels', file);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Level[];
}

function classify(grid: number, minPath: number, variance: number): { rating: Rating; flag: string | null } {
  const g2 = grid * grid;
  const ratio = variance / g2;
  if (minPath <= 2) return { rating: 'trivial', flag: `minPath ${minPath} — near-direct path` };
  if (ratio < 0.15) return { rating: 'trivial', flag: `variance ${variance} — paths near-equal (monotonous)` };
  if (ratio > 0.6) return { rating: 'hard', flag: `variance ${variance} — one colour dominates the board` };
  if (ratio > 0.35) return { rating: 'medium', flag: null };
  return { rating: 'easy', flag: null };
}

function auditLevel(lvl: Level): LevelAudit {
  const sol = solve(lvl.grid, lvl.dots, DEEP ? 5000 : 2000);
  if (!sol) {
    return { id: lvl.id, grid: lvl.grid, colours: lvl.colours, optimalMoves: lvl.optimalMoves, minPath: 0, maxPath: 0, variance: 0, rating: 'unknown', flag: 'solver returned null / timeout' };
  }
  const lengths = [...sol.values()].map((pth) => pth.length);
  const minPath = Math.min(...lengths);
  const maxPath = Math.max(...lengths);
  const variance = maxPath - minPath;
  const { rating, flag } = classify(lvl.grid, minPath, variance);
  return { id: lvl.id, grid: lvl.grid, colours: lvl.colours, optimalMoves: lvl.optimalMoves, minPath, maxPath, variance, rating, flag };
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

function report(packNo: number, levels: Level[]): LevelAudit[] {
  console.log(`\nPACK ${packNo} DIFFICULTY AUDIT`);
  console.log('='.repeat(72));
  console.log(`${pad('ID', 10)}${pad('Grid', 7)}${pad('C', 3)}${pad('OptMv', 7)}${pad('MinP', 6)}${pad('MaxP', 6)}${pad('Var', 5)}${pad('Rating', 10)}Flag`);
  const audits = levels.map(auditLevel);
  for (const a of audits) {
    console.log(
      `${pad(a.id, 10)}${pad(`${a.grid}x${a.grid}`, 7)}${pad(a.colours, 3)}${pad(a.optimalMoves, 7)}${pad(a.minPath, 6)}${pad(a.maxPath, 6)}${pad(a.variance, 5)}${pad(a.rating, 10)}${a.flag ?? ''}`,
    );
  }
  return audits;
}

const all: LevelAudit[] = [];
for (const [no, file] of [[1, 'pack1.json'], [2, 'pack2.json']] as const) {
  let levels: Level[] = [];
  try {
    levels = loadPack(file);
  } catch (err) {
    console.log(`\nPACK ${no}: could not load ${file} (${String(err)})`);
    continue;
  }
  if (levels.length === 0) {
    console.log(`\nPACK ${no}: ${file} is empty — skipped.`);
    continue;
  }
  all.push(...report(no, levels));
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
const trivial = all.filter((a) => a.rating === 'trivial');
const hard = all.filter((a) => a.rating === 'hard');
const ok = all.filter((a) => a.rating === 'easy' || a.rating === 'medium');
const unknown = all.filter((a) => a.rating === 'unknown');

console.log('\nSUMMARY');
console.log(`  Total levels audited:        ${all.length}`);
console.log(`  Trivial (minPath<=2 / low var): ${trivial.length}`);
console.log(`  Hard (variance > 60% of grid^2): ${hard.length}`);
console.log(`  Well-distributed (easy/medium):  ${ok.length}`);
if (unknown.length) console.log(`  Unknown (solver timeout):        ${unknown.length}`);

console.log('\nRECOMMENDED REGENERATION CANDIDATES:');
const candidates = [...trivial, ...hard];
if (candidates.length === 0) {
  console.log('  none — all levels are well-distributed.');
} else {
  for (const a of candidates) console.log(`  ${a.id}  — ${a.flag}`);
}

if (!DEEP) {
  console.log('\n(Note: --deep multi-solution counting is unavailable — PathSolver.solve');
  console.log(' returns a single solution and is LOCKED, so alternative-path counting is');
  console.log(' out of scope. Metrics above derive from that one canonical solution.)');
}
