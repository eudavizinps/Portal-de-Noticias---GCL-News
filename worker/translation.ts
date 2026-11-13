const MODEL = '@cf/meta/m2m100-1.2b'

export type Translation = { title_pt: string; excerpt_pt: string }

async function translateText(ai: Ai, text: string): Promise<string> {
  const result = await ai.run(MODEL, { text, source_lang: 'en', target_lang: 'pt' })
  const translated = 'translated_text' in result && typeof result.translated_text === 'string'
    ? result.translated_text.replace(/\s+/g, ' ').trim() : ''
  if (!translated) throw new Error('O modelo não retornou texto traduzido')
  return translated
}

export async function translateEnglish(ai: Ai, title: string, excerpt: string): Promise<Translation> {
  const [title_pt, excerpt_pt] = await Promise.all([
    translateText(ai, title),
    translateText(ai, excerpt),
  ])
  return { title_pt, excerpt_pt }
}

type Pending = { id: string; title: string; excerpt: string }

export async function translatePending(db: D1Database, ai: Ai, limit = 4) {
  const pending = await db.prepare(`SELECT id,title,excerpt FROM articles
    WHERE active=1 AND language='en' AND (title_pt IS NULL OR excerpt_pt IS NULL)
    ORDER BY translation_attempts ASC,published_at DESC LIMIT ?`)
    .bind(Math.max(1, Math.min(limit, 12))).all<Pending>()
  let translated = 0, failed = 0
  for (const row of pending.results ?? []) {
    try {
      const result = await translateEnglish(ai, row.title, row.excerpt)
      const updated = await db.prepare(`UPDATE articles SET title_pt=?,excerpt_pt=?,translation_attempts=0
        WHERE id=? AND title=? AND excerpt=?`)
        .bind(result.title_pt, result.excerpt_pt, row.id, row.title, row.excerpt).run()
      translated += updated.meta.changes
    } catch (error) {
      failed++
      console.error('Falha na tradução', row.id, error)
      await db.prepare('UPDATE articles SET translation_attempts=translation_attempts+1 WHERE id=?')
        .bind(row.id).run()
    }
  }
  const count = await db.prepare(`SELECT COUNT(*) AS total FROM articles
    WHERE active=1 AND language='en' AND (title_pt IS NULL OR excerpt_pt IS NULL)`)
    .first<{ total: number }>()
  return { translated, failed, pending: count?.total ?? 0 }
}
