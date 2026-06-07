// GazeticaPromoCard.test.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task B-012
//
// House-ad card: variant rendering, game rotation across mounts, Coming Soon
// badge, and the in-app browser tap handler. Replaces the deleted B-008 banner tests.

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Tap handler is gated by Capacitor.isNativePlatform(); force native so Browser.open runs.
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
const openSpy = vi.fn(async (_o: { url: string }) => {});
vi.mock('@capacitor/browser', () => ({ Browser: { open: (o: { url: string }) => openSpy(o) } }));

import { GazeticaPromoCard, GAMES } from './GazeticaPromoCard';

const NAMES = GAMES.map((g) => g.name);
// Which game name is currently rendered (full/medium show the name text).
const shownName = (container: HTMLElement) => NAMES.find((n) => container.textContent?.includes(n));

beforeEach(() => openSpy.mockClear());
afterEach(() => cleanup());

describe('GazeticaPromoCard (B-012)', () => {
  it('1. compact renders single-line "ALSO BY GAZETICA" text', () => {
    render(<GazeticaPromoCard variant="compact" />);
    expect(screen.getByText(/ALSO BY GAZETICA/)).toBeInTheDocument();
  });

  it('2. medium renders a game name', () => {
    const { container } = render(<GazeticaPromoCard variant="medium" />);
    expect(shownName(container)).toBeDefined();
  });

  it('3. full renders description and DISCOVER button', () => {
    const { container } = render(<GazeticaPromoCard variant="full" />);
    expect(screen.getByText(/MORE FROM GAZETICA/)).toBeInTheDocument();
    expect(screen.getByText(/DISCOVER/)).toBeInTheDocument();
    // description of the shown game is present
    const name = shownName(container)!;
    const desc = GAMES.find((g) => g.name === name)!.description;
    expect(container.textContent).toContain(desc.slice(0, 20));
  });

  it('4. rotation: successive mounts show different games', () => {
    const a = render(<GazeticaPromoCard variant="full" />);
    const first = shownName(a.container);
    cleanup();
    const b = render(<GazeticaPromoCard variant="full" />);
    const second = shownName(b.container);
    expect(first).not.toBe(second);
  });

  it('5. all 4 games cycle without error (4 consecutive mounts → 4 distinct games)', () => {
    const seen: (string | undefined)[] = [];
    for (let i = 0; i < 4; i++) {
      const r = render(<GazeticaPromoCard variant="full" />);
      seen.push(shownName(r.container));
      cleanup();
    }
    expect(new Set(seen).size).toBe(4); // all four distinct
    seen.forEach((n) => expect(NAMES).toContain(n));
  });

  it('6. compact has no card background/border (unlike medium)', () => {
    const { container } = render(<GazeticaPromoCard variant="compact" />);
    const btn = container.querySelector('button')!;
    // No navy-card surface and no coloured solid border (those define the card variants).
    expect(btn.style.border).not.toMatch(/solid/);
    expect(btn.style.background).not.toMatch(/rgba\(10/);
    cleanup();
    // Sanity: medium DOES have the card border + background.
    const m = render(<GazeticaPromoCard variant="medium" />).container.querySelector('button')!;
    expect(m.style.border).toMatch(/solid/);
    expect(m.style.background).toMatch(/rgba\(10/);
  });

  it('7. medium and full show the "Coming Soon" badge; compact does not', () => {
    render(<GazeticaPromoCard variant="medium" />);
    expect(screen.getByText(/Coming Soon/)).toBeInTheDocument();
    cleanup();
    render(<GazeticaPromoCard variant="full" />);
    expect(screen.getByText(/Coming Soon/)).toBeInTheDocument();
    cleanup();
    render(<GazeticaPromoCard variant="compact" />);
    expect(screen.queryByText(/Coming Soon/)).toBeNull();
  });

  it('8. tap opens gazetica.com/games.html via Capacitor Browser', async () => {
    render(<GazeticaPromoCard variant="full" />);
    screen.getByText(/DISCOVER/).click(); // click bubbles to the card button
    await Promise.resolve();
    expect(openSpy).toHaveBeenCalledWith({ url: 'https://gazetica.com/games.html' });
  });
});
