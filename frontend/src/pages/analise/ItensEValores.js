import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import BlocoPesquisaMercado from '../../components/PesquisaMercado';
import { formatarMoeda } from '../../utils/format';
import { estilos } from '../../components/ui/estilos';
import { CartaoPontosCodificados, CartaoPontosPorDisciplina } from './CartoesPontos';

// Aba "Itens e valores" da análise (2.48). Antes eram 5 cartões soltos — Estimativa, Serviços, Materiais, Pontos
// identificados e Pontos por disciplina — e na Elaboração os itens ficavam escondidos num "Detalhes da leitura". Agora:
// a estimativa no alto, UMA tabela com mão de obra e materiais (filtro e busca) e a contagem por código / pontos por
// disciplina recolhidas no fim. Tudo em leitura, menos o "Já pronto" (escopo): quantidade, preço, pesquisa de mercado e
// referências são revisados no editor do orçamento.

// o preço que vai para o rascunho (backend: controllers/projetos/orcamento.js) — pesquisa adotada vence o catálogo
export const precoDoMaterial = (m) => (Number(m.preco_unitario) > 0 ? Number(m.preco_unitario) : (Number(m.preco_catalogo) || 0));
export const precoDoItem = (it) => (it.tipo === 'servico' ? (Number(it.valor_unitario) || 0) : precoDoMaterial(it));

// soma do que não está "Já pronto" — mesmo cálculo do resumo do relatório PDF (relatorioCompatibilizacaoTemplate.js)
export function estimativaDa(analise) {
  const soma = (lista, preco) => lista.filter(x => !x.pronto).reduce((t, x) => t + (Number(x.quantidade) || 0) * preco(x), 0);
  const maoDeObra = soma(analise.servicos || [], s => Number(s.valor_unitario) || 0);
  const materiais = soma(analise.materiais || [], precoDoMaterial);
  return { maoDeObra, materiais, total: maoDeObra + materiais };
}

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['servico', 'Mão de obra', it => it.tipo === 'servico'],
  ['material', 'Materiais', it => it.tipo === 'material'],
  ['sem_qtd', 'Sem quantidade', it => !it.pronto && !(Number(it.quantidade) > 0)],
  ['ia', 'Sugeridos pela IA', it => !!it.sugerido_ia],
  ['pronto', 'Já pronto', it => !!it.pronto],
];
const BLOCOS = [['servico', 'Mão de obra'], ['material', 'Materiais e equipamentos']];
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const celula = { padding: '7px 8px', verticalAlign: 'top' };
const chip = (sel) => ({
  padding: '4px 10px', borderRadius: 14, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  border: `1px solid ${sel ? '#c9a227' : 'var(--borda-forte)'}`, background: sel ? '#1f1c12' : 'transparent', color: sel ? '#c9a227' : 'var(--texto-2)',
});

