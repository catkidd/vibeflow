'use client';
// FILE: frontend/app/dashboard/page.tsx
// "The Zen Workspace" — CSS grid layout, animated gradient mesh,
// glassmorphism panels for Pomodoro, Tasks, Streak, and user header.

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GradientMesh from '../components/GradientMesh';
import PomodoroSun from '../components/PomodoroSun';
import TaskBreeze from '../components/TaskBreeze';
import HapticToast from '../components/HapticToast';
import { getMoodTheme, MOOD_THEMES, type MoodCategory } from '@/lib/moodTheme';
import { dashboardContainerVariants, dashboardExpandVariants, DURATION, EASE } from '@/lib/animation';
import { useToast } from '../components/ToastContext';

interface UserSession {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  dominant_mood: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * DashboardPage
 * The main workspace. Reads active mood from localStorage (set by mood entry page).
 * CSS grid layout: left column (Pomodoro + Streak), right column (Tasks).
 * All panels are glassmorphism cards floating above GradientMesh background.
 *
 * Edge case — no mood in localStorage: defaults to 'focused' theme.
 * Edge case — user not authenticated: API calls return 401, redirect to /login.
 * Edge case — streak API fails: shows 0 streak without crashing the dashboard.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { fireToast } = useToast();
  const [user, setUser] = useState<UserSession | null>(null);
  const [mood, setMood] = useState<MoodCategory>('focused');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const theme = getMoodTheme(mood);

  // Load user session and streak
  useEffect(() => {
    // Read active mood from localStorage
    const storedMood = localStorage.getItem('vf_active_mood') as MoodCategory | null;
    if (storedMood && storedMood in MOOD_THEMES) {
      setMood(storedMood);
    }

    // Fetch auth session
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      })
      .then((data: { user: UserSession }) => {
        setUser(data.user);
      })
      .catch(() => {
        router.push('/login');
      });

