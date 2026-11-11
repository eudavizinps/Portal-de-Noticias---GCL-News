# Status da entrega

**Atualizado em 11/11/2026:** o portal está publicado em <https://gcl-radar.davi-de-paula035.workers.dev>, com API, banco D1, chave administrativa e coleta agendada a cada três horas.

## Verificações realizadas

- `npm run typecheck`, os quatro testes automatizados e `npm run build` concluíram sem erros.
- As duas migrações SQL foram aplicadas no D1 de produção.
- A página inicial, `/api/health` e `/api/status` responderam com HTTP 200.
- A primeira sincronização importou 44 notícias de 11 fontes. A fonte BleepingComputer retornou HTTP 403 e precisa de revisão.

## Pendências

- Validar o primeiro deploy automático pela branch `main`. O segredo `CLOUDFLARE_API_TOKEN` já foi registrado no GitHub.
- Revisar os termos de uso dos feeds e imagens antes de monetizar ou redistribuir conteúdo.
- Associar um domínio próprio, se desejado. A URL `workers.dev` já está ativa.

O arquivo `preview-demo.html` é uma prévia estática da versão anterior do portal; a aplicação React publicada é gerada pelo build do projeto.
