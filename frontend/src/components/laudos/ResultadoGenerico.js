// Painel de resultado genérico: { indicadores[], textos[], tabelas[] } vindo do
// resumir() da disciplina.
import Indicador from '../ui/Indicador';

export default function ResultadoGenerico({ resumo }) {
  if (!resumo) return null;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
        {(resumo.indicadores || []).map((ind, i) => <Indicador key={i} variante="laudo" tamanho={17} rotulo={ind.rotulo} valor={ind.valor} ok={ind.ok} sub={ind.detalhe} />)}
      </div>
      {(resumo.textos || []).length > 0 && (
        <ul style={{ fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: 18 }}>
          {resumo.textos.map((t, i) => <li key={i} style={{ color: /\[CONFERIR/.test(t) ? '#e0a030' : '#bbb' }}>{t}</li>)}
        </ul>
      )}
      {(resumo.tabelas || []).map((tab, i) => (
        <div key={i} style={{ marginBottom: 14, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c9a227', marginBottom: 6 }}>{tab.titulo}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--texto-3)', fontSize: 11.5, textTransform: 'uppercase', textAlign: 'left' }}>
                {tab.colunas.map(c => <th key={c} style={{ padding: '4px 8px 6px 0' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {tab.linhas.map((l, j) => (
                <tr key={j} style={{ borderTop: '1px solid #1e1e1e' }}>
                  {l.map((v, k) => <td key={k} style={{ padding: '5px 8px 5px 0', color: k === 0 ? '#ccc' : '#999' }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
