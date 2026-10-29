// Análise de Projeto — serviços (mão de obra) e materiais candidatos a partir
// do que foi lido nos arquivos: pontos codificados (CAMx, Rx, Ax), quadros de
// carga, listas de materiais do PDF, contagem pelo desenho (PDF vetorial e
// DWG/DXF) e itens-modelo por disciplina; o mesmo item vindo de fontes
// diferentes conta uma vez só. Funções puras: o catálogo e os preços de
// referência chegam prontos de services/compatibilizacaoAnalise.js, que
// lê os arquivos, o banco e a IA.
const { nomeDaDisciplina } = require('./disciplinasProjeto');
const { detectarDisciplinas } = require('./leitoresTabelaProjeto');
// preço sugerido do catálogo pela semelhança da descrição (Jaccard >= 0,45)
const { compararComCatalogo } = require('./semelhancaMateriais');
const { chaveNome } = require('./texto');

// "rede" e "cabeamento" são a mesma skill (NBR 14565): o pacote sugere
// "cabeamento" para LOG/REDE/CAB e a tela deixa marcar qualquer das duas. Antes
// cada ponto do código olhava só uma delas, e o mesmo PDF marcado "cabeamento"
// dava 0 pontos de rede (contra 69 marcado "rede"), sem aviso (revisão 29/10/2026).
const GRUPO_DISCIPLINA = { rede: ['rede', 'cabeamento'], cabeamento: ['cabeamento', 'rede'] };
const doGrupo = (d) => GRUPO_DISCIPLINA[d] || [d];
const temDisciplina = (marcadas, d) => doGrupo(d).some(x => (marcadas || []).includes(x));
// item-modelo de uma disciplina do grupo entra com a disciplina que foi marcada
function naDisciplinaMarcada(itens, marcadas) {
  return itens.filter(it => temDisciplina(marcadas, it.disciplina)).map((it) => {
    if (marcadas.includes(it.disciplina)) return it;
    const d = doGrupo(it.disciplina).find(x => marcadas.includes(x));
    return { ...it, disciplina: d, subgrupo: nomeDaDisciplina(d) };
  });
}

// Soma um campo (ex.: câmeras) só dos arquivos marcados com a disciplina dada —
// é o que evita um arquivo de outra disciplina (ex.: iluminação) contaminar a
// contagem de antena/rede só porque um texto qualquer bateu com o regex.
function somarPorDisciplina(analises, disciplina, obterValor) {
  return analises
    .filter(a => temDisciplina(a.disciplinas, disciplina))
    .reduce((s, a) => s + obterValor(a), 0);
}

// Monta a lista completa de serviços (mão de obra) candidatos, na mesma
// estrutura usada nos orçamentos de referência da empresa. Cada item tem
// "pronto" (já executado / não orçar) editável pelo usuário, e agora também
// uma "disciplina" (ver utils/disciplinasProjeto.js) — o subgrupo visual
// exibido na tela/relatório é o nome dessa disciplina, e só entram na lista
// final os itens cuja disciplina foi marcada em pelo menos um dos arquivos
// analisados.
//
// Câmeras, pontos de rede e pontos de antena/TV vêm preenchidos
// automaticamente quando o desenho usa código individual por ponto (CAMx,
// Rx, Ax) — já validado que esses códigos aparecem como texto direto no
// PDF, sem precisar de IA nem risco de inventar número, e agora somados só
// dos arquivos marcados com a disciplina certa. As demais disciplinas
// (Elétrica, Telefonia, Iluminação, Automação, Alarme) não têm esse tipo de
// código — os símbolos delas (tomada, luminária, quadro) são gráficos, sem
// texto individual no PDF (confirmado lendo um projeto real de iluminação:
// a legenda só descreve o que cada ícone significa, não quantos existem) —
// por isso ficam com quantidade 0 e aviso pra confirmar direto na planta,
// A MENOS que a tabela quantitativa do arquivo (ver extrairTabelaQuantitativa
// em projetoParser.js) tenha achado uma contagem de verdade em texto (ex.:
// um "quadro de cargas" no mesmo formato usado pra portas/janelas).
// Pontos codificados (CAMx, Rx, Ax): o orçamento usa os códigos ÚNICOS — é o
// que a tela e o relatório sempre disseram ("pontos únicos… é esse o número
// usado no orçamento"), mas o código somava as ocorrências, contando em dobro
// um rótulo repetido. Repetições continuam como achado para conferência.
const totaisCodificados = (analises) => ({
  cameras: somarPorDisciplina(analises, 'cftv', a => a.cameras.total),
  rede: somarPorDisciplina(analises, 'rede', a => a.pontosRedeAntena.rede.total),
  antena: somarPorDisciplina(analises, 'antena', a => a.pontosRedeAntena.antena.total),
});

// Circuitos lidos dos quadros de carga dos arquivos de elétrica
const circuitosDosQuadros = (analises) => analises
  .filter(a => a.disciplinas.some(d => d.startsWith('eletrica')))
  .reduce((s, a) => s + (a.quadroCargas?.length || 0), 0);
// Quadros de um arquivo: um por TÍTULO de quadro de cargas ("Quadro de cargas
// (QD-Térreo)"), não um por arquivo — PDF com QGBT + QD-Térreo + QD-1PAV dava
// ele_qd_setorial = 1 (revisão de 29/10/2026). Aceita a lista de quadros
// (`a.quadros`) ou o título em cada circuito; sem título, 1 por arquivo com circuitos.
const tituloDoQuadro = (c) => c?.quadro || c?.painel || c?.titulo || null;
function quadrosDoArquivo(a) {
  if (Array.isArray(a.quadros) && a.quadros.length) return a.quadros.length;
  const c = a.quadroCargas || [];
  if (!c.length) return 0;
  return Math.max(1, new Set(c.map(tituloDoQuadro).filter(Boolean)).size);
}

