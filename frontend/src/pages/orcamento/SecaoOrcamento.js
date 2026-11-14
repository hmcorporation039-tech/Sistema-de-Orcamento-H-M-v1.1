import { Plus, Trash2 } from 'lucide-react';
import { formatarMoeda } from '../../utils/format';
import { categoriasComUsadas } from '../../utils/categoriasMateriais';
import LinhaItem from './LinhaItem';
import { ehMaoDeObra } from './apoio';
import { itensAgrupados, subgruposDaSecao, subtotalSecao } from './calculos';
import { btnIcone, btnSecundario, card } from './estilos';

// Uma seção do orçamento (cartão): nome editável, subtotal, cabeçalho das colunas, itens agrupados
// por subgrupo/categoria com o subtotal de cada bloco e "Adicionar item" (saiu de
// pages/Orcamento.js em 2.39, sem mudar o visual). `linha` = as props comuns de LinhaItem
// (callbacks, catálogo, serviços, pesquisas…), repassadas a cada item.
export default function SecaoOrcamento({
  sec, itens, materiais, segmento, pesquisas, linha, onRenomear, onRemover, onAdicionarItem,
}) {
  const maoDeObra = ehMaoDeObra(sec.nome);
  const colunas = maoDeObra
    ? '0.9fr 1.2fr 3.1fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px'
    : '0.9fr 1.2fr 2.4fr 0.9fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px';
  // Seções de Materiais usam as categorias do cadastro de Materiais (coligado
  // com o catálogo — ver filtro no dropdown "+ catálogo" de LinhaItem); seções de
  // Mão de Obra continuam com os subgrupos livres de sempre.
  const opcoesSubgrupo = maoDeObra
    ? subgruposDaSecao(itens, sec.id)
    : categoriasComUsadas(materiais.map(m => m.categoria));

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <input
          value={sec.nome}
          onChange={e => onRenomear(sec.id, e.target.value)}
          aria-label="Nome da seção"
          style={{ fontWeight: 700, color: '#c9a227', fontSize: 13, flex: 1, background: 'transparent', border: '1px solid transparent' }}
          onFocus={e => e.target.style.border = '1px solid #2a2a2a'}
          onBlur={e => e.target.style.border = '1px solid transparent'}
        />
        {maoDeObra && (
          <span style={{ fontSize: 12, color: '#6f7f8f' }} title={'Define qual referência de mercado a lista de serviços sugere (cadastro do cliente: tipo "Órgão Público" → oficial)'}>
            Preços sugeridos: cliente {segmento === 'publico' ? 'órgão público (referência oficial)' : 'particular'}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Subtotal: <b style={{ color: '#c9a227' }}>{formatarMoeda(subtotalSecao(itens, sec.id))}</b></span>
        <button onClick={() => onRemover(sec.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover seção">
          <Trash2 size={13} />
        </button>
      </div>

      {itens.filter(it => it.sid === sec.id).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          <span>{maoDeObra ? 'Subgrupo' : 'Categoria'}</span>
          <span>{maoDeObra ? 'Serviço' : 'Catálogo'}</span>
          <span>Descrição</span>
          {!maoDeObra && <span>NCM/SH</span>}
          <span>Qtd</span><span>Un.</span><span>Vlr. Unit.</span><span>Total</span><span>Status</span><span />
        </div>
      )}

      {itensAgrupados(itens, sec.id).map(l => {
        if (l.tipo === 'cabecalho') {
          return (
            <div key={l.key} style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, marginBottom: 6 }}>
              {l.nome}
            </div>
          );
        }
        if (l.tipo === 'subtotal') {
          return (
            <div key={l.key} style={{ textAlign: 'right', fontSize: 12, color: 'var(--texto-3)', paddingRight: 4, marginBottom: 10 }}>
              Subtotal {l.nome}: <b style={{ color: '#c9a227' }}>{formatarMoeda(l.soma)}</b>
            </div>
          );
        }
        const it = l.item;
        return (
          <LinhaItem
            key={it.id}
            {...linha}
            colunas={colunas}
            it={it}
            maoDeObra={maoDeObra}
            materiais={materiais}
            opcoesSubgrupo={opcoesSubgrupo}
            pesquisa={pesquisas[it.id]}
            segmento={segmento}
          />
        );
      })}

      <button onClick={() => onAdicionarItem(sec.id)} style={{ ...btnSecundario, marginTop: 4 }}>
        <Plus size={13} style={{ marginRight: 4 }} /> Adicionar item
      </button>
    </div>
  );
}
