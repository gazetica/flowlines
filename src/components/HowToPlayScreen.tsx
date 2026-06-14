// HowToPlayScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-002
//
// 3-page paginated tutorial (eyebrow pill → title → content → dot pagination →
// fixed NEXT button), FL purple theme. Page 1 has a PURE-REACT 6×6 teaching grid
// (NOT Phaser — GameScene is permanently locked; this is a visual aid only).
// Onboarding already calls completeFirstLaunch() in LanguageScreen before this
// screen, so here we only navigate.

import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { ParticleCanvas } from './ParticleCanvas';

const GOLD = '#FFD700';
const DARK = '#0D0620'; // FL bg-deep (button text on gold)

const PATH_COLOURS: Record<string, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#2ECC71',
  orange: '#E67E22',
  purple: '#9B59B6',
};

type RC = [number, number];
const GRID_N = 6;

// Page-1 dot layout (0-indexed). Visually illustrative, has a clean solution.
const DOTS: Array<{ colour: string; a: RC; b: RC }> = [
  { colour: 'red', a: [0, 0], b: [5, 0] },
  { colour: 'blue', a: [0, 4], b: [3, 5] },
  { colour: 'green', a: [1, 2], b: [4, 3] },
  { colour: 'orange', a: [2, 1], b: [5, 4] },
  { colour: 'purple', a: [0, 2], b: [4, 0] },
];

function dotColourAt(r: number, c: number): string | null {
  for (const d of DOTS) {
    if ((d.a[0] === r && d.a[1] === c) || (d.b[0] === r && d.b[1] === c)) return d.colour;
  }
  return null;
}

type PathState = Record<string, RC[]>;

// ─── Interactive 6×6 teaching grid (pure React) ──────────────────────────────

function InteractiveGrid() {
  // Pre-draw red's first 2 cells so a path is visible immediately on mount.
  const [paths, setPaths] = useState<PathState>({ red: [[0, 0], [1, 0]] });
  const dragging = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const up = () => { dragging.current = null; };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  // Resolve the grid cell under a pointer event via the rendered data-* attrs.
  const cellFromEvent = (e: { clientX: number; clientY: number }): RC | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const r = el?.dataset?.row, c = el?.dataset?.col;
    if (r == null || c == null) return null;
    return [Number(r), Number(c)];
  };

  const onDown = (e: ReactPointerEvent) => {
    const cell = cellFromEvent(e);
    if (!cell) return;
    const colour = dotColourAt(cell[0], cell[1]);
    if (!colour) return; // a drag can only begin on a dot
    dragging.current = colour;
    containerRef.current?.setPointerCapture(e.pointerId);
    setPaths((prev) => ({ ...prev, [colour]: [cell] })); // start fresh from this dot
  };

  const onMove = (e: ReactPointerEvent) => {
    const colour = dragging.current;
    if (!colour) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const [r, c] = cell;

    setPaths((prev) => {
      const path = prev[colour] ?? [];
      if (path.length === 0) return prev;
      const head = path[path.length - 1];
      if (Math.abs(head[0] - r) + Math.abs(head[1] - c) !== 1) return prev; // not adjacent

      // Retract: re-entering an earlier cell of our own path truncates to it.
      const own = path.findIndex(([pr, pc]) => pr === r && pc === c);
      if (own !== -1) {
        if (own === path.length - 1) return prev;
        return { ...prev, [colour]: path.slice(0, own + 1) };
      }

      // Can't cross another colour's dot endpoint.
      const dc = dotColourAt(r, c);
      if (dc && dc !== colour) return prev;

      // Drawing over another colour erases it from that cell onward.
      const next: PathState = { ...prev };
      for (const oc of Object.keys(next)) {
        if (oc === colour) continue;
        const oi = next[oc].findIndex(([pr, pc]) => pr === r && pc === c);
        if (oi !== -1) next[oc] = next[oc].slice(0, oi);
      }
      next[colour] = [...path, cell];
      return next;
    });
  };

  // Which colour (if any) occupies a cell — for the 30%-opacity fill.
  const occupantAt = (r: number, c: number): string | null => {
    for (const colour of Object.keys(paths)) {
      if (paths[colour].some(([pr, pc]) => pr === r && pc === c)) return colour;
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      style={{
        touchAction: 'none',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_N}, 1fr)`,
        gap: 3,
        width: '100%',
      }}
    >
      {Array.from({ length: GRID_N * GRID_N }, (_, i) => {
        const r = Math.floor(i / GRID_N);
        const c = i % GRID_N;
        const dot = dotColourAt(r, c);
        const occ = occupantAt(r, c);
        const fill = occ && !dot ? `${PATH_COLOURS[occ]}4D` : 'rgba(255,255,255,0.05)'; // 4D ≈ 30%
        return (
          <div
            key={i}
            data-row={r}
            data-col={c}
            style={{
              aspectRatio: '1',
              background: fill,
              border: '1px solid rgba(127,119,221,0.15)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dot && (
              <div style={{ width: '60%', height: '60%', borderRadius: '50%', background: PATH_COLOURS[dot] }} />
            )}
          </div>
        );
      })}
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
        <button onClick={goBack} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 16, cursor: 'pointer', width: 40, textAlign: 'left' }}>‹</button>
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
