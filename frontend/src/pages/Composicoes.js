import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import toast from 'react-hot-toast';
import { Plus, ChevronDown, ChevronRight, Pencil, Copy, EyeOff, RotateCcw, Trash2, ArrowUp, ArrowDown, X, Save } from 'lucide-react';
import {
  getComposicoes, getComposicao, criarComposicao, atualizarComposicao, duplicarComposicao,
  definirComposicaoAtiva, removerComposicao, calcularComposicao, getMateriais, getServicos,
} from '../services/api';
import Select, { comparador } from '../components/Select';
import { ROTULO_SEGMENTO } from '../utils/disciplinasServico';
import { formatarMoeda } from '../utils/format';
import useDisciplinas from '../hooks/useDisciplinas';
import { useAuth } from '../hooks/useAuth';
import { estilos } from '../components/ui/estilos';

// Composições e kits (versão 2.0, Fase 3H): um kit junta materiais do catálogo
// e serviços da base única com coeficientes (ex.: ponto de tomada = caixa +
// eletroduto + cabo + tomada + instalação). O custo é sempre calculado pelo
// servidor (utils/composicoes.js): material × preço do catálogo; serviço ×
// sugestão do segmento (valor H&M ?? referência oficial/particular). Item sem
// preço fica "a cotar" — nada de preço inventado.
// Ver: qualquer usuário. Criar/editar/duplicar/desativar/excluir: admin.

const SEGMENTOS = ['privado', 'publico'];
const moeda = (v) => (v == null ? '—' : formatarMoeda(v));
const numero = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
// rolo/caixa contado em metro: "convertido de RL 100 m (R$ 283,04 a embalagem)"
const precoEmbalagem = (l) => (l.conversao?.preco_embalagem != null
  ? `${l.observacao_preco} (${moeda(l.conversao.preco_embalagem)} a embalagem)`
  : l.observacao_preco);
const notaConversao = { color: '#8fb3d9', fontSize: 10.5 };
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const casaBusca = (txt, busca) => {
  const palavras = semAcento(busca).split(/\s+/).filter(Boolean);
  const alvo = semAcento(txt);
  return palavras.every(p => alvo.includes(p));
};
const FORM_VAZIO = { id: null, versao: null, codigo: '', descricao: '', unidade: 'un', disciplina: 'eletrica', observacao: '', itens: [] };
let seq = 0;
const novaChave = () => `k${Date.now()}_${seq++}`;

function CustoResumo({ c }) {
  if (!c) return <span style={{ color: '#555' }}>—</span>;
  return (
    <span>
      <span style={{ color: c.completo ? '#e8e0cc' : '#bbb' }}>{moeda(c.custo_unitario)}</span>
      {c.itens_a_cotar > 0 && <span style={etiquetaCotar} title="Itens sem preço — entram na proposta como a cotar">+{c.itens_a_cotar} a cotar</span>}
    </span>
  );
}

