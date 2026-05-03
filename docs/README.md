# VibeFlow v2.0 — Developer Guide

> **The Zen Productivity Dashboard** — Mood-aware focus sessions, Spotify soundtrack, and analytics in a glassmorphic Next.js + Express monorepo.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [API Reference](#api-reference)
7. [Running Tests](#running-tests)
8. [Project Structure](#project-structure)
9. [Key Design Decisions](#key-design-decisions)

---

## Architecture

```
VibeFlow/
├── frontend/          # Next.js 14 App Router (React, Framer Motion, Recharts)
├── backend/           # Express + TypeScript API (Passport.js, pg, Spotify SDK)
├── cypress/           # Cypress e2e tests
└── docs/              # This file
```

```
Browser → Next.js (3000) → Express API (4000) → PostgreSQL
                                               → Spotify API
                                               → Google OAuth
```

**Session management**: `express-session` with `connect-pg-simple` stores sessions in PostgreSQL. All tokens (Spotify, Google) live server-side in the session — never exposed to the client.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| PostgreSQL | ≥ 14 |
| npm | ≥ 9 |

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd VibeFlow

# 2. Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure environment
cp backend/.env.example backend/.env
# → Fill in your real values (see Environment Variables below)

# 4. Run database migrations
psql -U <user> -d vibeflow -f backend/src/db/migrations/001_init.sql

# 5. Start backend (port 4000)
cd backend && npm run dev

# 6. Start frontend (port 3000) — in a new terminal
cd frontend && npm run dev

# 7. Open browser
open http://localhost:3000
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `SESSION_SECRET` | Long random string for session signing | *(generate with `openssl rand -hex 32`)* |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:3000` |
| `FRONTEND_URL` | Base URL for OAuth redirects | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/vibeflow` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | *(from Google Cloud Console)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `http://localhost:4000/auth/callback` |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID | *(from Spotify Developer Dashboard)* |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret | |
| `SPOTIFY_REDIRECT_URI` | **Must match** Spotify Dashboard | `http://127.0.0.1:4000/api/spotify/callback` |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | *(from Google Cloud Console)* |
| `HUGGINGFACE_API_KEY` | HuggingFace inference API | *(optional — fallback sentiment)* |

> ⚠️ **Never commit `.env`** — it's gitignored. Only `.env.example` is tracked.

### Spotify Setup
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app → Edit Settings → Add Redirect URI: `http://127.0.0.1:4000/api/spotify/callback`
3. Copy Client ID and Client Secret into `.env`

### Google OAuth Setup
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client → Web application
3. Add Authorized redirect URI: `http://localhost:4000/auth/callback`

---

## Database Setup

```sql
-- Run the migration
psql -U postgres -d vibeflow -f backend/src/db/migrations/001_init.sql
```

Tables created: `users`, `mood_entries`, `tasks`, `focus_sessions`, `streaks`, `badges`

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/callback` | Google OAuth callback |
| GET | `/auth/me` | Get current user session |
| POST | `/auth/logout` | Clear session |

### Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mood` | Submit mood questionnaire |
| GET | `/api/mood/history` | Get mood history |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List user tasks |
| POST | `/api/tasks` | Create task `{ title }` |
| PATCH | `/api/tasks/:id` | Update status `{ status }` |
| DELETE | `/api/tasks/:id` | Delete task |

### Sessions (Pomodoro)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Log session `{ duration_min, completed }` |
| GET | `/api/sessions` | Get session history + daily summary |

### Streaks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/streaks` | Get streak data |
| POST | `/api/streaks/update` | Update streak `{ mood }` |

### Spotify
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spotify/login` | Start OAuth flow |
| GET | `/api/spotify/callback` | Handle callback |
| GET | `/api/spotify/token` | Get current token status |
| POST | `/api/spotify/refresh` | Refresh access token |
| POST | `/api/spotify/disconnect` | Remove Spotify session |
| GET | `/api/playlists?mood=focused` | Get mood-matched tracks |

---

## Running Tests

### Backend — Jest + Supertest
```bash
cd backend
npm test                      # Run all tests
npm test -- --coverage        # With coverage report
npm test -- --watch           # Watch mode
```

### Frontend — React Testing Library
```bash
cd frontend
npm test                      # Run all RTL tests
```

### E2E — Cypress
```bash
# Requires frontend + backend both running
cd VibeFlow
npx cypress open              # Interactive mode (recommended for dev)
npx cypress run               # Headless CI mode
```

---

## Project Structure

```
backend/src/
├── config/
│   ├── db.ts             # PostgreSQL pool
│   ├── passport.ts       # Google OAuth strategy
│   └── spotify.ts        # Spotify API client factory
├── lib/
│   └── moodScoring.ts    # Pure mood algorithm (unit-tested)
├── middleware/
│   └── requireAuth.ts    # Session auth guard
├── routes/
│   ├── auth.ts           # Google OAuth routes
│   ├── mood.ts           # Mood submission
│   ├── tasks.ts          # Task CRUD
│   ├── sessions.ts       # Pomodoro logging
│   ├── streaks.ts        # Streak tracking
│   ├── playlists.ts      # Spotify recommendations
│   └── spotify_auth.ts   # Spotify OAuth flow
└── types/
    └── mood.ts           # Shared MoodCategory type

frontend/app/
├── components/
│   ├── GradientMesh.tsx  # Ambient animated background
│   ├── HapticToast.tsx   # Frosted glass notifications
│   ├── LiquidSlider.tsx  # Mood intensity slider
│   ├── MoodQuestionnaire.tsx
│   ├── MusicGrid.tsx     # Track card grid
│   ├── PomodoroSun.tsx   # SVG focus timer
│   ├── SentimentJournal.tsx
│   ├── TaskBreeze.tsx    # Reorderable task manager
│   ├── ToastContext.tsx  # Global notification queue
│   └── VibePlayer.tsx    # PIP music player
├── dashboard/page.tsx    # Main workspace
├── analytics/page.tsx    # Flow Analytics
├── mood/page.tsx         # Mood entry
└── login/page.tsx        # Auth

frontend/lib/
├── animation.ts          # All Framer Motion variants
├── moodTheme.ts          # Color token system
└── affirmations.ts       # Toast message library
```

---

## Key Design Decisions

**Why server-side session tokens?** Spotify and Google tokens are stored in `httpOnly` session cookies — never in localStorage — preventing XSS exfiltration.

**Why preview mode for Spotify?** Spotify's Web Playback SDK requires Premium. Using 30s preview URLs via HTMLAudio works for all users with zero SDK overhead.

**Why `getSession()` helper?** TypeScript's `express-session` types don't include an index signature, causing TS2352 errors on `req.session['key']`. The helper casts once via `as any` in a single controlled location.

**Why Recharts over Chart.js?** Recharts is React-native, composable, and integrates with Framer Motion's `AnimatePresence` without manual canvas lifecycle management.

---

*VibeFlow v2.0 — Built with the master prompt specification.*
