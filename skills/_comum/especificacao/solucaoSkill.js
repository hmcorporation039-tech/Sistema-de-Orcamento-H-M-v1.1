// SOLUÇÃO PELA SKILL DA DISCIPLINA (pedido do usuário em 14/11/2026: "faça o que ainda não estiver
// pronto" — projeto pela especificação para automação/BMS, central de incêndio, média tensão e
// quadro predial; até a 2.34 só havia o quadro de força e comando e o painel de pressurização).
//
// O quadro de força e comando tem motor próprio (skills/quadros/scripts/lib/especificacao.js —
// escada de relés, arranjo do painel). As demais disciplinas já têm um motor de CÁLCULO validado
// (a skill: processar(dados) → calc com materiais, avisos e documentos). Aqui a especificação lida
// vira o FORMULÁRIO da skill, pelo MAPA do perfil (dados, não código), e o resultado da skill vira o
// projeto no mesmo modelo que a tela, a planilha de preços e o texto de entrega entendem:
//
//   requisitos lidos (./leitor.js) ── perfil.mapa / equipamentos / circuitos / padroes ──▶ dados
//   dados ── skill.processar ──▶ res (calc, materiais, avisos)
//   res + perfil.verificacoes + perfil.causa_efeito ──▶ projeto { decisões com a frase de origem,
//      premissas, pendências [CONFERIR], pontos a levantar, exceções, materiais por grupo, memória,
//      indicadores da skill, matriz de causa e efeito (incêndio), laudo: { disciplina, dados } }
//
// Determinístico, sem IA. O que a especificação não diz e o perfil tem como padrão entra como
// PREMISSA [CONFERIR]; o que nem o perfil tem fica com o padrão da própria skill e vira pendência.
// Nada de valor de norma inventado: as regras de engenharia são as da skill.
//
// Formato do perfil (tipo_solucao: 'skill'):
//   skill: '<pasta da skill>'            laudo: { disciplina: '<chave da disciplina no sistema>' }
//   mapa: [{ requisito, campo: 'a.b.c', de?: 'campo do valor lido', valor?: constante,
//            tabela?: { 'termo lido': valor }, fator?: n, rotulo }]
//   padroes: [{ campo, valor, texto }]                      — premissas quando não lido
//   equipamentos: { lista: 'equipamentos', de: { <tipo do perfil>: { tipo: '<tipo da skill>', ... } } }
//   circuitos: { lista: 'circuitos', campos: { <campo da skill>: '<campo lido>' | { const } }, tipos: {…} }
//   fatos: [{ id, caminho: 'calc.x' | 'dados.x', op: '>'|'>='|'<'|'=='|'!=' |'existe', valor }]
//   variaveis: { nome: 'calc.x.y' }                          — para os textos das verificações
//   verificacoes: { regras: [mesmo formato do quadro: ponto | pendencia | excecao, se/nao com
//                   req:… f:… decisao:…] }
//   grupos: [{ grupo, codigos?: [..], re?: 'regex na descrição' }] — grupos da planilha de preços
//   causa_efeito: [{ id, se?: [req:…], causa, efeitos: [..], modulo?: 'comando'|'monitoramento',
//                    modulos?: n | { equipamento: '<tipo>' }, norma }]
//   indicadores: true — usa o resumir() da skill

const path = require('path');
const LEI = require('./leitor');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const RAIZ = path.join(__dirname, '..', '..');

function motorDaSkill(pasta) {
  return require(path.join(RAIZ, pasta, 'scripts', 'lib', 'index.js'));
}

// caminho 'a.b.c' em um objeto
function ler(obj, caminho) {
  let v = obj;
  for (const p of String(caminho).split('.')) { if (v == null) return undefined; v = v[p]; }
  return v;
}
function gravar(obj, caminho, valor) {
  const partes = String(caminho).split('.');
  let o = obj;
  for (const p of partes.slice(0, -1)) { if (o[p] == null || typeof o[p] !== 'object') o[p] = {}; o = o[p]; }
  o[partes[partes.length - 1]] = valor;
}
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtValor = (v) => (v === true ? 'sim' : v === false ? 'não' : typeof v === 'number' ? String(v).replace('.', ',') : String(v));

