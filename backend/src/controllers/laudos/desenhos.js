// Projetos e laudos por disciplina — desenhos: a arquitetura do cliente
// (DWG/DXF/PDF, que também preenche os ambientes do formulário), a planta DXF
// com os pontos da disciplina e o unifilar do QElectroTech. A leitura e o
// desenho rodam numa thread à parte (services/tarefasCad).
const path = require('path');
const pool = require('../../config/database');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { motorDaDisciplina, cad, tiposDocumento, entrega } = require('../../utils/disciplinasLaudo');
const P = require('../../services/pastasSistema');
const { tipoAmbiente } = require('../../utils/ponteAnaliseSkill');
const { pastaDoLaudo, seguro } = require('../../services/pastasRegistros');
const { lerArquiteturaNoWorker, mensagemDaLeitura, resumoDaArquitetura, dxfParaGuardar, faltouEscala, gerarPlantaNoWorker } = require('../../services/tarefasCad');
const { carregarLaudo, conferirUso, processarComMotor, erro400, nomeSeguroArquivo } = require('./comum');

// ── Arquitetura (DWG/DXF) e planta gerada pela skill ─────────────────────
// A arquitetura recebida do cliente é a base da planta de projeto: ambientes
// (polilinha de área ou paredes + nome) com área e perímetro reais, e as portas.
// atividade da NBR ISO/CIE 8995-1 pelo nome do ambiente (o formulário permite trocar)
const ATIVIDADE_ILUMINACAO = [
  [/CIRCULA|CORREDOR|HALL/i, 'circulacao'], [/ESCADA/i, 'escadas'], [/BANH|WC|SANIT|VESTI/i, 'banheiro'], [/COPA|REFEIT/i, 'copa'],
  [/DEP[ÓO]SITO|ALMOX/i, 'deposito'], [/GARAGEM|ESTACION/i, 'garagem_vias'], [/REUNI/i, 'reuniao'], [/RECEP|ESPERA/i, 'recepcao'],
  [/SALA DE AULA|SALA \d{2,3}\b|AULA/i, 'sala_aula'], [/LABORAT/i, 'laboratorio_ensino'], [/BIBLIOT/i, 'biblioteca'],
  [/CIR[ÚU]RG/i, 'hosp_cirurgia'], [/ENFERMAR|LEITO|UTI/i, 'hosp_enfermaria'], [/CONSULT|EXAME/i, 'hosp_exames'],
  [/COZINHA/i, 'cozinha_comercial'], [/LOJA|VENDA/i, 'comercio_vendas'],
];
const atividadeDe = (nome) => (ATIVIDADE_ILUMINACAO.find(([re]) => re.test(nome)) || [null, 'escritorio'])[1];

const AMBIENTES_DA_ARQUITETURA = {
  iluminacao: (a, i, dados) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    const lados = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].sort((p, q) => q - p);
    return {
      nome: a.nome, atividade: atividadeDe(a.nome), comprimento_m: Math.round(lados[0] * 100) / 100, largura_m: Math.round(lados[1] * 100) / 100,
      pe_direito_m: 3, plano_trabalho_m: 0.75, refl_teto: '0.7', refl_parede: '0.5', refl_piso: '0.2',
      luminaria: dados?.luminarias?.[0]?.codigo || '', controle: 'interruptor', sensor_presenca: false, conservacao: 'normal', fu: null, portas: 1, distancia_quadro_m: 15,
    };
  },
  alarme: (a, i) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    return {
      nome: a.nome, particao: 1, area_m2: a.area_m2, maior_dimensao_m: Math.round(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 100) / 100,
      portas: 1, janelas: /BANH|WC|CIRCULA|CORREDOR|HALL|DEP[ÓO]SITO/i.test(a.nome) ? 0 : 1, janelas_acessiveis: true,
      pe_direito_m: 2.8, externo: false, animais: false, risco: 'normal', acesso_principal: i === 0,
    };
  },
  eletrica: (a) => ({ nome: a.nome, tipo: tipoAmbiente(a.nome), area_m2: a.area_m2, perimetro_m: a.perimetro_m, tugs_adicionais: 0, iluminacao_va: null }),
  incendio: (a) => {
    const xs = a.poligono.map(p => p[0]), ys = a.poligono.map(p => p[1]);
    return {
      nome: a.nome, pavimento: 'Térreo', comprimento_m: Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100, largura_m: Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100,
      pe_direito_m: 3, detector: /BANH|WC|SANIT|COZINHA|COPA|GARAGEM/i.test(a.nome) ? 'temperatura' : 'fumaca', altura_viga_m: null,
      rota_fuga: /CORREDOR|CIRCULA|HALL|ESCADA|RAMPA/i.test(a.nome), escada: /ESCADA/i.test(a.nome), saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null,
    };
  },
};

