import { estilos } from './estilos';

// Dado de ficha: rótulo em cima, valor embaixo e, se houver, uma nota pequena.
// Revisão de 14/11/2026 — eram três cópias (Info da análise de projeto, InfoLinha
// do histórico, Info das OS da obra). As variantes guardam o visual de cada tela:
//   'linha'    (padrão) rótulo em maiúsculas e o valor no tamanho do texto (histórico);
//   'ficha'    rótulo de formulário do kit e o valor em negrito pequeno (OS da obra);
//   'destaque' o valor grande e dourado (resumo da análise de projeto).

const MAIUSCULO = { fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px' };

const VARIANTES = {
  linha: { rotulo: { ...MAIUSCULO, marginBottom: 3 }, valor: { color: '#ddd' } },
  ficha: { rotulo: estilos.rotulo, valor: { color: '#ddd', fontSize: 12, fontWeight: 700 } },
  destaque: { rotulo: { ...MAIUSCULO, fontSize: 12, marginBottom: 5 }, valor: { fontSize: 19, color: '#c9a227', fontWeight: 700 } },
};

export default function Info({ rotulo, valor, nota, variante = 'linha' }) {
  const v = VARIANTES[variante] || VARIANTES.linha;
  return (
    <div>
      <div style={v.rotulo}>{rotulo}</div>
      <div style={v.valor}>{valor}</div>
      {nota && <div style={{ color: 'var(--texto-3)', fontSize: 11.5 }}>{nota}</div>}
    </div>
  );
}
