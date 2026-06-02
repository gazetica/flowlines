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

## Sprint 2 — Core Game Logic 🔄 IN PROGRESS

| Task | Status | Notes |
|---|---|---|
| Create docs/ folder and .md files | ✅ DONE | architecture.md, api-contracts.md, design-system.md, level-configs.md, sprint-log.md |
| CLAUDE.md project brief | ✅ DONE | Root of project |
| `src/game/GridEngine.ts` | ✅ DONE | T-001. Pure TS, zero Phaser. All 5 modifier hooks + asc/desc direction. |
| `src/game/GridEngine.test.ts` | ✅ DONE | T-001. 40 Vitest tests passing (8 groups, every method + modifier). |
| `src/game/ScoreEngine.ts` | ✅ DONE | T-002. Pure static calculator, no side effects. base/time/speed/streak/grid + getStars. |
| `src/game/ScoreEngine.test.ts` | ✅ DONE | T-002. 39 Vitest tests passing (7 groups, all formula branches + 3 integration cases). |
| `src/game/LevelManager.ts` | ⬜ PENDING | |
| `src/game/levels.json` | ⬜ PENDING | All 100 level configs |
| `src/components/TimerComponent.tsx` | ⬜ PENDING | |
| Game loop wire-up (GameScene.ts) | ⬜ PENDING | |
| Modifier: shuffle | ⬜ PENDING | |
| Modifier: fog | ⬜ PENDING | |
| Modifier: mirror | ⬜ PENDING | |
| Modifier: countdown | ⬜ PENDING | |

---

## Sprint 3 — Phaser Visuals + React UI (UPCOMING)

| Task | Status |
|---|---|
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
| 02 Jun 2026 | T-002: `buildBreakdown` follows the prose Format rules (labelled `× N streak × N grid`), not the worked examples | Brief's examples omit the streak/grid labels and use zero-padded decimals (1.0, 2.0) that no single formatter reproduces (1.25 has 2 dp, 2.8 has 1); examples are not implementable, so the prescriptive prose wins. No test asserts the exact string. |
