# Sprint Log
**Numtap | Gazetica Studio | Updated after every task**

---

## How to Use This File

Claude Code must update this file at the end of every task:
- Mark the task DONE
- Note what was tested and how
- Note any decisions made during implementation
- List what is next

---

## Sprint 1 — Scaffolding ✅ COMPLETE

| Task | Status | Notes |
|---|---|---|
| Vite + React + TS scaffold | ✅ DONE | |
| Phaser, Capacitor, plugins installed | ✅ DONE | |
| google-services.json placed | ✅ DONE | android/app/ |
| admob.ts with test IDs | ✅ DONE | src/services/admob.ts |
| AdMob manifest meta-data fix | ✅ DONE | Crash on launch resolved |
| Phaser 61fps verified on device | ✅ DONE | Samsung SM-E146B |
| GitHub repo pushed | ✅ DONE | github.com/gazetica/numtap |
| GitHub Actions CI green | ✅ DONE | Build #2 passed, 4m 22s |

---

## Sprint 2 — Core Game Logic ✅ COMPLETE

| Task | Status | Notes |
|---|---|---|
| Create docs/ folder and .md files | ✅ DONE | architecture.md, api-contracts.md, design-system.md, level-configs.md, sprint-log.md |
| CLAUDE.md project brief | ✅ DONE | Root of project |
| `src/game/GridEngine.ts` | ✅ DONE | T-001. Pure TS, zero Phaser. All 5 modifier hooks + asc/desc direction. |
| `src/game/GridEngine.test.ts` | ✅ DONE | T-001. 40 Vitest tests passing (8 groups, every method + modifier). |
| `src/game/ScoreEngine.ts` | ✅ DONE | T-002. Pure static calculator, no side effects. base/time/speed/streak/grid + getStars. |
| `src/game/ScoreEngine.test.ts` | ✅ DONE | T-002. 39 Vitest tests passing (7 groups, all formula branches + 3 integration cases). |
| `src/game/LevelManager.ts` | ✅ DONE | T-003. Loader/query: getLevel, getPack, getStars, isPackUnlocked, getNextLevelId, isPackStart. |
| `src/game/levels.json` | ✅ DONE | T-003. 100 levels, packs 25/35/40. All 6 integrity checks pass. |
| `src/components/TimerComponent.tsx` | ✅ DONE | T-004. React countdown, onTick/onExpire, danger red+pulse <=10s, pause/resume, reset on duration change. 15 RTL tests. |
| Game loop wire-up (GameScene.ts) | ✅ DONE | T-005. gameStore + GameScene + GameScreen + main.tsx. Build+cap sync OK, 94 tests pass. All 14 device checks PASS on Samsung SM-E146B (driven via ADB taps + screenshots). Fixed timer-reset-on-restart bug (runId key). |
| Modifier: shuffle | ✅ DONE | T-006. 8s reshuffle flash; tapped tiles stay; all numbers preserved. S1-S5 PASS on SM-E146B. |
| Modifier: fog | ✅ DONE | T-006. Global pointer listener reveals 1-cell radius over hidden tiles; reveals persist. F1-F5 PASS. |
| Modifier: mirror | ✅ DONE | T-006. Phaser label setScale(-1,1) horizontal flip; tapping underlying value registers. M1-M3 PASS. |
| Modifier: countdown | ✅ DONE | T-006. View-layer countdown in GameScene (engine reveal path unusable); numbers show then hide after 3s; tapped persist. C1-C5 PASS. |
| DEV level selector | ✅ DONE | T-006. GameScreen, gated `import.meta.env.DEV \|\| VITE_DEV_TOOLS==='true'`; hidden in production build. |

---

## Sprint 3 — Phaser Visuals + React UI (IN PROGRESS)

| Task | Status |
|---|---|
| WebGL context/loop restore on app resume (T-007) | ✅ DONE — appLifecycle.ts via @capacitor/app; 4/4 device checks PASS on SM-E146B |
| Phaser skin: gradient tiles, gold glow, radial glow, particles (T-008) | ✅ DONE — index.css skin + drawTileBg + particle canvas; 10/10 device checks PASS on SM-E146B |
| settingsStore + Capacitor Preferences service (T-009) | ✅ DONE — preferences.ts typed wrapper + settingsStore (settings/progress/IAP); hydrate on startup. 4/4 logic checks pass. |
| i18n locale files — 6 languages (T-010) | ✅ DONE — en/de/fr/ko/pt/es (136 keys each) + i18n.ts; changeLanguage wired to settingsStore. 4/4 validation checks pass. |
| Supabase leaderboard service (T-011) | ✅ DONE | supabase.ts (submit/fetch/rank) + gameStore fire-and-forget wiring; build+94 tests pass. After DB grants applied, 3/3 validation checks pass (insert 9999, fetch sorted, find test row). |
| Phaser GameScene: NxN grid cells, number tiles, tap pulse animation | ⬜ PENDING |
| Gold highlight on next target tile | ⬜ PENDING |
| Correct tap animation (checkmark + green pulse) | ⬜ PENDING |
| Wrong tap animation (red flash + shake) | ⬜ PENDING |
| React screens: HomeScreen, ResultScreen, SettingsScreen | ⬜ PENDING |
| Navy/gold skin applied with background particles | ⬜ PENDING |
| i18next: en.json, de.json, fr.json, ko.json, pt.json, es.json | ⬜ PENDING |
| Supabase leaderboard query + display | ⬜ PENDING |
| Daily Challenge seeded grid | ⬜ PENDING |

