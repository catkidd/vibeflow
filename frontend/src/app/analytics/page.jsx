"use client";
// FILE: frontend/app/analytics/page.tsx
// PHASE 5 — Flow Analytics: "The Constellation View"
// Four Recharts panels:
//   1. Focus Minutes (30-day area chart, mood-colored gradient)
//   2. Mood Distribution (radial bar chart)
//   3. Session Heatmap (7×5 calendar grid, CSS-only, no lib needed)
//   4. Streak Insight card

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  CartesianGrid,
} from "recharts";
import GradientMesh from "@/components/GradientMesh";
import { getMoodTheme, MOOD_THEMES } from "@/lib/moodTheme";
import {
  dashboardContainerVariants,
  dashboardExpandVariants,
  EASE,
} from "@/lib/animation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Mood color map ───────────────────────────────────────────────────────────
const MOOD_COLORS = {
  happy: "#F9E04B",
  energetic: "#FF6B6B",
  calm: "#A8D8EA",
  stressed: "#C9B8FF",
  sad: "#7EB8D4",
  focused: "#00F5C4",
};

const MOOD_LABELS = {
  happy: "Happy",
  energetic: "Energetic",
  calm: "Calm",
  stressed: "Stressed",
  sad: "Sad",
  focused: "Focused",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns last N days as 'MMM D' labels */
function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
}

