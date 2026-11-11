-- Persistência da seleção diária: cinco chamadas editoriais, evitando repetições recentes.
CREATE TABLE IF NOT EXISTS edition_items (
  edition_date TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),
  article_id TEXT NOT NULL REFERENCES articles(id),
  PRIMARY KEY (edition_date, position)
);
CREATE INDEX IF NOT EXISTS idx_edition_article ON edition_items(article_id);
