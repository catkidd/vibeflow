// FILE: backend/src/routes/sessions.ts
// POST /api/sessions — records a completed Pomodoro session.
// GET  /api/sessions — returns session history for energy wave chart.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createSessionSchema = z.object({
  duration_min: z.number().int().min(1).max(120).default(25),
  completed: z.boolean().default(false),
  mood_id: z.string().uuid().optional(),
});

/**
 * POST /api/sessions
 * Records a Pomodoro session (focus or break).
 * Links to the current active mood if mood_id provided.
 *
 * @returns { session: Session }
 *
 * Edge case — duration_min out of range: Zod validation returns 422.
 * Edge case — mood_id references non-existent mood: FK constraint caught as 500.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: 'Invalid session data.',
      fields: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { duration_min, completed, mood_id } = parsed.data;
  const userId = (req.user as { id: string }).id;

  try {
    const result = await pool.query(
      `INSERT INTO sessions (user_id, duration_min, completed, mood_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, duration_min, completed, mood_id, start_time`,
      [userId, duration_min, completed, mood_id ?? null],
    );

    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[POST /sessions] Failed:', message);
    res.status(500).json({ error: 'Failed to record session.' });
  }
});

/**
 * GET /api/sessions
 * Returns session history for the past 30 days.
 * Used by the Energy Wave chart (Pomodoros per day, normalized 0–5).
 *
 * @returns { sessions: Session[], dailySummary: DaySummary[] }
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = (req.user as { id: string }).id;
  const days = Math.min(parseInt((req.query['days'] as string) ?? '30', 10), 90);

  try {
    const [sessionsResult, summaryResult] = await Promise.all([
      pool.query(
        `SELECT id, duration_min, completed, mood_id, start_time
         FROM sessions
         WHERE user_id = $1 AND start_time > NOW() - INTERVAL '${days} days'
         ORDER BY start_time DESC
         LIMIT 200`,
        [userId],
      ),
      pool.query(
        `SELECT
           DATE(start_time) as date,
           COUNT(*) FILTER (WHERE completed = true) as completed_count,
           SUM(duration_min) as total_minutes
         FROM sessions
         WHERE user_id = $1 AND start_time > NOW() - INTERVAL '${days} days'
         GROUP BY DATE(start_time)
         ORDER BY date DESC`,
        [userId],
      ),
    ]);

    res.json({
      sessions: sessionsResult.rows,
      dailySummary: summaryResult.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /sessions] Failed:', message);
    res.status(500).json({ error: 'Failed to retrieve sessions.' });
  }
});

export default router;