export default function Composicoes() {
  const { nomeServico: nomeDisciplina } = useDisciplinas();
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [verInativos, setVerInativos] = useState(false);
  const [aberto, setAberto] = useState(null); // id
  const [detalhes, setDetalhes] = useState({}); // id → composição completa
  const [form, setForm] = useState(null); // editor aberto
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getComposicoes(verInativos ? { inativos: '1' } : undefined);
      setLista(res.data.itens || []);
      setDetalhes({});
    } catch {
      toast.error('Erro ao carregar as composições');
    } finally {
      setCarregando(false);
    }
  }, [verInativos]);
  useEffect(() => { carregar(); }, [carregar]);

  // A–Z: disciplinas pelo nome e, dentro de cada uma, as composições pela descrição
  const grupos = useMemo(() => {
    const filtrada = lista.filter(c => (!disciplina || c.disciplina === disciplina)
      && (!busca.trim() || casaBusca(`${c.codigo} ${c.descricao}`, busca)));
    const porDisc = {};
    for (const c of filtrada) (porDisc[c.disciplina] = porDisc[c.disciplina] || []).push(c);
    return Object.entries(porDisc)
      .map(([disc, itens]) => ({ disc, nome: nomeDisciplina(disc), itens: itens.sort((a, b) => comparador.compare(a.descricao, b.descricao)) }))
      .sort((a, b) => comparador.compare(a.nome, b.nome));
  }, [lista, busca, disciplina, nomeDisciplina]);
  const disciplinasUsadas = useMemo(() => [...new Set(lista.map(c => c.disciplina))], [lista]);

  async function alternar(id) {
    if (aberto === id) { setAberto(null); return; }
    setAberto(id);
    if (!detalhes[id]) {
      try {
        const res = await getComposicao(id);
        setDetalhes(d => ({ ...d, [id]: res.data }));
      } catch {
        toast.error('Erro ao carregar a composição');
      }
    }
  }

  async function abrirEditor(c) {
    if (!c) { setForm({ ...FORM_VAZIO }); return; }
    try {
      const { data } = await getComposicao(c.id);
      setForm({
        id: data.id, versao: data.versao, codigo: data.codigo, descricao: data.descricao, unidade: data.unidade,
        disciplina: data.disciplina, observacao: data.observacao || '',
        itens: data.itens.map(it => ({ ...it, chave: novaChave() })),
      });
    } catch {
      toast.error('Erro ao abrir a composição');
    }
  }

  async function executar(acao, msgOk) {
    setOcupado(true);
    try {
      await acao();
      if (msgOk) toast.success(msgOk);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao executar a ação');
    } finally {
      setOcupado(false);
    }
  }

  const duplicar = (c) => executar(async () => {
    const { data } = await duplicarComposicao(c.id);
    toast.success(`Cópia criada: ${data.codigo}`);
  });
  const ativar = (c, ativo) => executar(() => definirComposicaoAtiva(c.id, ativo), ativo ? 'Composição reativada' : 'Composição desativada — não aparece mais no orçamento');
  const excluir = (c) => {
    if (!window.confirm(`Excluir de vez a composição ${c.codigo} — "${c.descricao}"?\n\nAs propostas que já receberam os itens dela não mudam.`)) return;
    executar(() => removerComposicao(c.id), 'Composição excluída');
  };

  if (form) {
    return <EditorComposicao form={form} setForm={setForm} onFechar={(salvou) => { setForm(null); if (salvou) carregar(); }} />;
  }

  return (
    <div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={tituloSecao}>Composições e kits</div>
            <div style={{ fontSize: 12, color: '#888', maxWidth: 760, lineHeight: 1.5 }}>
              Um kit junta materiais do catálogo e serviços da base com coeficientes e entra no orçamento de uma vez
              (botão <b>+ Kit/composição</b> no editor). O custo é recalculado com os preços atuais:
              material pelo catálogo; serviço pelo valor H&M adotado ou, sem ele, pela referência {ROTULO_SEGMENTO.privado} (clientes
              particulares) ou {ROTULO_SEGMENTO.publico} (órgão público). Sem preço, o item entra <b>a cotar</b>.
            </div>
          </div>
          {ehAdmin && (
            <button style={btnPrimario} onClick={() => abrirEditor(null)}><Plus size={14} /> Nova composição</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input style={{ maxWidth: 320 }} placeholder="Buscar por código ou descrição" value={busca} onChange={e => setBusca(e.target.value)} />
          <Select style={{ maxWidth: 280 }} value={disciplina} onChange={e => setDisciplina(e.target.value)} aria-label="Disciplina">
            <option value="">Todas as disciplinas</option>
            {disciplinasUsadas.map(d => <option key={d} value={d}>{nomeDisciplina(d)}</option>)}
          </Select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#999', cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={verInativos} onChange={e => setVerInativos(e.target.checked)} />
            Mostrar desativadas
          </label>
        </div>

        {carregando ? <div style={{ color: '#888', fontSize: 13 }}>Carregando…</div> : grupos.length === 0 ? (
          <div style={{ color: '#888', fontSize: 13 }}>Nenhuma composição {busca || disciplina ? 'com esse filtro' : 'cadastrada'}.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} data-teste="lista-composicoes">
            <thead>
              <tr style={{ color: '#777', textAlign: 'left' }}>
                <th style={{ ...th, width: 22 }} />
                <th style={th}>Código</th>
                <th style={th}>Descrição</th>
                <th style={th}>Un</th>
                <th style={{ ...th, textAlign: 'right' }}>Itens</th>
                <th style={{ ...th, textAlign: 'right' }} title="Cliente particular (residência, condomínio, empresa)">Custo particular</th>
                <th style={{ ...th, textAlign: 'right' }} title="Cliente órgão público">Custo oficial</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => (
                <Fragment key={g.disc}>
                  <tr><td colSpan={8} style={cabecalhoGrupo}>{g.nome}</td></tr>
                  {g.itens.map(c => (
                    <Fragment key={c.id}>
                      <tr style={{ borderTop: '1px solid #1c1c1c', opacity: c.ativo ? 1 : 0.5 }} data-codigo={c.codigo}>
                        <td style={td}>
                          <button style={btnSeta} onClick={() => alternar(c.id)} aria-label="Ver itens">
                            {aberto === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td style={{ ...td, color: '#c9a227', whiteSpace: 'nowrap', fontWeight: 700 }}>{c.codigo}</td>
                        <td style={td}>
                          <span style={{ cursor: 'pointer' }} onClick={() => alternar(c.id)}>{c.descricao}</span>
                          {!c.ativo && <span style={{ ...etiquetaCotar, color: '#888', borderColor: '#444' }}>desativada</span>}
                          {c.origem === 'modelo' && <span style={etiquetaModelo} title="Kit-modelo criado pelo sistema — ajuste os coeficientes ao projeto">modelo</span>}
                        </td>
                        <td style={td}>{c.unidade}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{c.n_itens}</td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}><CustoResumo c={c.custo?.privado} /></td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}><CustoResumo c={c.custo?.publico} /></td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          {ehAdmin && (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button style={btnIcone} title="Editar" disabled={ocupado} onClick={() => abrirEditor(c)}><Pencil size={13} /></button>
                              <button style={btnIcone} title="Duplicar" disabled={ocupado} onClick={() => duplicar(c)}><Copy size={13} /></button>
                              {c.ativo
                                ? <button style={btnIcone} title="Desativar (some da escolha no orçamento)" disabled={ocupado} onClick={() => ativar(c, false)}><EyeOff size={13} /></button>
                                : <button style={btnIcone} title="Reativar" disabled={ocupado} onClick={() => ativar(c, true)}><RotateCcw size={13} /></button>}
                              <button style={{ ...btnIcone, color: '#e57373' }} title="Excluir" disabled={ocupado} onClick={() => excluir(c)}><Trash2 size={13} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {aberto === c.id && (
                        <tr><td colSpan={8} style={{ padding: '4px 0 14px 22px' }}>
                          {detalhes[c.id] ? <DetalheItens comp={detalhes[c.id]} /> : <span style={{ color: '#888' }}>Carregando…</span>}
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Itens da composição com o preço e o custo de cada linha nos dois segmentos
function DetalheItens({ comp }) {
  const { custo } = comp;
  const linhas = custo?.privado?.itens || [];
  return (
    <div>
      {comp.observacao && <div style={{ fontSize: 11.5, color: '#999', marginBottom: 8, lineHeight: 1.5 }}>{comp.observacao}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ color: '#666', textAlign: 'left' }}>
            <th style={th}>Tipo</th><th style={th}>Item</th>
            <th style={{ ...th, textAlign: 'right' }}>Coef.</th><th style={th}>Un</th>
            <th style={{ ...th, textAlign: 'right' }}>Preço particular</th><th style={{ ...th, textAlign: 'right' }}>Custo particular</th>
            <th style={{ ...th, textAlign: 'right' }}>Preço oficial</th><th style={{ ...th, textAlign: 'right' }}>Custo oficial</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const pub = custo.publico.itens[i];
            return (
              <tr key={i} style={{ borderTop: '1px solid #1a1a1a' }}>
                <td style={td}><span style={l.tipo === 'servico' ? etiquetaServico : etiquetaMaterial}>{l.tipo === 'servico' ? 'serviço' : 'material'}</span></td>
                <td style={td}>
                  {l.descricao}
                  {l.a_cotar && <div style={{ color: '#d9a441', fontSize: 10.5 }}>{l.motivo}</div>}
                  {!l.a_cotar && l.observacao_preco && <div style={notaConversao}>{precoEmbalagem(l)}</div>}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{numero(l.coeficiente)}</td>
                <td style={td}>{l.unidade}</td>
                <td style={{ ...td, textAlign: 'right' }}>{l.a_cotar ? <span style={{ color: '#d9a441' }}>a cotar</span> : moeda(l.preco_unitario)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{moeda(l.custo)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{pub.a_cotar ? <span style={{ color: '#d9a441' }}>a cotar</span> : moeda(pub.preco_unitario)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{moeda(pub.custo)}</td>
              </tr>
            );
          })}
          <tr style={{ borderTop: '1px solid #2a2a2a', fontWeight: 700 }}>
            <td style={td} colSpan={5}>Custo unitário ({comp.unidade || 'un'})</td>
            <td style={{ ...td, textAlign: 'right' }}><CustoResumo c={custo.privado} /></td>
            <td style={td} />
            <td style={{ ...td, textAlign: 'right' }}><CustoResumo c={custo.publico} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Editor (admin) ─────────────────────────────────────────────────────────
function EditorComposicao({ form, setForm, onFechar }) {
  const { nomeServico: nomeDisciplina, todas: todasDisciplinas } = useDisciplinas();
  const [materiais, setMateriais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [buscaMat, setBuscaMat] = useState('');
  const [buscaSrv, setBuscaSrv] = useState('');
  const [custo, setCusto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const ultimoCalculo = useRef(0);

  useEffect(() => {
    getMateriais({ porPagina: 1000 }).then(r => setMateriais(r.data.itens || [])).catch(() => toast.error('Erro ao carregar o catálogo'));
    getServicos().then(r => setServicos(r.data.itens || [])).catch(() => toast.error('Erro ao carregar a base de serviços'));
  }, []);

  // custo do rascunho (servidor — mesma regra da lista), meio segundo depois da última mudança
  const itensParaApi = useMemo(() => form.itens.map(({ tipo, material_id, servico_codigo, coeficiente, descricao, unidade }) => ({
    tipo, material_id: material_id || null, servico_codigo: servico_codigo || null,
    coeficiente: Number(String(coeficiente).replace(',', '.')), descricao, unidade,
  })), [form.itens]);
  useEffect(() => {
    const valido = itensParaApi.every(it => it.coeficiente > 0 && (it.material_id || it.servico_codigo || String(it.descricao || '').trim()));
    if (!itensParaApi.length || !valido) { setCusto(null); return undefined; }
    const n = ++ultimoCalculo.current;
    const t = setTimeout(() => {
      calcularComposicao(itensParaApi).then(r => { if (n === ultimoCalculo.current) setCusto(r.data.custo); }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [itensParaApi]);

  const materiaisFiltrados = useMemo(() => {
    if (!buscaMat.trim()) return [];
    return materiais.filter(m => casaBusca(`${m.descricao} ${m.codigo || ''} ${m.marca || ''}`, buscaMat)).slice(0, 150);
  }, [materiais, buscaMat]);
  const gruposServicos = useMemo(() => {
    const porDisc = {};
    for (const s of servicos) {
      if (buscaSrv.trim() && !casaBusca(`${s.descricao} ${s.codigo}`, buscaSrv)) continue;
      (porDisc[s.disciplina || 'outros'] = porDisc[s.disciplina || 'outros'] || []).push(s);
    }
    return Object.entries(porDisc).map(([d, l]) => ({ d, nome: nomeDisciplina(d), l })).sort((a, b) => comparador.compare(a.nome, b.nome));
  }, [servicos, buscaSrv, nomeDisciplina]);

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const alterarItem = (chave, k, v) => setForm(f => ({ ...f, itens: f.itens.map(it => (it.chave === chave ? { ...it, [k]: v } : it)) }));
  const removerItem = (chave) => setForm(f => ({ ...f, itens: f.itens.filter(it => it.chave !== chave) }));
  const mover = (i, d) => setForm(f => {
    const itens = [...f.itens];
    const j = i + d;
    if (j < 0 || j >= itens.length) return f;
    [itens[i], itens[j]] = [itens[j], itens[i]];
    return { ...f, itens };
  });
  const adicionar = (it) => setForm(f => ({ ...f, itens: [...f.itens, { coeficiente: 1, ...it, chave: novaChave() }] }));

  function addMaterial(id) {
    const m = materiais.find(x => String(x.id) === String(id));
    if (!m) return;
    adicionar({ tipo: 'material', material_id: m.id, servico_codigo: null, descricao: m.descricao, unidade: m.unidade });
    setBuscaMat('');
  }
  function addServico(codigo) {
    const s = servicos.find(x => x.codigo === codigo);
    if (!s) return;
    adicionar({ tipo: 'servico', material_id: null, servico_codigo: s.codigo, descricao: s.descricao, unidade: s.unidade || 'un' });
  }
  // desvincula do catálogo (vira "material sem catálogo", a cotar) mantendo a descrição
  const desvincular = (it) => setForm(f => ({ ...f, itens: f.itens.map(x => (x.chave === it.chave ? { ...x, material_id: null, servico_codigo: null } : x)) }));

  async function salvar() {
    if (!form.descricao.trim()) { toast.error('Informe a descrição da composição'); return; }
    if (!form.itens.length) { toast.error('Inclua ao menos um item'); return; }
    if (itensParaApi.some(it => !(it.coeficiente > 0))) { toast.error('Todo item precisa de coeficiente maior que zero'); return; }
    const corpo = {
      descricao: form.descricao, unidade: form.unidade, disciplina: form.disciplina, observacao: form.observacao,
      ...(form.codigo.trim() ? { codigo: form.codigo } : {}), itens: itensParaApi,
    };
    setSalvando(true);
    try {
      if (form.id) await atualizarComposicao(form.id, { ...corpo, versao: form.versao });
      else await criarComposicao(corpo);
      toast.success('Composição salva');
      onFechar(true);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar a composição', err.response?.status === 409 ? { duration: 12000 } : undefined);
    } finally {
      setSalvando(false);
    }
  }

  // custo ainda do rascunho anterior (item incluído/removido há pouco): não mostra linha trocada
  const linhaCusto = (i, seg) => (custo?.[seg]?.itens?.length === form.itens.length ? custo[seg].itens[i] : null);

  return (
    <div style={card} data-teste="editor-composicao">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={tituloSecao}>{form.id ? `Editar composição ${form.codigo}` : 'Nova composição'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecundario} onClick={() => onFechar(false)}><X size={13} style={{ marginRight: 4 }} /> Cancelar</button>
          <button style={btnPrimario} onClick={salvar} disabled={salvando}><Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 260px', gap: 10, marginBottom: 10 }}>
        <label style={rotulo}>Código
          <input value={form.codigo} placeholder="automático" maxLength={30} onChange={e => campo('codigo', e.target.value.toUpperCase())} />
        </label>
        <label style={rotulo}>Descrição
          <input value={form.descricao} maxLength={300} placeholder="Ex.: Ponto de tomada baixa completo (embutido em alvenaria)" onChange={e => campo('descricao', e.target.value)} />
        </label>
        <label style={rotulo}>Unidade
          <input value={form.unidade} maxLength={10} onChange={e => campo('unidade', e.target.value)} />
        </label>
        <label style={rotulo}>Disciplina
          <Select value={form.disciplina} onChange={e => campo('disciplina', e.target.value)}>
            {todasDisciplinas.map(d => <option key={d.chave} value={d.chave}>{d.nomes.servico}</option>)}
          </Select>
        </label>
      </div>
      <label style={{ ...rotulo, marginBottom: 16 }}>Observação (premissas dos coeficientes)
        <textarea rows={2} maxLength={2000} value={form.observacao} onChange={e => campo('observacao', e.target.value)} />
      </label>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} data-teste="itens-editor">
        <thead>
          <tr style={{ color: '#777', textAlign: 'left' }}>
            <th style={th}>Tipo</th><th style={th}>Item</th><th style={{ ...th, width: 90 }}>Coef.</th><th style={{ ...th, width: 70 }}>Un</th>
            <th style={{ ...th, textAlign: 'right' }}>Custo particular</th><th style={{ ...th, textAlign: 'right' }}>Custo oficial</th><th style={{ ...th, width: 92 }} />
          </tr>
        </thead>
        <tbody>
          {form.itens.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#777' }}>Nenhum item — adicione abaixo materiais do catálogo, serviços da base ou um material sem catálogo.</td></tr>}
          {form.itens.map((it, i) => {
            const vinculado = !!(it.material_id || it.servico_codigo);
            const lp = linhaCusto(i, 'privado');
            const lo = linhaCusto(i, 'publico');
            return (
              <tr key={it.chave} style={{ borderTop: '1px solid #1c1c1c' }}>
                <td style={td}><span style={it.tipo === 'servico' ? etiquetaServico : etiquetaMaterial}>{it.tipo === 'servico' ? 'serviço' : 'material'}</span></td>
                <td style={td}>
                  {vinculado ? (
                    <span>{it.descricao} <span style={{ color: '#666' }}>{it.servico_codigo ? `(${it.servico_codigo})` : `(catálogo #${it.material_id})`}</span>
                      <button style={btnLink} onClick={() => desvincular(it)} title="Tirar do catálogo/da base e editar a descrição à mão">desvincular</button></span>
                  ) : (
                    <input value={it.descricao} maxLength={300} placeholder={it.tipo === 'servico' ? 'Serviço fora da base' : 'Material sem catálogo (a cotar)'}
                      onChange={e => alterarItem(it.chave, 'descricao', e.target.value)} />
                  )}
                  {lp?.a_cotar && <div style={{ color: '#d9a441', fontSize: 10.5 }}>{lp.motivo}</div>}
                  {lp && !lp.a_cotar && lp.observacao_preco && <div style={notaConversao}>{precoEmbalagem(lp)}</div>}
                </td>
                <td style={td}><input inputMode="decimal" value={it.coeficiente} onChange={e => alterarItem(it.chave, 'coeficiente', e.target.value)} aria-label="Coeficiente" /></td>
                <td style={td}>
                  {/* rolo/caixa com a metragem na descrição: dá para contar o item em metro */}
                  {it.material_id && lp?.embalagem_metros ? (
                    <Select value={it.unidade} onChange={e => alterarItem(it.chave, 'unidade', e.target.value)} aria-label="Unidade"
                      title={`Contar em metro: preço do ${lp.unidade_catalogo} ÷ ${String(lp.embalagem_metros).replace('.', ',')} m`}>
                      {[...new Set([lp.unidade_catalogo, 'm', it.unidade].filter(Boolean))].map(u => <option key={u} value={u}>{u}</option>)}
                    </Select>
                  ) : vinculado ? it.unidade : <input value={it.unidade} maxLength={10} onChange={e => alterarItem(it.chave, 'unidade', e.target.value)} aria-label="Unidade" />}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{lp ? (lp.a_cotar ? <span style={{ color: '#d9a441' }}>a cotar</span> : moeda(lp.custo)) : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{lo ? (lo.a_cotar ? <span style={{ color: '#d9a441' }}>a cotar</span> : moeda(lo.custo)) : '—'}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    <button style={btnIcone} title="Subir" onClick={() => mover(i, -1)}><ArrowUp size={12} /></button>
                    <button style={btnIcone} title="Descer" onClick={() => mover(i, 1)}><ArrowDown size={12} /></button>
                    <button style={{ ...btnIcone, color: '#e57373' }} title="Remover" onClick={() => removerItem(it.chave)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr style={{ borderTop: '1px solid #2a2a2a', fontWeight: 700 }}>
            <td style={td} colSpan={4}>Custo unitário ({form.unidade || 'un'}) — recalculado com os preços atuais</td>
            {SEGMENTOS.map(seg => <td key={seg} style={{ ...td, textAlign: 'right' }} data-teste={`total-${seg}`}><CustoResumo c={custo?.[seg]} /></td>)}
            <td style={td} />
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 18 }}>
        <div style={caixaAdicionar}>
          <div style={rotuloAdicionar}>+ Material do catálogo</div>
          <input placeholder="Buscar no catálogo (descrição, código, marca)" value={buscaMat} onChange={e => setBuscaMat(e.target.value)} />
          {buscaMat.trim() && (
            <Select value="" onChange={e => addMaterial(e.target.value)} style={{ marginTop: 6 }} aria-label="Material do catálogo">
              <option value="">{materiaisFiltrados.length ? `Escolha (${materiaisFiltrados.length}${materiaisFiltrados.length === 150 ? '+' : ''})…` : 'Nada encontrado'}</option>
              {materiaisFiltrados.map(m => <option key={m.id} value={m.id}>{`${m.descricao} — ${m.unidade}${Number(m.preco) > 0 ? ` — ${moeda(m.preco)}` : ' — sem preço'}`}</option>)}
            </Select>
          )}
        </div>
        <div style={caixaAdicionar}>
          <div style={rotuloAdicionar}>+ Serviço da base de mão de obra</div>
          <input placeholder="Filtrar serviços" value={buscaSrv} onChange={e => setBuscaSrv(e.target.value)} />
          <Select value="" onChange={e => addServico(e.target.value)} style={{ marginTop: 6 }} aria-label="Serviço da base">
            <option value="">Escolha o serviço…</option>
            {gruposServicos.map(g => (
              <optgroup key={g.d} label={g.nome}>
                {g.l.map(s => <option key={s.codigo} value={s.codigo}>{s.descricao}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div style={caixaAdicionar}>
          <div style={rotuloAdicionar}>+ Material sem catálogo</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Entra com a descrição digitada e sem preço (a cotar) até ser ligado ao catálogo.</div>
          <button style={btnSecundario} onClick={() => adicionar({ tipo: 'material', material_id: null, servico_codigo: null, descricao: '', unidade: 'un' })}>
            <Plus size={13} style={{ marginRight: 4 }} /> Adicionar linha
          </button>
        </div>
      </div>
    </div>
  );
}

// Estilos do kit de tela (components/ui/estilos.js), com o que esta tela tem
// de diferente por cima — o visual ficou como era.
const card = { ...estilos.card, padding: 22 };
const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 6 };
const th = { padding: '6px 8px 6px 0', fontWeight: 600, fontSize: 11 };
const td = { padding: '6px 8px 6px 0', verticalAlign: 'top' };
const cabecalhoGrupo = { padding: '14px 0 6px', color: '#c9a227', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' };
const rotulo = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#888' };
const btnPrimario = { ...estilos.btnPrimario, display: 'flex', fontSize: 13 };
const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnIcone = { ...estilos.btnIcone, display: 'flex', color: '#c9a227', padding: 0 };
const btnSeta = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, display: 'flex' };
const btnLink = { background: 'none', border: 'none', color: '#8ab4f8', cursor: 'pointer', fontSize: 10.5, marginLeft: 6, textDecoration: 'underline', padding: 0 };
const etiqueta = { fontSize: 9.5, border: '1px solid', borderRadius: 4, padding: '0 5px', marginLeft: 6, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' };
const etiquetaCotar = { ...etiqueta, color: '#d9a441', borderColor: '#5a4520' };
const etiquetaModelo = { ...etiqueta, color: '#8ab4f8', borderColor: '#2f4f6f' };
const etiquetaMaterial = { ...etiqueta, marginLeft: 0, color: '#9ccc65', borderColor: '#33502a' };
const etiquetaServico = { ...etiqueta, marginLeft: 0, color: '#ce93d8', borderColor: '#4a2d52' };
const caixaAdicionar = { background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12 };
const rotuloAdicionar = { fontSize: 12, color: '#c9a227', fontWeight: 700, marginBottom: 8 };
