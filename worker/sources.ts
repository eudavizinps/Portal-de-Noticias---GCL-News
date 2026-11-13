export type NewsCategory = 'ia' | 'programacao' | 'ciberseguranca' | 'negocios' | 'economia' | 'internacional' | 'tecnologia'

export type Feed = {
  name: string
  url: string
  category: NewsCategory
  language: 'en' | 'pt'
}

// Feeds públicos. A disponibilidade de terceiros pode mudar sem aviso.
// Título, resumo e URL vêm do RSS; títulos e resumos em inglês são traduzidos para exibição.
export const FEEDS: Feed[] = [
  { name: 'MIT Technology Review Brasil', url: 'https://mittechreview.com.br/feed/', category: 'ia', language: 'pt' },
  { name: 'Olhar Digital', url: 'https://olhardigital.com.br/editorias/noticias/feed/', category: 'tecnologia', language: 'pt' },
  { name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/', category: 'tecnologia', language: 'pt' },
  { name: 'Canaltech', url: 'https://canaltech.com.br/rss/', category: 'tecnologia', language: 'pt' },
  { name: 'GitHub Changelog', url: 'https://github.blog/changelog/feed/', category: 'programacao', language: 'en' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', category: 'programacao', language: 'en' },
  { name: 'Google Blog', url: 'https://blog.google/technology/ai/rss/', category: 'ia', language: 'en' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', category: 'ciberseguranca', language: 'en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'negocios', language: 'en' },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'economia', language: 'en' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'internacional', language: 'en' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tecnologia', language: 'en' },
]
