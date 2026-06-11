# Flow Lines — Detailed Sprint Plan
## Gazetica Studio | Voraky Retail LLP
**Game:** Flow Lines (Game 2 of 5) | **Bundle ID:** `com.gazetica.flowlines`  
**Version:** 1.0 | **Date:** 11 June 2026 | **Status:** Pre-Development  
**Total duration:** 6 weeks (part-time, 3–4 hrs/day, Mon–Sat)  
**Planned start:** Week of 16 June 2026 (after Numtap review stabilises)  
**Planned submission:** Week of 28 July 2026  
**Dev machine:** Windows 10, i7, 16GB RAM, Intel HD Graphics 5500  
**Test device:** Samsung SM-E146B (serial `RZCW30XB11X`)

---

## Master Timeline

| Sprint | Week | Calendar | Focus | Deliverable |
|---|---|---|---|---|
| Pre-Sprint | Day 0 | 15 Jun | Infra registration | All accounts + repo ready |
| Sprint 1 | Week 1 | 16–21 Jun | Scaffold + grid engine + drag input | Drawable grid on device |
| Sprint 2 | Week 2 | 23–28 Jun | PathSolver + LevelGenerator + win logic | 100 validated levels + win/fail |
| ⚠ Gate | — | 28 Jun | Sprint 2 QA gate | Must pass before Sprint 3 starts |
| Sprint 3 | Week 3 | 30 Jun–5 Jul | Visual polish + all React screens | Visually complete polished game |
| Sprint 4 | Week 4 | 7–12 Jul | Monetisation + daily challenge + analytics | Fully monetised internal build |
| Sprint 5A | Week 5 | 14–19 Jul | Pack 3 + Pack 4 generation + i18n | 200 levels + 6 languages |
| Sprint 5B | Week 6 | 21–26 Jul | ASO + screenshots + QA + submission | Live on Google Play |
| Post-Launch | Ongoing | Aug 2026 | Monitoring + hotfixes | Stable live game |

---

## Working Assumptions

