// Kit de tela do sistema: estilos e peças comuns (revisão de 28/10/2026 —
// btnPrimario/overlay/Campo estavam copiados em até 19 páginas, com pequenas
// diferenças). Página nova usa daqui; as antigas vão sendo trocadas.
export const estilos = {
  card: { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 18, marginBottom: 16 },
  th: { padding: '10px 14px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, textAlign: 'left' },
  td: { padding: '10px 14px', color: '#ccc', verticalAlign: 'middle' },
  tdVazio: { padding: '30px 14px', textAlign: 'center', color: '#555' },
  tabela: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  caixaTabela: { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'auto' },
  rotulo: { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
  btnPrimario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none',
    borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnSecundario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid #2a2a2a',
    borderRadius: 6, color: '#bbb', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnIcone: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: 5, color: '#999', cursor: 'pointer',
  },
  link: { color: '#c9a227', textDecoration: 'none', fontWeight: 700 },
  linhaTabela: { borderTop: '1px solid #1e1e1e' },
  ajuda: { color: '#777', fontSize: 12, margin: '0 0 10px', lineHeight: 1.6 },
};

export function Campo({ label, children, style }) {
  return (
    <div style={style}>
      <label style={estilos.rotulo}>{label}</label>
      {children}
    </div>
  );
}
