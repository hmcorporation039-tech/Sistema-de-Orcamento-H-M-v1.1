import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ChevronDown } from 'lucide-react';
import { estilos } from '../../components/ui/estilos';

// Peças comuns da tela de Notas fiscais (pages/NotasFiscais.js) e dos seus modais:
// situações da nota, botões e menu de ações, linhas de dados e estilos locais.

export const SITUACOES = {
  rascunho:   { rotulo: 'Rascunho',   cor: 'var(--aviso)',  fundo: 'rgba(224,169,64,.14)' },
  emitida:    { rotulo: 'Emitida',    cor: 'var(--sucesso)', fundo: 'rgba(79,191,122,.14)' },
  cancelada:  { rotulo: 'Cancelada',  cor: 'var(--perigo)', fundo: 'rgba(224,100,100,.14)' },
  substituida:{ rotulo: 'Substituída',cor: 'var(--texto-3)', fundo: 'rgba(143,137,124,.10)' },
};

// ── componentes de UI locais ──────────────────────────────────────────────────

export function Indicador({ rotulo, valor, destaque }) {
  return (
    <div style={{ ...estilos.card, padding: '12px 14px', marginBottom: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: destaque ? 'var(--ouro)' : 'var(--texto)', marginTop: 4 }}>{valor ?? '—'}</div>
    </div>
  );
}

export function BtnTexto({ onClick, children, icone, destaque, ocupado }) {
  return (
    <button type="button" onClick={onClick} disabled={ocupado}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
        background: destaque ? 'var(--ouro-fundo)' : 'var(--superficie-2)',
        border: `1px solid ${destaque ? 'var(--ouro-escuro)' : 'var(--borda-forte)'}`,
        color: destaque ? 'var(--ouro-claro)' : 'var(--texto-2)',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}>
      {icone}{children}
    </button>
  );
}

export function MenuAcoes({ children }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [aberto]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(!aberto)} title="Mais ações"
        style={{ ...estilos.btnIcone, width: 28, height: 28 }}>
        <ChevronDown size={12} />
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
          borderRadius: 8, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,.5)', overflow: 'hidden',
        }}
          onClick={() => setAberto(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ItemMenu({ onClick, children, icone, perigo, ocupado, testid }) {
  return (
    <button type="button" onClick={onClick} disabled={ocupado} data-testid={testid}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px',
        background: 'transparent', border: 'none', fontSize: 12.5,
        color: perigo ? 'var(--perigo)' : 'var(--texto-2)',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? .5 : 1,
        borderBottom: '1px solid var(--borda)',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!ocupado) e.currentTarget.style.background = 'var(--superficie-3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {icone}{children}
    </button>
  );
}

export function Secao({ titulo, children }) {
  return (
    <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: .5, padding: '6px 12px', borderBottom: '1px solid var(--borda)' }}>{titulo}</div>
      <div style={{ padding: '4px 12px' }}>{children}</div>
    </div>
  );
}

export function Linha({ rotulo, valor, copiar }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8, alignItems: 'start', padding: '5px 0', borderBottom: '1px solid var(--borda)' }}>
      <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>{rotulo}</span>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>{valor}</span>
      {copiar ? <button type="button" onClick={copiar} style={{ ...estilos.btnIcone, width: 26, height: 26 }} title="Copiar"><Copy size={12} /></button> : <span />}
    </div>
  );
}

// Pix que já era de outra obra (ou que continua na obra depois de desligado): a obra não muda, só fica o aviso,
// no mesmo jeito do painel Notas a receber
export function avisarObra(avisos) {
  for (const aviso of avisos.filter(Boolean)) toast(aviso, { duration: 12000, icon: '⚠️' });
}

// ── constantes de estilo locais ───────────────────────────────────────────────
export const sub = { fontSize: 11.5, color: 'var(--texto-3)', marginTop: 2 };
export const opcao = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)', margin: '6px 0', cursor: 'pointer' };
