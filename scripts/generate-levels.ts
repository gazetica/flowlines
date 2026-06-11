// generate-levels.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 8 | Task FL-S2-008
//
// CLI wrapper around generatePack(). BUILD-TIME ONLY (Node).
//
// Usage:
//   npx ts-node scripts/generate-levels.ts --pack 1 --count 50 --out src/levels/pack1.json
//   npx ts-node scripts/generate-levels.ts --pack 1 --count 5  --out src/levels/pack1.json --seed 42

import { writeFileSync } from 'fs';
import { generatePack, PACK_CONFIGS, type PackNumber } from './LevelGenerator';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const pack = Number(arg('pack'));
  const count = Number(arg('count'));
  const out = arg('out');
  const seedRaw = arg('seed');
  const seed = seedRaw !== undefined ? Number(seedRaw) : undefined;

  if (!(pack in PACK_CONFIGS)) throw new Error(`--pack must be one of ${Object.keys(PACK_CONFIGS).join(', ')}`);
  if (!Number.isInteger(count) || count <= 0) throw new Error('--count must be a positive integer');
  if (!out) throw new Error('--out <path> is required');
  if (seedRaw !== undefined && !Number.isFinite(seed)) throw new Error('--seed must be a number');

  const levels = await generatePack(pack as PackNumber, count, seed);
  writeFileSync(out, JSON.stringify(levels, null, 2));
  console.log(`Written ${levels.length} levels to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
