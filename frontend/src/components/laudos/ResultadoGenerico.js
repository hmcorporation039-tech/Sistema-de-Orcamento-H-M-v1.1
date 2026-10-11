// Painel de resultado genérico: { indicadores[], textos[], tabelas[] } vindo do
// resumir() da disciplina.

function Indicador({ rotulo, valor, ok, detalhe }) {
  const cor = ok === undefined || ok === null ? '#c9a227' : ok ? '#3fb95f' : '#e05050';
  return (
    <div style={{ background: '#0f0f0f', border: `1px solid ${ok === undefined || ok === null ? '#222' : cor}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: cor }}>{valor}</div>
      {detalhe && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{detalhe}</div>}
    </div>
  );
}

export default function ResultadoGenerico({ resumo }) {
  if (!resumo) return null;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
        {(resumo.indicadores || []).map((ind, i) => <Indicador key={i} {...ind} />)}
      </div>
      {(resumo.textos || []).length > 0 && (
        <ul style={{ fontSize: 12, color: '#bbb', lineHeight: 1.7, margin: '0 0 12px', paddingLeft: 18 }}>
          {resumo.textos.map((t, i) => <li key={i} style={{ color: /\[CONFERIR/.test(t) ? '#e0a030' : '#bbb' }}>{t}</li>)}
        </ul>
      )}
      {(resumo.tabelas || []).map((tab, i) => (
        <div key={i} style={{ marginBottom: 14, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c9a227', marginBottom: 6 }}>{tab.titulo}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: '#777', fontSize: 10, textTransform: 'uppercase', textAlign: 'left' }}>
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