export default function ItensEValores({ analise, disciplinas, elaboracao, onPronto, onAbrirNoEditor, pontos, filtroInicial = 'todos' }) {
  const [filtro, setFiltro] = useState(filtroInicial);
  const [busca, setBusca] = useState('');
  const est = estimativaDa(analise);
  const nomeDisc = (chave) => disciplinas.find(d => d.chave === chave)?.nome?.split(/ — | \(/)[0] || chave;

  const todos = useMemo(() => [
    ...(analise.servicos || []).map(s => ({ ...s, tipo: 'servico' })),
    ...(analise.materiais || []).map(m => ({ ...m, tipo: 'material' })),
  ], [analise.servicos, analise.materiais]);
  const f = (FILTROS.find(([k]) => k === filtro) || FILTROS[0])[2];
  const termo = semAcento(busca.trim());
  const visiveis = todos.filter(it => f(it) && (!termo || semAcento(`${it.descricao} ${it.subgrupo} ${it.observacao} ${it.descricao_catalogo}`).includes(termo)));

  return (
    <div data-testid="aba-itens">
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 14 }} data-testid="estimativa">
        <Valor rotulo="Mão de obra" valor={est.maoDeObra} />
        <Valor rotulo="Materiais e equipamentos" valor={est.materiais} />
        <Valor rotulo={elaboracao ? 'Total (referência)' : 'Total estimado'} valor={est.total} destaque />
        {analise.propostaId && (
          <button type="button" onClick={onAbrirNoEditor} style={{ ...estilos.btnSecundario, marginLeft: 'auto', padding: '6px 12px' }}>
            <ExternalLink size={12} /> Orçamento {analise.propostaNumero} no editor
          </button>
        )}
      </div>
      <p style={{ ...estilos.ajuda, fontSize: 12 }}>
        Só informação: o valor que vale é o da proposta. Quantidade, preço e pesquisa de mercado são revisados no editor do orçamento.
        Marque <b>Já pronto</b> no que já existe na obra (sai do orçamento). Item com quantidade 0 fica fora do rascunho.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {FILTROS.map(([k, rotulo, fn]) => {
          const n = todos.filter(fn).length;
          if (k !== 'todos' && !n) return null;
          return <button key={k} type="button" style={chip(filtro === k)} onClick={() => setFiltro(k)} data-testid={`filtro-itens-${k}`}>{rotulo} ({n})</button>;
        })}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item…" aria-label="Buscar item"
          style={{ marginLeft: 'auto', minWidth: 180, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', fontSize: 12.5, padding: '6px 9px' }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} data-testid="tabela-itens">
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--texto-3)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.4px' }}>
              <th style={celula}>Item</th><th style={celula}>Disciplina</th><th style={{ ...celula, textAlign: 'right' }}>Qtd</th><th style={celula}>Un.</th>
              <th style={{ ...celula, textAlign: 'right' }}>Unitário</th><th style={{ ...celula, textAlign: 'right' }}>Total</th><th style={celula}>Escopo</th>
            </tr>
          </thead>
          <tbody>
            {!visiveis.length && <tr><td colSpan={7} style={{ ...celula, color: 'var(--texto-3)', padding: '18px 8px' }}>{todos.length ? 'Nenhum item neste filtro.' : 'Nenhum item extraído do projeto — lance os itens no editor do orçamento.'}</td></tr>}
            {BLOCOS.map(([tipo, titulo]) => {
              const doBloco = visiveis.filter(it => it.tipo === tipo);
              if (!doBloco.length) return null;
              const subtotal = doBloco.filter(it => !it.pronto).reduce((t, it) => t + (Number(it.quantidade) || 0) * precoDoItem(it), 0);
              let sub = null;
              const linhas = [];
              for (const it of doBloco) {
                const sg = (it.subgrupo || '').trim() || null;
                if (sg && sg !== sub) linhas.push(<tr key={`sg-${tipo}-${it.id}`}><td colSpan={7} style={{ ...celula, paddingTop: 10, fontSize: 11.5, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{sg}</td></tr>);
                sub = sg;
                linhas.push(<LinhaItem key={it.id} it={it} nomeDisc={nomeDisc} onPronto={(v) => onPronto(tipo === 'servico' ? 'servicos' : 'materiais', it.id, v)} />);
              }
              return [
                <tr key={`bloco-${tipo}`} style={{ background: 'var(--superficie-2)' }} data-testid={`bloco-${tipo}`}>
                  <td colSpan={5} style={{ ...celula, fontWeight: 700, color: '#c9a227' }}>{titulo} <span style={{ fontWeight: 400, color: 'var(--texto-3)' }}>({doBloco.length})</span></td>
                  <td style={{ ...celula, textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>{formatarMoeda(subtotal)}</td><td style={celula} />
                </tr>,
                ...linhas,
              ];
            })}
          </tbody>
        </table>
      </div>

      {pontos && (
        <details style={{ marginTop: 16 }} data-testid="detalhes-pontos">
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--texto-2)' }}>Contagem por código e pontos por disciplina (leitura do PDF)</summary>
          <div style={{ marginTop: 12 }}>
            <CartaoPontosCodificados analise={analise} />
            <CartaoPontosPorDisciplina analise={analise} disciplinas={disciplinas} {...pontos} />
          </div>
        </details>
      )}
    </div>
  );
}

function Valor({ rotulo, valor, destaque }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{rotulo}</div>
      <div style={{ fontSize: destaque ? 20 : 16, fontWeight: 700, color: destaque ? '#c9a227' : 'var(--texto)' }}>{formatarMoeda(valor)}</div>
    </div>
  );
}

// uma linha: descrição (com a observação e as marcas embaixo), números e o "Já pronto"
function LinhaItem({ it, nomeDisc, onPronto }) {
  const servico = it.tipo === 'servico';
  const semQtd = !it.pronto && !(Number(it.quantidade) > 0);
  const preco = precoDoItem(it);
  const total = (Number(it.quantidade) || 0) * preco;
  const adotado = !servico && Number(it.preco_unitario) > 0;
  const semPreco = !(preco > 0);
  return (
    <>
      <tr style={{ borderTop: '1px solid #1e1e1e', opacity: it.pronto ? 0.5 : 1 }} data-testid="linha-item">
        <td style={{ ...celula, color: '#ddd', minWidth: 240 }}>
          {it.descricao || <i style={{ color: 'var(--texto-3)' }}>(sem descrição)</i>}
          {it.sugerido_ia && (
            <span title={`Item lido pela IA${it.ia_de_cache ? ' (resposta guardada de uma leitura anterior)' : ''} — confira no projeto; entra no orçamento como "a cotar"`}
              style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 6px', borderRadius: 3, border: '1px solid #4a3f6b', color: '#b9a6ff', whiteSpace: 'nowrap' }}>IA — conferir</span>
          )}
          {(it.observacao || it.referencia_fabricante || (!servico && it.descricao_catalogo)) && (
            <div style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 2, lineHeight: 1.4 }}>
              {[it.referencia_fabricante && `Ref. ${it.referencia_fabricante}`, !servico && it.descricao_catalogo && `catálogo: ${it.descricao_catalogo}${it.confianca_catalogo != null ? ` (${it.confianca_catalogo}%)` : ''}`, it.observacao].filter(Boolean).join(' · ')}
            </div>
          )}
        </td>
        <td style={{ ...celula, color: 'var(--texto-2)', fontSize: 12 }}>{it.disciplina ? nomeDisc(it.disciplina) : '—'}</td>
        <td style={{ ...celula, textAlign: 'right', color: semQtd ? '#c9a227' : '#ccc', fontWeight: semQtd ? 700 : 400 }}
          title={semQtd ? 'Quantidade 0: confira na planta — fica fora do rascunho do orçamento' : undefined}>{Number(it.quantidade) || 0}</td>
        <td style={{ ...celula, color: 'var(--texto-2)' }}>{it.unidade || '—'}</td>
        <td style={{ ...celula, textAlign: 'right', whiteSpace: 'nowrap', color: semPreco ? '#a08a3a' : 'var(--texto-2)' }}
          title={adotado ? 'Pesquisa de mercado adotada (vence o catálogo)' : semPreco ? 'Sem preço — entra "a cotar" no orçamento' : undefined}>
          {semPreco ? 'a cotar' : formatarMoeda(preco)}{adotado && <span style={{ color: '#c9a227' }}> *</span>}
        </td>
        <td style={{ ...celula, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{total > 0 ? formatarMoeda(total) : '—'}</td>
        <td style={celula}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: it.pronto ? '#3fb95f' : '#999', whiteSpace: 'nowrap', cursor: 'pointer' }}
            title='"Já pronto": já existe na obra, não faz parte do escopo orçado'>
            <input type="checkbox" checked={!!it.pronto} onChange={e => onPronto(e.target.checked)} style={{ width: 'auto', margin: 0 }} /> Já pronto
          </label>
        </td>
      </tr>
      {it.pesquisa_mercado?.resultado && (
        <tr><td colSpan={7} style={{ padding: '0 8px 8px' }}><BlocoPesquisaMercado pesquisa={{ ...it.pesquisa_mercado, recolhidaInicial: true }} /></td></tr>
      )}
    </>
  );
}
