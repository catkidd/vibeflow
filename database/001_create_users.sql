-- FILE: database/001_create_users.sql
-- VibeFlow — Migration 001: users table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT        UNIQUE NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast Google OAuth lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);

COMMENT ON TABLE  users              IS 'Authenticated VibeFlow users via Google OAuth 2.0';
COMMENT ON COLUMN users.google_id    IS 'Google OAuth subject ID — used for login lookup';
COMMENT ON COLUMN users.avatar_url   IS 'Google profile picture URL';