async function enviarArquitetura(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const arq = req.file;
  if (!arq) return res.status(400).json({ erro: 'Envie o arquivo da arquitetura (.dwg, .dxf ou PDF).' });
  // DWG/PDF: convertido para DXF (PDF: `escala` e `pagina` opcionais no formulário);
  // guarda-se o DXF convertido para a planta não converter de novo — o original vai para a pasta.
  // Conversão e leitura numa thread à parte (services/tarefasCad): na thread
  // principal, um desenho grande travava o sistema para todos por segundos.
  let lida;
  try { lida = await lerArquiteturaNoWorker(arq.buffer, arq.originalname, req.body); } catch (e) { return res.status(400).json({ erro: mensagemDaLeitura(e), faltaEscala: faltouEscala(e) }); }
  const { leitura } = lida;
  const resumo = resumoDaArquitetura(lida);
  await pool.query(
    `INSERT INTO laudos_projetos_arquitetura (laudo_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (laudo_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, conteudo = EXCLUDED.conteudo, resumo = EXCLUDED.resumo, usuario_id = EXCLUDED.usuario_id, criado_em = NOW()`,
    [laudo.id, String(arq.originalname).slice(0, 200), dxfParaGuardar(lida, arq.buffer), resumo, req.usuario.id]
  );
  // formulário sem ambientes: preenche com os da arquitetura (área e perímetro reais)
  let preenchidos = 0;
  const mapear = AMBIENTES_DA_ARQUITETURA[laudo.disciplina];
  if (mapear && !(laudo.dados?.ambientes || []).length && leitura.ambientes.length) {
    const dados = { ...laudo.dados, ambientes: leitura.ambientes.map((a, i) => mapear(a, i, laudo.dados)) };
    await pool.query('UPDATE laudos_projetos SET dados = $1, atualizado_em = NOW(), versao = versao + 1 WHERE id = $2', [dados, laudo.id]);
    preenchidos = dados.ambientes.length;
  }
  await seguro(`arquitetura laudo ${laudo.id}`, async () => {
    const pasta = path.join(await pastaDoLaudo(laudo), 'Arquitetura');
    await P.gravarArquivo(pasta, arq.originalname, arq.buffer);
  });
  res.status(201).json({ ...resumo, preenchidos });
}

