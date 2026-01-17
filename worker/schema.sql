-- Leaderboard table: stores top 100 scores with names
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- Index for efficient sorting and lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC, created_at ASC);

-- Score histogram: stores count of each score for percentile calculation
-- This never grows beyond ~200 rows (one per possible score value)
CREATE TABLE IF NOT EXISTS score_histogram (
    score INTEGER PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);
