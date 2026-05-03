// FILE: backend/src/routes/badges.ts — stub (full implementation: Phase 5 — Analytics)
import { Router } from "express";
import { requireAuth } from '../middleware/requireAuth.js';
const router = Router();
router.use(requireAuth);
// GET /api/badges — stub returns empty array until badge logic is implemented in Phase 5
router.get("/", (_req, res) => res.json({ badges: [] }));
export default router;
