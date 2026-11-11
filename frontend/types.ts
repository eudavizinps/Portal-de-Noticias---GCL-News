export type NewsCategory = 'ia' | 'programacao' | 'ciberseguranca' | 'negocios' | 'economia' | 'internacional' | 'tecnologia'
export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string
  image_url: string | null
  category: NewsCategory
  source_name: string
  source_url: string
  published_at: string
  fetched_at: string
  relevance_score: number
  language: string
}
export type ArticlesResponse = {
  items: Article[]
  total: number
  page: number
  limit: number
  latest_update: string | null
}
export type EditionResponse = {
  items: Article[]
  date: string
  latest_update: string | null
  period: string
}
export const CATEGORY_LABELS: Record<NewsCategory,string> = {
  ia:'Inteligência artificial',programacao:'Programação',ciberseguranca:'Cibersegurança',negocios:'Negócios',economia:'Economia',internacional:'Internacional',tecnologia:'Tecnologia'
}
export function isNewsCategory(v: string): v is NewsCategory { return Object.hasOwn(CATEGORY_LABELS,v) }
