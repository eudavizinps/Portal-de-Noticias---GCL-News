import { useEffect,useState } from 'react'
import type { Article, ArticlesResponse, EditionResponse } from '../types'
import { demoArticles } from '../data/demo'

type NewsData = {edition:Article[];archive:Article[];loading:boolean;error:string|null;isDemo:boolean;lastSync:string|null;total:number;refresh:()=>void}
export function useNews():NewsData {
  const [edition,setEdition]=useState<Article[]>([])
  const [archive,setArchive]=useState<Article[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [isDemo,setDemo]=useState(false)
  const [lastSync,setLastSync]=useState<string|null>(null)
  const [total,setTotal]=useState(0)
  const [counter,setCounter]=useState(0)
  useEffect(()=>{
    const ctrl=new AbortController()
    const run=async()=>{
      setLoading(true);setError(null)
      try{
        const [a,b]=await Promise.all([
          fetch('/api/edition',{signal:ctrl.signal}),
          fetch('/api/articles?limit=24',{signal:ctrl.signal})
        ])
        if(!a.ok||!b.ok) throw new Error('Serviço de notícias indisponível')
        const editionData=(await a.json()) as EditionResponse
        const archiveData=(await b.json()) as ArticlesResponse
        if(!ctrl.signal.aborted){
          setEdition(editionData.items??[]);setArchive(archiveData.items??[])
          setLastSync(editionData.latest_update);setTotal(archiveData.total??0);setDemo(false)
        }
      }catch(err){
        if(ctrl.signal.aborted)return
        if(import.meta.env.DEV) {
          setEdition(demoArticles);setArchive(demoArticles);setTotal(demoArticles.length);setDemo(true)
        } else {
          setEdition([]);setArchive([]);setTotal(0)
          setError('Não foi possível carregar as notícias. Confira a conexão ou a sincronização das fontes.')
        }
      }finally{if(!ctrl.signal.aborted)setLoading(false)}
    }
    void run()
    return ()=>ctrl.abort()
  },[counter])
  return {edition,archive,loading,error,isDemo,lastSync,total,refresh:()=>setCounter(n=>n+1)}
}

export function useArticle(slug:string) {
  const [article,setArticle]=useState<Article|null>(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const ctrl=new AbortController()
    setLoading(true)
    void fetch('/api/articles/'+encodeURIComponent(slug),{signal:ctrl.signal})
      .then(r=>r.ok?r.json():Promise.reject(new Error('not found')))
      .then(data=>{if(!ctrl.signal.aborted)setArticle((data as {item:Article}).item)})
      .catch(()=>{if(!ctrl.signal.aborted)setArticle(import.meta.env.DEV?demoArticles.find(x=>x.slug===slug)??null:null)})
      .finally(()=>{if(!ctrl.signal.aborted)setLoading(false)})
    return ()=>ctrl.abort()
  },[slug])
  return {article,loading}
}
