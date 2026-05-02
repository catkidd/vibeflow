'use client';
// FILE: frontend/app/components/PomodoroSun.tsx
// Circular SVG progress ring — NOT a digital clock display.
// Outer track + mood-color arc + center time display + glow.
// On completion: 3 gentle pulses. Modes: 25min Focus / 5min Break.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pomodoroCompleteVariants, DURATION, EASE } from '@/lib/animation';
import type { MoodThemeToken } from '@/lib/moodTheme';
import { useToast } from './ToastContext';

interface PomodoroSunProps {
  theme: MoodThemeToken;
  /** Called when a session completes — triggers POST /sessions */
  onSessionComplete?: (durationMin: number) => void;
}

type PomodoroMode = 'focus' | 'break';

const MODES: Record<PomodoroMode, number> = {
  focus: 25 * 60,  // 25 minutes in seconds
  break: 5 * 60,   //  5 minutes in seconds
};

const SVG_SIZE = 240;
const STROKE_WIDTH = 10;
const RADIUS = (SVG_SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Formats seconds to MM:SS display string.
 * @param seconds - Total seconds remaining
 * @returns Formatted string e.g. "24:59"
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * PomodoroSun
 * SVG ring timer with mood-color arc, center countdown, and ambient glow.
 * Glow intensity is proportional to time remaining (bright at start, dims as session ends).
 * On completion: ring pulses 3 times (scale 1 → 1.08 → 1.0, 3×800ms).
 *
 * Uses Date.now() delta for accuracy when tab is backgrounded.
 * Edge case — tab hidden: interval continues but uses wall-clock diff on resume.
 * Edge case — mode switch mid-session: resets timer to new mode duration.
 *
 * @param theme             - Current mood theme for colors and glow
 * @param onSessionComplete - Called with duration when session finishes
 */
export default function PomodoroSun({ theme, onSessionComplete }: PomodoroSunProps) {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const { fireToast } = useToast();

  const startTimeRef = useRef<number | null>(null);
  const totalRef = useRef<number>(MODES.focus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress ratio (1 = full, 0 = complete)
  const progress = secondsLeft / totalRef.current;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // Glow intensity: brighter at full, dims as session ends
  const glowOpacity = 0.3 + progress * 0.6;
  const glowBlur = 8 + progress * 20;
  const glowShadow = `0 0 ${glowBlur}px rgba(${hexToRgb(theme.color)}, ${glowOpacity})`;

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick using wall-clock diff for tab-hidden accuracy
  const tick = useCallback(() => {
    if (startTimeRef.current === null) return;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const remaining = Math.max(0, totalRef.current - elapsed);
    setSecondsLeft(remaining);

    if (remaining === 0) {
      clearTimer();
      setIsRunning(false);
      setIsPulsing(true);
      fireToast('pomodoro_complete');
      onSessionComplete?.(totalRef.current / 60);
      setTimeout(() => setIsPulsing(false), DURATION.POMODORO_PULSE * 3 * 1000 + 200);
    }
  }, [clearTimer, fireToast, onSessionComplete]);

  // Start / pause
  const handlePlayPause = useCallback(() => {
    if (isRunning) {
      clearTimer();
      setIsRunning(false);
      startTimeRef.current = null;
    } else {
      if (secondsLeft === 0) return;
      // Adjust start time to account for already-elapsed seconds
      startTimeRef.current = Date.now() - (totalRef.current - secondsLeft) * 1000;
      intervalRef.current = setInterval(tick, 500);
      setIsRunning(true);
    }
  }, [isRunning, secondsLeft, clearTimer, tick]);

  // Reset
  const handleReset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPulsing(false);
    startTimeRef.current = null;
    setSecondsLeft(MODES[mode]);
    totalRef.current = MODES[mode];
  }, [clearTimer, mode]);

  // Switch mode
  const handleModeSwitch = useCallback((newMode: PomodoroMode) => {
    clearTimer();
    setIsRunning(false);
    setIsPulsing(false);
    startTimeRef.current = null;
    setMode(newMode);
    setSecondsLeft(MODES[newMode]);
    totalRef.current = MODES[newMode];
  }, [clearTimer]);

  // Update tick callback when it changes
  useEffect(() => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, 500);
    }
  }, [tick, isRunning]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Mode tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {(['focus', 'break'] as PomodoroMode[]).map((m) => (
          <button
            key={m}
            id={`pomodoro-mode-${m}`}
            onClick={() => handleModeSwitch(m)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={{
              background: mode === m ? theme.color20 : 'transparent',
              color: mode === m ? theme.color : 'rgba(255,255,255,0.4)',
              border: mode === m ? `1px solid ${theme.color40}` : '1px solid transparent',
            }}
            aria-pressed={mode === m}
          >
            {m === 'focus' ? '⏱ 25 min' : '☕ 5 min'}
          </button>
        ))}
      </div>

      {/* SVG Ring */}
      <motion.div
        variants={pomodoroCompleteVariants}
        animate={isPulsing ? 'pulsing' : 'idle'}
        className="relative flex items-center justify-center"
        style={{ width: SVG_SIZE, height: SVG_SIZE }}
        role="timer"
        aria-label={`${mode} timer: ${formatTime(secondsLeft)} remaining`}
        aria-live="off"
      >
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {/* Outer track ring */}
          <circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE_WIDTH}
          />

          {/* Progress arc — mood color */}
          <circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={theme.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.5s linear',
              filter: `drop-shadow(0 0 ${glowBlur / 2}px ${theme.color})`,
            }}
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="text-4xl font-bold tabular-nums tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'white',
              textShadow: glowShadow,
            }}
          >
            {formatTime(secondsLeft)}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: theme.color }}>
            {mode === 'focus' ? 'Focus' : 'Break'}
          </span>
        </div>

        {/* Outer glow ring (ambient) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 ${glowBlur * 2}px ${theme.color}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`,
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Reset */}
        <motion.button
          id="pomodoro-reset"
          onClick={handleReset}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Reset timer"
        >
          ↺
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          id="pomodoro-play-pause"
          onClick={handlePlayPause}
          disabled={secondsLeft === 0}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold disabled:opacity-30"
          style={{
            background: `linear-gradient(135deg, ${theme.color}CC, ${theme.color})`,
            color: '#1A1A2E',
            boxShadow: theme.subtleGlow,
          }}
          whileHover={secondsLeft > 0 ? { scale: 1.08, boxShadow: theme.glowShadow } : {}}
          whileTap={secondsLeft > 0 ? { scale: 0.92 } : {}}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          aria-pressed={isRunning}
        >
          {isRunning ? '⏸' : '▶'}
        </motion.button>

        {/* Spacer for symmetry */}
        <div className="w-10 h-10" />
      </div>

      {/* Session status */}
      <AnimatePresence>
        {secondsLeft === 0 && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.FADE, ease: EASE.SMOOTH }}
            className="text-sm font-medium text-center"
            style={{ color: theme.color }}
          >
            Session complete! Rest intentionally. {theme.emoji}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Converts a hex color to "r, g, b" string for rgba() usage */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '155, 114, 207';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
