// Resumo do OBJETIVO DO PROJETO de uma análise (dadosExtraidos[].objetivo, gerado sem IA por
// skills/_comum/cad/objetivoDoProjeto.js): disciplina e tipo, vistas principal × contexto × apoio, dados (kVA, kV, abrigo
// na escala das cotas), componentes pela relação de materiais e pelas legendas, legendas lidas e o que ficou [CONFERIR].
// Usado pelo agente de análise (passos.js) e pela ferramenta objetivo_do_projeto do assistente (MCP). Sem dependências
// pesadas: o MCP do assistente carrega este arquivo a cada mensagem.
const { DISCIPLINAS } = require('../../utils/disciplinasProjeto');
const { DISCIPLINAS_LAUDO } = require('../../utils/disciplinasLaudo');

const nomeDisciplina = (c) => DISCIPLINAS_LAUDO.find(d => d.chave === c)?.nome || DISCIPLINAS.find(d => d.chave === c)?.nome || c;
const cortar = (t, n = 220) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };

// "O que é o projeto" a partir de dadosExtraidos[].objetivo (skills/_comum/cad/objetivoDoProjeto.js)
function linhasDoObjetivo(analise) {
  const linhas = [];
  const pend = [];
  const objetivos = (analise.dadosExtraidos || []).map(d => d?.objetivo).filter(Boolean);
  for (const o of objetivos) {
    const conf = typeof o.confianca === 'number' ? (o.confianca >= 0.75 ? 'alta' : o.confianca >= 0.5 ? 'média' : 'baixa') : '—';
    linhas.push(`- **${o.tipoRotulo || o.tipo || 'projeto'}** (${nomeDisciplina(o.disciplina)})${o.titulo ? ` — "${cortar(o.titulo, 90)}"` : ''} — confiança ${conf}`);
    const v = o.vistas || [];
    const n = (p) => v.filter(x => x.papel === p).length;
    if (v.length) linhas.push(`- Vistas: ${n('principal')} principal (vale para o projeto), ${n('contexto')} de contexto (base de outro projeto, ignorada), ${n('apoio')} de apoio (cortes, detalhes, legendas)`);
    const d = o.dados || {};
    const destaques = [
      d.potencia_kva != null && `${d.potencia_kva} kVA`, d.tensao_primaria_kv != null && `${d.tensao_primaria_kv} kV`,
      d.tensao_secundaria_v != null && `${d.tensao_secundaria_v} V`, d.demanda_kva != null && `demanda ${d.demanda_kva} kVA`,
      o.abrigo?.largura_m != null && `abrigo ${o.abrigo.largura_m} × ${o.abrigo.comprimento_m} m (escala pelas cotas)`,
    ].filter(Boolean);
    if (destaques.length) linhas.push(`- Dados: ${destaques.join(' · ')}`);
    const comps = o.componentes || [];
    if (comps.length) {
      const fontes = [...new Set(comps.map(c => c.fonte).filter(Boolean))];
      linhas.push(`- ${comps.length} componente(s) pela ${fontes.map(f => f.replace(/_/g, ' ')).join(', ') || 'leitura'}; ${comps.filter(c => c.conferir).length} a conferir`);
      for (const c of comps.filter(x => x.conferir).slice(0, 8)) pend.push(`[CONFERIR] ${cortar(c.descricao || c.tipo, 120)}${c.motivo ? ` — ${cortar(c.motivo, 120)}` : ''}`);
    }
    const legendas = (o.legendas || []).filter(l => !l.contexto);
    if (legendas.length) linhas.push(`- Legendas lidas: ${legendas.slice(0, 5).map(l => `${cortar(l.titulo || l.tipo || 'legenda', 40)} (${(l.itens || []).length} itens)`).join('; ')}`);
    for (const a of (o.avisos || []).slice(0, 5)) pend.push(`[CONFERIR] ${cortar(a, 200)}`);
  }
  if (!objetivos.length) {
    const carimbos = (analise.dadosExtraidos || []).map(d => d?.carimbo).filter(Boolean);
    linhas.push(`- Projeto de ${(analise.disciplinas || []).map(nomeDisciplina).join(', ') || '(disciplina não marcada)'}${carimbos[0]?.titulo ? ` — "${cortar(carimbos[0].titulo, 90)}"` : ''}.`);
    linhas.push('- O objetivo detalhado (vistas, abrigo, componentes pela relação de materiais) sai da leitura de DWG/DXF; neste arquivo valem a legenda, o carimbo e as tabelas do PDF.');
  }
  return { linhas, pendencias: pend, objetivos };
}

module.exports = { linhasDoObjetivo, nomeDisciplina };
