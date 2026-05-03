// FILE: backend/src/routes/streaks.ts
// GET /api/streaks — returns current streak for authenticated user.
// POST /api/streaks/update — upserts streak (called automatically by mood POST).

import { Router } from "express";
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/streaks
 * Returns the authenticated user's streak data.
 * Returns zeros if no streak record exists yet.
 *
 * @returns { streak: StreakData }
 */
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT current_streak, longest_streak, last_logged, dominant_mood
       FROM streaks
       WHERE user_id = $1`,
      [userId],
    );

    const streak = result.rows[0] ?? {
      current_streak: 0,
      longest_streak: 0,
      last_logged: null,
      dominant_mood: null,
    };

    res.json({ streak });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /streaks] Failed:", message);
    res.status(500).json({ error: "Failed to retrieve streak data." });
  }
});

/**
 * POST /api/streaks/update
 * Manual streak update endpoint (mood POST triggers this automatically).
 * Useful for testing and future daily reminder integrations.
 *
 * @returns { streak: StreakData }
 */
router.post("/update", async (req, res) => {
  const userId = req.user.id;
  const dominant_mood = req.body.dominant_mood ?? "focused";

  try {
    const result = await pool.query(
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
         dominant_mood = $2
       RETURNING current_streak, longest_streak, last_logged, dominant_mood`,
      [userId, dominant_mood],
    );

    res.json({ streak: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /streaks/update] Failed:", message);
    res.status(500).json({ error: "Failed to update streak." });
  }
});

export default router;
