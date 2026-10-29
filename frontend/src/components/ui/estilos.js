// Kit de tela do sistema: estilos e peças comuns (revisão de 28/10/2026 —
// btnPrimario/overlay/Campo estavam copiados em até 19 páginas, com pequenas
// diferenças). Página nova usa daqui; as antigas vão sendo trocadas.
// Revisão visual de 29/10/2026: cores vêm das variáveis do src/tema.css e o
// texto subiu de 10–12 px para 12–13 px.
export const estilos = {
  card: { background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: 20, marginBottom: 16 },
  th: { padding: '11px 14px', fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, textAlign: 'left', background: 'var(--superficie-2)' },
  td: { padding: '11px 14px', color: 'var(--texto)', verticalAlign: 'middle' },
  tdVazio: { padding: '32px 14px', textAlign: 'center', color: 'var(--texto-3)' },
  tabela: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  caixaTabela: { background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'auto' },
  rotulo: { display: 'block', fontSize: 12, color: 'var(--texto-2)', marginBottom: 6, fontWeight: 500 },
  btnPrimario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--ouro)', border: 'none',
    borderRadius: 8, color: '#111', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnSecundario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
    borderRadius: 8, color: 'var(--texto)', fontWeight: 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnIcone: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'var(--superficie-2)',
    border: '1px solid var(--borda-forte)', borderRadius: 6, color: 'var(--texto-2)', cursor: 'pointer',
  },
  link: { color: 'var(--ouro-claro)', textDecoration: 'none', fontWeight: 600 },
  linhaTabela: { borderTop: '1px solid var(--borda)' },
  ajuda: { color: 'var(--texto-3)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 },
};

export function Campo({ label, children, style }) {
  return (
    <div style={style}>
      <label style={estilos.rotulo}>{label}</label>
      {children}
    </div>
  );
}
