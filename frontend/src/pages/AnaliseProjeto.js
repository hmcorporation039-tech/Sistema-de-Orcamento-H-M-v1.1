import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileDown, Plus, Trash2, FolderSearch, Search, FilePlus2 } from 'lucide-react';
import {
  analisarProjeto, gerarRelatorioCompatibilizacao, pesquisarPrecoMercado,
  getAnalisesProjeto, getAnaliseProjeto, atualizarAnaliseProjeto, removerAnaliseProjeto,
} from '../services/api';
import { formatarMoeda } from '../utils/format';

let contador = 0;
const gerarId = () => `tmp_${Date.now()}_${contador++}`;

// Taxonomia fixa de disciplinas — mesma lista de chaves/nomes do backend
// (utils/disciplinasProjeto.js). É estática, não vale o round-trip de uma
// chamada de API só pra isso.
const DISCIPLINAS = [
  { chave: 'eletrica', nome: 'Elétrica (infraestrutura)' },
  { chave: 'rede', nome: 'Redes de Computadores (dados)' },
  { chave: 'cabeamento', nome: 'Infra. de Cabeamento Estruturado' },
  { chave: 'telefonia', nome: 'Telefonia' },
  { chave: 'cftv', nome: 'CFTV' },
  { chave: 'iluminacao', nome: 'Iluminação' },
  { chave: 'automacao', nome: 'Automação' },
  { chave: 'alarme', nome: 'Alarme' },
  { chave: 'antena', nome: 'Antena/TV' },
];

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