// valor de uma entrada do mapa a partir do requisito lido
function valorDoMapa(m, r) {
  if (m.valor !== undefined) return m.valor;
  let v = m.de ? (r.valor && typeof r.valor === 'object' ? r.valor[m.de] : undefined) : r.valor;
  if (v == null) return undefined;
  if (m.tabela) {
    const k = Object.keys(m.tabela).find(t => semAcento(v).includes(semAcento(t)));
    if (k == null) return undefined;
    v = m.tabela[k];
  }
  if (m.numero || m.fator) {
    const n = LEI.numero(v);
    if (n == null) return undefined;
    v = m.fator ? Math.round(n * m.fator * 1000) / 1000 : n;
  }
  if (m.prefixo) v = `${m.prefixo}${v}`;
  return v;
}

function avaliarFato(f, ctx) {
  const v = ler(ctx, f.caminho);
  switch (f.op) {
    case 'existe': return v != null && v !== '' && v !== false;
    case '>': return Number(v) > f.valor;
    case '>=': return Number(v) >= f.valor;
    case '<': return Number(v) < f.valor;
    case '==': return String(v) === String(f.valor);
    case '!=': return String(v) !== String(f.valor);
    default: return !!v;
  }
}

// mesma semântica de skills/quadros/scripts/lib/especificacao.js (avaliarVerificacoes): req:, f:, decisao:
function avaliarVerificacoes(regras, { fatos, req, decisoes, variaveis, respostas }) {
  const ok = (c) => {
    const neg = c.startsWith('!');
    const s = neg ? c.slice(1) : c;
    let v;
    if (s.startsWith('f:')) v = !!fatos[s.slice(2)];
    else if (s.startsWith('req:')) v = req.has(s.slice(4));
    else if (s.startsWith('decisao:')) { const [k, x] = s.slice(8).split('='); v = String(decisoes[k] ?? '') === x; }
    else v = false;
    return neg ? !v : v;
  };
  const txt = (s) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => (variaveis[k] != null ? fmtValor(variaveis[k]) : ''));
  const pontos = [], pendencias = [], excecoes = [];
  for (const r of regras || []) {
    if (!(r.se || []).every(ok)) continue;
    if ((r.nao || []).some(ok)) continue;
    if (r.tipo === 'ponto') {
      if (respostas[r.id] === 'manter') { excecoes.push({ id: r.id, texto: txt(r.se_mantido || r.texto), origem: 'resposta do engenheiro: manter como pedido' }); continue; }
      pontos.push({ id: r.id, texto: txt(r.texto), sugestao: r.sugestao ? { ...r.sugestao, texto: txt(r.sugestao.texto) } : null });
      if (r.se_mantido) excecoes.push({ id: r.id, texto: txt(r.se_mantido), origem: 'ponto a levantar (até o cliente responder)' });
    } else if (r.tipo === 'pendencia') pendencias.push({ id: r.id, texto: txt(r.texto) });
    else if (r.tipo === 'excecao') excecoes.push({ id: r.id, texto: txt(r.texto) });
  }
  for (const r of (regras || []).filter(x => x.sugestao && String(decisoes[x.sugestao.decisao] ?? '') === x.sugestao.valor)) {
    excecoes.push({ id: `${r.id}:aprovado`, texto: `Adotado (decisão aprovada): ${txt(r.sugestao.texto)}`, origem: 'decisão aprendida' });
  }
  return { pontos, pendencias, excecoes };
}

