"use client";
// FILE: frontend/app/components/MusicGrid.tsx
// Responsive track card grid for mood-matched Spotify recommendations.
// Each card shows album art, track name, artists, duration, and mood_fit_reason tooltip.
// Cards animate in with stagger. Hover expands to show the tooltip (150ms delay, per spec).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  staggerContainerVariants,
  staggerItemVariants,
  tooltipVariants,
  DURATION,
  EASE,
} from "@/lib/animation";

/** Formats milliseconds to M:SS */
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = (totalSec % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

/**
 * MusicGrid
 * Responsive auto-fit grid of track cards.
 * Each card:
 *   - Shows album art (lazy loaded, shimmer placeholder on load)
 *   - Track name + artists
 *   - Duration
 *   - On hover: expands to reveal mood_fit_reason tooltip (150ms delay)
 *   - Active card: glows with mood color
 *
 * Edge case — no preview_url: card is still clickable, player shows message.
 * Edge case — no album art: falls back to mood-colored placeholder.
 * Edge case — empty tracks: shows ConnectSpotify prompt passed via isLoading=false tracks=[].
 */
export default function MusicGrid({
  tracks,
  theme,
  activeTrackId,
  onTrackSelect,
  isLoading,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  // Shimmer skeleton placeholder
  if (isLoading) {
    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        aria-label="Loading tracks"
        aria-busy="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} theme={theme} />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-10 text-white/40 text-sm">
        <span className="text-4xl block mb-3" aria-hidden="true">
          🎵
        </span>
        No tracks found for this mood yet.
      </div>
    );
  }

  return (
    <motion.div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      aria-label={`${tracks.length} mood-matched tracks`}
    >
      {tracks.map((track) => {
        const isActive = track.id === activeTrackId;
        const isHovered = track.id === hoveredId;

        return (
          <motion.div
            key={track.id}
            id={`track-card-${track.id}`}
            variants={staggerItemVariants}
            onHoverStart={() => setHoveredId(track.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => onTrackSelect(track)}
            className="relative overflow-hidden rounded-2xl cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${isActive ? theme.color40 : "rgba(255,255,255,0.09)"}`,
              boxShadow: isActive ? theme.subtleGlow : "none",
              transition: "border-color 0.3s ease, box-shadow 0.3s ease",
            }}
            whileHover={{
              scale: 1.03,
              transition: { duration: DURATION.CARD_HOVER, ease: EASE.SMOOTH },
            }}
            whileTap={{ scale: 0.97 }}
            role="button"
            tabIndex={0}
            aria-label={`Play ${track.name} by ${track.artists.join(", ")}`}
            aria-pressed={isActive}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onTrackSelect(track);
            }}
          >
            {/* Album art */}
            <div className="relative w-full aspect-square bg-black/20 overflow-hidden">
              {track.album.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.album.image}
                  alt={`${track.album.name} album art`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-4xl"
                  style={{ background: theme.color20 }}
                  aria-hidden="true"
                >
                  🎵
                </div>
              )}

              {/* Active playing indicator overlay */}
              {isActive && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                  aria-hidden="true"
                >
                  <PlayingBars theme={theme} />
                </div>
              )}

              {/* Hover mood_fit_reason tooltip overlay */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    variants={tooltipVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute inset-0 flex items-end p-2"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                    }}
                    aria-hidden="true"
                  >
                    <p className="text-xs text-white/80 leading-tight">
                      {track.mood_fit_reason}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Track info */}
            <div className="px-3 py-2.5">
              <p
                className="text-xs font-semibold text-white/90 truncate"
                title={track.name}
              >
                {track.name}
              </p>
              <p
                className="text-xs text-white/45 truncate mt-0.5"
                title={track.artists.join(", ")}
              >
                {track.artists.join(", ")}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-white/30">
                  {formatDuration(track.duration_ms)}
                </span>
                {track.preview_url && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: theme.color20, color: theme.color }}
                    aria-label="Preview available"
                  >
                    ▶
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Animated 3-bar equalizer — shown on the active track's album art */
function PlayingBars({ theme }) {
  return (
    <div className="flex items-end gap-0.5 h-5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: theme.color }}
          animate={{ height: ["40%", "100%", "60%", "90%", "40%"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/** Shimmer skeleton card while tracks are loading */
function SkeletonCard({ theme }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      aria-hidden="true"
    >
      <motion.div
        className="w-full aspect-square"
        animate={{
          background: [
            `linear-gradient(90deg, ${theme.color10} 0%, rgba(255,255,255,0.06) 50%, ${theme.color10} 100%)`,
            `linear-gradient(90deg, rgba(255,255,255,0.06) 0%, ${theme.color10} 50%, rgba(255,255,255,0.06) 100%)`,
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />

      <div className="px-3 py-2.5 space-y-2">
        <div className="h-2.5 rounded-full bg-white/10 w-3/4" />
        <div className="h-2 rounded-full bg-white/06 w-1/2" />
      </div>
    </div>
  );
}
