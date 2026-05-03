// FILE: backend/src/config/passport.ts
// Google OAuth 2.0 strategy — httpOnly cookie sessions, refresh token support.

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from './db.js';
import dotenv from "dotenv";

dotenv.config();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

/**
 * Google OAuth 2.0 Strategy.
 * On first login: creates a new user row in the DB.
 * On subsequent logins: fetches existing user and updates name/avatar if changed.
 *
 * Edge case — DB failure during upsert: done(err) propagates to Express error handler.
 * Edge case — Missing profile email: done(null, false) with a flash message.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        "http://localhost:4000/auth/callback",
      scope: ["profile", "email"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, {
            message: "No email returned from Google.",
          });
        }

        const avatarUrl = profile.photos?.[0]?.value ?? null;
        const name = profile.displayName ?? null;
        const googleId = profile.id;

        // Upsert: insert or update user on Google ID match
        const result = await pool.query(
          `INSERT INTO users (google_id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_id)
           DO UPDATE SET
             email      = EXCLUDED.email,
             name       = EXCLUDED.name,
             avatar_url = EXCLUDED.avatar_url
           RETURNING id, email, name, avatar_url`,
          [googleId, email, name, avatarUrl],
        );

        const user = result.rows[0];
        if (!user) {
          return done(new Error("User upsert returned no rows."));
        }

        return done(null, user);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error during OAuth";
        return done(new Error(`[OAuth] Strategy error: ${message}`));
      }
    },
  ),
);

export default passport;
