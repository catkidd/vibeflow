-- FILE: database/005_create_streaks_sessions_store.sql
-- VibeFlow — Migration 005: streaks table + connect-pg-simple session store

-- ─── Streaks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_logged     DATE,
  dominant_mood   TEXT  -- most frequent mood category during current streak
);

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks (user_id);

COMMENT ON TABLE  streaks                IS 'Per-user streak state — one row per user, upserted daily';
COMMENT ON COLUMN streaks.dominant_mood  IS 'Most frequent mood category this streak — drives StreakFlame color';
COMMENT ON COLUMN streaks.last_logged    IS 'Date of last mood log — used to calculate gap and break streak';

-- ─── Passport / Express Session Store (connect-pg-simple) ──────────────────
-- Required by connect-pg-simple for persistent httpOnly cookie sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  sid     VARCHAR     NOT NULL COLLATE "default",
  sess    JSON        NOT NULL,
  expire  TIMESTAMPTZ NOT NULL
);

ALTER TABLE user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_pkey;

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS idx_session_expire ON user_sessions (expire);

COMMENT ON TABLE user_sessions IS 'Express session store — managed by connect-pg-simple';
