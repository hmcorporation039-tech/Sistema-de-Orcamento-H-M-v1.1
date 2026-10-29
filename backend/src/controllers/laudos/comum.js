// Projetos e laudos por disciplina — o que as rotas de controllers/laudos/
// usam em comum: carregar o registro, conferir se o documento/desenho/modo de
// orçamento serve ao tipo do registro (projeto ou laudo), rodar o cálculo da
// skill com erro 400 para dado inválido e o nome de arquivo seguro no Windows.
const pool = require('../../config/database');
const { tiposDocumento } = require('../../utils/disciplinasLaudo');
const P = require('../../services/pastasSistema');

async function carregarLaudo(id) {
  const { rows } = await pool.query('SELECT * FROM laudos_projetos WHERE id = $1', [id]);
  return rows[0] || null;
}

// O documento/desenho/modo de orçamento serve a este registro (projeto ou laudo)?
// Senão, erro 400 com o caminho certo.
function conferirUso(laudo, uso, oque) {
  if (tiposDocumento().serve(uso, laudo.tipo)) return null;
  return laudo.tipo === 'laudo'
    ? `${oque} é de projeto — este registro é um LAUDO. Abra (ou crie) o projeto da disciplina na aba "Projetos por disciplina".`
    : `${oque} é de laudo — este registro é um PROJETO. Laudo é pedido quando necessário: crie em "Laudos" › "Novo laudo".`;
}

function processarComMotor(motor, dados) {
  try {
    return motor.processar(dados);
  } catch (e) {
    const err = new Error(`Dados incompletos ou inválidos: ${e.message}`);
    err.status = 400;
    throw err;
  }
}

const erro400 = (mensagem) => Object.assign(new Error(mensagem), { status: 400 });

// nome de arquivo válido no Windows (nomes reservados, ponto no fim, controle): a regra das pastas
const nomeSeguroArquivo = (s) => P.nomeSeguro(s, 'Projeto');

module.exports = {
  carregarLaudo, conferirUso, processarComMotor, erro400, nomeSeguroArquivo,
};
