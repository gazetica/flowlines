// PackSelectScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 15 | Task FL-S3-015 (VD-03)
//
// Pack grid with locked/active/complete states, unlock rules, progress bars,
// IAP placeholder cards, and a newly-unlocked card animation.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getPackSize } from '../game/engine/LevelManager';
import { trackPackUnlocked } from '../services/analytics';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';

type PackMeta = { id: number; grid: number; colours: number };
const PACKS: PackMeta[] = [
  { id: 1, grid: 6, colours: 5 },
  { id: 2, grid: 7, colours: 6 },
  { id: 3, grid: 8, colours: 7 },
  { id: 4, grid: 9, colours: 8 },
];

type ProgressMap = Record<number, { solved: number; stars: Record<string, number> }>;

/** Unlock rules (Project Report): P1 always; P2 ≥25 P1; P3 P1===50; P4 P2===50. */
function isUnlocked(packId: number, progress: ProgressMap): boolean {
  const solved = (p: number) => progress[p]?.solved ?? 0;
  switch (packId) {
    case 1: return true;
    case 2: return solved(1) >= 25;
    case 3: return solved(1) === 50;
    case 4: return solved(2) === 50;
    default: return false;
  }
}

export default function PackSelectScreen() {
  const navigate = useNavigate();
  const packProgress = useFlowSettingsStore((s) => s.packProgress) as ProgressMap;

  const [shakeId, setShakeId] = useState<number | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<number | null>(null);

  // Detect a pack that became unlocked during this session (skip first mount).
  const prevUnlocked = useRef<Record<number, boolean> | null>(null);
  useEffect(() => {
    const current: Record<number, boolean> = {};
    for (const p of PACKS) current[p.id] = isUnlocked(p.id, packProgress);
    if (prevUnlocked.current) {
      const justUnlocked = PACKS.find((p) => current[p.id] && !prevUnlocked.current![p.id]);
      if (justUnlocked) {
        setNewlyUnlocked(justUnlocked.id);
        trackPackUnlocked({ pack_id: justUnlocked.id });
        const t = setTimeout(() => setNewlyUnlocked(null), 800);
        prevUnlocked.current = current;
        return () => clearTimeout(t);
      }
    }
    prevUnlocked.current = current;
  }, [packProgress]);

  const cards = useMemo(() => PACKS.map((p) => {
    const size = getPackSize(p.id);
    const solved = packProgress[p.id]?.solved ?? 0;
    const unlocked = isUnlocked(p.id, packProgress);
    const complete = size > 0 && solved >= size;
    const active = unlocked && solved > 0 && !complete;
    return { ...p, size, solved, unlocked, complete, active };
  }), [packProgress]);

  const onTapPack = (packId: number, unlocked: boolean) => {
    if (!unlocked) {
      setShakeId(packId);
      setTimeout(() => setShakeId(null), 320);
      return;
    }
    navigate(`/levels/${packId}`);
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>SELECT PACK</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cards.map((c) => {
          const borderColour = c.complete
            ? 'rgba(255,215,0,0.5)'
            : c.active
              ? 'rgba(127,119,221,0.5)'
              : 'rgba(127,119,221,0.2)';
          const isShaking = shakeId === c.id;
          const isNew = newlyUnlocked === c.id;
          return (
            <button
              key={c.id}
              className={isShaking || isNew ? 'fl-shake' : undefined}
              onClick={() => onTapPack(c.id, c.unlocked)}
              style={{
                textAlign: 'left',
                background: c.complete ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${borderColour}`,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                opacity: c.unlocked ? 1 : 0.42,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: skin.fontDisplay, fontSize: 14, color: c.complete ? GOLD : skin.white }}>
                  PACK {c.id} · {c.grid}×{c.grid} Grid
                </span>
                {!c.unlocked && <span style={{ fontSize: 16 }}>🔒</span>}
              </div>

              {c.complete && (
                <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>★★★ {c.solved}/{c.size} complete</div>
              )}
              {c.active && (
                <>
                  <div style={{ fontSize: 12, color: skin.muted, marginTop: 6 }}>
                    {c.solved}/{c.size} solved · Level {c.solved + 1} next
                  </div>
                  <div style={{ height: 4, background: skin.bgBorder, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.solved / c.size) * 100}%`, background: skin.purple, borderRadius: 2 }} />
                  </div>
                </>
              )}
              {!c.unlocked && (
                <div style={{ fontSize: 11, color: skin.muted, marginTop: 6 }}>
                  {c.id === 2 && 'Solve 25 Pack 1 levels to unlock'}
                  {c.id === 3 && 'Complete Pack 1 to unlock'}
                  {c.id === 4 && 'Complete Pack 2 to unlock'}
                </div>
              )}
              {c.unlocked && !c.complete && !c.active && (
                <div style={{ fontSize: 11, color: skin.muted, marginTop: 6 }}>
                  {c.size > 0 ? 'Ready — tap to play' : 'Coming soon'}
                </div>
              )}
            </button>
          );
        })}

        {/* IAP placeholder cards (Sprint 4) */}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {[
            { icon: '💡', label: 'Hint Pack', price: '$0.99' },
            { icon: '🚫', label: 'Remove Ads', price: '$2.99' },
          ].map((iap) => (
            <button
              key={iap.label}
              onClick={() => navigate('/')}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 10, padding: 12, cursor: 'pointer', color: skin.white, fontSize: 11 }}
            >
              <div style={{ fontSize: 18 }}>{iap.icon}</div>
              <div style={{ marginTop: 4 }}>{iap.label}</div>
              <div style={{ color: GOLD, marginTop: 2 }}>{iap.price}</div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
