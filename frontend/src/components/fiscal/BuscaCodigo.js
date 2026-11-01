import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import useUltimoPedido from '../../hooks/useUltimoPedido';

// Formatos dos códigos fiscais (o banco guarda só os dígitos).
export const formatarCtribNac = (c) => (c && c.length === 6 ? `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4)}` : c || '');
export const formatarNbs = (c) => (c && c.length === 9 ? `${c[0]}.${c.slice(1, 5)}.${c.slice(5, 7)}.${c.slice(7)}` : c || '');
export const formatarCnae = (c) => (c && c.length === 7 ? `${c.slice(0, 2)}.${c.slice(2, 4)}-${c[4]}-${c.slice(5)}` : c || '');
export const formatarCep = (c) => {
  const d = String(c || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

// Campo de busca numa tabela oficial (códigos de serviço, NBS, municípios):
// digita código ou palavras, escolhe na lista. Escolhido, mostra o código e a
// descrição, com X para limpar.
//   buscar(texto) → Promise<{ data: [{ codigo, descricao|nome, uf? }] }>
//   valor: { codigo, descricao } | null
export default function BuscaCodigo({ buscar, valor, onEscolher, formatar = (c) => c, placeholder, testid, desabilitado }) {
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const novoPedido = useUltimoPedido();

  useEffect(() => {
    if (!aberto || texto.trim().length < 2) { setItens([]); return undefined; }
    const t = setTimeout(async () => {
      const vale = novoPedido();
      try {
        const r = await buscar(texto.trim());
        if (vale()) setItens(r.data);
      } catch {
        if (vale()) setItens([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [texto, aberto, buscar, novoPedido]);

  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  if (valor?.codigo) {
    return (
      <div style={escolhido} data-testid={testid}>
        <code style={{ color: 'var(--ouro-claro)', whiteSpace: 'nowrap' }}>{formatar(valor.codigo)}</code>
        <span style={{ flex: 1, minWidth: 0, color: 'var(--texto-2)', fontSize: 12.5, lineHeight: 1.4 }}>{valor.descricao}</span>
        {!desabilitado && (
          <button type="button" onClick={() => { onEscolher(null); setTexto(''); }} style={btnLimpar} title="Trocar">
            <X size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={caixa} style={{ position: 'relative' }}>
      <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--texto-3)' }} />
      <input
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
        style={{ paddingLeft: 30 }}
        disabled={desabilitado}
        data-testid={testid}
      />
      {aberto && itens.length > 0 && (
        <ul style={lista} role="listbox">
          {itens.map((it) => (
            <li key={it.codigo}>
              <button
                type="button"
                style={opcao}
                onClick={() => { onEscolher({ ...it, descricao: it.descricao ?? `${it.nome}${it.uf ? `-${it.uf}` : ''}` }); setAberto(false); setTexto(''); }}
              >
                <code style={{ color: 'var(--ouro-claro)', whiteSpace: 'nowrap' }}>{formatar(it.codigo)}</code>
                <span style={{ color: 'var(--texto)' }}>{it.descricao ?? `${it.nome}${it.uf ? ` – ${it.uf}` : ''}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && texto.trim().length >= 2 && itens.length === 0 && (
        <div style={{ ...lista, padding: '10px 12px', color: 'var(--texto-3)', fontSize: 12.5 }}>Nada encontrado. Tente outra palavra ou o código.</div>
      )}
    </div>
  );
}

const escolhido = {
  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8,
  background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
};
const btnLimpar = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, flexShrink: 0,
  background: 'transparent', border: '1px solid var(--borda-forte)', borderRadius: 6, color: 'var(--texto-2)', cursor: 'pointer',
};
const lista = {
  position: 'absolute', zIndex: 30, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 280, overflowY: 'auto',
  margin: 0, padding: 4, listStyle: 'none', background: 'var(--superficie)', border: '1px solid var(--borda-forte)',
  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.35)',
};
const opcao = {
  display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '7px 8px', fontSize: 12.5, lineHeight: 1.4,
  background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
};
