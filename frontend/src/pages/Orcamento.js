import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, FolderPlus, FileDown, Send, FilePlus2 } from 'lucide-react';
import { getClientes, getMateriais, getProximoNumero, criarProposta, atualizarProposta, getProposta } from '../services/api';
import api from '../services/api';
import { formatarMoeda } from '../utils/format';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import CampoMoeda from '../components/CampoMoeda';

let contador = 0;
const gerarId = () => `tmp_${Date.now()}_${contador++}`;

const FORM_VAZIO = {
  data: new Date().toISOString().slice(0, 10),
  validade: 5,
  tipo: '',
  porte: '',
  cliente_nome: '',
  responsavel: '',
  local_obra: '',
  pagamento: '',
  observacoes: '',
  bdi: 20,
  imposto_venda: 0,
  imposto_servico: 6,
  ajuste_geral: 0,
};

const SECOES_PADRAO = () => [
  { id: gerarId(), nome: 'Materiais' },
  { id: gerarId(), nome: 'Mão de Obra' },
];

// Seções cujo nome sugere trabalho/serviço entram no subtotal de mão de obra; o restante conta como material.
function ehMaoDeObra(nome) {
  return /m[ãa]o.?de.?obra|serviç|servic/i.test(nome || '');
}

const CATEGORIAS_MAO_DE_OBRA = [
  'Elétrica', 'Projetos', 'Automação', 'Cabeamento Estruturado', 'Controle de Acesso', 'CFTV', 'Configuração',
];

// Subgrupos sugeridos por padrão (além destes, qualquer nome digitado no item vira sugestão também)
const SUBGRUPOS_PADRAO = [
  'Alarme', 'Automação', 'CFTV', 'Controle de Acesso', 'Elétrica', 'Redes', 'Sonorização', 'Climatização',
];

