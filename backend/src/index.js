// FILE: backend/src/index.ts
// VibeFlow Express API entry point — production-grade setup

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import connectPgSimple from "connect-pg-simple";

import { pool } from './config/db.js';
import authRoutes from './routes/auth.js';
import moodRoutes from './routes/mood.js';
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import playlistRoutes from './routes/playlists.js';
import streakRoutes from './routes/streaks.js';
import badgeRoutes from './routes/badges.js';
import spotifyAuthRoutes from './routes/spotify_auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;
const PgSession = connectPgSimple(session);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: [
          "'self'",
          "https://api.spotify.com",
          "https://api-inference.huggingface.co",
        ],
      },
    },
  }),
);

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ?? "http://localhost:3000"
).split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

app.use(globalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Session + Auth ───────────────────────────────────────────────────────────
app.use(
  session({
    store: new PgSession({ pool, tableName: "user_sessions" }),
    secret: process.env.SESSION_SECRET ?? "vibeflow-dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authLimiter, authRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/streaks", streakRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/spotify", spotifyAuthRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[VibeFlow Error]", err.message);
  res.status(500).json({ error: "Internal server error. Please try again." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[VibeFlow] API running on http://localhost:${PORT}`);
});

export default app;
