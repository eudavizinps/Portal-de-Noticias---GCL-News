import { createElement, useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, CloudDownload, ExternalLink, Globe2, LayoutDashboard, Menu, Moon, Newspaper, Search, ShieldCheck, SlidersHorizontal, Sparkles, Sun, TrendingUp, X } from 'lucide-react'
import type { Article, ArticlesResponse, NewsCategory } from './types'
import { CATEGORY_LABELS, isNewsCategory } from './types'
import { formatDate, formatSync, impactFor, priorities } from './utils'
import { useArticle, useNews } from './hooks/useNews'
import { demoArticles } from './data/demo'
import ArticleImage from './components/ArticleImage'
import ArticleCard from './components/ArticleCard'

const categoryOptions: {id:'all'|NewsCategory;label:string}[] = [
  {id:'all',label:'Todas'},
  {id:'ia',label:'Inteligência artificial'},
  {id:'programacao',label:'Programação & APIs'},
  {id:'ciberseguranca',label:'Cibersegurança'},
  {id:'negocios',label:'Negócios'},
  {id:'economia',label:'Economia'},
  {id:'tecnologia',label:'Tecnologia'},
  {id:'internacional',label:'Internacional'},
]

function useBookmarks() {
  const [saved,setSaved]=useState<Article[]>(()=>{
    try {const data=JSON.parse(localStorage.getItem('gcl-radar-bookmarks-v1')||'[]');return Array.isArray(data)?data.filter(x=>x?.slug&&x?.source_url):[]}
    catch{return []}
  })
  useEffect(()=>{try{localStorage.setItem('gcl-radar-bookmarks-v1',JSON.stringify(saved))}catch{}},[saved])
  useEffect(()=>{
    if(!saved.length)return
    let active=true
    void Promise.all(saved.map(async article=>{
      try {
        const response=await fetch('/api/articles/'+encodeURIComponent(article.slug))
        if(!response.ok)return article
        const data=(await response.json()) as {item?:Article}
        return data.item??article
      } catch {return article}
    })).then(updated=>{
      if(active)setSaved(current=>current.map(article=>updated.find(item=>item.id===article.id)??article))
    })
    return ()=>{active=false}
  },[])
  const toggle=useCallback((a:Article)=>setSaved(old=>old.some(x=>x.id===a.id)?old.filter(x=>x.id!==a.id):[a,...old]),[])
  return {saved,toggle,has:(id:string)=>saved.some(x=>x.id===id)}
}
type Bookmarks=ReturnType<typeof useBookmarks>
function useTheme() {
  const [theme,setTheme]=useState<'dark'|'light'>(()=>{
    try{return localStorage.getItem('gcl-news-theme-v2')==='dark'?'dark':'light'}catch{return 'light'}
  })
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('gcl-news-theme-v2',theme)}catch{}},[theme])
  return {theme,toggle:()=>setTheme(t=>t==='dark'?'light':'dark')}
}
function Brand(){return <Link className="brand" to="/" aria-label="GCL NEWS - página inicial">
  <span className="brand-mark" aria-hidden="true"><img src="/gcl-news-logo.png" alt="" /></span>
  <span className="brand-copy"><b>GCL<span>NEWS</span></b><small>INTELIGÊNCIA EM NOTÍCIAS</small></span>
</Link>}
function Header({savedCount,theme,onTheme}:{savedCount:number;theme:string;onTheme:()=>void}){
  const [open,setOpen]=useState(false)
  const [q,setQ]=useState('')
  const navigate=useNavigate()
  const loc=useLocation()
  useEffect(()=>{setOpen(false)},[loc.pathname,loc.search])
  const submitSearch=(event:React.FormEvent)=>{event.preventDefault();navigate('/explorar?q='+encodeURIComponent(q.trim()))}
  const sections=[{label:'IA',to:'/explorar?categoria=ia'},{label:'Programação',to:'/explorar?categoria=programacao'},{label:'APIs',to:'/explorar?q=API'},{label:'Negócios',to:'/explorar?categoria=negocios'},{label:'Economia',to:'/explorar?categoria=economia'},{label:'Cibersegurança',to:'/explorar?categoria=ciberseguranca'}]
  return <header className="site-header"><div className="container header-inner">
    <Brand/>
    <span className="header-tagline">Notícias em tecnologia, IA e negócios</span>
    <nav className="desktop-nav" aria-label="Editorias"><NavLink to="/" end className={({isActive})=>isActive?'nav-link active':'nav-link'}>Início</NavLink>{sections.map(s=><Link key={s.label} to={s.to} className={loc.pathname+loc.search===s.to?'nav-link active':'nav-link'}>{s.label}</Link>)}</nav>
    <div className="header-actions">
      <form className="header-inline-search" onSubmit={submitSearch}><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar notícias, temas ou empresas..." aria-label="Buscar notícias"/></form>
      <Link className="header-icon" to="/salvos" aria-label={`Notícias salvas: ${savedCount}`} title="Notícias salvas"><Bookmark size={20}/>{savedCount>0&&<span className="header-count">{savedCount}</span>}</Link>
      <button className="header-icon theme-action" aria-label={theme==='dark'?'Ativar tema claro':'Ativar tema escuro'} title="Alternar tema" onClick={onTheme}>{theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button>
      <button className="header-icon mobile-only" aria-label="Abrir menu" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>{open?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
    <form className="mobile-search" onSubmit={submitSearch}><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar notícias, temas ou empresas..." aria-label="Buscar notícias"/></form>
  </div>{open&&<nav className="mobile-nav" aria-label="Menu móvel"><Link to="/">Início</Link>{sections.map(s=><Link key={s.label} to={s.to}>{s.label}</Link>)}<Link to="/mercado">Mercado financeiro</Link><Link to="/salvos">Salvos</Link><Link to="/fontes">Fontes</Link></nav>}</header>
}
function StatusBadge({lastSync,isDemo}:{lastSync:string|null;isDemo?:boolean}){return <span className={`sync-status ${isDemo?'demo':''}`}><span className="pulse-dot"/>{isDemo?'Exemplo local':lastSync?'Atualizado '+formatSync(lastSync):'Aguardando primeira sincronização'}</span>}
function Hero({items,bookmarks}:{items:Article[];bookmarks:Bookmarks}){
  const [index,setIndex]=useState(0)
  const [paused,setPaused]=useState(false)
  useEffect(()=>{setIndex(0)},[items.length])
  useEffect(()=>{if(items.length<2||paused)return;const timer=window.setInterval(()=>setIndex(n=>(n+1)%items.length),6500);return()=>window.clearInterval(timer)},[items.length,paused])
  const next=()=>setIndex(i=>(i+1)%items.length),prev=()=>setIndex(i=>(i-1+items.length)%items.length)
  const active=items[index]
  if(!active)return <div className="hero-placeholder"><Sparkles size={30}/><strong>Aguardando as primeiras notícias</strong><span>As manchetes aparecerão aqui após a sincronização das fontes.</span></div>
  return <section className="hero-section" aria-label="Principais notícias" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
    <div className="hero-photo"><ArticleImage key={active.id} article={active} priority/></div>
    <div className="hero-shade"/>
    <div className="hero-inner">
      <div className="hero-topline"><span className={`cat-label cat-${active.category}`}>{CATEGORY_LABELS[active.category]}</span></div>
      <div className="hero-bottom">
        <h1 key={active.slug}>{active.title}</h1>
        <p>{active.excerpt}</p>
        <div className="hero-cta"><Link className="primary-btn" to={`/noticia/${active.slug}`}>Ler matéria <ArrowRight size={17}/></Link><span className="hero-meta"><CalendarDays size={15}/>{formatDate(active.published_at,true)}</span><span className="hero-meta"><Clock3 size={15}/>{active.source_name}</span><button className="hero-save" onClick={()=>bookmarks.toggle(active)} aria-label="Salvar destaque"><Bookmark size={19} fill={bookmarks.has(active.id)?'currentColor':'none'}/></button></div>
      </div>
    </div>
    <div className="hero-controls"><button onClick={prev} aria-label="Destaque anterior"><ChevronLeft size={19}/></button><div className="hero-progress">{items.map((a,i)=><button key={a.id} className={i===index?'on':''} onClick={()=>setIndex(i)} aria-label={`Ir para destaque ${i+1}`}/>)}</div><button onClick={next} aria-label="Próximo destaque"><ChevronRight size={19}/></button></div>
  </section>
}
function SectionTitle({eyebrow,title,subtitle,action}:{eyebrow?:string;title:string;subtitle?:string;action?:React.ReactNode}){return <div className="section-head"><div><span className="eyebrow">{eyebrow??'GCL NEWS'}</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}
function Empty({title,desc,action}:{title:string;desc:string;action?:React.ReactNode}){return <div className="empty-state"><Newspaper size={30}/><h3>{title}</h3><p>{desc}</p>{action}</div>}
function FocusPanel(){return <aside className="focus-panel"><div className="panel-heading"><span><Sparkles size={16}/> PARA A GCL TECHNOLOGY</span><small>VISÃO ESTRATÉGICA</small></div><h3>Da notícia à oportunidade.</h3><p>Três frentes para acompanhar na construção de produtos digitais.</p><div className="focus-list">{priorities.map(p=><div className="focus-item" key={p.number}><span className="focus-number">{p.number}</span><div><small>{p.label}</small><b>{p.title}</b><p>{p.text}</p></div></div>)}</div><div className="focus-foot"><span>Foco em segurança, eficiência e resultados.</span><TrendingUp size={19}/></div></aside>}
function relativeTime(value:string){
  const minutes=Math.max(1,Math.floor((Date.now()-new Date(value).getTime())/60000))
  if(!Number.isFinite(minutes))return formatDate(value,true)
  if(minutes<60)return `Há ${minutes} min`
  if(minutes<1440)return `Há ${Math.floor(minutes/60)} h`
  return formatDate(value,true)
}
function HomeTile({article}:{article:Article}){return <article className="home-tile"><Link to={`/noticia/${article.slug}`} className="home-tile-image" aria-label={`Ler ${article.title}`}><ArticleImage article={article}/></Link><div className="home-tile-body"><div className="home-tile-meta"><span className={`cat-label cat-${article.category}`}>{CATEGORY_LABELS[article.category]}</span><span><CalendarDays size={11}/>{formatDate(article.published_at,true)}</span></div><h3><Link to={`/noticia/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p></div></article>}
function HomeSidebar({trending,latest}:{trending:Article[];latest:Article[]}){return <aside className="home-rail">
  <section className="home-rail-panel trending-panel"><h2><TrendingUp size={21}/> Em alta</h2><ol>{trending.map((a,i)=><li key={a.id}><span>{i+1}</span><Link to={`/noticia/${a.slug}`}>{a.title}</Link></li>)}</ol></section>
  <section className="home-rail-panel updates-panel"><h2><Clock3 size={21}/> Últimas atualizações</h2><ul>{latest.slice(0,3).map(a=><li key={a.id}><span className="update-dot"/><div><small>{relativeTime(a.published_at)} <span>·</span> <b>{CATEGORY_LABELS[a.category]}</b></small><Link to={`/noticia/${a.slug}`}>{a.title}</Link></div></li>)}</ul><Link className="rail-more" to="/explorar">Ver todas as atualizações <ArrowRight size={15}/></Link></section>
</aside>}
const marketSymbols=[{code:'IBOV',name:'Ibovespa',symbol:'BMFBOVESPA:IBOV'},{code:'PETR4',name:'Petrobras PN',symbol:'BMFBOVESPA:PETR4'},{code:'VALE3',name:'Vale ON',symbol:'BMFBOVESPA:VALE3'},{code:'ITUB4',name:'Itaú PN',symbol:'BMFBOVESPA:ITUB4'}]
function MarketChart({symbol}:{symbol:string}){return <div className="market-widget">{createElement('tv-mini-chart',{symbol,key:symbol},<span className="market-loading">Carregando dados de mercado...</span>)}</div>}
function MarketPanel(){const [selected,setSelected]=useState(marketSymbols[0]);return <section className="home-rail-panel market-panel"><h2><TrendingUp size={21}/> Mercado financeiro</h2><p className="market-subtitle">Cotações reais de ativos negociados na B3</p><div className="market-tabs" role="group" aria-label="Escolher ativo">{marketSymbols.map(s=><button key={s.code} className={selected.code===s.code?'selected':''} onClick={()=>setSelected(s)} aria-pressed={selected.code===s.code}>{s.code}</button>)}</div><MarketChart symbol={selected.symbol}/><div className="market-note"><span>{selected.name} · B3 · dados com atraso de 15 min</span><a href={`https://br.tradingview.com/symbols/BMFBOVESPA-${selected.code}/`} target="_blank" rel="noopener noreferrer">Ver ativo <ExternalLink size={12}/></a></div><Link to="/mercado" className="rail-more">Explorar mercado <ArrowRight size={15}/></Link><a className="market-credit" href="https://br.tradingview.com/" target="_blank" rel="noopener noreferrer">Dados e gráficos: TradingView</a></section>}
function MarketPage(){return <div className="container inner-page market-page"><div className="page-top"><span className="eyebrow">MERCADO FINANCEIRO</span><h1>Mercado em <em>perspectiva.</em></h1><p>Acompanhe cotações de ativos da B3. Os dados são fornecidos pelo TradingView com atraso de aproximadamente 15 minutos e podem permanecer iguais fora do horário de negociação.</p></div><div className="market-grid">{marketSymbols.map(s=><section className="market-card" key={s.code}><div><h2>{s.code}</h2><span>{s.name}</span></div><MarketChart symbol={s.symbol}/><a href={`https://br.tradingview.com/symbols/BMFBOVESPA-${s.code}/`} target="_blank" rel="noopener noreferrer">Ver detalhes no TradingView <ExternalLink size={14}/></a></section>)}</div><p className="market-disclaimer">Fonte: TradingView. Valores para acompanhamento informativo; confirme preços e condições na sua corretora antes de tomar decisões de investimento.</p></div>}
function HomePage({bookmarks}:{bookmarks:Bookmarks}){
  const {edition,archive,loading,error,isDemo,lastSync,total,refresh}=useNews()
  const top=edition.slice(0,5)
  const remaining=archive.filter(a=>!top.some(x=>x.id===a.id))
  const featured=remaining.slice(0,3)
  const tiles=remaining.slice(3,11)
  const trending=[...archive].sort((a,b)=>b.relevance_score-a.relevance_score).slice(0,5)
  const topics:[string,string,React.ReactNode][]=[['Todos','/explorar',null],['IA','/explorar?categoria=ia',<Sparkles size={15}/>],['Programação','/explorar?categoria=programacao',<span className="topic-braces">{'{ }'}</span>],['APIs','/explorar?q=API',<LayoutDashboard size={15}/>],['Negócios','/explorar?categoria=negocios',<Bookmark size={15}/>],['Economia','/explorar?categoria=economia',<TrendingUp size={15}/>],['Cibersegurança','/explorar?categoria=ciberseguranca',<ShieldCheck size={15}/>]]
  return <div className="container home-wrap">
    <div className="home-status"><span>{total?`${total} notícias em tecnologia, IA e negócios`:'Notícias em tecnologia, IA e negócios'}</span><StatusBadge lastSync={lastSync} isDemo={isDemo}/></div>
    {loading?<div className="skeleton hero-skeleton"/>:error?<Empty title="Notícias temporariamente indisponíveis" desc={error} action={<button className="primary-btn" onClick={refresh}>Tentar novamente</button>}/>:<>
      <div className="home-lead"><div className="lead-main"><Hero items={top.slice(0,3)} bookmarks={bookmarks}/><div className="featured-rail">{featured.map(a=><Link className="featured-story" to={`/noticia/${a.slug}`} key={a.id}><ArticleImage article={a}/><div><span className={`cat-label cat-${a.category}`}>{CATEGORY_LABELS[a.category]}</span><h3>{a.title}</h3></div></Link>)}</div></div><div className="lead-side"><HomeSidebar trending={trending} latest={archive}/></div></div>
      <div className="topic-row"><b>Explorar por tema:</b><div>{topics.map(([label,to,icon],i)=><Link key={label} className={i===0?'topic-chip active':'topic-chip'} to={to}>{icon}{label}</Link>)}</div></div>
      <div className="home-content"><div className="home-article-grid">{tiles.length?tiles.map(a=><HomeTile key={a.id} article={a}/>):<Empty title="Ainda sem notícias" desc="As matérias aparecerão após a sincronização das fontes."/>}</div><div className="home-content-side"><MarketPanel/></div></div>
      <div className="home-all-link"><Link to="/explorar">Ver todas as notícias <ArrowRight size={17}/></Link></div>
    </>}
  </div>
}
function ExplorePage({bookmarks}:{bookmarks:Bookmarks}){
  const location=useLocation(),navigate=useNavigate()
  const params=new URLSearchParams(location.search)
  const q=params.get('q')??'', rawCat=params.get('categoria')??'all'
  const cat=rawCat==='all'||isNewsCategory(rawCat)?rawCat:'all'
  const page=Math.max(1,Number(params.get('pagina'))||1)
  const [draft,setDraft]=useState(q)
  const [data,setData]=useState<Article[]>([]), [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[isDemo,setIsDemo]=useState(false)
  useEffect(()=>{setDraft(q)},[q])
  useEffect(()=>{
    const controller=new AbortController()
    const fetchArchive=async()=>{setLoading(true);setError('');try{
      const search=new URLSearchParams({page:String(page),limit:'12'})
      if(q)search.set('q',q)
      if(cat!=='all')search.set('category',cat)
      const res=await fetch('/api/articles?'+search.toString(),{signal:controller.signal})
      if(!res.ok)throw new Error('Falha ao consultar arquivo')
      const json=await res.json() as ArticlesResponse
      if(!controller.signal.aborted){setData(json.items);setTotal(json.total);setIsDemo(false)}
    }catch{if(!controller.signal.aborted){if(import.meta.env.DEV){const list=demoArticles.filter(x=>(cat==='all'||x.category===cat)&&(!q||`${x.title} ${x.excerpt}`.toLowerCase().includes(q.toLowerCase())));setData(list.slice((page-1)*12,page*12));setTotal(list.length);setIsDemo(true)}else{setData([]);setTotal(0);setError('Não foi possível acessar o arquivo de notícias.')}}}finally{if(!controller.signal.aborted)setLoading(false)}}
    void fetchArchive();return()=>controller.abort()
  },[q,cat,page])
  const update=(nextQ:string,nextCat:string,nextPage=1)=>{const s=new URLSearchParams();if(nextQ.trim())s.set('q',nextQ.trim());if(nextCat!=='all')s.set('categoria',nextCat);if(nextPage!==1)s.set('pagina',String(nextPage));navigate('/explorar?'+s.toString())}
  return <div className="container inner-page"><div className="page-top"><span className="eyebrow">EXPLORE O UNIVERSO</span><h1>O mundo muda.<br/><em>Esteja à frente.</em></h1><p>Busque, filtre e acompanhe notícias diretamente das fontes originais.</p></div><div className="explorer-panel">
    <form className="search-large" onSubmit={e=>{e.preventDefault();update(draft,cat)}}><Search size={21}/><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Buscar manchetes, empresas, tecnologias..." aria-label="Buscar no arquivo"/><button className="primary-btn" type="submit">Buscar <ArrowRight size={17}/></button></form>
    <div className="category-bar"><SlidersHorizontal size={17}/>{categoryOptions.map(x=><button key={x.id} className={cat===x.id?'category-chip active':'category-chip'} onClick={()=>update(q,x.id)}>{x.label}</button>)}</div>
  </div><div className="result-line"><span>{loading?'Buscando notícias...':`${total} ${total===1?'resultado':'resultados'}`}{isDemo&&' · Exemplo local'}</span>{q&&<button onClick={()=>update('',cat)}>Limpar busca <X size={14}/></button>}</div>
  {error?<Empty title="Não foi possível carregar" desc={error}/>:loading?<div className="cards-grid">{Array.from({length:6},(_,i)=><div className="skeleton card-skeleton" key={i}/>)}</div>:data.length===0?<Empty title="Nenhuma notícia encontrada" desc="Tente outro termo de busca ou altere a categoria." action={<button className="outline-btn" onClick={()=>update('','all')}>Ver todas</button>}/>:<div className="cards-grid explorer-grid">{data.map(a=><ArticleCard key={a.id} article={a} saved={bookmarks.has(a.id)} toggle={()=>bookmarks.toggle(a)}/>)}</div>}
  {total>12&&<nav className="pagination" aria-label="Paginação"><button disabled={page<=1} onClick={()=>update(q,cat,page-1)}><ChevronLeft size={17}/> Anterior</button><span>Página {page} de {Math.ceil(total/12)}</span><button disabled={page>=Math.ceil(total/12)} onClick={()=>update(q,cat,page+1)}>Próxima <ChevronRight size={17}/></button></nav>}
  </div>
}
function StoryPage({bookmarks}:{bookmarks:Bookmarks}){
  const {slug=''}=useParams(),{article,loading}=useArticle(slug),navigate=useNavigate()
  const [copied,setCopied]=useState(false)
  const share=async()=>{const url=window.location.href;try{if(navigator.share){await navigator.share({title:article?.title,url})}else{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),2500)}}catch{}}
  useEffect(()=>{window.scrollTo(0,0)},[slug])
  if(loading)return <div className="container inner-page"><div className="skeleton story-skeleton"/></div>
  if(!article)return <div className="container inner-page"><Empty title="Notícia não encontrada" desc="A publicação pode ter sido removida ou a API ainda não está sincronizada." action={<Link className="primary-btn" to="/explorar">Explorar notícias</Link>}/></div>
  return <div className="container article-page"><button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Voltar</button><div className="article-layout"><main className="story-content"><div className="story-heading"><span className={`cat-label cat-${article.category}`}>{CATEGORY_LABELS[article.category]}</span><h1>{article.title}</h1><div className="story-meta"><span>{article.source_name}</span><span className="meta-dot"/><span>{formatDate(article.published_at)}</span>{article.language!=='pt'&&<span className="original-lang">Tradução automática · original em inglês</span>}</div><div className="story-actions"><button onClick={()=>bookmarks.toggle(article)}><Bookmark size={17} fill={bookmarks.has(article.id)?'currentColor':'none'}/>{bookmarks.has(article.id)?'Salvo':'Salvar'}</button><button onClick={share}>{copied?<Check size={17}/>:<ArrowUpRight size={17}/>} {copied?'Link copiado':'Compartilhar'}</button></div></div><div className="story-cover"><ArticleImage article={article} priority/></div><div className="summary-box"><span className="eyebrow">{article.language==='en'?'RESUMO TRADUZIDO DA FONTE':'RESUMO DA FONTE'}</span><p>{article.excerpt}</p></div><div className="story-section"><h2>O que isso significa para quem trabalha com tecnologia?</h2><p>Acompanhar esse assunto pode ajudar equipes de desenvolvimento a tomar decisões mais informadas. A recomendação abaixo é uma orientação geral baseada no tema da notícia, não uma conclusão reportada pela fonte.</p><div className="practical-impact"><div className="practical-icon"><TrendingUp size={22}/></div><div><span>IMPACTO PRÁTICO PARA A GCL</span><p>{impactFor(article)}</p></div></div></div><div className="source-callout"><span>Conteúdo completo e detalhes originais</span><h3>Continue a leitura na fonte.</h3><p>O GCL NEWS mostra títulos e pequenos resumos dos feeds. Quando a fonte está em inglês, esses textos são traduzidos automaticamente para português e podem conter imprecisões. Confira a matéria original no link abaixo.</p><a className="primary-btn" href={article.source_url} target="_blank" rel="noopener noreferrer">Abrir {article.source_name} <ExternalLink size={16}/></a></div></main><aside className="story-sidebar"><div className="mini-panel"><span className="eyebrow">SOBRE ESTA PUBLICAÇÃO</span><div className="info-row"><span>Veículo</span><b>{article.source_name}</b></div><div className="info-row"><span>Publicado em</span><b>{formatDate(article.published_at)}</b></div><div className="info-row"><span>Idioma original</span><b>{article.language.toUpperCase()}</b></div><div className="info-row"><span>Categoria</span><b>{CATEGORY_LABELS[article.category]}</b></div><a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-link">Ver notícia original <ArrowUpRight size={15}/></a></div><FocusPanel/></aside></div></div>
}
function SavedPage({bookmarks}:{bookmarks:Bookmarks}){return <div className="container inner-page"><div className="page-top"><span className="eyebrow">SUA BIBLIOTECA</span><h1>O que você <em>guardou.</em></h1><p>Notícias salvas neste navegador para consultar depois.</p></div>{!bookmarks.saved.length?<Empty title="Sua lista está vazia" desc="Salve uma notícia tocando no ícone de marcador. Os favoritos ficam armazenados neste dispositivo." action={<Link to="/explorar" className="primary-btn">Explorar notícias <ArrowRight size={15}/></Link>}/>:<><div className="result-line">{bookmarks.saved.length} {bookmarks.saved.length===1?'notícia salva':'notícias salvas'} neste dispositivo</div><div className="cards-grid explorer-grid">{bookmarks.saved.map(a=><ArticleCard key={a.id} article={a} saved toggle={()=>bookmarks.toggle(a)}/>)}</div></>}</div>}
type SourceInfo={name:string;category:NewsCategory;site:string;language:string}
function SourcesPage(){const [sources,setSources]=useState<SourceInfo[]>([]),[status,setStatus]=useState<{articles:number;last_sync?:{finished_at:string;feeds_ok:number;feeds_failed:number}}|null>(null)
  useEffect(()=>{void Promise.all([fetch('/api/sources').then(async r=>(await r.json()) as {items:SourceInfo[]}),fetch('/api/status').then(async r=>(await r.json()) as NonNullable<typeof status>)]).then(([s,v])=>{setSources(s.items??[]);setStatus(v)}).catch(()=>{})},[])
  return <div className="container inner-page"><div className="page-top"><span className="eyebrow">TRANSPARÊNCIA EDITORIAL</span><h1>A notícia vem <em>da fonte.</em></h1><p>O GCL NEWS organiza manchetes e resumos de feeds públicos. Cada publicação aponta para o veículo original.</p></div><div className="source-intro"><div><span className="eyebrow">COMO FUNCIONA</span><h2>Uma curadoria automatizada, com origem identificada.</h2><p>Coletamos periodicamente atualizações dos feeds RSS/Atom listados abaixo. Elas são classificadas por assunto e exibidas com data, link e atribuição. O ranking é automático e não há checagem jornalística independente. Títulos e resumos de fontes em inglês são traduzidos automaticamente para português; as traduções podem conter imprecisões.</p></div><div className="source-kpis"><div><b>{sources.length||'—'}</b><span>Fontes configuradas</span></div><div><b>{status?.articles??'—'}</b><span>Notícias indexadas</span></div><div><b>{status?.last_sync?.finished_at?formatSync(status.last_sync.finished_at):'Pendente'}</b><span>Última coleta</span></div></div></div><SectionTitle eyebrow="NOSSA REDE" title="Fontes acompanhadas" subtitle="A disponibilidade dos feeds depende de cada publicação."/>{!sources.length?<Empty title="Aguardando conexão" desc="A lista será carregada quando a API estiver disponível."/>:<div className="sources-grid">{sources.map(s=><div className="source-card" key={s.name}><span className="source-icon"><Globe2 size={20}/></span><div><b>{s.name}</b><small>{s.site}</small><span>{CATEGORY_LABELS[s.category]} · {s.language.toUpperCase()}</span></div></div>)}</div>}<div className="ethics-box"><ShieldCheck size={23}/><div><h3>Compromisso com a procedência</h3><p>As notícias são republicadas apenas como metadados e pequenos trechos dos feeds de origem. As imagens são exibidas quando fornecidas pelo RSS e usam atribuição; caso contrário, aparecem ilustrações editoriais da GCL. Confira sempre a reportagem original antes de tomar decisões. Para monetização ou redistribuição comercial, verifique as licenças dos fornecedores.</p></div></div></div>
}
function AdminPage(){const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[detail,setDetail]=useState(''),[records,setRecords]=useState<{id:string;title:string;source_name:string;active:number}[]>([]),[form,setForm]=useState({title:'',excerpt:'',category:'ia',source_name:'',source_url:'',image_url:'',published_at:new Date().toLocaleString('sv-SE',{timeZone:'America/Sao_Paulo',hour12:false}).replace(' ','T').slice(0,16)})
  const auth=async(path:string,method:'POST'|'DELETE'='POST',body?:object)=>{if(!key)return setMessage('Informe a chave de administração.');setBusy(true);setMessage('');setDetail('');try{const res=await fetch('/api/admin/'+path,{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const result=(await res.json()) as {error?:string;feeds_ok?:number;imported?:number;details?:string[]};if(!res.ok)throw Error(result.error||'Falha na operação');setMessage(path==='refresh'?`Sincronização concluída: ${result.feeds_ok} fontes acessadas, ${result.imported} itens processados.`:'Publicação criada com sucesso.');setDetail(path==='refresh'?(result.details||[]).join(' · '):'');if(path==='articles')setForm(v=>({...v,title:'',excerpt:'',source_url:''}))}catch(e){setMessage(e instanceof Error?e.message:'Erro desconhecido')}finally{setBusy(false)}}
  const loadRecords=async()=>{if(!key)return;setBusy(true);setMessage('');try{const res=await fetch('/api/admin/articles',{headers:{Authorization:'Bearer '+key}});const data=(await res.json()) as {error?:string;items?:typeof records};if(!res.ok)throw Error(data.error||'Acesso negado');setRecords(data.items??[])}catch(e){setMessage(e instanceof Error?e.message:'Falha ao listar artigos')}finally{setBusy(false)}}
  const hideArticle=async(id:string)=>{if(!key||!window.confirm('Ocultar esta publicação do portal?'))return;setBusy(true);try{const res=await fetch('/api/admin/articles/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+key}});if(!res.ok)throw Error('Falha ao ocultar');setRecords(r=>r.map(x=>x.id===id?{...x,active:0}:x));setMessage('Publicação ocultada com sucesso.')}catch(e){setMessage(e instanceof Error?e.message:'Erro')}finally{setBusy(false)}}
  return <div className="container inner-page admin-page"><div className="page-top"><span className="eyebrow">ACESSO RESTRITO</span><h1>Painel <em>editorial.</em></h1><p>Sincronize os feeds e adicione publicações com fonte identificada. A chave nunca é embutida no site público nem guardada no navegador.</p></div><div className="admin-layout"><section className="admin-card"><span className="eyebrow"><ShieldCheck size={14}/> SEGURANÇA</span><h2>Chave de acesso</h2><label>ADMIN_API_KEY<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="Insira sua chave secreta"/></label><div className="admin-actions"><button className="primary-btn" disabled={busy||!key} onClick={()=>auth('refresh')}><CloudDownload size={16}/>{busy?'Processando...':'Sincronizar RSS agora'}</button></div><p className="admin-help">A coleta automática ocorre de hora em hora, após o deploy no Cloudflare. A sincronização manual permite atualizar antes.</p>{message&&<div role="status" className="admin-message">{message}</div>}{detail&&<p className="admin-help">{detail}</p>}</section><section className="admin-card"><span className="eyebrow"><Newspaper size={14}/> PUBLICAÇÃO MANUAL</span><h2>Adicionar notícia</h2><form onSubmit={e=>{e.preventDefault();void auth('articles','POST',{...form,published_at:new Date(form.published_at).toISOString()})}} className="admin-form"><label>Manchete<input minLength={12} maxLength={220} required value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label><label>Resumo da fonte<textarea minLength={30} maxLength={480} required rows={4} value={form.excerpt} onChange={e=>setForm(v=>({...v,excerpt:e.target.value}))}/></label><div className="two-cols"><label>Editoria<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{categoryOptions.filter(x=>x.id!=='all').map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><label>Data<input type="datetime-local" required value={form.published_at} onChange={e=>setForm(v=>({...v,published_at:e.target.value}))}/></label></div><label>Nome da fonte<input required value={form.source_name} onChange={e=>setForm(v=>({...v,source_name:e.target.value}))}/></label><label>URL da reportagem<input type="url" required placeholder="https://..." value={form.source_url} onChange={e=>setForm(v=>({...v,source_url:e.target.value}))}/></label><label>URL da imagem (opcional)<input type="url" placeholder="https://..." value={form.image_url} onChange={e=>setForm(v=>({...v,image_url:e.target.value}))}/></label><button type="submit" className="primary-btn" disabled={busy||!key}>Publicar notícia <ArrowUpRight size={16}/></button></form></section></div><section className="admin-card admin-manage"><div className="admin-manage-title"><div><span className="eyebrow">MODERAÇÃO</span><h2>Gerenciar publicações</h2></div><button className="outline-btn" disabled={busy||!key} onClick={loadRecords}>Carregar últimas notícias <ArrowRight size={16}/></button></div>{records.length>0?<div className="manage-list">{records.map(a=><div className="manage-row" key={a.id}><div><b>{a.title}</b><small>{a.source_name} · {a.active?'Publicada':'Oculta'}</small></div><button disabled={busy||!a.active} onClick={()=>hideArticle(a.id)}>{a.active?'Ocultar':'Oculta'}</button></div>)}</div>:<p className="admin-help">Informe sua chave e carregue a lista para revisar ou ocultar notícias publicadas.</p>}</section></div>
}
function Footer(){return <footer className="footer"><div className="container"><div className="footer-top"><div><Brand/><p>Notícias em tecnologia, IA e negócios</p></div><div><span>NAVEGAÇÃO</span><Link to="/">Início</Link><Link to="/explorar">Notícias</Link><Link to="/mercado">Mercado</Link><Link to="/salvos">Salvos</Link><Link to="/fontes">Fontes</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} GCL NEWS</span></div></div></footer>}
export default function App(){const bookmarks=useBookmarks(),{theme,toggle}=useTheme(),location=useLocation()
  useEffect(()=>{document.title=location.pathname==='/explorar'?'Explorar notícias | GCL NEWS':location.pathname==='/mercado'?'Mercado financeiro | GCL NEWS':location.pathname==='/salvos'?'Notícias salvas | GCL NEWS':location.pathname==='/fontes'?'Fontes | GCL NEWS':location.pathname==='/admin'?'Administração | GCL NEWS':'GCL NEWS | Tecnologia, IA e negócios'},[location.pathname])
  return <div className="app-shell"><Header savedCount={bookmarks.saved.length} theme={theme} onTheme={toggle}/><Routes><Route path="/" element={<HomePage bookmarks={bookmarks}/>}/><Route path="/explorar" element={<ExplorePage bookmarks={bookmarks}/>}/><Route path="/mercado" element={<MarketPage/>}/><Route path="/salvos" element={<SavedPage bookmarks={bookmarks}/>}/><Route path="/fontes" element={<SourcesPage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="/noticia/:slug" element={<StoryPage bookmarks={bookmarks}/>}/><Route path="*" element={<div className="container inner-page"><Empty title="Página não encontrada" desc="Esse endereço não existe no GCL NEWS." action={<Link to="/" className="primary-btn">Voltar ao início</Link>}/></div>}/></Routes><Footer/></div>
}