function formatarHora(data) {
  return data ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

export default function AnaliseProjeto() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();

  const [arquivos, setArquivos] = useState([]);
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [pesquisas, setPesquisas] = useState({}); // { [materialId]: { carregando, resultado, erro } }
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const [analisesSalvas, setAnalisesSalvas] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const inputRef = useRef(null);
  const idAutosaveRef = useRef(null);

  const carregarListaSalvas = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const res = await getAnalisesProjeto({ porPagina: 20 });
      setAnalisesSalvas(res.data.itens);
    } catch {
      // lista salva é conveniência — não bloqueia a tela principal se falhar
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  useEffect(() => { carregarListaSalvas(); }, [carregarListaSalvas]);

  const popularAnalise = useCallback((dados) => {
    setAnalise({
      ...dados,
      servicos: dados.servicos.map(s => ({ ...s, id: gerarId() })),
      materiais: dados.materiais.map(m => ({ ...m, id: gerarId() })),
    });
    setDisciplinasSelecionadas(dados.disciplinas || []);
    setSalvoEm(dados.atualizadoEm ? new Date(dados.atualizadoEm) : null);
  }, []);

  useEffect(() => {
    if (!idParam) {
      setAnalise(null);
      return;
    }
    setCarregandoAnalise(true);
    getAnaliseProjeto(idParam)
      .then(res => popularAnalise(res.data))
      .catch(() => {
        toast.error('Análise não encontrada');
        navigate('/analise-projeto');
      })
      .finally(() => setCarregandoAnalise(false));
  }, [idParam, navigate, popularAnalise]);

  function selecionarArquivos(e) {
    setArquivos(Array.from(e.target.files || []));
  }

  function alternarDisciplina(chave) {
    setDisciplinasSelecionadas(sel => sel.includes(chave) ? sel.filter(c => c !== chave) : [...sel, chave]);
  }

  async function analisar() {
    if (arquivos.length === 0) {
      toast.error('Selecione ao menos um PDF do projeto');
      return;
    }
    if (disciplinasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma disciplina pra analisar');
      return;
    }
    setAnalisando(true);
    try {
      const res = await analisarProjeto(arquivos, disciplinasSelecionadas);
      popularAnalise(res.data);
      navigate(`/analise-projeto/${res.data.id}`);
      toast.success(`Projeto analisado: ${res.data.ambientes.length} ambientes, ${res.data.cameras.total} câmeras`);
      carregarListaSalvas();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao analisar o projeto');
    } finally {
      setAnalisando(false);
    }
  }

  function novaAnalise() {
    navigate('/analise-projeto');
    setArquivos([]);
    setDisciplinasSelecionadas([]);
    setPesquisas({});
    setSalvoEm(null);
  }

  function abrirAnaliseSalva(item) {
    navigate(`/analise-projeto/${item.id}`);
  }

  async function excluirAnaliseSalva(item) {
    if (!window.confirm(`Excluir a análise de "${item.cliente_nome || 'projeto sem cliente'}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await removerAnaliseProjeto(item.id);
      toast.success('Análise excluída');
      carregarListaSalvas();
      if (String(analise?.id) === String(item.id)) novaAnalise();
    } catch {
      toast.error('Erro ao excluir análise');
    }
  }

  // Salva automaticamente as edições (cliente, serviços, materiais) — é
  // exatamente o que resolve a análise sumir ao trocar de tela: a partir do
  // momento em que existe um id (a análise já foi persistida), toda edição
  // vira uma gravação no banco, não só um estado do React.
  const salvarAgora = useCallback(async () => {
    if (!analise?.id) return;
    setSalvando(true);
    try {
      await atualizarAnaliseProjeto(analise.id, {
        cliente_nome: analise.cliente,
        servicos: analise.servicos.map(({ id, ...s }) => s),
        materiais: analise.materiais.map(({ id, ...m }) => m),
      });
      setSalvoEm(new Date());
    } catch {
      toast.error('Erro ao salvar automaticamente — tente novamente em instantes');
    } finally {
      setSalvando(false);
    }
  }, [analise?.id, analise?.cliente, analise?.servicos, analise?.materiais]);

  // Reseta o "já assentou" toda vez que o id muda (nova análise carregada) —
  // assim a primeira renderização de cada análise não dispara um autosave à toa.
  useEffect(() => { idAutosaveRef.current = null; }, [analise?.id]);

  useEffect(() => {
    if (!analise?.id) return;
    if (idAutosaveRef.current !== analise.id) {
      idAutosaveRef.current = analise.id;
      return;
    }
    const timer = setTimeout(() => { salvarAgora(); }, 1500);
    return () => clearTimeout(timer);
  }, [analise?.servicos, analise?.materiais, analise?.cliente]);

  function atualizarCliente(valor) {
    setAnalise(a => ({ ...a, cliente: valor }));
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
      setPesquisas(p => ({ ...p, [material.id]: { resultado: res.data.resultado, fonte: res.data.fonte } }));
    } catch (err) {
      setPesquisas(p => ({ ...p, [material.id]: { erro: err.response?.data?.erro || 'Erro ao pesquisar' } }));
    }
  }

  async function baixarRelatorio() {
    setGerando(true);
    try {
      await salvarAgora(); // garante que o PDF reflete a última edição, não uma versão atrasada
      const res = await gerarRelatorioCompatibilizacao(analise.id);
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

  const tilesResumo = analise ? [
    { label: 'Ambientes', valor: analise.ambientes.length },
    ...(analise.disciplinas?.includes('cftv') ? [{ label: 'Câmeras', valor: analise.cameras.total }] : []),
    ...(analise.disciplinas?.includes('rede') ? [{ label: 'Pontos de rede', valor: analise.pontosRedeAntena?.rede?.total ?? 0 }] : []),
    ...(analise.disciplinas?.includes('antena') ? [{ label: 'Pontos de TV/antena', valor: analise.pontosRedeAntena?.antena?.total ?? 0 }] : []),
    { label: 'Pendências', valor: analise.achados.length },
  ] : [];

  return (
    <div style={paginaLargaTela}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, color: '#c9a227', fontWeight: 700, flex: 1 }}>Análise de Projeto (Compatibilização)</h2>
        {analise && (
          <button onClick={novaAnalise} style={btnSecundario}>
            <FilePlus2 size={13} style={{ marginRight: 5 }} /> Nova análise
          </button>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Análises salvas</h3>
        </div>
        {carregandoLista ? (
          <p style={{ fontSize: 12, color: '#666' }}>Carregando...</p>
        ) : analisesSalvas.length === 0 ? (
          <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Nenhuma análise salva ainda.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px 8px 0' }}>Cliente</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Disciplinas</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Atualizado em</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Pendências</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {analisesSalvas.map(item => (
                <tr
                  key={item.id}
                  onClick={() => abrirAnaliseSalva(item)}
                  style={{
                    cursor: 'pointer', borderTop: '1px solid #1e1e1e',
                    background: String(analise?.id) === String(item.id) ? '#1a1a1a' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 8px 8px 0' }}>{item.cliente_nome || '—'}</td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>
                    {(item.disciplinas || []).map(c => DISCIPLINAS.find(d => d.chave === c)?.nome || c).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>
                    {new Date(item.atualizado_em).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.total_achados ?? 0}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => excluirAnaliseSalva(item)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!analise && (
        <div style={card}>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 14, lineHeight: 1.6 }}>
            Envie os PDFs do projeto do cliente (plantas de CFTV, cabeamento estruturado, etc.) e selecione as
            disciplinas que esse projeto cobre. O sistema extrai ambientes, contagem de câmeras/pontos de rede e a
            legenda de cabos automaticamente (sem IA — leitura direta do texto do PDF), e monta um rascunho de
            serviços/materiais só das disciplinas selecionadas, pra você revisar antes de gerar o relatório.
          </p>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              Disciplinas deste projeto
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {DISCIPLINAS.map(d => (
                <label key={d.chave} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: disciplinasSelecionadas.includes(d.chave) ? '#c9a227' : '#999', cursor: 'pointer' }}>
                  <input type="checkbox" checked={disciplinasSelecionadas.includes(d.chave)} onChange={() => alternarDisciplina(d.chave)} />
                  {d.nome}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input ref={inputRef} type="file" accept=".pdf" multiple onChange={selecionarArquivos} />
            <button onClick={analisar} disabled={analisando} style={btnPrimario}>
              <FolderSearch size={13} style={{ marginRight: 6 }} /> {analisando ? 'Analisando...' : 'Analisar projeto'}
            </button>
          </div>
        </div>
      )}

      {carregandoAnalise && (
        <div style={card}><p style={{ fontSize: 13, color: '#777' }}>Carregando análise...</p></div>
      )}

      {analise && !carregandoAnalise && (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Cliente</div>
                <input value={analise.cliente || ''} onChange={e => atualizarCliente(e.target.value)} placeholder="Nome do cliente" style={{ fontSize: 15, fontWeight: 700, color: '#c9a227', background: 'transparent', border: 'none', padding: '2px 0' }} />
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {salvando ? 'Salvando...' : salvoEm ? `Salvo às ${formatarHora(salvoEm)}` : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tilesResumo.length}, 1fr)`, gap: 16 }}>
              {tilesResumo.map(t => <Info key={t.label} label={t.label} valor={t.valor} />)}
            </div>
          </div>

          {analise.achados.length > 0 && (
            <div style={card}>
              <h3 style={tituloSecao}>Compatibilização — Pendências e Observações</h3>
              {analise.achados.map((a, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 3 }}>{a.tema}</div>
                  <div style={{ fontSize: 13, color: '#999' }}>{a.observacao}</div>
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
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
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
              <p style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>Nenhum material lançado ainda — adicione manualmente, ou lance na tela de Materiais e traga a lista final aqui.</p>
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
    ? '3fr 0.8fr 0.7fr 1.2fr 32px'
    : '2.2fr 0.7fr 0.6fr 1.2fr 2fr 32px';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, marginBottom: 8, fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Qtd</span><span>Un.</span><span>Status</span>
        {!semObservacao && <span>Observação</span>}
        <span />
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        return (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, marginBottom: 10, alignItems: 'center', fontSize: 13 }}>
            <input value={it.descricao} onChange={e => onAtualizar(it.id, 'descricao', e.target.value)} placeholder="Descrição" style={{ fontSize: 13 }} />
            <input type="number" step="1" min="0" value={it.quantidade ?? ''} onChange={e => onAtualizar(it.id, 'quantidade', e.target.value)} style={{ fontSize: 13 }} />
            <input value={it.unidade || ''} onChange={e => onAtualizar(it.id, 'unidade', e.target.value)} style={{ fontSize: 13 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: it.pronto ? '#3fb95f' : '#999', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!!it.pronto} onChange={e => onAtualizar(it.id, 'pronto', e.target.checked)} />
              Já pronto
            </label>
            {!semObservacao && (
              <input value={it.observacao || ''} onChange={e => onAtualizar(it.id, 'observacao', e.target.value)} placeholder="Observação" style={{ fontSize: 13 }} />
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
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, marginBottom: 8, fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Referência</span><span>Qtd</span><span>Un.</span><span>Catálogo / Mercado</span><span>Status</span><span />
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        const pesquisa = pesquisas[it.id];
        return (
          <div key={it.id} style={{ marginBottom: 12, borderBottom: '1px solid #1e1e1e', paddingBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, alignItems: 'center', fontSize: 13 }}>
              <input value={it.descricao} onChange={e => onAtualizar(it.id, 'descricao', e.target.value)} placeholder="Descrição" style={{ fontSize: 13 }} />
              <input value={it.referencia_fabricante || ''} onChange={e => onAtualizar(it.id, 'referencia_fabricante', e.target.value)} placeholder="Ref. fabricante" style={{ fontSize: 12 }} />
              <input type="number" step="1" min="0" value={it.quantidade ?? ''} onChange={e => onAtualizar(it.id, 'quantidade', e.target.value)} style={{ fontSize: 13 }} />
              <input value={it.unidade || ''} onChange={e => onAtualizar(it.id, 'unidade', e.target.value)} style={{ fontSize: 13 }} />
              <div style={{ fontSize: 12 }}>
                {it.preco_catalogo != null ? (
                  <div style={{ color: it.confianca_catalogo >= 70 ? '#3fb95f' : '#c9a227' }}>
                    <b>{formatarMoeda(it.preco_catalogo)}</b> ({it.confianca_catalogo}% match)
                    <div style={{ color: '#777', fontSize: 11 }} title={it.descricao_catalogo}>{it.descricao_catalogo}</div>
                  </div>
                ) : (
                  <span style={{ color: '#666' }}>Sem correspondência no catálogo</span>
                )}
                <button
                  type="button"
                  onClick={() => onPesquisar(it)}
                  disabled={pesquisa?.carregando}
                  style={{ ...btnSecundario, padding: '4px 10px', fontSize: 11, marginTop: 5 }}
                >
                  <Search size={11} style={{ marginRight: 4 }} /> {pesquisa?.carregando ? 'Pesquisando...' : 'Pesquisar mercado'}
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: it.pronto ? '#3fb95f' : '#999' }}>
                <input type="checkbox" checked={!!it.pronto} onChange={e => onAtualizar(it.id, 'pronto', e.target.checked)} />
                Já pronto
              </label>
              <button onClick={() => onRemover(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                <Trash2 size={12} />
              </button>
            </div>
            {pesquisa?.resultado && (
              <div style={{ marginTop: 10, padding: 12, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12, color: '#bbb', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                <b style={{ color: '#c9a227' }}>
                  Pesquisa de mercado ({pesquisa.fonte === 'claude' ? 'Claude, fallback pago' : 'Gemini'} — confira antes de usar):
                </b><br />
                {pesquisa.resultado}
              </div>
            )}
            {pesquisa?.erro && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b04040' }}>{pesquisa.erro}</div>
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
      <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 19, color: '#c9a227', fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

// Quebra o limite de largura (max-width: 1280) do <main> do Layout — essa
// tela tem tabelas largas (Serviços/Materiais) que ficam melhor ocupando a
// largura inteira da janela em vez de ficarem espremidas no centro.
const paginaLargaTela = {
  width: '100vw', maxWidth: '100vw',
  marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)',
  padding: '0 32px', boxSizing: 'border-box',
};

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 22, marginBottom: 16
};

const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 10 };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent',
  border: '1px dashed #333', borderRadius: 6, color: '#999', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};
