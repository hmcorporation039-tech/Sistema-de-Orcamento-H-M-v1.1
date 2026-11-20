import { useEffect, useRef, useState } from 'react';

// Menu suspenso do kit de tela (2.48): um botão que abre uma lista de ações — fecha ao escolher, ao clicar fora e no
// Esc. Usado para tirar da tela as ações de uso raro (o "⋯ Mais" da análise) e para escolher entre várias do mesmo tipo
// ("Projeto por disciplina ▾"). itens: [{ rotulo, detalhe?, icone?, onClick, desabilitado?, testid? } | { separador: true }].
export default function MenuSuspenso({ rotulo, itens, estiloBotao, alinhar = 'direita', abrirAcima = false, testid, titulo, desabilitado = false }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto]);

  const lista = (itens || []).filter(Boolean);
  return (
    <div ref={caixa} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(a => !a)}
        style={estiloBotao} data-testid={testid} title={titulo} disabled={desabilitado || !lista.length}>
        {rotulo}
      </button>
      {aberto && (
        <div role="menu" style={{
          position: 'absolute', [alinhar === 'direita' ? 'right' : 'left']: 0, [abrirAcima ? 'bottom' : 'top']: 'calc(100% + 4px)',
          zIndex: 60, minWidth: 250, maxWidth: 340, background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
          borderRadius: 8, padding: 4, boxShadow: '0 10px 28px rgba(0,0,0,.5)',
        }}>
          {lista.map((it, i) => (it.separador
            ? <div key={`sep-${i}`} style={{ borderTop: '1px solid var(--borda)', margin: '4px 0' }} />
            : (
              <button key={it.chave || it.testid || i} type="button" role="menuitem" disabled={it.desabilitado} data-testid={it.testid}
                onClick={() => { setAberto(false); it.onClick?.(); }}
                onMouseEnter={(e) => { if (!it.desabilitado) e.currentTarget.style.background = 'var(--superficie-3, #262626)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  color: it.desabilitado ? 'var(--texto-3)' : 'var(--texto)', padding: '8px 10px', borderRadius: 6, fontSize: 13,
                  cursor: it.desabilitado ? 'default' : 'pointer', fontFamily: 'inherit',
                }}>
                {it.icone && <span style={{ display: 'inline-flex', marginTop: 2, color: 'var(--texto-2)' }}>{it.icone}</span>}
                <span style={{ flex: 1 }}>
                  {it.rotulo}
                  {it.detalhe && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-3)', marginTop: 2, lineHeight: 1.4 }}>{it.detalhe}</span>}
                </span>
              </button>
            )))}
        </div>
      )}
    </div>
  );
}
