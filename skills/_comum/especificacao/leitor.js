// LEITOR DE REQUISITOS da especificação (pedido do usuário de 09/11/2026: "ler as informações
// enviadas pelo cliente ou arquiteto e desenvolver sozinho um projeto"). Recebe os blocos do
// texto (./texto.js) e o PERFIL da disciplina (vocabulário em dados — skills/<disciplina>/dados/
// perfil-especificacao.json) e devolve os requisitos estruturados, cada um com a frase de
// origem (bloco, página, seção). Nada aqui é específico de quadro: o perfil diz o que procurar.
//
// Princípio: determinístico, sem IA. O que o perfil marca como obrigatório e não aparece no
// texto vira PENDÊNCIA [CONFERIR]; nada é inventado. O vocabulário aprendido (o engenheiro
// ensinou que "tal frase" é "tal requisito") entra por `opcoes.aprendido.vocabulario` e vale
// como os padrões do perfil (fonte: 'aprendido').
//
// Formato do vocabulário (perfil.vocabulario):
//   equipamentos: { <tipo>: { rotulo, termos: [regex], tag, categoria, aciona?: [tipos], de?: tipo,
//                   atributos?: [ids extras], obrigatorios?: [{ atributo, texto }] } }
//   atributos:    { <id>: { padroes: [regex com 1 grupo] | [{ padrao, valor }], numero?: bool } }
//   requisitos:   [{ id, grupo, rotulo, padroes: [regex], valor?, captura?: { campo: nGrupo },
//                   negavel?, negacao?: [regex → valor false], secoes?: [regex], contexto?: [regex],
//                   multiplo?, numeros?: [campos] }]
//   listas:       [{ id, rotulo, secoes?: [regex], padrao?, tipos?: ['item'|'paragrafo'…],
//                   separadores?: regex, remover?: [regex] }]
//   circuitos:    [{ id, padrao, campos: { quantidade, tipo, polos, in_a }, tipos: { termo: tipo }, dr?: regex }]
//   sinais:       { funcoes: [{ id, termos: [regex] }], saida: [regex], entrada: [regex], borne: regex }
//   obrigatorios: [{ campo, texto, padrao? }]
//   meta:         { revisao?: regex, data?: regex }

const norm = (s) => String(s ?? '').replace(/[   ]/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const re = (p, flags = 'iu') => (p instanceof RegExp ? p : new RegExp(p, flags));
const numero = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const PALAVRAS_NUM = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6 };

// frase do bloco que contém a posição `idx` (rastreabilidade)
function fraseEm(texto, idx) {
  const t = String(texto);
  const cortes = [];
  const r = /[.;!?](?=\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9•(])/g;
  let m;
  while ((m = r.exec(t))) cortes.push(m.index + 1);
  let ini = 0;
  for (const c of cortes) { if (c <= idx) ini = c; else break; }
  const fim = cortes.find(c => c > idx) ?? t.length;
  return t.slice(ini, fim).trim();
}

function origemDe(bloco, idx = 0) {
  return { bloco: bloco.id, pagina: bloco.pagina, secao: bloco.secao || '', frase: fraseEm(bloco.texto, idx), tipo: bloco.tipo };
}

const naSecao = (bloco, secoes) => !secoes || !secoes.length || secoes.some(s => re(s).test((bloco.secoes || [bloco.secao]).join(' / ')));
const noContexto = (texto, contexto) => !contexto || !contexto.length || contexto.some(c => re(c).test(texto));

// negação logo antes do termo, na mesma frase ("Sem multimedidor", "não é necessário CLP")
function negado(texto, idx) {
  const antes = semAcento(texto.slice(Math.max(0, idx - 28), idx)).toLowerCase();
  return /\b(sem|nao|nenhum|dispensa(do)?|exceto)\b[^.;]*$/.test(antes);
}

