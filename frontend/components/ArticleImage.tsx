import { useState } from 'react'
import type { Article,NewsCategory } from '../types'
const placeholders:Record<NewsCategory,string>={ia:'1',programacao:'4',ciberseguranca:'2',negocios:'3',economia:'3',internacional:'5',tecnologia:'5'}
export default function ArticleImage({article,className='',priority=false}:{article:Article;className?:string;priority?:boolean}){
  const [failed,setFailed]=useState(false)
  const art=`/illustrations/gcl_radar_illustration_${placeholders[article.category]}.svg`
  const photo=Boolean(article.image_url&&!failed)
  return <div className={`article-image ${className}`}>
    <img src={photo?article.image_url!:art} alt={photo?`Imagem fornecida pela fonte ${article.source_name}`:'Ilustração editorial temática'} loading={priority?'eager':'lazy'} onError={()=>setFailed(true)}/>
    <span className="image-credit">{photo?`Imagem: ${article.source_name}`:'Ilustração editorial'}</span>
  </div>
}