    // Fetch streak
    fetch(`${API}/api/streaks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { streak: StreakData }) => setStreak(data.streak))
      .catch(() => {/* non-critical */});

    setIsLoaded(true);
  }, [router]);

  // Handle Pomodoro completion
  const handleSessionComplete = useCallback(async (durationMin: number) => {
    try {
      await fetch(`${API}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration_min: durationMin, completed: true }),
      });
    } catch {/* non-critical */}
  }, []);

  // Handle task completion toast
  const handleTaskComplete = useCallback(() => {
    fireToast('general');
  }, [fireToast]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('vf_active_mood');
    router.push('/login');
  }, [router]);

  // Streak flame rendering
  const streakCount = streak?.current_streak ?? 0;
  const streakEmoji = streakCount >= 15 ? '🔥🔥🔥' : streakCount >= 7 ? '🔥🔥' : streakCount >= 3 ? '🔥' : '✨';
  const streakFlameSize = streakCount >= 15 ? 'text-5xl' : streakCount >= 10 ? 'text-4xl' : streakCount >= 7 ? 'text-3xl' : streakCount >= 3 ? 'text-2xl' : 'text-lg';

  return (
    <>
      {/* Animated gradient mesh background */}
      <GradientMesh theme={theme} />

      {/* Toast notification layer */}
      <HapticToast />

      {/* Dashboard content */}
      <div className="min-h-screen p-4 md:p-6">
        <motion.div
          className="max-w-6xl mx-auto flex flex-col gap-5"
          variants={dashboardContainerVariants}
          initial="hidden"
          animate={isLoaded ? 'visible' : 'hidden'}
        >
          {/* ─── Header ──────────────────────────────────────────────── */}
          <motion.header
            variants={dashboardExpandVariants}
            className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            {/* Brand + mood */}
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="VibeFlow">🌊</span>
              <div>
                <h1
                  className="text-lg font-bold text-white leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  VibeFlow
                </h1>
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: theme.color }}>
                  <span role="img" aria-hidden="true">{theme.emoji}</span>
                  {theme.label} mode
                </p>
              </div>
            </div>

            {/* Right side: streak + user */}
            <div className="flex items-center gap-4">
              {/* Streak pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: theme.color20,
                  border: `1px solid ${theme.color40}`,
                }}
                title={`${streakCount}-day streak`}
              >
                <span className={`${streakFlameSize} flame-flicker leading-none`} role="img" aria-label="streak flame">
                  {streakEmoji}
                </span>
                <span className="text-xs font-bold" style={{ color: theme.color }}>
                  {streakCount}d
                </span>
              </div>

              {/* User avatar */}
              {user && (
                <div className="flex items-center gap-2">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.name ?? user.email}
                      className="w-8 h-8 rounded-full border border-white/20"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: theme.color40, color: theme.color }}
                    >
                      {(user.name ?? user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </motion.header>

          {/* ─── Main Grid ───────────────────────────────────────────── */}
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
          >
            {/* ── Left Column ── */}
            <div className="flex flex-col gap-5">
              {/* Pomodoro Sun Panel */}
              <motion.section
                variants={dashboardExpandVariants}
                className="glass p-6 flex flex-col items-center gap-2"
                style={{ boxShadow: `0 0 40px ${theme.color}20` }}
                aria-labelledby="pomodoro-heading"
              >
                <h2
                  id="pomodoro-heading"
                  className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-2"
                >
                  Focus Session
                </h2>
                <PomodoroSun
                  theme={theme}
                  onSessionComplete={handleSessionComplete}
                />
              </motion.section>

              {/* Streak Panel */}
              <motion.section
                variants={dashboardExpandVariants}
                className="glass p-5"
                aria-labelledby="streak-heading"
              >
                <h2
                  id="streak-heading"
                  className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
                >
                  Your Streak
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`${streakFlameSize} flame-flicker`} role="img" aria-label="streak">
                      {streakEmoji}
                    </span>
                    <span className="text-3xl font-bold" style={{ color: theme.color, fontFamily: 'var(--font-display)' }}>
                      {streakCount}
                    </span>
                    <span className="text-xs text-white/40">current</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Longest streak</span>
                        <span style={{ color: theme.color }}>{streak?.longest_streak ?? 0} days</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: streak?.longest_streak
                              ? `${Math.min(100, (streakCount / streak.longest_streak) * 100)}%`
                              : '0%',
                          }}
                          transition={{ duration: 0.8, ease: EASE.SMOOTH, delay: 0.3 }}
                          style={{ backgroundColor: theme.color }}
                        />
                      </div>
                    </div>

                    {streak?.dominant_mood && (
                      <p className="text-xs text-white/40">
                        Dominant mood:{' '}
                        <span className="font-medium" style={{ color: theme.color }}>
                          {streak.dominant_mood}
                        </span>
                      </p>
                    )}

                    {streakCount === 0 && (
                      <p className="text-xs text-white/40">
                        Log your mood daily to build a streak!
                      </p>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* Change Mood CTA */}
              <motion.div variants={dashboardExpandVariants}>
                <motion.button
                  id="change-mood-btn"
                  onClick={() => router.push('/mood')}
                  className="w-full py-3 rounded-2xl text-sm font-medium text-center transition-all"
                  style={{
                    background: theme.color20,
                    border: `1px solid ${theme.color40}`,
                    color: theme.color,
                  }}
                  whileHover={{ scale: 1.02, boxShadow: theme.subtleGlow }}
                  whileTap={{ scale: 0.98 }}
                >
                  {theme.emoji} Update my vibe
                </motion.button>
              </motion.div>
            </div>

            {/* ── Right Column: Tasks ── */}
            <motion.section
              variants={dashboardExpandVariants}
              className="glass p-5"
              aria-labelledby="tasks-heading"
              style={{ minHeight: 400 }}
            >
              <h2
                id="tasks-heading"
                className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
              >
                Task Breeze
              </h2>
              <TaskBreeze
                theme={theme}
                onTaskComplete={handleTaskComplete}
              />
            </motion.section>
          </div>

          {/* ─── Analytics CTA ────────────────────────────────────────── */}
          <motion.div
            variants={dashboardExpandVariants}
            className="glass p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-white/70">Your Flow Analytics</p>
              <p className="text-xs text-white/40 mt-0.5">Constellation chart + Energy waves</p>
            </div>
            <motion.button
              id="analytics-btn"
              onClick={() => router.push('/analytics')}
              className="px-4 py-2 rounded-xl text-xs font-medium"
              style={{
                background: theme.color20,
                border: `1px solid ${theme.color40}`,
                color: theme.color,
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              View Charts →
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
