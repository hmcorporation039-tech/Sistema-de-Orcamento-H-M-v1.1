import { Link } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { linkDaOrigem, nomeDoRegistro } from './apoio';
import { btnSecundario, card } from './estilos';

// Aviso de que a proposta foi gerada por uma análise de projeto ou por um laudo/projeto, com o
// link de volta e os itens que ficaram de fora por estarem com quantidade 0.
export default function AvisoOrigem({ incluirFaltante, origem }) {
  return (
    <div style={{ ...card, padding: '12px 16px', borderColor: '#3a3216' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.5 }}>
          Rascunho gerado a partir {origem.tipo === 'analise'
            ? <>da <b style={{ color: '#c9a227' }}>Análise de Projeto #{origem.id}</b></>
            : <>do <b style={{ color: '#c9a227' }}>{nomeDoRegistro(origem)} #{origem.id}</b>{origem.rotulo ? ` (${origem.rotulo})` : ''}</>}
          {origem.titulo ? ` — ${origem.titulo}` : ''}.{' '}
          <span style={{ color: 'var(--texto-3)' }}>
            {origem.existe === false
              ? (origem.tipo === 'analise' ? 'A análise foi excluída.' : `O ${nomeDoRegistro(origem)} foi excluído.`)
              : origem.vinculada === false
                ? 'A origem hoje está vinculada a outra proposta (esta pode ser uma cópia).'
                : `Quantidades, preços, pesquisa de mercado e referências são revisados aqui. ${origem.tipo === 'analise' ? '"Atualizar orçamento" na análise' : `"Atualizar e abrir" no ${nomeDoRegistro(origem)}`} substitui os itens desta proposta pelos de lá.`}
          </span>
        </div>
        {origem.existe !== false && (
          <Link to={linkDaOrigem(origem)} style={{ ...btnSecundario, textDecoration: 'none', borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }}>
            <ArrowLeft size={13} style={{ marginRight: 4 }} /> Voltar {origem.tipo === 'analise' ? 'à análise' : `ao ${nomeDoRegistro(origem)}`}
          </Link>
        )}
      </div>
      {origem.faltando?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #222', fontSize: 12, color: 'var(--texto-2)' }}>
          <div style={{ marginBottom: 6 }}>
            {origem.faltando.length} item(ns) da análise ficaram fora do rascunho por estarem com <b>quantidade 0</b> (modelo ainda não conferido na planta). Inclua os que fizerem parte e informe a quantidade:
          </div>
          {origem.faltando.map((x, i) => (
            <div key={`${x.tipo}_${i}_${x.descricao}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ flex: 1, color: 'var(--texto-2)' }}>{x.descricao} <span style={{ color: 'var(--texto-3)' }}>({x.tipo === 'servico' ? 'serviço' : 'material'}{x.subgrupo ? ` — ${x.subgrupo}` : ''})</span></span>
              <button type="button" onClick={() => incluirFaltante(x)} style={{ ...btnSecundario, padding: '3px 10px', fontSize: 12 }}>
                <Plus size={11} style={{ marginRight: 3 }} /> Incluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
