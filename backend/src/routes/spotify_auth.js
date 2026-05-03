// FILE: backend/src/routes/spotify_auth.ts
// Spotify OAuth 2.0 Authorization Code Flow.
// GET  /api/spotify/login      → redirects to Spotify consent screen
// GET  /api/spotify/callback   → exchanges code for tokens, stores in session
// POST /api/spotify/refresh    → refreshes access token silently
// POST /api/spotify/disconnect → removes spotify tokens from session
// GET  /api/spotify/me         → returns connected Spotify profile

import { Router } from "express";
import { createSpotifyApi, SPOTIFY_SCOPES } from '../config/spotify.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

/** Helper to access express-session data with an index signature for custom keys */
function getSession(req) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return req.session;
}

/** Crypto-random state generator to prevent CSRF */
function randomState() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * GET /api/spotify/login
 * Redirects the authenticated VibeFlow user to Spotify's OAuth consent screen.
 * State param is stored in session to validate callback authenticity.
 *
 * Edge case — user already connected: still redirects, Spotify will show quick approval.
 */
router.get("/login", requireAuth, (req, res) => {
  const spotify = createSpotifyApi();
  const state = randomState();

  // Store state in session to validate on callback
  getSession(req)["spotify_oauth_state"] = state;

  const authUrl = spotify.createAuthorizeURL(SPOTIFY_SCOPES, state);
  res.redirect(authUrl);
});

/**
 * GET /api/spotify/callback
 * Handles the OAuth callback from Spotify.
 * Exchanges the authorization code for access + refresh tokens.
 * Stores tokens in the session (server-side, secure).
 *
 * Edge case — state mismatch: rejects with 403.
 * Edge case — code exchange failure: redirects to frontend with error param.
 */
router.get("/callback", requireAuth, async (req, res) => {
  const { code, state, error } = req.query;
  const storedState = getSession(req)["spotify_oauth_state"];
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

  if (error) {
    console.error("[Spotify Callback] User denied access:", error);
    res.redirect(`${frontendUrl}/dashboard?spotify_error=access_denied`);
    return;
  }

  if (!state || state !== storedState) {
    console.error("[Spotify Callback] State mismatch — possible CSRF");
    res.status(403).json({ error: "State mismatch. Possible CSRF attack." });
    return;
  }

  // Clear state from session after use
  delete getSession(req)["spotify_oauth_state"];

  const spotify = createSpotifyApi();

  try {
    const data = await spotify.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Store tokens in session — never expose refresh_token to frontend
    const sess = getSession(req);
    sess["spotify_access_token"] = access_token;
    sess["spotify_refresh_token"] = refresh_token;
    sess["spotify_token_expires"] = Date.now() + expires_in * 1000;

    console.log(
      `[Spotify Auth] User connected. Token expires in ${expires_in}s`,
    );
    res.redirect(`${frontendUrl}/dashboard?spotify_connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Spotify Callback] Token exchange failed:", message);
    res.redirect(
      `${frontendUrl}/dashboard?spotify_error=token_exchange_failed`,
    );
  }
});

/**
 * POST /api/spotify/refresh
 * Silently refreshes the Spotify access token using the stored refresh token.
 * Called by the frontend before any Spotify API call when the token is near-expiry.
 *
 * Edge case — no refresh token in session: returns 401 (user must reconnect).
 * Edge case — Spotify rejects refresh: returns 401.
 *
 * @returns { access_token: string, expires_in: number }
 */
router.post("/refresh", requireAuth, async (req, res) => {
  const sess = getSession(req);
  const refreshToken = sess["spotify_refresh_token"];

  if (!refreshToken) {
    res
      .status(401)
      .json({ error: "No Spotify refresh token. Please reconnect Spotify." });
    return;
  }

  const spotify = createSpotifyApi();
  spotify.setRefreshToken(refreshToken);

  try {
    const data = await spotify.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    sess["spotify_access_token"] = access_token;
    sess["spotify_token_expires"] = Date.now() + expires_in * 1000;

    res.json({ access_token, expires_in });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Spotify Refresh] Failed:", message);
    res
      .status(401)
      .json({ error: "Failed to refresh Spotify token. Please reconnect." });
  }
});

/**
 * GET /api/spotify/token
 * Returns the current access token to the frontend (never the refresh token).
 * Auto-refreshes if the token is within 60 seconds of expiry.
 *
 * @returns { access_token: string, expires_at: number, connected: boolean }
 */
router.get("/token", requireAuth, async (req, res) => {
  const sess = getSession(req);
  const accessToken = sess["spotify_access_token"];
  const refreshToken = sess["spotify_refresh_token"];
  const expiresAt = sess["spotify_token_expires"];

  if (!accessToken || !refreshToken) {
    res.json({ connected: false });
    return;
  }

  const nowMs = Date.now();
  const bufferMs = 60 * 1000; // 60s buffer

  // Auto-refresh if within 60s of expiry
  if (expiresAt && nowMs >= expiresAt - bufferMs) {
    const spotify = createSpotifyApi();
    spotify.setRefreshToken(refreshToken);
    try {
      const data = await spotify.refreshAccessToken();
      sess["spotify_access_token"] = data.body.access_token;
      sess["spotify_token_expires"] = nowMs + data.body.expires_in * 1000;
      res.json({
        connected: true,
        access_token: data.body.access_token,
        expires_at: sess["spotify_token_expires"],
      });
    } catch {
      res.json({ connected: false });
    }
    return;
  }

  res.json({
    connected: true,
    access_token: accessToken,
    expires_at: expiresAt,
  });
});

/**
 * POST /api/spotify/disconnect
 * Removes Spotify tokens from the user's session.
 * User must go through the OAuth flow again to reconnect.
 *
 * @returns { message: string }
 */
router.post("/disconnect", requireAuth, (req, res) => {
  const sess = getSession(req);
  delete sess["spotify_access_token"];
  delete sess["spotify_refresh_token"];
  delete sess["spotify_token_expires"];
  res.json({ message: "Spotify disconnected." });
});

export default router;
