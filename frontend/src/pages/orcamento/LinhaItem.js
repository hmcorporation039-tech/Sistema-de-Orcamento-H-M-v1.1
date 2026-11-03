import { Trash2, Search } from 'lucide-react';
import { formatarMoeda } from '../../utils/format';
import { totalDaLinha } from '../../utils/dinheiro';
import CampoMoeda from '../../components/CampoMoeda';
import BlocoPesquisaMercado from '../../components/PesquisaMercado';
import Select from '../../components/Select';
import { CATEGORIAS_MAO_DE_OBRA, filtrarCatalogoPorCategoria } from './apoio';
import { DicaCatalogo, DicaVendido, DicasReferencia } from './Dicas';
import { btnIcone, btnPesquisar, etiqueta } from './estilos';

// Uma linha de item do orçamento: categoria/subgrupo, catálogo ou serviço, descrição, quantidade,
// valor unitário com as dicas de preço, total, status e a pesquisa de mercado do item.
export default function LinhaItem({
  aplicarCategoriaMaoDeObra, aplicarMaterialNoItem, aplicarServicoNoItem, atualizarItem, colunas,
  gruposServicos, it, maoDeObra, materiais, materiaisPorId, opcoesSubgrupo, pesquisa, pesquisarMercado,
  removerItem, segmento, servicoDoItem, sugestaoDoServico, vendidos,
}) {
  const aCotar = it.status === 'a_cotar';
  const semPreco = !(Number(it.valor_unitario) > 0);
  return (
    <div
      style={{
        marginBottom: 8, background: aCotar ? 'rgba(201,162,39,0.08)' : 'transparent',
        borderRadius: 4, padding: aCotar ? '4px 4px' : 0,
      }}
    >
    <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, alignItems: 'start' }}>
      <Select
        value={it.subgrupo || ''}
        onChange={e => {
          if (e.target.value === '__novo__') {
            const novo = window.prompt(maoDeObra ? 'Nome do novo subgrupo:' : 'Nome da nova categoria:', it.subgrupo || '');
            if (novo !== null) atualizarItem(it.id, 'subgrupo', novo.trim());
            return;
          }
          atualizarItem(it.id, 'subgrupo', e.target.value);
        }}
      >
        <option value="">{maoDeObra ? '(sem subgrupo)' : '(sem categoria)'}</option>
        {opcoesSubgrupo.map(sg => <option key={sg} value={sg}>{sg}</option>)}
        {it.subgrupo && !opcoesSubgrupo.includes(it.subgrupo) && (
          <option value={it.subgrupo}>{it.subgrupo}</option>
        )}
        <option value="__novo__">{maoDeObra ? '+ novo subgrupo...' : '+ nova categoria...'}</option>
      </Select>
      {maoDeObra ? (
        <Select value="" onChange={e => {
          const [tipo, valor] = e.target.value.split('::');
          if (tipo === 'cat') aplicarCategoriaMaoDeObra(it.id, valor);
          else if (tipo === 'srv') aplicarServicoNoItem(it.id, valor);
        }} title="Serviços da base única (padrão + já lançados em propostas), com o preço sugerido para o segmento do cliente">
          <option value="">+ serviço</option>
          <optgroup label="Categorias">
            {CATEGORIAS_MAO_DE_OBRA.map(c => <option key={c} value={`cat::${c}`}>{c}</option>)}
          </optgroup>
          {gruposServicos.map(g => (
            <optgroup key={g.disc} label={g.nome}>
              {g.lista.map(s => {
                const sug = sugestaoDoServico(s);
                return <option key={s.codigo} value={`srv::${s.codigo}`}>{s.descricao}{sug != null ? ` — ${formatarMoeda(sug)}` : ''}</option>;
              })}
            </optgroup>
          ))}
        </Select>
      ) : (
        <Select value="" onChange={e => aplicarMaterialNoItem(it.id, e.target.value)}>
          <option value="">{it.subgrupo ? `+ catálogo (${it.subgrupo})` : '+ catálogo'}</option>
          {filtrarCatalogoPorCategoria(materiais, it.subgrupo).map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
        </Select>
      )}
      <div>
        <input value={it.descricao} onChange={e => atualizarItem(it.id, 'descricao', e.target.value)} placeholder="Descrição do item" style={{ width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => pesquisarMercado(it, maoDeObra)} disabled={pesquisa?.carregando}
            title={maoDeObra ? 'Pesquisa o preço deste serviço no mercado (busca real na web; leva de 30 s a 1 min)' : 'Pesquisa o preço deste material no mercado (busca real na web; leva de 30 s a 1 min)'}
            style={btnPesquisar}>
            <Search size={10} style={{ marginRight: 3 }} /> {pesquisa?.carregando ? 'Pesquisando...' : 'Pesquisar mercado'}
          </button>
          {aCotar && <span style={{ ...etiqueta, color: '#c9a227', borderColor: '#5a4a12' }} title='Preço estimado ou pendente — confirme antes de enviar ao cliente'>a cotar</span>}
          {semPreco && <span style={{ ...etiqueta, color: '#e08080', borderColor: '#5a2a2a' }} title="Item com valor unitário R$ 0,00">sem preço</span>}
        </div>
      </div>
      {!maoDeObra && (
        <input value={it.ncm} onChange={e => atualizarItem(it.id, 'ncm', e.target.value.replace(/[^\d.]/g, ''))} placeholder="NCM/SH" />
      )}
      <input type="number" step="any" min="0" value={it.quantidade} onChange={e => atualizarItem(it.id, 'quantidade', e.target.value)} />
      <input value={it.unidade} onChange={e => atualizarItem(it.id, 'unidade', e.target.value)} />
      {maoDeObra ? (
        <div>
          <CampoMoeda value={it.valor_unitario} onChange={v => atualizarItem(it.id, 'valor_unitario', v)} />
          <DicasReferencia servico={servicoDoItem(it)} segmento={segmento} valor={it.valor_unitario}
            onUsar={v => atualizarItem(it.id, 'valor_unitario', v)} />
        </div>
      ) : (
        <div>
          <CampoMoeda value={it.valor_unitario} onChange={v => atualizarItem(it.id, 'valor_unitario', v)} />
          <DicaCatalogo material={it.material_id ? materiaisPorId[String(it.material_id)] : null} valor={it.valor_unitario}
            onUsar={v => atualizarItem(it.id, 'valor_unitario', v)} />
          <DicaVendido faixa={it.material_id ? vendidos[it.material_id] : null} valor={it.valor_unitario}
            material={it.material_id ? materiaisPorId[String(it.material_id)] : null} />
        </div>
      )}
      <span style={{ fontSize: 12, color: '#ccc', textAlign: 'right', paddingRight: 4 }}>
        {formatarMoeda(totalDaLinha(it.quantidade, it.valor_unitario))}
      </span>
      <Select value={it.status || 'confirmado'} onChange={e => atualizarItem(it.id, 'status', e.target.value)}>
        <option value="confirmado">Confirmado</option>
        <option value="a_cotar">A cotar</option>
      </Select>
      <button onClick={() => removerItem(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover item">
        <Trash2 size={12} />
      </button>
    </div>
    {/* key com a data: a pesquisa que chega salva (da análise) já nasce recolhida */}
    <BlocoPesquisaMercado key={`${it.id}_${pesquisa?.pesquisadoEm || ''}`} pesquisa={pesquisa} precoAtual={it.valor_unitario}
      onUsarPreco={v => atualizarItem(it.id, 'valor_unitario', v)}
      onPesquisarDeNovo={pesquisa?.carregando ? null : () => pesquisarMercado(it, maoDeObra, true)} />
    {pesquisa?.erro && <div style={{ marginTop: 6, fontSize: 12, color: '#b04040' }}>{pesquisa.erro}</div>}
    </div>
  );
}
