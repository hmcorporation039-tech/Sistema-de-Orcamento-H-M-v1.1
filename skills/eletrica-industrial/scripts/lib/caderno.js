// Caderno de fabricação e montagem do CCM (PDF) — um capítulo por quadro do projeto que tem
// motores (CCMs e, se tiver motores, o QGBT). O quadro sai da skill de quadros pelo importador
// que já existe (quadros/scripts/lib/importar.js → deIndustrial: motores com a partida, cabos,
// Icc e Ipk do ponto, forma de separação e IP do CCM) e o caderno pelo módulo comum
// _comum/fabricacao/cadernoPainel.js (vistas, barramento com medidas, N/PE, bornes, plaquetas,
// materiais da caixa aos parafusos, lista de materiais com preço, ensaios de rotina da NBR IEC
// 61439-1). Aqui entra o que é do CCM: a tabela de partidas por motor (gaveta/compartimento:
// proteção, contatores AC-3 e sobrecarga pela NBR IEC 60947-4-1, soft-starter pela 60947-4-2,
// inversor pela IEC 61800-5-1) com os MESMOS dispositivos do memorial (dispositivosPartida), os
// ensaios funcionais de cada partida e os comandos típicos da porta [CONFERIR com o cliente].

const P = require('../../../_comum/fabricacao/cadernoPainel');
const { deIndustrial } = require('../../../quadros/scripts/lib/importar');
const { fmtNum } = require('../../../_comum/docx-base');
const X = require('./tabelas');

const num = fmtNum;
const sec = (s) => `${String(s).replace('.', ',')} mm²`;
const ROTULO_PARTIDA = Object.fromEntries(Object.entries(X.PARTIDAS).map(([k, v]) => [k, v.rotulo]));

const NORMAS = [
  { codigo: 'ABNT NBR IEC 60947-4-1', titulo: 'Contatores e partidas de motores eletromecânicos', aplicacao: 'Contatores pela categoria AC-3 (corrente nominal ≥ corrente do motor/fase), relés de sobrecarga e coordenação da partida (disjuntor-motor + contator) pela tabela de coordenação do fabricante [CONFERIR tipo de coordenação adotado].' },
  { codigo: 'ABNT NBR IEC 60947-4-2', titulo: 'Controladores e partidas de motores a semicondutores (soft-starters)', aplicacao: 'Soft-starters: corrente nominal ≥ In do motor, limitação de corrente e partidas por hora conforme o fabricante.' },
  { codigo: 'IEC 61800-5-1 / IEC 61800-3', titulo: 'Acionamentos de velocidade variável — segurança e compatibilidade eletromagnética', aplicacao: 'Inversores: proteção na entrada, cabo motor blindado aterrado nas duas pontas, filtro/reatância conforme o manual.' },
  { codigo: 'ABNT NBR 5410 (6.5.1)', titulo: 'Instalações elétricas de BT — motores', aplicacao: 'Circuito de cada motor (Ib = máx(1,25; FS) × In), proteção contra curto e sobrecarga, cabos de saída do memorial.' },
  { codigo: 'ABNT NBR 17094-1', titulo: 'Motores de indução trifásicos', aplicacao: 'Dados de placa usados na escolha dos dispositivos (In, Ip/In, FS, ligação para Y-Δ).' },
];

// Comandos típicos da porta do CCM (padrão H&M — o projeto industrial não traz o comando):
// sinaleiro de energizado e, por partida, LIGA, DESLIGA, sinaleiro de operação e de falha
function portaTipica(motores) {
  const n = motores.length;
  if (!n) return [];
  return [
    { tipo: 'sinaleiro_branco', funcao: 'CCM energizado', quantidade: 1 },
    { tipo: 'liga', funcao: 'LIGA (uma por partida)', quantidade: n },
    { tipo: 'desliga', funcao: 'DESLIGA (uma por partida)', quantidade: n },
    { tipo: 'sinaleiro_verde', funcao: 'Motor em operação', quantidade: n },
    { tipo: 'sinaleiro_vermelho', funcao: 'Motor em falha (sobrecarga/acionamento)', quantidade: n },
  ];
}

