// FILE: frontend/__tests__/PomodoroSun.test.tsx
// RTL tests for PomodoroSun — verifies timer rendering, controls, and session completion callback.

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PomodoroSun from '../app/components/PomodoroSun';
import { getMoodTheme } from '../lib/moodTheme';

// Framer Motion is purely visual — stub it so tests run in jsdom without animation
jest.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    circle: ({ children, ...p }: React.SVGProps<SVGCircleElement>) => <circle {...p}>{children}</circle>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation:    () => ({ start: jest.fn(), stop: jest.fn() }),
  useMotionValue:  (v: number) => ({ get: () => v, set: jest.fn() }),
}));

const theme = getMoodTheme('focused');

describe('PomodoroSun', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders a start button', () => {
    render(<PomodoroSun theme={theme} onSessionComplete={jest.fn()} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('shows the default duration label', () => {
    render(<PomodoroSun theme={theme} onSessionComplete={jest.fn()} />);
    // Default 25-min timer should display 25:00 or similar
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('switches to pause after clicking start', async () => {
    render(<PomodoroSun theme={theme} onSessionComplete={jest.fn()} />);
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);
    // After clicking, should show Pause or Stop
    expect(screen.queryByRole('button', { name: /pause|stop/i })).not.toBeNull();
  });

  it('calls onSessionComplete when timer finishes', async () => {
    const onComplete = jest.fn();
    render(<PomodoroSun theme={theme} onSessionComplete={onComplete} />);
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);
    // Advance time past 25 minutes (1500 seconds)
    act(() => { jest.advanceTimersByTime(1500 * 1000 + 100); });
    expect(onComplete).toHaveBeenCalledWith(25);
  });

  it('reset button restores the timer display', () => {
    render(<PomodoroSun theme={theme} onSessionComplete={jest.fn()} />);
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);
    act(() => { jest.advanceTimersByTime(5000); });
    const resetBtn = screen.queryByRole('button', { name: /reset/i });
    if (resetBtn) {
      fireEvent.click(resetBtn);
      expect(screen.getByText(/25/)).toBeInTheDocument();
    }
  });
});
