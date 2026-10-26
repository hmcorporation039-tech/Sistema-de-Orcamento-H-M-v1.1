// Disciplina CONTROLE DE ACESSO — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const C = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-clinica.json');

const NORMAS = [
  ['IEC 60839-11-1', 'Sistemas eletrônicos de controle de acesso — requisitos do sistema e dos componentes (graus de segurança 1 a 4)'],
  ['IEC 60839-11-2', 'Sistemas eletrônicos de controle de acesso — diretrizes de aplicação'],
  ['IEC 60839-11-5', 'Protocolo OSDP (comunicação supervisionada e criptografada entre leitor e controladora)'],
  ['ABNT NBR 9077 e IT de saídas de emergência do Corpo de Bombeiros', 'Saídas de emergência: portas em rota de fuga, liberação e sentido de abertura'],
  ['ABNT NBR 11785', 'Barra antipânico — requisitos'],
  ['ABNT NBR 17240', 'Sistemas de detecção e alarme de incêndio — interface para liberação de portas'],
  ['ABNT NBR 9050', 'Acessibilidade — altura de comandos e controles e passagem junto a catracas'],
  ['ABNT NBR 14565:2019', 'Cabeamento estruturado (limite de 90 m do cabo horizontal)'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão — circuito dedicado, DPS e aterramento'],
  ['Lei 13.709/2018 (LGPD)', 'Dados pessoais e dados sensíveis (biometria/face): transparência, base legal e segurança'],
];
const SECOES_CHECKLIST = ['Documentação', 'Rotas de fuga e incêndio', 'Portas e dispositivos', 'Acessibilidade', 'Alimentação', 'Controladoras e rede', 'Software e LGPD'];
const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const ROTULO_COM = { wiegand: 'Wiegand', rs485: 'RS-485 / OSDP', ip: 'IP (PoE)' };
const ROTULO_GRAU = { 1: 'Grau 1 — risco baixo', 2: 'Grau 2 — risco baixo a médio', 3: 'Grau 3 — risco médio a alto', 4: 'Grau 4 — risco alto' };

function processar(dados) {
  const calc = C.calcular(dados);
  const insp = dados.inspecao || {};
  const na = {};
  const temRota = calc.rotas.some(p => !p.autonomo);
  if (!temRota) for (const c of ['R1', 'R2', 'R3', 'R4']) na[c] = 'Sem portas em rota de fuga informadas';
  if (!calc.catracas.length && !calc.cancelas.length) na.R5 = 'Sem catracas ou cancelas';
  if (!calc.catracas.length) na.A2 = 'Sem catracas';
  if (!calc.sensivel) na.S2 = 'Sem biometria ou reconhecimento facial';
  if (!calc.cftv) na.S4 = 'Sem integração com CFTV no escopo';
  if (!calc.portas.some(p => p.nFechaduras)) { na.P1 = 'Sem fechaduras elétricas'; na.P4 = 'Sem fechaduras elétricas'; }
  if (!calc.portas.some(p => p.sensores)) na.P2 = 'Sem sensores de porta';
  if (!calc.nCtrl) { na.C1 = 'Sem controladoras'; na.E1 = 'Sem fontes do controle de acesso'; na.E2 = 'Sem fontes do controle de acesso'; }
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  // Não conformidades de projeto (rota de fuga sem fail-safe, sem liberação por
  // incêndio, catraca sem passagem acessível) viram NC no item, se não verificado
  const porCod = {};
  for (const n of calc.ncsProjeto) (porCod[n.cod] = porCod[n.cod] || []).push(n);
  for (const c of checklist) {
    const lista = porCod[c.cod];
    if (!lista || (c.situacao && c.situacao !== 'NV')) continue;
    c.situacao = 'NC';
    c.obs = lista.map(n => n.descricao).join('; ');
    c.recomendacao = lista[0].recomendacao;
    c.prioridade = lista[0].prioridade;
    c.onde = lista.map(n => n.porta).join(', ');
  }
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const campos = ['acesso_ok', 'saida_ok', 'emergencia_ok', 'alarme_ok'];
  const testes = (insp.teste_portas || []).map(m => {
    const v = campos.map(k => m[k]).filter(x => x !== null && x !== undefined && x !== '');
    return { ...m, resultado: !v.length ? 'NV' : v.some(x => x === false || x === 'false') ? 'NC' : 'C' };
  });
  return { dados, calc, insp, checklist, ncs, testes, parecer: I.parecer(checklist, ncs, testes) };
}

function linhaPorta(p) {
  return [p.id, p.local, p.rotuloTipo, p.qtd, { entrada: 'Ent. + botoeira', entrada_livre: 'Ent. + saída livre', entrada_saida: 'Ent. + saída' }[p.sentido],
    p.rota ? 'sim' : 'não', p.fechadura === 'eletroima' ? `Eletroímã ${p.eletroima} kgf${p.nFechaduras > 1 ? ` × ${p.nFechaduras}` : ''}` : p.rotuloFechadura.split(' (')[0],
    p.falha === 'fail_safe' ? 'fail-safe' : p.falha === 'fail_secure' ? 'fail-secure' : '—', p.rotuloTecnologia, `${num(p.distancia, 0)} m`];
}

function resumir(res) {
  const { calc } = res;
  const nRota = calc.rotas.length;
  const ncR = calc.ncsProjeto.filter(n => n.cod.startsWith('R'));
  const maior = calc.controladoras.reduce((a, c) => (!a || c.iPico > a.iPico ? c : a), null);
  return {
    indicadores: [
      { rotulo: 'Pontos de acesso', valor: String(calc.nPontos), detalhe: `${calc.nPortas - calc.cancelas.reduce((a, p) => a + p.qtd, 0)} porta(s)/portão(ões) · ${calc.catracas.reduce((a, p) => a + p.qtd, 0)} catraca(s) · ${calc.cancelas.reduce((a, p) => a + p.qtd, 0)} cancela(s)`, ok: calc.ncsProjeto.length ? false : undefined },
      { rotulo: 'Rotas de fuga', valor: `${nRota} ponto(s)`, detalhe: nRota ? (ncR.length ? `${ncR.length} não conformidade(s) — ver avisos` : 'fail-safe/saída livre, liberação por incêndio e botoeira de emergência') : 'nenhuma informada', ok: nRota ? !ncR.length : undefined },
      { rotulo: 'Controladoras', valor: String(calc.nCtrl), detalhe: `${calc.ppc} portas/${calc.lpc} leitores cada · reserva ${num(calc.reserva * 100, 0)} % · licença ${calc.licenca} portas` },
      { rotulo: 'Leitores', valor: String(calc.leitoresTotal), detalhe: `${calc.leitoresIp} IP · ${ROTULO_COM[calc.comunicacao]} · ${calc.botoeirasSaida} botoeira(s) de saída · ${calc.botoeirasEmergencia} de emergência · ${calc.sensores} sensor(es)` },
      { rotulo: 'Fontes e baterias', valor: `${calc.nFontes} fonte(s)`, detalhe: maior ? `maior pico ${num(maior.iPico, 2)} A → fonte ${maior.fonteA} A · bateria ${maior.bateriaAh} Ah para ${calc.autonomiaH} h` : '—' },
      { rotulo: 'Credenciais', valor: `${calc.cartoes} cartões`, detalhe: `${calc.usuarios} usuários × 1,1 · ${calc.cartoesVisitante} de visitante${calc.tags ? ` · ${calc.tags} TAGs veiculares` : ''}` },
      { rotulo: 'Cabos', valor: `${calc.cabos.mangaLeitor6 + calc.cabos.mangaLeitor4 + calc.cabos.mangaIo} m de manga`, detalhe: `alimentação ${num(Object.values(calc.cabos.alimPorSecao).reduce((a, b) => a + b, 0), 0)} m · UTP ${calc.cabos.utpM} m · infraestrutura ${calc.cabos.infraM} m` },
    ],
    textos: [...calc.ncsProjeto.map(n => `NÃO CONFORME (${n.cod}) — ${n.descricao}. ${n.recomendacao}`), ...calc.avisos],
    tabelas: [
      { titulo: 'Pontos de acesso', colunas: ['Id', 'Local', 'Tipo', 'Qtd.', 'Sentido', 'Rota de fuga', 'Fechadura', 'Falha', 'Tecnologia', 'Distância'], linhas: calc.pontos.map(linhaPorta) },
      { titulo: 'Controladoras, fontes e baterias', colunas: ['Controladora', 'Portas', 'Leitores', 'Repouso (A)', 'Pico (A)', 'Fonte', 'Bateria'],
        linhas: calc.controladoras.map(c => [c.id, c.portas.join(', '), c.leitores, num(c.iRep, 2), num(c.iPico, 2), `${c.nFontes > 1 ? `${c.nFontes} × ` : ''}${c.fonteA} A`, `${c.nBaterias > 1 ? `${c.nBaterias} × ` : ''}${c.bateriaAh} Ah`]) },
    ],
  };
}

function secoesMemorial(res) {
  const { calc, dados } = res;
  const s = dados.sistema || {};
  const secoes = [
    { titulo: '1. Objeto e premissas', paragrafos: [
      `Sistema eletrônico de controle de acesso de ${dados.obra?.nome || 'a edificação'} com ${calc.nPontos} ponto(s) de acesso (${calc.nPortas} porta(s)/portão(ões)/cancela(s) e ${calc.catracas.reduce((a, p) => a + p.qtd, 0)} catraca(s)), ${calc.usuarios} usuários cadastrados e ${calc.visitantes} visitantes simultâneos.`,
      `Tecnologia principal: ${C.TECNOLOGIAS[calc.tecSistema].rotulo}; comunicação leitor–controladora: ${ROTULO_COM[calc.comunicacao]}; grau de segurança adotado: ${ROTULO_GRAU[calc.grau] || calc.grau} (IEC 60839-11-1) [CONFERIR com a análise de risco do cliente]. Integração com alarme de incêndio: ${calc.incendio ? 'sim' : 'não'}; integração com CFTV: ${calc.cftv ? 'sim' : 'não'}.`,
    ] },
    { titulo: '2. Critérios normativos', marcadores: [
      'Rotas de fuga (ABNT NBR 9077 e IT de saídas de emergência do Corpo de Bombeiros): a porta controlada não pode impedir a saída. Adota-se fechadura fail-safe (eletroímã), liberada automaticamente pelo alarme de incêndio (contato da central, NBR 17240), pela falta de energia e por acionador de emergência junto à porta que corta a alimentação da fechadura diretamente, sem depender da controladora. Fecho elétrico fail-secure só é aceito quando a saída pelo lado de dentro é mecânica e livre (maçaneta/barra antipânico, NBR 11785). [CONFERIR IT local]',
      'Catracas e cancelas não devem obstruir rota de fuga; junto a cada conjunto de catracas prevê-se passagem acessível com largura livre ≥ 0,90 m (NBR 9050). [CONFERIR]',
      'Acessibilidade (NBR 9050): leitores, teclados e botoeiras entre 0,80 m e 1,20 m do piso acabado (eixo recomendado 1,10 m), com área de aproximação livre; terminais faciais instalados a ~1,40–1,50 m devem ter alternativa acessível (leitor de cartão a ≤ 1,20 m ou terminal com campo vertical ampliado). [CONFERIR edição vigente]',
      'Segurança (IEC 60839-11-1): sensor de porta com alarmes de porta forçada e mantida aberta, detecção de violação (tamper) das controladoras e leitores conforme o grau, registro de eventos com horário sincronizado e supervisão da alimentação.',
      'Cabeamento (NBR 14565 e fabricantes): leitores Wiegand em manga blindada até ~100 m; RS-485/OSDP até 1 200 m em barramento; UTP Cat 6 até 90 m para leitores IP e catracas. Comprimento de cabo = distância × 1,15 (folgas e subidas).',
      'Alimentação (NBR 5410): fontes 12 Vcc com bateria em circuito dedicado, com disjuntor identificado e DPS classe II; gabinetes aterrados.',
      'LGPD (Lei 13.709/2018): identificação e registros de acesso são dados pessoais; biometria e face são dados sensíveis (art. 5º II e art. 11) — ver item 8.',
    ] },
    { titulo: '3. Pontos de acesso', tabela: { colunas: ['Id', 'Local', 'Tipo', 'Qtd.', 'Sentido', 'Rota', 'Fechadura', 'Falha', 'Tecnologia', 'Dist.'], linhas: calc.pontos.map(linhaPorta), proporcoes: [0.45, 1.7, 0.75, 0.35, 0.9, 0.45, 1.1, 0.65, 1.1, 0.5], tamanho: 14 } },
    { titulo: '4. Fechaduras e dispositivos', paragrafos: [
      `Força de retenção do eletroímã pelo tipo de porta [CONFERIR]: madeira leve/interna ${C.FORCA_MATERIAL.madeira_leve} kgf; madeira maciça, vidro e alumínio ${C.FORCA_MATERIAL.madeira} kgf; metálica/externa e portões 500 kgf; pelo peso da folha: até 40 kg → 150 kgf, até 80 kg → 300 kgf, acima → 500 kgf. Porta dupla recebe uma fechadura por folha. Portas de vidro usam suporte em L/ZL/U.`,
      `Quantidades: ${calc.fechaduras} fechadura(s), ${calc.leitoresTotal} leitor(es) (${calc.leitoresIp} IP), ${calc.botoeirasSaida} botoeira(s) de saída, ${calc.botoeirasEmergencia} acionador(es) de emergência (um por porta em rota de fuga) e ${calc.sensores} sensor(es) de porta (um por folha).`,
    ], tabela: { colunas: ['Id', 'Fechadura', 'Força rec.', 'Modo de falha', 'Leitores', 'Botoeira saída', 'Emergência', 'Sensores'],
      linhas: calc.portas.map(p => [p.id, p.rotuloFechadura, p.forca ? `${p.forca} kgf → ${p.eletroima} kgf` : '—', p.rotuloFalha, p.leitores, p.botoeiraSaida ? 'sim' : '—', p.botoeiraEmergencia ? 'sim' : '—', p.sensores || (p.lacos ? `${p.lacos} laço(s)` : '—')]),
      proporcoes: [0.45, 1.9, 1, 1.5, 0.6, 0.7, 0.75, 0.7], tamanho: 14 } },
    { titulo: '5. Controladoras, alimentação e autonomia', paragrafos: [
      `Controladoras = maior entre ⌈portas × (1 + reserva) ÷ portas por controladora⌉ e ⌈leitores ligados × (1 + reserva) ÷ leitores por controladora⌉ = ${calc.nCtrl} (${calc.ppc} portas / ${calc.lpc} leitores cada, reserva de ${num(calc.reserva * 100, 0)} %). Catracas têm controladora própria e ligam-se à rede.`,
      `Por controladora: corrente em repouso = controladora (${C.CORRENTE_CONTROLADORA} A) + leitores alimentados pela fonte + fechaduras fail-safe (energizadas com a porta travada); corrente de pico = repouso + acionamento das fechaduras fail-secure. Fonte ≥ pico × ${C.MARGEM_FONTE} (margem de 25 %); bateria (Ah) ≥ repouso × autonomia (${calc.autonomiaH} h) × ${C.FATOR_BATERIA} (envelhecimento e temperatura) [CONFERIR]. A corrente de recarga da bateria deve caber na fonte escolhida.`,
      'Na falta prolongada de energia, as fechaduras fail-safe destravam ao fim da autonomia — comportamento seguro para a vida, a considerar na segurança patrimonial.',
    ], tabela: { colunas: ['Controladora', 'Portas', 'Leitores', 'Repouso (A)', 'Pico (A)', 'Fonte nec. (A)', 'Fonte', 'Bateria nec. (Ah)', 'Bateria'],
      linhas: calc.controladoras.map(c => [c.id, c.portas.join(', '), c.leitores, num(c.iRep, 2), num(c.iPico, 2), num(c.fonteNec, 2), `${c.nFontes > 1 ? `${c.nFontes} × ` : ''}${c.fonteA} A`, num(c.ahNec, 1), `${c.nBaterias > 1 ? `${c.nBaterias} × ` : ''}${c.bateriaAh} Ah`]),
      proporcoes: [0.9, 1.4, 0.6, 0.7, 0.6, 0.8, 0.6, 0.8, 0.7], tamanho: 14 } },
    { titulo: '6. Cabeamento e infraestrutura', paragrafos: [
      `Alimentação das fechaduras em cabo PP/paralelo dimensionado pela queda de tensão: ΔV = 2 · L · I · ρ ÷ S, com ρ = ${C.RHO} Ω·mm²/m, L = distância × 1,15 e limite de ${num(C.QUEDA_MAX * 100, 0)} % de 12 V (1,2 V) [CONFERIR com o fabricante]. Acima de 2,5 mm², instalar fonte próxima à porta.`,
      `Totais: manga 6 vias (leitores Wiegand) ${calc.cabos.mangaLeitor6} m; manga 4 vias (RS-485) ${calc.cabos.mangaLeitor4} m; manga 4 vias (sensor/botoeira/comandos) ${calc.cabos.mangaIo} m; UTP Cat 6 ${calc.cabos.utpM} m; infraestrutura ${calc.cabos.infraM} m${calc.incendio ? `; sinal da central de incêndio ${calc.cabos.caboIncendio} m` : ''}. Pontos de energia a prever no projeto elétrico: ${calc.pontosEnergia} (fontes no rack, catracas e cancelas).`,
      calc.switches || calc.portasRede ? `Rede: ${calc.portasRede} porta(s) de switch (leitores IP, catracas e controladoras)${calc.poeW ? `, PoE ${num(calc.poeW, 0)} W` : ''}${calc.switches ? ` → ${calc.switches} switch(es) de ${Number(s.portas_switch) || 8} portas` : ' no switch existente'}.` : '',
    ].filter(Boolean), tabela: { colunas: ['Id', 'Distância (m)', 'Cabo (m)', 'Corrente (A)', 'Seção (mm²)', 'ΔV (V)', 'Cabo do leitor'],
      linhas: calc.portas.map(p => [p.id, num(p.distancia, 0), num(p.comprimento, 1), p.correntePico ? num(p.correntePico, 2) : '—', p.secao ? num(p.secao, 2) : '—', p.secao ? num(p.queda, 2) : '—', { wiegand: 'Manga 6 vias', rs485: 'Manga 4 vias', utp: 'UTP Cat 6' }[p.cabosLeitor]]),
      proporcoes: [0.5, 0.8, 0.7, 0.8, 0.8, 0.6, 1.1], tamanho: 15 } },
    { titulo: '7. Credenciais, software e integrações', paragrafos: [
      `Cartões = usuários × 1,1 = ${calc.cartoes}; cartões de visitante = visitantes simultâneos × 1,1 = ${calc.cartoesVisitante}${calc.tags ? `; TAGs veiculares = veículos × 1,1 = ${calc.tags}` : ''}. Licença de software para ${calc.licenca} portas (${calc.nPontos} pontos + reserva).`,
      calc.incendio ? 'Integração com incêndio: contato da central de alarme (NF, supervisionado) aciona relé de interface que corta a alimentação das fechaduras das rotas de fuga e libera as catracas; o retorno é manual após o rearme da central.' : 'Sem integração com a central de incêndio — ver não conformidades se houver rota de fuga.',
      calc.cftv ? 'Integração com CFTV: eventos de porta (acesso negado, porta forçada, porta aberta) vinculados à câmera do local para consulta do vídeo.' : '',
    ].filter(Boolean) },
  ];
  if (calc.perfis.length) secoes.push({ titulo: '7.1 Matriz de níveis de acesso', nivel: 2, tabela: { colunas: ['Perfil', 'Usuários', 'Portas permitidas', 'Horário'], linhas: calc.perfis.map(x => [x.perfil, x.usuarios, x.portas || '', x.horario || '']), proporcoes: [1.5, 0.6, 2.5, 1.6] } });
  secoes.push(
    { titulo: '8. Proteção de dados (LGPD)', marcadores: [
      'Finalidade: segurança das pessoas e do patrimônio; coletar só o necessário (art. 6º I e III).',
      calc.sensivel ? 'Biometria/face são dados sensíveis (art. 5º II): base legal registrada — em regra art. 11, II, "g" (prevenção à fraude e segurança do titular em identificação/autenticação) — [CONFERIR com o encarregado/jurídico do cliente]; oferecer alternativa sem biometria (cartão); armazenar templates criptografados, nunca a imagem.' : 'Sem coleta de biometria ou face no projeto.',
      'Transparência: aviso ao titular junto aos leitores e no cadastro (art. 6º VI e art. 9º).',
      'Segurança: acesso ao software por usuário individual, senhas fortes, firmware atualizado e registros protegidos (art. 46).',
      'Retenção e exclusão: excluir cadastros de desligados e visitantes e definir prazo de guarda dos registros (art. 15 e 16).',
    ] },
    { titulo: '9. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.55, 4, 0.4, 0.5, 1.5], tamanho: 15 } },
  );
  if (calc.ncsProjeto.length) secoes.push({ titulo: 'Não conformidades de projeto', marcadores: calc.ncsProjeto.map(n => `${n.cod} — ${n.descricao}. ${n.recomendacao}`) });
  if (calc.avisos.length) secoes.push({ titulo: 'Avisos', marcadores: calc.avisos });
  return secoes;
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo do controle de acesso', formato: 'Word', nome: 'Memorial_Controle_Acesso',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — CONTROLE DE ACESSO', subtitulo: 'IEC 60839-11-1/-11-2, ABNT NBR 9077 (rotas de fuga), NBR 9050, NBR 14565 e LGPD', tituloCurto: 'Memorial — controle de acesso', sigla: 'MEM-ACE', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de portas, dimensionamento e materiais', formato: 'Excel', nome: 'Controle_Acesso',
    gerar: (res) => D.gerarPlanilha([
      { nome: 'Portas', colunas: [{ header: 'Id', key: 'id', width: 8 }, { header: 'Local', key: 'local', width: 32 }, { header: 'Tipo', key: 'rotuloTipo' }, { header: 'Qtd.', key: 'qtd', width: 6 }, { header: 'Sentido', key: 'rotuloSentido', width: 34 }, { header: 'Rota de fuga', key: 'rotaTxt', width: 10 }, { header: 'Fechadura', key: 'rotuloFechadura', width: 30 }, { header: 'Modo de falha', key: 'rotuloFalha', width: 24 }, { header: 'Força rec. (kgf)', key: 'forca' }, { header: 'Eletroímã (kgf)', key: 'eletroima' }, { header: 'Tecnologia', key: 'rotuloTecnologia', width: 26 }, { header: 'Leitores', key: 'leitores' }, { header: 'Botoeira saída', key: 'botoeiraSaida' }, { header: 'Emergência', key: 'botoeiraEmergencia' }, { header: 'Sensores', key: 'sensores' }, { header: 'Distância (m)', key: 'distancia' }, { header: 'Cabo (m)', key: 'comprimento', numFmt: '0.0' }, { header: 'Corrente pico (A)', key: 'correntePico', numFmt: '0.00' }, { header: 'Seção alim. (mm²)', key: 'secao' }, { header: 'ΔV (V)', key: 'queda', numFmt: '0.00' }],
        linhas: res.calc.pontos.map(p => ({ ...p, rotaTxt: p.rota ? 'sim' : 'não' })) },
      { nome: 'Dimensionamento', colunas: [{ header: 'Controladora', key: 'id' }, { header: 'Portas', key: 'portasTxt', width: 28 }, { header: 'Leitores', key: 'leitores' }, { header: 'Repouso (A)', key: 'iRep', numFmt: '0.00' }, { header: 'Pico (A)', key: 'iPico', numFmt: '0.00' }, { header: 'Fonte nec. (A)', key: 'fonteNec', numFmt: '0.00' }, { header: 'Fonte (A)', key: 'fonteA' }, { header: 'Nº fontes', key: 'nFontes' }, { header: 'Bateria nec. (Ah)', key: 'ahNec', numFmt: '0.0' }, { header: 'Bateria (Ah)', key: 'bateriaAh' }, { header: 'Nº baterias', key: 'nBaterias' }],
        linhas: res.calc.controladoras.map(c => ({ ...c, portasTxt: c.portas.join(', ') })) },
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de vistoria / comissionamento', formato: 'Word', nome: 'Relatorio_Controle_Acesso',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE VISTORIA E COMISSIONAMENTO — CONTROLE DE ACESSO', tipoInspecao: res.insp.tipo === 'periodica' ? 'Vistoria técnica periódica' : 'Comissionamento / vistoria técnica', tituloCurto: 'Relatório — controle de acesso', sigla: 'REL-ACE',
      objetivo: 'Verificar a instalação e o funcionamento do controle de acesso — leitores, fechaduras, botoeiras, controladoras, alimentação e software —, a liberação das portas em rota de fuga (alarme de incêndio, falta de energia e acionador de emergência), a acessibilidade e a conformidade com a LGPD.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [
        ['Pontos de acesso', `${res.calc.nPontos} (${res.calc.rotas.length} em rota de fuga)`],
        ['Tecnologia / comunicação', `${C.TECNOLOGIAS[res.calc.tecSistema].rotulo} / ${ROTULO_COM[res.calc.comunicacao]}`],
        ['Controladoras / fontes', `${res.calc.nCtrl} / ${res.calc.nFontes} — autonomia de projeto ${res.calc.autonomiaH} h`],
        ['Integrações', `incêndio: ${res.calc.incendio ? 'sim' : 'não'} · CFTV: ${res.calc.cftv ? 'sim' : 'não'}`],
        ['Grau de segurança', ROTULO_GRAU[res.calc.grau] || String(res.calc.grau)],
      ],
      metodologia: [
        'Inspeção visual de leitores, fechaduras, botoeiras, sensores, controladoras, fontes e infraestrutura.',
        'Teste por porta: acesso com credencial válida e negado com credencial inválida, saída por botoeira/leitor, porta forçada e mantida aberta.',
        'Teste das rotas de fuga: alarme simulado na central de incêndio, falta de energia e acionador de emergência com a controladora desligada.',
        'Teste de autonomia com falta de CA; conferência de usuários, firmware, horário (NTP) e registros no software.',
      ],
      medicoes: [{ titulo: '6.1 Teste por porta', colunas: ['Porta', 'Acesso', 'Saída', 'Emergência/incêndio', 'Alarmes', 'Obs.', 'Resultado'], proporcoes: [0.8, 0.6, 0.6, 0.9, 0.6, 2, 0.8],
        linhas: res.testes.map(m => [m.porta, ...['acesso_ok', 'saida_ok', 'emergencia_ok', 'alarme_ok'].map(k => (m[k] === false ? 'falha' : m[k] ? 'ok' : '')), m.observacao || '', m.resultado]),
        nota: 'Em rota de fuga, a liberação deve ocorrer nas três condições: alarme de incêndio, falta de energia e acionador de emergência.' }],
      proximaInspecao: [['Periodicidade sugerida', 'Anual, e após qualquer alteração de portas, rotas de fuga ou da central de incêndio [CONFERIR contrato de manutenção]'], ['Teste de bateria', 'Semestral (falta de CA simulada)']],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Controle_Acesso',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — CONTROLE DE ACESSO', subtitulo: 'Vistoria e comissionamento (IEC 60839-11-1, NBR 9077, NBR 9050, LGPD)', tituloCurto: 'Checklist — controle de acesso', secoesChecklist: SECOES_CHECKLIST,
      preparacao: [
        'Combinar com o cliente e com a brigada o teste de alarme de incêndio (as portas das rotas de fuga vão liberar).',
        'Levar: credencial válida e credencial bloqueada para teste, multímetro, trena, notebook com acesso ao software, lista de portas impressa.',
        'Não deixar portas de rota de fuga travadas sem energia durante os testes.',
      ],
      referencias: [
        ['Pontos de acesso / em rota de fuga', `${res.calc.nPontos} / ${res.calc.rotas.length}`],
        ['Controladoras / fontes', `${res.calc.nCtrl} / ${res.calc.nFontes}`],
        ['Autonomia de projeto', `${res.calc.autonomiaH} h`],
        ['Altura de leitores e botoeiras', '0,80 m a 1,20 m (NBR 9050)'],
        ...res.calc.controladoras.map(c => [`${c.id} — corrente em repouso / bateria`, `${num(c.iRep, 2)} A / ${c.bateriaAh} Ah`]),
      ],
      medicoes: [{ titulo: 'Teste por porta', colunas: ['Porta', 'Acesso ok', 'Saída ok', 'Emergência/incêndio', 'Alarmes', 'Altura leitor (m)', 'Obs.'], proporcoes: [1.4, 0.6, 0.6, 0.9, 0.6, 0.7, 1.6],
        linhas: res.calc.pontos.map(p => [`${p.id} — ${p.local}${p.rota ? ' (ROTA DE FUGA)' : ''}`, '', '', '', '', '', '']) }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Controle de acesso', codigo, descricao, quantidade, unidade });
  const qtd = (lista) => lista.reduce((a, p) => a + p.qtd, 0);
  const leitoresPorta = calc.pontos.filter(p => !p.autonomo).reduce((a, p) => a + p.leitores * p.qtd, 0);
  const dispositivos = calc.botoeirasSaida + calc.botoeirasEmergencia + calc.sensores;
  const itens = modo === 'inspecao'
    ? [
      srv('ace_vistoria', 'Vistoria por ponto de acesso (leitor, fechadura, botoeiras, sensor e liberação por incêndio/falta de energia)', calc.nPontos, 'un'),
      srv('ace_laudo', 'Relatório de vistoria/comissionamento do controle de acesso com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Controle de acesso', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      ...(leitoresPorta ? [srv('ace_leitor', 'Instalação e configuração de leitor (cartão, biometria ou facial)', leitoresPorta, 'un')] : []),
      ...(calc.fechaduras ? [srv('ace_fechadura', 'Instalação de fechadura eletromagnética/fecho elétrico/solenoide com suporte e ajuste', calc.fechaduras, 'un')] : []),
      ...(dispositivos ? [srv('ace_botoeira', 'Instalação de botoeira de saída, acionador de emergência ou sensor de porta', dispositivos, 'un')] : []),
      ...(calc.nCtrl ? [srv('ace_controladora', 'Instalação de controladora com fonte, bateria e gabinete (montagem e ligações)', calc.nCtrl, 'un')] : []),
      ...(calc.catracas.length || calc.cancelas.length ? [srv('ace_catraca', 'Instalação e configuração de catraca ou cancela', qtd(calc.catracas) + qtd(calc.cancelas), 'un')] : []),
      srv('ace_infra', 'Infraestrutura e lançamento de cabos do controle de acesso (por metro de rota)', calc.cabos.infraM, 'm'),
      srv('ace_programacao', `Programação do software, cadastro de ${calc.usuarios} usuários, níveis de acesso e integrações${calc.incendio ? ' (incêndio' : ''}${calc.incendio && calc.cftv ? ', CFTV)' : calc.incendio ? ')' : calc.cftv ? ' (CFTV)' : ''}`, 1, 'vb'),
      srv('ace_comissionamento', 'Comissionamento por porta (liberação por incêndio, falta de energia e emergência), testes e treinamento', 1, 'vb'),
      srv('ace_projeto', 'Projeto de controle de acesso (portas, dimensionamento, memorial) com ART', 1, 'vb'),
    ];
  const obra = dados.obra?.nome || 'a edificação';
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Vistoria técnica/comissionamento do controle de acesso de ${obra} (${calc.nPontos} pontos de acesso, ${calc.rotas.length} em rota de fuga), com testes por porta, verificação da liberação por incêndio, acessibilidade e LGPD, e relatório com ART.`
      : `Fornecimento, instalação e programação de sistema de controle de acesso em ${obra}: ${calc.nPontos} pontos de acesso, ${calc.leitoresTotal} leitores (${C.TECNOLOGIAS[calc.tecSistema].rotulo}), ${calc.nCtrl} controladora(s) com fonte e bateria para ${calc.autonomiaH} h${calc.incendio ? ', liberação das rotas de fuga pelo alarme de incêndio' : ''}${calc.cftv ? ', integração com o CFTV' : ''}, ${calc.cartoes} cartões, projeto, ART e treinamento.`,
    observacoes: 'Rascunho gerado pela skill de controle de acesso — conferir modelos, quantidades e preços antes de enviar ao cliente. Infraestrutura elétrica dos pontos de energia (fontes, catracas e cancelas) não incluída, salvo indicação.',
    itens,
  };
}

const OP = {
  tecnologia: F.op(Object.entries(C.TECNOLOGIAS).filter(([k]) => k !== 'uhf').map(([k, v]) => [k, v.rotulo])),
  tecnologiaPorta: [{ valor: '', rotulo: '(a do sistema)' }, ...F.op(Object.entries(C.TECNOLOGIAS).map(([k, v]) => [k, v.rotulo]))],
  comunicacao: F.op(Object.entries(ROTULO_COM)),
  grau: F.op(Object.entries(ROTULO_GRAU)),
  tipo: F.op(Object.entries(C.TIPOS).map(([k, v]) => [k, v.rotulo])),
  sentido: F.op(Object.entries(C.SENTIDOS)),
  fechadura: F.op(Object.entries(C.FECHADURAS).map(([k, v]) => [k, v.rotulo])),
  falha: [{ valor: '', rotulo: '(padrão da fechadura)' }, ...F.op([['fail_safe', 'Fail-safe (destrava sem energia)'], ['fail_secure', 'Fail-secure (trava sem energia)']])],
  material: [{ valor: '', rotulo: '—' }, ...F.op(Object.entries(C.ROTULO_MATERIAL))],
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Sistema', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.tecnologia', rotulo: 'Tecnologia principal', tipo: 'selecao', opcoes: OP.tecnologia },
      { caminho: 'sistema.comunicacao', rotulo: 'Comunicação do leitor', tipo: 'selecao', opcoes: OP.comunicacao },
      { caminho: 'sistema.grau_seguranca', rotulo: 'Grau de segurança (IEC 60839-11-1)', tipo: 'selecao', opcoes: OP.grau },
      { caminho: 'sistema.autonomia_h', rotulo: 'Autonomia da bateria (h)', tipo: 'numero' },
      { caminho: 'sistema.portas_por_controladora', rotulo: 'Portas por controladora', tipo: 'numero' },
      { caminho: 'sistema.leitores_por_controladora', rotulo: 'Leitores por controladora', tipo: 'numero', dica: 'Entradas de leitor (Wiegand/RS-485). Vazio = igual ao nº de portas' },
      { caminho: 'sistema.reserva_pct', rotulo: 'Reserva (%)', tipo: 'numero' },
      { caminho: 'sistema.portas_switch', rotulo: 'Portas por switch', tipo: 'numero' },
      { caminho: 'sistema.integracao_incendio', rotulo: 'Liberação pelo alarme de incêndio', tipo: 'check' },
      { caminho: 'sistema.distancia_central_incendio_m', rotulo: 'Distância até a central de incêndio (m)', tipo: 'numero' },
      { caminho: 'sistema.integracao_cftv', rotulo: 'Integração com CFTV', tipo: 'check' },
      { caminho: 'sistema.passagem_acessivel', rotulo: 'Já há passagem acessível junto às catracas', tipo: 'check' },
      { caminho: 'sistema.infra_existente', rotulo: 'Infraestrutura (eletrodutos) existente', tipo: 'check' },
      { caminho: 'sistema.switch_existente', rotulo: 'Switch existente', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Usuários e visitantes', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.usuarios', rotulo: 'Usuários (vazio = soma dos perfis)', tipo: 'numero' },
      { caminho: 'sistema.visitantes_simultaneos', rotulo: 'Visitantes simultâneos', tipo: 'numero' },
      { caminho: 'sistema.veiculos', rotulo: 'Veículos (TAGs) — cancela', tipo: 'numero' },
      { caminho: 'sistema.credencial_cartao', rotulo: 'Usuários recebem cartão/tag', tipo: 'check' },
    ] },
    { tipo: 'nota', texto: 'Matriz de níveis de acesso (opcional): um perfil por linha. Entra no memorial e serve de base para a programação.' },
    { tipo: 'tabela', caminho: 'perfis', rotuloAdicionar: 'Adicionar perfil', novaLinha: { perfil: '', usuarios: null, portas: '', horario: '' },
      colunas: [{ campo: 'perfil', rotulo: 'Perfil' }, { campo: 'usuarios', rotulo: 'Usuários', tipo: 'numero', largura: 90 }, { campo: 'portas', rotulo: 'Portas permitidas' }, { campo: 'horario', rotulo: 'Horário', largura: 180 }] },
  ] },
  { titulo: '4. Portas e pontos de acesso', aberta: true, itens: [
    { tipo: 'nota', texto: 'Rota de fuga: fechadura fail-safe (eletroímã) ou saída mecânica livre; o sistema acrescenta o acionador de emergência. Força vazia = pelo material/peso da porta. Distância: da porta até a controladora/rack.' },
    { tipo: 'tabela', caminho: 'portas', rotuloAdicionar: 'Adicionar porta', novaLinha: { id: 'P{n}', local: '', tipo: 'simples', quantidade: 1, sentido: 'entrada', rota_fuga: false, fechadura: 'eletroima', modo_falha: '', material: 'madeira', forca_kgf: null, peso_kg: null, tecnologia: '', distancia_m: 30, modelo: '' },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 60 }, { campo: 'local', rotulo: 'Local' },
        { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipo, largura: 120 },
        { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 55 },
        { campo: 'sentido', rotulo: 'Sentido', tipo: 'selecao', opcoes: OP.sentido, largura: 220 },
        { campo: 'rota_fuga', rotulo: 'Rota de fuga', tipo: 'check', largura: 70 },
        { campo: 'fechadura', rotulo: 'Fechadura', tipo: 'selecao', opcoes: OP.fechadura, largura: 200 },
        { campo: 'modo_falha', rotulo: 'Modo de falha', tipo: 'selecao', opcoes: OP.falha, largura: 170 },
        { campo: 'material', rotulo: 'Material', tipo: 'selecao', opcoes: OP.material, largura: 140 },
        { campo: 'forca_kgf', rotulo: 'Força (kgf)', tipo: 'numero', largura: 75 },
        { campo: 'peso_kg', rotulo: 'Peso (kg)', tipo: 'numero', largura: 70 },
        { campo: 'tecnologia', rotulo: 'Tecnologia', tipo: 'selecao', opcoes: OP.tecnologiaPorta, largura: 170 },
        { campo: 'distancia_m', rotulo: 'Dist. (m)', tipo: 'numero', largura: 70 },
        { campo: 'modelo', rotulo: 'Modelo', largura: 110 },
      ] },
  ] },
  F.secaoInspecao(5, F.op([['comissionamento', 'Comissionamento'], ['vistoria', 'Vistoria técnica'], ['periodica', 'Vistoria periódica']])),
  F.secaoChecklist(6, CHECKLIST.length),
  { titulo: '7. Teste por porta', itens: [
    { tipo: 'nota', texto: 'Marque cada teste feito; em branco = não verificado. Emergência/incêndio: alarme simulado, falta de energia e acionador de emergência.' },
    { tipo: 'tabela', caminho: 'inspecao.teste_portas', rotuloAdicionar: 'Adicionar teste', novaLinha: { porta: '', acesso_ok: null, saida_ok: null, emergencia_ok: null, alarme_ok: null, observacao: '' },
      colunas: [{ campo: 'porta', rotulo: 'Porta', largura: 120 }, { campo: 'acesso_ok', rotulo: 'Acesso ok', tipo: 'check', largura: 80 }, { campo: 'saida_ok', rotulo: 'Saída ok', tipo: 'check', largura: 80 }, { campo: 'emergencia_ok', rotulo: 'Emergência/incêndio ok', tipo: 'check', largura: 120 }, { campo: 'alarme_ok', rotulo: 'Alarmes ok', tipo: 'check', largura: 90 }, { campo: 'observacao', rotulo: 'Observação' }] },
  ] },
  F.secaoNcs(8, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(9),
];

module.exports = criarDisciplina({
  chave: 'controle_acesso',
  nome: 'Controle de acesso (IEC 60839-11 / NBR 9077 / LGPD)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Implantação do controle de acesso', descricao: 'Leitores, fechaduras, botoeiras, controladoras, fontes, catracas, cabos, programação e mão de obra' },
    { modo: 'inspecao', rotulo: 'Vistoria / comissionamento', descricao: 'Testes por porta, relatório com ART e correção das não conformidades' },
  ],
  montarOrcamento,
});