/**
 * AnalyticsPage — "The Constellation View"
 * Four glassmorphism panels visualizing 30 days of productivity data.
 *
 * Data sources:
 *   GET /api/sessions → daily_summary[] for area chart + heatmap
 *   GET /api/streaks  → streak card data
 *
 * Edge case — no session data: shows empty-state illustration per panel.
 * Edge case — unauthenticated: redirects to /login.
 * Edge case — mood not in localStorage: defaults to 'focused' theme.
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const [mood, setMood] = useState("focused");
  const [isLoaded, setIsLoaded] = useState(false);

  // Data state
  const [sessions, setSessions] = useState([]);
  const [streak, setStreak] = useState(null);
  const [moodDist, setMoodDist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = getMoodTheme(mood);

  // Build chart-ready session data merged with all 30 days
  const chartData = (() => {
    const days = getLast30Days();
    const lookup = new Map(sessions.map((s) => [s.date, s]));
    return days.map((date) => {
      const s = lookup.get(date);
      return {
        date,
        label: formatDateLabel(date),
        minutes: s?.total_minutes ?? 0,
        sessions: s?.session_count ?? 0,
      };
    });
  })();

  const totalMinutes = sessions.reduce((a, s) => a + s.total_minutes, 0);
  const totalSessions = sessions.reduce((a, s) => a + s.session_count, 0);
  const avgMinPerDay = sessions.length > 0 ? Math.round(totalMinutes / 30) : 0;
  const peakDay = chartData.reduce(
    (a, b) => (a.minutes > b.minutes ? a : b),
    chartData[0] ?? { label: "—", minutes: 0 },
  );

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, streakRes] = await Promise.all([
        fetch(`${API}/api/sessions`, { credentials: "include" }),
        fetch(`${API}/api/streaks`, { credentials: "include" }),
      ]);

      if (sessRes.status === 401 || streakRes.status === 401) {
        router.push("/login");
        return;
      }

      const sessData = await sessRes.json();
      const streakData = await streakRes.json();

      setSessions(sessData.daily_summary ?? []);
      setStreak(streakData.streak ?? null);

      // Build mood distribution from sessions that have avg_mood
      const moodCounts = {};
      (sessData.daily_summary ?? []).forEach((s) => {
        if (s.avg_mood) {
          moodCounts[s.avg_mood] =
            (moodCounts[s.avg_mood] ?? 0) + s.session_count;
        }
      });
      const total = Object.values(moodCounts).reduce((a, b) => a + b, 0) || 1;
      const dist = Object.entries(moodCounts)
        .map(([m, count]) => ({
          mood: m,
          count,
          percentage: Math.round((count / total) * 100),
          color: MOOD_COLORS[m] ?? "#ffffff",
        }))
        .sort((a, b) => b.count - a.count);
      setMoodDist(dist);
    } catch {
      setError("Failed to load analytics. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const storedMood = localStorage.getItem("vf_active_mood");
    if (storedMood && storedMood in MOOD_THEMES) setMood(storedMood);
    fetchAnalytics();
    setIsLoaded(true);
  }, [fetchAnalytics]);

  // ── Custom tooltip for area chart ─────────────────────────────────────────────
  const AreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="px-3 py-2 rounded-xl text-xs"
        style={{
          background: "rgba(10,8,24,0.95)",
          border: `1px solid ${theme.color40}`,
          backdropFilter: "blur(10px)",
        }}
      >
        <p className="text-white/60 mb-1">{label}</p>
        <p className="font-semibold" style={{ color: theme.color }}>
          {payload[0].value} min focus
        </p>
      </div>
    );
  };

  return (
    <>
      <GradientMesh theme={theme} />

      <div className="min-h-screen p-4 md:p-6">
        <motion.div
          className="max-w-5xl mx-auto flex flex-col gap-5"
          variants={dashboardContainerVariants}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
        >
          {/* ─── Header ──────────────────────────────────────────────── */}
          <motion.header
            variants={dashboardExpandVariants}
            className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="flex items-center gap-3">
              <button
                id="analytics-back-btn"
                onClick={() => router.push("/dashboard")}
                className="text-white/40 hover:text-white/80 transition-colors text-sm"
                aria-label="Back to dashboard"
              >
                ← Dashboard
              </button>
              <span className="text-white/20">|</span>
              <div>
                <h1
                  className="text-lg font-bold text-white leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Flow Analytics
                </h1>
                <p className="text-xs mt-0.5" style={{ color: theme.color }}>
                  {theme.emoji} Last 30 days · {theme.label} mode
                </p>
              </div>
            </div>
            <motion.button
              id="analytics-refresh-btn"
              onClick={fetchAnalytics}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-xl disabled:opacity-40"
              style={{
                background: theme.color20,
                color: theme.color,
                border: `1px solid ${theme.color40}`,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              {loading ? "…" : "↻ Refresh"}
            </motion.button>
          </motion.header>

          {/* Error state */}
          {error && (
            <motion.div
              variants={dashboardExpandVariants}
              className="glass p-5 text-center text-sm text-red-400/70"
            >
              {error}
            </motion.div>
          )}

          {/* ─── KPI Row ─────────────────────────────────────────────── */}
          <motion.div
            variants={dashboardExpandVariants}
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            }}
          >
            {[
              { label: "Total sessions", value: totalSessions, suffix: "" },
              { label: "Focus minutes", value: totalMinutes, suffix: "min" },
              {
                label: "Daily average",
                value: avgMinPerDay,
                suffix: "min/day",
              },
              {
                label: "Current streak",
                value: streak?.current_streak ?? 0,
                suffix: "d",
              },
              {
                label: "Best streak",
                value: streak?.longest_streak ?? 0,
                suffix: "d",
              },
              {
                label: "Peak day",
                value: peakDay?.minutes ?? 0,
                suffix: "min",
              },
            ].map((kpi) => (
              <KPICard
                key={kpi.label}
                theme={theme}
                loading={loading}
                {...kpi}
              />
            ))}
          </motion.div>

          {/* ─── Focus Minutes Area Chart ─────────────────────────────── */}
          <motion.section
            variants={dashboardExpandVariants}
            className="glass p-5"
            aria-labelledby="focus-chart-heading"
          >
            <h2
              id="focus-chart-heading"
              className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
            >
              Focus Minutes · 30-day trend
            </h2>

            {loading ? (
              <ChartSkeleton theme={theme} />
            ) : totalSessions === 0 ? (
              <EmptyChart label="No sessions recorded yet. Start a Pomodoro!" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="focusGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={theme.color}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                  />

                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    unit="m"
                  />

                  <Tooltip content={<AreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke={theme.color}
                    strokeWidth={2}
                    fill="url(#focusGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: theme.color,
                      stroke: "rgba(10,8,24,0.8)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.section>

          {/* ─── Mood Distribution + Heatmap row ─────────────────────── */}
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {/* Mood Distribution radial bars */}
            <motion.section
              variants={dashboardExpandVariants}
              className="glass p-5"
              aria-labelledby="mood-dist-heading"
            >
              <h2
                id="mood-dist-heading"
                className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
              >
                Mood distribution
              </h2>

              {loading ? (
                <ChartSkeleton theme={theme} height={160} />
              ) : moodDist.length === 0 ? (
                <EmptyChart
                  label="Log moods daily to see your patterns"
                  height={160}
                />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="20%"
                      outerRadius="90%"
                      data={moodDist.map((m) => ({
                        name: MOOD_LABELS[m.mood] ?? m.mood,
                        value: m.percentage,
                        fill: m.color,
                      }))}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar dataKey="value" cornerRadius={4} />
                      <Legend
                        iconSize={8}
                        formatter={(value) => (
                          <span
                            style={{
                              color: "rgba(255,255,255,0.55)",
                              fontSize: 11,
                            }}
                          >
                            {value}
                          </span>
                        )}
                      />

                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div
                              className="px-3 py-2 rounded-xl text-xs"
                              style={{
                                background: "rgba(10,8,24,0.95)",
                                border: `1px solid ${d.payload.fill}55`,
                              }}
                            >
                              <span style={{ color: d.payload.fill }}>
                                {d.payload.name}:{" "}
                              </span>
                              <span className="text-white/80">{d.value}%</span>
                            </div>
                          );
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </>
              )}
            </motion.section>

            {/* Session Heatmap — 30-day calendar grid */}
            <motion.section
              variants={dashboardExpandVariants}
              className="glass p-5"
              aria-labelledby="heatmap-heading"
            >
              <h2
                id="heatmap-heading"
                className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
              >
                Session heatmap
              </h2>
              <SessionHeatmap
                sessions={sessions}
                theme={theme}
                loading={loading}
              />
            </motion.section>
          </div>

          {/* ─── Streak Insight Card ──────────────────────────────────── */}
          <motion.section
            variants={dashboardExpandVariants}
            className="glass p-5"
            aria-labelledby="streak-insight-heading"
          >
            <h2
              id="streak-insight-heading"
              className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4"
            >
              Streak insight
            </h2>
            <StreakInsight streak={streak} theme={theme} loading={loading} />
          </motion.section>
        </motion.div>
      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** KPI metric tile */
function KPICard({ label, value, suffix, theme, loading }) {
  return (
    <motion.div
      className="glass p-4 flex flex-col gap-1"
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
    >
      <span className="text-xs text-white/40 uppercase tracking-wide">
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-16 rounded-lg bg-white/10 animate-pulse mt-1" />
      ) : (
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl font-bold"
            style={{ color: theme.color, fontFamily: "var(--font-display)" }}
          >
            {value}
          </span>
          {suffix && <span className="text-xs text-white/30">{suffix}</span>}
        </div>
      )}
    </motion.div>
  );
}

