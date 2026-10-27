import { useMemo, useState } from 'react';
import { calcularCurvaAbc } from '../utils/curvaAbc';
import { formatarMoeda } from '../utils/format';

// Painel "Curva ABC" do editor de orçamento (versão 2.0, Fase 3F): itens
// (materiais e serviços) do maior para o menor valor, % do total, % acumulado
// e classe, com uma barra simples por item. Calculado AO VIVO a partir dos
// itens da tela (mesmo núcleo do PDF e da planilha: utils/curvaAbc.js).
// itens: [{ descricao, quantidade, unidade, valor_unitario, codigo, tipo: 'material'|'servico' }]

const COR_CLASSE = { A: '#c9a227', B: '#8c8c8c', C: '#4a4a4a' };
const pct = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const LIMITE_INICIAL = 25;

export default function CurvaAbcPainel({ itens }) {
  const curva = useMemo(() => calcularCurvaAbc(itens), [itens]);
  const [classe, setClasse] = useState('');
  const [todos, setTodos] = useState(false);

  if (!curva.itens.length) {
    return <div style={{ fontSize: 12, color: '#777' }}>Sem itens para montar a curva ABC.</div>;
  }
  const maior = curva.itens[0].total || 0;
  const filtrados = classe ? curva.itens.filter(l => l.classe === classe) : curva.itens;
  const visiveis = todos ? filtrados : filtrados.slice(0, LIMITE_INICIAL);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {['A', 'B', 'C'].map(c => {
          const r = curva.resumo[c];
          const ativo = classe === c;
          return (
            <button key={c} type="button" onClick={() => setClasse(ativo ? '' : c)}
              title={ativo ? 'Mostrar todas as classes' : `Mostrar só a classe ${c}`}
              style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', minWidth: 170,
                background: ativo ? '#1d1a10' : '#161616', border: `1px solid ${ativo ? COR_CLASSE[c] : '#262626'}`, color: '#ccc',
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COR_CLASSE[c] === '#4a4a4a' ? '#888' : COR_CLASSE[c] }}>
                Classe {c} <span style={{ color: '#666', fontWeight: 400 }}>({c === 'A' ? `até ${curva.limites.A} %` : c === 'B' ? `até ${curva.limites.B} %` : 'resto'})</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{formatarMoeda(r.valor)} <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{pct(r.pct)}</span></div>
              <div style={{ fontSize: 11, color: '#777' }}>{r.itens} item(ns)</div>
            </button>
          );
        })}
        <div style={{ fontSize: 11, color: '#666', alignSelf: 'center', maxWidth: 300, lineHeight: 1.45 }}>
          Custo direto (sem BDI e impostos): {formatarMoeda(curva.total)}. O mesmo item em mais de uma linha conta uma vez, somado.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '28px 3.2fr 0.8fr 0.9fr 1fr 0.6fr 0.7fr 1.6fr 34px', gap: '4px 10px', alignItems: 'center', fontSize: 12 }}>
        {['#', 'Item', 'Tipo', 'Qtd.', 'Valor total', '%', '% acum.', '', 'Cl.'].map((t, i) => (
          <span key={i} style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i >= 3 && i <= 6 ? 'right' : 'left' }}>{t}</span>
        ))}
        {visiveis.map(l => (
          <Linha key={`${l.tipo}_${l.posicao}`} l={l} maior={maior} />
        ))}
      </div>
      {filtrados.length > LIMITE_INICIAL && (
        <button type="button" onClick={() => setTodos(t => !t)}
          style={{ marginTop: 8, background: 'none', border: 'none', color: '#c9a227', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0 }}>
          {todos ? 'Mostrar menos' : `Mostrar todos (${filtrados.length})`}
        </button>
      )}
    </div>
  );
}

function Linha({ l, maior }) {
  const largura = maior > 0 ? Math.max(1, Math.round((l.total / maior) * 100)) : 0;
  return (
    <>
      <span style={{ color: '#666' }}>{l.posicao}</span>
      <span style={{ color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.descricao}>{l.descricao}</span>
      <span style={{ color: '#888' }}>{l.tipo === 'servico' ? 'Serviço' : 'Material'}</span>
      <span style={{ textAlign: 'right', color: '#999' }}>{(Number(l.quantidade) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {l.unidade}</span>
      <span style={{ textAlign: 'right', color: '#ddd' }}>{formatarMoeda(l.total)}</span>
      <span style={{ textAlign: 'right', color: '#999' }}>{pct(l.pct)}</span>
      <span style={{ textAlign: 'right', color: '#999' }}>{pct(l.pct_acumulado)}</span>
      <span style={{ background: '#1c1c1c', borderRadius: 3, height: 8 }} title={`${pct(l.pct)} do total`}>
        <span style={{ display: 'block', width: `${largura}%`, height: 8, borderRadius: 3, background: COR_CLASSE[l.classe] }} />
      </span>
      <span style={{ fontWeight: 700, textAlign: 'center', color: l.classe === 'A' ? '#c9a227' : l.classe === 'B' ? '#aaa' : '#777' }}>{l.classe}</span>
    </>
  );
}
