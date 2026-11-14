import { Pencil, Trash2, Scale } from 'lucide-react';
import { formatarMoeda, formatarNcm } from '../../utils/format';
import { ORIGEM_LABEL, th, td, tdVazio, btnIcone } from './apoio';

// Tabela do catálogo de materiais: origem do cadastro, categoria/preço a conferir
// (lidos pela IA) e as ações de cada linha (comparar fornecedores, editar, remover).
export default function TabelaMateriais({ materiais, carregando, ehAdmin, onComparar, onEditar, onExcluir }) {
  return (
    <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
            <th style={th}>Código</th>
            <th style={th}>Descrição</th>
            <th style={th}>NCM/SH</th>
            <th style={th}>Categoria</th>
            <th style={th}>Un.</th>
            <th style={{ ...th, textAlign: 'right' }}>Compra</th>
            <th style={{ ...th, textAlign: 'right' }}>Venda</th>
            <th style={th}>Marca</th>
            <th style={{ ...th, width: 125 }}></th>
          </tr>
        </thead>
        <tbody>
          {carregando && (
            <tr><td colSpan={9} style={tdVazio}>Carregando...</td></tr>
          )}
          {!carregando && materiais.length === 0 && (
            <tr><td colSpan={9} style={tdVazio}>Nenhum material encontrado</td></tr>
          )}
          {!carregando && materiais.map(m => (
            <tr key={m.id} style={{ borderTop: '1px solid #1e1e1e' }}>
              <td style={td}>{m.codigo || '—'}</td>
              <td style={td}>
                {m.descricao}
                {m.origem && m.origem !== 'manual' && (
                  <span style={{
                    marginLeft: 8, padding: '1px 6px', borderRadius: 10, fontSize: 11,
                    background: '#1a1a0a', color: '#c9a227', border: '1px solid #4a3d10'
                  }}>
                    {ORIGEM_LABEL[m.origem] || m.origem}
                  </span>
                )}
              </td>
              <td style={td}>{formatarNcm(m.ncm) || '—'}</td>
              <td style={td}>
                {m.categoria}
                {/* categoria dada pela IA ou sugerida pelo kNN abaixo do corte: confira (editar e salvar confirma) */}
                {['ia', 'knn_baixa'].includes(m.categoria_origem) && m.origem !== 'manual' && (
                  <span title={m.categoria_origem === 'ia' ? 'Categoria escolhida pela IA — confira' : 'Categoria sugerida pelo catálogo com pouca certeza — confira'}
                    style={{ display: 'block', fontSize: 10.5, color: '#b9a6ff' }}>
                    {m.categoria_origem === 'ia' ? 'sugerida pela IA' : 'a conferir'}
                  </span>
                )}
              </td>
              <td style={td}>{m.unidade}</td>
              <td style={{ ...td, textAlign: 'right', color: 'var(--texto-3)' }}>{m.preco_compra ? formatarMoeda(m.preco_compra) : '—'}</td>
              <td style={{ ...td, textAlign: 'right', color: '#c9a227', fontWeight: 700 }}>
                {formatarMoeda(m.preco)}
                {/* preço lido por IA de uma cotação e não conferido: no orçamento entra "a cotar" (revisão de 06/11/2026) */}
                {!m.preco_manual && /(^|_)ia$/i.test(m.preco_origem || m.origem || '') && (
                  <span title="Preço lido pela IA de uma cotação — confira (editar e salvar o material confirma)"
                    style={{ display: 'block', fontSize: 10.5, fontWeight: 400, color: '#b9a6ff' }}>
                    lido pela IA
                  </span>
                )}
              </td>
              <td style={td}>{m.marca || '—'}</td>
              <td style={{ ...td, display: 'flex', gap: 6 }}>
                <button onClick={() => onComparar(m)} style={btnIcone} title="Comparar fornecedores" aria-label={`Comparar fornecedores de ${m.descricao}`}>
                  <Scale size={13} />
                </button>
                <button onClick={() => onEditar(m)} style={btnIcone} title="Editar">
                  <Pencil size={13} />
                </button>
                {ehAdmin && (
                  <button onClick={() => onExcluir(m)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                    <Trash2 size={13} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
