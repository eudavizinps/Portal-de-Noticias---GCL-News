import type { Article,NewsCategory } from './types'
export function formatDate(value: string,brief=false) {
  try {return new Intl.DateTimeFormat('pt-BR',brief?{day:'2-digit',month:'short',timeZone:'America/Sao_Paulo'}:{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(value))}
  catch{return 'Data indisponível'}
}
export function formatNow() { return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()) }
export function formatSync(value:string|null) {if(!value)return 'Sincronização pendente';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value))}catch{return 'Não disponível'}}
const impacts:Record<NewsCategory,string>={
  ia:'Avaliar casos de uso, custo por tarefa e controles dos agentes.',
  programacao:'Revisar ferramentas, APIs e a qualidade dos fluxos de desenvolvimento.',
  ciberseguranca:'Checar exposição, permissões e proteção dos projetos e integrações.',
  negocios:'Identificar oportunidades de produtos e serviços B2B.',
  economia:'Acompanhar custos, margens e impacto nas plataformas utilizadas.',
  internacional:'Monitorar impactos no mercado tecnológico e nas operações globais.',
  tecnologia:'Estudar aplicações práticas e impactos na infraestrutura.'
}
export function impactFor(article:Article) {return impacts[article.category]}
export const priorities=[
  {number:'01',label:'SEGURANÇA',title:'Auditar credenciais e permissões',text:'Revisar segredos, tokens, autenticação e logs das integrações.'},
  {number:'02',label:'PRODUTO',title:'Medir o custo de cada agente',text:'Acompanhar tokens, processamento e margem por cliente.'},
  {number:'03',label:'DESENVOLVIMENTO',title:'Automatizar testes e revisões',text:'Unir CI/CD, análise estática e aprovação humana.'}
]