// Junta o vocabulário aprendido ao do perfil (não altera o perfil original)
function mesclarVocabulario(vocab, aprendido = []) {
  const v = JSON.parse(JSON.stringify(vocab || {}));
  v.equipamentos = v.equipamentos || {};
  v.requisitos = v.requisitos || [];
  v.sinais = v.sinais || { funcoes: [] };
  for (const a of aprendido || []) {
    if (!a || !a.padrao) continue;
    if (a.alvo === 'equipamento' && v.equipamentos[a.id]) {
      v.equipamentos[a.id].termos = [...(v.equipamentos[a.id].termos || []), a.padrao];
      (v.equipamentos[a.id].aprendidos ||= []).push(a.padrao);
    } else if (a.alvo === 'requisito') {
      const r = v.requisitos.find(x => x.id === a.id);
      if (r) { r.padroes = [...(r.padroes || []), a.padrao]; (r.aprendidos ||= []).push(a.padrao); } else {
        v.requisitos.push({ id: a.id, grupo: a.grupo || a.id.split('.')[0], rotulo: a.rotulo || a.id, padroes: [a.padrao], valor: a.valor ?? true, aprendidos: [a.padrao] });
      }
    } else if (a.alvo === 'sinal') {
      const f = v.sinais.funcoes.find(x => x.id === a.id);
      if (f) { f.termos = [...f.termos, a.padrao]; (f.aprendidos ||= []).push(a.padrao); } else v.sinais.funcoes.push({ id: a.id, termos: [a.padrao], aprendidos: [a.padrao] });
    }
  }
  return v;
}

// ── Equipamentos ─────────────────────────────────────────────────────────────

const STOP_MARCA = /^(MCA|MFA|MOP|RLA|LRA|FLA|NBR|IEC|ABNT|RS|DI|DO|UI|AI|AO|IP|IK|QGBT|QGD|QD|CLP|DR|DPS|TN|TT|IT|NR|CA|CC|VCA|VCC|ART|PE|N|LED|ON|OFF|DN|CV|KW|HZ|MAN|AUT|T\/B)$/i;

// "MARCA MODELO" e "Marca MOD-12 COD-12-345" (marca com maiúscula + código com letra e número)
function fabricanteModelo(texto) {
  const r = /(?<![\p{L}\d])(\p{Lu}[\p{L}&]{1,14})\s+([A-Z0-9][A-Za-z0-9\-\/.]{2,}[A-Za-z0-9])(?:\s+([A-Z0-9][A-Za-z0-9\-\/]{4,}))?/gu;
  let m;
  while ((m = r.exec(texto))) {
    const marca = m[1];
    const modelo = m[2];
    if (STOP_MARCA.test(marca) || !/\d/.test(modelo) || !/[A-Za-z]/.test(modelo)) continue;
    if (/^\d+[A-Za-z]{0,2}$/.test(modelo)) continue; // "380V", "60Hz"
    if (/^(Rev|Revis|Folha|Item)/i.test(marca)) continue;
    const segundo = m[3] && /\d/.test(m[3]) && /[A-Za-z]/.test(m[3]) && m[3].length > modelo.length ? m[3] : null;
    return { fabricante: marca, modelo: segundo ? `${modelo} ${segundo}` : modelo, idx: m.index };
  }
  return null;
}

function lerAtributos(texto, vocab, ids) {
  const out = {};
  for (const id of ids) {
    const a = vocab.atributos?.[id];
    if (!a) continue;
    for (const p of a.padroes || []) {
      const padrao = typeof p === 'string' ? p : p.padrao;
      const m = re(padrao).exec(texto);
      if (!m) continue;
      let v = typeof p === 'object' && 'valor' in p ? p.valor : (m[1] ?? true);
      if (a.numero) v = numero(v);
      if (v == null) continue;
      out[id] = { valor: v, idx: m.index };
      break;
    }
  }
  return out;
}

function quantidadeNoTexto(texto, termos) {
  for (const t of termos) {
    const m = re(`\\b(\\d+|${Object.keys(PALAVRAS_NUM).join('|')})\\s+(?:${t})\\b`).exec(texto);
    if (m) return { valor: numero(m[1]) ?? PALAVRAS_NUM[semAcento(m[1]).toLowerCase()] ?? null, idx: m.index, fim: m.index + m[0].length };
  }
  const un = /\((\d+)\s*un\.?\)/i.exec(texto);
  if (un) return { valor: Number(un[1]), idx: un.index };
  return null;
}

