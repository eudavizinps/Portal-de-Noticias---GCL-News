import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock3, CloudDownload, Compass, ExternalLink, Globe2, Home as HomeIcon, LayoutDashboard, Menu, Moon, Newspaper, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, TrendingUp, Wifi, X } from 'lucide-react'
import type { Article, ArticlesResponse, NewsCategory } from './types'
import { CATEGORY_LABELS, isNewsCategory } from './types'
import { formatDate, formatNow, formatSync, impactFor, priorities } from './utils'
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
const navLinks = [ {to:'/',label:'Início',icon:HomeIcon}, {to:'/explorar',label:'Explorar',icon:Compass}, {to:'/salvos',label:'Salvos',icon:Bookmark}, {to:'/fontes',label:'Fontes',icon:Globe2} ]

function useBookmarks() {
  const [saved,setSaved]=useState<Article[]>(()=>{
    try {const data=JSON.parse(localStorage.getItem('gcl-radar-bookmarks-v1')||'[]');return Array.isArray(data)?data.filter(x=>x?.slug&&x?.source_url):[]}
    catch{return []}
  })
  useEffect(()=>{try{localStorage.setItem('gcl-radar-bookmarks-v1',JSON.stringify(saved))}catch{}},[saved])
  const toggle=useCallback((a:Article)=>setSaved(old=>old.some(x=>x.id===a.id)?old.filter(x=>x.id!==a.id):[a,...old]),[])
  return {saved,toggle,has:(id:string)=>saved.some(x=>x.id===id)}
}
type Bookmarks=ReturnType<typeof useBookmarks>
function useTheme() {
  const [theme,setTheme]=useState<'dark'|'light'>(()=>{
    try{return localStorage.getItem('gcl-radar-theme')==='light'?'light':'dark'}catch{return 'dark'}
  })
  useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('gcl-radar-theme',theme)}catch{}},[theme])
  return {theme,toggle:()=>setTheme(t=>t==='dark'?'light':'dark')}
}
function Brand(){return <Link className="brand" to="/" aria-label="GCL NEWS - página inicial">
  <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 42"><path d="M34 13A15 15 0 1 0 34 29M25 13H34V21H26M25 29H34" stroke="currentColor" strokeWidth="4.1" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
  <span className="brand-copy"><b>GCL<span>NEWS</span></b><small>INTELIGÊNCIA EM NOTÍCIAS</small></span>
</Link>}
function Header({savedCount,theme,onTheme}:{savedCount:number;theme:string;onTheme:()=>void}){
  const [open,setOpen]=useState(false)
  const [showSearch,setShowSearch]=useState(false)
  const [q,setQ]=useState('')
  const navigate=useNavigate()
  const loc=useLocation()
  useEffect(()=>{setOpen(false);setShowSearch(false)},[loc.pathname])
  return <>
    <div className="utility-top"><div className="container utility-flex"><span className="utility-date"><CalendarDays size={13}/> {formatNow()}</span><span className="utility-right"><span className="pulse-dot"/> Notícias de tecnologia e negócios para você <span className="utility-divider">·</span> GCL TECHNOLOGY</span></div></div>
    <header className="site-header"><div className="container header-inner">
      <Brand/>
      <nav className="desktop-nav" aria-label="Menu principal">{navLinks.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/'} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{n.label}{n.to==='/salvos'&&savedCount>0?<span className="small-count">{savedCount}</span>:null}</NavLink>)}</nav>
      <div className="header-actions">
        <button className="icon-button" aria-label="Pesquisar notícias" title="Pesquisar" onClick={()=>setShowSearch(s=>!s)}><Search size={19}/></button>
        <button className="icon-button" aria-label={theme==='dark'?'Ativar tema claro':'Ativar tema escuro'} title="Alternar tema" onClick={onTheme}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button>
        <button className="icon-button mobile-only" aria-label="Abrir menu" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>{open?<X size={22}/>:<Menu size={22}/>}</button>
      </div>
      {showSearch&&<form className="header-search" onSubmit={e=>{e.preventDefault();navigate('/explorar?q='+encodeURIComponent(q));setShowSearch(false)}}><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar notícias, temas, empresas..." aria-label="Buscar notícias"/><button type="submit">Buscar <ArrowRight size={16}/></button></form>}
    </div>{open&&<nav className="mobile-nav" aria-label="Menu móvel">{navLinks.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/'}><n.icon size={18}/>{n.label}</NavLink>)}<NavLink to="/admin"><Settings2 size={18}/>Administração</NavLink></nav>}</header>
  </>
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
      <div className="hero-topline"><span className="hot-pill"><span className="pulse-dot"/> EM DESTAQUE</span><span className="hero-index">{String(index+1).padStart(2,'0')} <span>/ {String(items.length).padStart(2,'0')}</span></span></div>
      <div className="hero-bottom">
        <span className={`cat-label cat-${active.category}`}>{CATEGORY_LABELS[active.category]}</span>
        <h1 key={active.slug}>{active.title}</h1>
        <p>{active.excerpt}</p>
        <div className="hero-byline"><span>{active.source_name}</span><span className="meta-dot"/><span>{formatDate(active.published_at)}</span>{active.language!=='pt'&&<span className="original-lang">Original {active.language.toUpperCase()}</span>}</div>
        <div className="hero-cta"><Link className="primary-btn" to={`/noticia/${active.slug}`}>Ler notícia <ArrowUpRight size={17}/></Link><button className="hero-save" onClick={()=>bookmarks.toggle(active)} aria-label="Salvar destaque"><Bookmark size={19} fill={bookmarks.has(active.id)?'currentColor':'none'}/></button></div>
      </div>
    </div>
    <div className="hero-controls"><button onClick={prev} aria-label="Destaque anterior"><ChevronLeft size={19}/></button><div className="hero-progress">{items.map((a,i)=><button key={a.id} className={i===index?'on':''} onClick={()=>setIndex(i)} aria-label={`Ir para destaque ${i+1}`}/>)}</div><button onClick={next} aria-label="Próximo destaque"><ChevronRight size={19}/></button></div>
  </section>
}
function SectionTitle({eyebrow,title,subtitle,action}:{eyebrow?:string;title:string;subtitle?:string;action?:React.ReactNode}){return <div className="section-head"><div><span className="eyebrow">{eyebrow??'GCL NEWS'}</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}
function Empty({title,desc,action}:{title:string;desc:string;action?:React.ReactNode}){return <div className="empty-state"><Newspaper size={30}/><h3>{title}</h3><p>{desc}</p>{action}</div>}
function FocusPanel(){return <aside className="focus-panel"><div className="panel-heading"><span><Sparkles size={16}/> PARA A GCL TECHNOLOGY</span><small>VISÃO ESTRATÉGICA</small></div><h3>Da notícia à oportunidade.</h3><p>Três frentes para acompanhar na construção de produtos digitais.</p><div className="focus-list">{priorities.map(p=><div className="focus-item" key={p.number}><span className="focus-number">{p.number}</span><div><small>{p.label}</small><b>{p.title}</b><p>{p.text}</p></div></div>)}</div><div className="focus-foot"><span>Foco em segurança, eficiência e resultados.</span><TrendingUp size={19}/></div></aside>}
function HomePage({bookmarks}:{bookmarks:Bookmarks}){
  const {edition,archive,loading,error,isDemo,lastSync,total,refresh}=useNews()
  const top=edition.slice(0,5)
  const featuredMore=archive.filter(a=>!top.some(x=>x.id===a.id)).slice(0,4)
  return <>
    <div className="container home-wrap">
      <div className="page-kicker"><span><span className="kicker-line"/> EDIÇÃO DO DIA</span><StatusBadge lastSync={lastSync} isDemo={isDemo}/></div>
      <div className="intro-line"><div><h2>Informação que move <em>decisões.</em></h2><p>IA, tecnologia, segurança e negócios — o que importa, sem ruído.</p></div><Link to="/explorar" className="text-link">Explorar notícias <ArrowUpRight size={17}/></Link></div>
      {loading?<div className="skeleton hero-skeleton"/>:error?<Empty title="Notícias temporariamente indisponíveis" desc={error} action={<button className="primary-btn" onClick={refresh}>Tentar novamente</button>}/>:<Hero items={top} bookmarks={bookmarks}/>}
      <div className="insight-strip"><span><ShieldCheck size={18}/> Fontes identificadas</span><span><Globe2 size={18}/> Notícias com link original</span><span><Clock3 size={18}/> Atualização automática após implantação</span></div>
      <div className="main-layout">
        <main className="main-column"><SectionTitle eyebrow="CURADORIA EM FOCO" title="As 5 notícias do GCL NEWS" subtitle="Os assuntos mais relevantes da edição atual." action={<span className="edition-number">EDIÇÃO / {String(top.length).padStart(2,'0')}</span>}/>
        {!loading&&top.length===0?<Empty title="Ainda sem notícias" desc="O portal será preenchido por feeds oficiais depois da primeira sincronização. Nenhuma manchete é criada artificialmente."/>:<div className="cards-grid">{top.map(a=><ArticleCard key={a.id} article={a} saved={bookmarks.has(a.id)} toggle={()=>bookmarks.toggle(a)}/>)}</div>}
        </main><div className="sidebar-column"><FocusPanel/><aside className="mini-panel"><span className="eyebrow">TRANSPARÊNCIA</span><h3>Notícia com origem.</h3><p>As manchetes e os resumos são obtidos de feeds públicos. A leitura completa acontece no site de origem.</p><div className="mini-stats"><div><b>{total}</b><small>notícias no acervo</small></div><div><b>7</b><small>editorias</small></div></div><Link to="/fontes" className="text-link">Conheça as fontes <ArrowUpRight size={15}/></Link></aside></div>
      </div>
      <section className="more-section"><SectionTitle eyebrow="PARA IR ALÉM" title="Continue explorando" subtitle="Outras publicações recentes das fontes acompanhadas." action={<Link className="outline-btn" to="/explorar">Ver arquivo <ArrowUpRight size={15}/></Link>}/>
      {featuredMore.length>0?<div className="compact-grid">{featuredMore.map(a=><Link className="compact-story" to={`/noticia/${a.slug}`} key={a.id}><ArticleImage article={a}/><div><span className={`cat-label cat-${a.category}`}>{CATEGORY_LABELS[a.category]}</span><h3>{a.title}</h3><span>{a.source_name} · {formatDate(a.published_at,true)}</span></div><ArrowUpRight size={17}/></Link>)}</div>:<p className="soft-note">Novas matérias aparecerão aqui assim que forem recebidas.</p>}</section>
      <div className="bottom-cta"><span><Sparkles size={17}/> SEU PORTAL, SUA ROTINA</span><h2>Menos rolagem. Mais contexto.</h2><p>Leia o essencial, salve o que importa e transforme tendências em decisões.</p><Link to="/explorar" className="primary-btn">Explorar o arquivo <ArrowRight size={17}/></Link></div>
    </div>
  </>
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
  return <div className="container article-page"><button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Voltar</button><div className="article-layout"><main className="story-content"><div className="story-heading"><span className={`cat-label cat-${article.category}`}>{CATEGORY_LABELS[article.category]}</span><h1>{article.title}</h1><div className="story-meta"><span>{article.source_name}</span><span className="meta-dot"/><span>{formatDate(article.published_at)}</span>{article.language!=='pt'&&<span className="original-lang">Idioma original: {article.language.toUpperCase()}</span>}</div><div className="story-actions"><button onClick={()=>bookmarks.toggle(article)}><Bookmark size={17} fill={bookmarks.has(article.id)?'currentColor':'none'}/>{bookmarks.has(article.id)?'Salvo':'Salvar'}</button><button onClick={share}>{copied?<Check size={17}/>:<ArrowUpRight size={17}/>} {copied?'Link copiado':'Compartilhar'}</button></div></div><div className="story-cover"><ArticleImage article={article} priority/></div><div className="summary-box"><span className="eyebrow">RESUMO DA FONTE</span><p>{article.excerpt}</p></div><div className="story-section"><h2>O que isso significa para quem trabalha com tecnologia?</h2><p>Acompanhar esse assunto pode ajudar equipes de desenvolvimento a tomar decisões mais informadas. A recomendação abaixo é uma orientação geral baseada no tema da notícia, não uma conclusão reportada pela fonte.</p><div className="practical-impact"><div className="practical-icon"><TrendingUp size={22}/></div><div><span>IMPACTO PRÁTICO PARA A GCL</span><p>{impactFor(article)}</p></div></div></div><div className="source-callout"><span>Conteúdo completo e detalhes originais</span><h3>Continue a leitura na fonte.</h3><p>O GCL NEWS agrega títulos e pequenos resumos publicados nos feeds. Não reproduz integralmente artigos de terceiros.</p><a className="primary-btn" href={article.source_url} target="_blank" rel="noopener noreferrer">Abrir {article.source_name} <ExternalLink size={16}/></a></div></main><aside className="story-sidebar"><div className="mini-panel"><span className="eyebrow">SOBRE ESTA PUBLICAÇÃO</span><div className="info-row"><span>Veículo</span><b>{article.source_name}</b></div><div className="info-row"><span>Publicado em</span><b>{formatDate(article.published_at)}</b></div><div className="info-row"><span>Idioma original</span><b>{article.language.toUpperCase()}</b></div><div className="info-row"><span>Categoria</span><b>{CATEGORY_LABELS[article.category]}</b></div><a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-link">Ver notícia original <ArrowUpRight size={15}/></a></div><FocusPanel/></aside></div></div>
}
function SavedPage({bookmarks}:{bookmarks:Bookmarks}){return <div className="container inner-page"><div className="page-top"><span className="eyebrow">SUA BIBLIOTECA</span><h1>O que você <em>guardou.</em></h1><p>Notícias salvas neste navegador para consultar depois.</p></div>{!bookmarks.saved.length?<Empty title="Sua lista está vazia" desc="Salve uma notícia tocando no ícone de marcador. Os favoritos ficam armazenados neste dispositivo." action={<Link to="/explorar" className="primary-btn">Explorar notícias <ArrowRight size={15}/></Link>}/>:<><div className="result-line">{bookmarks.saved.length} {bookmarks.saved.length===1?'notícia salva':'notícias salvas'} neste dispositivo</div><div className="cards-grid explorer-grid">{bookmarks.saved.map(a=><ArticleCard key={a.id} article={a} saved toggle={()=>bookmarks.toggle(a)}/>)}</div></>}</div>}
type SourceInfo={name:string;category:NewsCategory;site:string;language:string}
function SourcesPage(){const [sources,setSources]=useState<SourceInfo[]>([]),[status,setStatus]=useState<{articles:number;last_sync?:{finished_at:string;feeds_ok:number;feeds_failed:number}}|null>(null)
  useEffect(()=>{void Promise.all([fetch('/api/sources').then(async r=>(await r.json()) as {items:SourceInfo[]}),fetch('/api/status').then(async r=>(await r.json()) as NonNullable<typeof status>)]).then(([s,v])=>{setSources(s.items??[]);setStatus(v)}).catch(()=>{})},[])
  return <div className="container inner-page"><div className="page-top"><span className="eyebrow">TRANSPARÊNCIA EDITORIAL</span><h1>A notícia vem <em>da fonte.</em></h1><p>O GCL NEWS organiza manchetes e resumos de feeds públicos. Cada publicação aponta para o veículo original.</p></div><div className="source-intro"><div><span className="eyebrow">COMO FUNCIONA</span><h2>Uma curadoria automatizada, com origem identificada.</h2><p>Coletamos periodicamente atualizações dos feeds RSS/Atom listados abaixo. Elas são classificadas por assunto e exibidas com data, link e atribuição. O ranking é automático; não há checagem jornalística independente nem tradução automática.</p></div><div className="source-kpis"><div><b>{sources.length||'—'}</b><span>Fontes configuradas</span></div><div><b>{status?.articles??'—'}</b><span>Notícias indexadas</span></div><div><b>{status?.last_sync?.finished_at?formatSync(status.last_sync.finished_at):'Pendente'}</b><span>Última coleta</span></div></div></div><SectionTitle eyebrow="NOSSA REDE" title="Fontes acompanhadas" subtitle="A disponibilidade dos feeds depende de cada publicação."/>{!sources.length?<Empty title="Aguardando conexão" desc="A lista será carregada quando a API estiver disponível."/>:<div className="sources-grid">{sources.map(s=><div className="source-card" key={s.name}><span className="source-icon"><Globe2 size={20}/></span><div><b>{s.name}</b><small>{s.site}</small><span>{CATEGORY_LABELS[s.category]} · {s.language.toUpperCase()}</span></div></div>)}</div>}<div className="ethics-box"><ShieldCheck size={23}/><div><h3>Compromisso com a procedência</h3><p>As notícias são republicadas apenas como metadados e pequenos trechos dos feeds de origem. As imagens são exibidas quando fornecidas pelo RSS e usam atribuição; caso contrário, aparecem ilustrações editoriais da GCL. Confira sempre a reportagem original antes de tomar decisões. Para monetização ou redistribuição comercial, verifique as licenças dos fornecedores.</p></div></div></div>
}
function AdminPage(){const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[detail,setDetail]=useState(''),[records,setRecords]=useState<{id:string;title:string;source_name:string;active:number}[]>([]),[form,setForm]=useState({title:'',excerpt:'',category:'ia',source_name:'',source_url:'',image_url:'',published_at:new Date().toLocaleString('sv-SE',{timeZone:'America/Sao_Paulo',hour12:false}).replace(' ','T').slice(0,16)})
  const auth=async(path:string,method:'POST'|'DELETE'='POST',body?:object)=>{if(!key)return setMessage('Informe a chave de administração.');setBusy(true);setMessage('');setDetail('');try{const res=await fetch('/api/admin/'+path,{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const result=(await res.json()) as {error?:string;feeds_ok?:number;imported?:number;details?:string[]};if(!res.ok)throw Error(result.error||'Falha na operação');setMessage(path==='refresh'?`Sincronização concluída: ${result.feeds_ok} fontes acessadas, ${result.imported} itens processados.`:'Publicação criada com sucesso.');setDetail(path==='refresh'?(result.details||[]).join(' · '):'');if(path==='articles')setForm(v=>({...v,title:'',excerpt:'',source_url:''}))}catch(e){setMessage(e instanceof Error?e.message:'Erro desconhecido')}finally{setBusy(false)}}
  const loadRecords=async()=>{if(!key)return;setBusy(true);setMessage('');try{const res=await fetch('/api/admin/articles',{headers:{Authorization:'Bearer '+key}});const data=(await res.json()) as {error?:string;items?:typeof records};if(!res.ok)throw Error(data.error||'Acesso negado');setRecords(data.items??[])}catch(e){setMessage(e instanceof Error?e.message:'Falha ao listar artigos')}finally{setBusy(false)}}
  const hideArticle=async(id:string)=>{if(!key||!window.confirm('Ocultar esta publicação do portal?'))return;setBusy(true);try{const res=await fetch('/api/admin/articles/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+key}});if(!res.ok)throw Error('Falha ao ocultar');setRecords(r=>r.map(x=>x.id===id?{...x,active:0}:x));setMessage('Publicação ocultada com sucesso.')}catch(e){setMessage(e instanceof Error?e.message:'Erro')}finally{setBusy(false)}}
  return <div className="container inner-page admin-page"><div className="page-top"><span className="eyebrow">ACESSO RESTRITO</span><h1>Painel <em>editorial.</em></h1><p>Sincronize os feeds e adicione publicações com fonte identificada. A chave nunca é embutida no site público nem guardada no navegador.</p></div><div className="admin-layout"><section className="admin-card"><span className="eyebrow"><ShieldCheck size={14}/> SEGURANÇA</span><h2>Chave de acesso</h2><label>ADMIN_API_KEY<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="Insira sua chave secreta"/></label><div className="admin-actions"><button className="primary-btn" disabled={busy||!key} onClick={()=>auth('refresh')}><CloudDownload size={16}/>{busy?'Processando...':'Sincronizar RSS agora'}</button></div><p className="admin-help">A coleta automática ocorre a cada 3 horas, após o deploy no Cloudflare. A sincronização manual permite atualizar antes.</p>{message&&<div role="status" className="admin-message">{message}</div>}{detail&&<p className="admin-help">{detail}</p>}</section><section className="admin-card"><span className="eyebrow"><Newspaper size={14}/> PUBLICAÇÃO MANUAL</span><h2>Adicionar notícia</h2><form onSubmit={e=>{e.preventDefault();void auth('articles','POST',{...form,published_at:new Date(form.published_at).toISOString()})}} className="admin-form"><label>Manchete<input minLength={12} maxLength={220} required value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label><label>Resumo da fonte<textarea minLength={30} maxLength={480} required rows={4} value={form.excerpt} onChange={e=>setForm(v=>({...v,excerpt:e.target.value}))}/></label><div className="two-cols"><label>Editoria<select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>{categoryOptions.filter(x=>x.id!=='all').map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><label>Data<input type="datetime-local" required value={form.published_at} onChange={e=>setForm(v=>({...v,published_at:e.target.value}))}/></label></div><label>Nome da fonte<input required value={form.source_name} onChange={e=>setForm(v=>({...v,source_name:e.target.value}))}/></label><label>URL da reportagem<input type="url" required placeholder="https://..." value={form.source_url} onChange={e=>setForm(v=>({...v,source_url:e.target.value}))}/></label><label>URL da imagem (opcional)<input type="url" placeholder="https://..." value={form.image_url} onChange={e=>setForm(v=>({...v,image_url:e.target.value}))}/></label><button type="submit" className="primary-btn" disabled={busy||!key}>Publicar notícia <ArrowUpRight size={16}/></button></form></section></div><section className="admin-card admin-manage"><div className="admin-manage-title"><div><span className="eyebrow">MODERAÇÃO</span><h2>Gerenciar publicações</h2></div><button className="outline-btn" disabled={busy||!key} onClick={loadRecords}>Carregar últimas notícias <ArrowRight size={16}/></button></div>{records.length>0?<div className="manage-list">{records.map(a=><div className="manage-row" key={a.id}><div><b>{a.title}</b><small>{a.source_name} · {a.active?'Publicada':'Oculta'}</small></div><button disabled={busy||!a.active} onClick={()=>hideArticle(a.id)}>{a.active?'Ocultar':'Oculta'}</button></div>)}</div>:<p className="admin-help">Informe sua chave e carregue a lista para revisar ou ocultar notícias publicadas.</p>}</section></div>
}
function Footer(){return <footer className="footer"><div className="container"><div className="footer-top"><div><Brand/><p>Inteligência em notícias para quem constrói, desenvolve e empreende.</p></div><div><span>NAVEGAÇÃO</span><Link to="/">Início</Link><Link to="/explorar">Notícias</Link><Link to="/salvos">Favoritos</Link></div><div><span>PORTAL</span><Link to="/fontes">Fontes e transparência</Link><Link to="/admin">Administração</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} GCL Technology · NEWS</span><span>Agregador de manchetes e resumos. Direitos das notícias pertencem às fontes originais.</span></div></div></footer>}
export default function App(){const bookmarks=useBookmarks(),{theme,toggle}=useTheme(),location=useLocation()
  useEffect(()=>{document.title=location.pathname==='/explorar'?'Explorar notícias | GCL NEWS':location.pathname==='/salvos'?'Notícias salvas | GCL NEWS':location.pathname==='/fontes'?'Fontes | GCL NEWS':location.pathname==='/admin'?'Administração | GCL NEWS':'GCL NEWS | Tecnologia, IA e negócios'},[location.pathname])
  return <div className="app-shell"><Header savedCount={bookmarks.saved.length} theme={theme} onTheme={toggle}/><Routes><Route path="/" element={<HomePage bookmarks={bookmarks}/>}/><Route path="/explorar" element={<ExplorePage bookmarks={bookmarks}/>}/><Route path="/salvos" element={<SavedPage bookmarks={bookmarks}/>}/><Route path="/fontes" element={<SourcesPage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="/noticia/:slug" element={<StoryPage bookmarks={bookmarks}/>}/><Route path="*" element={<div className="container inner-page"><Empty title="Página não encontrada" desc="Esse endereço não existe no GCL NEWS." action={<Link to="/" className="primary-btn">Voltar ao início</Link>}/></div>}/></Routes><Footer/></div>
}
