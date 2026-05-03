// FILE: backend/src/routes/mood.ts
// POST /api/mood — receives mood from all 3 sources, calculates mood_color, saves to DB.
// GET  /api/mood — returns recent mood history for the current user.

import { Router } from "express";
import { z } from "zod";
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const questionnaireAnswersSchema = z.object({
  q1: z.number().int().min(1).max(5),
  q2: z.number().int().min(1).max(5),
  q3: z.number().int().min(1).max(5),
  q4: z.number().int().min(1).max(5),
  q5: z.number().int().min(1).max(5),
});

const moodCategorySchema = z.enum([
  "happy",
  "calm",
  "stressed",
  "sad",
  "energetic",
  "focused",
]);

const postMoodSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("questionnaire"),
    answers: questionnaireAnswersSchema,
    category: moodCategorySchema,
    mood_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  z.object({
    source: z.literal("selection"),
    category: moodCategorySchema,
    mood_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  z.object({
    source: z.literal("text"),
    text: z.string().min(3).max(5000),
    sentiment_score: z.number().min(-1).max(1),
    category: moodCategorySchema,
    mood_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
]);

// ─── Mood color map (server-side validation) ──────────────────────────────────
const MOOD_COLOR_MAP = {
  happy: "#FFD166",
  energetic: "#FF9A3C",
  calm: "#74C0A8",
  stressed: "#FF6B6B",
  sad: "#4A5899",
  focused: "#9B72CF",
};

/**
 * POST /api/mood
 * Accepts mood data from questionnaire, selection, or text source.
 * Validates input with Zod, calculates/verifies mood_color, stores to DB.
 *
 * @returns { id, category, mood_color, source, timestamp }
 *
 * Edge case — category/color mismatch from client: server recalculates authoritative color.
 * Edge case — DB insert fails: 500 with actionable error message.
 */
router.post("/", async (req, res) => {
  const parsed = postMoodSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(422).json({
      error: "Invalid mood data.",
      fields: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const data = parsed.data;
  const userId = req.user.id;

  // Server-side authoritative color (client value used only as fallback for new categories)
  const authoritative_color = MOOD_COLOR_MAP[data.category] ?? data.mood_color;
  const sentiment_score = data.source === "text" ? data.sentiment_score : null;

  try {
    const result = await pool.query(
      `INSERT INTO moods
         (user_id, source, category, sentiment_score, mood_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category, mood_color, source, timestamp`,
      [
        userId,
        data.source,
        data.category,
        sentiment_score,
        authoritative_color,
      ],
    );

    const mood = result.rows[0];

    // Trigger streak update (fire-and-forget — don't block mood response)
    pool
      .query(
        `INSERT INTO streaks (user_id, current_streak, longest_streak, last_logged, dominant_mood)
       VALUES ($1, 1, 1, CURRENT_DATE, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         current_streak = CASE
           WHEN streaks.last_logged = CURRENT_DATE - INTERVAL '1 day' THEN streaks.current_streak + 1
           WHEN streaks.last_logged = CURRENT_DATE THEN streaks.current_streak
           ELSE 1
         END,
         longest_streak = GREATEST(
           streaks.longest_streak,
           CASE
             WHEN streaks.last_logged = CURRENT_DATE - INTERVAL '1 day' THEN streaks.current_streak + 1
             ELSE 1
           END
         ),
         last_logged = CURRENT_DATE,
         dominant_mood = $2`,
        [userId, data.category],
      )
      .catch((err) => {
        console.warn(
          "[Streak] Non-critical streak update failed:",
          err.message,
        );
      });

    res.status(201).json({ mood });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /mood] DB insert failed:", message);
    res.status(500).json({ error: "Failed to save mood. Please try again." });
  }
});

/**
 * GET /api/mood
 * Returns the most recent 30 mood entries for the authenticated user.
 * Used by the Constellation chart and Energy Wave analytics.
 *
 * @returns { moods: MoodEntry[] }
 */
router.get("/", async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query["limit"] ?? "30", 10), 100);

  try {
    const result = await pool.query(
      `SELECT id, source, category, sentiment_score, mood_color, timestamp
       FROM moods
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [userId, limit],
    );

    res.json({ moods: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /mood] DB query failed:", message);
    res.status(500).json({ error: "Failed to retrieve mood history." });
  }
});

export default router;
