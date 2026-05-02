-- FILE: database/002_create_moods.sql
-- VibeFlow — Migration 002: moods table

CREATE TABLE IF NOT EXISTS moods (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  source           TEXT        NOT NULL CHECK (source IN ('questionnaire', 'selection', 'text')),
  category         TEXT        NOT NULL CHECK (category IN ('happy', 'calm', 'stressed', 'sad', 'energetic', 'focused')),
  sentiment_score  NUMERIC(4,2),  -- range -1.00 to +1.00 from Sentiment.js
  mood_color       TEXT           -- hex value of UI color mapped to this mood entry (e.g. '#FFD166')
);

-- Indexes for analytics queries (constellation chart, energy wave)
CREATE INDEX IF NOT EXISTS idx_moods_user_id   ON moods (user_id);
CREATE INDEX IF NOT EXISTS idx_moods_timestamp ON moods (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_moods_category  ON moods (category);

COMMENT ON TABLE  moods                  IS 'Every mood detection event — source, category, score, and UI color';
COMMENT ON COLUMN moods.source           IS 'questionnaire | selection | text — which input method was used';
COMMENT ON COLUMN moods.sentiment_score  IS 'Normalized sentiment score from Sentiment.js (-1 to +1)';
COMMENT ON COLUMN moods.mood_color       IS 'Hex color code that drove the UI session for this mood entry';
