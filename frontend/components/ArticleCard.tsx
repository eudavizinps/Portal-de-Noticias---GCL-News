import { Link } from 'react-router-dom'
import { Bookmark,ArrowUpRight,Clock3 } from 'lucide-react'
import type { Article } from '../types'
import { CATEGORY_LABELS } from '../types'
import ArticleImage from './ArticleImage'
import { formatDate } from '../utils'
import { impactFor } from '../utils'
export default function ArticleCard({article,saved,toggle}:{article:Article;saved:boolean;toggle:(article:Article)=>void}){
  return <article className="news-card">
    <Link to={`/noticia/${article.slug}`} aria-label={`Ler ${article.title}`} className="news-picture"><ArticleImage article={article}/></Link>
    <button className={`save-btn ${saved?'is-saved':''}`} onClick={()=>toggle(article)} aria-label={saved?'Remover dos salvos':'Salvar notícia'} title={saved?'Remover dos salvos':'Salvar notícia'}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button>
    <div className="news-content">
      <div className="card-meta"><span className={`cat-label cat-${article.category}`}>{CATEGORY_LABELS[article.category]}</span><span className="meta-dot"/><Clock3 size={12}/>{formatDate(article.published_at,true)}</div>
      <h3><Link to={`/noticia/${article.slug}`}>{article.title}</Link></h3>
      <p className="card-excerpt">{article.excerpt}</p>
      <div className="impact-mini"><span>↗</span><strong>Para a GCL:</strong> {impactFor(article)}</div>
      <div className="card-footer"><span className="source-name">{article.source_name}</span><Link to={`/noticia/${article.slug}`}>Ler resumo <ArrowUpRight size={14}/></Link></div>
    </div>
  </article>
}