export default function Orcamento() {
  const { id: editandoId } = useParams();
  const navigate = useNavigate();

  const [proximoNumero, setProximoNumero] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);

  const [form, setForm] = useState(FORM_VAZIO);
  const [secoes, setSecoes] = useState(SECOES_PADRAO);
  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [propostaSalva, setPropostaSalva] = useState(null);
  // Vira true quando o usuário edita algo DEPOIS de já ter salvo — nesse caso o
  // botão de salvar reaparece. Antes ele sumia para sempre após o primeiro
  // salvamento, mas os campos continuavam editáveis: a pessoa corrigia um
  // preço, via o total mudar na tela e não tinha como gravar a correção.
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [carregandoEdicao, setCarregandoEdicao] = useState(!!editandoId);
  const [numeroEditando, setNumeroEditando] = useState('');

  useEffect(() => {
    getClientes({ porPagina: 1000 }).then(res => setClientes(res.data.itens)).catch(() => {});
    getMateriais({ porPagina: 1000 }).then(res => setMateriais(res.data.itens)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editandoId) {
      getProximoNumero().then(res => setProximoNumero(res.data.proximo)).catch(() => {});
      return;
    }
    setCarregandoEdicao(true);
    getProposta(editandoId).then(res => {
      const p = res.data;
      setNumeroEditando(p.numero);
      setForm({
        data: (p.data || '').slice(0, 10),
        validade: p.validade,
        tipo: p.tipo || '',
        porte: p.porte || '',
        cliente_nome: p.cliente_nome || '',
        responsavel: p.responsavel || '',
        local_obra: p.local_obra || '',
        pagamento: p.pagamento || '',
        observacoes: p.observacoes || '',
        bdi: Number(p.bdi) || 0,
        imposto_venda: Number(p.imposto_venda) || 0,
        imposto_servico: Number(p.imposto_servico) || 0,
        ajuste_geral: Number(p.ajuste_geral) || 0,
      });
      setSecoes((p.secoes || []).map(s => ({ id: s.id, nome: s.nome })));
      // Reagrupa por subgrupo já ao carregar — sem isso, uma proposta salva
      // antes dessa correção (ou com itens lançados fora de ordem) só ficava
      // reorganizada depois que alguém mexesse manualmente num subgrupo.
      let itensCarregados = (p.itens || []).map(it => ({
        id: gerarId(), sid: it.secao_id, material_id: it.material_id,
        descricao: it.descricao, quantidade: Number(it.quantidade), unidade: it.unidade,
        valor_unitario: Number(it.valor_unitario), ncm: it.ncm || '', codigo: it.codigo || '',
        subgrupo: it.subgrupo || '', status: it.status || 'confirmado'
      }));
      for (const sid of new Set(itensCarregados.map(it => it.sid))) {
        itensCarregados = reordenarPorSubgrupo(itensCarregados, sid);
      }
      setItens(itensCarregados);
      setPropostaSalva(null);
    }).catch(() => {
      toast.error('Erro ao carregar proposta para edição');
      navigate('/orcamento');
    }).finally(() => setCarregandoEdicao(false));
  }, [editandoId, navigate]);

  const clienteResolvido = useMemo(
    // `c.nome` pode vir nulo do banco; sem a guarda, um único cliente sem nome
    // derrubava a tela inteira a cada tecla digitada no campo Cliente.
    () => clientes.find(c => (c.nome || '').toLowerCase() === form.cliente_nome.trim().toLowerCase()),
    [clientes, form.cliente_nome]
  );

  // Marca que há edição não salva depois de a proposta já ter sido gravada.
  useEffect(() => {
    if (propostaSalva) setAlteracoesPendentes(true);
    // eslint-disable-next-line
  }, [form, secoes, itens]);

  function subtotalSecao(sid) {
    return itens
      .filter(it => it.sid === sid)
      .reduce((s, it) => s + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0), 0);
  }

  const { subtotalMateriais, subtotalMaoObra, valorBdi, valorImpostoVenda, valorImpostoServico, valorAjusteGeral, total } = useMemo(() => {
    let mat = 0, mao = 0;
    for (const sec of secoes) {
      const sub = subtotalSecao(sec.id);
      if (ehMaoDeObra(sec.nome)) mao += sub;
      else mat += sub;
    }
    const bdiPct = Number(form.bdi) || 0;
    const vBdi = (mat + mao) * (bdiPct / 100);
    const vImpVenda = mat * ((Number(form.imposto_venda) || 0) / 100);
    const vImpServico = mao * ((Number(form.imposto_servico) || 0) / 100);
    // Único percentual assinado (pode ser negativo pra desconto) — mesma base
    // do BDI, soma ou subtrai igual sobre todos os valores da proposta.
    const vAjuste = (mat + mao) * ((Number(form.ajuste_geral) || 0) / 100);
    return {
      subtotalMateriais: mat, subtotalMaoObra: mao, valorBdi: vBdi,
      valorImpostoVenda: vImpVenda, valorImpostoServico: vImpServico, valorAjusteGeral: vAjuste,
      total: mat + mao + vBdi + vImpVenda + vImpServico + vAjuste,
    };
  }, [itens, secoes, form.bdi, form.imposto_venda, form.imposto_servico, form.ajuste_geral]);

  function adicionarSecao() {
    setSecoes(s => [...s, { id: gerarId(), nome: 'Nova Seção' }]);
  }

  function renomearSecao(id, nome) {
    setSecoes(s => s.map(sec => sec.id === id ? { ...sec, nome } : sec));
  }

  function removerSecao(id) {
    if (!window.confirm('Remover esta seção e todos os itens dela?')) return;
    setSecoes(s => s.filter(sec => sec.id !== id));
    setItens(it => it.filter(i => i.sid !== id));
  }

  function adicionarItem(sid) {
    setItens(it => [...it, {
      id: gerarId(), sid, material_id: null,
      descricao: '', quantidade: 1, unidade: 'un', valor_unitario: 0, ncm: '', codigo: '',
      subgrupo: '', status: 'confirmado'
    }]);
  }

  // Sugestões de subgrupo: os padrões da empresa + os que já foram usados nessa seção
  // (permite tanto escolher um dos padrões quanto reaproveitar um nome digitado antes)
  function subgruposDaSecao(sid) {
    const usados = itens.filter(it => it.sid === sid).map(it => (it.subgrupo || '').trim()).filter(Boolean);
    return Array.from(new Set([...SUBGRUPOS_PADRAO, ...usados]));
  }

  // Agrupa os itens de uma seção por subgrupo, na ordem em que aparecem (os
  // itens já chegam reordenados por reordenarPorSubgrupo — isso só monta os
  // cabeçalhos e o subtotal de cada grupo), igual ao "Bloco X" do PDF de
  // referência. Fecha o grupo anterior com um subtotal (soma dos totais dos
  // itens dele) sempre que o subgrupo muda ou a lista acaba — sem subtotal
  // pros itens sem subgrupo (não formam um "bloco" de verdade).
  function itensAgrupados(sid) {
    const lista = itens.filter(it => it.sid === sid);
    const linhas = [];
    let ultimoSubgrupo = null;
    let somaGrupo = 0;
    const fecharGrupo = () => {
      if (ultimoSubgrupo) linhas.push({ tipo: 'subtotal', nome: ultimoSubgrupo, soma: somaGrupo, key: `sub_${linhas.length}` });
    };
    for (const it of lista) {
      const sg = (it.subgrupo || '').trim() || null;
      if (sg !== ultimoSubgrupo) {
        fecharGrupo();
        if (sg) linhas.push({ tipo: 'cabecalho', nome: sg, key: `cab_${it.id}` });
        ultimoSubgrupo = sg;
        somaGrupo = 0;
      }
      somaGrupo += (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0);
      linhas.push({ tipo: 'item', item: it });
    }
    fecharGrupo();
    return linhas;
  }

  // Reagrupa os itens de UMA seção por subgrupo (mantendo as outras seções
  // exatamente onde estavam) — sem isso, mudar o subgrupo de um item só
  // trocava o rótulo dele, mas a posição na lista continuava a mesma, então
  // ele não "se juntava" visualmente aos outros itens do mesmo subgrupo
  // (itensAgrupados só detecta troca entre vizinhos, não reordena sozinho).
  // Ordena pela primeira vez que cada subgrupo aparece na lista atual — o
  // sort é estável, então a ordem relativa dentro de cada subgrupo não muda.
  function reordenarPorSubgrupo(lista, sid) {
    const primeiraOcorrencia = new Map();
    let posicao = 0;
    for (const it of lista) {
      if (it.sid !== sid) continue;
      const sg = (it.subgrupo || '').trim();
      if (!primeiraOcorrencia.has(sg)) primeiraOcorrencia.set(sg, posicao);
      posicao++;
    }
    const daSecao = lista.filter(it => it.sid === sid);
    const ordenados = [...daSecao].sort((a, b) =>
      primeiraOcorrencia.get((a.subgrupo || '').trim()) - primeiraOcorrencia.get((b.subgrupo || '').trim())
    );
    let cursor = 0;
    return lista.map(it => (it.sid === sid ? ordenados[cursor++] : it));
  }

  function atualizarItem(id, campo, valor) {
    setItens(it => {
      const atualizado = it.map(i => i.id === id ? { ...i, [campo]: valor } : i);
      if (campo !== 'subgrupo') return atualizado;
      const item = atualizado.find(i => i.id === id);
      return reordenarPorSubgrupo(atualizado, item.sid);
    });
  }

  function aplicarMaterialNoItem(id, materialId) {
    const mat = materiais.find(m => String(m.id) === String(materialId));
    if (!mat) return;
    setItens(it => it.map(i => i.id === id ? {
      ...i, material_id: mat.id, descricao: mat.descricao, unidade: mat.unidade,
      valor_unitario: mat.preco, ncm: mat.ncm || '', codigo: mat.codigo || ''
    } : i));
  }

  function aplicarCategoriaMaoDeObra(id, categoria) {
    if (!categoria) return;
    setItens(it => it.map(i => i.id === id ? { ...i, descricao: categoria } : i));
  }

  function removerItem(id) {
    setItens(it => it.filter(i => i.id !== id));
  }

  function limparFormulario() {
    setForm(FORM_VAZIO);
    setSecoes(SECOES_PADRAO());
    setItens([]);
  }

  function novoOrcamento() {
    limparFormulario();
    setPropostaSalva(null);
    setAlteracoesPendentes(false);
    if (editandoId) {
      navigate('/orcamento');
    } else {
      getProximoNumero().then(r => setProximoNumero(r.data.proximo)).catch(() => {});
    }
  }

  async function baixarPdf() {
    if (!propostaSalva) return;
    setGerandoPdf(true);
    try {
      const res = await api.get(`/propostas/${propostaSalva.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const nomeCliente = form.cliente_nome.trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      link.download = `${nomeCliente}_${propostaSalva.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerandoPdf(false);
    }
  }

  async function salvar() {
    if (!form.cliente_nome.trim()) {
      toast.error('Informe o cliente da proposta');
      return;
    }
    if (itens.length === 0) {
      toast.error('Adicione ao menos um item à proposta');
      return;
    }
    // Validação por item: o backend recusa (400), mas é melhor apontar o
    // problema aqui, dizendo qual item está errado, do que só repassar o erro.
    for (const [i, it] of itens.entries()) {
      if (!String(it.descricao || '').trim()) {
        toast.error(`O item ${i + 1} está sem descrição`);
        return;
      }
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd < 0) {
        toast.error(`Quantidade inválida no item ${i + 1}`);
        return;
      }
      const vu = Number(it.valor_unitario);
      if (!Number.isFinite(vu) || vu < 0) {
        toast.error(`Valor unitário inválido no item ${i + 1}`);
        return;
      }
    }

    setSalvando(true);
    try {
      const payload = {
        data: form.data,
        validade: Number(form.validade) || 5,
        tipo: form.tipo,
        porte: form.porte,
        cliente_id: clienteResolvido?.id || null,
        cliente_nome: form.cliente_nome.trim(),
        responsavel: form.responsavel,
        local_obra: form.local_obra,
        pagamento: form.pagamento,
        observacoes: form.observacoes,
        bdi: Number(form.bdi) || 0,
        imposto_venda: Number(form.imposto_venda) || 0,
        imposto_servico: Number(form.imposto_servico) || 0,
        ajuste_geral: Number(form.ajuste_geral) || 0,
        // Subtotais/BDI/impostos/total não são mais enviados: o backend
        // recalcula tudo a partir dos itens (antes ele gravava o que o
        // navegador mandasse, e uma quantidade zerada fazia o PDF sair com a
        // linha valendo o preço cheio e o total geral sem ela).
        secoes: secoes.map(s => ({ id: s.id, nome: s.nome })),
        itens: itens.map(it => ({
          sid: it.sid, desc: it.descricao, qtd: Number(it.quantidade) || 0,
          un: it.unidade, vu: Number(it.valor_unitario) || 0, ncm: it.ncm || null,
          codigo: it.codigo || null, material_id: it.material_id || null,
          subgrupo: it.subgrupo?.trim() || null, status: it.status || 'confirmado'
        })),
      };
      // Depois de salvar uma proposta nova, novas gravações precisam ATUALIZAR
      // aquela proposta — antes o botão sumia e as correções feitas em seguida
      // não tinham como ser salvas (o PDF saía com os valores antigos).
      const idAlvo = editandoId || propostaSalva?.id;
      const res = idAlvo ? await atualizarProposta(idAlvo, payload) : await criarProposta(payload);
      toast.success(res.data.mensagem || 'Proposta salva com sucesso!');
      setPropostaSalva(res.data);
      setAlteracoesPendentes(false);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar proposta');
    } finally {
      setSalvando(false);
    }
  }

  if (carregandoEdicao) {
    return <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>Carregando proposta...</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>
          {editandoId ? `Editando Proposta ${numeroEditando}` : 'Novo Orçamento'}
        </h2>
        {!editandoId && proximoNumero != null && (
          <span style={{ fontSize: 12, color: '#666' }}>
            Próxima proposta: <b style={{ color: '#c9a227' }}>P{String(proximoNumero).padStart(3, '0')}</b>
          </span>
        )}
      </div>

      {/* Dados gerais */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Campo label="Cliente *">
            <input
              list="clientes-lista"
              value={form.cliente_nome}
              onChange={e => setForm({ ...form, cliente_nome: e.target.value })}
              placeholder="Nome do cliente"
            />
            <datalist id="clientes-lista">
              {clientes.map(c => <option key={c.id} value={c.nome} />)}
            </datalist>
          </Campo>
          <Campo label="Data">
            <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
          </Campo>
          <Campo label="Validade (dias)">
            <input type="number" min="1" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Campo label="Tipo">
            <input list="tipos-lista" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} placeholder="Instalação, Manutenção..." />
            <datalist id="tipos-lista">
              <option value="Instalação" /><option value="Manutenção" /><option value="Reforma" /><option value="Projeto" />
            </datalist>
          </Campo>
          <Campo label="Porte">
            <input list="portes-lista" value={form.porte} onChange={e => setForm({ ...form, porte: e.target.value })} placeholder="Pequeno, Médio, Grande" />
            <datalist id="portes-lista">
              <option value="Pequeno" /><option value="Médio" /><option value="Grande" />
            </datalist>
          </Campo>
          <Campo label="Responsável técnico">
            <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
          </Campo>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Campo label="Local da obra">
            <input value={form.local_obra} onChange={e => setForm({ ...form, local_obra: e.target.value })} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Condições de pagamento">
            <textarea rows={2} value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })} />
          </Campo>
          <Campo label="Observações">
            <textarea rows={2} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
          </Campo>
        </div>
      </div>

      {/* Seções e itens */}
      {secoes.map(sec => {
        const maoDeObra = ehMaoDeObra(sec.nome);
        const colunas = maoDeObra
          ? '0.9fr 1.2fr 3.1fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px'
          : '0.9fr 1.2fr 2.4fr 0.9fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px';
        const opcoesSubgrupo = subgruposDaSecao(sec.id);

        return (
          <div key={sec.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input
                value={sec.nome}
                onChange={e => renomearSecao(sec.id, e.target.value)}
                style={{ fontWeight: 700, color: '#c9a227', fontSize: 13, flex: 1, background: 'transparent', border: '1px solid transparent' }}
                onFocus={e => e.target.style.border = '1px solid #2a2a2a'}
                onBlur={e => e.target.style.border = '1px solid transparent'}
              />
              <span style={{ fontSize: 12, color: '#666' }}>Subtotal: <b style={{ color: '#c9a227' }}>{formatarMoeda(subtotalSecao(sec.id))}</b></span>
              <button onClick={() => removerSecao(sec.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover seção">
                <Trash2 size={13} />
              </button>
            </div>

            {itens.filter(it => it.sid === sec.id).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                <span>Subgrupo</span>
                <span>{maoDeObra ? 'Categoria' : 'Catálogo'}</span>
                <span>Descrição</span>
                {!maoDeObra && <span>NCM/SH</span>}
                <span>Qtd</span><span>Un.</span><span>Vlr. Unit.</span><span>Total</span><span>Status</span><span />
              </div>
            )}

            {itensAgrupados(sec.id).map(linha => {
              if (linha.tipo === 'cabecalho') {
                return (
                  <div key={linha.key} style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, marginBottom: 6 }}>
                    {linha.nome}
                  </div>
                );
              }
              if (linha.tipo === 'subtotal') {
                return (
                  <div key={linha.key} style={{ textAlign: 'right', fontSize: 11, color: '#777', paddingRight: 4, marginBottom: 10 }}>
                    Subtotal {linha.nome}: <b style={{ color: '#c9a227' }}>{formatarMoeda(linha.soma)}</b>
                  </div>
                );
              }
              const it = linha.item;
              const aCotar = it.status === 'a_cotar';
              return (
                <div
                  key={it.id}
                  style={{
                    display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 8, alignItems: 'center',
                    background: aCotar ? 'rgba(201,162,39,0.08)' : 'transparent',
                    borderRadius: 4, padding: aCotar ? '4px 4px' : 0,
                  }}
                >
                  <select
                    value={it.subgrupo || ''}
                    onChange={e => {
                      if (e.target.value === '__novo__') {
                        const novo = window.prompt('Nome do novo subgrupo:', it.subgrupo || '');
                        if (novo !== null) atualizarItem(it.id, 'subgrupo', novo.trim());
                        return;
                      }
                      atualizarItem(it.id, 'subgrupo', e.target.value);
                    }}
                  >
                    <option value="">(sem subgrupo)</option>
                    {opcoesSubgrupo.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                    {it.subgrupo && !opcoesSubgrupo.includes(it.subgrupo) && (
                      <option value={it.subgrupo}>{it.subgrupo}</option>
                    )}
                    <option value="__novo__">+ novo subgrupo...</option>
                  </select>
                  {maoDeObra ? (
                    <select value="" onChange={e => aplicarCategoriaMaoDeObra(it.id, e.target.value)}>
                      <option value="">+ categoria</option>
                      {CATEGORIAS_MAO_DE_OBRA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <select value="" onChange={e => aplicarMaterialNoItem(it.id, e.target.value)}>
                      <option value="">+ catálogo</option>
                      {materiais.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                    </select>
                  )}
                  <input value={it.descricao} onChange={e => atualizarItem(it.id, 'descricao', e.target.value)} placeholder="Descrição do item" />
                  {!maoDeObra && (
                    <input value={it.ncm} onChange={e => atualizarItem(it.id, 'ncm', e.target.value.replace(/[^\d.]/g, ''))} placeholder="NCM/SH" />
                  )}
                  <input type="number" step="1" min="0" value={it.quantidade} onChange={e => atualizarItem(it.id, 'quantidade', e.target.value)} />
                  <input value={it.unidade} onChange={e => atualizarItem(it.id, 'unidade', e.target.value)} />
                  <CampoMoeda value={it.valor_unitario} onChange={v => atualizarItem(it.id, 'valor_unitario', v)} />
                  <span style={{ fontSize: 12, color: '#ccc', textAlign: 'right', paddingRight: 4 }}>
                    {formatarMoeda((Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0))}
                  </span>
                  <select value={it.status || 'confirmado'} onChange={e => atualizarItem(it.id, 'status', e.target.value)}>
                    <option value="confirmado">Confirmado</option>
                    <option value="a_cotar">A cotar</option>
                  </select>
                  <button onClick={() => removerItem(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover item">
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            <button onClick={() => adicionarItem(sec.id)} style={{ ...btnSecundario, marginTop: 4 }}>
              <Plus size={13} style={{ marginRight: 4 }} /> Adicionar item
            </button>
          </div>
        );
      })}

      <button onClick={adicionarSecao} style={{ ...btnSecundario, marginBottom: 18 }}>
        <FolderPlus size={13} style={{ marginRight: 4 }} /> Adicionar seção
      </button>

      {/* Totais */}
      <div style={{ ...card, position: 'sticky', bottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
            <Totalzinho label="Materiais" valor={subtotalMateriais} />
            <Totalzinho label="Mão de obra" valor={subtotalMaoObra} />
            <div>
              <label style={rotulo}>Imp. Vendas (%)</label>
              <input type="number" step="0.1" min="0" value={form.imposto_venda} onChange={e => setForm({ ...form, imposto_venda: e.target.value })} style={{ width: 80 }} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{formatarMoeda(valorImpostoVenda)}</div>
            </div>
            <div>
              <label style={rotulo}>Imp. Serviços (%)</label>
              <input type="number" step="0.1" min="0" value={form.imposto_servico} onChange={e => setForm({ ...form, imposto_servico: e.target.value })} style={{ width: 80 }} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{formatarMoeda(valorImpostoServico)}</div>
            </div>
            <div>
              <label style={rotulo}>BDI (%)</label>
              <input type="number" step="0.1" min="0" value={form.bdi} onChange={e => setForm({ ...form, bdi: e.target.value })} style={{ width: 80 }} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{formatarMoeda(valorBdi)}</div>
            </div>
            <div>
              <label style={rotulo} title="Aumenta ou desconta todos os valores da proposta de uma vez. Use (+) pra aumentar, (-) pra descontar.">Ajuste Geral (%)</label>
              <input type="number" step="0.1" value={form.ajuste_geral} onChange={e => setForm({ ...form, ajuste_geral: e.target.value })} style={{ width: 80 }} />
              <div style={{ fontSize: 11, color: Number(form.ajuste_geral) < 0 ? '#e08080' : '#666', marginTop: 4 }}>{formatarMoeda(valorAjusteGeral)}</div>
            </div>
            <div>
              <div style={rotulo}>Total geral</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a227' }}>{formatarMoeda(total)}</div>
            </div>
          </div>
          {propostaSalva ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: alteracoesPendentes ? '#c9a227' : '#3fb95f', marginRight: 4, whiteSpace: 'nowrap' }}>
                {alteracoesPendentes
                  ? `Proposta ${propostaSalva.numero} — alterações não salvas`
                  : `Proposta ${propostaSalva.numero} salva`}
              </span>
              {alteracoesPendentes && (
                <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, padding: '13px 20px', fontSize: 13 }}>
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
              <button onClick={baixarPdf} disabled={gerandoPdf || alteracoesPendentes} style={btnSecundario}
                title={alteracoesPendentes ? 'Salve as alterações antes de gerar o PDF' : ''}>
                <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
              </button>
              <button onClick={() => setModalEmail(true)} disabled={alteracoesPendentes} style={btnSecundario}
                title={alteracoesPendentes ? 'Salve as alterações antes de enviar' : ''}>
                <Send size={13} style={{ marginRight: 4 }} /> Enviar E-mail
              </button>
              <button onClick={novoOrcamento} style={{ ...btnPrimario, padding: '13px 20px', fontSize: 13 }}>
                <FilePlus2 size={13} style={{ marginRight: 4 }} /> Novo Orçamento
              </button>
            </div>
          ) : (
            <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, padding: '13px 26px', fontSize: 13 }}>
              {salvando ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Salvar Proposta')}
            </button>
          )}
        </div>
      </div>

      <ModalEnviarEmail
        aberto={modalEmail}
        onFechar={() => setModalEmail(false)}
        proposta={propostaSalva}
        emailInicial={clienteResolvido?.email || ''}
      />
    </div>
  );
}

function Totalzinho({ label, valor }) {
  return (
    <div>
      <div style={rotulo}>{label}</div>
      <div style={{ fontSize: 15, color: '#ccc', fontWeight: 600 }}>{formatarMoeda(valor)}</div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={rotulo}>{label}</label>
      {children}
    </div>
  );
}

const rotulo = { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' };

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 20, marginBottom: 16
};

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
