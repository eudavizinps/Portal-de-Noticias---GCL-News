import { XMLParser } from 'fast-xml-parser'
import { FEEDS, type Feed, type NewsCategory } from './sources'
import { translateEnglish, type Translation } from './translation'

export interface NewsRow {
  id: string; slug: string; title: string; excerpt: string; image_url: string | null;
  category: NewsCategory; source_name: string; source_url: string;
  published_at: string; fetched_at: string; relevance_score: number; language: string
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true, processEntities: true })
const entities: Record<string,string> = { amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“' }
const plain = (raw: unknown) => String(raw ?? '')
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<\/?(?:p|div|br|li|h\d)[^>]*>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_m,e: string) => {
    if (e[0] === '#') { const x = Number.parseInt(e.startsWith('#x') ? e.slice(2) : e.slice(1), e.startsWith('#x') ? 16 : 10); return x>0 && x<=0x10ffff ? String.fromCodePoint(x) : ' ' }
    return entities[e.toLowerCase()] ?? ' '
  })
  .replace(/\s+/g, ' ').trim()
const list = <T>(val: T | T[] | undefined | null): T[] => val == null ? [] : Array.isArray(val) ? val : [val]
const field = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : ''

function imageLink(item: any): string | null {
  const media = list(item['media:content']).find((x: any) => x?.['@_medium'] === 'image' || String(x?.['@_type'] || '').startsWith('image/')) as any
  const thumb = list(item['media:thumbnail'])[0] as any
  const enclosure = list(item.enclosure).find((x: any) => String(x?.['@_type'] || '').startsWith('image/')) as any
  const hero = list(item['media:content'])[0] as any
  const candidates = [media?.['@_url'], thumb?.['@_url'], enclosure?.['@_url'], hero?.['@_url']]
  const body = String(item['content:encoded'] || item.description || '')
  const match = body.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)
  if (match) candidates.push(match[1])
  for(const c of candidates) {
    try { const u = new URL(String(c)); if (u.protocol === 'https:' || u.protocol === 'http:') return u.href }
    catch { /* no image */ }
  }
  return null
}

function categoryOf(title: string, excerpt: string, fallback: NewsCategory): NewsCategory {
  const t = `${title} ${excerpt}`.toLowerCase()
  if (/ransomware|vulnerab|breach|hack(?:ed|ing)?|cyber|malware|security flaw|cve-|data leak|phishing|ciberseguran|vazamento|ataque hacker|falha critica/.test(t)) return 'ciberseguranca'
  if (/typescript|javascript|github|gitlab|python|react\b|developer|programming|api\b|webhook|open source|linux kernel|desenvolviment|programa[cç][aã]o|c[oó]digo-fonte|c[oó]digo aberto/.test(t)) return 'programacao'
  if (/\bai\b|artificial intelligence|llm|machine learning|model release|gemini|openai|claude|anthropic|agentic|agent |intelig[eê]ncia artificial|agentes inteligentes|modelo de ia/i.test(t)) return 'ia'
  return fallback
}

function scoreOf(title: string, cat: NewsCategory): number {
  const base: Record<NewsCategory,number>={ ia:85,programacao:82,ciberseguranca:92,negocios:73,economia:70,internacional:58,tecnologia:75 }
  return Math.min(100, base[cat] + (/agent|api|developer|critical|major|launch|security|cloud|open.source/i.test(title) ? 8 : 0))
}

