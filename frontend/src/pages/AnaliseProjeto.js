import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileDown, Plus, Trash2, FolderSearch, Search } from 'lucide-react';
import { analisarProjeto, gerarRelatorioCompatibilizacao, pesquisarPrecoMercado } from '../services/api';
import { formatarMoeda } from '../utils/format';

let contador = 0;
const gerarId = () => `tmp_${Date.now()}_${contador++}`;

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

export default function AnaliseProjeto() {
  const [arquivos, setArquivos] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [pesquisas, setPesquisas] = useState({}); // { [materialId]: { carregando, resultado, erro } }
  const inputRef = useRef(null);

  function selecionarArquivos(e) {
    setArquivos(Array.from(e.target.files || []));
  }

  async function analisar() {
    if (arquivos.length === 0) {
      toast.error('Selecione ao menos um PDF do projeto');
      return;
    }
    setAnalisando(true);
    try {
      const res = await analisarProjeto(arquivos);
      setAnalise({
        ...res.data,
        servicos: res.data.servicos.map(s => ({ ...s, id: gerarId() })),
        materiais: res.data.materiais.map(m => ({ ...m, id: gerarId() })),
      });
      toast.success(`Projeto analisado: ${res.data.ambientes.length} ambientes, ${res.data.cameras.total} câmeras`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao analisar o projeto');
    } finally {
      setAnalisando(false);
    }
  }

  function atualizarServico(id, campo, valor) {
    setAnalise(a => ({ ...a, servicos: a.servicos.map(s => s.id === id ? { ...s, [campo]: valor } : s) }));
  }

  function removerServico(id) {
    setAnalise(a => ({ ...a, servicos: a.servicos.filter(s => s.id !== id) }));
  }

  function adicionarServico() {
    setAnalise(a => ({
      ...a,
      servicos: [...a.servicos, { id: gerarId(), descricao: '', quantidade: 1, unidade: 'un', pronto: false, observacao: '' }],
    }));
  }

  function atualizarMaterial(id, campo, valor) {
    setAnalise(a => ({ ...a, materiais: a.materiais.map(m => m.id === id ? { ...m, [campo]: valor } : m) }));
  }

  function removerMaterial(id) {
    setAnalise(a => ({ ...a, materiais: a.materiais.filter(m => m.id !== id) }));
  }

  function adicionarMaterial() {
    setAnalise(a => ({
      ...a,
      materiais: [...a.materiais, { id: gerarId(), descricao: '', quantidade: 1, unidade: 'un', pronto: false }],
    }));
  }

  async function pesquisarMercado(material) {
    if (!material.descricao.trim()) {
      toast.error('Preencha a descrição antes de pesquisar');
      return;
    }
    setPesquisas(p => ({ ...p, [material.id]: { carregando: true } }));
    try {
      const res = await pesquisarPrecoMercado(material.descricao);
      setPesquisas(p => ({ ...p, [material.id]: { resultado: res.data.resultado } }));
    } catch (err) {
      setPesquisas(p => ({ ...p, [material.id]: { erro: err.response?.data?.erro || 'Erro ao pesquisar' } }));
    }
  }

  async function baixarRelatorio() {
    setGerando(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { servicos, materiais, ...resto } = analise;
      const payload = {
        ...resto,
        servicos: servicos.map(({ id, ...s }) => s),
        materiais: materiais.map(({ id, ...m }) => m),
      };
      const res = await gerarRelatorioCompatibilizacao(payload);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const nomeCliente = (analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      link.download = `Compatibilizacao_${nomeCliente}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Análise de Projeto (Compatibilização)</h2>
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.6 }}>
          Envie os PDFs do projeto do cliente (plantas de CFTV, cabeamento estruturado, etc.). O sistema extrai
          ambientes, contagem de câmeras e a legenda de cabos automaticamente (sem IA — leitura direta do texto do
          PDF), e monta um rascunho de serviços/materiais pra você revisar antes de gerar o relatório.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input ref={inputRef} type="file" accept=".pdf" multiple onChange={selecionarArquivos} />
          <button onClick={analisar} disabled={analisando} style={btnPrimario}>
            <FolderSearch size={13} style={{ marginRight: 6 }} /> {analisando ? 'Analisando...' : 'Analisar projeto'}
          </button>
        </div>
      </div>

      {analise && (
        <>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 16 }}>
              <Info label="Cliente" valor={analise.cliente || '—'} />
              <Info label="Ambientes" valor={analise.ambientes.length} />
              <Info label="Câmeras" valor={analise.cameras.total} />
              <Info label="Pontos de rede" valor={analise.pontosRedeAntena?.rede?.total ?? 0} />
              <Info label="Pontos de TV/antena" valor={analise.pontosRedeAntena?.antena?.total ?? 0} />
              <Info label="Pendências" valor={analise.achados.length} />
            </div>
          </div>

          {analise.achados.length > 0 && (
            <div style={card}>
              <h3 style={tituloSecao}>Compatibilização — Pendências e Observações</h3>
              {analise.achados.map((a, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c9a227', marginBottom: 2 }}>{a.tema}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{a.observacao}</div>
                </div>
              ))}
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Serviços (Mão de Obra)</h3>
              <button onClick={adicionarServico} style={btnSecundario}>
                <Plus size={12} style={{ marginRight: 4 }} /> Adicionar serviço
              </button>
            </div>
            <p style={{ fontSize: 10, color: '#666', marginBottom: 10 }}>
              Marque "Já pronto" pra serviços que não fazem parte do seu escopo (ex.: cabeamento já passado) — eles não entram no relatório como pendência de mão de obra.
            </p>
            <TabelaServicos itens={analise.servicos} onAtualizar={atualizarServico} onRemover={removerServico} />
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Materiais / Equipamentos</h3>
              <button onClick={adicionarMaterial} style={btnSecundario}>
                <Plus size={12} style={{ marginRight: 4 }} /> Adicionar material
              </button>
            </div>
            {analise.materiais.length === 0 && (
              <p style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>Nenhum material lançado ainda — adicione manualmente, ou lance na tela de Materiais e traga a lista final aqui.</p>
            )}
            <TabelaMateriais
              itens={analise.materiais}
              onAtualizar={atualizarMaterial}
              onRemover={removerMaterial}
              pesquisas={pesquisas}
              onPesquisar={pesquisarMercado}
            />
          </div>

          <div style={{ ...card, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={baixarRelatorio} disabled={gerando} style={{ ...btnPrimario, padding: '13px 26px', fontSize: 13 }}>
              <FileDown size={14} style={{ marginRight: 6 }} /> {gerando ? 'Gerando...' : 'Baixar Relatório PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TabelaServicos({ itens, onAtualizar, onRemover, semObservacao }) {
  const colunas = semObservacao
    ? '3fr 0.8fr 0.7fr 1fr 32px'
    : '2.2fr 0.7fr 0.6fr 1fr 2fr 32px';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Qtd</span><span>Un.</span><span>Status</span>
        {!semObservacao && <span>Observação</span>}
        <span />
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, marginBottom: 6 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        return (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={it.descricao} onChange={e => onAtualizar(it.id, 'descricao', e.target.value)} placeholder="Descrição" />
            <input type="number" step="1" min="0" value={it.quantidade ?? ''} onChange={e => onAtualizar(it.id, 'quantidade', e.target.value)} />
            <input value={it.unidade || ''} onChange={e => onAtualizar(it.id, 'unidade', e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: it.pronto ? '#3fb95f' : '#999' }}>
              <input type="checkbox" checked={!!it.pronto} onChange={e => onAtualizar(it.id, 'pronto', e.target.checked)} />
              Já pronto
            </label>
            {!semObservacao && (
              <input value={it.observacao || ''} onChange={e => onAtualizar(it.id, 'observacao', e.target.value)} placeholder="Observação" />
            )}
            <button onClick={() => onRemover(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Tabela de materiais/equipamentos: além dos campos editáveis, mostra o
// preço do catálogo quando o sistema achou uma correspondência (com a
// confiança e a descrição do catálogo lado a lado — pra ficar visível
// quando bateu errado, ex.: categoria de cabo diferente) e permite pesquisar
// o preço de mercado sob demanda (Gemini + busca real, nunca automático).
function TabelaMateriais({ itens, onAtualizar, onRemover, pesquisas, onPesquisar }) {
  const colunas = '2fr 1fr 0.6fr 0.6fr 1.6fr 1fr 32px';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Referência</span><span>Qtd</span><span>Un.</span><span>Catálogo / Mercado</span><span>Status</span><span />
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, marginBottom: 6 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        const pesquisa = pesquisas[it.id];
        return (
          <div key={it.id} style={{ marginBottom: 10, borderBottom: '1px solid #1e1e1e', paddingBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, alignItems: 'center' }}>
              <input value={it.descricao} onChange={e => onAtualizar(it.id, 'descricao', e.target.value)} placeholder="Descrição" />
              <input value={it.referencia_fabricante || ''} onChange={e => onAtualizar(it.id, 'referencia_fabricante', e.target.value)} placeholder="Ref. fabricante" style={{ fontSize: 10 }} />
              <input type="number" step="1" min="0" value={it.quantidade ?? ''} onChange={e => onAtualizar(it.id, 'quantidade', e.target.value)} />
              <input value={it.unidade || ''} onChange={e => onAtualizar(it.id, 'unidade', e.target.value)} />
              <div style={{ fontSize: 10 }}>
                {it.preco_catalogo != null ? (
                  <div style={{ color: it.confianca_catalogo >= 70 ? '#3fb95f' : '#c9a227' }}>
                    <b>{formatarMoeda(it.preco_catalogo)}</b> ({it.confianca_catalogo}% match)
                    <div style={{ color: '#777', fontSize: 9 }} title={it.descricao_catalogo}>{it.descricao_catalogo}</div>
                  </div>
                ) : (
                  <span style={{ color: '#666' }}>Sem correspondência no catálogo</span>
                )}
                <button
                  type="button"
                  onClick={() => onPesquisar(it)}
                  disabled={pesquisa?.carregando}
                  style={{ ...btnSecundario, padding: '3px 8px', fontSize: 9, marginTop: 4 }}
                >
                  <Search size={10} style={{ marginRight: 3 }} /> {pesquisa?.carregando ? 'Pesquisando...' : 'Pesquisar mercado'}
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: it.pronto ? '#3fb95f' : '#999' }}>
                <input type="checkbox" checked={!!it.pronto} onChange={e => onAtualizar(it.id, 'pronto', e.target.checked)} />
                Já pronto
              </label>
              <button onClick={() => onRemover(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                <Trash2 size={12} />
              </button>
            </div>
            {pesquisa?.resultado && (
              <div style={{ marginTop: 8, padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 10, color: '#bbb', whiteSpace: 'pre-wrap' }}>
                <b style={{ color: '#c9a227' }}>Pesquisa de mercado (IA, confira antes de usar):</b><br />
                {pesquisa.resultado}
              </div>
            )}
            {pesquisa?.erro && (
              <div style={{ marginTop: 8, fontSize: 10, color: '#b04040' }}>{pesquisa.erro}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Info({ label, valor }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: '#c9a227', fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 20, marginBottom: 16
};

const tituloSecao = { fontSize: 13, color: '#c9a227', fontWeight: 700, marginBottom: 10 };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent',
  border: '1px dashed #333', borderRadius: 6, color: '#999', fontWeight: 700,
  fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};
