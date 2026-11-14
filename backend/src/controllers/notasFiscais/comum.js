// Notas fiscais de serviço — o que as partes de controllers/notasFiscais/ usam em comum: os campos do
// rascunho, o cálculo do ISS e do líquido, o retrato do tomador e do serviço (do cadastro de hoje), a
// validação do rascunho e a leitura da nota com os dados ligados (local, serviço, proposta, recebido).
const pool = require('../../config/database');
const { EMPRESA } = require('../../utils/pdfTemplate');
const { arredondar } = require('../../utils/calculoProposta');

const CNPJ_HM = EMPRESA.cnpj.replace(/\D/g, '');
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const tem = (body, c) => Object.prototype.hasOwnProperty.call(body || {}, c);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// centavos com o meio para longe do zero, a mesma regra da proposta
// (skills/_comum/base/dinheiro.js): Math.round(x * 100) / 100 dava ISS de 5 %
// sobre 100,30 = 5,015 → 5,01 (5,015 × 100 = 501,4999… no binário); certo 5,02
const centavos = (n) => arredondar(n);

const VALORES = [
  'valor_servicos', 'valor_deducoes', 'desconto_incondicionado', 'desconto_condicionado',
  'valor_pis', 'valor_cofins', 'valor_inss', 'valor_ir', 'valor_csll', 'outras_retencoes',
];
// campos que o rascunho grava (tomador e códigos do serviço vêm do cadastro)
const CAMPOS_RASCUNHO = [
  'cliente_id', 'tomador', 'servico_id', 'ctrib_nac', 'ctrib_mun', 'nbs', 'cnae', 'servico_descricao',
  'competencia', 'discriminacao', 'codigo_municipio_prestacao', ...VALORES,
  'aliquota_iss', 'valor_iss', 'iss_retido', 'valor_liquido', 'observacoes',
];

// ISS pela alíquota (sobre a base: serviço − deduções − desconto incondicionado)
// e líquido = serviço − descontos − retenções (o ISS só desconta se retido)
function calcularTotais(d) {
  const base = d.valor_servicos - d.valor_deducoes - d.desconto_incondicionado;
  d.valor_iss = d.aliquota_iss != null ? centavos(Math.max(0, base) * d.aliquota_iss / 100) : 0;
  const retFed = d.valor_pis + d.valor_cofins + d.valor_inss + d.valor_ir + d.valor_csll + d.outras_retencoes;
  d.valor_liquido = centavos(d.valor_servicos - d.desconto_incondicionado - d.desconto_condicionado - retFed - (d.iss_retido ? d.valor_iss : 0));
  return d;
}

// retrato do cliente para a nota (o cadastro pode mudar depois)
async function tomadorDoCliente(clienteId, db = pool) {
  const { rows: [c] } = await db.query(
    `SELECT c.*, m.nome AS municipio, m.uf FROM clientes c LEFT JOIN municipios_ibge m ON m.codigo = c.codigo_municipio
      WHERE c.id = $1 AND c.ativo = true`, [clienteId]);
  if (!c) return null;
  return {
    nome: c.nome,
    documento: digitos(c.documento) || null,
    inscricao_municipal: c.inscricao_municipal,
    email: c.email_nota || c.email,
    telefone: c.telefone,
    cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro,
    codigo_municipio: c.codigo_municipio, municipio: c.municipio, uf: c.uf,
    endereco: c.endereco,
    retem_iss: c.retem_iss,
  };
}

async function servicoDaEmpresa(id) {
  const { rows: [s] } = await pool.query(
    `SELECT e.*, f.descricao AS ctrib_nac_descricao FROM empresa_servicos_nfse e
       LEFT JOIN fiscal_servicos f ON f.codigo = e.ctrib_nac WHERE e.id = $1`, [id]);
  return s || null;
}

