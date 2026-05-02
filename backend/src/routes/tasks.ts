// FILE: backend/src/routes/tasks.ts
// Full CRUD for tasks: GET list, POST create, PATCH status, DELETE.
// All queries parameterized. Optimistic UI pairs with these endpoints.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createTaskSchema = z.object({
  description: z.string().min(1).max(500).trim(),
  mood_id: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  description: z.string().min(1).max(500).trim().optional(),
}).refine((d) => d.status !== undefined || d.description !== undefined, {
  message: 'At least one of status or description must be provided',
});

/**
 * GET /api/tasks
 * Returns all non-deleted tasks for the authenticated user.
 * Ordered by status (todo/in_progress first) then creation date.
 *
 * @returns { tasks: Task[] }
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = (req.user as { id: string }).id;

  try {
    const result = await pool.query(
      `SELECT id, description, status, mood_id, created_at, updated_at
       FROM tasks
       WHERE user_id = $1 AND status != 'done'
       ORDER BY
         CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
         created_at DESC
       LIMIT 100`,
      [userId],
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GET /tasks] Failed:', message);
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 * Optionally links to the current active mood.
 *
 * @returns { task: Task }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: 'Invalid task data.',
      fields: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { description, mood_id } = parsed.data;
  const userId = (req.user as { id: string }).id;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, description, mood_id)
       VALUES ($1, $2, $3)
       RETURNING id, description, status, mood_id, created_at, updated_at`,
      [userId, description, mood_id ?? null],
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[POST /tasks] Failed:', message);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

/**
 * PATCH /api/tasks/:id
 * Updates task status or description.
 * Verifies task belongs to the requesting user (prevents cross-user mutation).
 *
 * @returns { task: Task }
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: 'Invalid update data.',
      fields: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { id } = req.params;
  const userId = (req.user as { id: string }).id;
  const { status, description } = parsed.data;

  try {
    // Build dynamic SET clause — only update provided fields
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: (string | null)[] = [id, userId];
    let paramIdx = 3;

    if (status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(status);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(description);
    }

    const result = await pool.query(
      `UPDATE tasks
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING id, description, status, mood_id, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found or not owned by you.' });
      return;
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PATCH /tasks/:id] Failed:', message);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Hard-deletes the task. Verifies ownership before deleting.
 *
 * @returns { message: string }
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req.user as { id: string }).id;

  try {
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found or not owned by you.' });
      return;
    }

    res.json({ message: 'Task deleted.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DELETE /tasks/:id] Failed:', message);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

export default router;
