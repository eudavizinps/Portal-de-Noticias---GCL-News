import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const srcFiles=['frontend/App.tsx','frontend/main.tsx','frontend/hooks/useNews.ts','frontend/components/ArticleCard.tsx','frontend/components/ArticleImage.tsx','frontend/types.ts','frontend/utils.ts','frontend/data/demo.ts','worker/index.ts','worker/ingest.ts','worker/sources.ts','vite.config.ts']
test('Todos os arquivos TS e TSX têm sintaxe válida',()=>{
 for(const file of srcFiles){
   const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}})
   assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,`Erro em ${file}`)
 }
})
test('Migrações e configurações de hospedagem estão presentes',()=>{
 assert.match(read('migrations/0001_init.sql'),/CREATE TABLE IF NOT EXISTS articles/)
 assert.match(read('migrations/0002_editions.sql'),/CREATE TABLE IF NOT EXISTS edition_items/)
 assert.match(read('wrangler.jsonc'),/\"crons\"/)
 assert.match(read('wrangler.jsonc'),/\"run_worker_first\"/)
 assert.ok(fs.existsSync(path.join(root,'public','manifest.webmanifest')))
})
test('O segredo administrativo não aparece embutido no front-end',()=>{
 for(const f of srcFiles.filter(f=>f.startsWith('frontend/')))assert.doesNotMatch(read(f),/COLOQUE_UMA_CHAVE_ALEATORIA|Bearer\s+[a-f\d]{32,}/i)
 assert.match(read('worker/index.ts'),/ADMIN_API_KEY/)
 assert.match(read('.gitignore'),/\.dev\.vars/)
})
test('Publicações mantêm fonte e data, e o portal não fabrica conteúdo de produção',()=>{
 const code=read('worker/ingest.ts')
 assert.match(code,/source_name:feed.name/)
 assert.match(code,/source_url:url/)
 assert.match(code,/published_at:pub/)
 assert.match(read('frontend/hooks/useNews.ts'),/import\.meta\.env\.DEV/)
 assert.match(read('frontend/hooks/useNews.ts'),/setEdition\(\[\]\)/)
})
