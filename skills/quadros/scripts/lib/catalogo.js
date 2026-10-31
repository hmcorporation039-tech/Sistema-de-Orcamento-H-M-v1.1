// Catálogo de componentes por fabricante (contrato: scratchpad CONTRATO-CATALOGO.md,
// resumido em SKILL.md). Junta, nesta ordem de prioridade:
//   1. dados.catalogo_componentes  — registros que o backend injeta (banco: usuário / pesquisa IA)
//   2. dados/catalogo-componentes.json — catálogo H&M embutido (só verificado:true com fonte oficial)
// e escolhe, para cada dispositivo do quadro, o modelo do fabricante pedido:
//   - referência informada → esse registro;
//   - senão o MENOR modelo do fabricante (fabricantes.por_tipo > fabricantes.padrao) que atende
//     à especificação (polos, In, curva, Icu, IΔn, classe do DPS, AC-3, faixa, kW, saída…).
// Sem registro → medida típica (./tabelas.js), `medida.origem = 'tipica'`, e o dispositivo entra
// em `componentes_sem_medida` com uma especificação que serve de consulta de busca.

const ARQUIVO = require('../../dados/catalogo-componentes.json');

const TIPOS = ['disjuntor_din', 'dr', 'ddr', 'dps', 'disjuntor_caixa_moldada', 'seccionadora', 'fusivel_base', 'contator', 'disjuntor_motor',
  'rele_sobrecarga', 'soft_starter', 'inversor', 'fonte_24v', 'clp_cpu', 'clp_modulo', 'rele_interface', 'rele_seguranca', 'rele_tempo',
  'switch', 'ihm', 'multimedidor', 'borne', 'canaleta', 'trilho_din', 'involucro', 'isolador_barramento', 'pente', 'ventilador', 'termostato',
  'sinaleiro', 'botao', 'comutador'];
const FABRICANTES = ['WEG', 'Schneider Electric', 'Siemens', 'ABB', 'Steck', 'Legrand', 'Eaton', 'Phoenix Contact', 'Finder', 'Weidmüller', 'Conexel',
  'Mean Well', 'Cemar', 'Taunus', 'Rittal', 'Dutoplast', 'Hellermann', 'Delta', 'Altus'];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const chave = (r) => `${norm(r.fabricante)}|${norm(r.referencia)}`;

// Registros válidos (com medidas) e sem duplicata — o primeiro que aparece vence (entrada > banco > arquivo)
function carregarCatalogo(dados = {}, { semArquivo = false } = {}) {
  const vistos = new Set();
  const lista = [];
  for (const r of [...(Array.isArray(dados.catalogo_componentes) ? dados.catalogo_componentes : []), ...(semArquivo ? [] : ARQUIVO.componentes || [])]) {
    if (!r || !r.fabricante || !r.tipo || !(n(r.largura_mm) > 0 && n(r.altura_mm) > 0)) continue;
    const k = chave(r);
    if (vistos.has(k)) continue;
    vistos.add(k);
    lista.push(r);
  }
  return lista;
}

function fabricanteDoTipo(dados, tipo, item = {}) {
  if (item.fabricante) return item.fabricante;
  const f = dados.fabricantes || {};
  return (f.por_tipo && f.por_tipo[tipo]) || f.padrao || null;
}

const mesmoFab = (r, fab) => norm(r.fabricante) === norm(fab);
const tem = (v) => v != null && v !== '';
const pontosDe = (r) => (r.pontos && typeof r.pontos === 'object' ? r.pontos : {});
const tamanho = (r) => n(r.largura_mm) * n(r.altura_mm) * (n(r.profundidade_mm) || 1);

