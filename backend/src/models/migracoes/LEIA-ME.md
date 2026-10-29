# Migrações da versão 2.0

Um arquivo por tema (`2.0-01-codigo-servico.js`, `2.0-02-servicos.js`…), carregado em ordem
alfabética no fim de `criarTabelas` (models/schema.js), dentro da mesma transação. Só entra
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
