# GCL NEWS — Portal de notícias full-stack

**Portal publicado no Cloudflare Workers.** Front-end em React + TypeScript, API em TypeScript com Hono, banco Cloudflare D1 (SQLite) e coleta de feeds RSS/Atom.

Produção: <https://gcl-news.davi-de-paula035.workers.dev>. O banco D1 e a chave administrativa já estão configurados. A chave não fica no repositório.

## Funcionalidades implementadas

- Layout editorial responsivo (desktop, tablet e celular), tema claro/escuro, carrossel com destaque automático e controle manual.
- Até cinco destaques atualizados após cada coleta bem-sucedida; seleção por data e relevância, com diversidade de editoria e tentativa de evitar repetições recentes.
- Arquivo pesquisável e paginado, sete categorias, páginas individuais de notícia e compartilhamento por link.
- Notícias salvas por dispositivo usando `localStorage` (não sincronizadas entre pessoas).
- Imagem do feed, quando disponível; fallback com ilustrações editoriais locais; indicação da procedência da imagem.
- Coleta automática de hora em hora e sincronização manual protegida por uma chave secreta.
- Tradução automática para português dos títulos e resumos recebidos em inglês, com o link e o idioma original identificados. As traduções ficam salvas no D1 para evitar novas chamadas ao modelo a cada hora.
- Cadastro e ocultação de matérias pelo painel `/admin`; fontes, dados de atualização e relatório de coleta.
- Endpoints de leitura públicos e endpoints de administração protegidos; banco com três migrações.
- Metadados, favicon, PWA manifest, headers básicos de segurança e estados de carregamento/erro/vazio.

**Importante:** o portal é um **agregador**, não uma redação. Mostra títulos e resumos curtos dos feeds RSS, com atribuição e links para a matéria completa na origem. Textos de fontes em inglês são traduzidos automaticamente para português e podem conter imprecisões; o conteúdo original continua acessível pelo link da fonte. As análises práticas para a GCL são sugestões temáticas (não notícias das fontes). O texto editorial não é verificado por uma equipe jornalística independente; confira a fonte para decisões importantes. Feeds externos podem mudar, exigir autorização para uso comercial ou sair do ar.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | React 19, TypeScript, Vite, CSS responsivo, Lucide |
| Navegação | React Router |
| API | Cloudflare Worker, Hono, TypeScript |
| Banco | Cloudflare D1 / SQLite |
| Ingestão | RSS e Atom via `fast-xml-parser` |
| Tradução | Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`) |
| Agendamento | Cloudflare Workers Cron Triggers |
| Hospedagem | Cloudflare Workers Static Assets (front-end e API no mesmo domínio) |

## Requisitos

- Node.js **20.19+** (idealmente versão LTS atual) e npm.
- Conta Cloudflare com Workers e D1 habilitados.
- Conta com permissão para configurar um domínio, caso queira nome personalizado.

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars
```

No arquivo `.dev.vars`, substitua o valor da chave por uma senha aleatória com **pelo menos 32 caracteres**. No Windows PowerShell, utilize `Copy-Item .dev.vars.example .dev.vars`.

Para executar a API e o banco local:

```bash
npm run db:local
npm run dev:api
```

Em outro terminal:

```bash
npm run dev
```

Abra `http://localhost:5173`. Na primeira execução, acesse `/admin`, informe sua chave de `.dev.vars` e clique em **Sincronizar RSS agora**. As notícias aparecerão no portal. Se você executar apenas `npm run dev` sem a API, a interface entra em **demonstração local identificada** com cinco exemplos do arquivo `frontend/data/demo.ts`. Ela **não simula atualização real**.

> A configuração `wrangler.jsonc` aponta para o banco D1 de produção. O modo local usa um banco separado; a operação remota nunca usa o banco local.

## Atualização automática

O workflow `.github/workflows/ci.yml` valida todos os pushes e pull requests. Em pushes na branch `main`, depois de passar pela checagem de tipos, testes e build, ele aplica as migrações D1 pendentes e publica o Worker. O token de implantação deve ficar apenas no segredo `CLOUDFLARE_API_TOKEN` do repositório no GitHub, com acesso restrito à conta Cloudflare deste projeto, ao Worker e ao D1. O ID da conta, que não é uma credencial, está no workflow.

Para executar o mesmo fluxo manualmente, use `npm run typecheck`, `npm test`, `npm run build`, `npm run db:remote` e `npx wrangler deploy` nessa ordem.

## Publicar em outra conta Cloudflare — passo a passo

1. Na pasta do projeto, instale as dependências:

   ```bash
   npm install
   npx wrangler login
   ```

2. Crie o banco D1:

   ```bash
   npx wrangler d1 create gcl-radar-db
   ```

3. Copie o **database_id** retornado para `d1_databases[0].database_id` no arquivo `wrangler.jsonc`, substituindo o ID da conta atual.

4. Aplique as migrações no banco remoto:

   ```bash
   npm run db:remote
   ```

5. Defina a chave secreta do painel no Worker (não publique no código!):

   ```bash
   npx wrangler secret put ADMIN_API_KEY
   ```

   Informe uma chave única, com 32 caracteres ou mais. Guarde-a em um gerenciador de senhas.

6. Faça o build e a publicação:

   ```bash
   npm run deploy
   ```

   O Wrangler apresentará a URL `workers.dev` da conta usada nesse deploy.

7. Acesse `https://<seu-endereco>/admin`, informe a chave e use **Sincronizar RSS agora** para a primeira coleta. Depois disso, a coleta ocorrerá de hora em hora, aos 17 minutos de cada hora, conforme o `wrangler.jsonc` (`17 * * * *`, em UTC). Os destaques são recalculados após cada coleta bem-sucedida.

