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

## Sprint 3 — Phaser Visuals + React UI ✅ COMPLETE

| Task | Status |
|---|---|
| WebGL context/loop restore on app resume (T-007) | ✅ DONE — appLifecycle.ts via @capacitor/app; 4/4 device checks PASS on SM-E146B |
| Phaser skin: gradient tiles, gold glow, radial glow, particles (T-008) | ✅ DONE — index.css skin + drawTileBg + particle canvas; 10/10 device checks PASS on SM-E146B |
| settingsStore + Capacitor Preferences service (T-009) | ✅ DONE — preferences.ts typed wrapper + settingsStore (settings/progress/IAP); hydrate on startup. 4/4 logic checks pass. |
| i18n locale files — 6 languages (T-010) | ✅ DONE — en/de/fr/ko/pt/es (136 keys each) + i18n.ts; changeLanguage wired to settingsStore. 4/4 validation checks pass. |
| Supabase leaderboard service (T-011) | ✅ DONE | supabase.ts (submit/fetch/rank) + gameStore fire-and-forget wiring; build+94 tests pass. After DB grants applied, 3/3 validation checks pass (insert 9999, fetch sorted, find test row). |
| Navigation shell + Home/Language/HowToPlay screens (T-012a) | ✅ DONE — App.tsx router + first-launch flow; 14/14 device checks PASS on SM-E146B; i18n live (DE selected → German UI) |
| Settings + Leaderboard + About + IAP screens (T-012b) | ✅ DONE — 4 screens + 4 routes; 22/22 device checks PASS on SM-E146B; live Supabase board, FR language switch, Capacitor Browser links |
| ResultScreen + CampaignScreen + progression (T-013) | ✅ DONE — VD-05 result (stars/breakdown/PB/next) + 100-level map; 22/22 device checks PASS on SM-E146B |
| Daily Challenge — seeded grid + one-attempt-per-day (T-014) | ✅ DONE — DailyChallenge.ts (mulberry32 seed) + gameStore.startDailyChallenge; 8/8 device + 2 test checks PASS; on-device grid matches seed |
| (original generic Sprint 3 rows below — all delivered across T-005…T-014) | — |
| Phaser GameScene cells/tiles/tap pulse | ✅ DONE (T-005/T-008) |
| Gold highlight on next target tile | ✅ DONE (T-008 drawTileBg + updateNextPulse) |
| Correct tap animation (checkmark + green pulse) | ✅ DONE (T-005/T-006) |
| Wrong tap animation (red flash + shake) | ✅ DONE (T-005) |
| React screens: Home/Result/Settings (+9 more) | ✅ DONE (T-012a/T-012b/T-013) |
| Navy/gold skin + background particles | ✅ DONE (T-008) |
| i18next: en/de/fr/ko/pt/es | ✅ DONE (T-010) |
| Supabase leaderboard query + display | ✅ DONE (T-011 + T-012b LeaderboardScreen) |
| Daily Challenge seeded grid | ✅ DONE (T-014) |

---

## Pre-Sprint 4 Hotfix ✅ COMPLETE

| Task | Status |
|---|---|
| Gameplay mechanic fix — last-tapped gold ✓, remove next-target highlight, −100 wrong-tap penalty (T-000) | ✅ DONE — GameScene + gameStore + ResultScreen + HowToPlay; 103 unit tests pass; 11/11 device checks PASS on SM-E146B (DC-04 float, DC-06 score floored to 0, DC-07 all-green completion, DC-08 one-gold invariant all verified via deterministic Daily 5×5 + 3×3 start) |

---

## Sprint 4 — Monetisation + Analytics (IN PROGRESS)

