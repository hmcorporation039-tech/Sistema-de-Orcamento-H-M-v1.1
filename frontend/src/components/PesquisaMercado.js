import { useState } from 'react';
import { formatarMoeda } from '../utils/format';

// Resultado da pesquisa de mercado de um item (material ou serviço) — antes
// morava dentro da Análise de Projeto; na versão 2.0 (editor único de
// orçamento) a pesquisa por item acontece no editor de propostas
// (pages/Orcamento.js), e a Análise só mostra, como informação, a pesquisa que
// já tinha ficado salva no item.
//
// RECOLHÍVEL: recolher/expandir é só visual, não refaz a busca nem grava nada.
// Começa recolhida só quando a pesquisa veio salva (recolhidaInicial); uma
// pesquisa feita agora nasce expandida. Sem `onUsarPreco` (modo leitura), o
// botão "Usar R$ X" não aparece — só a média e as ofertas.
// `onPesquisarDeNovo`: só aparece quando a pesquisa foi reaproveitada do histórico (cache de
// 7 dias) — pede uma consulta nova na web, ignorando a guardada.
export default function BlocoPesquisaMercado({ pesquisa, onUsarPreco, precoAtual, onPesquisarDeNovo }) {
  const [recolhida, setRecolhida] = useState(!!pesquisa?.recolhidaInicial);
  if (!pesquisa?.resultado) return null;
  const fonteLabel = pesquisa.fonte === 'claude' ? 'Claude, API paga'
    : pesquisa.fonte === 'claude_max' ? 'Claude Max'
    : pesquisa.fonte === 'gemini' ? 'Gemini'
    : (pesquisa.fonte || 'IA');
  const sugerido = Number(pesquisa.precoSugerido) || 0;
  const est = pesquisa.estatistica;
  return (
    <div style={{ marginTop: 8, padding: 12, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.5 }}>
      <div
        onClick={() => setRecolhida(r => !r)}
        title={recolhida ? 'Clique para expandir a pesquisa' : 'Clique para recolher a pesquisa'}
        style={{ display: 'flex', alignItems: 'baseline', gap: 6, cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ color: '#c9a227', fontSize: 12, width: 12, display: 'inline-block' }}>{recolhida ? '▸' : '▾'}</span>
        <b style={{ color: '#c9a227' }}>Pesquisa de mercado ({fonteLabel} — confira antes de usar):</b>
        {pesquisa.pesquisadoEm && (
          <span style={{ color: 'var(--texto-3)', fontWeight: 400 }}>
            {' '}— {pesquisa.deCache ? 'reaproveitada do histórico, ' : pesquisa.daAnalise ? 'salva na análise, ' : ''}feita em {new Date(pesquisa.pesquisadoEm).toLocaleString('pt-BR')}{idadeEmDias(pesquisa.pesquisadoEm)}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--texto-3)', fontSize: 12, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
          {recolhida ? 'expandir' : 'recolher'}
        </span>
      </div>
      {pesquisa.deCache && onPesquisarDeNovo && (
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={onPesquisarDeNovo} style={btnUsarPreco} title="Ignora a pesquisa guardada e consulta a web de novo (leva de 30 s a 1 min)">
            Pesquisar de novo
          </button>
        </div>
      )}
      {sugerido > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {onUsarPreco && (
            <button type="button" onClick={() => onUsarPreco(sugerido)} style={btnUsarPreco}>
              Usar {formatarMoeda(sugerido)}
            </button>
          )}
          <span style={{ color: 'var(--texto-3)' }}>
            {!onUsarPreco && <>média <b style={{ color: '#c9a227' }}>{formatarMoeda(sugerido)}</b> — </>}
            {est?.n || 0} oferta(s){est?.n ? ` — mín. ${formatarMoeda(est.minimo)}, máx. ${formatarMoeda(est.maximo)}` : ''}
            {precoAtual != null && Number(precoAtual) === sugerido ? ' · em uso' : ''}
          </span>
        </div>
      )}
      {!recolhida && (pesquisa.ofertas?.length ? (
        <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
          <tbody>
            {pesquisa.ofertas.map((o, i) => (
              <tr key={i} style={{ borderTop: '1px solid #1e1e1e', color: o.mesmo_item ? '#bbb' : '#777' }}>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{o.fonte}</td>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#c9a227' }}>{formatarMoeda(o.preco)}</td>
                <td style={{ padding: '4px 6px' }}>
                  {o.link ? <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ color: '#8ab4f8' }}>{o.produto || 'ver oferta'}</a> : o.produto}
                  {!o.mesmo_item && <span> (variação diferente — fora da média)</span>}
                  {o.observacao && <div style={{ color: 'var(--texto-3)', fontSize: 12 }}>{o.observacao}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{pesquisa.resultado}</div>
      ))}
    </div>
  );
}

// " (há 3 dias)" para preço que não é de hoje: preço velho não pode passar por novo
function idadeEmDias(iso) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return dias >= 1 ? ` (há ${dias} ${dias === 1 ? 'dia' : 'dias'})` : '';
}

// Monta, a partir da resposta de POST /pesquisa-mercado, o objeto que o bloco
// acima mostra (e que a Análise guardava no item como pesquisa_mercado).
export function resultadoDaPesquisa(dados) {
  return {
    resultado: dados.resultado, fonte: dados.fonte,
    pesquisadoEm: dados.pesquisadoEm || new Date().toISOString(), deCache: !!dados.deCache,
    ofertas: dados.ofertas || [], estatistica: dados.estatistica || null, precoSugerido: dados.precoSugerido ?? null,
  };
}

const btnUsarPreco = {
  display: 'flex', alignItems: 'center', padding: '4px 10px', background: 'transparent',
  border: '1px dashed #c9a227', borderRadius: 6, color: '#c9a227', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