function lerEquipamentos(blocos, vocab) {
  const tipos = Object.entries(vocab.equipamentos || {});
  const achados = new Map(); // tipo → equipamento
  const garantir = (tipo, def) => {
    if (!achados.has(tipo)) achados.set(tipo, { tipo, rotulo: def.rotulo, categoria: def.categoria || null, tag: def.tag || null, quantidade: null, atributos: {}, origens: [], fontes: new Set() });
    return achados.get(tipo);
  };
  const termoDe = (def) => def.termos.map(t => `(?:${t})`).join('|');
  for (const b of blocos) {
    if (b.tipo === 'titulo') continue;
    const texto = norm(b.texto);
    // linha de tabela: o rótulo da 1ª célula diz de que equipamento é a linha inteira
    if (b.tipo === 'linha_tabela' && b.celulas && b.celulas.length >= 2) {
      const rotulo = norm(b.celulas[0]);
      const resto = norm(b.celulas.slice(1).join(' '));
      for (const [tipo, def] of tipos) {
        const mt = re(`^(?:${termoDe(def)})\\b`).exec(rotulo) || re(`\\b(?:${termoDe(def)})\\b`).exec(rotulo);
        if (!mt) continue;
        const eq = garantir(tipo, def);
        const q = /\((\d+)\s*un\.?\)/i.exec(rotulo) || /^(\d+)\s/.exec(rotulo);
        if (q) eq.quantidade = { valor: Number(q[1]), origem: origemDe(b, 0) };
        eq.origens.push(origemDe(b, 0));
        if ((def.aprendidos || []).some(p => re(p).test(rotulo))) eq.fontes.add('aprendido');
        const fm = fabricanteModelo(resto);
        if (fm && !eq.atributos.fabricante) {
          eq.atributos.fabricante = { valor: fm.fabricante, origem: origemDe(b, 0) };
          eq.atributos.modelo = { valor: fm.modelo, origem: origemDe(b, 0) };
        }
        const ids = Object.keys(vocab.atributos || {});
        for (const [id, v] of Object.entries(lerAtributos(resto, vocab, ids))) {
          if (!eq.atributos[id]) eq.atributos[id] = { valor: v.valor, origem: { ...origemDe(b, 0), frase: fraseEm(b.texto, b.texto.indexOf(resto.slice(0, 12)) + v.idx) || b.texto } };
        }
        break;
      }
      continue;
    }
    // demais blocos: quantidade citada ("2 chillers e 2 bombas (1 operando + 1 reserva)")
    for (const [tipo, def] of tipos) {
      const q = quantidadeNoTexto(texto, def.termos);
      if (!q || q.valor == null) continue;
      const eq = garantir(tipo, def);
      if (!eq.quantidade) eq.quantidade = { valor: q.valor, origem: origemDe(b, q.idx) };
      eq.origens.push(origemDe(b, q.idx));
      // "(1 operando + 1 reserva)" logo depois do termo
      // só logo depois do termo: "2 chillers e 2 bombas (1 operando + 1 reserva)" é das bombas
      const depois = texto.slice(q.fim ?? q.idx, (q.fim ?? q.idx) + 40);
      const op = /^\s*\(?\s*(\d+)\s*operando\s*\+\s*(\d+)\s*reserva/i.exec(depois);
      if (op && !eq.atributos.operando) {
        eq.atributos.operando = { valor: Number(op[1]), origem: origemDe(b, q.idx) };
        eq.atributos.reserva = { valor: Number(op[2]), origem: origemDe(b, q.idx) };
      }
    }
  }
  // quem aciona quem: "inversores" de "bombas" (perfil: aciona) e "válvulas" de "chillers" (de)
  const lista = [...achados.values()].map(e => ({ ...e, fontes: [...e.fontes] }));
  for (const e of lista) {
    const def = vocab.equipamentos[e.tipo] || {};
    if (def.aciona) {
      const alvo = lista.find(x => def.aciona.includes(x.tipo) && (x.quantidade?.valor ?? 1) === (e.quantidade?.valor ?? 1)) || lista.find(x => def.aciona.includes(x.tipo));
      if (alvo) { e.aciona = alvo.tipo; alvo.acionadoPor = e.tipo; }
    }
    if (def.de) {
      const dono = lista.find(x => x.tipo === def.de);
      if (dono) e.de = dono.tipo;
    }
  }
  return lista;
}

// ── Sinais de campo ("pedido de bomba (DO3)") ───────────────────────────────

function lerSinais(blocos, vocab, equipamentos) {
  const cfg = vocab.sinais || {};
  if (!cfg.borne) return [];
  const out = [];
  const tipos = Object.entries(vocab.equipamentos || {});
  for (const b of blocos) {
    if (b.tipo === 'titulo') continue;
    const texto = norm(b.texto);
    // dono do sinal: o equipamento citado no rótulo da linha, ou o primeiro citado no bloco
    let dono = null;
    const alvoTexto = b.celulas ? norm(b.celulas[0]) + ' ' + texto : texto;
    for (const [tipo, def] of tipos) {
      if (re(`\\b(?:${def.termos.join('|')})\\b`).test(alvoTexto) && equipamentos.some(e => e.tipo === tipo)) { dono = tipo; break; }
    }
    const r = new RegExp(`([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]{2,45}?)\\s*\\((${cfg.borne})\\)`, 'giu');
    let m;
    while ((m = r.exec(texto))) {
      const desc = m[1].trim().replace(/^(e|de|da|do|a|o)\s+/i, '');
      const borne = m[2].trim();
      const frase = fraseEm(texto, m.index);
      const antes = semAcento(frase.slice(0, Math.max(0, frase.indexOf(m[1].trim())))).toLowerCase();
      let direcao = null;
      if ((cfg.entrada || []).some(p => re(p).test(antes))) direcao = 'entrada_do_equipamento';
      else if ((cfg.saida || []).some(p => re(p).test(antes))) direcao = 'saida_do_equipamento';
      const funcao = (cfg.funcoes || []).find(f => f.termos.some(t => re(t).test(desc)));
      const aConfirmar = /confirmar|a definir|verificar/i.test(borne);
      out.push({
        equipamento: dono, descricao: desc, funcao: funcao ? funcao.id : null, borne: aConfirmar ? null : borne,
        borneTexto: borne, aConfirmar, direcao, fonte: funcao && (funcao.aprendidos || []).some(t => re(t).test(desc)) ? 'aprendido' : 'lido',
        origem: origemDe(b, m.index),
      });
    }
  }
  return out;
}

// ── Requisitos ──────────────────────────────────────────────────────────────

function lerRegras(blocos, vocab) {
  const out = [];
  for (const regra of vocab.requisitos || []) {
    const achados = [];
    for (const b of blocos) {
      if (b.tipo === 'titulo' && !regra.titulos) continue;
      if (!naSecao(b, regra.secoes)) continue;
      const texto = norm(b.texto);
      if (!noContexto(texto, regra.contexto)) continue;
      for (const p of regra.padroes || []) {
        const r = re(p, 'giu');
        let m;
        while ((m = r.exec(texto))) {
          let valor = regra.valor ?? true;
          if (regra.captura) {
            valor = {};
            for (const [campo, g] of Object.entries(regra.captura)) {
              let v = m[g];
              if (v != null && (regra.numeros || []).includes(campo)) v = numero(v);
              if (v != null) valor[campo] = typeof v === 'string' ? v.trim() : v;
            }
            if (regra.valor && typeof regra.valor === 'object') valor = { ...regra.valor, ...valor };
          }
          const ehNegado = (regra.negacao || []).some(n => re(n).test(fraseEm(texto, m.index))) || (regra.negavel && negado(texto, m.index));
          if (ehNegado) valor = false;
          achados.push({
            id: regra.id, grupo: regra.grupo || regra.id.split('.')[0], rotulo: regra.rotulo || regra.id, valor,
            origem: origemDe(b, m.index), trecho: m[0], fonte: (regra.aprendidos || []).includes(p) ? 'aprendido' : 'lido',
          });
          if (!regra.multiplo) break;
          if (m[0] === '') r.lastIndex++;
        }
        if (achados.length && !regra.multiplo) break;
      }
      if (achados.length && !regra.multiplo) {
        // o mesmo requisito repetido em outros blocos: o valor é o 1º; os demais ficam como origens (lidos)
        const outras = [];
        for (const b2 of blocos) {
          if (b2.id === achados[0].origem.bloco || b2.tipo === 'titulo' || !naSecao(b2, regra.secoes)) continue;
          const t2 = norm(b2.texto);
          if (!noContexto(t2, regra.contexto)) continue;
          const m2 = (regra.padroes || []).map(p => re(p).exec(t2)).find(Boolean);
          if (m2) outras.push(origemDe(b2, m2.index));
        }
        if (outras.length) achados[0].outrasOrigens = outras;
        break;
      }
    }
    out.push(...achados);
  }
  return out;
}

function lerListas(blocos, vocab) {
  const out = {};
  for (const l of vocab.listas || []) {
    const itens = [];
    for (const b of blocos) {
      if (b.tipo === 'titulo') continue;
      if (l.tipos && !l.tipos.includes(b.tipo)) continue;
      if (!naSecao(b, l.secoes)) continue;
      let texto = norm(b.texto);
      let origemIdx = 0;
      if (l.padrao) {
        const m = re(l.padrao).exec(texto);
        if (!m) continue;
        origemIdx = m.index;
        texto = (m[1] ?? m[0]).trim();
      }
      for (const rem of l.remover || []) texto = texto.replace(re(rem, 'giu'), ' ');
      const partes = l.separadores ? texto.split(re(l.separadores, 'gu')) : [texto];
      for (const p of partes) {
        const t = p.replace(/^[\s,;.·–-]+|[\s,;.·]+$/g, '').replace(/\s+/g, ' ').trim();
        if (t && t.length >= 2) itens.push({ texto: t, origem: origemDe(b, origemIdx) });
      }
    }
    if (itens.length) out[l.id] = itens;
  }
  return out;
}

function lerCircuitos(blocos, vocab) {
  const out = [];
  for (const c of vocab.circuitos || []) {
    for (const b of blocos) {
      if (b.tipo === 'titulo') continue;
      const texto = norm(b.texto);
      const r = re(c.padrao, 'giu');
      let m;
      while ((m = r.exec(texto))) {
        const get = (k) => (c.campos[k] != null ? m[c.campos[k]] : null);
        const termoTipo = semAcento(get('tipo') || '').toLowerCase();
        const tipo = Object.entries(c.tipos || {}).find(([t]) => termoTipo.includes(semAcento(t).toLowerCase()))?.[1] || 'outro';
        const frase = fraseEm(texto, m.index);
        const dr = c.dr ? re(c.dr).exec(frase) : null;
        const circ = {
          tipo, rotulo: get('tipo') || tipo, quantidade: numero(get('quantidade')) ?? (PALAVRAS_NUM[semAcento(get('quantidade') || '').toLowerCase()] || 1),
          polos: (get('polos') || '').toUpperCase().replace('BIPOLAR', '2P').replace('TRIPOLAR', '3P').replace('MONOPOLAR', '1P'),
          in_a: numero(get('in_a')), dr_ma: dr ? numero(dr[1]) : null, origem: origemDe(b, m.index),
        };
        // campos extras do perfil (14/11/2026 — quadro predial: nº, descrição e potência de cada circuito)
        for (const k of Object.keys(c.campos)) {
          if (['quantidade', 'tipo', 'polos', 'in_a'].includes(k) || get(k) == null) continue;
          circ[k] = (c.numeros || []).includes(k) ? numero(get(k)) : norm(get(k));
        }
        if (circ.n != null) circ.quantidade = 1;
        out.push(circ);
      }
    }
  }
  return out;
}

function lerMeta(blocos, vocab) {
  const meta = {};
  const titulo = blocos.find(b => b.tipo === 'titulo');
  if (titulo) meta.titulo = titulo.texto;
  const cabeca = blocos.slice(0, 6).map(b => b.texto).join(' · ');
  const rev = re(vocab.meta?.revisao || 'Rev\\.?\\s*([0-9A-Z]{1,3})').exec(cabeca);
  if (rev) meta.revisao = rev[1];
  const data = /(\d{2}\/\d{2}\/\d{4})/.exec(cabeca);
  if (data) meta.data = data[1];
  const tag = /^([A-Z]{1,4}[-–][A-Z0-9]{1,8})\s*[—–-]/.exec(titulo?.texto || '');
  if (tag) meta.tag = tag[1].replace('–', '-');
  const obra = blocos.slice(0, 6).find(b => b.tipo === 'paragrafo' && /—/.test(b.texto) && !/especifica/i.test(b.texto));
  if (obra) {
    const partes = obra.texto.split(/\s*·\s*/)[0].split(/\s+[—–]\s+/);
    meta.obra = partes[0];
    if (partes[1]) meta.local = partes[1];
  }
  return meta;
}

// ── Pendências ──────────────────────────────────────────────────────────────

function pendenciasDoTexto(requisitos, equipamentos, sinais, vocab) {
  const pend = [];
  const tem = (campo) => requisitos.some(r => r.id === campo && r.valor !== false);
  for (const o of vocab.obrigatorios || []) {
    if (!tem(o.campo)) pend.push({ campo: o.campo, texto: o.texto, tipo: 'faltou', adotado: o.adotado ?? null });
  }
  for (const e of equipamentos) {
    const def = vocab.equipamentos[e.tipo] || {};
    for (const ob of def.obrigatorios || []) {
      if (!e.atributos[ob.atributo]) pend.push({ campo: `${e.tipo}.${ob.atributo}`, texto: ob.texto.replace('{rotulo}', e.rotulo), tipo: 'faltou', equipamento: e.tipo });
    }
  }
  for (const s of sinais.filter(x => x.aConfirmar)) {
    pend.push({ campo: `sinal.${s.funcao || s.descricao}`, texto: `Borne do sinal "${s.descricao}"${s.equipamento ? ` do ${s.equipamento}` : ''}: a especificação diz "${s.borneTexto}".`, tipo: 'a_confirmar', origem: s.origem });
  }
  return pend;
}

// ── Entrada única ────────────────────────────────────────────────────────────

// → { perfil, meta, equipamentos, requisitos, sinais, listas, circuitos, pendencias, naoLidos, estatistica }
function lerRequisitos(blocos, perfil, opcoes = {}) {
  const vocab = mesclarVocabulario(perfil.vocabulario, opcoes.aprendido?.vocabulario);
  const equipamentos = lerEquipamentos(blocos, vocab);
  const requisitos = lerRegras(blocos, vocab);
  const sinais = lerSinais(blocos, vocab, equipamentos);
  const listas = lerListas(blocos, vocab);
  const circuitos = lerCircuitos(blocos, vocab);
  const meta = lerMeta(blocos, vocab);
  const pendencias = pendenciasDoTexto(requisitos, equipamentos, sinais, vocab);
  // blocos que nada leu: aparecem na tela para o engenheiro ensinar (vocabulário novo)
  const usados = new Set([
    ...requisitos.flatMap(r => [r.origem.bloco, ...(r.outrasOrigens || []).map(o => o.bloco)]), ...sinais.map(s => s.origem.bloco), ...circuitos.map(c => c.origem.bloco),
    ...equipamentos.flatMap(e => [...e.origens.map(o => o.bloco), ...Object.values(e.atributos).map(a => a.origem?.bloco)]),
    ...Object.values(listas).flatMap(l => l.map(i => i.origem.bloco)),
  ]);
  const naoLidos = blocos.filter(b => b.tipo !== 'titulo' && !usados.has(b.id) && b.texto.length > 12).map(b => ({ bloco: b.id, pagina: b.pagina, secao: b.secao, texto: b.texto }));
  const interpretaveis = blocos.filter(b => b.tipo !== 'titulo' && b.texto.length > 12).length;
  return {
    perfil: perfil.chave, versaoPerfil: perfil.versao || 1, meta, equipamentos, requisitos, sinais, listas, circuitos, pendencias, naoLidos,
    estatistica: {
      blocos: blocos.length, interpretaveis, lidos: interpretaveis - naoLidos.length,
      cobertura: interpretaveis ? Math.round(100 * (interpretaveis - naoLidos.length) / interpretaveis) : 0,
      aprendidos: requisitos.filter(r => r.fonte === 'aprendido').length + sinais.filter(s => s.fonte === 'aprendido').length + equipamentos.filter(e => e.fontes.includes('aprendido')).length,
    },
  };
}

// Atalhos para quem consome os requisitos
const req = (lidos, id) => lidos.requisitos.find(r => r.id === id && r.valor !== false) || null;
const reqs = (lidos, id) => lidos.requisitos.filter(r => r.id === id && r.valor !== false);
const negadoReq = (lidos, id) => lidos.requisitos.some(r => r.id === id && r.valor === false);
const equip = (lidos, tipo) => lidos.equipamentos.find(e => e.tipo === tipo) || null;
const attr = (e, id) => (e && e.atributos[id] ? e.atributos[id].valor : null);

// Padrão literal (aprendizado): a frase que o engenheiro marcou, com espaços flexíveis e sem
// depender de acento/maiúscula — vira um padrão do perfil para o próximo projeto
function padraoDaFrase(frase) {
  const t = norm(frase).toLowerCase().slice(0, 120);
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc
    .replace(/[aàáâã]/g, '[aàáâã]').replace(/[eéê]/g, '[eéê]').replace(/[ií]/g, '[ií]').replace(/[oóôõ]/g, '[oóôõ]').replace(/[uúü]/g, '[uúü]').replace(/[cç]/g, '[cç]')
    .replace(/\s+/g, '\\s+');
}

module.exports = { lerRequisitos, mesclarVocabulario, fabricanteModelo, fraseEm, padraoDaFrase, req, reqs, negadoReq, equip, attr, numero, norm };
