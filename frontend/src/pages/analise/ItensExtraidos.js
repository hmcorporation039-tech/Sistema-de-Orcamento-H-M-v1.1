import BlocoPesquisaMercado from '../../components/PesquisaMercado';
import { formatarMoeda } from '../../utils/format';
import { card, tituloSecao } from './estilos';

// Agrupa itens por subgrupo (na ordem em que aparecem, sem reordenar) —
// mesma ideia do agrupamento por subgrupo já usado no Orçamento.
function agruparPorSubgrupo(itens) {
  const linhas = [];
  let ultimo = null;
  for (const it of itens) {
    const sg = (it.subgrupo || '').trim() || null;
    if (sg !== ultimo) {
      if (sg) linhas.push({ tipo: 'cabecalho', nome: sg, key: `cab_${it.id}` });
      ultimo = sg;
    }
    linhas.push({ tipo: 'item', item: it });
  }
  return linhas;
}

// Serviços e materiais extraídos do projeto (dois cartões). Na Elaboração de projeto os
// itens do PDF ficam recolhidos, só como referência. onPronto(lista, id, valor).
export default function ItensExtraidos({ analise, disciplinas, elaboracao, onPronto }) {
  const tabelas = (
    <>
      <div style={card}>
        <h3 style={tituloSecao}>Serviços (Mão de Obra) — extraídos do projeto</h3>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 10, lineHeight: 1.6 }}>
          Leitura do que a análise montou a partir dos arquivos do projeto. Quantidade, preço, pesquisa de mercado e referências são
          revisados no editor do orçamento ("Gerar orçamento e abrir no editor", abaixo). Marque "Já pronto" para o que
          não faz parte do seu escopo (ex.: cabeamento já passado) — sai do orçamento e do relatório como pendência.
        </p>
        <TabelaItensLeitura tipo="servico" itens={analise.servicos} disciplinas={disciplinas}
          onPronto={(id, v) => onPronto('servicos', id, v)} />
      </div>

      <div style={card}>
        <h3 style={tituloSecao}>Materiais / Equipamentos — extraídos do projeto</h3>
        {analise.materiais.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-3)', fontStyle: 'italic' }}>Nenhum material extraído do projeto — lance os materiais no editor do orçamento (catálogo ou digitados).</p>
        ) : (
          <TabelaItensLeitura tipo="material" itens={analise.materiais} disciplinas={disciplinas}
            onPronto={(id, v) => onPronto('materiais', id, v)} />
        )}
      </div>
    </>
  );
  // Elaboração de projeto: os itens do PDF ficam recolhidos, só como referência
  return elaboracao ? (
    <details style={{ ...card, padding: '14px 22px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--texto-2)', fontWeight: 700 }}>
        Itens extraídos do projeto (referência) — {analise.servicos.length} serviço(s), {analise.materiais.length} material(is)
      </summary>
      <div style={{ marginTop: 14 }}>{tabelas}</div>
    </details>
  ) : tabelas;
}

