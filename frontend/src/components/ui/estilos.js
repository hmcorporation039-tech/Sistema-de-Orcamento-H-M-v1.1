import { useRotuloLigado } from './rotuloLigado';

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
  // Variantes transparentes do secundário (revisão de 14/11/2026 — estavam redefinidas tela a tela):
  // tracejado = ação de apoio ("Cancelar", "Restaurar", "+ adicionar"); contorno = borda cheia apagada.
  // Tela que precisa de outro tamanho espalha e muda só o padding/fonte.
  btnTracejado: {
    display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent', border: '1px dashed #333',
    borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnContorno: {
    padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
    borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
  },
  btnIcone: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'var(--superficie-2)',
    border: '1px solid var(--borda-forte)', borderRadius: 6, color: 'var(--texto-2)', cursor: 'pointer',
  },
  link: { color: 'var(--ouro-claro)', textDecoration: 'none', fontWeight: 600 },
  linhaTabela: { borderTop: '1px solid var(--borda)' },
  // botão com cara de texto, para a célula da linha clicável abrir também pelo teclado (Tab + Enter)
  botaoTexto: { background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' },
  ajuda: { color: 'var(--texto-3)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.6 },
};

// Rótulo + campo. O rótulo fica ligado ao campo (htmlFor/id gerado — ui/rotuloLigado.js)
// quando o primeiro filho é um campo: leitor de tela lê o nome e o clique no rótulo foca.
export function Campo({ label, children, style }) {
  const { idCampo, filhos } = useRotuloLigado(children);
  return (
    <div style={style}>
      <label style={estilos.rotulo} htmlFor={idCampo || undefined}>{label}</label>
      {filhos}
    </div>
  );
}