// O registro atende ao requisito? (req = { polos, corrente, curva, icu, sensibilidade, classe, uc, in_ka, ac3, faixa, kw, saida, ponto, canais, secao })
function atende(r, tipo, req) {
  const polos = n(r.polos);
  switch (tipo) {
    case 'disjuntor_din':
      return (!req.polos || polos === req.polos) && n(r.corrente_a) === req.corrente && (!tem(r.curva) || !req.curva || String(r.curva).toUpperCase() === req.curva) && (!req.icu || (n(r.icu_ka) ?? 0) >= req.icu - 1e-9);
    case 'disjuntor_caixa_moldada':
      return (!req.polos || polos === req.polos) && n(r.corrente_a) === req.corrente && (!req.icu || (n(r.icu_ka) ?? 0) >= req.icu - 1e-9);
    case 'dr':
      return (!req.polos || polos === req.polos) && (n(r.corrente_a) ?? 0) >= req.corrente - 1e-9 && (!req.sensibilidade || n(r.sensibilidade_ma) === req.sensibilidade);
    case 'ddr':
      return (!req.polos || polos === req.polos || polos === req.polos + 1) && n(r.corrente_a) === req.corrente && (!req.sensibilidade || n(r.sensibilidade_ma) === req.sensibilidade) && (!req.icu || (n(r.icu_ka) ?? 0) >= req.icu - 1e-9);
    case 'dps': {
      const classe = String(r.classe_dps || '').toUpperCase().replace(/\s/g, '');
      const pedida = String(req.classe || 'II').toUpperCase();
      const okClasse = pedida === 'II' ? /II/.test(classe) : /^I(\+II)?$|^I\+II$/.test(classe) || classe === 'I';
      return okClasse && (polos == null || polos === 1) && (!req.uc || (n(r.uc_v) ?? 0) >= req.uc - 1e-9)
        && (pedida === 'II' ? (!req.in_ka || (n(r.in_ka) ?? 0) >= req.in_ka - 1e-9) : true);
    }
    case 'contator':
      return (n(r.corrente_ac3_a) ?? n(r.corrente_a) ?? 0) >= req.ac3 - 1e-9 && (!polos || polos >= 3);
    case 'disjuntor_motor':
    case 'rele_sobrecarga':
      return n(r.corrente_min_a) != null && n(r.corrente_min_a) <= req.corrente + 1e-9 && n(r.corrente_a) >= req.corrente - 1e-9;
    case 'soft_starter':
    case 'inversor':
      return (n(r.corrente_a) ?? 0) >= req.corrente - 1e-9 || (req.kw && (n(r.potencia_kw) ?? 0) >= req.kw - 1e-9 && !tem(r.corrente_a));
    case 'fonte_24v':
      return (n(r.saida_a) ?? 0) >= req.saida - 1e-9;
    case 'clp_modulo':
      return (n(pontosDe(r)[req.ponto]) ?? 0) >= req.canais;
    case 'borne':
      return (n(r.pontos) ?? n(pontosDe(r).secao) ?? 0) >= req.secao - 1e-9;
    // a CPU precisa ter as E/S integradas que o cálculo contou (os módulos cobrem só o
    // resto): sem isso o "menor modelo" era a CPU de 6 DI / 4 DO no lugar da de 14 / 10
    // (registro sem as E/S/portas declaradas não é recusado, como a curva acima)
    case 'clp_cpu':
      return !tem(r.pontos) || ['DI', 'DO', 'AI', 'AO'].every(t => !req[t] || (n(pontosDe(r)[t]) ?? 0) >= req[t]);
    case 'switch':
      return !req.portas || !tem(r.pontos) || (n(pontosDe(r).RJ45) ?? 0) >= req.portas;
    // bobina 24 V com contato (não o de estado sólido nem o de entrada 230 V)
    case 'rele_interface':
      return (!tem(r.tensao_bobina) || /24/.test(String(r.tensao_bobina))) && !/estado s[óo]lido|\bSSR\b|230\s*V/i.test(`${r.descricao || ''} ${r.referencia || ''}`);
    // termostato do ventilador: contato NA (ventilação), não o de aquecimento nem o higrostato
    case 'termostato':
      return /termostato/i.test(r.descricao || '') && !/higrostato|aquecimento|\bNF\b/i.test(r.descricao || '');
    default:
      return true; // clp_cpu, rele_interface, rele_seguranca, rele_tempo, switch, ihm, multimedidor…
  }
}

// ordem "menor modelo que atende": corrente/Icu/saída crescente, depois o volume
function chaveOrdem(r, tipo) {
  const c = n(r.corrente_ac3_a) ?? n(r.corrente_a) ?? n(r.saida_a) ?? n(r.pontos) ?? 0;
  return [tipo === 'disjuntor_din' || tipo === 'ddr' || tipo === 'disjuntor_caixa_moldada' ? (n(r.icu_ka) ?? 0) : c, tamanho(r)];
}