// Itens extraídos do projeto (serviços ou materiais), só LEITURA — versão 2.0,
// editor único de orçamento: quantidade, valor unitário, "Ref.: … usar",
// referências oficial/particular e "Pesquisar mercado" por item saíram daqui
// e estão no editor da proposta (pages/Orcamento.js). Fica o que a análise
// leu do PDF (descrição, quantidade, unidade, disciplina, observação/origem)
// e a sugestão de preço como informação. Quantidade 0 = modelo da disciplina
// ainda não conferido na planta: o gerar deixa de fora (o editor lista para
// incluir). Só o "Já pronto" continua editável (escopo da obra).
export function TabelaItensLeitura({ tipo, itens, disciplinas, onPronto }) {
  const servico = tipo === 'servico';
  const colunas = '2.4fr 1fr 0.5fr 0.5fr 1.5fr 1.8fr 0.8fr';
  const nomeDisc = (chave) => disciplinas.find(d => d.chave === chave)?.nome || chave;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, marginBottom: 8, fontSize: 12, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Disciplina</span><span>Qtd</span><span>Un.</span><span>Sugestão de preço</span><span>Observação / origem</span><span>Escopo</span>
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        const semQtd = !it.pronto && !(Number(it.quantidade) > 0);
        return (
          <div key={it.id} style={{ marginBottom: 10, borderBottom: '1px solid #1e1e1e', paddingBottom: 10, opacity: it.pronto ? 0.55 : 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, alignItems: 'start', fontSize: 13 }}>
              <div style={{ color: '#ddd' }}>
                {it.descricao || <i style={{ color: 'var(--texto-3)' }}>(sem descrição)</i>}
                {it.referencia_fabricante && <div style={{ color: 'var(--texto-3)', fontSize: 12 }}>Ref. fabricante: {it.referencia_fabricante}</div>}
                {it.sugerido_ia && (
                  <span title={`Item lido pela IA${it.ia_de_cache ? ' (resposta guardada de uma leitura anterior)' : ''} — confira no projeto; entra no orçamento como "a cotar"`}
                    style={{ display: 'inline-block', marginTop: 3, fontSize: 10.5, padding: '1px 6px', borderRadius: 3, border: '1px solid #4a3f6b', color: '#b9a6ff' }}>
                    sugerido pela IA — conferir
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--texto-2)', fontSize: 12 }}>{it.disciplina ? nomeDisc(it.disciplina) : (it.subgrupo || '—')}</span>
              <span style={{ color: semQtd ? '#c9a227' : '#ccc', fontWeight: semQtd ? 700 : 400 }}
                title={semQtd ? 'Quantidade 0: confira na planta — este item fica fora do rascunho do orçamento' : undefined}>
                {Number(it.quantidade) || 0}
              </span>
              <span style={{ color: 'var(--texto-2)' }}>{it.unidade || '—'}</span>
              <div style={{ fontSize: 12 }}>
                {servico ? <SugestaoServico it={it} /> : <SugestaoMaterial it={it} />}
              </div>
              <span style={{ color: 'var(--texto-3)', fontSize: 12, lineHeight: 1.45 }}>
                {it.observacao || '—'}
                {semQtd && <div style={{ color: '#a08a3a', marginTop: 3 }}>Quantidade 0 — fica fora do rascunho; inclua no editor se fizer parte.</div>}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: it.pronto ? '#3fb95f' : '#999', whiteSpace: 'nowrap' }}
                title='"Já pronto": já existe na obra, não faz parte do escopo orçado'>
                <input type="checkbox" checked={!!it.pronto} onChange={e => onPronto(it.id, e.target.checked)} />
                Já pronto
              </label>
            </div>
            {/* pesquisa que ficou salva no item (de antes do editor único), só para consulta */}
            {it.pesquisa_mercado?.resultado && (
              <BlocoPesquisaMercado pesquisa={{ ...it.pesquisa_mercado, recolhidaInicial: true }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Serviço: o valor que a análise sugeriu (vai para o rascunho) e as referências
// de mão de obra (H&M, oficial/governo, particular) — tudo como informação.
function SugestaoServico({ it }) {
  const valor = Number(it.valor_unitario) || 0;
  const refs = [
    ['Ref.', it.valor_referencia_mercado, 'Referência H&M (tela Preços de Mão de Obra)'],
    ['oficial', it.referencias_mercado?.publico, 'Referência oficial / governo (SINAPI, ORSE, licitações)'],
    ['particular', it.referencias_mercado?.privado, 'Referência do mercado particular'],
  ].filter(([, v]) => v != null && Number(v) !== valor);
  return (
    <>
      {valor > 0
        ? <div style={{ color: '#c9a227' }}><b>{formatarMoeda(valor)}</b> <span style={{ color: 'var(--texto-3)' }}>(vai para o rascunho)</span></div>
        : <div style={{ color: '#a08a3a' }}>Sem preço — entra "a cotar"</div>}
      {refs.map(([rot, v, titulo]) => (
        <div key={rot} style={{ fontSize: 12, color: '#6f7f8f', marginTop: 2 }} title={titulo}>{rot}: {formatarMoeda(v)}</div>
      ))}
    </>
  );
}

// Material: preço adotado de uma pesquisa (tem prioridade ao gerar) e/ou a
// correspondência no catálogo, com a confiança e a descrição do catálogo.
function SugestaoMaterial({ it }) {
  const adotado = Number(it.preco_unitario) > 0;
  return (
    <>
      {adotado && (
        <div style={{ color: '#c9a227' }}><b>{formatarMoeda(it.preco_unitario)}</b> <span style={{ color: 'var(--texto-3)' }}>(pesquisa de mercado adotada)</span></div>
      )}
      {it.preco_catalogo != null ? (
        <div style={{ color: adotado ? '#777' : it.confianca_catalogo >= 70 ? '#3fb95f' : '#c9a227' }}>
          {adotado ? 'catálogo: ' : ''}<b>{formatarMoeda(it.preco_catalogo)}</b> ({it.confianca_catalogo}% match)
          <div style={{ color: 'var(--texto-3)', fontSize: 12 }} title={it.descricao_catalogo}>{it.descricao_catalogo}</div>
        </div>
      ) : !adotado && (
        <div style={{ color: '#a08a3a' }}>Sem correspondência no catálogo — entra "a cotar"</div>
      )}
    </>
  );
}
