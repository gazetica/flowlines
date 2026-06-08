// PauseModal.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task F-002
//
// Pause overlay shown when the player presses the Android back button during an
// active game. Presentational only — the game pause/resume/restart/quit logic and
// the Phaser/timer control live in GameScreen (which owns the Phaser instance).
// Kept Phaser-free so it is unit-testable.

const FONT = "'Space Mono', monospace";
const CYAN = '#00f5ff';

/** QUIT navigation target by game mode: campaign → map, everything else → home. */
export function quitTarget(mode: string): string {
  return mode === 'campaign' ? '/campaign' : '/home';
}

export function PauseModal({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    // Tapping the scrim resumes (same as pressing back again while paused).
    <div
      onClick={onResume}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        background: 'rgba(3,8,16,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 300,
          background: 'var(--navy-card)',
          border: `1px solid ${CYAN}`,
          borderRadius: 14,
          boxShadow: `0 0 24px rgba(0,245,255,0.18), 0 8px 24px rgba(0,0,0,0.5)`,
          padding: '24px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: 18, color: CYAN, letterSpacing: 3, marginBottom: 20, textShadow: '0 0 12px rgba(0,245,255,0.5)' }}>
          PAUSED
        </div>

        <button
          onClick={onResume}
          style={{
            width: '100%', padding: '13px', marginBottom: 10, fontFamily: FONT, fontSize: 12,
            letterSpacing: 2, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
            background: CYAN, color: '#07111F', boxShadow: '0 0 14px rgba(0,245,255,0.4)',
          }}
        >
          RESUME
        </button>

        <button
          onClick={onRestart}
          style={{
            width: '100%', padding: '13px', marginBottom: 10, fontFamily: FONT, fontSize: 12,
            letterSpacing: 2, borderRadius: 8, cursor: 'pointer',
            background: 'rgba(0,245,255,0.08)', border: `1px solid rgba(0,245,255,0.4)`, color: CYAN,
          }}
        >
          RESTART
        </button>

        <button
          onClick={onQuit}
          style={{
            width: '100%', padding: '12px', fontFamily: FONT, fontSize: 11, letterSpacing: 2,
            borderRadius: 8, cursor: 'pointer', background: 'none',
            border: '1px solid var(--navy-border)', color: 'var(--muted)',
          }}
        >
          QUIT
        </button>
      </div>
    </div>
  );
}