function selecionar(catalogo, tipo, fabricante, req = {}, referencia = null) {
  if (referencia) {
    const r = catalogo.find(x => norm(x.referencia) === norm(referencia) && (!fabricante || mesmoFab(x, fabricante)))
      || catalogo.find(x => norm(x.referencia) === norm(referencia));
    if (r) return r;
  }
  if (!fabricante) return null;
  const candidatos = catalogo.filter(r => r.tipo === tipo && mesmoFab(r, fabricante) && atende(r, tipo, req));
  candidatos.sort((a, b) => {
    const ka = chaveOrdem(a, tipo), kb = chaveOrdem(b, tipo);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
  return candidatos[0] || null;
}

// Texto de busca da medida oficial (contrato: "WEG contator 25 A AC-3 bobina 24 Vcc")
function especificacao(tipo, fab, req = {}) {
  const f = fab ? `${fab} ` : '';
  const v = (x) => String(x).replace('.', ',');
  switch (tipo) {
    case 'disjuntor_din': return `${f}disjuntor DIN ${req.polos}P ${req.corrente} A curva ${req.curva || 'C'} ${v(req.icu)} kA`;
    case 'disjuntor_caixa_moldada': return `${f}disjuntor caixa moldada ${req.polos}P ${req.corrente} A ${v(req.icu)} kA`;
    case 'dr': return `${f}interruptor diferencial DR ${req.polos}P ${req.corrente} A ${req.sensibilidade} mA`;
    case 'ddr': return `${f}disjuntor diferencial DR ${req.polos}P+N ${req.corrente} A curva ${req.curva || 'C'} ${req.sensibilidade} mA`;
    case 'dps': return `${f}DPS classe ${req.classe} ${req.uc} V ${req.classe === 'II' ? `In ${v(req.in_ka)} kA` : `Iimp ${v(req.iimp || 12.5)} kA`} 1 polo trilho DIN`;
    case 'contator': return `${f}contator ${req.ac3} A AC-3 bobina ${req.bobina || '24 Vcc'}`;
    case 'disjuntor_motor': return `${f}disjuntor-motor faixa ${v(req.faixa[0])}–${v(req.faixa[1])} A`;
    case 'rele_sobrecarga': return `${f}relé de sobrecarga faixa ${req.faixa ? `${v(req.faixa[0])}–${v(req.faixa[1])}` : v(req.corrente)} A`;
    case 'soft_starter': return `${f}soft-starter ${v(req.corrente)} A ${v(req.kw)} kW 380 V com by-pass`;
    case 'inversor': return `${f}inversor de frequência ${v(req.kw)} kW ${v(req.corrente)} A 380 V`;
    case 'fonte_24v': return `${f}fonte 24 Vcc ${v(req.saida)} A trilho DIN`;
    case 'clp_cpu': return `${f}CLP CPU compacta ${req.io || '14 DI 10 DO 2 AI'}`;
    case 'clp_modulo': return `${f}módulo de expansão CLP ${req.canais} ${({ DI: 'entradas digitais 24 Vcc', DO: 'saídas digitais 24 Vcc', AI: 'entradas analógicas 4-20 mA', AO: 'saídas analógicas 4-20 mA', RS485: 'comunicação RS-485' })[req.ponto] || req.ponto}`;
    case 'rele_interface': return `${f}relé de interface 24 Vcc 1 contato 6 A base slim trilho DIN`;
    case 'rele_seguranca': return `${f}relé de segurança parada de emergência 24 Vcc 2 canais`;
    case 'rele_tempo': return `${f}relé temporizador estrela-triângulo trilho DIN`;
    case 'switch': return `${f}switch ethernet industrial ${req.portas || 5} portas trilho DIN`;
    case 'multimedidor': return `${f}multimedidor de energia trilho DIN`;
    case 'borne': return `${f}borne de passagem ${v(req.secao)} mm² trilho DIN`;
    case 'termostato': return `${f}termostato de painel NA (ventilação) 0–60 °C trilho DIN`;
    case 'ihm': return `${f}IHM ${req.pol || 7} polegadas 24 Vcc`;
    default: return `${f}${tipo.replace(/_/g, ' ')}`;
  }
}

// Seletor por quadro: guarda o que foi achado e o que ficou na medida típica
function criarSeletor(dados, opcoes = {}) {
  const catalogo = carregarCatalogo(dados, opcoes);
  const semMedida = [];
  const usados = [];
  const desligado = !!opcoes.desligado;
  // retorna { l, h, p, modulos, perda, medida } — dimensões oficiais ou as típicas recebidas
  function medir(tag, tipo, req, tipica, item = {}) {
    const fab = fabricanteDoTipo(dados, tipo, item);
    const r = desligado ? null : selecionar(catalogo, tipo, fab, req, item.referencia || null);
    if (r) {
      const medida = { origem: 'catalogo', fabricante: r.fabricante, linha: r.linha || '', referencia: r.referencia || '', descricao: r.descricao || '', fonte_url: r.fonte_url || '', fonte_documento: r.fonte_documento || '', verificado: r.verificado === true, registro_origem: r.origem || '', montagem: r.montagem || '' };
      usados.push({ tag, tipo, ...medida });
      return { l: n(r.largura_mm), h: n(r.altura_mm), p: n(r.profundidade_mm) || tipica.p, modulos: n(r.modulos_din), perdaW: n(r.perda_w), medida };
    }
    const esp = especificacao(tipo, fab, req);
    if (fab && !desligado) {
      const igual = semMedida.find(x => x.tipo === tipo && x.especificacao === esp);
      if (igual) igual.tag = `${igual.tag}, ${tag}`; else semMedida.push({ tag, tipo, fabricante: fab, especificacao: esp });
    }
    return { ...tipica, medida: { origem: 'tipica', fabricante: fab, referencia: item.referencia || '', fonte_url: '', verificado: false, especificacao: esp } };
  }
  return { catalogo, medir, semMedida, usados };
}

module.exports = { carregarCatalogo, fabricanteDoTipo, selecionar, atende, especificacao, criarSeletor, TIPOS, FABRICANTES, ARQUIVO };