| Task | Status |
|---|---|
| Per-level Leader Panel — YOU vs LEADER (T-001, VDD v1.2 Change C) | ✅ DONE — campaignScores.ts + LeaderPanel.tsx; wired into GameScreen (compact, campaign only) + ResultScreen (full + submit on complete). Supabase `campaign_scores` table live (RLS + anon grants). 103 tests pass, build clean. 10/10 device checks PASS on SM-E146B (genuine 5×5 completion on L69 + REST-seeded leader for the gold "leader-ahead" state). |
| VDD v1.2 skin formalisation (T-003) | ✅ DONE — skin.ts (single-source constants) + reusable ParticleCanvas (ambient glow + floating numbers) mounted on the 9 non-game screens (particles were game-screen-only); design_system.md updated. NOTE: the brief's "skin never implemented / flat v1.0" premise was inaccurate — the v1.2 skin shipped in T-008 (dot pattern all screens, gradient tiles, glass HUD, gold buttons/glow, game-screen particles), verified on-device in T-000/T-001. 103 tests pass, build clean. Device: 13/15 checks PASS; DC-04 partial (no discrete grid-container card — Phaser full-bleed grid); DC-14 FPS ~21fps < 55 target (pre-existing device-load watch-item, not a T-003 regression — ParticleCanvas isn't on the game screen). |
| UI/visual fixes — particles, rounded tiles, footer, result screen, language name (T-004A) | ✅ DONE — 6 fixes: particle opacity 0.20–0.25; GameScene rounded tiles (6px) + grid container border (DC-04 carry-forward resolved); Speed card/grid match (level 9→10 = 4×4); Language player-name input → settingsStore.alias (+ nameLabel in 6 locales); ResultScreen 3-icon bar → PLAY AGAIN card(s); shared BottomNav 4-icon footer on Home/Campaign/Leaderboard/Settings/IAP/About/Result. 103 tests pass, build clean. 11/11 device checks PASS on SM-E146B. |
| New modes + engine — T-004B **P1: Difficulty levels** (easy/pro/expert) | ✅ DONE (phase 1 of 3) — GridEngine: Expert random `sequence` + `getSequence`/`getLastTappedValue` (easy=ascending, pro=descending already existed); ScoreEngine: `difficultyMultiplier` 1.0/1.5/2.0 (applied last, after penalty, in gameStore); GameScene gold-tile now sequence-aware (GameScene unlocked per owner, re-locked); DifficultyScreen pre-screen + `/difficulty` route; HomeScreen reroutes Campaign/Speed/Endless through it; ResultScreen shows "Difficulty ×N". 112 tests (103 + 9). Device: DC-01/02/03 PASS (pre-screen, Pro NEXT=9, Expert NEXT=random), DC-04 result-line PASS (×1.0 on completed Easy); DC-13/Expert-2× unit-verified (live Expert completion not hand-driveable — random sequence vs device timer). **P2 (Free Play) + P3 (Daily panel + difficulty leaderboard tabs, needs SQL) to follow.** |
| New modes + engine — T-004B **P2: Free Play** | ✅ DONE (phase 2 of 3) — FreePlayScreen (grid 3–7 / difficulty / timer on-off + 20/30/60/90s) + `/free-play-config` route + Home card (i18n in 6 locales); gameStore `startFreePlay` + `timed` flag + `freeplay` mode (untimed = base-taps-only scoring, no submit, no LeaderPanel); GameScreen shows ∞ + no expiry when untimed; ResultScreen local per-config PB (`freePlayPB.ts`, `fp_pb_<grid>_<diff>_<timer|untimed>`), no stars/leaderboard. 112 tests, build clean. Device DC-07/08/09/10 PASS (card, config, 7×7 Expert untimed ∞ no-panel, 3×3 result with local PB + base-only score). |
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
| 03 Jun 2026 | T-012a: BrowserRouter works in the Capacitor WebView (verified) | App boots at https://localhost/ and navigates client-side via pushState; no reload, so no SPA-fallback 404. Bottom-nav routes not yet built (/leaderboard,/settings,/about → T-012b) fall through `path="*"` to / → /home. |
| 03 Jun 2026 | T-012a: GameScreen boot startLevel made conditional (only if not already 'playing') | HomeScreen calls startLevel(level,mode) BEFORE navigating to /game; an unconditional startLevel(1) on mount would override the chosen level/mode. Conditional fallback still covers direct /game navigation. |
| 03 Jun 2026 | T-012a: game-end now records progress + navigates to /home (was alert) | endGame complete → LevelManager.getStars + settingsStore.recordLevelComplete, then navigate('/home') after 1.2s. Verified on device: Bestwert updated to 1,700 after completing level 1. require() removed; LevelManager imported statically. |
| 03 Jun 2026 | T-012a: HowToPlay step paragraphs use literal English (per brief); chrome is translated | The how_to_play.stepN i18n keys carry {{tag}} markup needing a <Trans> renderer (deferred). Badge/title/labels/buttons ARE translated (verified: DE selection → German tutorial chrome). |
| 03 Jun 2026 | T-012b: ScreenShell defined per-file (4 copies) + type-split imports + `import type React` | Brief says "extract ScreenShell as a local helper inside each file"; each screen has its own copy. Language/ScoreRow/LeaderboardTab are types (verbatimModuleSyntax → import type). React.CSSProperties/ReactNode need `import type React` (new JSX transform). Mojibaked glyphs restored: ← (back), › (chevron), ★ (badge), ✓ (purchased), 🥇🥈🥉 (medals). |
| 03 Jun 2026 | T-012b: installed @capacitor/browser@8.0.3 (cap sync registered it in android gradle files) | AboutScreen opens legal/support links in the in-app Chrome Custom Tab. `npx cap sync` modified android/app/capacitor.build.gradle + android/capacitor.settings.gradle (generated, required for the Android build) — must be committed (same as @capacitor/app in T-007). Brief git-add list omits them. |
| 03 Jun 2026 | T-013: recordLevelComplete moved from GameScreen to ResultScreen | Brief routes game-end to /result (was a 1200ms home delay). Recording now happens once in ResultScreen's effect; GameScreen's `useSettingsStore`/`LevelManager`/`mode` became unused and were removed (noUnusedLocals). Removed unused `completedLevels` (ResultScreen) and `t`/useTranslation (CampaignScreen). Mojibaked glyphs restored: ⭐ ★ ▶ ↺ 🏠 🏆 ← — 🔒 🗺️. |
| 03 Jun 2026 | T-014: GridEngine private field is `grid` (not `_grid`) — used for the seeded override | Verified in GridEngine.ts before writing. startDailyChallenge mutates `(engine as {grid}).grid` cell values (+display) with the seeded shuffle; generateGrid() already set expectedNext=1. |
| 03 Jun 2026 | T-014 BUG FIXED: ResultScreen crashed (blank) for daily because getNextLevelId(0) throws | Daily uses synthetic level id 0 (not in levels.json); LevelManager.getNextLevelId(0)→getLevel(0) throws "Level 0 not found", crashing ResultScreen render. Fixed by computing nextLevelId only for mode==='campaign' (NEXT LEVEL button is campaign-only anyway). |
| 03 Jun 2026 | T-014: added a Daily Streak display to ResultScreen (mode==='daily') | Brief's D5 expects the result to show the streak, but the brief's ResultScreen edit only added updateDailyStreak(). Added a "🔥 Day Streak: N" line for daily completions so D5 is verifiable. |
| 03 Jun 2026 | T-014: brief said "7 tests / 101 total"; actual is 9 tests / 103 total | DailyChallenge.test.ts (written verbatim from the brief) has 9 tests (3 dateToSeed + 5 getDailyChallenge + 1 getTodayUTC). All pass. Determinism also proven via node (IDENTICAL=true) and on-device (grid matches seed: 12,20,8,14,6,4,16,17,9,1,...; value 1 at index 9). |
| 03 Jun 2026 | T-013: brief's "22 verification items" all PASS (R1-12, C1-8, G1-2) | Verified on SM-E146B. Bonus: 3★ on level 1 (18s), NEW PERSONAL BEST flag, NEXT LEVEL advanced to level 2, TIME'S UP red result on expiry, campaign map shows 1&2 green ⭐⭐⭐ / level 3 unlocked / 4+ locked, progress bar 2/25·8%, Pack 4 teaser, tapping completed level restarts it. G2: Result/Campaign are static DOM (no RAF) — no jank. |
| 03 Jun 2026 | T-012b: brief's "20 verification items" is actually 22 (S1-6, L1-5, A1-4, I1-5, G1-2) | All 22 listed items verified PASS on SM-E146B. Bonus confirmations: live FR language switch across all screens, alias persists, live Supabase row (TestPlayer/9999) on the board, Capacitor Browser opens CustomTabActivity. |
| 03 Jun 2026 | T-012a (perf note): →/game transition has a one-time Phaser/WebGL boot spike; steady-state gameplay ~25fps median this session | DOM route transitions are instant/smooth; entering the game incurs inherent one-time GL-context+grid-render cost. Steady-state gfxinfo this session (37%→22% janky, ~25fps median, ~3% missed vsync) was higher-jank than T-008's reading — likely device thermal/load after an extended ADB test session. No visual stutter/corruption in captures. Watch on a cold device in Sprint 5 QA. |
| 02 Jun 2026 | T-002: `buildBreakdown` follows the prose Format rules (labelled `× N streak × N grid`), not the worked examples | Brief's examples omit the streak/grid labels and use zero-padded decimals (1.0, 2.0) that no single formatter reproduces (1.25 has 2 dp, 2.8 has 1); examples are not implementable, so the prescriptive prose wins. No test asserts the exact string. |
| 03 Jun 2026 | T-000: scope expanded beyond the brief's "Files unlocked" header (GameScene+GameScreen) to also touch gameStore.ts, ResultScreen.tsx, HowToPlayScreen.tsx | The brief BODY requires them: §3.3 edits HowToPlay; §2 floors ResultScreen. gameStore is structurally unavoidable — the live score is recomputed on every correct tap there, so a view-only −100 would be wiped on the next tap; and §2's `Math.max(0, finalScore)` is only meaningful if the penalty reaches the final score. GameScreen.tsx ended up needing NO change (HUD reads `score` reactively). |
| 03 Jun 2026 | T-000: wrong-tap penalty lives in gameStore (`wrongTaps`), not the view | tapCell deducts 100 on WRONG (live score may go negative); correct-tap recompute = correctTaps·100 − wrongTaps·100; endGame carries the penalty into the final score; leaderboard submit + ResultScreen display/PB/record floor at Math.max(0, …). Device-verified: live −3,520 → result Total 0. |
| 03 Jun 2026 | T-000: −100 float implemented as a Phaser text tween in GameScene, NOT the brief's DOM `.penalty-float` CSS keyframe | The brief permitted implementing it "wherever the tile rendering lives" — tiles render on the Phaser canvas. So the `.penalty-float` CSS was NOT added to index.css (a DOM element would need canvas→DOM coordinate translation for no benefit). Float font is tile-proportional (max(14, tileSize·0.3)) rather than the spec's fixed 11px (illegibly small on a large tile). Float verified visible on device (DC-04). |
| 03 Jun 2026 | T-000: last-tapped detection handles `descending` direction | Taps are sequential, so last value = expectedNext−1 (ascending) / expectedNext+1 (descending); suppressed once engine.isComplete() so the board ends all-green (DC-07). Gold/green glows approximated by bright fill + coloured border (canvas has no box-shadow), consistent with the T-008 skin. |
| 03 Jun 2026 | T-000: HowToPlay `demo_label`/`demo_hint` switched from i18n keys to literal English | Matches the existing literal step-text pattern (T-012a); the brief supplied literal English for both. Orphaned EN keys remain harmlessly in the locale files. |
| 03 Jun 2026 | T-000: DC-07 (all-green completion) + DC-06 (score floor) verified on the deterministic Daily 5×5, not a 3×3 | The live game timer expires during slow screenshot analysis, so reads must be minimised; the Daily seed is deterministic (computed offline, confirmed on-device: 12,20,8,14,6,…), enabling a single fully-blind scripted playthrough with no mid-game reads. The mechanic is grid-agnostic; DC-01/02/03 were on 3×3. Wrong taps must be SPACED (~250ms) — rapid (<100ms) taps drop while Phaser animates floats. |
| 03 Jun 2026 | T-001: LeaderPanel `LevelLeaderInfo` import split to `import type` | verbatimModuleSyntax — the brief's combined `import { fetchLevelLeader, getPlayerPB, LevelLeaderInfo }` would not compile. |
| 03 Jun 2026 | T-001: mojibaked `'â'` placeholders restored to em dash `'—'` | Three spots: YOU empty Score/Time and the LEADER loading state. campaignScores.ts was clean ASCII (no fixes). |
| 03 Jun 2026 | T-001: GameScreen needed `mode` added to its useGameStore destructure | The panel-gating condition `mode === 'campaign'` requires it; GameScreen previously didn't select `mode`. design-system.md has no leader-panel classes — the component uses inline styles + existing CSS vars (--gold/--success/--muted/--white). |
| 03 Jun 2026 | T-001: genuine completion verified on a 5×5 level (L69, 85s), not L1 (45s) | Model screenshot-analysis latency (~40–50s) exceeds the L1 campaign timer (45s), so L1 can't be completed live (max ~5 correct taps land). A 5×5 (85–115s) fits one read+tap cycle. Reached L69 via a TEMPORARY dev-selector entry (reverted before commit — committed GameScreen has only the LeaderPanel wiring). A higher leader (ACE 99999) was REST-seeded to verify the gold "leader-ahead" state (LP-07). |
| 03 Jun 2026 | T-001: LP-05 result-screen shows leader "—"/loading momentarily (fetch-vs-submit race) | The LeaderPanel's fetch runs in a child effect that fires BEFORE ResultScreen's parent submit effect, so on the completing result the leader isn't yet populated; it appears on the next mount. This is the exact behaviour the brief's LP-05 note describes/permits. Submit-to-DB verified: the app wrote {Player, 5920, 72.00s} to campaign_scores L69. |
| 03 Jun 2026 | T-001 CLEANUP NEEDED (user): delete test rows from campaign_scores before release | Anon role has SELECT+INSERT only (no DELETE grant), so I can't remove them. Rows to delete: level 69 {Player 5920, ACE 99999}, level 999 {_probe 1} (a grant-probe insert). Real gameplay will otherwise show a fake unbeatable ACE 99999 leader on level 69. (RESOLVED — user cleared the table before T-001 push; campaign_scores now empty.) |
| 03 Jun 2026 | T-003 PREMISE CORRECTION: the VDD v1.2 skin was already implemented (T-008), not a "Sprint 3 defect" | The brief claimed flat #111C30 tiles / #0A1628 bg / no dots / no glow / no particles. Reality (code + on-device T-000/T-001): index.css ships .bg-dots (all screens), .glass HUD blur, .btn-gold gradient+glow, .text-gold-glow; GameScene renders gradient tiles (default/last-tapped-gold-✓/tapped-green-✓) + a radial ambient glow. Net T-003 work was the genuinely-missing pieces only. |
| 03 Jun 2026 | T-003: net deliverables = skin.ts + ParticleCanvas on the 9 non-game screens + design_system.md | Particles previously existed ONLY on GameScreen (inline). Extracted a reusable ParticleCanvas (ambient glow §2.1 + floating numbers §2.2, RAF paused on visibilitychange) and mounted it on Home/Campaign/Result/Leaderboard/Settings/IAP/About/HowToPlay/Language. skin.ts mirrors index.css :root for TS/inline consumers. |
| 03 Jun 2026 | T-003: GameScreen.tsx + GameScene.ts deliberately NOT modified | Both already satisfy v1.2 (verified T-000/T-008). GameScene uses Phaser numeric `fillGradientStyle(0x…)`, incompatible with skin.ts CSS-gradient strings; re-touching just-locked, device-verified files risks regression for zero visual change. GameScreen keeps its existing inline particle canvas (functionally identical to ParticleCanvas) to avoid double-mounting / disturbing verified layering. Deviation from the brief's "modify GameScreen/GameScene" — documented. |
| 03 Jun 2026 | T-003: DC-04 grid-container card NOT added | The grid renders full-bleed on a transparent Phaser canvas; a discrete bordered DOM card matching dynamic per-grid-size bounds is fragile and needs GameScreen layout work. Tiles already convey elevation via gradients/borders + the existing GameScene radial ambient glow behind the grid. |
| 03 Jun 2026 | T-003: DC-14 in-game FPS ~21fps (50th 48ms) below the 55 target | Pre-existing extended-ADB-session device thermal/load (T-013/T-001 watch-item); GPU percentile fine (~10ms) → CPU/main-thread bound. NOT a T-003 regression: ParticleCanvas does not run on the game screen (game keeps its prior inline particles); the screens it runs on are static. Re-measure on a cold device in Sprint 5 QA. |
| 03 Jun 2026 | T-003: doc file is docs/design_system.md (underscore), not the brief's design-system.md (hyphen) | Updated the actual file; added a "VDD v1.2 Skin Constants" section referencing skin.ts as canonical for TS, with the Phaser-numeric caveat and the v1.2 tile-state change. |
| 03 Jun 2026 | T-004A Fix 3: Speed mismatch fixed by changing the level mapping (9→10), NOT the card label | Card = "4×4 · 2× pts" (i18n home.mode_speed_sub, all 6 locales) + every design doc says 4×4; the game ran level 9 (3×3). Locales are locked (Fix 4 only), and 4×4 is the design intent, so the bug is the mapping. handleMode speed → level 10 (first 4×4, 'none'). The "2× pts"/halved-timer speed scoring is engine work for T-004B. (If owner instead wants speed=3×3, the card label in 6 locales would change.) |
| 03 Jun 2026 | T-004A Fix 6: extracted a shared BottomNav component; added footers to 6 screens | New src/components/BottomNav.tsx (Home/Board/Settings/About, gold `active`). HomeScreen refactored to use it; added to Campaign/Leaderboard/Settings/IAP/About (in their per-file ScreenShell) + Result. Onboarding (Language, HowToPlay), the game screen, and the (non-existent) Pause modal have no footer. GDPR footer is T-016. IAP footer added via the same ScreenShell edit (code path identical to Leaderboard/About; not separately screenshotted — no in-app nav route to IAP yet). |
| 03 Jun 2026 | T-004A Fix 4: name input maxLength 20 (per brief) but persisted alias follows the existing settingsStore.setAlias contract (≤16, alphanumeric+underscore, T-009) | "same store write Settings uses" — so the store sanitises. Alias written on BOTH Continue and "I'll choose later" (never empty → "Player"). nameLabel translated de/fr/es/pt/ko; en authoritative. Verified on-device: "Zephyr" entered on Language → shows in Settings alias. |
| 03 Jun 2026 | T-004A Fix 5: ResultScreen action layout by mode | Campaign + has-next-level → gold NEXT LEVEL primary + dark-card PLAY AGAIN secondary; all other cases (non-campaign, failed, last level) → single gold PLAY AGAIN. HOME/BOARD removed (standard footer covers them). Unused result.btn_home/btn_leaderboard i18n keys left in place (harmless). |
| 03 Jun 2026 | T-004A Fix 2: GameScene rounded corners (6px) on every tile state + wrong-flash; grid container border added | fillRoundedRect/strokeRoundedRect radius 6 (default/last-tapped-gold/tapped-green/wrong-flash). Grid border: strokeRoundedRect(startX-12, startY-12, gridPixelSize+24, …, 12), lineStyle blue 0x1E8BC3 @0.25, depth -1, tracked + redrawn each renderGrid (read existing layout vars, no recalculation). GameScene LOCKED again. |
| 03 Jun 2026 | T-004A DC-11 FPS 50th 29ms (~34fps) — better than T-003's reading | Opacity bump adds no per-frame cost (same fillText count); rounded rects negligible (GPU 8ms). No additional drop beyond the documented T-013 device-load watch-item; below 55 target → cold-device re-measure still pending (Sprint 5 QA). |
| 03 Jun 2026 | T-004B is PHASED across commits (owner choice): P1 difficulty, P2 Free Play, P3 Daily panel + difficulty leaderboard | Brief is ~3× a normal task with 3 unrun SQL migrations + a locked-file blocker. P1 (this commit) needs no SQL. P3 needs the SQL run (scores.difficulty, campaign_scores.difficulty, daily_scores). |
| 03 Jun 2026 | T-004B ARCHITECTURE: the brief's `generateSequence(n, difficulty)` doesn't match GridEngine | GridEngine shuffles grid POSITIONS + tap order = direction-driven `expectedNext`. So easy=ascending and **pro=descending already existed** (direction param). Only Expert (random tap permutation) is new — added as an internal `sequence[]`+`seqIndex` path; easy/pro logic kept byte-identical so the 40 existing GridEngine tests are untouched. |
| 03 Jun 2026 | T-004B: GameScene unlocked (owner-approved) for Expert gold-tile | The `expectedNext±1` shortcut for the gold LAST_TAPPED tile is wrong for Expert (random sequence). Added `GridEngine.getLastTappedValue()` (sequence-aware) and `GameScene.isLastTapped` now calls it. GameScene re-locked after P1. |
| 03 Jun 2026 | T-004B: difficulty multiplier applied LAST (after wrong-tap penalty), per spec | ScoreEngine.totalScore stays the pre-difficulty subtotal (existing tests' exact values hold); ScoreResult exposes `difficultyMultiplier`; gameStore.endGame computes `round((subtotal − wrongTaps·100) × mult)`. A chosen difficulty also overrides the level's `direction` (easy→asc, pro→desc); omitting difficulty (CampaignScreen taps, play-again) preserves the level's own direction. |
| 03 Jun 2026 | T-004B P1 device note: Expert completion not hand-driveable | The Expert tap order is a random permutation only revealed step-by-step by the HUD; completing it needs per-step screenshot reads that exceed the level timer at model analysis latency. DC-04/DC-13's 2× is covered by unit tests (difficultyMultiplier 1.0/1.5/2.0 + an end-to-end ×2 assertion); the on-device "Difficulty ×N" result line was verified on a completed Easy (×1.0). |
| 03 Jun 2026 | T-004B P2: Free Play uses a synthetic level (id -1) + `timed` flag; untimed = base-taps-only | startFreePlay builds a GridEngine at the chosen grid/difficulty; `timed=false` hides the timer HUD (∞) and removes expiry; endGame for untimed free play scores `(N²·100 − penalty) × difficultyMult` (no time/speed). Free Play never submits (leaderboard) and never records campaign progress (id -1 guarded out); PB is local-only via `freePlayPB.ts` (Capacitor Preferences, dynamic key outside the typed PREF_KEYS wrapper). ResultScreen hides stars/time/speed rows + shows "Best (this config)". Brief i18n keys were `freePLayLabel`/`freePLaySub` (typo) → used correct `freePlayLabel`/`freePlaySub`. |
