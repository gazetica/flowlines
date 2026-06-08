// PauseModal.test.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task F-002

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PauseModal, quitTarget } from './PauseModal';

afterEach(() => cleanup());

describe('PauseModal (F-002)', () => {
  it('1. renders PAUSED title and Resume / Restart / Quit buttons', () => {
    render(<PauseModal onResume={vi.fn()} onRestart={vi.fn()} onQuit={vi.fn()} />);
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
    expect(screen.getByText('RESUME')).toBeInTheDocument();
    expect(screen.getByText('RESTART')).toBeInTheDocument();
    expect(screen.getByText('QUIT')).toBeInTheDocument();
  });

  it('2. RESUME button invokes onResume (dismiss → game continues)', () => {
    const onResume = vi.fn();
    render(<PauseModal onResume={onResume} onRestart={vi.fn()} onQuit={vi.fn()} />);
    fireEvent.click(screen.getByText('RESUME'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('3. RESTART button invokes onRestart', () => {
    const onRestart = vi.fn();
    render(<PauseModal onResume={vi.fn()} onRestart={onRestart} onQuit={vi.fn()} />);
    fireEvent.click(screen.getByText('RESTART'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('4. QUIT button invokes onQuit', () => {
    const onQuit = vi.fn();
    render(<PauseModal onResume={vi.fn()} onRestart={vi.fn()} onQuit={onQuit} />);
    fireEvent.click(screen.getByText('QUIT'));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('5. quitTarget maps mode → screen (campaign → /campaign, daily/freeplay → /home)', () => {
    expect(quitTarget('campaign')).toBe('/campaign');
    expect(quitTarget('freeplay')).toBe('/home');
    expect(quitTarget('daily')).toBe('/home');
    expect(quitTarget('endless')).toBe('/home');
  });

  it('6. tapping the scrim resumes (same as back-while-paused)', () => {
    const onResume = vi.fn();
    const { container } = render(<PauseModal onResume={onResume} onRestart={vi.fn()} onQuit={vi.fn()} />);
    fireEvent.click(container.firstChild as Element); // the overlay scrim
    expect(onResume).toHaveBeenCalled();
  });
});
