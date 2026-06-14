// FloatingPathCanvas.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-005
//
// Living background for every screen: short curved/straight path segments in the
// 8 game colours, drifting slowly upward at ~20-25% opacity. The game's mechanic
// (orthogonal coloured paths) rendered as ambient texture. Replaces ParticleCanvas
// as the screen background. Pure Canvas 2D, RAF loop, pointer-events: none.

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// 8 game colours (mirrors skin.ts pathColors). Defined locally so this component
// never forces a restructure of the locked skin.ts.
const PATH_COLOURS = [
  '#E24B4A', // red
  '#378ADD', // blue
  '#639922', // green
  '#EF9F27', // yellow
  '#7F77DD', // purple
  '#D85A30', // orange
  '#1D9E75', // teal
  '#D4537E', // pink
];

interface FloatingPathCanvasProps {
  style?: CSSProperties; // passed through to the canvas element
  segmentCount?: number;       // default 15 — number of segments to maintain
  speedMultiplier?: number;    // default 1.0 — use 0.5 for Zen mode (calmer)
  opacity?: number;            // default 0.22 — global opacity cap
}

interface Segment {
  points: [number, number][]; // absolute canvas coordinates at spawn
  colour: string;
  strokeWidth: number;
  opacity: number;
  speedY: number;             // px per frame (positive = upward = subtract from y)
  driftX: number;             // px per frame horizontal wobble
  offsetX: number;            // current x translation
  offsetY: number;            // current y translation
}

function spawnSegment(
  canvasW: number,
  canvasH: number,
  initialSpread: boolean,  // true = scatter across full height on init
  spreadFraction: number,  // 0–1, used when initialSpread=true
  opacityCap: number,
): Segment {
  const SHAPES: [number, number][][] = [
    [[0, 0], [24, 0], [48, 0]],
    [[0, 0], [0, 24], [0, 48]],
    [[0, 0], [24, 0], [24, 24]],
    [[0, 0], [24, 0], [24, -24]],
    [[0, 0], [0, 24], [24, 24]],
    [[0, 0], [24, 0]],
    [[0, 0], [0, 24], [0, 48], [0, 72]],
    [[0, 0], [-24, 0], [-24, 24]],
  ];

  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const colour = PATH_COLOURS[Math.floor(Math.random() * PATH_COLOURS.length)];
  const strokeWidth = 6 + Math.random() * 4;            // 6–10px
  const segOpacity = (opacityCap - 0.04) + Math.random() * 0.08; // ±0.04 around cap
  const speedY = 0.3 + Math.random() * 0.4;             // 0.3–0.7 px/frame
  const driftX = (Math.random() - 0.5) * 0.2;           // −0.1 to +0.1 px/frame

  // Spawn x: random across canvas width with padding
  const spawnX = 40 + Math.random() * Math.max(canvasW - 80, 80);
  // Spawn y: at bottom if new, spread across height if initial
  const spawnY = initialSpread
    ? canvasH * (1 - spreadFraction) // spread from bottom to top on init
    : canvasH + 40;                  // below canvas for fresh spawns

  const points: [number, number][] = shape.map(([dx, dy]) => [
    spawnX + dx,
    spawnY + dy,
  ]);

  return {
    points,
    colour,
    strokeWidth,
    opacity: segOpacity,
    speedY,
    driftX,
    offsetX: 0,
    offsetY: 0,
  };
}

function drawSegment(ctx: CanvasRenderingContext2D, seg: Segment): void {
  if (seg.points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = seg.opacity;
  ctx.strokeStyle = seg.colour;
  ctx.lineWidth = seg.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const [fx, fy] = seg.points[0];
  ctx.moveTo(fx + seg.offsetX, fy + seg.offsetY);
  for (let i = 1; i < seg.points.length; i++) {
    const [px, py] = seg.points[i];
    ctx.lineTo(px + seg.offsetX, py + seg.offsetY);
  }
  ctx.stroke();

  // Endpoint dots — 60% of stroke width diameter (0.6 × width radius keeps them
  // visible without overpowering the line)
  const dotRadius = seg.strokeWidth * 0.6;
  ctx.fillStyle = seg.colour;
  for (const end of [seg.points[0], seg.points[seg.points.length - 1]]) {
    ctx.beginPath();
    ctx.arc(end[0] + seg.offsetX, end[1] + seg.offsetY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function FloatingPathCanvas({
  style,
  segmentCount = 15,
  speedMultiplier = 1.0,
  opacity = 0.22,
}: FloatingPathCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to its rendered box
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialise segments spread across the full canvas height
    segmentsRef.current = Array.from({ length: segmentCount }, (_, i) =>
      spawnSegment(canvas.width, canvas.height, true, i / segmentCount, opacity)
    );

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      segmentsRef.current = segmentsRef.current.map(seg => {
        const newOffsetY = seg.offsetY - seg.speedY * speedMultiplier;
        const newOffsetX = seg.offsetX + seg.driftX * speedMultiplier;

        // Respawn at bottom once fully above the top edge
        const topY = Math.min(...seg.points.map(p => p[1])) + newOffsetY;
        if (topY < -80) {
          return spawnSegment(canvas.width, canvas.height, false, 0, opacity);
        }

        const updated = { ...seg, offsetY: newOffsetY, offsetX: newOffsetX };
        drawSegment(ctx, updated);
        return updated;
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [segmentCount, speedMultiplier, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

export default FloatingPathCanvas;
