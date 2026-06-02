# Level Configs Reference
**Numtap | Gazetica Studio | Last updated: Sprint 2 Day 1**

---

## Schema

```typescript
interface LevelConfig {
  id: number;                          // 1–100 at launch, unlimited future
  pack: 1 | 2 | 3;                    // Pack 1=Learn, 2=Rise, 3=Master
  grid: 3 | 4 | 5 | 6 | 7;           // NxN — independent of level number
  modifier: Modifier;                  // none | shuffle | fog | mirror | countdown
  direction: Direction;                // ascending (default) | descending (from level 75)
  timeLimit: number;                   // seconds — total time allowed
  stars: [number, number, number];     // [3★ secs, 2★ secs, 1★ secs]
}
```

---

## Pack Definitions

| Pack | Levels | Design Intent |
|---|---|---|
| Pack 1 — Learn | 1–25 | Grids 3×3–5×5. No hard modifiers. Generous time. Player learns the mechanic. |
| Pack 2 — Rise | 26–60 | Grids 3×3–6×6. Shuffle + mirror introduced. Tighter times. |
| Pack 3 — Master | 61–100 | All grids 3×3–7×7. Fog + countdown + combined modifiers. Descending from level 75. |
| Pack 4+ | 101+ | Future JSON-only. Any grid, any modifier combo. No code changes needed. |

---

## Critical Design Rules

1. **Grid size ≠ level range.** Level 87 can use a 3×3 grid. Level 12 can use a 5×5. Never tie them.

2. **Breathing room rule.** Every time a NEW grid size appears for the first time in a pack, the first 2 levels must be `modifier: 'none'` with generous time. Prevents frustration cliff.

3. **Difficulty ramp within each pack:**
   ```
   Easy clean → Medium clean → Easy+modifier → Medium+modifier → Hard+modifier
   ```

4. **Stars are cosmetic only.** `stars[2]` (1-star time) should be very generous — essentially just "did you finish at all." Never gate progression on 2 or 3 stars.

5. **Time limits reference guide:**

   | Grid | Generous | Normal | Tight | Brutal |
   |---|---|---|---|---|
   | 3×3 | 40s | 28s | 18s | 12s |
   | 4×4 | 70s | 50s | 35s | 22s |
   | 5×5 | 110s | 80s | 55s | 38s |
   | 6×6 | 160s | 120s | 85s | 60s |
   | 7×7 | 220s | 165s | 120s | 85s |

---

## Modifier Behaviour Reference

| Modifier | Trigger | Interval | Notes |
|---|---|---|---|
| `none` | — | — | Standard. Numbers static and visible. |
| `shuffle` | Auto | Every 8s | All untapped numbers move to random new positions. Tapped cells stay. |
| `fog` | Pointer move | Real-time | Numbers hidden. Reveal within 1-cell radius of pointer. |
| `mirror` | Render | Per frame | Numbers displayed as horizontal mirror image (e.g. 2 shows as ᘤ, 5 as ƨ). |
| `countdown` | Time | Per frame | Each number hides after being visible for 3s. Player must memorise. |

---

## Future Pack 4+ Rules

When adding levels 101–200:
- Any grid size (3–7) can be reused
- Modifier combos allowed: e.g. `shuffle` + `fog` simultaneously (implement as array in future)
- Deploy as web-layer update — no Play Store review needed
- Show "Pack 4 — Coming Soon" locked card at end of Pack 3 as retention hook
- Never remove this locked card — it signals ongoing content to players

---

## Change Log

| Date | Change |
|---|---|
| 02 Jun 2026 | Initial. 100-level system locked. Config schema defined. |
