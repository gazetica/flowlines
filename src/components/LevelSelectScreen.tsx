// LevelSelectScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 15 | Task FL-S3-015 (VD-04)
//
// 5×10 level grid for a pack: star ratings, current/locked/playable states,
// scrolls the current level into view on mount.

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getPackSize } from '../game/engine/LevelManager';

const GOLD = '#FFD700';
const GRIDS: Record<number, number> = { 1: 6, 2: 7, 3: 8, 4: 9 };

function starString(stars: number): string {
  if (stars >= 3) return '★★★';
  if (stars === 2) return '★★☆';
  if (stars === 1) return '★☆☆';
  return '';
}

export default function LevelSelectScreen() {
  const navigate = useNavigate();
  const { packId } = useParams<{ packId: string }>();
  const packNum = parseInt(packId ?? '1', 10);

  const packProgress = useFlowSettingsStore((s) => s.packProgress);
  const solved = packProgress[packNum]?.solved ?? 0;
  const starsMap = packProgress[packNum]?.stars ?? {};
  const size = getPackSize(packNum);
  const grid = GRIDS[packNum] ?? 6;
  const currentLevel = solved + 1; // 1-based; this and below are playable

  const currentRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/packs')} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
          <span style={{ fontFamily: skin.fontDisplay, fontSize: 15, color: GOLD, letterSpacing: 1 }}>PACK {packNum} · {grid}×{grid}</span>
        </div>
        <span style={{ fontSize: 12, color: skin.muted }}>{solved}/{size}</span>
      </div>

      {size === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: skin.muted, fontSize: 13 }}>
          No levels yet — coming soon
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {Array.from({ length: size }, (_, i) => {
              const levelIndex = i + 1; // 1-based
              const id = `p${packNum}_${String(levelIndex).padStart(3, '0')}`;
              const stars = starsMap[id] ?? 0;
              const isCurrent = levelIndex === currentLevel;
              const playable = levelIndex <= currentLevel;
              const locked = !playable;

              let bg = 'rgba(255,255,255,0.03)';
              let border = '1px solid rgba(127,119,221,0.15)';
              let textColour: string = skin.muted;
              if (stars >= 3) {
                bg = 'rgba(255,215,0,0.15)'; border = '1px solid rgba(255,215,0,0.5)'; textColour = GOLD;
              } else if (stars >= 1) {
                bg = 'rgba(127,119,221,0.2)'; border = '1px solid rgba(127,119,221,0.5)'; textColour = skin.purpleLight;
              }
              if (isCurrent) {
                border = `2px solid ${GOLD}`; textColour = GOLD;
              }

              return (
                <button
                  key={id}
                  ref={isCurrent ? currentRef : undefined}
                  disabled={locked}
                  onClick={() => playable && navigate(`/game?pack=${packNum}&level=${levelIndex}`)}
                  style={{
                    aspectRatio: '1',
                    background: bg,
                    border,
                    borderRadius: 8,
                    cursor: playable ? 'pointer' : 'default',
                    color: textColour,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    fontFamily: skin.fontDisplay,
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  {locked && !isCurrent ? (
                    <span style={{ fontSize: 14 }}>🔒</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 14 }}>{isCurrent && stars === 0 ? '▶' : levelIndex}</span>
                      {stars > 0 && <span style={{ fontSize: 8, color: GOLD }}>{starString(stars)}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