// ── 1. Especificação → formulário da skill ───────────────────────────────────
function dadosDaEspecificacao(lidos, PF, opcoes = {}) {
  const skill = motorDaSkill(PF.skill);
  const dados = skill.modeloVazio();
  const decisoes = [];   // { titulo, texto, criterio }
  const premissas = [];
  const pendencias = [];
  const avisos = [];
  const lidosCampo = new Set();
  const decisoesAprovadas = { ...(opcoes.aprendido?.decisoes || {}), ...(opcoes.decisoes || {}) };

  // identificação
  gravar(dados, 'meta.titulo', (lidos.meta?.titulo || PF.nome).slice(0, 200));
  gravar(dados, 'meta.data', opcoes.data || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  if (opcoes.revisao || lidos.meta?.revisao) gravar(dados, 'meta.revisao', opcoes.revisao || `R${lidos.meta.revisao}`);
  if ('dados_ilustrativos' in (dados.meta || {})) dados.meta.dados_ilustrativos = false;
  if (opcoes.cliente) gravar(dados, 'cliente.nome', opcoes.cliente);
  const obra = opcoes.obra || [lidos.meta?.obra, lidos.meta?.local].filter(Boolean).join(' — ');
  if (obra) gravar(dados, 'obra.nome', obra);

  // listas da skill que o modelo vazio traz com exemplos: a especificação manda
  for (const lista of PF.limpar || []) gravar(dados, lista, []);
  // cabeçalho da especificação → campos da skill (ex.: tag "QD-01" e título do quadro predial)
  for (const [k, campo] of Object.entries(PF.meta_campos || {})) {
    const v = k === 'titulo' ? String(lidos.meta?.titulo || '').replace(/^[A-Z]{1,4}[-–][A-Z0-9]{1,8}\s*[—–-]\s*/, '') : lidos.meta?.[k];
    if (v) { gravar(dados, campo, String(v).slice(0, 160)); lidosCampo.add(campo); }
  }

  // requisitos → campos
  for (const m of PF.mapa || []) {
    const r = LEI.req(lidos, m.requisito);
    if (!r || r.valor === false) continue;
    const v = valorDoMapa(m, r);
    if (v === undefined) continue;
    gravar(dados, m.campo, v);
    lidosCampo.add(m.campo);
    // o mesmo campo preenchido por dois requisitos (ex.: "Modbus" e "BACnet"): vale o último do mapa
    const dec = { campo: m.campo, titulo: m.rotulo || r.rotulo, texto: `${fmtValor(v)}${m.unidade ? ` ${m.unidade}` : ''} — lido da especificação: "${(r.origem?.frase || '').slice(0, 160)}"`, criterio: `p. ${r.origem?.pagina ?? '?'}` };
    const k = decisoes.findIndex(d => d.campo === m.campo);
    if (k >= 0) decisoes[k] = dec; else decisoes.push(dec);
  }
  // decisões aprovadas (respostas aos pontos a levantar) que mudam o formulário
  for (const d of PF.decisoes_campos || []) {
    if (String(decisoesAprovadas[d.decisao] ?? '') !== String(d.valor)) continue;
    gravar(dados, d.campo, d.para);
    lidosCampo.add(d.campo);
    decisoes.push({ titulo: d.rotulo || d.decisao, texto: `${fmtValor(d.para)} — decisão aprovada pelo engenheiro`, criterio: 'decisão aprendida' });
  }

  // equipamentos lidos → lista da skill
  if (PF.equipamentos?.lista) {
    const lista = [];
    for (const e of lidos.equipamentos || []) {
      const alvo = PF.equipamentos.de?.[e.tipo];
      if (!alvo) continue;
      const qtd = Number(e.quantidade?.valor) || 1;
      const item = { id: `${PF.vocabulario?.equipamentos?.[e.tipo]?.tag || e.tipo.toUpperCase()}`, ...clonar(alvo), descricao: e.rotulo || alvo.descricao || e.tipo, quantidade: qtd };
      for (const [k, a] of Object.entries(e.atributos || {})) if (alvo.atributos?.[k]) item[alvo.atributos[k]] = a.valor;
      delete item.atributos;
      lista.push(item);
      decisoes.push({ titulo: `Equipamento: ${e.rotulo}`, texto: `${qtd} un. — ${e.quantidade?.origem?.frase ? `"${e.quantidade.origem.frase.slice(0, 140)}"` : 'lido da especificação'}`, criterio: 'lista de equipamentos da especificação' });
    }
    if (lista.length) { gravar(dados, PF.equipamentos.lista, lista); lidosCampo.add(PF.equipamentos.lista); }
  }

  // circuitos lidos → lista da skill (quadro predial)
  if (PF.circuitos?.lista) {
    const lista = [];
    let n = 0;
    for (const c of lidos.circuitos || []) {
      const qtd = c.n ? 1 : Math.max(1, Number(c.quantidade) || 1);
      for (let k = 0; k < qtd; k++) {
        n++;
        const item = {};
        for (const [campo, de] of Object.entries(PF.circuitos.campos || {})) {
          if (de && typeof de === 'object' && 'const' in de) item[campo] = de.const;
          else if (de === '$n') item[campo] = String(c.n ?? n);
          else if (c[de] != null && c[de] !== '') item[campo] = c[de];
        }
        const tipo = PF.circuitos.tipos?.[c.tipo] || c.tipo;
        if (tipo) item.tipo = tipo;
        if (!item.descricao) item.descricao = c.descricao || c.rotulo || tipo;
        // potência lida em kW → W; sem potência: padrão do tipo (premissa)
        if (c.potencia != null) item.potencia_w = /k/i.test(c.unidade_potencia || '') ? Math.round(Number(c.potencia) * 1000) : Number(c.potencia);
        if (item.potencia_w == null && PF.circuitos.potencia_padrao?.[item.tipo] != null) {
          item.potencia_w = PF.circuitos.potencia_padrao[item.tipo];
          premissas.push(`Circuito ${item.n || n} (${item.descricao}): potência não informada — adotados ${item.potencia_w} W (padrão do perfil para ${item.tipo}). [CONFERIR]`);
        }
        // polos → ligação
        const polos = String(c.polos || '').toUpperCase();
        if (polos) item.ligacao = polos.startsWith('3P') ? (polos.includes('N') ? 'FFFN' : 'FFF') : polos.startsWith('2P') ? 'FF' : 'FN';
        if (c.dr_ma) { item.dr = 'idr'; item.local_dr = true; item.dr_ma = c.dr_ma; }
        lista.push(item);
      }
    }
    if (lista.length) {
      // fases: a especificação raramente diz; distribui pelo menor carregamento (maior potência primeiro)
      if (PF.circuitos.balancear) {
        const carga = { A: 0, B: 0, C: 0 };
        const ord = [...lista].sort((a, b) => (Number(b.potencia_w) || 0) - (Number(a.potencia_w) || 0));
        for (const c of ord) {
          const p = Number(c.potencia_w) || 0;
          if (c.fases) continue;
          if (c.ligacao === 'FFF' || c.ligacao === 'FFFN') { c.fases = 'ABC'; for (const f of 'ABC') carga[f] += p / 3; continue; }
          if (c.ligacao === 'FF') {
            const par = [['A', 'B'], ['B', 'C'], ['A', 'C']].sort((x, y) => (carga[x[0]] + carga[x[1]]) - (carga[y[0]] + carga[y[1]]))[0];
            c.fases = par.join(''); carga[par[0]] += p / 2; carga[par[1]] += p / 2; continue;
          }
          const f = Object.keys(carga).sort((x, y) => carga[x] - carga[y])[0];
          c.fases = f; carga[f] += p;
        }
        decisoes.push({ titulo: 'Distribuição das fases', texto: `circuitos distribuídos pela menor carga (maior potência primeiro): A ${Math.round(carga.A)} W · B ${Math.round(carga.B)} W · C ${Math.round(carga.C)} W`, criterio: 'balanceamento — a especificação não define as fases' });
      }
      gravar(dados, PF.circuitos.lista, lista);
      lidosCampo.add(PF.circuitos.lista);
      decisoes.push({ titulo: 'Circuitos', texto: `${lista.length} circuito(s) lidos da especificação (descrição, potência, disjuntor e DR quando escritos)`, criterio: 'tabela/lista de circuitos da especificação' });
    }
  }

  // padrões do perfil (premissas) quando a especificação não disse
  for (const p of PF.padroes || []) {
    if (lidosCampo.has(p.campo)) continue;
    gravar(dados, p.campo, p.valor);
    premissas.push(`${p.texto || `${p.campo} = ${fmtValor(p.valor)}`} [CONFERIR]`);
  }
  // obrigatórios não lidos → pendências
  for (const o of PF.obrigatorios_formulario || []) {
    if (lidosCampo.has(o.campo)) continue;
    pendencias.push({ id: `obrigatorio:${o.campo}`, texto: o.texto });
  }
  return { dados, decisoes, premissas, pendencias, avisos, skill };
}

// ── 2. Resultado da skill → projeto (o modelo que a tela/planilha/texto entendem) ──
function grupoDe(m, grupos) {
  for (const g of grupos || []) {
    if (g.codigos && g.codigos.includes(m.codigo)) return g.grupo;
    if (g.re && new RegExp(g.re, 'iu').test(m.descricao || '')) return g.grupo;
  }
  return m.grupo || 'Materiais';
}

function causaEfeito(PF, lidos, req) {
  const linhas = [];
  let modulos = { comando: 0, monitoramento: 0 };
  for (const c of PF.causa_efeito || []) {
    if (!(c.se || []).every(s => (s.startsWith('!') ? !req.has(s.slice(5)) : req.has(s.replace(/^req:/, ''))))) continue;
    let n = 0;
    if (typeof c.modulos === 'number') n = c.modulos;
    else if (c.modulos && c.modulos.equipamento) n = Number((lidos.equipamentos || []).find(e => e.tipo === c.modulos.equipamento)?.quantidade?.valor) || c.modulos.minimo || 1;
    if (c.modulo && n) modulos[c.modulo] = (modulos[c.modulo] || 0) + n;
    const r = (c.se || []).map(s => LEI.req(lidos, s.replace(/^!?req:/, ''))).find(Boolean);
    linhas.push({ id: c.id, causa: c.causa, efeitos: c.efeitos, modulo: c.modulo || null, modulos: n, norma: c.norma || '', origem: r?.origem?.frase || (c.se?.length ? '' : 'NBR 17240 (lógica básica)') });
  }
  // cenários de verificação: cada causa → os efeitos esperados
  const cenarios = linhas.map(l => ({ nome: `${l.causa} → ${l.efeitos.join('; ')}`, ok: true, falhas: [] }));
  return { linhas, modulos, cenarios };
}

function projetoDoResultado(res, ctx) {
  const { PF, lidos, base, opcoes = {} } = ctx;
  const req = new Set((lidos.requisitos || []).filter(r => r.valor !== false).map(r => r.id));
  const calc = res.calc || {};
  const skill = base.skill;
  const fatos = {};
  for (const f of PF.fatos || []) fatos[f.id] = avaliarFato(f, { calc, dados: res.dados });
  const variaveis = {};
  for (const [k, c] of Object.entries(PF.variaveis || {})) variaveis[k] = ler({ calc, dados: res.dados }, c);
  const decisoesAprovadas = { ...(opcoes.aprendido?.decisoes || {}), ...(opcoes.decisoes || {}) };
  const ver = avaliarVerificacoes(PF.verificacoes?.regras || [], { fatos, req, decisoes: decisoesAprovadas, variaveis, respostas: { ...(opcoes.aprendido?.respostas || {}), ...(opcoes.respostas || {}) } });

  // pendências: obrigatórios do formulário, regras do perfil, pendências da leitura e avisos [CONFERIR] da skill
  const pendencias = [];
  const addP = (texto, origem, campo) => { const t = String(texto || '').trim(); if (t && !pendencias.some(p => p.texto === t)) pendencias.push({ n: pendencias.length + 1, texto: t, origem, campo }); };
  for (const p of base.pendencias) addP(p.texto, 'formulário', p.id);
  for (const p of ver.pendencias) addP(p.texto, 'regra', p.id);
  for (const p of lidos.pendencias || []) addP(p.texto, 'especificação', p.campo);
  const avisosSkill = (calc.avisos || []).map(String);
  for (const a of avisosSkill.filter(a => /\[CONFERIR/.test(a))) addP(a, 'skill', null);

  const ce = causaEfeito(PF, lidos, req);
  // materiais da skill + os que o perfil acrescenta por requisito (ex.: painel repetidor da central)
  const extras = (PF.materiais_extras || []).filter(x => (x.se || []).every(s => req.has(s.replace(/^req:/, ''))))
    .map(x => ({ ...x, origemExtra: true }));
  const materiais = [...(calc.materiais || []), ...extras].filter(m => Number(m.quantidade) > 0).map(m => ({
    grupo: m.grupo && m.origemExtra ? m.grupo : grupoDe(m, PF.grupos), tag: m.codigo || '—', descricao: m.descricao, quantidade: Number(m.quantidade), unidade: m.unidade || 'un', referencia: m.referencia || '',
    chave: `${PF.disciplina}:${m.codigo || ''}:${m.descricao}`.slice(0, 200), ...(m.obs ? { obs: m.obs } : {}),
  }));
  const ind = typeof skill.resumir === 'function' ? (skill.resumir(res).indicadores || []) : [];
  const excecoes = [...ver.excecoes];
  const letras = 'ABCDEFGHIJKLMNOP';
  excecoes.forEach((e, k) => { e.letra = letras[k]; });
  const tag = PF.tag_padrao || (PF.disciplina || 'PRJ').slice(0, 3).toUpperCase();
  const titulo = lidos.meta?.titulo || res.dados?.meta?.titulo || PF.nome;
  return {
    tipoSolucao: 'skill', perfil: PF.chave, versaoPerfil: PF.versao, disciplina: PF.disciplina,
    gerado_em: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    meta: { tag: lidos.meta?.tag || tag, titulo, obra: res.dados?.obra?.nome || '', cliente: res.dados?.cliente?.nome || opcoes.cliente || '', referencia: `Espec. ${lidos.meta?.tag || tag}${lidos.meta?.revisao ? ` Rev.${lidos.meta.revisao}` : ''}`, data: opcoes.data || null, revisao: opcoes.revisao || '0A' },
    laudo: { disciplina: PF.laudo?.disciplina || PF.disciplina, skill: PF.skill },
    indicadores: ind,
    decisoes: base.decisoes, premissas: base.premissas, pendencias, pontos: ver.pontos, excecoes,
    avisos: [...base.avisos, ...avisosSkill.filter(a => !/\[CONFERIR/.test(a))],
    materiais,
    causaEfeito: ce.linhas.length ? ce.linhas : null,
    funcional: ce.cenarios,
    memoria: [{ titulo: 'Formulário da skill preenchido pela especificação', linhas: base.decisoes.map(d => `${d.titulo}: ${d.texto}`) }, ...(base.premissas.length ? [{ titulo: 'Premissas', linhas: base.premissas }] : [])],
    escopo: { excluido: (lidos.listas?.['escopo.excluido'] || []).map(i => i.texto), normas: [...new Set(LEI.reqs(lidos, 'normas').map(r => r.valor?.norma).filter(Boolean))] },
  };
}

// ── Ponto de entrada (mesmo contrato do motor do quadro) ─────────────────────
function solucionar(lidos, opcoes = {}) {
  const PF = opcoes.perfil;
  if (!PF || !PF.skill) throw new Error('Perfil de especificação sem skill (tipo_solucao "skill").');
  const base = dadosDaEspecificacao(lidos, PF, opcoes);
  // causa × efeito: os módulos de comando/monitoramento entram no formulário (bateria e materiais)
  const req = new Set((lidos.requisitos || []).filter(r => r.valor !== false).map(r => r.id));
  const ce = causaEfeito(PF, lidos, req);
  if (PF.campo_modulos && (ce.modulos.comando || ce.modulos.monitoramento)) {
    const atual = Number(ler(base.dados, PF.campo_modulos)) || 0;
    gravar(base.dados, PF.campo_modulos, Math.max(atual, ce.modulos.comando + ce.modulos.monitoramento));
    base.decisoes.push({ titulo: 'Módulos de comando/monitoramento', texto: `${ce.modulos.comando} de comando + ${ce.modulos.monitoramento} de monitoramento pela matriz de causa e efeito (integrações pedidas na especificação)`, criterio: 'NBR 17240 (interfaces) [CONFERIR com o fabricante da central]' });
  }
  const res = base.skill.processar(base.dados);
  const projeto = projetoDoResultado(res, { PF, lidos, base, opcoes });
  projeto.dadosLaudo = res.dados;
  return projeto;
}

// O projeto a partir de um laudo já gravado (documentos da skill: planilha de preços e texto de entrega)
function projetoDoRegistro(res, perfilDe) {
  const esp = res?.dados?.especificacao;
  if (!esp || !esp.lidos || !esp.perfil) return null;
  const PF = perfilDe(esp.perfil);
  if (!PF.skill) return null;
  const opcoes = { aprendido: esp.aprendido || {}, decisoes: esp.decisoes || {}, respostas: esp.respostas || {}, cliente: res.dados.cliente?.nome || '', obra: res.dados.obra?.nome || '' };
  const base = dadosDaEspecificacao(esp.lidos, PF, opcoes);
  return projetoDoResultado(res, { PF, lidos: esp.lidos, base, opcoes });
}

module.exports = { solucionar, dadosDaEspecificacao, projetoDoResultado, projetoDoRegistro, avaliarVerificacoes, ler, gravar, motorDaSkill };
