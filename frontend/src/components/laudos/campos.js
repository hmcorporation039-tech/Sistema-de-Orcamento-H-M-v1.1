import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

// Componentes de formulário compartilhados pelos formulários de laudo/projeto
// de todas as disciplinas (aba Análise de Projeto → Laudos e projetos).

export const estiloInput = {
  width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5,
  color: '#ddd', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box', fontFamily: 'inherit',
};
const estiloRotulo = { display: 'block', fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' };

// Lê número aceitando vírgula; vazio vira null (campo "não informado")
export function paraNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  // "1.234,5" → 1234.5 ; "10,5" → 10.5 ; "10.5" → 10.5
  const n = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
  return Number.isFinite(n) ? n : null;
}

export function Campo({ rotulo, valor, onChange, tipo = 'texto', placeholder, dica, largura }) {
  const comum = { style: estiloInput, placeholder, title: dica };
  let entrada;
  if (tipo === 'area') {
    entrada = <textarea rows={3} {...comum} style={{ ...estiloInput, resize: 'vertical' }} value={valor ?? ''} onChange={e => onChange(e.target.value)} />;
  } else if (tipo === 'numero') {
    entrada = <CampoNumero valor={valor} onChange={onChange} {...comum} />;
  } else if (tipo === 'data') {
    entrada = <input type="date" {...comum} value={valor ?? ''} onChange={e => onChange(e.target.value)} />;
  } else {
    entrada = <input {...comum} value={valor ?? ''} onChange={e => onChange(e.target.value)} />;
  }
  return (
    <div style={{ minWidth: 0, gridColumn: largura === 'inteira' ? '1 / -1' : undefined }}>
      {rotulo && <label style={estiloRotulo}>{rotulo}</label>}
      {entrada}
    </div>
  );
}

// Número com vírgula: guarda o texto enquanto digita e converte ao sair do campo
function CampoNumero({ valor, onChange, ...resto }) {
  const [texto, setTexto] = useState(null);
  const exibido = texto !== null ? texto : (valor === null || valor === undefined ? '' : String(valor).replace('.', ','));
  return (
    <input
      {...resto}
      inputMode="decimal"
      value={exibido}
      onChange={e => setTexto(e.target.value)}
      onBlur={() => { if (texto !== null) { onChange(paraNumero(texto)); setTexto(null); } }}
    />
  );
}

export function Selecao({ rotulo, valor, onChange, opcoes, largura }) {
  return (
    <div style={{ minWidth: 0, gridColumn: largura === 'inteira' ? '1 / -1' : undefined }}>
      {rotulo && <label style={estiloRotulo}>{rotulo}</label>}
      <select style={estiloInput} value={valor ?? ''} onChange={e => onChange(e.target.value)}>
        {opcoes.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </div>
  );
}

export function Marcador({ rotulo, valor, onChange, dica }) {
  return (
    <label title={dica} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#bbb', cursor: 'pointer', paddingTop: 18 }}>
      <input type="checkbox" checked={!!valor} onChange={e => onChange(e.target.checked)} />
      {rotulo}
    </label>
  );
}

export function Grade({ colunas = 4, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, gap: 12, marginBottom: 12 }}>{children}</div>;
}

export function Secao({ titulo, children, abertaInicial = false, resumo }) {
  const [aberta, setAberta] = useState(abertaInicial);
  return (
    <div style={{ border: '1px solid #1e1e1e', borderRadius: 8, marginBottom: 10, background: '#111' }}>
      <button
        onClick={() => setAberta(a => !a)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'transparent', border: 'none', color: '#c9a227', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
      >
        {aberta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <span style={{ flex: 1 }}>{titulo}</span>
        {resumo && <span style={{ color: '#777', fontWeight: 400, fontSize: 12 }}>{resumo}</span>}
      </button>
      {aberta && <div style={{ padding: '4px 14px 14px' }}>{children}</div>}
    </div>
  );
}

// Tabela de linhas editáveis. colunas: [{ campo, rotulo, tipo, opcoes, largura }]
export function TabelaEditavel({ colunas, linhas, onChange, novaLinha, rotuloAdicionar = 'Adicionar linha', vazio = 'Nenhuma linha.' }) {
  const lista = linhas || [];
  const alterar = (i, campo, valor) => onChange(lista.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  return (
    <div style={{ marginBottom: 12 }}>
      {lista.length === 0 ? (
        <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic', margin: '4px 0 8px' }}>{vazio}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {colunas.map(c => (
                  <th key={c.campo} style={{ textAlign: 'left', fontSize: 10, color: '#777', textTransform: 'uppercase', padding: '0 6px 6px 0', width: c.largura }}>{c.rotulo}</th>
                ))}
                <th style={{ width: 30 }} />
              </tr>
            </thead>
            <tbody>
              {lista.map((l, i) => (
                <tr key={i}>
                  {colunas.map(c => (
                    <td key={c.campo} style={{ padding: '0 6px 6px 0', verticalAlign: 'top' }}>
                      <CelulaEditavel coluna={c} valor={l[c.campo]} onChange={v => alterar(i, c.campo, v)} />
                    </td>
                  ))}
                  <td style={{ verticalAlign: 'top' }}>
                    <button onClick={() => onChange(lista.filter((_, j) => j !== i))} title="Remover" style={btnIconeRemover}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={() => onChange([...lista, typeof novaLinha === 'function' ? novaLinha(lista) : { ...(novaLinha || {}) }])} style={btnAdicionar}>
        <Plus size={12} style={{ marginRight: 4 }} /> {rotuloAdicionar}
      </button>
    </div>
  );
}

function CelulaEditavel({ coluna, valor, onChange }) {
  if (coluna.tipo === 'selecao') {
    return (
      <select style={estiloInput} value={valor ?? ''} onChange={e => onChange(e.target.value)}>
        {coluna.opcoes.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    );
  }
  if (coluna.tipo === 'check') return <input type="checkbox" checked={!!valor} onChange={e => onChange(e.target.checked)} style={{ marginTop: 7 }} />;
  if (coluna.tipo === 'numero') return <CampoNumero valor={valor} onChange={onChange} style={estiloInput} />;
  if (coluna.tipo === 'area') return <textarea rows={2} style={{ ...estiloInput, resize: 'vertical' }} value={valor ?? ''} onChange={e => onChange(e.target.value)} />;
  return <input style={estiloInput} value={valor ?? ''} onChange={e => onChange(e.target.value)} />;
}

export const btnAdicionar = {
  display: 'inline-flex', alignItems: 'center', padding: '5px 10px', background: 'transparent',
  border: '1px dashed #333', borderRadius: 5, color: '#999', fontSize: 11, fontWeight: 700, cursor: 'pointer',
};
const btnIconeRemover = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 28,
  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, color: '#b04040', cursor: 'pointer',
};

export const Nota = ({ children }) => <p style={{ fontSize: 12, color: '#777', lineHeight: 1.6, margin: '0 0 12px' }}>{children}</p>;
