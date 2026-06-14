// HowToPlayScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-002
//
// 3-page paginated tutorial (eyebrow pill → title → content → dot pagination →
// fixed NEXT button), FL purple theme. Page 1 has a PURE-REACT 6×6 teaching grid
// (NOT Phaser — GameScene is permanently locked; this is a visual aid only).
// Onboarding already calls completeFirstLaunch() in LanguageScreen before this
// screen, so here we only navigate.

import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { ParticleCanvas } from './ParticleCanvas';

const GOLD = '#FFD700';
const DARK = '#0D0620'; // FL bg-deep (button text on gold)

const GRID_SIZE = 6;

const DOTS: Record<string, [[number, number], [number, number]]> = {
  red: [[0, 0], [5, 0]],
  blue: [[0, 4], [3, 5]],
  green: [[1, 2], [4, 3]],
  orange: [[2, 1], [5, 4]],
  purple: [[0, 2], [4, 0]],
};

const COLOURS: Record<string, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#2ECC71',
  orange: '#E67E22',
  purple: '#9B59B6',
};

/** Which colour (if any) has a dot at [row,col]. */
function dotColourAt(row: number, col: number): string | null {
  for (const [colour, [[r1, c1], [r2, c2]]] of Object.entries(DOTS)) {
    if ((row === r1 && col === c1) || (row === r2 && col === c2)) return colour;
  }
  return null;
}

