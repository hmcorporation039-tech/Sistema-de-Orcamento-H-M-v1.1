// Projetos e laudos por disciplina — o que as rotas de controllers/laudos/
// usam em comum: carregar o registro, conferir se o documento/desenho/modo de
// orçamento serve ao tipo do registro (projeto ou laudo), rodar o cálculo da
// skill com erro 400 para dado inválido e o nome de arquivo seguro no Windows.
const pool = require('../../config/database');
const { tiposDocumento, motorDaDisciplina } = require('../../utils/disciplinasLaudo');
const P = require('../../services/pastasSistema');
const componentesQuadro = require('../../services/componentesQuadro');
const equipamentosCatalogo = require('../../services/equipamentosCatalogo');

// Quadros (2.4): o catálogo de componentes do banco (medidas oficiais por
// fabricante) entra nos dados antes do cálculo — ver injetarNosDados.
const DISCIPLINA_QUADROS = 'quadros';
// Climatização (fase 4): o catálogo de equipamentos (equipamentos_catalogo, migração 2.0-42)
// entra em dados.catalogo_equipamentos — a skill escolhe o menor modelo que atende.
const DISCIPLINA_CLIMATIZACAO = 'climatizacao';

async function carregarLaudo(id) {
  const { rows } = await pool.query('SELECT * FROM laudos_projetos WHERE id = $1', [id]);
  const laudo = rows[0] || null;
  // o cálculo da skill é síncrono: relê o catálogo agora para processarComMotor usar
  if (laudo?.disciplina === DISCIPLINA_QUADROS) await componentesQuadro.atualizarCache();
  if (laudo?.disciplina === DISCIPLINA_CLIMATIZACAO) await equipamentosCatalogo.atualizarCache();
  return laudo;
}

// O documento/desenho/modo de orçamento serve a este registro (projeto ou laudo)?
// Senão, erro 400 com o caminho certo.
function conferirUso(laudo, uso, oque) {
  if (tiposDocumento().serve(uso, laudo.tipo)) return null;
  return laudo.tipo === 'laudo'
    ? `${oque} é de projeto — este registro é um LAUDO. Abra (ou crie) o projeto da disciplina na aba "Projetos por disciplina".`
    : `${oque} é de laudo — este registro é um PROJETO. Laudo é pedido quando necessário: crie em "Laudos" › "Novo laudo".`;
}

function ehMotorDeQuadros(motor) {
  try { return motor === motorDaDisciplina(DISCIPLINA_QUADROS); } catch { return false; }
}

// Dados que vão para a skill: na de quadros, com dados.catalogo_componentes =
// registros do banco dos fabricantes escolhidos (cópia — o que é salvo no
// registro não muda). Outras disciplinas, sem fabricante escolhido ou tabela
// vazia: os mesmos dados.
function ehMotorDeClimatizacao(motor) {
  try { return motor === motorDaDisciplina(DISCIPLINA_CLIMATIZACAO); } catch { return false; }
}

function dadosParaMotor(motor, dados) {
  if (!dados || typeof dados !== 'object') return dados;
  if (ehMotorDeQuadros(motor)) return componentesQuadro.injetarNosDados(dados);
  if (ehMotorDeClimatizacao(motor)) return equipamentosCatalogo.injetarNosDados(dados);
  return dados;
}

function processarComMotor(motor, dados) {
  try {
    return motor.processar(dadosParaMotor(motor, dados));
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
  carregarLaudo, conferirUso, processarComMotor, dadosParaMotor, erro400, nomeSeguroArquivo,
};
