// FILE: backend/src/routes/auth.ts
// Auth routes: Google OAuth login, callback, logout, and /me endpoint.

import { Router } from "express";
import passport from "passport";
import '../config/passport.js'; // register the strategy

const router = Router();

/**
 * GET /auth/login
 * Redirects user to Google consent screen.
 * Requests offline access to receive a refresh token.
 */
router.get(
  "/login",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    accessType: "offline",
    prompt: "consent",
  }),
);

/**
 * GET /auth/callback
 * Google redirects here after user grants permission.
 * On success: redirects to frontend dashboard.
 * On failure: redirects to frontend login page with error param.
 *
 * Edge case — Invalid state / CSRF: Passport rejects automatically.
 * Edge case — User denies access: failure redirect handles gracefully.
 */
router.get(
  "/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/login?error=oauth_failed`,
    session: true,
  }),
  (_req, res) => {
    res.redirect(
      `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard`,
    );
  },
);

/**
 * POST /auth/logout
 * Destroys the session, clears the httpOnly cookie.
 * Preserves in-flight task/journal state on the client (handled frontend).
 */
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(new Error("Failed to destroy session during logout."));
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
});

/**
 * GET /auth/me
 * Returns the currently authenticated user from the session.
 * Returns 401 if no active session exists.
 */
router.get("/me", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json({ user: req.user });
});

export default router;
