import { Search } from 'lucide-react';

// Caixa de busca com a lupa à esquerda (2.40 — a mesma <div> + <Search> + <input>
// estava copiada nas barras de filtro e nos cabeçalhos das listas). As props vão
// para o <input>, inclusive o `id`: dentro do Campo do kit o rótulo "Buscar" liga
// ao campo (ui/rotuloLigado.js). Fora de um Campo, passe `aria-label`.
//   estiloCaixa: estilo da caixa de fora (largura, flex)
//   lupa: { tamanho, esquerda, topo, cor } — só para quem usa outra escala (app de campo)
export default function CampoBusca({ style, estiloCaixa, lupa = {}, ...props }) {
  const { tamanho = 14, esquerda = 10, topo = 10, cor = 'var(--texto-3)' } = lupa;
  return (
    <div style={{ position: 'relative', ...estiloCaixa }}>
      <Search size={tamanho} aria-hidden="true" style={{ position: 'absolute', left: esquerda, top: topo, color: cor, pointerEvents: 'none' }} />
      <input {...props} style={{ paddingLeft: 30, ...style }} />
    </div>
  );
}
CampoBusca.encaminhaId = true;