// Quadros do projeto que levam partidas (os CCMs; o QGBT só se tiver motores)
function quadrosComMotores(calc) {
  const lista = calc.quadros.filter(q => q.motores.length).map(q => q.id);
  if (calc.qgbt.motores.length) lista.push('QGBT');
  return lista;
}

const prot = (u) => u.partidaInfo.dispositivos.filter(d => ['disjuntor_motor', 'disjuntor', 'fusivel'].includes(d.tipo) || d.ref === 'Q1' || /^F[123]$/.test(d.ref))
  .map(d => (d.faixa ? `${d.ref} ${num(d.faixa[0])}–${num(d.faixa[1])} A (ajuste ${num(d.ajuste_a, 1)} A)` : `${d.ref} ${d.nominal_a || d.corrente_a || ''} A`)).join(' + ') || '—';
const cont = (u) => u.partidaInfo.dispositivos.filter(d => d.tipo === 'contator').map(d => `${d.ref} ${d.nominal_a} A AC-3 (${d.funcao})`).join('; ') || '—';
const acion = (u) => {
  const d = u.partidaInfo.dispositivos.find(x => ['soft_starter', 'inversor'].includes(x.tipo));
  const kt = u.partidaInfo.dispositivos.find(x => x.tipo === 'temporizador');
  return d ? `${d.ref} ≥ ${num(d.corrente_a, 1)} A` : kt ? `${kt.ref} relé de tempo Y-Δ` : '—';
};
const sobrecarga = (u) => `${num(u.partidaInfo.sobrecarga.ajuste_a, 1)} A — ${u.partidaInfo.sobrecarga.local}`;
const cabo = (c) => (c ? `${c.paralelos > 1 ? `${c.paralelos} × ` : ''}${c.condutores === 6 ? '6' : '3'} × ${sec(c.secao)} + PE ${sec(c.secaoPE)}` : '—');

function secaoPartidas(id, unidades, forma) {
  return {
    titulo: `${id} — partidas por motor (gaveta / compartimento de cada partida)`, paisagem: true,
    paragrafos: [
      `Uma partida por motor, montada como bloco próprio (disjuntor-motor em cima, contatores e relés embaixo) no compartimento da forma de separação ${forma || 'do memorial'}. Gaveta extraível só com sistema de CCM do fabricante com ensaio de tipo da NBR IEC 61439-2 [CONFERIR com o fornecedor do CCM].`,
      'Dispositivos iguais aos do memorial da elétrica industrial (dimensionamento pelo mesmo motor de cálculo): contatores pela corrente AC-3 da NBR IEC 60947-4-1, sobrecarga no disjuntor-motor (classe térmica) ou no relé F4, soft-starter pela NBR IEC 60947-4-2 e inversor pela IEC 61800. A combinação disjuntor-motor + contator segue a tabela de coordenação do fabricante [CONFERIR].',
    ],
    tabela: {
      colunas: ['Motor', 'Descrição', 'P (kW / cv)', 'In (A)', 'Partida', 'Ip na linha (A)', 'Proteção (curto)', 'Contatores', 'Sobrecarga (ajuste)', 'Acionamento', 'Cabo de saída'],
      linhas: unidades.map(u => [u.tag, u.descricao, `${num(u.pKw, 1)} / ${num(u.cv, 1)}`, num(u.in, 1), ROTULO_PARTIDA[u.partida], num(u.partidaInfo.ipLinha, 0), prot(u), cont(u), sobrecarga(u), acion(u), cabo(u.circuito)]),
      proporcoes: [0.6, 1.4, 0.7, 0.5, 0.9, 0.6, 1.4, 1.8, 1.3, 0.9, 1.1],
    },
    marcadores: unidades.flatMap(u => (u.partidaInfo.observacoes || []).map(o => `${u.tag}: ${o}`)),
  };
}

