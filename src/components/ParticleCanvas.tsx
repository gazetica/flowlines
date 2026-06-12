// ParticleCanvas.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 14 | Task FL-S3-014
//
// Flow Lines uses an ambient dot-grid texture, not floating number particles
// (that was Numtap). This replaces the Numtap particle system entirely.
// Named + default export so legacy callers (`import { ParticleCanvas }`) and
// new callers (`import ParticleCanvas`) both work.

export function ParticleCanvas() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(127,119,221,0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}

export default ParticleCanvas;
