-- FILE: database/003_create_tasks.sql
-- VibeFlow — Migration 003: tasks table

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  mood_id      UUID        REFERENCES moods(id) ON DELETE SET NULL,  -- mood active when task was created
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for task list queries and constellation chart
CREATE INDEX IF NOT EXISTS idx_tasks_user_id   ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_mood_id   ON tasks (mood_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created   ON tasks (created_at DESC);

COMMENT ON TABLE  tasks           IS 'User tasks linked to the mood context when they were created';
COMMENT ON COLUMN tasks.mood_id   IS 'Mood active at task creation time — used for constellation chart coloring';
COMMENT ON COLUMN tasks.status    IS 'todo | in_progress | done — drives TaskBreeze UI state';
