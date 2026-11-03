// E-mail do usuário sem diferença de maiúsculas/minúsculas (02/11/2026). O login passou a comparar
// LOWER(email) e o cadastro grava em minúsculas (controllers/usuariosController.js); este índice
// único impede duas contas 'Marcio@...' e 'marcio@...' (o UNIQUE original de usuarios.email
// diferencia caixa).
// Se o banco JÁ tiver duas contas só com a caixa diferente, o índice não é criado (falharia e
// desfaria todas as migrações): só avisa no log quais são, para o administrador juntar ou renomear
// uma delas; na próxima partida, sem duplicados, o índice é criado. Nenhum dado é alterado.
module.exports = async (client) => {
  const { rows: duplicados } = await client.query(
    `SELECT LOWER(email) AS email, COUNT(*)::int AS contas, string_agg(id::text, ', ' ORDER BY id) AS ids
       FROM usuarios GROUP BY LOWER(email) HAVING COUNT(*) > 1`
  );
  if (duplicados.length) {
    console.warn('Migração 2.0-41: índice único de e-mail sem caixa NÃO criado — há contas com o mesmo e-mail só com maiúsculas/minúsculas diferentes:');
    for (const d of duplicados) console.warn(`   - ${d.email}: ${d.contas} contas (ids ${d.ids}) — junte ou renomeie em Usuários`);
    return;
  }
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower ON usuarios (LOWER(email))');
};