- **3–4 hours of active development per day**, Mon–Sat (evenings after work)
- Claude Code handles all boilerplate, engine code, and solver algorithm generation
- Mahendra reviews output, runs device tests, and handles all external accounts
- `.\gradlew` from `android\` directory (Windows PowerShell) — not `./gradlew`
- versionCode starts at 1 for Flow Lines — entirely separate from Numtap
- Every Play Console upload (including failed ones) increments versionCode — always `.\gradlew clean` before `bundleRelease` when versionCode changes
- **Sprint 2 is the critical path** — no Sprint 3 work begins until Sprint 2 QA gate passes

---

## Pre-Sprint: Infrastructure Registration
**Target date:** Sunday 15 June 2026 (Day 0)  
**Time estimate:** 2–3 hours  
**Owner:** Mahendra (all account work)

### Accounts & Services

| Task | Tool | Notes |
|---|---|---|
| Register `com.gazetica.flowlines` in Play Console | vorakyretail1@gmail.com | New app, same Voraky developer account |
| Set app name: "Flow Lines - Colour Puzzle Game" | Play Console | English default |
| Add Flow Lines as new app in AdMob | vorakyretail1@gmail.com | Same AdMob account as Numtap |
| Generate Rewarded Video ad unit in AdMob | AdMob dashboard | Note the ad unit ID |
| Generate Interstitial ad unit in AdMob | AdMob dashboard | Note the ad unit ID |
| Note the AdMob App ID for Flow Lines | AdMob → App settings | Format: ca-app-pub-XXXXXXXX~XXXXXXXXXX |
| Add Flow Lines as second app in Firebase | gazetica99@gmail.com | Same `gazetica` Firebase project, new Android app |
| Download updated `google-services.json` | Firebase Console | Replaces Numtap's version — keep separate |
| Create `flowlines_scores` table in Supabase | nkfbuzlxavqljkqyihyo | Run migration SQL from project report Section 13 |
| Create `flowlines_daily_scores` table | Supabase | Same migration block |
| Create `flowlines_pack_gate` table + seed data | Supabase | Insert pack gate rows: (2,25), (3,50), (4,50) |
| Grant anon SELECT/INSERT on all new tables | Supabase SQL editor | Critical — RLS alone is insufficient |
| Fork `gazetica/numtap` repo → `gazetica/flowlines` | gazetica99@gmail.com | Private repo |

### Repo Scaffold (can be done Day 0 or S1 Day 1)

```
# In VS Code integrated terminal (PowerShell)
cd C:\Projects\Gazetica
git clone git@github.com:gazetica/numtap.git flowlines
cd flowlines
git remote set-url origin git@github.com:gazetica/flowlines.git
```

**Checklist complete when:** All account IDs are noted, Supabase tables exist with RLS + anon grants confirmed, repo is forked.

---

## Sprint 1 — Scaffold + Grid Engine + Drag Input
**Dates:** Mon 16 Jun – Sat 21 Jun 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Claude Code (code) + Mahendra (config, device testing)  
**Sprint goal:** A working Flow Lines app on device — coloured dots visible on grid, paths draw on finger drag

---

### Day 1 — Monday 16 June | Bundle ID + Theme + Config

**Time estimate: 3 hours**

| # | Task | Owner | File(s) |
|---|---|---|---|
| 1.1 | Update `capacitor.config.ts`: `appId → com.gazetica.flowlines`, `appName → Flow Lines` | Mahendra | `capacitor.config.ts` |
| 1.2 | Update `android/app/build.gradle`: applicationId, versionCode 1, versionName "1.0" | Mahendra | `android/app/build.gradle` |
| 1.3 | Update `android/app/google-services.json` with Flow Lines Firebase download | Mahendra | `android/app/google-services.json` |
| 1.4 | Replace Numtap CSS tokens with Flow Lines purple theme in `tailwind.config.js` | Claude Code | `tailwind.config.js` |
| 1.5 | Update `skin.ts` with all Flow Lines design tokens from VDD Section 3 | Claude Code | `src/skin.ts` |
| 1.6 | Update `admob.ts` — swap in Flow Lines AdMob App ID and test unit IDs (test IDs for now) | Mahendra | `src/services/admob.ts` |
| 1.7 | Update `supabase.ts` — point to `flowlines_scores` and `flowlines_daily_scores` tables | Claude Code | `src/services/supabase.ts` |
| 1.8 | Clear Numtap `levels/` directory content — create empty `pack1.json` … `pack4.json` | Mahendra | `src/levels/` |
| 1.9 | First `npm run build` → `npx cap sync android` → confirm app launches on device | Mahendra | — |

**Day 1 done when:** App opens on SM-E146B, shows a blank Flow Lines splash screen, no Numtap branding visible.

---

### Day 2 — Tuesday 17 June | GridEngine.ts

**Time estimate: 3–4 hours**  
**Owner:** Claude Code (implementation) | Mahendra (brief + review)

**Brief to Claude Code:**
> Implement `src/game/engine/GridEngine.ts` for Flow Lines. The engine manages an NxN grid of cells. Each cell has a `colour` (null if empty, or a colour string like 'red'), an `isEndpoint` flag, and an `isOccupied` flag. Provide functions: `initGrid(N, dots)`, `isCellInBounds(r,c)`, `isPathValid(colour, fromCell, toCell)` (checks adjacency, no diagonal, no crossing), `occupyCell(r,c,colour)`, `clearPath(colour)`, `getPathCells(colour)`. Export types `Cell`, `Colour`, `DotPair`, `Grid`.

| # | Task | Owner | Notes |
|---|---|---|---|
| 2.1 | Issue brief to Claude Code for `GridEngine.ts` | Mahendra | Paste brief above |
| 2.2 | Claude Code implements `GridEngine.ts` | Claude Code | Full implementation |
| 2.3 | Claude Code writes unit tests: `GridEngine.test.ts` | Claude Code | Min 30 tests — init, bounds, path validity, overlap |
| 2.4 | Mahendra reviews implementation against VDD grid cell spec | Mahendra | Check cell size formula: `(screenWidth - 16 - gap*(N-1)) / N` |
| 2.5 | Run tests: `npx vitest run` | Mahendra | All must pass |

**Day 2 done when:** GridEngine tests all pass. Mahendra has read and understood the path validation logic.

---

### Day 3 — Wednesday 18 June | PathValidator.ts + CoverageCalc.ts

**Time estimate: 3 hours**  
**Owner:** Claude Code

| # | Task | Owner | Notes |
|---|---|---|---|
| 3.1 | Implement `PathValidator.ts` | Claude Code | Validates: in-bounds, orthogonal only, no diagonal, no colour conflict, path must start from endpoint dot |
| 3.2 | Implement `CoverageCalc.ts` | Claude Code | `calculateCoverage(grid): number` — returns 0–100. Win when coverage === 100 AND all dot pairs connected |
| 3.3 | Implement `ScoreEngine.ts` | Claude Code | `calcScore(optimalMoves, actualMoves, hintsUsed): number` — Perfect Clear +200, move efficiency −5/move above optimal, hint penalty −30 |
| 3.4 | Write tests for all three | Claude Code | Min 20 tests each — coverage edge cases, score formula |
| 3.5 | Run full test suite | Mahendra | All must pass |

**Day 3 done when:** All engine logic has passing tests. CoverageCalc correctly returns 100% only when every cell is filled.

---

### Day 4 — Thursday 19 June | Phaser GameScene — Grid Render

**Time estimate: 4 hours**  
**Owner:** Claude Code

**Brief to Claude Code:**
> Implement `src/game/scenes/GameScene.ts` for Flow Lines. This Phaser scene receives a level config (grid size N, dot pairs array) and renders: (a) an NxN grid of cells as rounded rectangles, (b) coloured dot endpoints as circles with outer glow ring, (c) the dot-grid texture overlay, (d) the ambient radial purple glow. Use design tokens from `skin.ts`. Cell size formula: `(gameWidth - 16 - gap*(N-1)) / N` where gap = 3 for N≤7, 2 for N≥8. Min cell size 28px. Do not render timer, score, or any UI — those live in React. Expose `drawPath(colour, cells[])` and `clearPath(colour)` methods for React to call.

| # | Task | Owner | Notes |
|---|---|---|---|
| 4.1 | Issue GameScene brief to Claude Code | Mahendra | — |
| 4.2 | Claude Code implements `GameScene.ts` — grid + dots render | Claude Code | No path drawing yet |
| 4.3 | Wire GameScene into `GameScreen.tsx` React component | Claude Code | Phaser game instance mounts on div ref |
| 4.4 | `npm run build` → `npx cap sync android` → `.\gradlew bundleRelease` | Mahendra | From `android\` directory in PowerShell |
| 4.5 | Install APK on SM-E146B, verify grid renders correctly | Mahendra | 6×6 grid test with dummy level data |

**Day 4 done when:** Grid visible on device with coloured dots glowing. Ambient dot-grid texture visible in background.

---

### Day 5 — Friday 20 June | Drag-to-Draw Path Input

**Time estimate: 4 hours**  
**Owner:** Claude Code  
**This is the hardest day in Sprint 1 — finger input is the core mechanic**

**Brief to Claude Code:**
> Add drag-to-draw path input to `GameScene.ts`. On `pointerdown` on a dot endpoint cell: start drawing that colour. On `pointermove`: if the next cell is valid per GridEngine.isPathValid(), extend the path. If the pointer moves to a cell already occupied by a different colour, break that other path at the intersection point. If the pointer moves back over the player's own current path, retract to that point (undo-on-drag). On `pointerup`: end path. Render the live path as a thick rounded stroke (lineWidth = 40% of cellSize, lineCap = round) in the path colour. Dispatch coverage updates to React via the Zustand gameStore after every cell change.

| # | Task | Owner | Notes |
|---|---|---|---|
| 5.1 | Issue drag input brief to Claude Code | Mahendra | — |
| 5.2 | Claude Code adds `pointerdown`, `pointermove`, `pointerup` to GameScene | Claude Code | All path drawing and retraction logic |
| 5.3 | Claude Code wires coverage dispatch to Zustand `gameStore` | Claude Code | `gameStore.setCoverage(pct)` on every cell change |
| 5.4 | Add React coverage bar to `GameScreen.tsx` HUD | Claude Code | Purple→gold gradient fill bar |
| 5.5 | Build + install on SM-E146B | Mahendra | — |
| 5.6 | Manual test: draw paths, verify retraction, verify colour conflict break | Mahendra | Test all 4 orthogonal directions |
| 5.7 | Verify coverage bar updates in real-time as paths are drawn | Mahendra | — |

**Day 5 done when:** Paths draw and retract smoothly. Colour conflicts break correctly. Coverage bar updates in real time. Sprint 1 deliverable met.

---

### Day 6 — Saturday 21 June | Sprint 1 Review + Zustand State

**Time estimate: 3 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 6.1 | Wire `gameStore.ts` fully: `pathData`, `coverage`, `moveCount`, `status`, `hintsUsed` | Claude Code | Zustand slice |
| 6.2 | Wire `settingsStore.ts`: `packProgress`, `stars`, `dailyStreak`, `lastDailyDate` | Claude Code | Persisted via Capacitor Preferences |
| 6.3 | Add basic win detection: if `allDotsConnected && coverage === 100` → set `status: complete` | Claude Code | Triggers result screen navigation |
| 6.4 | Sprint 1 end-of-sprint device test: draw a complete 6×6 solution, win screen fires | Mahendra | — |
| 6.5 | Git commit: `git add -A && git commit -m "Sprint 1 complete — drawable grid with win detection"` | Mahendra | — |

**Sprint 1 complete when:** App on device has a working drawable grid. Paths draw. Coverage updates. Win state triggers. All GridEngine + PathValidator + CoverageCalc tests passing.

---

### Sprint 1 Summary

| Area | Status |
|---|---|
| Bundle ID + theme + config | ✅ |
| GridEngine.ts (NxN data structure) | ✅ |
| PathValidator.ts | ✅ |
| CoverageCalc.ts | ✅ |
| ScoreEngine.ts | ✅ |
| GameScene.ts (grid render + dots) | ✅ |
| Drag-to-draw path input | ✅ |
| Coverage bar React HUD | ✅ |
| Win detection | ✅ |
| Zustand gameStore + settingsStore | ✅ |
| Unit tests passing | ✅ |

---

## Sprint 2 — PathSolver + LevelGenerator + Validated Level Library
**Dates:** Mon 23 Jun – Sat 28 Jun 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Claude Code (algorithm) + Mahendra (QA + verification)  
**Sprint goal:** 100 pre-validated levels (Pack 1 + Pack 2) stored as JSON. Win and fail logic complete.

> ⚠ **CRITICAL PATH WARNING:** Sprint 2 is the most technically complex sprint in this project. The backtracking solver must produce 100% solvable levels. An unsolvable level shipped to production means a 1-star review and emergency hotfix. This sprint cannot be rushed. If QA reveals solver issues, extend Sprint 2 before starting Sprint 3.

---

### Day 7 — Monday 23 June | PathSolver.ts

**Time estimate: 4 hours**  
**Owner:** Claude Code

**Brief to Claude Code:**
> Implement `scripts/PathSolver.ts` as a Node.js script (not bundled into the app). The solver uses backtracking DFS to find a valid solution for a given Flow Lines puzzle. Input: `grid: Grid, dotPairs: DotPair[]`. Output: `Solution | null`. A valid solution means every dot pair is connected by a continuous path AND every cell in the grid is occupied by exactly one path (100% board coverage). Required optimisations: (1) connectivity pruning — if any unoccupied region becomes disconnected from its target endpoint, backtrack immediately. (2) Iterative deepening DFS for memory efficiency on 9×9 grids. (3) Timeout: if no solution found in 5000ms, return null. Export both `solve(grid, dotPairs)` and `isValidSolution(grid, solution)` for testing.

| # | Task | Owner | Notes |
|---|---|---|---|
| 7.1 | Issue PathSolver brief to Claude Code | Mahendra | Brief as above |
| 7.2 | Claude Code implements `scripts/PathSolver.ts` | Claude Code | Full solver with optimisations |
| 7.3 | Claude Code writes solver unit tests: `PathSolver.test.ts` | Claude Code | Min 40 test cases: 3×3 trivial, 4×4, 6×6, known-solvable configs |
| 7.4 | Run solver tests: `npx vitest run PathSolver` | Mahendra | All must pass |
| 7.5 | Manual verification: run solver on 3 hand-crafted 6×6 puzzles | Mahendra | Confirm solutions are valid by visual inspection |

**Day 7 done when:** PathSolver tests all pass. Manual verification on 3 known puzzles returns correct solutions.

---

### Day 8 — Tuesday 24 June | LevelGenerator.ts

**Time estimate: 4 hours**  
**Owner:** Claude Code

**Brief to Claude Code:**
> Implement `scripts/LevelGenerator.ts`. The generator runs at build time only — never shipped in the app bundle. For a given pack config (gridSize N, numColours, numLevels, seed), it: (1) PLACEMENT: randomly places N dot pairs on the NxN grid, ensuring minimum distance of 2 cells between same-colour dots; (2) SOLVE: calls PathSolver.solve(); (3) VALIDATE: if solver returns null, discard and retry; (4) QUALITY CHECK: if optimal path per colour < 3 cells on average, discard (too trivial); if any single colour's path covers > 80% of board, discard (too simple); (5) STORE: write compact JSON `{id, pack, grid, colours, optimalMoves, dots:[{colour,r1,c1,r2,c2}]}`. Repeat until `numLevels` valid levels generated. Add CLI: `npx ts-node scripts/generate-levels.ts --pack 1 --out src/levels/pack1.json`.

| # | Task | Owner | Notes |
|---|---|---|---|
| 8.1 | Issue LevelGenerator brief to Claude Code | Mahendra | — |
| 8.2 | Claude Code implements `scripts/LevelGenerator.ts` | Claude Code | With all 5 pipeline phases |
| 8.3 | Claude Code writes generator tests: `LevelGenerator.test.ts` | Claude Code | Test all 4 pipeline phases individually |
| 8.4 | Test generator CLI dry-run: `npx ts-node scripts/generate-levels.ts --pack 1 --out src/levels/pack1.json --count 5` | Mahendra | Generate 5 test levels |
| 8.5 | Inspect 5 generated JSON levels — verify schema is correct | Mahendra | Check dot positions, optimalMoves field |

**Day 8 done when:** Generator CLI produces valid JSON. 5 test levels pass visual inspection.

---

### Day 9 — Wednesday 25 June | Generate Pack 1 + Pack 2

**Time estimate: 4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 9.1 | Generate Pack 1 (6×6, 5 colours, 50 levels) | Mahendra | `npx ts-node scripts/generate-levels.ts --pack 1 --count 50 --out src/levels/pack1.json` |
| 9.2 | Generate Pack 2 (7×7, 6 colours, 50 levels) | Mahendra | Same command with pack 2 config |
| 9.3 | Verify JSON output: 50 levels per file, all fields present | Mahendra | Count lines, check schema spot-check |
| 9.4 | Wire level loading in `LevelManager.ts` — reads from bundled JSON, passes config to GameScene | Claude Code | `getLevelById(packId, levelIndex): LevelConfig` |
| 9.5 | Wire `DailyChallenge.ts` (reused from Numtap) for Flow Lines daily seed namespace | Claude Code | New seed key: `FL_DAILY_SEED` |
| 9.6 | Build + install — load Pack 1 Level 1 on device, confirm grid renders with correct dots | Mahendra | — |

**Day 9 done when:** 100 levels generated and bundled. Level 1 of Pack 1 loads on device with correct dot positions.

---

### Day 10 — Thursday 26 June | QA — Manual Level Verification

**Time estimate: 4–6 hours**  
**Owner:** Mahendra (manual QA — this cannot be automated)

> This is the most important QA step in the entire project. An unsolvable level that ships to users will generate 1-star reviews immediately. Budget the full session for this.

| # | Task | Owner | Notes |
|---|---|---|---|
| 10.1 | Play 10 random Pack 1 levels end-to-end on SM-E146B | Mahendra | Pick: levels 1, 5, 10, 15, 20, 25, 30, 35, 42, 50 |
| 10.2 | For each level: confirm it is solvable | Mahendra | If stuck: confirm solver can find solution via `--verify` CLI flag |
| 10.3 | For each level: confirm it is non-trivial (not solved in < 5 seconds) | Mahendra | If trivially easy: note level ID for regeneration |
| 10.4 | Play 10 random Pack 2 levels end-to-end | Mahendra | Pick: levels 1, 5, 10, 15, 20, 25, 30, 35, 42, 50 |
| 10.5 | For each level: confirm solvable + non-trivial | Mahendra | — |
| 10.6 | If any level fails: regenerate that specific level using seed override | Mahendra | `--seed XXXXX --replace-id p1_XXX` |
| 10.7 | Note the range of solve times: min / median / max per pack | Mahendra | Confirms difficulty spread is appropriate |

**Day 10 done when:** 20 levels manually verified as solvable and non-trivial. No regeneration failures outstanding.

> 🚨 **Sprint 2 QA Gate:** If solver produces more than 2 unsolvable levels in the 20-level sample, STOP. Do not proceed to Sprint 3. Diagnose solver logic with Claude Code, fix, regenerate, re-verify. Sprint 3 cannot start until this gate clears.

---

### Day 11 — Friday 27 June | Win/Fail States + Result Screen Foundation

**Time estimate: 3 hours**  
**Owner:** Claude Code

| # | Task | Owner | Notes |
|---|---|---|---|
| 11.1 | Implement win state: `allDotsConnected AND coverage === 100 → status: complete` | Claude Code | In `gameStore.ts` |
| 11.2 | Implement fail/abandon state: back button mid-game → show abandon confirmation | Claude Code | `status: abandoned` |
| 11.3 | Implement `ResultScreen.tsx` scaffold — shows level complete, stars placeholder | Claude Code | VD-06 layout from VDD |
| 11.4 | Implement `ScoreEngine.calcScore()` and connect to result screen | Claude Code | Moves, coverage 100%, hint penalty |
| 11.5 | Implement 3-star logic in `ScoreEngine.ts` — optimal/within-20%/completed | Claude Code | Stars persist to Capacitor Preferences |
| 11.6 | Build + device test: complete a level, verify result screen fires, verify star is awarded | Mahendra | — |

---

### Day 12 — Saturday 28 June | Sprint 2 Review + Tests

**Time estimate: 3 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 12.1 | Write integration test: load level → draw complete solution → verify win fires | Claude Code | `GameIntegration.test.ts` |
| 12.2 | Run full test suite — all must pass | Mahendra | `npx vitest run` |
| 12.3 | Verify `pack1.json` and `pack2.json` are bundled in APK | Mahendra | Check `src/levels/` is in Vite bundle |
| 12.4 | Git commit: `"Sprint 2 complete — 100 validated levels, win/fail logic, result screen"` | Mahendra | — |
| 12.5 | Sprint 2 QA gate sign-off | Mahendra | Written in commit message: "QA GATE PASSED" |

**Sprint 2 complete when:** 100 validated levels in bundle. Win/fail logic working on device. Result screen shows correct score + stars. All tests pass. QA gate explicitly signed off.

---

### Sprint 2 Summary

| Area | Status |
|---|---|
| PathSolver.ts (backtracking + pruning) | ✅ |
| Solver unit tests (40+ cases) | ✅ |
| LevelGenerator.ts (5-phase pipeline) | ✅ |
| Pack 1 — 50 levels (6×6, 5 colours) | ✅ |
| Pack 2 — 50 levels (7×7, 6 colours) | ✅ |
| QA gate — 20 levels manually verified | ✅ |
| LevelManager.ts | ✅ |
| Win detection (100% coverage + all connected) | ✅ |
| Fail/abandon state | ✅ |
| ResultScreen.tsx scaffold | ✅ |
| ScoreEngine.ts (moves + hints) | ✅ |
| 3-star logic | ✅ |

---

## Sprint 3 — Visual Polish + All React Screens
**Dates:** Mon 30 Jun – Sat 5 Jul 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Claude Code (all UI + animations) + Mahendra (app icon + store assets)  
**Sprint goal:** Visually complete, polished game. All 14 VDD screens implemented. Zero placeholder UI remaining.

> GameScene.ts is **LOCKED** from this point. No changes to game engine logic in Sprint 3 or later without explicit unlock scope.

---

### Day 13 — Monday 30 June | Phaser Visual Polish

**Time estimate: 4 hours**  
**Owner:** Claude Code

| # | Task | Owner | File |
|---|---|---|---|
| 13.1 | Add path lock-in shimmer animation (200ms ease-out, glow radius 0→12→6px) | Claude Code | `GameScene.ts` — UNLOCK SCOPE: animation methods only |
| 13.2 | Add win cascade animation (all cells flash white → colour brightens 22%→85% radial, 600ms) | Claude Code | `GameScene.ts` |
| 13.3 | Add hint cell pulse animation (white border 1→3px, 800ms repeat) | Claude Code | `GameScene.ts` |
| 13.4 | Add undo retraction animation (150ms ease-in per cell) | Claude Code | `GameScene.ts` |
| 13.5 | **GameScene.ts LOCKED after Day 13 commit** | Mahendra | Add `LOCKED` comment to file header |
| 13.6 | Build + install, play through win animation on device | Mahendra | Confirm cascade looks correct |

---

### Day 14 — Tuesday 1 July | SplashScreen + HomeScreen

**Time estimate: 3–4 hours**  
**Owner:** Claude Code

| # | Task | Owner | Screen |
|---|---|---|---|
| 14.1 | Implement `SplashScene.ts` — mandala logo SVG, gold wordmark, purple loading bar | Claude Code | VD-01 |
| 14.2 | Implement `HomeScreen.tsx` — full layout: gem badge, CONTINUE CTA, 4-mode grid, streak row | Claude Code | VD-02 |
| 14.3 | Connect CONTINUE button to last active level from settingsStore | Claude Code | Uses `packProgress` |
| 14.4 | Wire streak row: read `dailyStreak` from settingsStore, show 7-day dot row | Claude Code | — |
| 14.5 | Implement `ParticleCanvas.tsx` — reuse Numtap version, retheme to purple ambient glow | Claude Code | Background |
| 14.6 | Build + device test: verify Home screen layout matches VD-02 | Mahendra | Compare to VDD screenshot |

---

### Day 15 — Wednesday 2 July | Pack Select + Level Select

**Time estimate: 3–4 hours**  
**Owner:** Claude Code

| # | Task | Owner | Screen |
|---|---|---|---|
| 15.1 | Implement `PackSelectScreen.tsx` — 4 pack cards with progress, lock state, IAP placeholders | Claude Code | VD-03 |
| 15.2 | Wire pack unlock logic from `settingsStore.packProgress` | Claude Code | Pack 2 at 25 levels, Pack 3 at 50, Pack 4 at 50 Pack 2 |
| 15.3 | Implement pack progress bar in each pack card | Claude Code | Purple gradient fill |
| 15.4 | Implement `LevelSelectScreen.tsx` — 5×10 level grid (50 levels per pack) | Claude Code | VD-04 |
| 15.5 | Wire star ratings per level from `settingsStore` | Claude Code | Gold bg = 3-star, purple = 1-2 star, gold border = current |
| 15.6 | Implement pack unlock animation: shake → gold border sweep → lock dissolves | Claude Code | VD-03 |
| 15.7 | Build + device test both screens | Mahendra | — |

---

### Day 16 — Thursday 3 July | Daily + Leaderboard + Settings

**Time estimate: 3–4 hours**  
**Owner:** Claude Code

| # | Task | Owner | Screen |
|---|---|---|---|
| 16.1 | Implement `DailyScreen.tsx` — date header, streak fire, 7×7 puzzle, one-attempt gate | Claude Code | VD-07 |
| 16.2 | Wire mulberry32 PRNG daily seed (reuse from Numtap's `DailyChallenge.ts`, new namespace) | Claude Code | — |
| 16.3 | Implement `LeaderboardScreen.tsx` — 3 tabs (Daily/Timed/All-Time), Supabase data, UID column | Claude Code | VD-08 |
| 16.4 | Implement `SettingsScreen.tsx` — audio toggles, alias, country, UID lock icon, language pills | Claude Code | VD-09 |
| 16.5 | Wire alias + country save to Capacitor Preferences | Claude Code | Same pattern as Numtap |
| 16.6 | Implement `CountrySelector.tsx` — reuse from Numtap | Claude Code | — |

---

### Day 17 — Friday 4 July | Result Screen + HowToPlay + About + Language

**Time estimate: 3–4 hours**  
**Owner:** Claude Code

| # | Task | Owner | Screen |
|---|---|---|---|
| 17.1 | Complete `ResultScreen.tsx` — stars bounce animation, score breakdown, leaderboard rank snippet, NEXT LEVEL CTA | Claude Code | VD-06 |
| 17.2 | Add `GazeticaPromoCard.tsx` to ResultScreen bottom slot — shows Numtap cross-promo | Claude Code | Never mid-game, result screen only |
| 17.3 | Implement `HowToPlayScreen.tsx` — 4-step tutorial with mini 4×4 interactive grid | Claude Code | VD-12 |
| 17.4 | Implement `AboutScreen.tsx` — legal links, contact, More from Gazetica | Claude Code | VD-13 |
| 17.5 | Implement `LanguageScreen.tsx` — reuse Numtap version, update taglines per language | Claude Code | VD-14 |
| 17.6 | Implement first-launch flow: `LanguageScreen → HowToPlayScreen → HomeScreen` | Claude Code | Same as Numtap pattern |

---

### Day 18 — Saturday 5 July | App Icon + Full Navigation Test

**Time estimate: 4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 18.1 | Create app icon in Figma/Inkscape — mandala design per VDD Section 4 spec | Mahendra | Export 512×512 PNG |
| 18.2 | Generate all launcher icon sizes (192, 96, 48) and place in Android res folders | Mahendra | `android/app/src/main/res/mipmap-*` |
| 18.3 | Full navigation walkthrough on device: every screen reachable, back buttons work | Mahendra | Visit all 14 VDD screens |
| 18.4 | Verify BottomNav active states: Home/Packs/Leaderboard/Settings | Mahendra | Gold = active, muted = inactive |
| 18.5 | Verify purple theme throughout — no Numtap navy remaining | Mahendra | Check headers, cards, backgrounds |
| 18.6 | Git commit: `"Sprint 3 complete — all screens, visual polish, app icon"` | Mahendra | — |

**Sprint 3 complete when:** All 14 VDD screens implemented. App icon visible. Full navigation verified on device. Zero placeholder UI. Win animation plays correctly on completion. GameScene.ts locked.

---

### Sprint 3 Summary

| Area | Status |
|---|---|
| Phaser path lock-in + win cascade + hint + undo animations | ✅ |
| GameScene.ts LOCKED | ✅ |
| SplashScreen (VD-01) | ✅ |
| HomeScreen (VD-02) | ✅ |
| PackSelectScreen (VD-03) + unlock animation | ✅ |
| LevelSelectScreen (VD-04) | ✅ |
| DailyScreen (VD-07) | ✅ |
| LeaderboardScreen (VD-08) | ✅ |
| SettingsScreen (VD-09) | ✅ |
| ResultScreen (VD-06) + bounce stars | ✅ |
| HowToPlayScreen (VD-12) | ✅ |
| AboutScreen (VD-13) | ✅ |
| LanguageScreen (VD-14) | ✅ |
| GazeticaPromoCard (Numtap cross-promo) | ✅ |
| App icon (512×512 + all sizes) | ✅ |
| First-launch flow | ✅ |
| Full navigation test on device | ✅ |

---

## Sprint 4 — Monetisation + Daily Challenge + Analytics
**Dates:** Mon 7 Jul – Sat 12 Jul 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Claude Code (integration) + Mahendra (Play Console + license tester)  
**Sprint goal:** Fully monetised build. AdMob rewarded + interstitial live. IAP configured. GDPR consent. Firebase events. Internal testing track uploaded.

---

### Day 19 — Monday 7 July | Keystore + GDPR + Capacitor Preferences

**Time estimate: 3 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 19.1 | Generate new keystore for Flow Lines | Mahendra | `keytool -genkey -v -keystore gazetica-flowlines.jks -alias flowlines -keyalg RSA -keysize 2048 -validity 10000` |
| 19.2 | Save keystore offline backup immediately | Mahendra | **Do not store in repo** — gitignored |
| 19.3 | Create `keystore.properties` with keystore path, alias, passwords | Mahendra | Gitignored |
| 19.4 | Update `android/app/build.gradle` to use keystore for release signing | Mahendra | Same structure as Numtap |
| 19.5 | Implement `consentService.ts` — reuse Numtap GDPR UMP consent flow | Claude Code | Flow Lines AdMob App ID |
| 19.6 | Implement `GDPRConsentScreen.tsx` (VD-11) — Accept personalised / Use non-personalised | Claude Code | UMP SDK driven |
| 19.7 | Wire consent check on first launch — show before Home | Claude Code | EU/EEA detection via UMP |
| 19.8 | Implement full Capacitor Preferences persistence: pack progress, stars, daily streak, settings | Claude Code | All settings survive app restart |

---

### Day 20 — Tuesday 8 July | AdMob Rewarded + Interstitial

**Time estimate: 4 hours**  
**Owner:** Claude Code

> Use test ad unit IDs during development. Live IDs replace them in T-015 (final task before production build).

| # | Task | Owner | Notes |
|---|---|---|---|
| 20.1 | Implement `rewardedAdService.ts` — reuse Numtap pattern for Flow Lines | Claude Code | Hint ad: show rewarded → on complete → reveal hint cell |
| 20.2 | Wire hint button in `GameScreen.tsx` HUD → rewarded ad → `GameScene.revealHintCell()` | Claude Code | Max 3 hints per level |
| 20.3 | Add hint deduction to ScoreEngine (−30 pts per hint) | Claude Code | Already in spec |
| 20.4 | Implement `interstitialAdService.ts` — reuse Numtap pattern | Claude Code | Trigger: 5 level completions OR 3 minutes since last show |
| 20.5 | Wire interstitial to `ResultScreen.tsx` — shows after result, never during gameplay | Claude Code | Respect `removeAdsPurchased` flag |
| 20.6 | Implement `IAPScreen.tsx` (VD-10) — Remove Ads ($2.99) + Hint Pack ($0.99) | Claude Code | Gold BUY buttons |
| 20.7 | Build + device test: hint button → rewarded ad flow fires | Mahendra | Use test ad unit ID |

---

### Day 21 — Wednesday 9 July | IAP Billing + Gem Economy

**Time estimate: 4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 21.1 | Create IAP products in Play Console | Mahendra | `flowlines_remove_ads` (non-consumable, $2.99) + `flowlines_hint_pack` (consumable, $0.99) |
| 21.2 | Implement `billing.ts` — reuse Numtap BillingPlugin.java + billing.ts pattern | Claude Code | New product IDs |
| 21.3 | Implement `removeAdsPurchased` flag in settingsStore | Claude Code | Persisted in Preferences, suppresses interstitials only |
| 21.4 | Implement gem economy: `gemBalance` in settingsStore | Claude Code | Daily +3, streak +7, WATCH AD +3 (not for hint — separate), Hint Pack +5 |
| 21.5 | Display gem badge in HomeScreen + GameScreen top-right | Claude Code | Gold badge, Space Mono font |
| 21.6 | Set up license tester account in Play Console | Mahendra | Use personal Gmail address |
| 21.7 | Wire `billing.ts` to IAPScreen BUY buttons | Claude Code | Purchase flow |

---

### Day 22 — Thursday 10 July | Supabase Daily Challenge + Leaderboard Submission

**Time estimate: 3–4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 22.1 | Implement daily challenge seed: UTC date → mulberry32 → level index selector from pack2.json | Claude Code | Reused from Numtap, FL namespace |
| 22.2 | Implement `dailyScores.ts` — submit score to `flowlines_daily_scores` on daily completion | Claude Code | player_uid, alias, country, score, moves, date |
| 22.3 | Implement `campaignScores.ts` — submit score to `flowlines_scores` on level complete | Claude Code | pack_id, level_id, player_uid, alias, country, score |
| 22.4 | Verify Supabase RPCs return data sorted by score DESC | Mahendra | Test via Supabase SQL editor |
| 22.5 | Wire player_uid generation (format `NTxxxxxx`) — reuse from Numtap's UID system | Claude Code | Store in Preferences on first launch |
| 22.6 | Verify leaderboard shows UID between rank and flag on device | Mahendra | — |

---

### Day 23 — Friday 11 July | Firebase Analytics + Crashlytics

**Time estimate: 3 hours**  
**Owner:** Claude Code

| # | Task | Owner | Notes |
|---|---|---|---|
| 23.1 | Implement `analytics.ts` — Flow Lines custom events | Claude Code | 8 events from project report Section 13 |
| 23.2 | Wire `session_start` event on app open | Claude Code | — |
| 23.3 | Wire `level_start` event: `{level_id, pack_id, grid_size, colour_count}` | Claude Code | Fires when GameScene mounts |
| 23.4 | Wire `level_complete` event: `{level_id, pack_id, moves, stars, score}` | Claude Code | Fires in ResultScreen |
| 23.5 | Wire `level_abandon` event: `{level_id, coverage_pct}` | Claude Code | Fires on back button |
| 23.6 | Wire `hint_requested` event: `{level_id, hints_used_this_level}` | Claude Code | Fires before rewarded ad |
| 23.7 | Wire `ad_impression` event: `{ad_type}` | Claude Code | Fires on ad complete |
| 23.8 | Wire `iap_purchase` event: `{product_id, value}` | Claude Code | Fires in billing.ts |
| 23.9 | Wire `pack_unlocked` event: `{pack_id}` | Claude Code | Fires in packUnlockService |
| 23.10 | Implement `crashlytics.ts` — reuse Numtap setup | Claude Code | — |

---

### Day 24 — Saturday 12 July | First Internal AAB + Upload

**Time estimate: 4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 24.1 | **T-015 prerequisite check:** confirm `isTesting: true` is REMOVED from all ad service files | Mahendra | Check `admob.ts`, `rewardedAdService.ts`, `interstitialAdService.ts` |
| 24.2 | Confirm all test ad unit IDs still in place (live IDs go in only for production build) | Mahendra | Internal testing uses test IDs |
| 24.3 | `npm run build` → `npx cap sync android` | Mahendra | From project root |
| 24.4 | `.\gradlew clean` → `.\gradlew bundleRelease` | Mahendra | From `android\` directory in PowerShell |
| 24.5 | Upload AAB to Play Console Internal Testing track | Mahendra | versionCode 1, versionName "1.0-internal" |
| 24.6 | Invite 1 internal tester (personal device) | Mahendra | Use own secondary device or friend |
| 24.7 | Test IAP paid path: hint pack purchase via license tester | Mahendra | Verify purchase flow, gem credit |
| 24.8 | Test Remove Ads IAP: confirm interstitials suppressed, rewarded still shows | Mahendra | Verify `removeAdsPurchased` logic |
| 24.9 | Git commit: `"Sprint 4 complete — monetised build, versionCode 1 uploaded"` | Mahendra | — |

**Sprint 4 complete when:** Monetised AAB uploaded to Play Console Internal Testing. IAP products active. GDPR consent fires on first launch (EU simulation). Firebase events visible in DebugView. Crashlytics receiving sessions.

---

### Sprint 4 Summary

| Area | Status |
|---|---|
| Keystore generated + backed up | ✅ |
| GDPR UMP consent (VD-11) | ✅ |
| Capacitor Preferences persistence | ✅ |
| AdMob rewarded ad → hint flow | ✅ |
| AdMob interstitial → ResultScreen | ✅ |
| IAPScreen (VD-10) | ✅ |
| IAP products created in Play Console | ✅ |
| billing.ts (Remove Ads + Hint Pack) | ✅ |
| Gem economy | ✅ |
| Daily challenge seeding + Supabase submit | ✅ |
| Campaign leaderboard Supabase submit | ✅ |
| Player UID system | ✅ |
| Firebase Analytics (8 events) | ✅ |
| Firebase Crashlytics | ✅ |
| Internal testing AAB uploaded (versionCode 1) | ✅ |
| IAP paid path verified with license tester | ✅ |

---

## Sprint 5A — Pack 3 + Pack 4 + i18n
**Dates:** Mon 14 Jul – Sat 19 Jul 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Claude Code (i18n) + Mahendra (level generation QA)  
**Sprint goal:** 200 validated levels. 6 languages complete. All translation keys filled.

---

### Day 25 — Monday 14 July | Generate Pack 3 + Pack 4

**Time estimate: 4 hours + solver runtime**

| # | Task | Owner | Notes |
|---|---|---|---|
| 25.1 | Generate Pack 3 (8×8, 7 colours, 50 levels) | Mahendra | `npx ts-node scripts/generate-levels.ts --pack 3 --count 50 --out src/levels/pack3.json` |
| 25.2 | Generation runtime warning: 9×9 grids take 15–40 min total — start early in session | Mahendra | Let it run, monitor for errors |
| 25.3 | Generate Pack 4 (9×9, 8 colours, 50 levels) | Mahendra | Run after Pack 3 completes |
| 25.4 | Verify JSON output: 50 levels each, all fields present | Mahendra | Spot-check 5 level IDs per pack |
| 25.5 | Bundle pack3.json + pack4.json into app | Mahendra | Confirm `src/levels/` has all 4 files |
| 25.6 | Wire Cloudflare R2 CDN config for OTA level updates | Claude Code | `CDN_BASE_URL` env var, fallback to bundle |

---

### Day 26 — Tuesday 15 July | QA — Pack 3 + Pack 4 Level Verification

**Time estimate: 4–5 hours**  
**Owner:** Mahendra  
**This is the second mandatory QA gate — equivalent to Day 10 for Pack 1/2**

| # | Task | Owner | Notes |
|---|---|---|---|
| 26.1 | Play 10 random Pack 3 levels on SM-E146B | Mahendra | Pick: levels 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 |
| 26.2 | Confirm Pack 3 solvable + non-trivial + noticeably harder than Pack 2 | Mahendra | Typical solve time 3–8 min expected |
| 26.3 | Play 10 random Pack 4 levels | Mahendra | Pick: levels 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 |
| 26.4 | Confirm Pack 4 solvable + significantly challenging | Mahendra | Typical solve time 5–15 min expected |
| 26.5 | Regenerate any failed levels | Mahendra | `--replace-id p3_XXX` |
| 26.6 | Verify difficulty curve: Pack 1 < Pack 2 < Pack 3 < Pack 4 | Mahendra | Subjective assessment |

> **Pack 3/4 QA Gate:** Same rule as Sprint 2. If >2 unsolvable levels found in 20-level sample, stop and diagnose solver before proceeding.

---

### Day 27 — Wednesday 16 July | i18n — Translation Keys

**Time estimate: 4 hours**  
**Owner:** Claude Code (key extraction) + Mahendra (translation review)

| # | Task | Owner | Notes |
|---|---|---|---|
| 27.1 | Audit all hardcoded strings in Flow Lines components | Claude Code | Extract to i18n keys |
| 27.2 | Create `src/locales/en.json` with all ~180 Flow Lines-specific keys | Claude Code | Covers all screens VD-01→VD-14 |
| 27.3 | Key groups: pack names, coverage strings, move labels, hint system, win screen, tutorial, lock/unlock messages | Claude Code | Reference from project report Section 14 |
| 27.4 | Machine-translate to DE/FR/KO/PT/ES via DeepL API | Mahendra | Review critical strings |
| 27.5 | Create `de.json`, `fr.json`, `ko.json`, `pt.json`, `es.json` | Claude Code | — |
| 27.6 | Test language switch on device — verify all screens render in German | Mahendra | Check no string overflow |
| 27.7 | Test language switch in Korean — verify font renders | Mahendra | DM Sans handles Korean fallback |

---

### Day 28 — Thursday 17 July | Timed Mode + Zen Mode

**Time estimate: 3 hours**  
**Owner:** Claude Code

| # | Task | Owner | Notes |
|---|---|---|---|
| 28.1 | Implement `TimerComponent.tsx` — reuse Numtap's timer, show ONLY in Timed Mode | Claude Code | 3-minute countdown |
| 28.2 | Implement Timed Mode game loop: loads consecutive 6×6 Pack 1 levels, accumulates score, timer ends game | Claude Code | Separate game state from Classic mode |
| 28.3 | Implement Zen Mode toggle: no timer, no score, no interstitials, relaxed ad frequency | Claude Code | `isZenMode` flag in gameStore |
| 28.4 | Add Timed Mode leaderboard tab in `LeaderboardScreen.tsx` | Claude Code | Submits to `flowlines_scores` with mode='timed' |
| 28.5 | Verify both modes on device | Mahendra | — |

---

### Day 29 — Friday 18 July | Sound + Haptics

**Time estimate: 3 hours**  
**Owner:** Claude Code

| # | Task | Owner | Notes |
|---|---|---|---|
| 29.1 | Implement `soundService.ts` — reuse Numtap pattern, new FL-specific SFX events | Claude Code | path_draw, path_lock, board_fill_complete, hint_reveal |
| 29.2 | Wire path_draw SFX: soft whoosh on each cell entered | Claude Code | Fires on every cell in pointermove |
| 29.3 | Wire path_lock SFX: gentle click when colour pair connects | Claude Code | Fires on dot endpoint reached |
| 29.4 | Wire board_fill_complete SFX: celebratory cascade on win | Claude Code | Fires with win cascade animation |
| 29.5 | Implement `musicService.ts` — reuse Numtap, new ambient loop for FL (calm, less percussive) | Claude Code | CC0 music from Freesound |
| 29.6 | Add haptic feedback for path draw (light) + win (medium) | Claude Code | `@capacitor/haptics` — reused from Numtap |

---

### Day 30 — Saturday 19 July | Sprint 5A Review

**Time estimate: 2 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 30.1 | Full test suite: `npx vitest run` — all must pass | Mahendra | — |
| 30.2 | Verify 200 levels total in bundle (50 × 4 packs) | Mahendra | Check JSON file sizes |
| 30.3 | Spot-check Korean + German UI on device — no overflow | Mahendra | — |
| 30.4 | Spot-check Pack 3 Level 50 (hardest) — confirm it's genuinely challenging | Mahendra | — |
| 30.5 | Git commit: `"Sprint 5A complete — 200 levels, 6 languages, Timed + Zen modes"` | Mahendra | — |

---

## Sprint 5B — ASO + Screenshots + Final QA + Submission
**Dates:** Mon 21 Jul – Sat 26 Jul 2026  
**Daily commitment:** 3–4 hours  
**Primary owner:** Mahendra (ASO + submission) + Claude Code (Play Store copy)  
**Sprint goal:** Signed production AAB submitted to Google Play production track

---

### Day 31 — Monday 21 July | Play Store Listing Copy

**Time estimate: 3 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 31.1 | Write English Play Store title + short description + full description | Claude Code | Title: "Flow Lines - Colour Puzzle Game" · Short: "Connect matching colours to fill the board. 500+ levels. Daily challenge!" |
| 31.2 | Translate title + short desc to DE, FR, KO, PT, ES | Claude Code | Use localised title strategy from project report Section 14 |
| 31.3 | Write 5-keyword ASO-optimised description for each language | Claude Code | Primary keywords: colour connection puzzle, flow puzzle game, line drawing puzzle |
| 31.4 | Enter all 6 language listings in Play Console | Mahendra | Play Console → Store listing → Add languages |
| 31.5 | Set category: Games → Puzzle + Secondary: Games → Brain Games | Mahendra | — |
| 31.6 | Enter content rating answers (IARC questionnaire) | Mahendra | Target: PEGI 3 |

---

### Day 32 — Tuesday 22 July | Screenshots

**Time estimate: 4 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 32.1 | Take 6 gameplay screenshots on SM-E146B | Mahendra | See list below |
| 32.2 | Screenshot 1: HomeScreen with Pack 2 in progress | Mahendra | — |
| 32.3 | Screenshot 2: Active 6×6 game with 3 paths drawn | Mahendra | Pack 1 mid-solve |
| 32.4 | Screenshot 3: Active 8×8 expert level with 7 colours | Mahendra | Pack 3 partially solved |
| 32.5 | Screenshot 4: Level Complete screen with 3 stars + "Perfect Clear!" | Mahendra | Set up manually |
| 32.6 | Screenshot 5: Daily Challenge leaderboard post-completion | Mahendra | — |
| 32.7 | Screenshot 6: German locale home screen | Mahendra | Switch language to DE in settings |
| 32.8 | Upload screenshots to Play Console | Mahendra | — |
| 32.9 | Create Feature Graphic (1024×500): partially solved 7×7 grid, text overlay | Mahendra | Use Canva or Figma |
| 32.10 | Upload Feature Graphic | Mahendra | — |

---

### Day 33 — Wednesday 23 July | Full Pre-Submission QA

**Time estimate: 4–5 hours**  
**Owner:** Mahendra  
**This is the final QA pass — every mechanic, every screen, every edge case**

| # | Task | Test |
|---|---|---|
| 33.1 | Play Pack 1 Level 1 to Level 5 — solve all, verify stars awarded | ✅ |
| 33.2 | Play Pack 2 Level 1 — verify 6-colour grid renders correctly | ✅ |
| 33.3 | Play Pack 3 Level 1 — verify 7-colour grid with Teal | ✅ |
| 33.4 | Play Pack 4 Level 1 — verify 8-colour grid with Pink | ✅ |
| 33.5 | Complete a level — verify interstitial fires (test ad) | ✅ |
| 33.6 | Tap hint — verify rewarded ad fires, hint cell pulses post-ad | ✅ |
| 33.7 | Use Undo — verify path retracts correctly | ✅ |
| 33.8 | Verify pack unlock: complete 25 Pack 1 levels → Pack 2 unlocks with animation | ✅ |
| 33.9 | Open Daily Challenge — verify today's date + unique puzzle | ✅ |
| 33.10 | Complete daily challenge — verify score submits to Supabase | ✅ |
| 33.11 | Change language to Korean on device — verify all screens render | ✅ |
| 33.12 | Change language to German — verify no string overflow | ✅ |
| 33.13 | Timed Mode: play 3-minute session — verify timer + leaderboard submit | ✅ |
| 33.14 | Zen Mode: verify no timer, no interstitials | ✅ |
| 33.15 | Settings: edit alias, country, toggle audio/haptics, verify persist on app restart | ✅ |
| 33.16 | Verify GDPR consent fires on first launch (clear app data first) | ✅ |
| 33.17 | IAP screen: tap Remove Ads — verify billing flow initiates | ✅ |
| 33.18 | Kill app mid-game, reopen — verify progress is NOT lost (preferences) | ✅ |
| 33.19 | Force a win on a 9×9 level — verify win cascade + stars | ✅ |
| 33.20 | Spot-check 5 levels across all 4 packs — all solvable | ✅ |

---

### Day 34 — Thursday 24 July | T-015 — Switch to Live AdMob IDs

> **T-015 is always the final task before any production build.** Presence of live IDs alone is insufficient — `isTesting: true` must be explicitly removed.

| # | Task | Owner | Notes |
|---|---|---|---|
| 34.1 | Replace test AdMob App ID with live Flow Lines App ID in `admob.ts` | Mahendra | From AdMob Console |
| 34.2 | Replace test Rewarded ad unit ID with live unit ID | Mahendra | From AdMob Console |
| 34.3 | Replace test Interstitial ad unit ID with live unit ID | Mahendra | From AdMob Console |
| 34.4 | **Remove `isTesting: true`** from `admob.ts`, `rewardedAdService.ts`, `interstitialAdService.ts` | Mahendra | Critical — verify with `grep -r "isTesting" src/` returns no results |
| 34.5 | Verify test device `RZCW30XB11X` is still in AdMob test devices list | Mahendra | Prevents accidental invalid traffic |
| 34.6 | `admob.ts` → LOCKED after T-015 commit | Mahendra | Add `LOCKED — LIVE IDS` comment to file header |

---

### Day 35 — Friday 25 July | Production AAB Build

**Time estimate: 3 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 35.1 | Final version bump: `versionCode 2`, `versionName "1.0"` | Mahendra | versionCode 1 was internal testing |
| 35.2 | `npm run build` | Mahendra | Confirm zero build errors |
| 35.3 | `npx cap sync android` | Mahendra | From project root |
| 35.4 | `.\gradlew clean` | Mahendra | From `android\` directory |
| 35.5 | `.\gradlew bundleRelease` | Mahendra | Expect 14–47 seconds |
| 35.6 | Locate signed AAB: `android\app\build\outputs\bundle\release\app-release.aab` | Mahendra | — |
| 35.7 | Upload AAB to Play Console → Production track | Mahendra | vorakyretail1@gmail.com |
| 35.8 | Set rollout to 100% | Mahendra | Managed publishing: OFF (auto-publish on approval) |
| 35.9 | Select all 176 countries + Rest of World | Mahendra | Same as Numtap |
| 35.10 | Submit for review | Mahendra | Expected review time: 3–7 days |
| 35.11 | Git tag: `git tag v1.0-production && git push origin v1.0-production` | Mahendra | — |
| 35.12 | Git commit: `"Sprint 5B complete — production submission versionCode 2"` | Mahendra | — |

---

### Day 36 — Saturday 26 July | Post-Submission Setup

**Time estimate: 2 hours**

| # | Task | Owner | Notes |
|---|---|---|---|
| 36.1 | Update gazetica.com/games.html with Flow Lines Play Store placeholder link | Mahendra | Update once approved |
| 36.2 | Update Numtap `GazeticaPromoCard.tsx` to include live Flow Lines Play Store URL | Mahendra | Triggers Numtap versionCode increment + new AAB |
| 36.3 | Monitor Play Console "Changes in review" status | Mahendra | Check daily |
| 36.4 | Prepare hotfix checklist — criteria for immediate patch vs wait | Mahendra | Any unsolvable level report = immediate hotfix |
| 36.5 | Set up Crashlytics alert for crash rate > 1.5% | Mahendra | Firebase Console → Alerts |

---

### Sprint 5B Summary

| Area | Status |
|---|---|
| Play Store listing — all 6 languages | ✅ |
| 6 screenshots uploaded | ✅ |
| Feature graphic (1024×500) | ✅ |
| IARC questionnaire (PEGI 3) | ✅ |
| Full pre-submission QA (20-point checklist) | ✅ |
| T-015 — live AdMob IDs, isTesting removed | ✅ |
| Production AAB (versionCode 2) uploaded | ✅ |
| 176 countries selected | ✅ |
| Submitted for Google Play review | ✅ |

---

## Post-Launch Monitoring
**Timeline:** Week of 28 July 2026 onwards (during Google review + post-approval)

| Task | Frequency | Tool | Threshold |
|---|---|---|---|
| Check Play Console review status | Daily | Play Console | — |
| Monitor Crashlytics crash-free session rate | Daily first 2 weeks | Firebase Crashlytics | Alert if < 98.5% |
| Monitor AdMob eCPM by market | Daily first week | AdMob Dashboard | Flag if < $2 (check targeting) |
| Read all Play Store reviews | Daily first month | Play Console | Respond to all 1-star and 2-star |
| Check Supabase leaderboard for anomalies | Weekly | Supabase Dashboard | Flag duplicate player_uid entries |
| Check Firebase Analytics: D1 + D7 retention | After 7 days | Firebase | Alert if D1 < 30% |
| Check for unsolvable level reports | Continuous | Play Store reviews | Immediate hotfix if found |
| Link HDFC bank account in AdMob | After first earnings (~Month 1) | AdMob Console | Appears after first revenue |
| Enrol in 15% service fee | Month 1 post-launch | Play Console | Apply account group |
| Update gazetica.com/games with live link | On approval | Cloudflare | — |

---

## Locked Decisions Register (Sprint-Level)

| Decision | Value | Locked in |
|---|---|---|
| GameScene.ts | Locked after Day 13 commit | Sprint 3 Day 13 |
| `admob.ts` with live IDs | Locked after T-015 (Day 34) | Sprint 5B Day 34 |
| `removeAdsPurchased` scope | Interstitials only — rewarded always available | Sprint 4 (Day 20) |
| Interstitial placement | ResultScreen only — never during gameplay | Sprint 4 (Day 20) |
| Interstitial trigger | 5 levels OR 3 minutes | Sprint 4 (Day 20) |
| Gem economy | Uncapped accumulation | Sprint 4 (Day 21) |
| Level solver | Build time only — never runtime | Sprint 2 Day 7 |
| Sprint 2 QA gate | Must sign off before Sprint 3 starts | Sprint 2 Day 12 |
| Pack 3/4 QA gate | Must sign off before Sprint 5B starts | Sprint 5A Day 26 |
| versionCode rule | Increment per Play Console upload | Sprint 4 Day 24 |
| `.gitignore` | keystore, keystore.properties, .env, google-services.json | Sprint 4 Day 19 |
| GazeticaPromoCard slot | ResultScreen only — never third-party | Sprint 3 Day 17 |
| `isTesting: true` | Must be explicitly removed for production — live IDs alone insufficient | Sprint 5B Day 34 |
| Daily challenge | 1 puzzle per day, one attempt, globally seeded | Sprint 4 Day 22 |
| Player UID format | NTxxxxxx (8 chars) — cross-game shared identity | Sprint 4 Day 22 |

---

## Risk Register with Sprint-Level Mitigations

| Risk | Likelihood | Impact | Sprint where it bites | Mitigation |
|---|---|---|---|---|
| PathSolver produces unsolvable levels | Medium | Very High | Sprint 2 | QA gate Day 10 — 20 manual levels. Never ship without gate. |
| Solver too slow for 9×9 (Pack 4) | Low | High | Sprint 5A Day 25 | IDDFS + connectivity pruning. Budget 40 min generation time. |
| Drag input imprecise on small screens | Medium | High | Sprint 1 Day 5 | 28px min cell, snap-to-grid, generous hit areas. Test on SM-E146B. |
| BillDesk KYC not done before IAP | Low | High | Sprint 4 Day 21 | Resolve KYC before Sprint 4 starts. IAP revenue blocked otherwise. |
| Pack 3/4 level quality too uniform | Medium | Medium | Sprint 5A Day 25–26 | Generator quality constraints + Day 26 manual QA gate |
| `isTesting: true` left in production | Low | Very High | Sprint 5B Day 34 | T-015 checklist — `grep -r "isTesting"` must return empty |
| versionCode collision with failed upload | Low | Medium | Any sprint | Always `.\gradlew clean` before bundleRelease. Increment code even on failure. |
| Keystore lost before submission | Very Low | Very High | Sprint 4 Day 19 | Offline backup immediately on generation. Not in repo. |

---

## Full Task Count Summary

| Sprint | Days | Claude Code Tasks | Mahendra Tasks | Total |
|---|---|---|---|---|
| Pre-Sprint | 1 | 4 | 14 | 18 |
| Sprint 1 | 6 | 22 | 18 | 40 |
| Sprint 2 | 6 | 20 | 21 | 41 |
| Sprint 3 | 6 | 26 | 14 | 40 |
| Sprint 4 | 6 | 26 | 18 | 44 |
| Sprint 5A | 6 | 18 | 20 | 38 |
| Sprint 5B | 6 | 8 | 28 | 36 |
| **Total** | **37 days** | **124 tasks** | **133 tasks** | **257 tasks** |

---

## Version History

| Version | versionCode | Date | Note |
|---|---|---|---|
| 1.0-internal | 1 | ~12 Jul 2026 | Internal testing upload (Sprint 4 Day 24) |
| 1.0 | 2 | ~25 Jul 2026 | Production submission (Sprint 5B Day 35) |
| 1.1 (if needed) | 3+ | Aug 2026 | Hotfix if critical bugs found post-launch |

---

*Gazetica Studio | Voraky Retail LLP | Flow Lines Sprint Plan v1.0 | 11 June 2026*  
*Based on: FlowLines_Project_Report.md, Gazetica_Studio_Master_Document.docx, Sprint history from Numtap*  
*Game 2 of 5 | com.gazetica.flowlines | Target launch August 2026*
