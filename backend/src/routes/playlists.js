// FILE: backend/src/routes/playlists.ts
// GET /api/playlists — Mood-aware track recommendations via Spotify Recommendations API.
// Returns curated tracks matching the current mood's audio feature targets.
// Each track includes a mood_fit_reason string for the tooltip in MusicGrid.

import { Router } from "express";
import { z } from "zod";
import { createSpotifyApi } from '../config/spotify.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

/** Helper to access express-session data with an index signature for custom keys */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSession(req) {
  return req.session;
}

// ─── Mood → Audio Features Map ────────────────────────────────────────────────
// Each mood maps to Spotify Recommendation API target/min/max audio features.
// Source: VibeFlow master spec v2, section 4.2

const MOOD_PROFILES = {
  happy: {
    features: {
      min_valence: 0.7,
      target_valence: 0.85,
      min_energy: 0.65,
      target_energy: 0.8,
      min_tempo: 115,
      target_tempo: 128,
      limit: 20,
    },
    seed_genres: ["pop", "happy", "dance"],
    reason: "High valence & energy — matched your joyful vibe",
  },
  energetic: {
    features: {
      min_energy: 0.85,
      target_energy: 0.95,
      min_tempo: 135,
      target_tempo: 150,
      min_danceability: 0.7,
      target_danceability: 0.85,
      limit: 20,
    },
    seed_genres: ["edm", "work-out", "electronic"],
    reason: "Max energy, high tempo — fueling your momentum",
  },
  calm: {
    features: {
      min_valence: 0.35,
      max_valence: 0.65,
      target_valence: 0.5,
      max_energy: 0.4,
      target_energy: 0.25,
      min_acousticness: 0.6,
      target_acousticness: 0.8,
      limit: 20,
    },
    seed_genres: ["acoustic", "ambient", "chill"],
    reason: "Low energy, acoustic texture — matching your peaceful state",
  },
  stressed: {
    features: {
      min_instrumentalness: 0.65,
      target_instrumentalness: 0.85,
      max_energy: 0.45,
      target_energy: 0.3,
      min_tempo: 78,
      max_tempo: 105,
      target_tempo: 90,
      limit: 20,
    },
    seed_genres: ["ambient", "classical", "study"],
    reason: "Instrumental & low energy — helping you de-stress",
  },
  sad: {
    features: {
      max_valence: 0.35,
      target_valence: 0.2,
      max_energy: 0.4,
      target_energy: 0.25,
      max_tempo: 95,
      target_tempo: 80,
      limit: 20,
    },
    seed_genres: ["sad", "singer-songwriter", "indie"],
    reason: "Low valence & tempo — reflecting and validating your feeling",
  },
  focused: {
    features: {
      min_instrumentalness: 0.75,
      target_instrumentalness: 0.9,
      min_energy: 0.45,
      max_energy: 0.72,
      target_energy: 0.6,
      min_tempo: 95,
      max_tempo: 125,
      target_tempo: 110,
      limit: 20,
    },
    seed_genres: ["study", "classical", "piano"],
    reason: "High instrumentalness, moderate energy — optimized for deep work",
  },
};

const querySchema = z.object({
  mood: z
    .enum(["happy", "energetic", "calm", "stressed", "sad", "focused"])
    .default("focused"),
  limit: z.coerce.number().int().min(5).max(50).default(20),
});

/**
 * GET /api/playlists
 * Returns mood-matched track recommendations from Spotify.
 *
 * Query params:
 *   mood  - MoodCategory (default: 'focused')
 *   limit - number of tracks (default: 20, max: 50)
 *
 * Edge case — no Spotify token: returns 401 with connect_spotify flag.
 * Edge case — Spotify API error: returns 502 (upstream failure, not user error).
 * Edge case — mood not provided: defaults to 'focused' via Zod.
 *
 * @returns { tracks: TrackResult[], mood: string, total: number }
 */
router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(422)
      .json({
        error: "Invalid query params.",
        fields: parsed.error.flatten().fieldErrors,
      });
    return;
  }

  const { mood, limit } = parsed.data;
  const sess = getSession(req);
  const accessToken = sess["spotify_access_token"];

  if (!accessToken) {
    res.status(401).json({
      error: "Spotify not connected. Please authorize Spotify.",
      connect_spotify: true,
    });
    return;
  }

  const profile = MOOD_PROFILES[mood];
  const spotify = createSpotifyApi();
  spotify.setAccessToken(accessToken);

  try {
    const recsResponse = await spotify.getRecommendations({
      seed_genres: profile.seed_genres,
      ...profile.features,
      limit,
    });

    const tracks = recsResponse.body.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name),
      album: {
        name: track.album.name,
        image: track.album.images[0]?.url ?? null,
      },
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      uri: track.uri,
      mood_fit_reason: profile.reason,
    }));

    res.json({ tracks, mood, total: tracks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /playlists] Spotify API error:", message);

    // Detect expired token
    if (
      message.includes("401") ||
      message.toLowerCase().includes("unauthorized")
    ) {
      res.status(401).json({
        error: "Spotify token expired. Please reconnect.",
        connect_spotify: true,
      });
      return;
    }

    res
      .status(502)
      .json({
        error: "Failed to fetch tracks from Spotify. Try again shortly.",
      });
  }
});

export default router;
