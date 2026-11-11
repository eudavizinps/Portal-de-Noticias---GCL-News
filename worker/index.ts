import { Hono } from 'hono'
import { FEEDS, type NewsCategory } from './sources'
import { ingestAll } from './ingest'

interface Env {
  DB: D1Database
  ADMIN_API_KEY: string
  ASSETS: Fetcher
}
const app=new Hono<{Bindings:Env}>()
const CATEGORIES = new Set<NewsCategory>(['ia','programacao','ciberseguranca','negocios','economia','internacional','tecnologia'])
const jsonError=(message:string)=>({error:message})
const dayInBrazil=()=> {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const read=(t:string)=>parts.find(p=>p.type===t)?.value ?? ''
  return `${read('year')}-${read('month')}-${read('day')}`
}
const selectArticle=`id,slug,title,excerpt,image_url,category,source_name,source_url,published_at,fetched_at,relevance_score,language`

app.use('/api/*', async(c,next)=> {
  await next()
  c.header('Cache-Control', c.req.method === 'GET' && !c.req.path.startsWith('/api/admin/') ? 'public, max-age=45, stale-while-revalidate=120' : 'no-store')
  c.header('X-Content-Type-Options','nosniff')
})
app.get('/api/health',c=>c.json({status:'ok',time:new Date().toISOString(),service:'GCL NEWS API'}))
app.get('/api/sources',c=>c.json({items:FEEDS.map(f=>({name:f.name,category:f.category,site:new URL(f.url).host,language:f.language}))}))
app.get('/api/status',async c=>{
  const last=await c.env.DB.prepare('SELECT started_at,finished_at,status,imported,feeds_ok,feeds_failed FROM ingest_runs ORDER BY started_at DESC LIMIT 1').first()
  const count=await c.env.DB.prepare('SELECT count(*) AS total FROM articles WHERE active=1').first<{total:number}>()
  return c.json({articles:count?.total??0,last_sync:last??null,sources:FEEDS.length})
})
app.get('/api/edition',async c=>{
  const date=dayInBrazil()
  const aliased = selectArticle.split(',').map(name=>'a.'+name.trim()).join(',')
  let stored=await c.env.DB.prepare(`SELECT ${aliased} FROM edition_items e JOIN articles a ON a.id=e.article_id WHERE e.edition_date=? AND a.active=1 ORDER BY e.position`).bind(date).all()
  let rows=(stored.results??[]) as Record<string,unknown>[]
  if(rows.length<5){
    // Primeiro acesso do dia: montar uma seleção diversificada e registrar no D1.
    const recent=await c.env.DB.prepare(`SELECT ${selectArticle} FROM articles WHERE active=1 AND published_at >= ? ORDER BY published_at DESC LIMIT 240`).bind(new Date(Date.now()-7*86400000).toISOString()).all()
    const previous=await c.env.DB.prepare(`SELECT article_id FROM edition_items WHERE edition_date<? AND edition_date>=?`).bind(date,new Date(Date.now()-3*86400000).toISOString().slice(0,10)).all<{article_id:string}>()
    const used=new Set((previous.results??[]).map(r=>r.article_id))
    const candidates=(recent.results??[]) as Record<string,unknown>[]
    const score=(a:Record<string,unknown>)=>{
      const hours=Math.max(0,(Date.now()-Date.parse(String(a.published_at)))/3600000)
      return Number(a.relevance_score||50)+(a.language==='pt'?10:0)+(hours<=24?45:hours<=48?23:hours<=72?8:0)
    }
    candidates.sort((a,b)=>score(b)-score(a))
    const chosen:Record<string,unknown>[]=[],categoryCounts=new Map<string,number>(),sourceCounts=new Map<string,number>()
    const normalized=(title:string)=>title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3).slice(0,10)
    const similar=(a:Record<string,unknown>,b:Record<string,unknown>)=>{
      const one=normalized(String(a.title)),two=new Set(normalized(String(b.title)))
      return one.length>=4&&one.filter(w=>two.has(w)).length/Math.max(one.length,1)>.63
    }
    for(const phase of [0,1,2,3]){
      for(const a of candidates){
        if(chosen.length>=5)break
        const cat=String(a.category),source=String(a.source_name)
        if(chosen.some(x=>x.id===a.id)||chosen.some(x=>similar(x,a)))continue
        if(phase<2&&used.has(String(a.id)))continue
        if(phase===0&&((categoryCounts.get(cat)??0)>=2||(sourceCounts.get(source)??0)>=2))continue
        if(phase===1&&(sourceCounts.get(source)??0)>=2)continue
        chosen.push(a);categoryCounts.set(cat,(categoryCounts.get(cat)??0)+1);sourceCounts.set(source,(sourceCounts.get(source)??0)+1)
      }
      if(chosen.length>=5)break
    }
    if(chosen.length>0){
      await c.env.DB.batch(chosen.slice(0,5).map((a,i)=>c.env.DB.prepare('INSERT OR IGNORE INTO edition_items(edition_date,position,article_id) VALUES (?,?,?)').bind(date,i+1,a.id)))
      stored=await c.env.DB.prepare(`SELECT ${aliased} FROM edition_items e JOIN articles a ON a.id=e.article_id WHERE e.edition_date=? AND a.active=1 ORDER BY e.position`).bind(date).all()
      rows=(stored.results??[]) as Record<string,unknown>[]
    }
  }
  const last=await c.env.DB.prepare('SELECT finished_at FROM ingest_runs WHERE status=? ORDER BY started_at DESC LIMIT 1').bind('complete').first<{finished_at:string}>()
  return c.json({items:rows.slice(0,5),date,latest_update:last?.finished_at??null,period:'Destaques do dia, priorizando as últimas 24 horas e evitando repetições recentes'})
})
app.get('/api/articles',async c=>{
  const q=(c.req.query('q')??'').trim().slice(0,100)
  const category=c.req.query('category')??''
  if (category&&!CATEGORIES.has(category as NewsCategory)) return c.json(jsonError('Categoria inválida'),400)
  const page=Math.max(1,Math.min(500,Number(c.req.query('page'))||1))
  const limit=Math.max(1,Math.min(24,Number(c.req.query('limit'))||12))
  let where='WHERE active=1', args:unknown[]=[]
  if(category){where+=' AND category=?';args.push(category)}
  if(q){where+=' AND (instr(lower(title),lower(?))>0 OR instr(lower(excerpt),lower(?))>0 OR instr(lower(source_name),lower(?))>0)';args.push(q,q,q)}
  const count=await c.env.DB.prepare(`SELECT count(*) AS total FROM articles ${where}`).bind(...args).first<{total:number}>()
  const found=await c.env.DB.prepare(`SELECT ${selectArticle} FROM articles ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).bind(...args,limit,(page-1)*limit).all()
  const last=await c.env.DB.prepare('SELECT finished_at FROM ingest_runs WHERE status=? ORDER BY started_at DESC LIMIT 1').bind('complete').first<{finished_at:string}>()
  return c.json({items:found.results??[],total:count?.total??0,page,limit,latest_update:last?.finished_at??null})
})
app.get('/api/articles/:slug',async c=>{
  const item=await c.env.DB.prepare(`SELECT ${selectArticle} FROM articles WHERE slug=? AND active=1`).bind(c.req.param('slug')).first()
  return item?c.json({item}):c.json(jsonError('Notícia não encontrada'),404)
})
// Admin API: token stays server-side. Do not place it in the React bundle or public variables.
app.use('/api/admin/*',async(c,next)=>{
  const expected=c.env.ADMIN_API_KEY
  if(!expected || expected.length<24) return c.json(jsonError('Configure ADMIN_API_KEY com wrangler secret put'),503)
  const got=(c.req.header('Authorization')??'').replace(/^Bearer\s+/i,'')
  const a=new TextEncoder().encode(expected),b=new TextEncoder().encode(got)
  let diff=a.length^b.length
  for(let i=0;i<a.length;i++) diff |= a[i]^(b[i]??0)
  if(diff!==0)return c.json(jsonError('Não autorizado'),401)
  await next()
})
app.get('/api/admin/articles',async c=>{
  const articles=await c.env.DB.prepare(`SELECT id,slug,title,source_name,published_at,active FROM articles ORDER BY fetched_at DESC LIMIT 40`).all()
  return c.json({items:articles.results??[]})
})
app.post('/api/admin/refresh',async c=>{
  const outcome=await ingestAll(c.env.DB)
  if(outcome.feeds_ok) await c.env.DB.prepare('DELETE FROM edition_items WHERE edition_date=?').bind(dayInBrazil()).run()
  return c.json(outcome,outcome.feeds_ok?200:502)
})
app.post('/api/admin/articles',async c=>{
  let data:Record<string,unknown>
  try{data=await c.req.json()}catch{return c.json(jsonError('JSON inválido'),400)}
  const title=String(data.title??'').trim().slice(0,220)
  const excerpt=String(data.excerpt??'').trim().slice(0,480)
  const sourceName=String(data.source_name??'').trim().slice(0,100)
  const category=String(data.category??'')
  const date=String(data.published_at??new Date().toISOString())
  let url:string
  try{const u=new URL(String(data.source_url));if(u.protocol!=='https:'&&u.protocol!=='http:')throw Error();url=u.href}catch{return c.json(jsonError('Link da fonte inválido'),400)}
  if(title.length<12||excerpt.length<30||!sourceName||!CATEGORIES.has(category as NewsCategory)||Number.isNaN(Date.parse(date)))return c.json(jsonError('Campos obrigatórios inválidos'),400)
  const id=crypto.randomUUID(),slug=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,80)+'-'+id.slice(0,8)
  const picture=typeof data.image_url==='string'&&/^https?:\/\//.test(data.image_url)?data.image_url.slice(0,1200):null
  try {
    await c.env.DB.prepare(`INSERT INTO articles(id,slug,title,excerpt,image_url,category,source_name,source_url,published_at,fetched_at,relevance_score,language) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,slug,title,excerpt,picture,category,sourceName,url,new Date(date).toISOString(),new Date().toISOString(),90,'pt').run()
    return c.json({success:true,slug},201)
  }catch{return c.json(jsonError('Notícia duplicada ou erro de banco'),409)}
})
app.delete('/api/admin/articles/:id',async c=>{
  const result=await c.env.DB.prepare('UPDATE articles SET active=0 WHERE id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM edition_items WHERE article_id=?').bind(c.req.param('id')).run()
  return c.json({success:true,changed:result.meta.changes})
})
app.notFound(c=>c.json(jsonError('Rota não encontrada'),404))
app.onError((err,c)=>{console.error('API error',err);return c.json(jsonError('Falha interna da API'),500)})

export default {
  fetch:(request:Request,env:Env,ctx:ExecutionContext)=>app.fetch(request,env,ctx),
  scheduled:async (_controller:ScheduledController,env:Env,ctx:ExecutionContext)=>{ ctx.waitUntil(ingestAll(env.DB).then(r=>console.log('sync',r)).catch(err=>console.error('sync failed',err))) },
} satisfies ExportedHandler<Env>