// Item-modelo de material (quantidade 0, "confirme na planta") que a contagem
// do desenho (DWG/DXF ou PDF, item não ambíguo) já cobre na mesma disciplina
// sai da lista — senão a tela mostra "Tomada 2P+T: 0" ao lado de "Tomada baixa
// 2P+T — bloco TB-T: 64". "Trecho de fiação" não cobre o eletroduto: a fiação
// vira eletroduto e cabo calculados (montarMateriaisDoDesenho) e são eles que cobrem.
const MODELO_COBERTO = [
  [/^Tomada 2P\+T/, /^Tomada/i], [/^Interruptor/, /^Interruptor/i], [/^Eletroduto PVC/, /^Eletroduto/i],
  [/^Cabo elétrico flexível/, /^Cabo flexível 750 V — /i],
  [/^Quadro de distribuição \(/, /^Quadro de distribuição/i], [/^Luminária LED/, /^Luminária/i], [/^Perfil LED/, /Perfil/i],
];
const DO_DESENHO = /no (DWG|DXF)|no desenho de "/;
function semModeloCoberto(modelos, doDesenho) {
  return modelos.filter(m => {
    if (m.quantidade) return true;
    const regra = MODELO_COBERTO.find(([re]) => re.test(m.descricao));
    return !(regra && doDesenho.some(d => d.disciplina === m.disciplina && d.quantidade > 0 && regra[1].test(semMarcador(d.descricao)) && DO_DESENHO.test(d.observacao || '')));
  });
}
// sobra sobre a rota medida na planta (curvas e emendas que o desenho não mostra)
const SOBRA_ROTA = 1.1;

// ── Contagem pelo desenho → mão de obra ──────────────────────────────────
// Símbolos contados no DWG/DXF (blocos) e no PDF vetorial (legenda da prancha,
// só item não ambíguo) viram a quantidade do serviço de instalação. Antes só o
// DWG/DXF alimentava a mão de obra, e só de elétrica, iluminação, CFTV, rede,
// antena, telefone e alarme (revisão de 29/10/2026: DXF de incêndio com 13
// detectores, 3 acionadores, 5 avisadores e 1 central dava mão de obra de
// incêndio = nada; 79 luminárias contadas no PDF = 0 de mão de obra).
// Cada regra tem a disciplina do serviço: só conta em arquivo marcado com ela,
// e no DWG/DXF o bloco precisa ser dessa disciplina (pela layer/nome do bloco
// ou pela leitura do CAD) — câmera descrita por engano como "Acionador manual"
// não vira serviço de incêndio.
// [regex da descrição, código (ou função da descrição), disciplina, regex do nome do bloco]
// Código começando com "_" não é serviço: vira nota no item (NOTA_DO_DESENHO).
const SEM_EMERG = '^(?!.*emerg)';
const alturaDaDescricao = (s) => {
  const t = String(s || '');
  const m = t.match(/\bh\s*=\s*(\d+(?:[.,]\d+)?)\s*m?\b/i) || t.match(/(\d+[.,]\d+)\s*m\s*(do|de|em rela[çc][ãa]o ao)\s*piso/i)
    || t.match(/\ba\s+(\d+[.,]\d+)\s*m\b/i);
  if (m) return Number(m[1].replace(',', '.'));
  const cm = t.match(/\b(\d{2,3})\s*cm\b/i);
  return cm ? Number(cm[1]) / 100 : null;
};
// "Tomada 2P+T" sem altura não é tomada baixa: vira nota para o usuário distribuir
function tomadaPorAltura(descricao) {
  if (/\bbaixa/i.test(descricao)) return 'ele_tomada_baixa';
  if (/\bm[ée]dia/i.test(descricao)) return 'ele_tomada_media';
  if (/\balta\b/i.test(descricao)) return 'ele_tomada_alta';
  const h = alturaDaDescricao(descricao);
  if (h == null || h <= 0 || h > 4) return '_tomada_sem_altura';
  return h < 0.8 ? 'ele_tomada_baixa' : h <= 1.6 ? 'ele_tomada_media' : 'ele_tomada_alta';
}
const SERVICO_DO_SIMBOLO = [
  // incêndio antes de alarme ("Central de alarme CIE", "Sinalizador audiovisual")
  [/lumin[áa]ria de emerg|bloco aut[ôo]nomo|ilumina[çc][ãa]o de emerg|balizamento|sinaliza[çc][ãa]o de (emerg|rota|sa[íi]da)/i, 'inc_ilum_emergencia', 'incendio', /EMERG/i],
  [/detector|acionador manual|avisador|sinalizador (audio|sonoro|visual)|audiovisual|sirene.*inc[êe]ndio|m[óo]dulo (isolador|de (entrada|sa[íi]da|comando|monitora))|\bisolador/i, 'inc_dispositivo', 'incendio', /^(INC|SDAI)\b.*(DET|ACION|SIRENE|AVIS|\bAV\b|MOD|ISOL)|^D[FT]\b|^AM\b/i],
  [/central/i, 'inc_central', 'incendio', /^(INC|SDAI)\b.*CENTRAL|^CI\b/i],
  // controle de acesso
  [/catraca|cancela/i, 'ace_catraca', 'controle_acesso'],
  [/leitora?\b|biometr|facial|cart[ãa]o de proximidade/i, 'ace_leitor', 'controle_acesso', /^(CA|ACE)\b.*LEIT/i],
  [/fechadura|eletro[ií]m[ãa]|fecho el[ée]tr|solen[óo]ide/i, 'ace_fechadura', 'controle_acesso', /^(CA|ACE)\b.*(ELETROIMA|FECH)/i],
  [/botoeira|acionador de emerg|sensor de porta/i, 'ace_botoeira', 'controle_acesso', /^(CA|ACE)\b.*(BOTO|EMERG)/i],
  [/controladora/i, 'ace_controladora', 'controle_acesso', /^(CA|ACE)\b.*CONTR/i],
  // alarme de intrusão
  [/barreira/i, 'alarme_barreira', 'alarme'],
  [/\bIVP\b|infravermelho passivo|sensor (de )?presen[çc]a|dupla tecnologia/i, 'alarme_ivp', 'alarme'],
  [/magn[ée]tic|sensor de abertura/i, 'alarme_sensor_abertura', 'alarme'],
  [/sirene/i, 'alarme_sirene', 'alarme'],
  [/teclado/i, 'alarme_teclado', 'alarme'],
  [/repetidor/i, 'alarme_repetidor', 'alarme'],
  [/central/i, 'alarme_central', 'alarme'],
  // rede, TV, telefone e câmera antes de tomada ("tomada de rede" é ponto de rede)
  [/access ?point|\bwi-?fi\b/i, 'rede_ap', 'rede', /^AP\b/i],
  [/ponto de (rede|telecom|dados)|\brj-?45\b|tomada (de rede|l[óo]gica)|ponto l[óo]gico/i, 'rede_ponto', 'rede', /^(PR|PD|REDE)\b|RJ-?45|LOGIC/i],
  [/ponto de tv|coaxial|tomada de tv/i, 'antena_ponto', 'antena', /^TV\b/i],
  [/interfone|porteiro/i, 'tel_terminal', 'telefonia'],
  [/telefon/i, 'tel_ponto', 'telefonia', /^TEL\b/i],
  [/c[âa]mera|\bdome\b|bullet|\bptz\b|speed ?dome/i, 'cftv_ponto', 'cftv', /C[AÂ]M(ERA)?\b|DOME|BULLET|PTZ/i],
  // elétrica
  [/^(?!.*(rede|l[óo]gica|rj-?45|\btv\b|coaxial|telefon|dados)).*(tomada.*emerg|emerg.*tomada)/i, 'ele_tomada_emergencia', 'eletrica'],
  [/tomada (de )?piso|tomada (de |no )?teto/i, 'ele_ponto_energia', 'eletrica'],
  [/^(?!.*(rede|l[óo]gica|rj-?45|\btv\b|coaxial|telefon|dados)).*tomada/i, tomadaPorAltura, 'eletrica'],
  [/interruptor/i, 'ele_interruptor', 'eletrica', /^INT/i],
  [/quadro de distribui/i, 'ele_qd_setorial', 'eletrica'],
  // "Ponto de luz" não é ponto de energia (era ele_ponto_energia): vira nota
  [/ponto (gen[ée]rico )?de (luz|ilumina)/i, '_ponto_luz', 'iluminacao'],
  [/ponto (gen[ée]rico )?de (luz|ilumina)/i, '_ponto_luz', 'eletrica'],
  // iluminação (a de emergência é de incêndio — NBR 10898)
  [/dimmer|interruptor/i, 'ilum_interruptor_dimmer', 'iluminacao'],
  [new RegExp(`${SEM_EMERG}.*sensor (de )?presen`, 'i'), 'ilum_sensor_presenca', 'iluminacao'],
  [new RegExp(`${SEM_EMERG}.*pendente`, 'i'), 'ilum_luminaria_pendente', 'iluminacao'],
  // a legenda diz "de sobrepor": era lançado como de embutir (teste de 28/10/2026)
  [new RegExp(`${SEM_EMERG}(.*(lumin[áa]ria|painel|spot).*sobrepor|.*plafon|.*arandela)`, 'i'), 'ilum_luminaria_sobrepor', 'iluminacao'],
  [new RegExp(`${SEM_EMERG}.*(lumin[áa]ria|downlight|\\bspot\\b|painel led|projetor|refletor)`, 'i'), 'ilum_luminaria_embutir', 'iluminacao'],
  // automação
  [/termostato|sensor de (temperatura|umidade|co2|co₂|press)/i, 'auto_sensor', 'automacao'],
  [/atuador|m[óo]dulo de automa/i, 'auto_atuadores', 'automacao'],
  [/quadro de automa|\bCLP\b/i, 'auto_quadro', 'automacao'],
  // SPDA
  [/haste|caixa de (inspe|medi)/i, 'spda_hastes_caixas', 'spda'],
  [/\bDPS\b/i, 'spda_dps', 'spda'],
  // recarga de VE, solar, pressurização, hospitalar, industrial, média tensão
  [/carregador|wallbox|eletroposto|esta[çc][ãa]o de recarga/i, 've_instalacao_carregador', 'carregador'],
  [/m[óo]dulo (fotovolt|solar)|placa solar|painel (fotovolt|solar)/i, 'sol_modulo', 'solar'],
  [/inversor/i, 'sol_inversor', 'solar'],
  [/ventilador/i, 'pres_ventilador', 'pressurizacao'],
  [/damper|registro de (al[íi]vio|sobrepress)/i, 'pres_damper', 'pressurizacao'],
  [/grelha|veneziana/i, 'pres_grelha', 'pressurizacao'],
  [/pressostato|transmissor de press/i, 'pres_sensores', 'pressurizacao'],
  [/painel (de )?comando/i, 'pres_painel', 'pressurizacao'],
  [/painel (it|de isola)|transformador (de separa|isolador)|\bQDIT\b/i, 'hosp_painel_it', 'eletrica_hospitalar'],
  [/\bDSI\b|supervisor de isolamento/i, 'hosp_dsi', 'eletrica_hospitalar'],
  [/tomada.*\bIT\b|\bIT m[ée]dico.*tomada/i, 'hosp_tomada_it', 'eletrica_hospitalar'],
  [/\bBEL\b|equipotencializa/i, 'hosp_equipotencializacao', 'eletrica_hospitalar'],
  [/\bCCM\b|\bQGBT\b/i, 'ind_ccm_montagem', 'eletrica_industrial'],
  [/capacitor/i, 'ind_banco_capacitores', 'eletrica_industrial'],
  [/transformador/i, 'mt_transformador', 'media_tensao'],
  [/mufla|termina[çc][ãa]o/i, 'mt_terminacao', 'media_tensao'],
  [/haste/i, 'mt_hastes', 'media_tensao'],
];
// trecho medido (eletroduto, eletrocalha, fiação) → serviço de infraestrutura por metro
const INFRA_DA_DISCIPLINA = {
  incendio: 'inc_infra', controle_acesso: 'ace_infra', alarme: 'alarme_infra', iluminacao: 'ilum_infraestrutura',
  telefonia: 'tel_infra', pressurizacao: 'pres_infra', carregador: 've_infraestrutura', media_tensao: 'mt_infra_subterranea',
};
function servicoDaLinha(disciplina, it) {
  const texto = `${it.layer || ''} ${it.descricao || ''}`;
  if (disciplina === 'spda') return /DESC/i.test(texto) ? 'spda_descida' : /ANEL|ENTERR|ATERR/i.test(texto) ? 'spda_anel' : 'spda_malha';
  if (disciplina === 'eletrica_industrial') return /ELETROCALHA|LEITO|PERFILADO/i.test(texto) ? 'ind_eletrocalha' : null;
  return INFRA_DA_DISCIPLINA[disciplina] || null;
}
// nota de símbolo que não é serviço → em qual item ela aparece (o primeiro presente)
const NOTA_DO_DESENHO = {
  _tomada_sem_altura: { itens: ['ele_tomada_baixa'], texto: (n, r) => `Mais ${n} tomada(s) sem altura na descrição (${r}) não entraram aqui — distribua entre baixa, média e alta.` },
  _ponto_luz: { itens: ['ilum_luminaria_embutir', 'ele_ponto_energia'], texto: (n, r) => `${n} ponto(s) de luz no desenho (${r}) não são ponto de energia e não entraram na quantidade — a luminária de cada ponto é de iluminação; confira.` },
};

// Disciplina de um item do DWG/DXF: o prefixo da layer/bloco (padrão H&M e dos
// escritórios: INC-, CA-, CAB-, CFTV-, ELE-, ILU-…) manda quando a disciplina
// está marcada no arquivo; depois a que a leitura do CAD deu; arquivo de uma
// disciplina só (ou do grupo rede/cabeamento) fica com ela. Caso real (DXF de
// incêndio + CFTV + cabeamento): "Sinalizador audiovisual" na layer INC-SIRENE
// vinha como alarme e sumia; a eletrocalha CAB- entrava em incêndio.
const PREFIXO_DISCIPLINA = [
  [/^(INC|SDAI|PCI|DETEC)\b/i, 'incendio'], [/^(CA|ACE|ACESSO)\b/i, 'controle_acesso'], [/^(CFTV|CAM)\b/i, 'cftv'],
  [/^(CAB|LOG|REDE|DADOS|TELECOM)\b/i, 'cabeamento'], [/^(TEL|INTERF)\b/i, 'telefonia'], [/^(ANT|TV|CATV)\b/i, 'antena'],
  [/^(ILU|ILUM|LUM)\b/i, 'iluminacao'], [/^(ALM|ALARME|INTRUS)\b/i, 'alarme'], [/^SPDA\b/i, 'spda'],
  [/^(AUT|BMS)\b/i, 'automacao'], [/^(ELE|ELET|E|FORCA|TOM)\b/i, 'eletrica'],
];
function disciplinaPeloPrefixo(texto, marcadas) {
  const t = String(texto || '').replace(/[-_.]/g, ' ').trim();
  const r = PREFIXO_DISCIPLINA.find(([re]) => re.test(t));
  return r ? doMesmoGrupo(marcadas, r[1]) : null;
}
const disciplinaUnica = (marcadas) => (marcadas.length && marcadas.every(d => doGrupo(marcadas[0]).includes(d)) ? marcadas[0] : null);
function disciplinaDoItemCad(it, marcadas) {
  const layers = String(it.layer || '').split(/,\s*/);
  for (const l of layers) { const d = disciplinaPeloPrefixo(l, marcadas); if (d) return d; }
  return disciplinaPeloPrefixo(it.bloco, marcadas)
    || (it.disciplina ? doMesmoGrupo(marcadas, it.disciplina) : null)
    || (it.disciplina ? null : disciplinaUnica(marcadas));
}

function regraDoSimbolo(it, marcadas, discItem) {
  const desc = semMarcador(it.descricao).replace(/^\d+\s+(?=[A-Za-zÀ-ú])/, '');
  const candidatas = SERVICO_DO_SIMBOLO.filter(([re, , d, reBloco]) => temDisciplina(marcadas, d)
    && (re.test(desc) || (reBloco && it.bloco && reBloco.test(it.bloco))));
  if (!candidatas.length) return null;
  if (discItem) {
    const daDisc = candidatas.find(([, , d]) => doGrupo(discItem).includes(d));
    if (daDisc) return [desc, daDisc];
    if (it._cad) return null; // bloco de outra disciplina: não cruza (câmera descrita como acionador)
  }
  return [desc, candidatas[0]];
}

// Contagem pelo desenho (DWG/DXF e PDF vetorial) por código de serviço:
// { [codigo]: { quantidade, blocos: [rótulos], metros? } }. O mesmo desenho em
// dois formatos conta uma vez (vale o DWG/DXF, como em semDuplicarFontes);
// desenhos diferentes somam. opcoes.gruposCompat: compatibilizacao.grupos.
function contagemDoDesenho(analises, vetoriais = [], opcoes = {}) {
  const entradas = [];
  analises.forEach((a, i) => {
    const marcadas = a.disciplinas || [];
    if (!marcadas.length) return;
    for (const p of vetoriais[i] || []) {
      const cad = p.origem === 'cad';
      const onde = cad ? `${p.pagina || 'DWG/DXF'} "${a.arquivo}"` : `PDF "${a.arquivo}" pág. ${p.pagina}`;
      for (const it of p.itens || []) {
        if (it.ambiguo) continue;
        if (it.tipo === 'simbolo') {
          const discItem = cad ? disciplinaDoItemCad(it, marcadas)
            : (() => { const s = detectarDisciplinas(it.descricao)[0]?.chave; return s ? doMesmoGrupo(marcadas, s) : null; })();
          if (cad && !discItem) continue;
          const achou = regraDoSimbolo({ ...it, _cad: cad }, marcadas, discItem);
          if (!achou) continue;
          const [desc, [, cod]] = achou;
          const codigo = typeof cod === 'function' ? cod(desc) : cod;
          const rotulo = cad ? `${onde}: bloco ${it.bloco} × ${it.quantidade}` : `${onde}: "${desc.slice(0, 50)}" × ${it.quantidade}`;
          entradas.push({ codigo, quantidade: Number(it.quantidade) || 0, fonte: cad ? 'cad' : 'pdf', arquivo: a.arquivo, rotulo });
        } else if (it.tipo === 'linha' && it.metros != null) {
          const disc = cad ? disciplinaDoItemCad(it, marcadas)
            : (() => { const s = detectarDisciplinas(it.descricao)[0]?.chave; return (s && doMesmoGrupo(marcadas, s)) || disciplinaUnica(marcadas); })();
          const codigo = disc && servicoDaLinha(disc, it);
          if (!codigo) continue;
          const rota = Number(it.rota_m ?? it.metros) || 0;
          entradas.push({ codigo, quantidade: rota, metros: true, fonte: cad ? 'cad' : 'pdf', arquivo: a.arquivo, rotulo: `${onde}: ${metrosBR(rota)}${it.layer ? ` (layer ${it.layer})` : ''}` });
        }
      }
    }
  });
  const mesmoDesenho = mesmoDesenhoFn(opcoes.gruposCompat);
  const cont = {};
  const porCodigo = new Map();
  entradas.forEach(e => (porCodigo.get(e.codigo) || porCodigo.set(e.codigo, []).get(e.codigo)).push(e));
  for (const [codigo, lista] of porCodigo) {
    const blocos = [];
    for (const e of lista) {
      const b = blocos.find(bl => bl.some(x => mesmoDesenho(x.arquivo, e.arquivo)));
      if (b) b.push(e); else blocos.push([e]);
    }
    const ficam = blocos.flatMap((b) => {
      const melhor = Math.max(...b.map(x => PESO_FONTE[x.fonte]));
      return b.filter(x => PESO_FONTE[x.fonte] === melhor);
    });
    const soma = ficam.reduce((s, x) => s + x.quantidade, 0);
    const metros = ficam.some(x => x.metros);
    cont[codigo] = {
      quantidade: metros ? Math.ceil(soma * SOBRA_ROTA) : soma,
      blocos: ficam.map(x => x.rotulo),
      ...(metros ? { metros: Math.round(soma * 10) / 10 } : {}),
      fora: lista.length - ficam.length,
    };
  }
  return cont;
}
// nome antigo (só DWG/DXF): mantido para quem já importa
const contagemDoCad = contagemDoDesenho;

function montarServicosPadrao(analises, disciplinasEfetivas, precosReferencia = {}, referencias = {}, cad = {}) {
  const codificados = totaisCodificados(analises);
  // sem código de texto (CAMx/Rx/Ax), vale a contagem dos blocos do DWG/DXF
  const totalCameras = codificados.cameras || cad.cftv_ponto?.quantidade || 0;
  const totalRede = codificados.rede || cad.rede_ponto?.quantidade || 0;
  const totalAntena = codificados.antena || cad.antena_ponto?.quantidade || 0;
  const circuitos = circuitosDosQuadros(analises);
  const quadros = analises.filter(a => a.disciplinas.some(d => d.startsWith('eletrica'))).reduce((s, a) => s + quadrosDoArquivo(a), 0);
  const SEM_CODIGO = 'Símbolo gráfico no desenho, sem código de texto individual — confirme a quantidade direto na planta antes de fechar.';
  const SEM_ROTA = 'Metros de rota: sem trecho medido no desenho desta disciplina — confirme na planta.';

  // valor_unitario começa em 0 (editável na tela) — não é preenchido
  // automaticamente com a referência de mercado (valor_referencia_mercado,
  // abaixo), mesmo quando existe uma: é só uma SUGESTÃO exibida ao lado do
  // campo na tela (ver services/precosMaoDeObraReferencia.js), que o usuário
  // aceita clicando ou ignora. Preencher sozinho marcaria o item como
  // "confirmado" no orçamento gerado (ver gerarOrcamento em
  // controllers/projetos/orcamento.js) — errado pra um preço que ainda não foi validado
  // por ninguém.
  // `codigo` vai junto até a proposta (proposta_itens.codigo): sem ele o item
  // perdia o vínculo com a tabela de preços de referência de mão de obra
  const item = (codigo, descricao, quantidade0, unidade, disciplina, observacao0) => {
    // item sem quantidade pelo texto: a contagem do desenho (DWG/DXF ou PDF) preenche
    const doCad = !quantidade0 && cad[codigo]?.quantidade > 0 && cad[codigo];
    const quantidade = doCad ? doCad.quantidade : quantidade0;
    const observacao = doCad
      ? (doCad.metros != null
        ? `Quantidade = rota medida no desenho (${doCad.blocos.join('; ')}) = ${metrosBR(doCad.metros)} × ${String(SOBRA_ROTA).replace('.', ',')}${doCad.descidas_m ? ` + descidas ${metrosBR(doCad.descidas_m)}` : ''} — conferir na planta.`
        : `Quantidade = contagem no desenho (${doCad.blocos.join('; ')}) — conferir na planta.`)
        + (doCad.fora ? ` O mesmo desenho veio em outro formato: ${doCad.fora} contagem(ns) não somada(s).` : '')
      : observacao0;
    return itemServico(codigo, descricao, quantidade, unidade, disciplina, observacao);
  };
  const itemServico = (codigo, descricao, quantidade, unidade, disciplina, observacao) => ({
    codigo, descricao, quantidade, unidade, valor_unitario: 0,
    valor_referencia_mercado: precosReferencia[codigo] ?? null,
    // referências de mercado dos dois segmentos (oficial/governo e particular) para a tela
    referencias_mercado: referencias[codigo] && (referencias[codigo].publico != null || referencias[codigo].privado != null)
      ? { publico: referencias[codigo].publico, privado: referencias[codigo].privado } : null,
    subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
  });

  const todos = [
    // Redes de Computadores (dados)
    item('rede_ponto', 'Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', codificados.rede, 'pt', 'rede',
      codificados.rede > 0 ? 'Quantidade = total de códigos de ponto de rede (Rx) encontrados no desenho.' : SEM_CODIGO),
    item('rede_switch', 'Instalação e config. de switches', 0, 'un', 'rede', SEM_CODIGO),
    item('rede_ap', 'Instalação e config. de access points (Wi-Fi)', 0, 'un', 'rede', SEM_CODIGO),

    // CFTV
    item('cftv_ponto', 'Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', codificados.cameras, 'pt', 'cftv',
      codificados.cameras > 0 ? 'Quantidade = total de códigos de câmera (CAMx) encontrados no desenho. Confira duplicatas/numeração antes de fechar (veja Compatibilização).' : SEM_CODIGO),
    item('cftv_camera_interna', 'Instalação/config. de câmera interna (dome)', 0, 'un', 'cftv',
      totalCameras > 0 ? `Total de câmeras no desenho: ${totalCameras} — divida entre interna/externa aqui.` : SEM_CODIGO),
    item('cftv_camera_externa', 'Instalação/config. de câmera externa (bullet)', 0, 'un', 'cftv', SEM_CODIGO),

    // Antena/TV
    item('antena_ponto', 'Conectorização de ponto de TV/antena (conector coaxial RG-6)', codificados.antena, 'pt', 'antena',
      codificados.antena > 0 ? 'Quantidade = total de códigos de ponto de antena/TV (Ax) encontrados no desenho.' : SEM_CODIGO),

    // Infraestrutura de Cabeamento Estruturado (compartilhada por rede/CFTV/telefonia)
    item('cab_racks', 'Montagem e organização dos racks (patch panels, guias, PDU)', 0, 'un', 'cabeamento', 'Confirme quantos racks o projeto prevê.'),
    item('cab_nobreak', 'Instalação de nobreaks + kit de ventilação', 0, 'un', 'cabeamento', SEM_CODIGO),
    // Este item de cabeamento CONTA pontos de rede + câmeras — só faz sentido
    // quando rede ou CFTV também foram escolhidos. Se nenhuma das duas está na
    // análise, ele não entra (evita trazer um item que depende de disciplina
    // não selecionada). Só disciplinas estritamente escolhidas.
    ...((temDisciplina(disciplinasEfetivas, 'rede') || disciplinasEfetivas.includes('cftv'))
      ? [item('cab_certificacao', 'Certificação e etiquetagem dos pontos (rede + câmeras)', totalRede + totalCameras, 'pt', 'cabeamento',
          (totalRede > 0 || totalCameras > 0) ? 'Quantidade = pontos de rede + câmeras encontrados no desenho.' : SEM_CODIGO)]
      : []),
    item('cab_passagem', 'Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb', 'cabeamento',
      'Marque como "já pronto" se o cabeamento já estiver passado no local (não entra na mão de obra).'),

    // Telefonia
    item('tel_ponto', 'Conectorização de ponto de telefonia (RJ-11/RJ-45 + teste)', 0, 'pt', 'telefonia', SEM_CODIGO),
    item('tel_central', 'Instalação de central telefônica / PABX', 0, 'un', 'telefonia', SEM_CODIGO),

    // Elétrica — categorias na mesma nomenclatura de uma legenda real de
    // projeto (tomada baixa/média/alta/emergência por altura de instalação,
    // ponto de energia teto/piso) — lista pra cobrir um orçamento de elétrica
    // do zero, mesmo sem contagem automática (ver nota acima).
    item('ele_qdg', 'Instalação de quadro de distribuição geral (QDG)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_qd_setorial', 'Instalação de quadros de distribuição setoriais/por pavimento', quadros, 'un', 'eletrica',
      quadros > 0 ? `Quantidade = quadros de carga encontrados nos arquivos de elétrica (${quadros}).` : SEM_CODIGO),
    item('ele_disjuntores', 'Instalação de disjuntores (termomagnéticos/DR)', circuitos > 0 ? circuitos + quadros : 0, 'un', 'eletrica',
      circuitos > 0 ? `Quantidade = ${circuitos} circuitos dos quadros de carga + ${quadros} disjuntor(es) geral(is).` : SEM_CODIGO),
    item('ele_eletrodutos', 'Passagem de eletrodutos e fiação (circuitos de tomada/força)', 1, 'vb', 'eletrica',
      'Marque como "já pronto" se a infraestrutura elétrica já estiver executada.'),
    item('ele_tomada_baixa', 'Instalação de tomada baixa (30/60cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_media', 'Instalação de tomada média (110/140cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_alta', 'Instalação de tomada alta (180cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_emergencia', 'Instalação de tomada de emergência (baixa/média/alta)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_interruptor', 'Instalação de interruptor simples/paralelo', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_ponto_energia', 'Instalação de ponto de energia (teto/piso)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_aterramento', 'Aterramento (malha/SPDA)', 0, 'vb', 'eletrica', SEM_CODIGO),

    // Iluminação
    item('ilum_luminaria_embutir', 'Instalação de luminária de embutir', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_luminaria_sobrepor', 'Instalação de luminária de sobrepor', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_perfil_led', 'Instalação de perfil LED linear (embutir/sobrepor/marcenaria)', 0, 'm', 'iluminacao', SEM_CODIGO),
    item('ilum_interruptor_dimmer', 'Instalação de interruptor/dimmer de iluminação', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_luminaria_pendente', 'Instalação de luminária pendente (com suspensão)', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_sensor_presenca', 'Instalação e ajuste de sensor de presença', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_infraestrutura', 'Eletrodutos e fiação dos circuitos de iluminação', 0, 'm', 'iluminacao', SEM_ROTA),

    // Automação
    item('auto_central', 'Instalação e configuração de central de automação', 0, 'un', 'automacao', SEM_CODIGO),
    item('auto_atuadores', 'Instalação de atuadores/módulos de automação (tomadas, cortinas, cenas)', 0, 'un', 'automacao', SEM_CODIGO),
    item('auto_sensor', 'Automação: instalação de sensor/termostato de ambiente', 0, 'un', 'automacao', SEM_CODIGO),
    item('auto_quadro', 'Automação: montagem e instalação de quadro de automação', 0, 'un', 'automacao', SEM_CODIGO),

    // Alarme
    item('alarme_sensor_abertura', 'Instalação de sensor de abertura (magnético) porta/janela', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_ivp', 'Instalação de sensor infravermelho passivo (IVP)', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_barreira', 'Instalação e alinhamento de barreira infravermelha ativa (par TX + RX)', 0, 'par', 'alarme', SEM_CODIGO),
    item('alarme_sirene', 'Instalação de sirene', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_teclado', 'Instalação de teclado de comando', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_repetidor', 'Instalação de repetidor de sinal', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_central', 'Instalação e configuração da central de alarme', 0, 'un', 'alarme', 'Normalmente 1 unidade — confirme.'),
    item('alarme_infra', 'Alarme: infraestrutura e lançamento de cabos', 0, 'm', 'alarme', SEM_ROTA),

    // Incêndio — detecção e alarme (NBR 17240) e iluminação de emergência (NBR 10898)
    item('inc_dispositivo', 'Incêndio: instalação de detector, acionador ou avisador', 0, 'un', 'incendio', SEM_CODIGO),
    item('inc_central', 'Incêndio: instalação, programação e endereçamento da central', 0, 'un', 'incendio', 'Normalmente 1 unidade — confirme.'),
    item('inc_ilum_emergencia', 'Incêndio: instalação de luminária/sinalização de emergência', 0, 'un', 'incendio', SEM_CODIGO),
    item('inc_infra', 'Incêndio: infraestrutura e lançamento de cabos do alarme', 0, 'm', 'incendio', SEM_ROTA),
    item('inc_comissionamento', 'Incêndio: comissionamento, testes e treinamento', 1, 'vb', 'incendio', 'Verba — marque como "já pronto" se não fizer parte do escopo.'),

    // Controle de acesso
    item('ace_leitor', 'Controle de acesso: instalação e configuração de leitor (cartão, biometria ou facial)', 0, 'un', 'controle_acesso', SEM_CODIGO),
    item('ace_fechadura', 'Controle de acesso: instalação de fechadura eletromagnética/fecho elétrico/solenoide com suporte', 0, 'un', 'controle_acesso', SEM_CODIGO),
    item('ace_botoeira', 'Controle de acesso: instalação de botoeira de saída, acionador de emergência ou sensor de porta', 0, 'un', 'controle_acesso', SEM_CODIGO),
    item('ace_controladora', 'Controle de acesso: instalação de controladora com fonte, bateria e gabinete', 0, 'un', 'controle_acesso', SEM_CODIGO),
    item('ace_catraca', 'Controle de acesso: instalação e configuração de catraca ou cancela', 0, 'un', 'controle_acesso', SEM_CODIGO),
    item('ace_infra', 'Controle de acesso: infraestrutura e lançamento de cabos (por metro de rota)', 0, 'm', 'controle_acesso', SEM_ROTA),
    item('ace_programacao', 'Controle de acesso: programação do software, cadastro de usuários, níveis de acesso e integrações', 1, 'vb', 'controle_acesso', 'Verba — ajuste ao porte do sistema.'),
    item('ace_comissionamento', 'Controle de acesso: comissionamento por porta (incêndio, falta de energia, emergência), testes e treinamento', 1, 'vb', 'controle_acesso', 'Verba — ajuste ao número de portas.'),

    // SPDA (NBR 5419)
    item('spda_malha', 'SPDA: instalação da malha de captação (condutor, suportes e conexões)', 0, 'm', 'spda', SEM_ROTA),
    item('spda_descida', 'SPDA: instalação de descida não natural com fixadores e terminal de ensaio', 0, 'm', 'spda', SEM_ROTA),
    item('spda_anel', 'SPDA: anel de aterramento (vala, lançamento e conexões)', 0, 'm', 'spda', SEM_ROTA),
    item('spda_hastes_caixas', 'SPDA: cravação de haste e instalação de caixa de inspeção', 0, 'un', 'spda', SEM_CODIGO),
    item('spda_dps', 'SPDA: instalação de DPS', 0, 'un', 'spda', SEM_CODIGO),
    item('spda_bep', 'SPDA: instalação do BEP e ligações equipotenciais', 1, 'vb', 'spda', 'Verba — confirme no projeto.'),

    // Telefonia/interfonia
    item('tel_terminal', 'Telefonia/interfonia: instalação de terminal (interfone/telefone) na unidade ou área comum, com teste', 0, 'un', 'telefonia', SEM_CODIGO),
    item('tel_infra', 'Telefonia/interfonia: infraestrutura (prumada, eletrodutos e caixas)', 0, 'm', 'telefonia', SEM_ROTA),

    // Recarga de VE, solar, pressurização, hospitalar, industrial e média tensão
    item('ve_instalacao_carregador', 'Recarga VE: instalação, configuração e comissionamento da estação', 0, 'un', 'carregador', SEM_CODIGO),
    item('ve_infraestrutura', 'Recarga VE: infraestrutura e lançamento de cabos até o ponto', 0, 'm', 'carregador', SEM_ROTA),
    item('sol_modulo', 'Solar: montagem de módulo fotovoltaico na estrutura', 0, 'un', 'solar', SEM_CODIGO),
    item('sol_inversor', 'Solar: instalação e configuração do inversor', 0, 'un', 'solar', SEM_CODIGO),
    item('pres_ventilador', 'Pressurização: instalação do conjunto motoventilador (base, junta flexível, alinhamento e ligação)', 0, 'un', 'pressurizacao', SEM_CODIGO),
    item('pres_damper', 'Pressurização: instalação de damper de alívio ou registro de retenção', 0, 'un', 'pressurizacao', SEM_CODIGO),
    item('pres_grelha', 'Pressurização: instalação e balanceamento de grelha de insuflação / veneziana de tomada de ar', 0, 'un', 'pressurizacao', SEM_CODIGO),
    item('pres_sensores', 'Pressurização: instalação de transmissor de pressão diferencial ou pressostato de fluxo', 0, 'un', 'pressurizacao', SEM_CODIGO),
    item('pres_painel', 'Pressurização: montagem e instalação do painel de comando (inversor/soft-starter, controlador e sinalização)', 0, 'un', 'pressurizacao', SEM_CODIGO),
    item('pres_infra', 'Pressurização: infraestrutura em eletroduto de aço galvanizado', 0, 'm', 'pressurizacao', SEM_ROTA),
    item('hosp_painel_it', 'Elétrica hospitalar: montagem e instalação de painel IT médico (QDIT com transformador de separação)', 0, 'un', 'eletrica_hospitalar', SEM_CODIGO),
    item('hosp_dsi', 'Elétrica hospitalar: instalação e parametrização de DSI e painel de alarme', 0, 'un', 'eletrica_hospitalar', SEM_CODIGO),
    item('hosp_tomada_it', 'Elétrica hospitalar: instalação de tomada do IT médico com identificação permanente', 0, 'un', 'eletrica_hospitalar', SEM_CODIGO),
    item('hosp_equipotencializacao', 'Elétrica hospitalar: equipotencialização suplementar por local (BEL e ligações)', 0, 'un', 'eletrica_hospitalar', SEM_CODIGO),
    item('ind_ccm_montagem', 'Industrial: montagem e instalação de QGBT/CCM/quadro', 0, 'un', 'eletrica_industrial', SEM_CODIGO),
    item('ind_banco_capacitores', 'Industrial: instalação e ajuste do banco de capacitores com controlador', 0, 'un', 'eletrica_industrial', SEM_CODIGO),
    item('ind_eletrocalha', 'Industrial: instalação de eletrocalha/leito com suportes e acessórios', 0, 'm', 'eletrica_industrial', SEM_ROTA),
    item('mt_transformador', 'MT: içamento, posicionamento e ligação do transformador', 0, 'un', 'media_tensao', SEM_CODIGO),
    item('mt_terminacao', 'MT: terminação (mufla) de MT', 0, 'un', 'media_tensao', SEM_CODIGO),
    item('mt_hastes', 'MT: haste e caixa de inspeção da malha', 0, 'un', 'media_tensao', SEM_CODIGO),
    item('mt_infra_subterranea', 'MT: infraestrutura do ramal subterrâneo de MT', 0, 'm', 'media_tensao', SEM_ROTA),
  ];

  // símbolo contado que não é serviço (tomada sem altura, ponto de luz): nota no item
  const final = naDisciplinaMarcada(todos, disciplinasEfetivas);
  for (const [chave, nota] of Object.entries(NOTA_DO_DESENHO)) {
    const c = cad[chave];
    if (!c?.quantidade) continue;
    const alvo = nota.itens.map(cod => final.find(x => x.codigo === cod)).find(Boolean);
    if (alvo) alvo.observacao = `${alvo.observacao} ${nota.texto(c.quantidade, c.blocos.join('; '))}`;
  }
  return final;
}

// Lista padrão de material de instalação (Bloco 2 nos orçamentos de
// referência) — itens de terminação/fixação que não vêm de nenhuma cotação
// de fornecedor, calculados a partir dos pontos do projeto (câmeras, rede e
// antena/TV, quando o desenho tem código individual para eles, somados só
// dos arquivos marcados com a disciplina certa). Cada item também carrega a
// disciplina, pro mesmo filtro usado em montarServicosPadrao.
const RESERVA_PLUG_RJ45 = 0.2;
const RESERVA_PLUG_MIN = 2;
const reservaPlugs = (n) => Math.max(RESERVA_PLUG_MIN, Math.ceil(n * RESERVA_PLUG_RJ45));

// cad: contagemDoDesenho — sem código de texto (CAMx/Rx/Ax), vale a contagem do desenho
function montarMateriaisInstalacaoPadrao(analises, disciplinasEfetivas, cad = {}) {
  const codificados = totaisCodificados(analises);
  const totalCameras = codificados.cameras || cad.cftv_ponto?.quantidade || 0;
  const totalRede = codificados.rede || cad.rede_ponto?.quantidade || 0;
  const totalAntena = codificados.antena || cad.antena_ponto?.quantidade || 0;

  const item = (descricao, quantidade, unidade, disciplina, observacao) => ({
    descricao, quantidade, unidade, subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
    referencia_fabricante: null, preco_catalogo: null, material_id: null, confianca_catalogo: null, descricao_catalogo: null,
  });

  const todos = [
    item('Keystone/jack RJ-45 Cat.6 (lado usuário — pontos de rede)', totalRede, 'un', 'rede',
      totalRede > 0 ? `Quantidade = pontos de rede encontrados no desenho (${totalRede}).` : 'Quantidade = nº de pontos de rede.'),
    item('Espelho/placa 4x2 + suporte (pontos de rede)', totalRede, 'un', 'rede',
      totalRede > 0 ? `Quantidade = pontos de rede encontrados no desenho (${totalRede}).` : 'Quantidade = nº de pontos de rede.'),
    item('Tomada coaxial RG-6 + conector (TV/antena)', totalAntena, 'un', 'antena',
      totalAntena > 0 ? `Quantidade = pontos de antena/TV encontrados no desenho (${totalAntena}).` : 'Quantidade = nº de pontos de TV/antena.'),
    // reserva em percentual (perda na crimpagem/reteste): "+24" fixo dava 26 plugs para 2 câmeras
    item('Plug RJ-45 Cat.6 (terminação de câmeras) + reserva', totalCameras > 0 ? totalCameras + reservaPlugs(totalCameras) : 0, 'un', 'cftv',
      totalCameras > 0 ? `Quantidade = câmeras (${totalCameras}) + reserva de ${RESERVA_PLUG_RJ45 * 100} % (${reservaPlugs(totalCameras)}, mínimo ${RESERVA_PLUG_MIN}) — adotado, ajuste conforme necessário.` : 'Quantidade = nº de câmeras + reserva.'),
    item('Suporte/braço de fixação p/ câmera externa (bullet)', 0, 'un', 'cftv', 'Quantidade = nº de câmeras externas (bullet).'),
    item('Identificação (etiquetas/anilhas), abraçadeiras, parafusos e miudezas', 1, 'vb', 'cabeamento', 'Verba — ajuste conforme o porte do projeto.'),

    // Elétrica
    item('Disjuntor termomagnético (conforme quadro de cargas)', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade e amperagem direto na planta/memorial.'),
    item('Quadro de distribuição (padrão modular, nº de polos a definir)', 0, 'un', 'eletrica', 'Confirme quantidade e nº de polos direto no memorial elétrico.'),
    item('Tomada 2P+T 10A/20A', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Interruptor simples/paralelo', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Cabo elétrico flexível 750V (conforme bitola do projeto)', 0, 'm', 'eletrica', 'Quantidade depende do quadro de cargas/memorial — confirme antes de fechar.'),
    item('Eletroduto PVC (rígido ou corrugado, conforme projeto)', 0, 'm', 'eletrica', 'Quantidade depende do memorial elétrico — confirme antes de fechar.'),

    // Iluminação
    item('Luminária LED de embutir', 0, 'un', 'iluminacao', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Luminária LED de sobrepor', 0, 'un', 'iluminacao', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Perfil LED linear (embutir/sobrepor/marcenaria)', 0, 'm', 'iluminacao', 'Quantidade em metros lineares — confirme direto na planta.'),
  ];

  return naDisciplinaMarcada(todos, disciplinasEfetivas);
}

// Monta a lista final de materiais pra revisão: um item por equipamento
// encontrado, com preço sugerido do catálogo quando há correspondência
// razoável — nunca preenche preço "no chute" quando não achou nada parecido.

function montarMateriais(equipamentos, catalogo) {
  return equipamentos.map(eq => {
    const correspondencia = compararComCatalogo(eq.descricao, catalogo);
    return {
      descricao: eq.descricao,
      referencia_fabricante: eq.referencia_fabricante || null,
      quantidade: 1,
      unidade: correspondencia?.unidade_catalogo || 'un',
      subgrupo: 'Material e Equipamentos',
      pronto: false,
      preco_catalogo: correspondencia?.preco_catalogo ?? null,
      material_id: correspondencia?.material_id ?? null,
      confianca_catalogo: correspondencia?.confianca ?? null,
      descricao_catalogo: correspondencia?.descricao_catalogo ?? null,
    };
  });
}

// Junta a distribuição aproximada de pontos por ambiente (ver
// pontosPorAmbiente.js) de todos os arquivos, zerando os tipos de ponto que
// não são da disciplina daquele arquivo (mesmo cuidado de somarPorDisciplina
// — um arquivo de iluminação não pode contribuir "câmeras" mesmo se algum
// texto batesse por coincidência com o regex de CAMx) e somando por nome de
// ambiente entre arquivos da mesma disciplina (ex.: CFTV 1 + CFTV 2 somam
// câmeras no mesmo ambiente). Só entram ambientes com pelo menos 1 ponto.
function montarPontosPorAmbiente(arquivos, analises, brutosPorArquivo) {
  const porAmbiente = new Map();

  brutosPorArquivo.forEach((linhas, i) => {
    const disciplinas = analises[i].disciplinas;
    for (const linha of linhas) {
      const atual = porAmbiente.get(linha.ambiente) || { ambiente: linha.ambiente, cftv: 0, rede: 0, antena: 0 };
      if (disciplinas.includes('cftv')) atual.cftv += linha.cftv;
      if (temDisciplina(disciplinas, 'rede')) atual.rede += linha.rede;
      if (disciplinas.includes('antena')) atual.antena += linha.antena;
      porAmbiente.set(linha.ambiente, atual);
    }
  });

  return [...porAmbiente.values()]
    .map(a => ({ ...a, total: a.cftv + a.rede + a.antena }))
    .filter(a => a.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Transforma os itens da tabela quantitativa genérica (extrairTabelaQuantitativa
// em projetoParser.js — padrão "CÓDIGO - descrição - N unidade(s);", achado de
// verdade num projeto real na seção de portas/janelas) em linhas de material,
// com a disciplina do próprio arquivo de origem e a quantidade REAL lida do
// texto (não um placeholder em 0). Diferente dos itens-modelo acima, esses só
// aparecem quando o padrão realmente existe no arquivo — não force a barra
// quando o desenho não traz esse tipo de tabela.
function montarMateriaisQuantitativos(analises) {
  const materiais = [];
  for (const a of analises) {
    const disciplinaPrincipal = a.disciplinas[0];
    if (!disciplinaPrincipal) continue;
    for (const it of a.tabelaQuantitativa) {
      materiais.push({
        descricao: `${it.codigo} - ${it.descricao}`,
        referencia_fabricante: null,
        quantidade: it.quantidade,
        unidade: 'un',
        subgrupo: nomeDaDisciplina(disciplinaPrincipal),
        disciplina: disciplinaPrincipal,
        pronto: false,
        preco_catalogo: null,
        material_id: null,
        confianca_catalogo: null,
        descricao_catalogo: null,
        observacao: `Quantidade extraída automaticamente do texto de "${a.arquivo}" (tabela quantitativa do próprio desenho).`,
        _arquivo: a.arquivo, // semDuplicarFontes
      });
    }
  }
  return materiais;
}

// Listas de materiais lidas do texto do PDF (ver leitoresTabelaProjeto.js):
// quantidade e unidade REAIS, cada item na disciplina indicada pela própria
// descrição (um memorial de cotação traz vários sistemas juntos). Item de
// disciplina que não foi marcada no arquivo fica de fora, com aviso — mesma
// regra de não contaminar uma disciplina com outra.
function montarMateriaisDaLista(analises, catalogo, achados) {
  const materiais = [];
  const foraDaSelecao = new Map();
  for (const a of analises) {
    if (!a.listaMateriais?.length || !a.disciplinas.length) continue;
    for (const it of a.listaMateriais) {
      // título da seção do memorial primeiro; depois a própria descrição
      const sugerida = it.disciplinaSecao || detectarDisciplinas(it.descricao)[0]?.chave;
      const disciplina = sugerida && a.disciplinas.includes(sugerida) ? sugerida
        : (sugerida && !a.disciplinas.includes(sugerida) ? null : a.disciplinas[0]);
      if (!disciplina) { foraDaSelecao.set(sugerida, (foraDaSelecao.get(sugerida) || 0) + 1); continue; }
      const descricao = [it.descricao, it.fabricante && `${it.fabricante} ${it.modelo}`.trim()].filter(Boolean).join(' — ');
      const corr = compararComCatalogo(descricao, catalogo);
      materiais.push({
        descricao,
        referencia_fabricante: it.modelo || null,
        quantidade: it.qtd,
        unidade: it.unidade || corr?.unidade_catalogo || 'un',
        subgrupo: nomeDaDisciplina(disciplina),
        disciplina,
        pronto: false,
        preco_catalogo: corr?.preco_catalogo ?? null,
        material_id: corr?.material_id ?? null,
        confianca_catalogo: corr?.confianca ?? null,
        descricao_catalogo: corr?.descricao_catalogo ?? null,
        observacao: `Lista de materiais do próprio projeto ("${a.arquivo}"${it.item ? `, item ${it.item}` : it.tag ? `, TAG ${it.tag}` : ''}).`,
        _fonte: 'lista', _arquivo: a.arquivo, // semDuplicarFontes
      });
    }
  }
  if (foraDaSelecao.size) {
    achados.push({
      tema: 'Itens de outras disciplinas na lista de materiais',
      observacao: `A lista de materiais traz itens de ${[...foraDaSelecao].map(([d, n]) => `${nomeDaDisciplina(d)} (${n})`).join(', ')}, que não foram marcadas para o arquivo e ficaram de fora. Marque essas disciplinas e analise de novo se forem fazer parte do orçamento.`,
    });
  }
  return materiais;
}

// Contagem pelo DESENHO (PDF vetorial, ver pdfVetorial.js): símbolos e linhas
// identificados pela legenda da própria prancha. Vira material só em arquivo
// SEM lista de materiais (a lista do projeto manda) e só item não ambíguo;
// a disciplina sai da descrição da legenda (fica de fora a que não foi marcada).
const semMarcador = (s) => String(s).replace(/^[-–•\s]+/, '');
const metrosBR = (m) => `${String(m).replace('.', ',')} m`;

const ORIGEM_DESCRICAO = { legenda: 'descrição da legenda da prancha', atributo: 'descrição do atributo do bloco', sigla: 'sigla do bloco — confirmar o tipo', nome: 'nome do bloco' };
// "rede" e "cabeamento" são a mesma skill: bloco de rede vale para arquivo marcado com qualquer das duas
function doMesmoGrupo(marcadas, sugerida) {
  return doGrupo(sugerida).find(x => marcadas.includes(x)) || null;
}

function montarMateriaisDoDesenho(analises, vetoriais, catalogo) {
  const materiais = [];
  analises.forEach((a, i) => {
    if (a.listaMateriais?.length || !a.disciplinas.length) return;
    for (const pag of vetoriais[i] || []) {
      for (const it of pag.itens) {
        if (it.ambiguo || (it.tipo === 'linha' && it.metros == null)) continue;
        // CAD: a disciplina vem do bloco/layer (services/analiseCad/index.js); PDF: da descrição da legenda
        // CAD: prefixo da layer/bloco, depois a disciplina do bloco (disciplinaDoItemCad); PDF: a descrição da legenda
        const sugerida = pag.origem === 'cad' ? it.disciplina : detectarDisciplinas(it.descricao)[0]?.chave;
        const disciplina = pag.origem === 'cad'
          ? (disciplinaDoItemCad(it, a.disciplinas) || (sugerida ? null : a.disciplinas[0]))
          : (sugerida ? doMesmoGrupo(a.disciplinas, sugerida) : a.disciplinas[0]);
        if (!disciplina) continue;
        const descricao = semMarcador(it.descricao).slice(0, 240);
        const corr = compararComCatalogo(descricao, catalogo);
        materiais.push({
          descricao,
          referencia_fabricante: null,
          // linha: + 10 % de sobra (curvas, descidas e subidas que a planta não mostra)
          quantidade: it.tipo === 'simbolo' ? it.quantidade : Math.ceil(it.metros * 1.1),
          unidade: it.tipo === 'simbolo' ? (corr?.unidade_catalogo || 'un') : 'm',
          subgrupo: nomeDaDisciplina(disciplina),
          disciplina,
          pronto: false,
          preco_catalogo: corr?.preco_catalogo ?? null,
          material_id: corr?.material_id ?? null,
          confianca_catalogo: corr?.confianca ?? null,
          descricao_catalogo: corr?.descricao_catalogo ?? null,
          observacao: pag.origem === 'cad'
            ? (it.tipo === 'simbolo'
              ? `Contado no ${pag.pagina} "${a.arquivo}": bloco "${it.bloco}" × ${it.quantidade} (${ORIGEM_DESCRICAO[it.origemDescricao] || 'descrição a conferir'}) — conferir.`
              : `Medido no ${pag.pagina} "${a.arquivo}": ${metrosBR(it.metros)} na layer "${it.layer}" + 10 % de sobra — conferir.`)
            : it.tipo === 'simbolo'
              ? `Contado no desenho de "${a.arquivo}" (pág. ${pag.pagina}): símbolo da legenda × ${it.quantidade} — conferir na planta.`
              : `Medido no desenho de "${a.arquivo}" (pág. ${pag.pagina}): ${metrosBR(it.metros)} na escala 1:${pag.escala} + 10 % de sobra — conferir.`,
          _fonte: pag.origem === 'cad' ? 'cad' : 'pdf', _arquivo: a.arquivo, // semDuplicarFontes
        });
      }
    }
  });
  return materiais;
}

// ── O mesmo item vindo de arquivos diferentes ─────────────────────────────
// O projeto chega em PDF (com lista de materiais) E em DWG/DXF: a tomada da
// lista e a mesma tomada contada nos blocos do desenho entravam as duas (teste
// de 28/10/2026: "Tomada 2P+T 10 A" da lista + "Tomada 2P+T — bloco TUG × 6").
// Por disciplina e TIPO de item, vale uma fonte só, nesta ordem: DWG/DXF
// (blocos contados) > lista/tabela do PDF > contagem pelo desenho do PDF.
// Um item da lista e um do DWG do mesmo tipo: fica a descrição da lista (mais
// completa, com "10 A") e a quantidade do DWG.
const TIPOS_DE_ITEM = [
  // ponto de rede/TV antes de tomada: "tomada de rede" é ponto de rede
  ['ponto_rede', /ponto de rede|\brj-?45\b|tomada de rede|tomada l[óo]gica/i], ['ponto_tv', /ponto de tv|coaxial|tomada de tv/i],
  ['tomada', /\btomada/i], ['interruptor', /interruptor|\bdimmer/i], ['luminaria', /lumin[áa]ria|plafon|arandela|\bspot\b|downlight|pendente/i],
  ['eletroduto', /eletroduto/i], ['eletrocalha', /eletrocalha/i], ['perfilado', /perfilado/i], ['leito', /leito para cabo|leito\b/i],
  ['quadro', /^quadro|quadro de distribui/i], ['camera', /c[âa]mera/i], ['detector', /detector/i], ['acionador', /acionador/i],
  ['avisador', /avisador|sirene/i],
];
const tipoDoItem = (descricao) => TIPOS_DE_ITEM.find(([, re]) => re.test(descricao || ''))?.[0] || null;
const PESO_FONTE = { cad: 3, lista: 2, pdf: 1 };
const ROTULO_FONTE = { cad: 'DWG/DXF', lista: 'lista de materiais do PDF', pdf: 'contagem pelo desenho do PDF' };

// Só é "o mesmo item" quando as fontes são do MESMO desenho/pavimento: mesmo
// nome-base de prancha (sem extensão, revisão "R04"/"REV 04" e cópia "(1)") ou
// desenhos que a compatibilização alinhou pelos ambientes (mesmo grupo). Antes
// a chave era só disciplina|tipo: térreo em DWG (40 tomadas) + superior em PDF
// (35) ficava 40 (revisão de 29/10/2026). Fonte sem arquivo conhecido (lista
// de equipamentos lida pela IA) vale como do mesmo desenho — regra antiga.
function nomeBasePrancha(arquivo) {
  const s = ` ${chaveNome(String(arquivo || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/\s*\(\d+\)\s*$/, ''))} `;
  return s.replace(/ (REVISAO|REV|R) ?\d{1,3}(?= )/g, ' ').replace(/\s+/g, ' ').trim();
}
function mesmoDesenhoFn(gruposCompat = []) {
  const grupoDe = new Map();
  (gruposCompat || []).forEach((g, gi) => (g.membros || []).forEach(m => grupoDe.set(m.arquivo, gi)));
  return (a, b) => !a || !b || a === b || nomeBasePrancha(a) === nomeBasePrancha(b)
    || (grupoDe.has(a) && grupoDe.get(a) === grupoDe.get(b));
}

// opcoes.gruposCompat: compatibilizacao.grupos (services/compatibilizacaoAnalise.js)
function semDuplicarFontes(materiais, achados, opcoes = {}) {
  const mesmoDesenho = mesmoDesenhoFn(opcoes.gruposCompat);
  const grupos = new Map();
  materiais.forEach((m, i) => {
    const tipo = m._fonte && tipoDoItem(m.descricao);
    if (!tipo) return;
    const k = `${m.disciplina}|${tipo}`;
    (grupos.get(k) || grupos.set(k, []).get(k)).push(i);
  });
  const fora = new Set();
  const resumo = [];
  const somados = [];
  // separa cada grupo disciplina|tipo por desenho: dentro do desenho vale uma fonte; entre desenhos, soma
  const porDesenho = new Map();
  for (const [k, idx] of grupos) {
    const blocos = [];
    for (const i of idx.filter(j => materiais[j]._arquivo)) {
      const b = blocos.find(bl => bl.some(j => mesmoDesenho(materiais[j]._arquivo, materiais[i]._arquivo)));
      if (b) b.push(i); else blocos.push([i]);
    }
    const semArquivo = idx.filter(j => !materiais[j]._arquivo);
    if (semArquivo.length) (blocos[0] || (blocos[0] = [])).push(...semArquivo);
    blocos.forEach((b, n) => porDesenho.set(`${k}#${n}`, b));
    const fontesDoGrupo = new Set(idx.map(i => materiais[i]._fonte));
    if (blocos.length > 1 && fontesDoGrupo.size > 1) {
      const [disc, tipo] = k.split('|');
      const arqs = [...new Set(idx.map(i => materiais[i]._arquivo).filter(Boolean))];
      somados.push(`${nomeDaDisciplina(disc)} — ${tipo.replace('_', ' ')}: ${arqs.map(a => `"${a}"`).join(' + ')}`);
    }
  }
  for (const [kd, idx] of porDesenho) {
    const k = kd.replace(/#\d+$/, '');
    const fontes = [...new Set(idx.map(i => materiais[i]._fonte))];
    if (fontes.length < 2) continue;
    const vence = fontes.sort((a, b) => PESO_FONTE[b] - PESO_FONTE[a])[0];
    const ficam = idx.filter(i => materiais[i]._fonte === vence);
    const saem = idx.filter(i => materiais[i]._fonte !== vence);
    saem.forEach(i => fora.add(i));
    const qtd = (lista) => lista.reduce((s, i) => s + (Number(materiais[i].quantidade) || 0), 0);
    // descrição da lista no item do DWG (1 para 1, mesma unidade)
    const daLista = saem.filter(i => materiais[i]._fonte === 'lista');
    if (vence === 'cad' && ficam.length === 1 && daLista.length === 1 && materiais[ficam[0]].unidade === materiais[daLista[0]].unidade) {
      const c = materiais[ficam[0]], l = materiais[daLista[0]];
      Object.assign(c, {
        descricao: l.descricao, referencia_fabricante: l.referencia_fabricante || c.referencia_fabricante,
        material_id: l.material_id ?? c.material_id, preco_catalogo: l.preco_catalogo ?? c.preco_catalogo,
        confianca_catalogo: l.confianca_catalogo ?? c.confianca_catalogo, descricao_catalogo: l.descricao_catalogo ?? c.descricao_catalogo,
        observacao: `${c.observacao} Descrição da lista de materiais (que dizia ${l.quantidade} ${l.unidade}).`,
      });
    }
    const [disc, tipo] = k.split('|');
    resumo.push(`${nomeDaDisciplina(disc)} — ${tipo.replace('_', ' ')}: vale ${ROTULO_FONTE[vence]} (${qtd(ficam)}); ${[...new Set(saem.map(i => materiais[i]._fonte))].map(f => `${ROTULO_FONTE[f]} dizia ${qtd(saem.filter(i => materiais[i]._fonte === f))}`).join('; ')}`);
  }
  if (resumo.length) {
    achados.push({
      tema: 'Mesmo item em mais de um arquivo (não somado)',
      observacao: `O projeto veio em mais de um formato e o mesmo tipo de item apareceu em fontes diferentes do mesmo desenho — contado uma vez só: ${resumo.join(' | ')}. Se a diferença de quantidade for grande, confira qual arquivo está atualizado.`,
    });
  }
  if (somados.length) {
    achados.push({
      tema: 'Mesmo tipo de item em desenhos diferentes (somado)',
      observacao: `O mesmo tipo de item veio de arquivos que não são o mesmo desenho/pavimento (nome de prancha diferente e sem ambientes casados na compatibilização) — as quantidades foram somadas: ${somados.join(' | ')}. Se forem o mesmo pavimento em formatos diferentes, apague a duplicata.`,
    });
  }
  return materiais.filter((_, i) => !fora.has(i)).map(({ _fonte, _arquivo, ...m }) => m);
}

module.exports = {
  totaisCodificados, contagemDoCad, contagemDoDesenho, montarServicosPadrao, montarMateriaisInstalacaoPadrao, semModeloCoberto,
  montarMateriais, montarPontosPorAmbiente, montarMateriaisQuantitativos, montarMateriaisDaLista, montarMateriaisDoDesenho,
  tipoDoItem, semDuplicarFontes, doGrupo, temDisciplina,
  // formatação usada também pelos achados (utils/analiseProjetoAchados.js)
  semMarcador, metrosBR,
};
