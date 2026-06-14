// generate-levels-hamiltonian.ts
// Flow Lines | Gazetica Studio | Sprint 5A | Task FL-S5A-025
//
// CLI around generatePackHamiltonian(). BUILD-TIME ONLY (Node). Mirrors
// generate-levels.ts but uses the Hamiltonian tiling generator (for Pack 3/4).
//
// Usage:
//   npx ts-node scripts/generate-levels-hamiltonian.ts --pack 3 --count 50 --out src/levels/pack3.json
//   npx ts-node scripts/generate-levels-hamiltonian.ts --pack 4 --count 50 --out src/levels/pack4.json --seed 42

import { writeFileSync } from 'fs';
import { generatePackHamiltonian } from './HamiltonianGenerator';
import { PACK_CONFIGS, type PackNumber } from './LevelGenerator';

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

  const levels = await generatePackHamiltonian(pack as PackNumber, count, seed);
  writeFileSync(out, JSON.stringify(levels, null, 2));
  console.log(`Written ${levels.length} levels to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
