// FILE: backend/__tests__/tasks.test.ts
// Supertest integration tests for GET/POST/PATCH/DELETE /api/tasks.
// Auth is mocked via a middleware override — no real DB required for unit layer.
// These tests verify route logic, validation, response shape, and ownership.

import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// ── Mock DB pool ──────────────────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('../src/config/db', () => ({
  pool: { query: mockQuery },
}));

// ── Mock auth middleware — injects a test user ────────────────────────────────
jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string } }).user = { id: 'test-user-123' };
    next();
  },
}));

// ── Build isolated test app ───────────────────────────────────────────────────
async function buildApp() {
  const taskRoutes = (await import('../src/routes/tasks')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', taskRoutes);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns tasks array for authenticated user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: '1', title: 'Write tests', status: 'pending', user_id: 'test-user-123' },
    ]});
    const app = await buildApp();
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('returns empty array when user has no tasks', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(0);
  });
});

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with the new task', async () => {
    const newTask = { id: '2', title: 'New task', status: 'pending', user_id: 'test-user-123' };
    mockQuery.mockResolvedValueOnce({ rows: [newTask] });
    const app = await buildApp();
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('task');
    expect(res.body.task.title).toBe('New task');
  });

  it('returns 422 when title is missing', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(422);
  });

  it('returns 422 when title exceeds 200 characters', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'x'.repeat(201) });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates task status to completed', async () => {
    const task = { id: '1', title: 'Test', status: 'completed', user_id: 'test-user-123' };
    mockQuery
      .mockResolvedValueOnce({ rows: [task] }) // ownership check
      .mockResolvedValueOnce({ rows: [task] }); // update
    const app = await buildApp();
    const res = await request(app)
      .patch('/api/tasks/1')
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
  });

  it('returns 404 when task does not belong to user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ownership check returns nothing
    const app = await buildApp();
    const res = await request(app)
      .patch('/api/tasks/999')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes owned task and returns 200', async () => {
    const task = { id: '1', title: 'Test', user_id: 'test-user-123' };
    mockQuery
      .mockResolvedValueOnce({ rows: [task] }) // ownership check
      .mockResolvedValueOnce({ rows: [] });     // delete
    const app = await buildApp();
    const res = await request(app).delete('/api/tasks/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 404 for non-existent task', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();
    const res = await request(app).delete('/api/tasks/999');
    expect(res.status).toBe(404);
  });
});