function verificacoesPartidas(unidades) {
  const v = [];
  for (const u of unidades) {
    const base = `Partida ${u.tag} (${ROTULO_PARTIDA[u.partida].toLowerCase()})`;
    v.push({ item: `${base} — ajuste e sobrecarga`, criterio: `Ajuste da proteção de sobrecarga em ${num(u.partidaInfo.sobrecarga.ajuste_a, 1)} A (${u.partidaInfo.sobrecarga.local}); não passar de In × FS do motor (placa)`, norma: 'NBR IEC 60947-4-1; NBR 5410, 6.5.1' });
    if (u.partida === 'estrela_triangulo') v.push({ item: `${base} — comutação Y-Δ`, criterio: 'K2 (Δ) e K3 (Y) com intertravamento elétrico e mecânico; temporizador ajustado para a comutação perto da rotação nominal em vazio; pausa entre Y e Δ sem curto (teste sem carga)', norma: 'NBR IEC 60947-4-1 [CONFERIR tempo com o motor]' });
    if (u.partida === 'soft_starter') v.push({ item: `${base} — soft-starter`, criterio: 'Parâmetros gravados (In do motor, limitação de corrente, rampas de aceleração/desaceleração, by-pass); falha do soft abre o contator K1 e acende o sinaleiro de falha', norma: 'NBR IEC 60947-4-2' });
    if (u.partida === 'inversor') v.push({ item: `${base} — inversor`, criterio: 'Parâmetros do motor (placa), rampas, limite de corrente e referência de velocidade; blindagem do cabo motor aterrada nas duas pontas; falha do inversor desliga K1 e sinaliza', norma: 'IEC 61800-5-1 / -3' });
    v.push({ item: `${base} — ensaio funcional`, criterio: 'Liga/desliga pela porta (e pelo comando remoto, se houver); sentido de rotação conferido com o motor desacoplado; sinaleiros de operação e falha corretos', norma: 'NBR IEC 61439-1, 11.10' });
  }
  return v;
}

function montarCaderno(res) {
  const { calc, dados } = res;
  const ids = quadrosComMotores(calc);
  if (!ids.length) throw new Error('O projeto não tem motores em CCM/QGBT: não há partidas para o caderno do CCM.');
  const partes = ids.map(id => {
    const { dados: dq } = deIndustrial(dados, { quadro: id });
    const unidades = calc.unidades.filter(u => u.quadro === id);
    dq.automacao = { ...dq.automacao, porta: portaTipica(dq.motores) };
    if (dados.fabricantes) dq.fabricantes = dados.fabricantes;
    const q = calc.quadros.find(x => x.id === id);
    const { caderno } = P.cadernoDoQuadro(dq, {
      sigla: 'CAD-CCM', normas: NORMAS,
      caracteristicas: [['Partidas', `${unidades.length}: ${[...new Set(unidades.map(u => ROTULO_PARTIDA[u.partida].toLowerCase()))].join(', ')}`]],
      secoes: [secaoPartidas(id, unidades, q && q.forma)],
      verificacoes: verificacoesPartidas(unidades),
      avisos: [
        'Comandos da porta (LIGA, DESLIGA, sinaleiros de operação e falha por partida, sinaleiro de CCM energizado) seguem o padrão H&M: o projeto industrial não define o comando — confirmar com o cliente o comando local/remoto e a integração com CLP/supervisório. [CONFERIR]',
        'Partidas montadas em placa (compartimento por forma de separação). CCM com gavetas extraíveis exige sistema do fabricante com ensaio de tipo — neste caso o layout segue o catálogo do sistema escolhido. [CONFERIR]',
      ],
      precos: dados.precos_materiais || null,
    });
    return { tag: id, caderno };
  });
  const nPartidas = calc.unidades.filter(u => ids.includes(u.quadro)).length;
  return P.juntarCadernos(partes, {
    sigla: 'CAD-CCM',
    subtitulo: `${ids.join(', ')} — ${nPartidas} partidas de motores (NBR IEC 61439-2 / NBR IEC 60947-4-1)`,
  });
}

const exigeCaderno = (res) => quadrosComMotores(res.calc).length > 0;
const gerarCaderno = (res) => P.gerarPdf(montarCaderno(res));

module.exports = { montarCaderno, gerarCaderno, exigeCaderno, quadrosComMotores, portaTipica };
