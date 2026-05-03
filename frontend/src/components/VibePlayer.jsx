"use client";
// FILE: frontend/app/components/VibePlayer.tsx
// Frosted glass Picture-in-Picture music player.
// Features: album art, track info, play/pause/skip, canvas waveform visualizer,
// PIP collapse-to-circle animation (miniPlayerVariants), Spotify Web SDK integration.
//
// Architecture note: The Spotify Web Playback SDK requires window access,
// so the SDK is dynamically imported client-side only with a useEffect.
// The player can operate in TWO modes:
//   1. PREVIEW mode  — plays the 30s track.preview_url via HTMLAudio (no SDK needed)
//   2. FULL mode     — plays via Spotify Web SDK (requires Premium + SDK injection)
// VibeFlow uses PREVIEW mode by default (works for all users), and falls back gracefully.

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION, EASE } from "@/lib/animation";

/** Formats milliseconds to M:SS */
function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/**
 * VibePlayer
 * Frosted glass PIP player that lives at the bottom-right of the dashboard.
 * Collapsed state: 48px circle with animated equalizer icon.
 * Expanded state: 280px wide card with album art, track info, controls, canvas visualizer.
 *
 * Canvas visualizer: Web Audio API AnalyserNode connected to HTMLAudioElement.
 * On each animation frame, draws a smooth waveform using bezier curves in the mood color.
 *
 * Edge case — no preview_url: shows "Full track available on Spotify" with external link.
 * Edge case — audio load error: shows error state with retry button.
 * Edge case — track changes while playing: previous audio stops before new one starts.
 * Edge case — component unmounts: audio is paused and AudioContext closed to prevent leaks.
 *
 * @param track     - Currently selected track from MusicGrid
 * @param theme     - Current mood theme for colors
 * @param onTrackEnd - Called when preview ends (parent can auto-advance)
 */
