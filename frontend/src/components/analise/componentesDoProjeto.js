import { comparador } from '../Select';

// Componentes da disciplina usada primeiro (14/11/2026: "coloque apenas os componentes que correspondem à disciplina
// usada, porém com a opção de chamarmos os componentes de outras disciplinas"). Cada componente da biblioteca traz as
// disciplinas DE PROJETO que o usam (backend services/bibliotecaComponentes.js) e a análise traz as dela (resposta do
// mapa: disciplinasDoProjeto). doProjeto = true para os da análise; os outros ficam escondidos até o engenheiro marcar
// "outras disciplinas". Sem disciplina conhecida (análise antiga), todos contam como do projeto: a paleta fica inteira.
export function marcarDoProjeto(componentes, disciplinasDoProjeto) {
  const minhas = new Set(Array.isArray(disciplinasDoProjeto) ? disciplinasDoProjeto : []);
  return (componentes || []).map(c => ({ ...c, doProjeto: !minhas.size || (Array.isArray(c.disciplinas) ? c.disciplinas : [c.disciplina]).some(d => minhas.has(d)) }));
}

// paleta por disciplina (nome), em ordem alfabética dos grupos e dos nomes; outras = incluir os de outras disciplinas
export function gruposDaPaleta(marcados, nomeDisciplina, outras) {
  const por = new Map();
  for (const c of marcados) {
    if (!c.doProjeto && !outras) continue;
    const g = c.doProjeto ? nomeDisciplina(c.disciplina) : `Outras — ${nomeDisciplina(c.disciplina)}`;
    if (!por.has(g)) por.set(g, []);
    por.get(g).push(c);
  }
  // os grupos do projeto antes dos de outras disciplinas
  return [...por.entries()]
    .sort((a, b) => (a[1][0].doProjeto === b[1][0].doProjeto ? comparador.compare(a[0], b[0]) : a[1][0].doProjeto ? -1 : 1))
    .map(([g, cs]) => [g, [...cs].sort((a, b) => comparador.compare(a.nome, b.nome))]);
}
