// HowToPlayScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 17 | Task FL-S3-017 (VD-12)
//
// 4-step static tutorial with CSS-drawn 4×4 grid illustrations (no Phaser — the
// engine is locked, and a static visual is sufficient for Sprint 3). Doubles as
// the final step of first-launch onboarding: tapping START PLAYING marks
// onboarding complete and routes to /home; otherwise routes to /packs.

import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

const GOLD = '#FFD700';
const PC = skin.pathColors;

// A 4×4 illustration grid. `cells` maps a 0-based index (row*4+col) to a node
// rendered inside that cell (a coloured dot or path segment); empty cells blank.
function MiniGrid({ cells }: { cells: Record<number, ReactNode> }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 2,
        width: 120,
        height: 120,
        margin: '0 auto 12px',
      }}
    >
      {Array.from({ length: 16 }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'rgba(127,119,221,0.08)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cells[i] ?? null}
        </div>
      ))}
    </div>
  );
}

function Dot({ colour }: { colour: string }) {
  return <div style={{ width: '70%', height: '70%', borderRadius: '50%', background: colour }} />;
}

function Fill({ colour }: { colour: string }) {
  return <div style={{ width: '100%', height: '100%', borderRadius: 4, background: colour, opacity: 0.85 }} />;
}

const STEPS: Array<{ title: string; body: string; grid?: Record<number, ReactNode>; icon?: string }> = [
  {
    title: 'Connect the dots',
    body: 'Tap a coloured dot and drag to its matching dot.',
    grid: { 0: <Dot colour={PC.red} />, 15: <Dot colour={PC.red} />, 3: <Dot colour={PC.blue} />, 12: <Dot colour={PC.blue} /> },
  },
  {
    title: 'Fill the board',
    body: "Every cell must be covered. Partial solutions don't count!",
    grid: {
      0: <Dot colour={PC.red} />, 1: <Fill colour={PC.red} />, 2: <Fill colour={PC.red} />, 3: <Dot colour={PC.red} />,
      4: <Fill colour={PC.green} />, 5: <Fill colour={PC.green} />, 6: <Fill colour={PC.green} />, 7: <Fill colour={PC.green} />,
      8: <Dot colour={PC.green} />, 11: <Dot colour={PC.green} />,
    },
  },
  {
    title: 'No crossing',
    body: 'Paths cannot overlap. Plan your route carefully.',
    grid: {
      0: <Dot colour={PC.blue} />, 4: <Fill colour={PC.blue} />, 8: <Fill colour={PC.blue} />, 12: <Dot colour={PC.blue} />,
      3: <Dot colour={PC.yellow} />, 7: <Fill colour={PC.yellow} />, 11: <Fill colour={PC.yellow} />, 15: <Dot colour={PC.yellow} />,
    },
  },
  {
    title: 'Hints available',
    body: 'Stuck? Use a hint. Watch a short ad to reveal the optimal next cell for any colour.',
    icon: '💡',
  },
];

export function HowToPlayScreen() {
  const navigate = useNavigate();
  const firstLaunchComplete = useFlowSettingsStore((s) => s.firstLaunchComplete);
  const completeFirstLaunch = useFlowSettingsStore((s) => s.completeFirstLaunch);

  const onBack = () => {
    if (firstLaunchComplete) navigate(-1);
    else navigate('/home');
  };

  const onStart = () => {
    if (!firstLaunchComplete) {
      completeFirstLaunch();
      navigate('/home');
    } else {
      navigate('/packs');
    }
  };

  // Skip: on first launch, complete onboarding then go Home; for a returning
  // user (opened from Settings) just go back.
  const handleSkip = () => {
    if (!firstLaunchComplete) {
      completeFirstLaunch();
      navigate('/home');
    } else {
      navigate(-1);
    }
  };

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
          <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>HOW TO PLAY</span>
        </div>
        <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: skin.muted, fontSize: 13, cursor: 'pointer' }}>
          Skip ›
        </button>
      </div>

      {/* Steps */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={card}>
            {s.grid ? (
              <MiniGrid cells={s.grid} />
            ) : (
              <div style={{ fontSize: 44, marginBottom: 12 }}>{s.icon}</div>
            )}
            <div style={{ fontFamily: skin.fontDisplay, fontSize: 14, color: skin.purpleLight, marginBottom: 6 }}>
              {i + 1}. {s.title}
            </div>
            <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>{s.body}</div>
          </div>
        ))}

        {/* CTA */}
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: 14,
            background: GOLD,
            color: skin.bgDeep,
            border: 'none',
            borderRadius: 12,
            fontFamily: skin.fontDisplay,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          ▶ START PLAYING
        </button>
      </div>
    </div>
  );
}

export default HowToPlayScreen;
