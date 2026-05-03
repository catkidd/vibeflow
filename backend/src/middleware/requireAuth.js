// FILE: backend/src/middleware/requireAuth.ts
// Express middleware — rejects unauthenticated requests with HTTP 401.
// Apply to any route that requires a logged-in user.

/**
 * Middleware that enforces authentication on a route.
 * If the request has a valid session, passes to next().
 * Otherwise responds with 401 Unauthorized.
 *
 * Edge case — Session exists but user deserialization fails:
 *   req.isAuthenticated() returns false — 401 is returned.
 * Edge case — Expired session cookie:
 *   connect-pg-simple purges old rows; Passport session read fails gracefully.
 *
 * @param req  - Express Request (typed with Passport session)
 * @param res  - Express Response
 * @param next - Express NextFunction
 */
export function requireAuth(req, res, next) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({
    error: "Authentication required. Please log in via /auth/login.",
  });
}