8. Verifique `/api/health`, `/api/status` e `/fontes`. Em `/api/status`, você confere a última execução e quantas fontes funcionaram.

### Conectar seu domínio

No painel Cloudflare, acesse **Workers & Pages → gcl-news → Settings → Domains & Routes → Add → Custom Domain** e associe seu domínio ou subdomínio. Um exemplo é `news.seudominio.com.br`, substituindo pelo seu domínio real. Para isso, seu domínio deve estar sob gerenciamento DNS compatível no Cloudflare. O cadastro/compra do domínio não está incluído neste projeto.

A URL será pública para você e sua sócia, de qualquer dispositivo. Não é necessária conta para ler notícias. **Favoritos são locais do navegador**, e o painel administrativo exige a chave.

## Endpoints

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/health` | Resposta básica de saúde |
| GET | `/api/status` | Última coleta e tamanho do acervo |
| GET | `/api/sources` | Feeds configurados (sem segredos) |
| GET | `/api/edition` | Até cinco destaques do dia (prioriza cinco) |
| GET | `/api/articles?q=&category=&page=&limit=` | Busca paginada |
| GET | `/api/articles/:slug` | Resumo e dados da fonte |
| GET | `/api/admin/articles` | Gestão de publicações (Bearer) |
| POST | `/api/admin/refresh` | Executar coleta manual (Bearer) |
| POST | `/api/admin/translate` | Traduzir até oito matérias antigas por chamada (Bearer) |
| POST | `/api/admin/articles` | Publicar uma notícia verificada (Bearer) |
| DELETE | `/api/admin/articles/:id` | Ocultar publicação (Bearer) |

A autenticação administrativa é `Authorization: Bearer SUA_CHAVE`. Nunca coloque essa chave em variáveis `VITE_*`, repositórios públicos, logs ou código do front-end. Recomendam-se também restrições de acesso por Cloudflare Access/WAF se o portal for aberto ao público.

## Fontes e preferências

Edite `worker/sources.ts` para adicionar/remover feeds oficiais. O projeto começa com fontes em português (MIT Technology Review Brasil, Olhar Digital, Tecnoblog e Canaltech) e internacionais (GitHub Changelog, Cloudflare, Google, BleepingComputer, TechCrunch, BBC e Ars Technica). A coleta ignora notícias sem data, inválidas ou com mais de 14 dias. O algoritmo escolhe conteúdos de até 7 dias para a edição quando necessário. **Não cria notícias fictícias**. Se houver menos de cinco fontes válidas no banco, a edição mostrará menos de cinco.

Para priorizar categorias, ajuste `scoreOf` e `categoryOf` em `worker/ingest.ts`; para a diversidade da edição, altere `/api/edition` em `worker/index.ts`.

**Uso de conteúdo de terceiros:** antes de monetizar o site, revisar os termos RSS e direitos autorais de cada publicação. Em particular, feeds de algumas organizações exigem licença para uso comercial. Mantenha sempre atribuição, link para a fonte original e evite copiar textos integrais ou republicar imagens sem permissão.

## Testes e comandos

```bash
npm run typecheck
npm test
npm run build
```

O arquivo `preview-demo.html` é uma demonstração **estática da edição visual anterior** que abre diretamente no navegador sem instalar nada. Para testar a **interface full-stack final** use `npm run dev` e `npm run dev:api`. O código completo não depende da demonstração.

## Estrutura de arquivos

```text
GCL-Radar-Fullstack/
├── frontend/
│   ├── App.tsx                 # Páginas, layouts, carrossel, filtros e administração
│   ├── styles.css              # Design system responsivo
│   ├── main.tsx                # Entrada React
│   ├── components/             # Cards e imagens
│   ├── hooks/                  # Chamadas à API
│   ├── data/demo.ts            # Exemplos LOCAIS, identificados
│   ├── types.ts                # Tipos das notícias
│   └── utils.ts                # Datas, métricas e impactos genéricos
├── worker/
│   ├── index.ts                # Rotas da API / cron / autenticação
│   ├── ingest.ts               # Coleta, limpeza, classificação e persistência
│   └── sources.ts              # Feeds de origem
├── migrations/
│   ├── 0001_init.sql           # Notícias e execuções
│   └── 0002_editions.sql       # Seleções diárias
├── public/
│   ├── illustrations/          # Arte temática local
│   ├── _headers                # Cabeçalhos de segurança
│   ├── manifest.webmanifest    # Identidade PWA
│   └── favicon.svg
├── tests/
├── index.html
├── package.json
├── wrangler.jsonc
├── .dev.vars.example
└── README.md
```

## Antes de abrir ao público

1. Validar licenças de RSS e imagens de cada origem (especialmente caso haja publicidade/monetização).
2. Fazer o primeiro deploy e testar as rotas com o banco remoto.
3. Conferir se a filtragem editorial está adequada aos interesses da GCL.
4. Adicionar limites por IP/WAF e, se necessário, Cloudflare Access para `/admin`.
5. Publicar política de privacidade e os canais de contato da empresa se passar a captar dados pessoais.

**Tradução:** o Worker usa um modelo de tradução da Cloudflare para o título e o resumo dos feeds em inglês. O texto original é mantido no banco; se a tradução falhar, a notícia aguarda nova tentativa e não aparece em inglês no portal. A tradução não substitui revisão editorial humana. O uso do Workers AI está sujeito à franquia e aos preços da conta Cloudflare.
