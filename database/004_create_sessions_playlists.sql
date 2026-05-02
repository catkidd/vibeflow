-- FILE: database/004_create_sessions_playlists.sql
-- VibeFlow — Migration 004: sessions + playlists tables

-- ─── Pomodoro Sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time    TIMESTAMPTZ DEFAULT NOW(),
  duration_min  INTEGER     NOT NULL DEFAULT 25,
  completed     BOOLEAN     NOT NULL DEFAULT FALSE,
  mood_id       UUID        REFERENCES moods(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions (start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_completed  ON sessions (completed);

COMMENT ON TABLE  sessions              IS 'Pomodoro timer sessions — drives energy wave chart';
COMMENT ON COLUMN sessions.duration_min IS '25 = focus, 5 = break — future: custom durations';
COMMENT ON COLUMN sessions.completed    IS 'TRUE only when the full timer elapsed (not manually stopped)';

-- ─── Playlists ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id                   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_id              UUID  REFERENCES moods(id) ON DELETE SET NULL,
  spotify_playlist_id  TEXT,
  youtube_embed_url    TEXT,
  mood_fit_reason      TEXT  -- e.g. "High energy to match your morning sprint"
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists (user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_mood_id ON playlists (mood_id);

COMMENT ON TABLE  playlists                  IS 'Curated playlist records — one per mood detection event';
COMMENT ON COLUMN playlists.mood_fit_reason  IS 'Human-readable explanation shown in PlaylistCard tooltip';
