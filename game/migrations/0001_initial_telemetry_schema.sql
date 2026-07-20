CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  last_screen TEXT NOT NULL,
  seed INTEGER,
  squad_json TEXT NOT NULL DEFAULT '[]',
  boss_id TEXT,
  outcome TEXT,
  cause TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  action_count INTEGER NOT NULL DEFAULT 0,
  accepted_action_count INTEGER NOT NULL DEFAULT 0,
  encounters INTEGER NOT NULL DEFAULT 0,
  cycles_shipped INTEGER NOT NULL DEFAULT 0,
  cycles_missed INTEGER NOT NULL DEFAULT 0,
  days INTEGER NOT NULL DEFAULT 0,
  cards_played INTEGER NOT NULL DEFAULT 0,
  generated_cards_played INTEGER NOT NULL DEFAULT 0,
  cards_exhausted INTEGER NOT NULL DEFAULT 0,
  tasks_shipped INTEGER NOT NULL DEFAULT 0,
  defects INTEGER NOT NULL DEFAULT 0,
  ending_morale INTEGER,
  max_morale INTEGER,
  ending_tech_debt INTEGER,
  peak_tech_debt INTEGER NOT NULL DEFAULT 0,
  deck_size INTEGER NOT NULL DEFAULT 0,
  tools_json TEXT NOT NULL DEFAULT '[]',
  current_node_id TEXT
);

CREATE TABLE IF NOT EXISTS run_events (
  run_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  action_type TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
  screen_before TEXT NOT NULL,
  screen_after TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (run_id, sequence),
  FOREIGN KEY (run_id) REFERENCES runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_outcome ON runs(outcome);
CREATE INDEX IF NOT EXISTS idx_run_events_type ON run_events(action_type);
