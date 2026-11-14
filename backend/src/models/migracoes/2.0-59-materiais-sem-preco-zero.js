// O catálogo nunca tem item a R$ 0,00 — agora também no BANCO (versão 2.40; ficou de fora na 2.36).
// Na 2.36 a regra entrou em todas as telas e rotinas (cadastro, importação, cotação, nota fiscal, auto-cadastro),
// mas um CHECK na tabela travaria a edição dos poucos materiais a zero mantidos de propósito pela 2.0-52 (usados
// em kit). Por isso é um gatilho e não um CHECK: recusa só o que CRIA um preço zero —
//   - material novo ativo com preço < R$ 0,01;
//   - mudança de preço para < R$ 0,01;
//   - reativar material com preço < R$ 0,01;
// e deixa editar o resto (descrição, categoria…) dos que já estão a zero. Erro próprio (HMP01), que o tratador
// central transforma em 400 com mensagem (middleware/erros.js).
// Idempotente: CREATE OR REPLACE na função; o gatilho só é criado se ainda não existe (sem trava a cada partida).
module.exports = async (client) => {
  await client.query(`
    CREATE OR REPLACE FUNCTION materiais_sem_preco_zero() RETURNS trigger AS $$
    BEGIN
      IF NEW.ativo AND COALESCE(NEW.preco, 0) < 0.01 AND (
           TG_OP = 'INSERT'
        OR NEW.preco IS DISTINCT FROM OLD.preco
        OR (NEW.ativo AND NOT OLD.ativo)
      ) THEN
        RAISE EXCEPTION 'Material sem preço: o catálogo não tem item a R$ 0,00 (%).', left(NEW.descricao, 120)
          USING ERRCODE = 'HMP01';
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_materiais_sem_preco_zero') THEN
        CREATE TRIGGER trg_materiais_sem_preco_zero BEFORE INSERT OR UPDATE OF preco, ativo ON materiais
          FOR EACH ROW EXECUTE FUNCTION materiais_sem_preco_zero();
      END IF;
    END $$`);
};
