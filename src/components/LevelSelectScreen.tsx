// LevelSelectScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-007 (VD-04)
//
// Mode-aware 5×10 level grid. Reads /levels/:packId?mode=campaign|classic|zen.
// Tiles: completed (stars), current (▶, pulses on campaign), locked (🔒). Star
// ratings + difficulty section dividers (MEDIUM/HARD/HARDEST). Routes to /game
// carrying the mode (and replay=true for already-completed levels).

import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { globalLevelNum } from '../utils/levelUtils';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';
const GRIDS: Record<number, number> = { 1: 6, 2: 7, 3: 8, 4: 9 };
const PACK_SIZE = 50;

type Mode = 'campaign' | 'classic' | 'zen';

// Difficulty tier dividers injected before these 1-based level indices.
const DIVIDERS: Record<number, string> = { 16: 'home.medium', 26: 'home.hard', 41: 'home.hardest' };

function starString(stars: number): string {
  if (stars >= 3) return '★★★';
  if (stars === 2) return '★★☆';
  if (stars === 1) return '★☆☆';
  return '';
}

export default function LevelSelectScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { packId: packIdParam } = useParams<{ packId: string }>();
  const [searchParams] = useSearchParams();
  const packId = parseInt(packIdParam ?? '1', 10);
  const mode = ((searchParams.get('mode') ?? 'campaign') as Mode);
  const grid = GRIDS[packId] ?? 6;

  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const unlockAllPurchased = useFlowSettingsStore((s) => s.unlockAllPurchased); // FL-5A-029
  const modeProgress = mode === 'classic' ? classicProgress : campaignProgress;
  const packProgress = modeProgress[packId];

  const highest = packProgress?.highestLevelReached ?? 1;
  const solved = packProgress?.solved ?? 0;

  const getStars = (levelIndex: number): 0 | 1 | 2 | 3 => {
    const id = `p${packId}_${String(levelIndex).padStart(3, '0')}`;
    return (packProgress?.stars[id] ?? 0) as 0 | 1 | 2 | 3;
  };

  const currentRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100%',
        background: '#0D0620',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: skin.fontBody,
      }}
    >
      <FloatingPathCanvas />
      <style>{`@keyframes flLevelPulse {
        0%,100% { box-shadow: 0 0 0 2px rgba(230,126,34,0.4); }
        50%     { box-shadow: 0 0 0 4px rgba(230,126,34,0.2); }
      }`}</style>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onPointerDown={() => navigate(`/packs?mode=${mode}`)}
              style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', background: 'none', border: 'none', color: GOLD, fontSize: 24, cursor: 'pointer' }}
            >
              ‹
            </button>
            <span style={{ fontFamily: skin.fontDisplay, fontSize: 15, color: GOLD, letterSpacing: 1 }}>
              {t('levels.header', { number: packId, grid: `${grid}×${grid}` })}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{solved}/{PACK_SIZE}</span>
        </div>

        {/* Level grid */}
        <div style={{ padding: '4px 16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {Array.from({ length: PACK_SIZE }, (_, i) => {
              const levelIndex = i + 1; // 1-based
              const divider = DIVIDERS[levelIndex];
              const globalNum = globalLevelNum(packId, levelIndex); // FL-UX-D-022 Fix 4: display 1-200
              const stars = getStars(levelIndex);
              // FL-5A-029: the Unlock All Levels IAP makes every level playable —
              // levels beyond the sequential frontier render as 'unlocked' (tappable)
              // instead of 'locked'.
              const state: 'completed' | 'current' | 'unlocked' | 'locked' =
                levelIndex < highest ? 'completed'
                  : levelIndex === highest ? 'current'
                    : unlockAllPurchased ? 'unlocked' : 'locked';

              const tile = (() => {
                if (state === 'locked') {
                  return (
                    <button
                      key={levelIndex}
                      disabled
                      style={{
                        aspectRatio: '1', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.02)', opacity: 0.35, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}
                    >
                      🔒
                    </button>
                  );
                }

                if (state === 'unlocked') {
                  // FL-5A-029: IAP-unlocked, not yet reached — playable, no pulse/ref.
                  return (
                    <button
                      key={levelIndex}
                      onPointerDown={() => navigate(`/game?pack=${packId}&level=${levelIndex}&mode=${mode}`)}
                      style={{
                        aspectRatio: '1', borderRadius: 10,
                        background: 'rgba(127,119,221,0.10)', border: '1px solid rgba(127,119,221,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontFamily: skin.fontDisplay,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{globalNum}</span>
                    </button>
                  );
                }

                if (state === 'current') {
                  const pulse = mode === 'campaign';
                  return (
                    <button
                      key={levelIndex}
                      ref={currentRef}
                      onPointerDown={() => navigate(`/game?pack=${packId}&level=${levelIndex}&mode=${mode}`)}
                      style={{
                        aspectRatio: '1', borderRadius: 10,
                        background: 'rgba(127,119,221,0.18)', border: '1.5px solid #7F77DD',
                        boxShadow: pulse ? '0 0 0 2px rgba(230,126,34,0.4)' : undefined,
                        animation: pulse ? 'flLevelPulse 1.5s ease-in-out infinite' : undefined,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        cursor: 'pointer', fontFamily: skin.fontDisplay,
                      }}
                    >
                      <span style={{ fontSize: 16, color: GOLD }}>▶</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{globalNum}</span>
                    </button>
                  );
                }

                // completed
                const three = stars >= 3;
                const starColour = stars >= 3 ? GOLD : stars === 2 ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.5)';
                return (
                  <button
                    key={levelIndex}
                    onPointerDown={() => navigate(`/game?pack=${packId}&level=${levelIndex}&mode=${mode}&replay=true`)}
                    style={{
                      aspectRatio: '1', borderRadius: 10,
                      background: three ? 'rgba(255,215,0,0.15)' : 'rgba(127,119,221,0.12)',
                      border: three ? '1.5px solid rgba(255,215,0,0.5)' : '1px solid rgba(127,119,221,0.3)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      cursor: 'pointer', fontFamily: skin.fontDisplay,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{globalNum}</span>
                    {stars > 0 && <span style={{ fontSize: 8, color: starColour }}>{starString(stars)}</span>}
                  </button>
                );
              })();

              if (!divider) return tile;
              return (
                <div key={`wrap-${levelIndex}`} style={{ display: 'contents' }}>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 2px' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(127,119,221,0.15)' }} />
                    <span style={{ fontSize: 9, color: 'rgba(127,119,221,0.5)', letterSpacing: 1.5 }}>{t(divider)}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(127,119,221,0.15)' }} />
                  </div>
                  {tile}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>
    </div>
  );
}
