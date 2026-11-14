import { Plus, Trash2 } from 'lucide-react';
import { card, tituloSecao, inputPonto, btnSecundario } from './estilos';

// Cartões de pontos da análise: os pontos codificados no desenho (CAMnº/Rnº/Anº e a
// distribuição por ambiente) e os pontos por disciplina (editáveis, salvos pelo autosave).

// "Pontos Identificados no Projeto" — só quando a análise tem CFTV, rede ou antena
export function CartaoPontosCodificados({ analise }) {
  if (!(analise.disciplinas?.includes('cftv') || analise.disciplinas?.includes('rede') || analise.disciplinas?.includes('antena'))) return null;
  return (
    <div style={card}>
      <h3 style={tituloSecao}>Pontos Identificados no Projeto</h3>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 14, lineHeight: 1.6 }}>
        Cada ponto abaixo é identificado na planta por um código individual. "Ocorrências" é quantas vezes o
        código aparece no texto do PDF; "Pontos únicos" é a quantidade real de pontos físicos distintos — é
        esse o número usado no orçamento.
      </p>
      {analise.disciplinas.includes('cftv') && (
        <TabelaPontos titulo="Câmeras" prefixo="CAM" detalhe={analise.cameras?.detalhePorArquivo} />
      )}
      {analise.disciplinas.includes('rede') && (
        <TabelaPontos titulo="Pontos de rede" prefixo="R" detalhe={analise.pontosRedeAntena?.rede?.detalhePorArquivo} />
      )}
      {analise.disciplinas.includes('antena') && (
        <TabelaPontos titulo="Pontos de TV/antena" prefixo="A" detalhe={analise.pontosRedeAntena?.antena?.detalhePorArquivo} />
      )}

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #1e1e1e' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 6 }}>Pontos por Ambiente</div>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 12, lineHeight: 1.6 }}>
          Distribuição <b>aproximada</b> — calculada pela posição de cada código no desenho, sem noção de
          parede ou fronteira entre salas. Confira sempre contra a planta antes de usar. Só aparece ambiente
          com pelo menos 1 ponto identificado.
        </p>
        <TabelaPontosPorAmbiente linhas={analise.pontosPorAmbiente} disciplinas={analise.disciplinas} />
      </div>
    </div>
  );
}