/** 30-day session heatmap */
function SessionHeatmap({ sessions, theme, loading }) {
  const days = getLast30Days();
  const lookup = new Map(sessions.map((s) => [s.date, s]));
  const maxMin = Math.max(...sessions.map((s) => s.total_minutes), 1);

  if (loading) return <ChartSkeleton theme={theme} height={120} />;

  return (
    <div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
        role="grid"
        aria-label="Session heatmap for the last 30 days"
      >
        {days.map((date) => {
          const s = lookup.get(date);
          const intensity = s ? Math.max(0.15, s.total_minutes / maxMin) : 0;
          const label = `${formatDateLabel(date)}: ${s?.total_minutes ?? 0}m`;
          return (
            <div
              key={date}
              className="aspect-square rounded-md cursor-default transition-all"
              style={{
                background: s
                  ? `rgba(${hexToRgb(theme.color)}, ${intensity})`
                  : "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.04)`,
              }}
              title={label}
              role="gridcell"
              aria-label={label}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-white/25">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Streak insight with milestones */
function StreakInsight({ streak, theme, loading }) {
  if (loading) return <ChartSkeleton theme={theme} height={80} />;
  if (!streak)
    return (
      <EmptyChart label="Start logging daily to build a streak!" height={80} />
    );

  const current = streak.current_streak;
  const best = streak.longest_streak;
  const pct = best > 0 ? Math.min(100, (current / best) * 100) : 0;

  const milestones = [
    { days: 3, label: "Budding", emoji: "🌱" },
    { days: 7, label: "Week streak", emoji: "🔥" },
    { days: 14, label: "Fortnight", emoji: "🔥🔥" },
    { days: 30, label: "Monthly", emoji: "🏆" },
  ];
  const nextMilestone = milestones.find((m) => m.days > current);

  return (
    <div className="flex flex-col gap-4">
      {/* Current vs Best bar */}
      <div className="flex items-end gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl">
            {current >= 30
              ? "🏆"
              : current >= 14
                ? "🔥🔥"
                : current >= 7
                  ? "🔥"
                  : current >= 3
                    ? "🌱"
                    : "✨"}
          </span>
          <span
            className="text-3xl font-bold"
            style={{ color: theme.color, fontFamily: "var(--font-display)" }}
          >
            {current}
          </span>
          <span className="text-xs text-white/40">current</span>
        </div>

        <div className="flex-1">
          <div className="flex justify-between text-xs text-white/40 mb-1.5">
            <span>Progress to best ({best}d)</span>
            <span style={{ color: theme.color }}>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: EASE.SMOOTH, delay: 0.4 }}
              style={{
                background: `linear-gradient(90deg, ${theme.color}, ${theme.complementary ?? theme.color})`,
              }}
            />
          </div>

          {/* Milestone markers */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {milestones.map((m) => (
              <span
                key={m.days}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    current >= m.days
                      ? theme.color20
                      : "rgba(255,255,255,0.05)",
                  color:
                    current >= m.days ? theme.color : "rgba(255,255,255,0.25)",
                  border: `1px solid ${current >= m.days ? theme.color40 : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {m.emoji} {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Next milestone hint */}
      {nextMilestone && current < 30 && (
        <p className="text-xs text-white/35">
          🎯 {nextMilestone.days - current} more day
          {nextMilestone.days - current !== 1 ? "s" : ""} to earn{" "}
          <span style={{ color: theme.color }}>
            {nextMilestone.emoji} {nextMilestone.label}
          </span>
        </p>
      )}

      {/* Dominant mood */}
      {streak.dominant_mood && (
        <p className="text-xs text-white/35">
          Most common mood:{" "}
          <span
            className="font-medium"
            style={{ color: MOOD_COLORS[streak.dominant_mood] ?? theme.color }}
          >
            {MOOD_LABELS[streak.dominant_mood] ?? streak.dominant_mood}
          </span>
        </p>
      )}
    </div>
  );
}

/** Chart loading skeleton */
function ChartSkeleton({ theme, height = 200 }) {
  return (
    <motion.div
      className="w-full rounded-xl"
      style={{ height, background: theme.color10 ?? "rgba(255,255,255,0.04)" }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

/** Empty state for charts */
function EmptyChart({ label, height = 200 }) {
  return (
    <div
      className="w-full flex items-center justify-center rounded-xl text-xs text-white/30 text-center px-4"
      style={{ height }}
    >
      {label}
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
/** Converts hex color to RGB string for use in rgba() */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
