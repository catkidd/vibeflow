// FILE: backend/src/routes/playlists.ts — stub (full implementation: Phase 4 — Spotify integration)
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
const router = Router();
router.use(requireAuth);
// GET /api/playlists — stub returns empty array until Spotify OAuth is wired in Phase 4
router.get('/', (_req, res) => res.json({ playlists: [] }));
export default router;
