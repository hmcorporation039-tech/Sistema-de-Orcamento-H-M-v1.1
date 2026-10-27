# Migrações da versão 2.0

Um arquivo por tema (`2.0-01-obras.js`, `2.0-02-servicos.js`…), carregado em ordem
alfabética no fim de `criarTabelas` (models/schema.js), dentro da mesma transação.

Cada arquivo exporta `async (client) => { ... }` e precisa ser **idempotente**:
`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... $$`. Nunca apaga
dado de produção; vínculos novos com dados antigos são preenchidos por UPDATE
idempotente (só onde a coluna nova ainda é NULL).