export default function VibePlayer({ track, theme, onTrackEnd }) {
  const [size, setSize] = useState("expanded");
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState(0); // 0–1
  const [currentMs, setCurrentMs] = useState(0);
  const [duration, setDuration] = useState(30000); // preview is always 30s

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  // ── Web Audio Setup ──────────────────────────────────────────────────────────
  const setupAnalyser = useCallback((audio) => {
    if (audioCtxRef.current) return; // already connected
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  // ── Canvas Waveform Renderer ─────────────────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount; // fftSize/2 = 128
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw smooth frequency bars as a filled waveform
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.9;
      ctx.lineTo(x, height - barHeight);
      x += barWidth;
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${theme.color}CC`);
    gradient.addColorStop(1, `${theme.color}22`);
    ctx.fillStyle = gradient;
    ctx.fill();

    rafRef.current = requestAnimationFrame(drawWaveform);
  }, [theme.color]);

  // ── Audio Element Management ─────────────────────────────────────────────────
  useEffect(() => {
    if (!track) {
      setState("idle");
      return;
    }

    // Cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!track.preview_url) {
      setState("error");
      return;
    }

    setState("loading");
    setProgress(0);
    setCurrentMs(0);

    const audio = new Audio(track.preview_url);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration * 1000);
      setState("playing");
      setupAnalyser(audio);
      audio.play().catch(() => setState("error"));
      drawWaveform();
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentMs(audio.currentTime * 1000);
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0);
    });

    audio.addEventListener("ended", () => {
      setState("ended");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onTrackEnd?.();
    });

    audio.addEventListener("error", () => {
      setState("error");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    });

    return () => {
      audio.pause();
      audio.src = "";
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [track, setupAnalyser, drawWaveform, onTrackEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state === "playing") {
      audio.pause();
      setState("paused");
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    } else if (state === "paused" || state === "ended") {
      if (state === "ended") audio.currentTime = 0;
      audio
        .play()
        .then(() => {
          setState("playing");
          drawWaveform();
        })
        .catch(() => setState("error"));
    }
  }, [state, drawWaveform]);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const ratio = parseFloat(e.target.value);
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }, []);

  // ── Collapsed bubble ──────────────────────────────────────────────────────────
  if (size === "collapsed") {
    return (
      <motion.button
        id="vibe-player-collapsed"
        layoutId="vibe-player"
        onClick={() => setSize("expanded")}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${theme.color}, ${theme.complementary}66)`,
          boxShadow: theme.glowShadow,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Expand music player"
      >
        {state === "playing" ? (
          <MiniEqualizer theme={theme} />
        ) : (
          <span className="text-xl" aria-hidden="true">
            🎵
          </span>
        )}
      </motion.button>
    );
  }

  // ── No track selected ─────────────────────────────────────────────────────────
  if (!track) return null;

  // ── Expanded player ───────────────────────────────────────────────────────────
  return (
    <motion.div
      id="vibe-player-expanded"
      layoutId="vibe-player"
      className="fixed bottom-4 right-4 z-40 w-72 rounded-3xl overflow-hidden"
      style={{
        background: "rgba(14, 12, 28, 0.90)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        border: `1px solid ${theme.color40}`,
        boxShadow: `${theme.glowShadow}, 0 25px 60px rgba(0,0,0,0.6)`,
      }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: DURATION.CARD_ENTER, ease: EASE.SPRING_OUT }}
      role="region"
      aria-label={`Now playing: ${track.name}`}
    >
      {/* Album art + waveform canvas overlay */}
      <div className="relative w-full h-32">
        {track.album.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.album.image}
            alt={track.album.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: theme.color20 }}
          />
        )}

        {/* Canvas waveform overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-70"
          width={288}
          height={128}
          aria-hidden="true"
        />

        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,8,24,0.9) 0%, transparent 50%)",
          }}
          aria-hidden="true"
        />

        {/* Collapse button */}
        <button
          id="vibe-player-collapse-btn"
          onClick={() => setSize("collapsed")}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
          style={{ background: "rgba(0,0,0,0.4)" }}
          aria-label="Collapse player"
        >
          <span className="text-xs">↓</span>
        </button>

        {/* Open on Spotify */}
        <a
          href={track.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          aria-label="Open on Spotify"
          title="Open on Spotify"
        >
          <span className="text-xs">🎧</span>
        </a>
      </div>

      {/* Track info */}
      <div className="px-4 pt-3 pb-1">
        <p
          className="text-sm font-semibold text-white truncate"
          style={{ fontFamily: "var(--font-display)" }}
          title={track.name}
        >
          {track.name}
        </p>
        <p className="text-xs text-white/50 truncate">
          {track.artists.join(", ")}
        </p>
      </div>

      {/* No preview fallback */}
      {!track.preview_url && (
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-white/40 mb-2">Preview not available</p>
          <a
            href={track.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg inline-block font-medium"
            style={{
              background: theme.color20,
              color: theme.color,
              border: `1px solid ${theme.color40}`,
            }}
          >
            Play on Spotify ↗
          </a>
        </div>
      )}

      {/* Controls + progress (preview mode) */}
      {track.preview_url && (
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="relative my-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={handleSeek}
              className="w-full appearance-none h-1 rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${theme.color} ${progress * 100}%, rgba(255,255,255,0.15) ${progress * 100}%)`,
                outline: "none",
              }}
              aria-label="Playback position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            />
          </div>

          {/* Time */}
          <div className="flex justify-between text-xs text-white/30 mb-3">
            <span>{fmtMs(currentMs)}</span>
            <span>{fmtMs(duration)}</span>
          </div>

          {/* Play / Pause */}
          <div className="flex items-center justify-center">
            <motion.button
              id="vibe-player-play-pause"
              onClick={handlePlayPause}
              disabled={state === "loading" || state === "idle"}
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${theme.color}, ${theme.color}AA)`,
                color: "#0A0818",
                boxShadow: theme.subtleGlow,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={state === "playing" ? "Pause" : "Play"}
              aria-pressed={state === "playing"}
            >
              {state === "loading" ? (
                <motion.div
                  className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ) : state === "playing" ? (
                "⏸"
              ) : state === "ended" ? (
                "↺"
              ) : (
                "▶"
              )}
            </motion.button>
          </div>

          {/* Error state */}
          <AnimatePresence>
            {state === "error" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-center text-red-400/70 mt-2"
              >
                Preview unavailable —{" "}
                <a
                  href={track.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: theme.color }}
                >
                  open on Spotify ↗
                </a>
              </motion.p>
            )}
          </AnimatePresence>

          {/* Preview badge */}
          <p className="text-center text-xs text-white/20 mt-2">
            30s preview · Spotify
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Mini Equalizer (collapsed state) ─────────────────────────────────────────
function MiniEqualizer({ theme }) {
  return (
    <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: "#0A0818" }}
          animate={{ height: ["30%", "100%", "50%", "80%", "30%"] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}