// "Pontos por Disciplina": marcação com tipo, modelo e quantidade das disciplinas SELECIONADAS
// (é o que evita sair caçando disciplina que não foi escolhida). onAtualizar(disc, idx, campo, valor).
export function CartaoPontosPorDisciplina({ analise, disciplinas, onAtualizar, onRemover, onAdicionar }) {
  return (
    <div style={card}>
      <h3 style={tituloSecao}>Pontos por Disciplina</h3>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 14, lineHeight: 1.6 }}>
        Marcação por disciplina com tipo, modelo e quantidade — preenchida pela análise do Claude Desktop (inclusive elétrica, iluminação e outras que a contagem por código não alcança) e editável aqui. Só aparecem as disciplinas selecionadas na análise; sempre confira contra a planta.
      </p>
      {(analise.disciplinas || []).length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--texto-3)', fontStyle: 'italic', margin: 0 }}>Nenhuma disciplina selecionada nesta análise.</p>
      )}
      {(analise.disciplinas || []).map(disc => {
        const grupo = (analise.pontosPorDisciplina || []).find(g => g.disciplina === disc);
        const itens = grupo?.itens || [];
        const nomeDisc = disciplinas.find(d => d.chave === disc)?.nome || disc;
        return (
          <div key={disc} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#c9a227' }}>{nomeDisc}</div>
              <button type="button" onClick={() => onAdicionar(disc)} style={{ ...btnSecundario, padding: '3px 8px', fontSize: 12 }}>
                <Plus size={11} style={{ marginRight: 3 }} /> Adicionar ponto
              </button>
            </div>
            {itens.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--texto-3)', fontStyle: 'italic', margin: 0 }}>Nenhum ponto marcado ainda para esta disciplina.</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.4fr 0.7fr 1.6fr 28px', gap: 8, fontSize: 12, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  <span>Descrição</span><span>Tipo</span><span>Modelo</span><span>Qtd</span><span>Observação</span><span />
                </div>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.4fr 0.7fr 1.6fr 28px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input value={it.descricao || ''} onChange={(e) => onAtualizar(disc, idx, 'descricao', e.target.value)} style={inputPonto} aria-label={`${nomeDisc} — descrição`} />
                    <input value={it.tipo || ''} onChange={(e) => onAtualizar(disc, idx, 'tipo', e.target.value)} style={inputPonto} aria-label={`${nomeDisc} — tipo`} />
                    <input value={it.modelo || ''} onChange={(e) => onAtualizar(disc, idx, 'modelo', e.target.value)} style={inputPonto} aria-label={`${nomeDisc} — modelo`} />
                    <input type="number" min="0" value={it.quantidade ?? 0} onChange={(e) => onAtualizar(disc, idx, 'quantidade', e.target.value === '' ? 0 : Number(e.target.value))} style={{ ...inputPonto, textAlign: 'right' }} aria-label={`${nomeDisc} — quantidade`} />
                    <input value={it.observacao || ''} onChange={(e) => onAtualizar(disc, idx, 'observacao', e.target.value)} style={inputPonto} aria-label={`${nomeDisc} — observação`} />
                    <button type="button" title="Remover ponto" aria-label="Remover ponto"
                      onClick={() => {
                        // o salvamento automático grava em ~1,5 s: sem pergunta, um clique errado some com o ponto
                        const nome = (it.descricao || '').trim();
                        if (!window.confirm(`Remover o ponto${nome ? ` "${nome}"` : ''}${it.quantidade ? ` (${it.quantidade} un.)` : ''} da análise?`)) return;
                        onRemover(disc, idx);
                      }}
                      style={{ background: 'none', border: 'none', color: '#8a4040', cursor: 'pointer', padding: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Tabela de um tipo de ponto codificado (câmera/rede/antena) — mostra, por
// arquivo, quantas ocorrências do código apareceram, quantos pontos únicos
// isso representa, a lista dos próprios códigos encontrados e os avisos de
// duplicidade/numeração com falha. Sem essa lista, o número sozinho ("77")
// não dizia se era câmera, rede ou antena, nem dava pra conferir contra a
// planta quais códigos entraram na conta.
function TabelaPontos({ titulo, prefixo, detalhe }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 8 }}>
        {titulo} — código {prefixo}nº (ex.: {prefixo}1, {prefixo}2...)
      </div>
      {!detalhe || detalhe.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--texto-3)', fontStyle: 'italic' }}>Nenhum código {prefixo}nº identificado nos arquivos analisados.</p>
      ) : (
        detalhe.map((d, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none', fontSize: 13 }}>
            <div style={{ color: '#ccc', marginBottom: 4 }}>
              <b>{d.arquivo}</b> — {d.ocorrencias} ocorrências, {d.total} pontos únicos
            </div>
            <div style={{ color: 'var(--texto-3)', fontSize: 12, marginBottom: 4 }}>
              Códigos: {d.unicas.map(n => prefixo + n).join(', ')}
            </div>
            {d.repetidas.length > 0 && (
              <div style={{ color: '#c9a227', fontSize: 12 }}>Repetidos: {d.repetidas.map(n => prefixo + n).join(', ')}</div>
            )}
            {d.faltando.length > 0 && (
              <div style={{ color: '#c9a227', fontSize: 12 }}>Faltando na numeração: {d.faltando.map(n => prefixo + n).join(', ')}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Tabela "Pontos por Ambiente" — mesmo formato da planilha de referência da
// empresa (Ambiente | Rede | TV/Antena | Câmeras | Total), colunas variando
// conforme a disciplina selecionada. Sempre aproximada (ver
// utils/pontosPorAmbiente.js no backend) — daí o aviso logo acima, no card.
function TabelaPontosPorAmbiente({ linhas, disciplinas }) {
  const colunas = [
    disciplinas?.includes('rede') && { chave: 'rede', titulo: 'Rede' },
    disciplinas?.includes('antena') && { chave: 'antena', titulo: 'TV/Antena' },
    disciplinas?.includes('cftv') && { chave: 'cftv', titulo: 'Câmeras' },
  ].filter(Boolean);

  if (!linhas || linhas.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--texto-3)', fontStyle: 'italic' }}>Não foi possível estimar a distribuição por ambiente nos arquivos analisados.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ fontSize: 12, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
          <th style={{ padding: '4px 8px 8px 0' }}>Ambiente</th>
          {colunas.map(c => <th key={c.chave} style={{ padding: '4px 8px 8px 0', textAlign: 'right' }}>{c.titulo}</th>)}
          <th style={{ padding: '4px 0 8px 0', textAlign: 'right' }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map(l => (
          <tr key={l.ambiente} style={{ borderTop: '1px solid #1e1e1e' }}>
            <td style={{ padding: '6px 8px 6px 0' }}>{l.ambiente}</td>
            {colunas.map(c => <td key={c.chave} style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: 'var(--texto-2)' }}>{l[c.chave]}</td>)}
            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>{l.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