async function verArquitetura(req, res) {
  const { rows: [a] } = await pool.query('SELECT nome_arquivo, resumo, criado_em FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [req.params.id]);
  res.json(a || null);
}

// Planta DXF com os pontos da disciplina sobre a arquitetura enviada.
// asBuilt ({ data, revisao }): carimbo "AS BUILT — conforme executado".
async function montarPlanta(laudo, { asBuilt = null } = {}) {
  const C = cad();
  const gerador = C.PLANTAS[laudo.disciplina];
  if (!gerador) throw erro400('A planta automática ainda não existe para esta disciplina (disponível: elétrica predial e hospitalar, iluminação, incêndio, alarme, controle de acesso, CFTV, cabeamento, telefonia e antena).');
  const { rows: [arq] } = await pool.query('SELECT nome_arquivo, conteudo FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [laudo.id]);
  if (!arq) throw erro400('Envie primeiro a arquitetura (.dwg, .dxf ou PDF) deste projeto.');
  const motor = motorDaDisciplina(laudo.disciplina);
  const d = laudo.dados || {};
  // leitura da arquitetura, cálculo da disciplina e desenho numa thread à parte
  // (services/tarefasCad); o carimbo é montado aqui
  let out;
  try {
    out = await gerarPlantaNoWorker({
      dxf: arq.conteudo.toString('utf8'), disciplina: laudo.disciplina, dados: laudo.dados,
      carimbo: {
        cliente: d.cliente?.nome, obra: d.obra?.nome || laudo.titulo,
        titulo: `${asBuilt ? 'AS BUILT — ' : ''}Projeto — ${motor.nome || laudo.disciplina} — planta baixa`,
        data: asBuilt ? entrega().dataBr(asBuilt.data) : new Date().toLocaleDateString('pt-BR'),
        revisao: asBuilt ? (asBuilt.revisao || d.meta?.revisao) : d.meta?.revisao,
        responsavel: d.responsavel?.nome, crea: d.responsavel?.crea,
        ...(asBuilt ? { fase: 'AS BUILT (conforme executado)', descricaoRevisao: entrega().textoAsBuilt(asBuilt) } : {}),
      },
    });
  } catch (e) {
    // mesma mensagem de processarComMotor (o cálculo agora roda no worker)
    if (e.etapa === 'dados') throw erro400(`Dados incompletos ou inválidos: ${e.message}`);
    throw e;
  }
  const nome = `${asBuilt ? 'AS BUILT - ' : ''}${nomeSeguroArquivo(laudo.titulo)} - Planta ${laudo.disciplina}.dxf`;
  return { nome, buffer: Buffer.from(out.dxf, 'utf8'), naoEncontrados: out.naoEncontrados };
}

// Diagrama unifilar do quadro para o QElectroTech (formato 0.100, abre na
// estável e nas mais novas), a partir do cálculo da elétrica predial (QD),
// industrial (QGBT + CCMs, com os motores) ou da subestação de MT.
function montarUnifilar(laudo, { asBuilt = null } = {}) {
  const gerar = cad().UNIFILARES[laudo.disciplina];
  if (!gerar) throw erro400('O unifilar automático está disponível para a elétrica predial, a industrial e a subestação de média tensão.');
  const motor = motorDaDisciplina(laudo.disciplina);
  let { xml } = gerar(processarComMotor(motor, laudo.dados), { quadro: 'QD-01' });
  if (asBuilt) xml = entrega().marcarAsBuiltQet(xml, asBuilt);
  const nome = `${asBuilt ? 'AS BUILT - ' : ''}${nomeSeguroArquivo(laudo.titulo)} - Unifilar.qet`;
  return { nome, buffer: Buffer.from(xml, 'utf8') };
}

async function gerarPlantaDxf(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, 'planta'), 'A planta (DXF)');
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { nome, buffer, naoEncontrados } = await montarPlanta(laudo);
  await seguro(`planta laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, buffer));
  res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome), 'X-Ambientes-Nao-Encontrados': encodeURIComponent(naoEncontrados.join('; ')) });
  res.send(buffer);
}

async function gerarUnifilarQet(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, 'unifilar'), 'O unifilar (QElectroTech)');
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { nome, buffer } = montarUnifilar(laudo);
  await seguro(`unifilar laudo ${laudo.id}`, async () => P.gravarArquivo(await pastaDoLaudo(laudo), nome, buffer));
  res.set({ 'Content-Type': 'application/xml', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
  res.send(buffer);
}

module.exports = {
  enviarArquitetura, verArquitetura, gerarPlantaDxf, gerarUnifilarQet, montarPlanta, montarUnifilar,
};
