ALTER TABLE articles ADD COLUMN title_pt TEXT;
ALTER TABLE articles ADD COLUMN excerpt_pt TEXT;
ALTER TABLE articles ADD COLUMN translation_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_pending_translation
ON articles (language, translation_attempts, published_at DESC);