---

## Sprint 4 — Monetisation + Analytics (UPCOMING)

| Task | Status |
|---|---|
| Switch test AdMob IDs to live IDs | ⬜ PENDING |
| GDPR UMP consent screen | ⬜ PENDING |
| Rewarded ad: hint button | ⬜ PENDING |
| Interstitial: result screen | ⬜ PENDING |
| Remove Ads IAP (Google Play billing) | ⬜ PENDING |
| Hint Pack IAP | ⬜ PENDING |
| Firebase Analytics events | ⬜ PENDING |
| Crashlytics test crash | ⬜ PENDING |

---

## Sprint 5 — Polish + Submission (UPCOMING)

| Task | Status |
|---|---|
| 30+ game sessions QA | ⬜ PENDING |
| Test on 2nd Android device | ⬜ PENDING |
| Native-speaker review of i18n locales (esp. KO, DE) — machine-generated in T-010 | ⬜ PENDING |
| Signed release AAB + keystore backup | ⬜ PENDING |
| Play Store screenshots (6 per language) | ⬜ PENDING |
| Privacy Policy live at gazetica.com/privacy | ⬜ PENDING |
| Terms & Conditions live at gazetica.com/terms | ⬜ PENDING |
| Play Store submission | ⬜ PENDING |

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 02 Jun 2026 | Grid size is a property of level config, not a chapter boundary | Enables Pack 4+ reuse of any grid size without code changes |
| 02 Jun 2026 | 100 levels at launch (not 25) | Research: 25 rounds = content exhaustion in <15 min, D7 retention impossible |
| 02 Jun 2026 | 5 modifiers: none, shuffle, fog, mirror, countdown | Provides difficulty variety without new game mechanics |
| 02 Jun 2026 | Stars are cosmetic only — 1 star always unlocks next level | Prevents casual player frustration and churn |
| 02 Jun 2026 | No sign-in/auth anywhere | Scope control. Anonymous leaderboard sufficient for launch. |
| 02 Jun 2026 | IAP max 2 products — Remove Ads + Hint Pack | Simplicity. No subscriptions. No pay-to-win. |
| 02 Jun 2026 | Use test AdMob IDs until Sprint 4 | Live IDs during dev = invalid traffic risk and account suspension |
| 02 Jun 2026 | T-001: Cell includes `display` field per api_contracts.md (brief's Cell omitted it) | api-contracts is the authoritative inter-module contract; field kept in sync with value via getDisplayValue logic. Non-breaking for tests. |
| 02 Jun 2026 | T-001: `onCountdownTick` param renamed `_elapsedMs` | Contract names it `elapsedMs` but brief logic uses Date.now()-revealedAt; `_` prefix satisfies strict noUnusedParameters without changing the public signature shape. |
| 02 Jun 2026 | T-001: Added `vitest` devDependency + `"test": "vitest"` script | Vitest was not installed; required to run GridEngine.test.ts per brief. |
| 02 Jun 2026 | T-003: Star thresholds computed with round-half-to-even (banker's rounding) | Only rule that reproduces the brief's worked examples (85→[42,64,85], 45→[22,34,45]); plain Math.round (half-up) gives 43/23, contradicting the spec. |
| 02 Jun 2026 | T-003: `levelsData.levels` cast via `as unknown as LevelConfig[]` | resolveJsonModule widens JSON literals (modifier:string, grid:number); the direct `as LevelConfig[]` in the brief does not type-check. Dataset is validated by the 6 integrity checks. |
| 02 Jun 2026 | T-003: Added `resolveJsonModule: true` to tsconfig.app.json | Required for the typed `import levelsData from './levels.json'`; the only permitted tsconfig change for this task. |
| 02 Jun 2026 | T-004: Installed `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` | First React component test; RTL + jsdom env required. vite.config.ts gained jsdom/globals/setupFiles + `/// <reference types="vitest/config" />` so the `test` block type-checks. |
| 02 Jun 2026 | T-004: Tests advance fake timers one second at a time (each in its own act()) | Advancing N seconds in one call fires all interval callbacks before React flushes the updater's clearInterval-at-zero, a fake-timer batching artifact; per-second flushing mirrors real 1s-interval runtime behaviour. Component code unchanged from brief skeleton. |
| 02 Jun 2026 | T-005: Split value/type imports in gameStore + added `import type { Cell }` in GameScene | `verbatimModuleSyntax` requires type-only imports via `import type`; the brief's combined imports would not compile. |
| 02 Jun 2026 | T-005: Render shows numbers when `isVisible(cell)` (tapped OR non-hiding modifier OR revealed), not raw `cell.revealed` | GridEngine starts cells revealed=false and only reveals for fog/countdown/tap. The brief's `cell.revealed`-gated label/gold logic would render a 'none' level (level 1) as blank tiles with no gold target — failing device checks V6/V7/V8. GridEngine.ts is locked, so fixed in the render layer. |
| 02 Jun 2026 | T-005: Removed dead `require('../game/LevelManager')` stars block in GameScreen | `require` is undefined in the ESM/Vite browser runtime (throws ReferenceError); the computed `stars` was never used. Dropped unused store selectors (grid, pauseGame, resumeGame) for noUnusedLocals. |
| 02 Jun 2026 | T-005: GameScene `update(time,delta)` -> `update(_time,delta)` | `time` unused; noUnusedParameters. |
| 02 Jun 2026 | T-005: Added `runId` to gameStore; GameScreen keys TimerComponent on it | DEVICE BUG found in verification: restarting a level with the same timeLimit (45->45) left TimerComponent's `remaining` stuck at 0 (its reset effect keyed on durationSeconds didn't re-fire), so every restart instantly re-fired onExpire -> grid unplayable after game 1. TimerComponent.tsx is locked (T-004), so fix is a remount-on-restart key from this task's own files. Verified fixed on device. |
| 02 Jun 2026 | T-006: Selector gated on `import.meta.env.DEV \|\| VITE_DEV_TOOLS==='true'` (not bare DEV) | `import.meta.env.DEV` is always false for ANY `vite build` (incl. Capacitor APKs), and a `--mode development` build can't be used because React StrictMode double-invokes effects in dev and breaks Phaser boot (black screen). Test APK is built in PRODUCTION mode with VITE_DEV_TOOLS=true; `npm run build` leaves it unset so the shipped app hides the selector. |
| 02 Jun 2026 | T-006: COUNTDOWN implemented in the VIEW LAYER (GameScene), not the engine | DEVICE FAIL found: countdown levels rendered all-blank. Root cause — GridEngine never reveals countdown cells (onCountdownTick only hides already-revealed cells; the reveal path is fog-only; getGrid() returns a copy so engine state can't be reveal-mutated externally) and GridEngine is locked. Brief Change 5 anticipated fixing isVisible() in GameScene. Fix: show all numbers at level start, hide each cell 3s after first shown, keyed off scene clock; reset per level via store `runId` (NOT grid identity — tapCell makes a new grid array each correct tap, which would wrongly re-reveal). C1-C5 PASS on device. |
| 02 Jun 2026 | T-006 (env note): screen lock loses Phaser WebGL context -> blank canvas | During ADB verification, screen lock/unlock blanked the Phaser canvas (GL context loss not restored). Mitigated for testing with `svc power stayon true` + fresh app restart. Not an app bug for normal use, but flagged for Sprint 3 (consider Phaser WEBGL context-restore handling). RESOLVED in T-007. |
| 03 Jun 2026 | T-007: Resume fix is `game.loop.wake()` on Capacitor appStateChange, not Phaser 3's `restoreContext()` | Brief targets Phaser 3.60+; project is Phaser 4 which has no `restoreContext` (uses context handlers + `contextLost`). Real cause of the black canvas is the suspended render LOOP on background, so `game.loop.wake()` is the primary fix; the P3 `restoreContext` call is kept behind a typeof guard (no-op on P4) and scenes still emit `resume` per brief. `import Phaser` is a value import (not `import type`) because `Phaser.WEBGL` is a runtime constant. |
| 03 Jun 2026 | T-007: Installed `@capacitor/app@^8` (brief said 6.x) | Project runs Capacitor 8 (core 8.3.4), so the App plugin must match the major. `npx cap sync` auto-registered it in android/capacitor.build.gradle + android/capacitor.settings.gradle (generated files, required for the Android/CI build). |
| 03 Jun 2026 | T-007 (device note): SM-E146B lock/unlock unobservable via ADB until screen lock set to None | Samsung swipe-to-unlock keyguard + AOD kept ADB captures stuck on the lock screen. With screen-lock type None, wake returns straight to the app. Verified canvas recovers (mean 42.2 == baseline), taps register (gold moved), consistent across 3 cycles. |
| 03 Jun 2026 | T-008: Phaser canvas set `transparent: true` (+ phaser-container z-index 1) | Brief kept Phaser opaque (backgroundColor navy), which would cover the DOM dot-pattern + particle canvas (z-index 0) and fail device checks V1/V2. Transparent canvas lets the navy/dots/particles show behind the grid; navy base comes from index.css html/body. |
| 03 Jun 2026 | T-008: `@import` for Google Fonts hoisted to top of index.css | CSS spec requires @import before all other rules; the brief listed it mid-file where browsers ignore it. Fonts degrade to monospace/sans-serif if offline. |
| 03 Jun 2026 | T-008: tile bg is Graphics (drawTileBg); input via a transparent interactive Rectangle | Graphics has no intrinsic input geometry, so a sized transparent rect is the tap target (reliable). Removed now-unused getTileColour/getTileBorderColour (replaced by drawTileBg) to satisfy noUnusedLocals. |
| 03 Jun 2026 | T-008: next-target pulse managed by updateNextPulse() (renderGrid + refreshTileLabels), not only renderGrid | The brief adds the pulse tween only in renderGrid, but the target changes on each correct tap (which calls refreshTileLabels, not renderGrid). updateNextPulse stops the old tween and starts a fresh one on the new target so the pulse follows the gold tile. Verified on device (gold tile area varies frame-to-frame). |
| 03 Jun 2026 | T-009: alias sanitisation yields 'badchars' for 'bad chars! @#$', not 'bad_chars' | The spec'd regex `replace(/[^a-zA-Z0-9_]/g, '')` STRIPS disallowed chars (incl. spaces); it does not convert spaces to underscores. The brief's check-2 comment ('bad_chars') was inaccurate — implementation copied verbatim is correct, validated as 'badchars'. |
| 03 Jun 2026 | T-009: console checks run via a temporary mocked-Preferences vitest harness, then deleted | The brief's validation is interactive browser-console steps; the headless env can't drive a browser console. The 4 checks are pure store logic, so they were run against the REAL settingsStore with @capacitor/preferences mocked in-memory (all 4 pass), plus an `npm run dev` smoke test (HTTP 200). No test file committed; the `window.__ZUSTAND_SETTINGS__` debug line was never added. |
| 03 Jun 2026 | T-010: corrected mojibaked symbols from the brief to real Unicode | The brief doc was UTF-8-mojibaked (Ã—, Â·, â). Restored intended glyphs: × (multiply), · (middot), ✓ (check, e.g. "Purchased ✓"), — (em dash, "Consumable — 5 uses"), © (copyright), ★ (star, "Rate Numtap ★"). Same glyphs carried verbatim across all 6 locales. |
| 03 Jun 2026 | T-010: validation run via a Node key/placeholder diff script (deleted after) | 136 keys per file confirmed structurally identical; all {{...}} placeholders match en; app.name=="Numtap" in all 6; 5 spot strings differ from en (translated) per language. modifiers.none is intentionally "" in every locale (matches en). |
| 03 Jun 2026 | T-011 SECURITY: added .env / .env.local / .env.*.local to .gitignore | .env existed UNTRACKED with the Supabase anon key but was NOT gitignored — one `git add .` from leaking. Fixed before any code per the brief's STOP gate. `git check-ignore .env` confirms. (.gitignore change is staged-ready; awaiting commit approval.) |
| 03 Jun 2026 | T-011 BLOCKER: anon role lacks table privileges on public.scores (Postgres 42501, 401) | Connection + anon key VALID, table exists, but SELECT/INSERT return "permission denied for table scores". The manually-created table has RLS policies missing AND/OR no GRANTs to anon. Remediation (run in Supabase SQL editor): `GRANT SELECT, INSERT ON public.scores TO anon;` `GRANT USAGE, SELECT ON SEQUENCE public.scores_id_seq TO anon;` + the brief's RLS policies (ENABLE RLS; CREATE POLICY public read USING(true); CREATE POLICY public insert WITH CHECK(true)). Code verified correct (reaches server, valid requests); re-run browser validation after grants applied. RESOLVED — grants applied, 3/3 checks pass. |
| 02 Jun 2026 | T-002: `buildBreakdown` follows the prose Format rules (labelled `× N streak × N grid`), not the worked examples | Brief's examples omit the streak/grid labels and use zero-padded decimals (1.0, 2.0) that no single formatter reproduces (1.25 has 2 dp, 2.8 has 1); examples are not implementable, so the prescriptive prose wins. No test asserts the exact string. |
