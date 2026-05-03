'use client';
// FILE: frontend/app/dashboard/page.tsx
// "The Zen Workspace" — Phase 4 updated with music panel, VibePlayer, MusicGrid.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GradientMesh from '../components/GradientMesh';
import PomodoroSun from '../components/PomodoroSun';
import TaskBreeze from '../components/TaskBreeze';
import HapticToast from '../components/HapticToast';
import MusicGrid, { type TrackResult } from '../components/MusicGrid';
import VibePlayer from '../components/VibePlayer';
import { getMoodTheme, MOOD_THEMES, type MoodCategory } from '@/lib/moodTheme';
import {
  dashboardContainerVariants,
  dashboardExpandVariants,
  DURATION,
  EASE,
} from '@/lib/animation';
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
 * DashboardPage — Phase 4
 * Added: MusicPanel with Spotify connect flow, MusicGrid track cards,
 * VibePlayer PIP, auto-advance on track end.
 *
 * Edge case — Spotify not connected: shows Connect button, hides grid.
 * Edge case — connect_spotify flag in URL (returned from OAuth): triggers fetch.
 * Edge case — token expired mid-session: playlists API returns 401 → shows reconnect.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { fireToast } = useToast();

  // ── Core state ────────────────────────────────────────────────────────────────
  const [user, setUser]     = useState<UserSession | null>(null);
  const [mood, setMood]     = useState<MoodCategory>('focused');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const theme = getMoodTheme(mood);

  // ── Spotify / Music state ─────────────────────────────────────────────────────
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [tracks, setTracks]           = useState<TrackResult[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [activeTrack, setActiveTrack] = useState<TrackResult | null>(null);
  const [musicError, setMusicError]   = useState<string | null>(null);

  // ── Load user + streak + spotify status ──────────────────────────────────────
  useEffect(() => {
    const storedMood = localStorage.getItem('vf_active_mood') as MoodCategory | null;
    if (storedMood && storedMood in MOOD_THEMES) setMood(storedMood);

    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Unauth'); return r.json(); })
      .then((d: { user: UserSession }) => setUser(d.user))
      .catch(() => router.push('/login'));

    fetch(`${API}/api/streaks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { streak: StreakData }) => setStreak(d.streak))
      .catch(() => {});

    // Check spotify token status
    fetch(`${API}/api/spotify/token`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { connected: boolean }) => setSpotifyConnected(d.connected))
      .catch(() => {});

    setIsLoaded(true);
  }, [router]);

  // Check for spotify_connected=1 query param after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === '1') {
      setSpotifyConnected(true);
      window.history.replaceState({}, '', '/dashboard');
    }
    if (params.get('spotify_error')) {
      setMusicError('Spotify connection failed. Please try again.');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // ── Fetch tracks when connected or mood changes ───────────────────────────────
  const fetchTracks = useCallback(async (moodParam: MoodCategory) => {
    setTracksLoading(true);
    setMusicError(null);
    try {
      const res = await fetch(`${API}/api/playlists?mood=${moodParam}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json() as {
        tracks?: TrackResult[];
        error?: string;
        connect_spotify?: boolean;
      };
      if (!res.ok) {
        if (data.connect_spotify) {
          setSpotifyConnected(false);
        }
        setMusicError(data.error ?? 'Failed to load tracks.');
        return;
      }
      setTracks(data.tracks ?? []);
    } catch {
      setMusicError('Could not reach Spotify. Check your connection.');
    } finally {
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (spotifyConnected) fetchTracks(mood);
  }, [spotifyConnected, mood, fetchTracks]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSessionComplete = useCallback(async (durationMin: number) => {
    try {
      await fetch(`${API}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration_min: durationMin, completed: true }),
      });
      fireToast('pomodoro_complete');
    } catch {}
  }, [fireToast]);

  const handleTaskComplete = useCallback(() => {
    fireToast('general');
  }, [fireToast]);

  const handleLogout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('vf_active_mood');
    router.push('/login');
  }, [router]);

  const handleTrackSelect = useCallback((track: TrackResult) => {
    setActiveTrack(track);
  }, []);

  // Auto-advance to next track when preview ends
  const handleTrackEnd = useCallback(() => {
    if (!activeTrack || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === activeTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) setActiveTrack(next);
  }, [activeTrack, tracks]);

  const handleSpotifyConnect = useCallback(() => {
    window.location.href = `${API}/api/spotify/login`;
  }, []);

  const handleSpotifyDisconnect = useCallback(async () => {
    await fetch(`${API}/api/spotify/disconnect`, { method: 'POST', credentials: 'include' });
    setSpotifyConnected(false);
    setTracks([]);
    setActiveTrack(null);
  }, []);

  // ── Streak rendering ──────────────────────────────────────────────────────────
  const streakCount = streak?.current_streak ?? 0;
  const streakEmoji = streakCount >= 15 ? '🔥🔥🔥' : streakCount >= 7 ? '🔥🔥' : streakCount >= 3 ? '🔥' : '✨';
  const streakFlameSize = streakCount >= 15 ? 'text-5xl' : streakCount >= 10 ? 'text-4xl' : streakCount >= 7 ? 'text-3xl' : streakCount >= 3 ? 'text-2xl' : 'text-lg';

  return (
    <>
      <GradientMesh theme={theme} />
      <HapticToast />

      {/* PIP Player — fixed bottom-right */}
      <AnimatePresence>
        {activeTrack && (
          <VibePlayer
            track={activeTrack}
            theme={theme}
            onTrackEnd={handleTrackEnd}
          />
        )}
      </AnimatePresence>

      {/* Dashboard content */}
      <div className="min-h-screen p-4 md:p-6 pb-32">
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

            <div className="flex items-center gap-3">
              {/* Spotify status pill */}
              {spotifyConnected ? (
                <button
                  id="spotify-disconnect-btn"
                  onClick={handleSpotifyDisconnect}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(30,215,96,0.15)', color: '#1ED760', border: '1px solid rgba(30,215,96,0.3)' }}
                  title="Disconnect Spotify"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Spotify
                </button>
              ) : (
                <button
                  id="spotify-connect-btn"
                  onClick={handleSpotifyConnect}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  🎵 Connect Spotify
                </button>
              )}

              {/* Streak pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: theme.color20, border: `1px solid ${theme.color40}` }}
                title={`${streakCount}-day streak`}
              >
                <span className={`${streakFlameSize} leading-none`} role="img" aria-label="streak">{streakEmoji}</span>
                <span className="text-xs font-bold" style={{ color: theme.color }}>{streakCount}d</span>
              </div>

              {/* User */}
              {user && (
                <div className="flex items-center gap-2">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt={user.name ?? user.email} className="w-8 h-8 rounded-full border border-white/20" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: theme.color40, color: theme.color }}
                    >
                      {(user.name ?? user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <button id="logout-btn" onClick={handleLogout} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </motion.header>

          {/* ─── Main Grid ───────────────────────────────────────────── */}
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

            {/* ── Left Column: Pomodoro + Streak + Mood CTA ── */}
            <div className="flex flex-col gap-5">
              <motion.section
                variants={dashboardExpandVariants}
                className="glass p-6 flex flex-col items-center gap-2"
                style={{ boxShadow: `0 0 40px ${theme.color}20` }}
                aria-labelledby="pomodoro-heading"
              >
                <h2 id="pomodoro-heading" className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-2">
                  Focus Session
                </h2>
                <PomodoroSun theme={theme} onSessionComplete={handleSessionComplete} />
              </motion.section>

              <motion.section variants={dashboardExpandVariants} className="glass p-5" aria-labelledby="streak-heading">
                <h2 id="streak-heading" className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
                  Your Streak
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`${streakFlameSize}`} role="img" aria-label="streak">{streakEmoji}</span>
                    <span className="text-3xl font-bold" style={{ color: theme.color, fontFamily: 'var(--font-display)' }}>{streakCount}</span>
                    <span className="text-xs text-white/40">current</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Longest</span>
                        <span style={{ color: theme.color }}>{streak?.longest_streak ?? 0}d</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: streak?.longest_streak ? `${Math.min(100, (streakCount / streak.longest_streak) * 100)}%` : '0%' }}
                          transition={{ duration: 0.8, ease: EASE.SMOOTH, delay: 0.3 }}
                          style={{ backgroundColor: theme.color }}
                        />
                      </div>
                    </div>
                    {streak?.dominant_mood && (
                      <p className="text-xs text-white/40">
                        Dominant: <span className="font-medium" style={{ color: theme.color }}>{streak.dominant_mood}</span>
                      </p>
                    )}
                    {streakCount === 0 && <p className="text-xs text-white/40">Log your mood daily to build a streak!</p>}
                  </div>
                </div>
              </motion.section>

              <motion.div variants={dashboardExpandVariants}>
                <motion.button
                  id="change-mood-btn"
                  onClick={() => router.push('/mood')}
                  className="w-full py-3 rounded-2xl text-sm font-medium text-center"
                  style={{ background: theme.color20, border: `1px solid ${theme.color40}`, color: theme.color }}
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
              <h2 id="tasks-heading" className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
                Task Breeze
              </h2>
              <TaskBreeze theme={theme} onTaskComplete={handleTaskComplete} />
            </motion.section>
          </div>

          {/* ─── Music Panel ──────────────────────────────────────────── */}
          <motion.section
            variants={dashboardExpandVariants}
            className="glass p-5"
            aria-labelledby="music-heading"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="music-heading" className="text-sm font-semibold text-white/60 uppercase tracking-widest">
                  Vibe Soundtrack
                </h2>
                <p className="text-xs text-white/30 mt-0.5">
                  Curated for your <span style={{ color: theme.color }}>{theme.label.toLowerCase()}</span> state
                </p>
              </div>
              {spotifyConnected && (
                <motion.button
                  id="refresh-tracks-btn"
                  onClick={() => fetchTracks(mood)}
                  disabled={tracksLoading}
                  className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: theme.color20, color: theme.color, border: `1px solid ${theme.color40}` }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  aria-label="Refresh track recommendations"
                >
                  {tracksLoading ? '…' : '↻ Refresh'}
                </motion.button>
              )}
            </div>

            {/* Not connected state */}
            {!spotifyConnected && (
              <div className="text-center py-10">
                <span className="text-5xl mb-4 block" role="img" aria-label="music">🎵</span>
                <p className="text-sm text-white/50 mb-2">Connect Spotify to stream music matched to your mood</p>
                <p className="text-xs text-white/30 mb-5">Works with free & premium accounts</p>
                <motion.button
                  id="spotify-connect-cta"
                  onClick={handleSpotifyConnect}
                  className="px-6 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: '#1ED760', color: '#0A0818' }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(30,215,96,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Connect Spotify ↗
                </motion.button>

                {musicError && (
                  <p className="text-xs text-red-400/70 mt-3">{musicError}</p>
                )}
              </div>
            )}

            {/* Error state (connected but API failed) */}
            {spotifyConnected && musicError && !tracksLoading && (
              <div className="text-center py-8 text-white/40 text-sm">
                <p className="mb-3">{musicError}</p>
                <motion.button
                  onClick={() => fetchTracks(mood)}
                  className="text-xs px-4 py-2 rounded-xl"
                  style={{ background: theme.color20, color: theme.color, border: `1px solid ${theme.color40}` }}
                  whileHover={{ scale: 1.04 }}
                >
                  Retry
                </motion.button>
              </div>
            )}

            {/* Track grid */}
            {spotifyConnected && (
              <MusicGrid
                tracks={tracks}
                theme={theme}
                activeTrackId={activeTrack?.id ?? null}
                onTrackSelect={handleTrackSelect}
                isLoading={tracksLoading}
              />
            )}
          </motion.section>

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
              style={{ background: theme.color20, border: `1px solid ${theme.color40}`, color: theme.color }}
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
