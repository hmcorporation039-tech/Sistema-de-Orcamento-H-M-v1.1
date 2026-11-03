# Migrações da versão 2.0

Um arquivo por tema (`2.0-01-codigo-servico.js`, `2.0-02-servicos.js`…), carregado em ordem
NUMÉRICA (2.0-9 < 2.0-10 < 2.0-100; models/apoioMigracoes.js, ordenarMigracoes) no fim de `criarTabelas` (models/schema.js), dentro da mesma transação. Só entra
arquivo cujo nome começa com número.

Cada arquivo exporta `async (client) => { ... }` e precisa ser **idempotente**:
`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... $$`. Nunca apaga
dado de produção; vínculos novos com dados antigos são preenchidos por UPDATE
idempotente (só onde a coluna nova ainda é NULL).

O que precisa rodar **uma vez só** (preencher dados, criar kits-modelo) usa
`umaVez(client, 'marca', fn)` de `models/apoioMigracoes.js`: a marca em `configuracoes`
impede repetir. Nunca mude a chave de uma marca já usada, senão o trecho roda de novo.
Kits-modelo: `inserirKits(client, kits)` do mesmo arquivo. O apoio fica fora desta pasta
porque tudo aqui dentro é executado como migração.

## Colunas sem uso (ficam no banco)

Migração não apaga coluna (pode ter dado de produção e quebraria quem voltar a versão anterior).
Coluna que sobrou de projeto fica registrada aqui, para ninguém achar que falta código que a use:

- `pastas_movidas.pasta_obra_antes` (2.0-19) — nunca gravada nem lida (auditoria 02/11/2026, BD-08).
  O `scripts/mudar-pastas-para-clientes.js` só move análise e laudo **sem** obra
  (`pasta_obra_id IS NULL` no planejar) e não altera `pasta_obra_id`; o `--desfazer` só precisa
  de `pasta_antes`. Se um dia o script passar a mexer em `pasta_obra_id`, grave o valor anterior
  nesta coluna e restaure no desfazer.
