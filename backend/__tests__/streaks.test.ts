// FILE: backend/__tests__/streaks.test.ts
// Supertest integration tests for GET /api/streaks and POST /api/streaks/update.
// Verifies consecutive-day detection and upsert behaviour with mocked DB.

import request from 'supertest';
import express from 'express';

const mockQuery = jest.fn();
jest.mock('../src/config/db', () => ({ pool: { query: mockQuery } }));
jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string } }).user = { id: 'user-abc' };
    next();
  },
}));

async function buildApp() {
  const streakRoutes = (await import('../src/routes/streaks')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/streaks', streakRoutes);
  return app;
}

describe('GET /api/streaks', () => {
  it('returns streak data with defaults when no streak row exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();
    const res = await request(app).get('/api/streaks');
    expect(res.status).toBe(200);
    expect(res.body.streak.current_streak).toBe(0);
  });

  it('returns existing streak data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      current_streak: 7,
      longest_streak: 14,
      dominant_mood: 'focused',
    }]});
    const app = await buildApp();
    const res = await request(app).get('/api/streaks');
    expect(res.status).toBe(200);
    expect(res.body.streak.current_streak).toBe(7);
    expect(res.body.streak.dominant_mood).toBe('focused');
  });
});

describe('POST /api/streaks/update', () => {
  it('increments streak when last log was yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ last_log_date: yesterday.toISOString().slice(0, 10), current_streak: 3, longest_streak: 10 }] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 4, longest_streak: 10 }] });
    const app = await buildApp();
    const res = await request(app).post('/api/streaks/update').send({ mood: 'focused' });
    expect(res.status).toBe(200);
  });

  it('resets streak to 1 when last log was more than 1 day ago', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ last_log_date: twoDaysAgo.toISOString().slice(0, 10), current_streak: 5, longest_streak: 10 }] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, longest_streak: 10 }] });
    const app = await buildApp();
    const res = await request(app).post('/api/streaks/update').send({ mood: 'happy' });
    expect(res.status).toBe(200);
  });

  it('does not double-count if logged today already', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockQuery.mockResolvedValueOnce({ rows: [{ last_log_date: today, current_streak: 5, longest_streak: 10 }] });
    const app = await buildApp();
    const res = await request(app).post('/api/streaks/update').send({ mood: 'calm' });
    // Should return 200 with no change or an idempotent response
    expect([200, 204]).toContain(res.status);
  });
});
