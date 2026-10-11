# Sistema de Orçamentos H&M — instruções para o assistente de código

- Leia primeiro `docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md`. Ele traz o histórico completo, a arquitetura, as ferramentas MCP e os próximos passos (Elétrica Predial).
- O sistema está em produção em `C:\HM-Engenharia\hm-eng`, e o PC é a fonte da verdade. Nunca sobrescreva arquivos locais com a versão do GitHub sem conferir antes.
- Antes de uma mudança grande, confira se existe um backup recente em `C:\HM-Engenharia\Backups`.
- Mudanças de banco: só migrações idempotentes em `backend/src/models/schema.js` (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... $$`).
- Toda rota nova passa por `autenticar` (e por `posse`/admin quando for o caso). Todo HTML de PDF usa `escapeHtml`.
- Para implantar: no backend, rode `reiniciar-backend.bat`; no frontend, `cd frontend && npm run build`. Depois recarregue com Ctrl+F5.
- Commits em português, explicando o porquê, no mesmo padrão do histórico.
- Skills de projeto ficam em `skills/<disciplina>/` (ver seção 3.1 do resumo). Antes de mudar uma skill, rode `npm test` na pasta dela; o teste compara com um laudo real já entregue. Dados de obras reais ficam na pasta do cliente no servidor, nunca no repositório.
- Não versionar: `.env`, PDFs, `backend/backups`, `backend/logs`, `Orçamentos V*`, pastas de clientes/fornecedores, `projetos-recebidos`.