// Valida e monta o rascunho; campo que não veio fica como está.
async function dadosDoRascunho(body, atual = {}) {
  const v = (c) => (tem(body, c) ? body[c] : atual[c]);
  const d = {};
  for (const c of VALORES) {
    const n = Number(String(v(c) ?? 0).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return { erro: `Valor inválido em ${c.replace(/_/g, ' ')}.` };
    d[c] = centavos(n);
  }
  if (!(d.valor_servicos > 0)) return { erro: 'Informe o valor dos serviços.' };
  const aliq = v('aliquota_iss');
  d.aliquota_iss = aliq === '' || aliq == null ? null : Number(String(aliq).replace(',', '.'));
  if (d.aliquota_iss != null && (!Number.isFinite(d.aliquota_iss) || d.aliquota_iss < 0 || d.aliquota_iss > 5)) return { erro: 'Alíquota do ISS: de 0 a 5%.' };
  d.iss_retido = v('iss_retido') === true || v('iss_retido') === 'true';
  d.discriminacao = String(v('discriminacao') ?? '').trim();
  if (!d.discriminacao) return { erro: 'Descreva o serviço prestado (discriminação).' };
  if (d.discriminacao.length > 2000) return { erro: 'A discriminação passa de 2.000 caracteres (limite da NFS-e).' };
  d.observacoes = String(v('observacoes') ?? '').trim() || null;
  if (d.observacoes && d.observacoes.length > 2000) return { erro: 'As informações complementares passam de 2.000 caracteres.' };
  const comp = String(v('competencia') ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(comp) || Number.isNaN(new Date(`${comp}T12:00:00Z`).getTime())) return { erro: 'Data de competência inválida.' };
  d.competencia = comp;

  d.cliente_id = Number(v('cliente_id')) || null;
  if (!d.cliente_id) return { erro: 'Escolha o cliente (tomador).' };
  const tomador = await tomadorDoCliente(d.cliente_id);
  if (!tomador) return { erro: 'Cliente não encontrado.' };
  d.tomador = JSON.stringify(tomador);

  d.servico_id = Number(v('servico_id')) || null;
  if (!d.servico_id) return { erro: 'Escolha o serviço (código de tributação).' };
  const s = await servicoDaEmpresa(d.servico_id);
  if (!s) return { erro: 'Serviço não encontrado no cadastro fiscal.' };
  Object.assign(d, { ctrib_nac: s.ctrib_nac, ctrib_mun: s.ctrib_mun, nbs: s.nbs, cnae: s.cnae, servico_descricao: s.ctrib_nac_descricao });

  const local = digitos(v('codigo_municipio_prestacao')) || null;
  if (local) {
    const { rows: [m] } = await pool.query('SELECT 1 FROM municipios_ibge WHERE codigo = $1', [local]);
    if (!m) return { erro: 'Município da prestação (código IBGE) não encontrado.' };
  }
  d.codigo_municipio_prestacao = local;
  calcularTotais(d);
  // retenções + descontos maiores que o serviço: líquido negativo ia para a
  // nota (e a NFS-e é recusada pela Receita, ou sai com valor a pagar errado)
  if (d.valor_liquido < 0) return { erro: 'As retenções e os descontos passam do valor dos serviços: o valor líquido ficaria negativo. Confira os valores.' };
  return { d };
}

async function lerNota(id) {
  const { rows: [n] } = await pool.query(
    `SELECT n.*, (n.xml IS NOT NULL) AS tem_xml, s.nome AS servico_nome, o.numero AS origem_numero,
            mp.nome || '-' || mp.uf AS local_prestacao, pr.numero AS proposta_numero,
            (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_valor,
            (SELECT max(f.data_hora) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_em
       FROM notas_fiscais n
       LEFT JOIN municipios_ibge mp ON mp.codigo = n.codigo_municipio_prestacao
       LEFT JOIN empresa_servicos_nfse s ON s.id = n.servico_id
       LEFT JOIN notas_fiscais o ON o.id = n.nota_origem_id
       LEFT JOIN propostas pr ON pr.id = n.proposta_id
      WHERE n.id = $1`, [id]);
  return n;
}

module.exports = {
  CNPJ_HM, digitos, tem, EMAIL, centavos, VALORES, CAMPOS_RASCUNHO,
  calcularTotais, tomadorDoCliente, servicoDaEmpresa, dadosDoRascunho, lerNota,
};