function isAdjacent([r1, c1]: [number, number], [r2, c2]: [number, number]): boolean {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

type Cell = [number, number];
type PathMap = Record<string, Cell[]>;

// ─── Interactive 6×6 teaching grid (pure React) ──────────────────────────────
// Capacitor Android WebView drops elementFromPoint / sibling pointerEnter during
// an active pointer capture. The reliable pattern is: cells are visual-only
// (pointerEvents:none) and a single invisible overlay handles every pointer
// event, mapping clientX/Y → cell via getBoundingClientRect.

function InteractiveGrid() {
  const [paths, setPaths] = useState<PathMap>({ red: [[0, 0], [1, 0]] }); // red pre-drawn
  const dragging = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / (rect.width / GRID_SIZE));
    const row = Math.floor((clientY - rect.top) / (rect.height / GRID_SIZE));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return [row, col];
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    const colour = dotColourAt(cell[0], cell[1]);
    if (!colour) return; // must start on a dot
    dragging.current = colour;
    setPaths((prev) => ({ ...prev, [colour]: [cell] })); // start fresh from this dot
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const colour = dragging.current;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    const [row, col] = cell;

    setPaths((prev) => {
      const path = prev[colour] ?? [];
      if (path.length === 0) return prev;
      const last = path[path.length - 1];
      if (last[0] === row && last[1] === col) return prev;      // same cell
      if (!isAdjacent(last, [row, col])) return prev;            // not adjacent

      // Retract onto an earlier cell of our own path.
      const ownIdx = path.findIndex(([r, c]) => r === row && c === col);
      if (ownIdx !== -1 && ownIdx < path.length - 1) {
        return { ...prev, [colour]: path.slice(0, ownIdx + 1) };
      }

      // Drawing over another colour erases it from that cell onward.
      const next: PathMap = { ...prev };
      for (const other of Object.keys(next)) {
        if (other === colour) continue;
        const idx = next[other].findIndex(([r, c]) => r === row && c === col);
        if (idx !== -1) next[other] = next[other].slice(0, idx);
      }
      next[colour] = [...path, [row, col]];
      return next;
    });
  }

  function handlePointerUp() {
    dragging.current = null;
  }

  // "row,col" → colour for the filled cells.
  const filled: Record<string, string> = {};
  for (const [colour, path] of Object.entries(paths)) {
    for (const [r, c] of path) filled[`${r},${c}`] = colour;
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', margin: '0 auto' }}>
      {/* Visual cells — no pointer events */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: 3, width: '100%', height: '100%', pointerEvents: 'none',
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          const fill = filled[`${row},${col}`];
          const dot = dotColourAt(row, col);
          return (
            <div
              key={i}
              style={{
                backgroundColor: fill ? `${COLOURS[fill]}4D` : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(127,119,221,0.15)',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {dot && (
                <div style={{ width: '60%', height: '60%', borderRadius: '50%', backgroundColor: COLOURS[dot], flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Invisible overlay — handles every pointer event */}
      <div
        style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

// ─── Shared building blocks ──────────────────────────────────────────────────

function InstructionCard({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(127,119,221,0.2)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)',
          color: GOLD, fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

const titleStyle: CSSProperties = { fontSize: 28, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 4 };
const subtitleStyle: CSSProperties = { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 };

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={titleStyle}>{title}</div>
      <div style={subtitleStyle}>{subtitle}</div>
    </>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function Page1() {
  return (
    <>
      <PageHeading title="Connect the colours" subtitle="Fill every cell on the board" />
      <div style={{ marginBottom: 20 }}>
        <InteractiveGrid />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InstructionCard n={1}>Press on a coloured dot and drag to its matching partner</InstructionCard>
        <InstructionCard n={2}>Every cell must be filled — connecting the dots alone is not enough</InstructionCard>
      </div>
    </>
  );
}

function Page2() {
  const rules = [
    'Paths move up, down, left, right only — no diagonal moves allowed',
    'Paths cannot cross each other — if you draw over another colour, it erases from that point',
    'You can retract your own path — drag backward over your own line to undo cells',
    'Stuck? Tap 💡 HINT — watch a short ad to reveal the optimal next cell for one colour',
    'Grids grow from 6×6 (Pack 1) up to 9×9 (Pack 4) — more cells, more planning required',
  ];
  return (
    <>
      <PageHeading title="Master the puzzle" subtitle="Learn the rules, plan ahead" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rules.map((t, i) => <InstructionCard key={i} n={i + 1}>{t}</InstructionCard>)}
      </div>
    </>
  );
}

function Page3() {
  const modes = [
    { icon: '🎯', name: 'Classic', desc: '200 levels across 4 packs · 6×6 to 9×9 grids · earn up to 3 stars per level' },
    { icon: '📅', name: 'Daily Challenge', desc: 'One fresh puzzle every day · global leaderboard · build your streak' },
    { icon: '⏱', name: 'Timed', desc: 'Solve as many 6×6 levels as possible in 3 minutes · score as high as you can' },
    { icon: '🧘', name: 'Zen', desc: 'No timer, no score · pure relaxed solving at your own pace' },
  ];
  return (
    <>
      <PageHeading title="Choose your challenge" subtitle="Four ways to play Flow Lines" />
      <div>
        {modes.map((m) => (
          <div
            key={m.name}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(127,119,221,0.2)',
              borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(127,119,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {m.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 3 }}>{m.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function HowToPlayScreen() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0); // 0,1,2

  const goNext = () => { if (page < 2) setPage((p) => p + 1); else navigate('/home'); };
  const goBack = () => { if (page > 0) setPage((p) => p - 1); else navigate(-1); };
  const skip = () => navigate('/home');

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden',
        background: 'linear-gradient(160deg, #1A0A3C 0%, #2D1060 100%)',
        display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody,
      }}
    >
      <ParticleCanvas />
      <style>{`@keyframes htpFade { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
        <div
          onPointerDown={goBack}
          style={{
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: GOLD, fontSize: 24, fontWeight: 700,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ‹
        </div>
        <span style={{ border: '1px solid rgba(255,215,0,0.5)', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, background: 'rgba(255,215,0,0.08)' }}>
          HOW TO PLAY
        </span>
        {page < 2 ? (
          <button onClick={skip} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', width: 40, textAlign: 'right' }}>Skip ›</button>
        ) : (
          <span style={{ width: 40 }} />
        )}
      </div>

      {/* Scrollable body (fades on page change) */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '12px 20px 8px' }}>
        <div key={page} style={{ maxWidth: 480, margin: '0 auto', animation: 'htpFade 200ms ease-in' }}>
          {page === 0 && <Page1 />}
          {page === 1 && <Page2 />}
          {page === 2 && <Page3 />}
        </div>
      </div>

      {/* Pagination dots */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0 12px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === page ? 20 : 8, height: 8, borderRadius: i === page ? 4 : '50%',
              background: i === page ? GOLD : 'rgba(255,255,255,0.2)',
              transition: 'width 200ms ease',
            }}
          />
        ))}
      </div>

      {/* Bottom buttons */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={goNext}
          style={{ background: GOLD, color: DARK, border: 'none', borderRadius: 12, padding: 17, fontSize: 16, fontWeight: 700, letterSpacing: 1.5, width: '100%', cursor: 'pointer', fontFamily: skin.fontDisplay }}
        >
          {page === 2 ? "LET'S PLAY!" : 'NEXT →'}
        </button>
        {page < 2 && (
          <button
            onClick={skip}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, fontSize: 14, color: 'rgba(255,255,255,0.4)', width: '100%', cursor: 'pointer' }}
          >
            Skip Tutorial
          </button>
        )}
      </div>
    </div>
  );
}

export default HowToPlayScreen;
