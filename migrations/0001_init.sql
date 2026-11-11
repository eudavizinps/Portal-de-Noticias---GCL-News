CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  relevance_score INTEGER NOT NULL DEFAULT 50,
  language TEXT NOT NULL DEFAULT 'en',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_articles_date ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_date ON articles (category, published_at DESC);
CREATE TABLE IF NOT EXISTS ingest_runs (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  imported INTEGER NOT NULL DEFAULT 0,
  feeds_ok INTEGER NOT NULL DEFAULT 0,
  feeds_failed INTEGER NOT NULL DEFAULT 0,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_started ON ingest_runs (started_at DESC);