function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,85)
}
async function hash(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,18)
}
function dateISO(value: string): string | null {
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

export async function fetchFeed(feed: Feed): Promise<NewsRow[]> {
  const controller = new AbortController()
  const timeout = setTimeout(()=>controller.abort(), 10000)
  let text = ''
  try {
    const res=await fetch(feed.url, { headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'User-Agent':'GCLNEWS/1.0 (+news aggregator; contact site administrator)' }, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (Number(res.headers.get('content-length')) > 3_000_000) throw new Error('Feed exceeds size limit')
    text=(await res.text()).slice(0,3_000_000)
  } finally { clearTimeout(timeout) }
  const parsed=xml.parse(text)
  const root = parsed.rss?.channel ?? parsed.feed ?? parsed['rdf:RDF']
  if (!root) throw new Error('RSS/Atom format invalid')
  const items = list(root.item ?? root.entry).slice(0,35)
  const now = new Date().toISOString()
  const minimum=Date.now()-14*86400000
  const rows: NewsRow[]=[]
  for(const item of items as any[]) {
    const link = typeof item.link === 'string' ? item.link : (list(item.link).find((x:any)=>!x?.['@_rel'] || x?.['@_rel']==='alternate') as any)?.['@_href']
    let url: string
    try {const u=new URL(field(link)); if(u.protocol!=='https:' && u.protocol!=='http:')continue;url=u.href}
    catch {continue}
    const title=plain(item.title?.['#text'] ?? item.title).slice(0,220)
    const pub = dateISO(field(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']))
    if (!title || !pub || Date.parse(pub)<minimum || Date.parse(pub)>Date.now()+3600000) continue
    const excerpt=plain(item.description ?? item.summary?.['#text'] ?? item.summary ?? item['content:encoded'] ?? item.content?.['#text'] ?? item.content).slice(0,480)
    if (!excerpt) continue
    const id=await hash(url)
    const category=categoryOf(title,excerpt,feed.category)
    rows.push({id,slug:`${slugify(title)}-${id.slice(0,7)}`,title,excerpt,image_url:imageLink(item),category,
      source_name:feed.name,source_url:url,published_at:pub,fetched_at:now,relevance_score:scoreOf(title,category),language:feed.language})
  }
  return rows.filter(r=>r.title.length>=12).sort((a,b)=>b.relevance_score-a.relevance_score||b.published_at.localeCompare(a.published_at)).slice(0,4)
}

type KnownTranslation = { source_url: string; title: string; excerpt: string; title_pt: string | null; excerpt_pt: string | null }

export async function ingestAll(db: D1Database, ai: Ai): Promise<{imported:number;feeds_ok:number;feeds_failed:number;details:string[]}> {
  const started=new Date().toISOString(), runId=crypto.randomUUID(), details:string[]=[]
  await db.prepare('INSERT INTO ingest_runs (id,started_at,status) VALUES (?,?,?)').bind(runId,started,'running').run()
  let imported=0,feeds_ok=0,feeds_failed=0
  const results=await Promise.allSettled(FEEDS.map(fetchFeed))
  const englishUrls=[...new Set(results.flatMap((result,i)=>result.status==='fulfilled' && FEEDS[i].language==='en'
    ? result.value.map(row=>row.source_url) : []))]
  const known=new Map<string,KnownTranslation>()
  if(englishUrls.length) {
    const found=await db.prepare(`SELECT source_url,title,excerpt,title_pt,excerpt_pt FROM articles
      WHERE source_url IN (${englishUrls.map(()=>'?').join(',')})`).bind(...englishUrls).all<KnownTranslation>()
    for(const row of found.results??[]) known.set(row.source_url,row)
  }
  for(let i=0;i<results.length;i++) {
    const result=results[i], source=FEEDS[i]
    if(result.status==='rejected') {feeds_failed++;details.push(`${source.name}: ${String(result.reason).slice(0,120)}`);continue}
    feeds_ok++
    const rows=result.value
    const prepared=await Promise.all(rows.map(async row=>{
      if(row.language!=='en') return { ...row, title_pt:null, excerpt_pt:null }
      const old=known.get(row.source_url)
      let translation:Translation
      if(old?.title===row.title && old.excerpt===row.excerpt && old.title_pt && old.excerpt_pt) {
        translation={title_pt:old.title_pt,excerpt_pt:old.excerpt_pt}
      } else {
        try { translation=await translateEnglish(ai,row.title,row.excerpt) }
        catch(error) { details.push(`${source.name}: tradução indisponível para ${row.source_url}: ${String(error).slice(0,100)}`);return null }
      }
      return { ...row, ...translation }
    }))
    const publishable=prepared.filter((row):row is NonNullable<typeof row>=>row!==null)
    // D1 batch keeps writes short. URLs are unique: a repeat sync won't create duplicates.
    if(publishable.length) {
      const stmts=publishable.map(r=>db.prepare(`INSERT INTO articles
        (id,slug,title,excerpt,image_url,category,source_name,source_url,published_at,fetched_at,relevance_score,language,title_pt,excerpt_pt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_url) DO UPDATE SET
        title=excluded.title,excerpt=excluded.excerpt,image_url=COALESCE(excluded.image_url,articles.image_url),
        fetched_at=excluded.fetched_at,relevance_score=excluded.relevance_score,category=excluded.category,
        title_pt=excluded.title_pt,excerpt_pt=excluded.excerpt_pt,translation_attempts=0`)
        .bind(r.id,r.slug,r.title,r.excerpt,r.image_url,r.category,r.source_name,r.source_url,r.published_at,r.fetched_at,r.relevance_score,r.language,r.title_pt,r.excerpt_pt))
      try { await db.batch(stmts); imported+=publishable.length }
      catch(err) {feeds_failed++;details.push(`${source.name}: database write failed: ${String(err).slice(0,80)}`)}
    }
  }
  await db.prepare(`UPDATE ingest_runs SET finished_at=?,status=?,imported=?,feeds_ok=?,feeds_failed=?,details=? WHERE id=?`)
    .bind(new Date().toISOString(),feeds_ok?'complete':'failed',imported,feeds_ok,feeds_failed,details.join(' | ').slice(0,1800),runId).run()
  return {imported,feeds_ok,feeds_failed,details}
}
