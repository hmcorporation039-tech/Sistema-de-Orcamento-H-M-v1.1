const pool = require('../config/database');

// Vincula pagamentos (Pix realizado) a prestadores cadastrados comparando o
// nome do favorecido extraído do e-mail com o nome do prestador. Roda depois
// de toda importação de e-mail e depois de cadastrar/editar um prestador, para
// cobrir tanto pagamentos novos quanto pagamentos antigos já importados.
//
// Também relinca pagamentos que ficaram presos a um prestador desativado (ex:
// removido e recadastrado com o mesmo nome) — sem mexer em vínculos manuais já
// apontando para outro prestador ativo.
//
// A categoria (mão de obra/material/despesa) cadastrada no prestador é aplicada
// como padrão dos pagamentos vinculados a ele, mas nunca sobrescreve uma
// categoria já definida manualmente (via botão "Vincular" no Financeiro).
async function vincularPrestadores() {
  const resultado = await pool.query(`
    UPDATE financeiro_movimentos fm
    SET prestador_id = p.id,
        categoria = COALESCE(fm.categoria, p.categoria)
    FROM prestadores p
    WHERE fm.tipo = 'realizado'
      AND p.ativo = true
      AND LOWER(TRIM(fm.nome)) = LOWER(TRIM(p.nome))
      AND (
        fm.prestador_id IS NULL
        OR fm.prestador_id IN (SELECT id FROM prestadores WHERE ativo = false)
      )
    RETURNING fm.id
  `);

  await pool.query(`
    UPDATE financeiro_movimentos fm
    SET categoria = p.categoria
    FROM prestadores p
    WHERE fm.prestador_id = p.id
      AND p.ativo = true
      AND p.categoria IS NOT NULL
      AND fm.categoria IS NULL
  `);

  return resultado.rowCount;
}

module.exports = { vincularPrestadores };
