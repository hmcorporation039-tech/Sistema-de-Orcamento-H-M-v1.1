import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import { getObras, criarObra } from '../../services/api';
import Select from '../../components/Select';
import ClienteSelect from '../../components/ClienteSelect';
import Modal from '../../components/ui/Modal';
import Paginacao from '../../components/Paginacao';
import { invalidarCacheObras } from '../../components/ObraSelect';
import { STATUS_OBRA, SEGMENTO, SEGMENTO_CURTO, BASE_ORCADO, Etiqueta, moeda, pct, corMargem, estilos as E, Campo } from './comum';

// Aba "Obras" do hub Obras (versão 2.0, Fase 2D): lista com filtros e, por
// obra, orçado × realizado × margem (regra no backend: utils/obras.js).
export default function ListaObras() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [segmento, setSegmento] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1, restrito_financeiro: false });
  const [carregando, setCarregando] = useState(true);
  const [novaAberta, setNovaAberta] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina, porPagina: 30 };
      if (busca) params.busca = busca;
      if (status) params.status = status;
      if (segmento) params.segmento = segmento;
      if (clienteId) params.cliente_id = clienteId;
      const r = await getObras(params);
      setDados(r.data);
    } catch {
      toast.error('Erro ao carregar as obras');
    } finally {
      setCarregando(false);
    }
  }, [busca, status, segmento, clienteId, pagina]);

  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [carregar]);
  useEffect(() => { setPagina(1); }, [busca, status, segmento, clienteId]);

  const restrito = dados.restrito_financeiro;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Obras</h2>
        <button type="button" onClick={() => setNovaAberta(true)} style={E.btnPrimario}><Plus size={14} /> Nova obra</button>
      </div>

      <div style={{ ...E.card, display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 1fr 1fr minmax(180px, 1.5fr)', gap: 12, alignItems: 'end' }}>
        <Campo label="Buscar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código, nome, cliente ou local..." style={{ paddingLeft: 30 }} />
          </div>
        </Campo>
        <Campo label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
          </Select>
        </Campo>
        <Campo label="Segmento">
          <Select value={segmento} onChange={e => setSegmento(e.target.value)}>
            <option value="">Todos</option>
            <option value="publico">Público</option>
            <option value="privado">Privado</option>
          </Select>
        </Campo>
        <Campo label="Cliente">
          <ClienteSelect value={clienteId} onChange={e => setClienteId(e.target.value)} rotuloVazio="Todos" />
        </Campo>
      </div>

      <div style={E.caixaTabela}>
        <table style={E.tabela}>
          <thead>
            <tr style={{ background: '#0f0f0f' }}>
              <th style={E.th}>Código</th>
              <th style={E.th}>Obra</th>
              <th style={E.th}>Cliente</th>
              <th style={E.th}>Status</th>
              <th style={E.th}>Itens</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Orçado</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Realizado</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={8} style={E.tdVazio}>Carregando...</td></tr>}
            {!carregando && dados.itens.length === 0 && <tr><td colSpan={8} style={E.tdVazio}>Nenhuma obra encontrada</td></tr>}
            {!carregando && dados.itens.map(o => {
              const r = o.resumo || {};
              return (
                <tr key={o.id} style={{ borderTop: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={() => navigate(`/obras/${o.id}`)}>
                  <td style={{ ...E.td, whiteSpace: 'nowrap' }}><Link to={`/obras/${o.id}`} style={E.link} onClick={e => e.stopPropagation()}>{o.codigo}</Link></td>
                  <td style={E.td}>
                    <div style={{ color: '#ddd', fontWeight: 600 }}>{o.nome}</div>
                    {o.local && o.local !== o.nome && <div style={{ color: '#777', fontSize: 11 }}>{o.local}</div>}
                  </td>
                  <td style={E.td}>
                    {o.cliente_nome || '—'}
                    <div style={{ color: '#666', fontSize: 10 }}>{SEGMENTO_CURTO[o.segmento]}</div>
                  </td>
                  <td style={E.td}><Etiqueta info={STATUS_OBRA[o.status]}>{STATUS_OBRA[o.status]?.rotulo || o.status}</Etiqueta></td>
                  <td style={{ ...E.td, color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {o.qtd_analises} análise · {o.qtd_projetos ?? 0} projeto · {o.qtd_laudos} laudo · {o.qtd_propostas} proposta
                    {!restrito && <div>{o.qtd_contratos} contrato · {o.qtd_movimentos} mov.</div>}
                  </td>
                  <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap' }} title={BASE_ORCADO[r.orcado_base]}>
                    <span style={{ color: '#c9a227', fontWeight: 700 }}>{moeda(r.orcado)}</span>
                    {r.orcado_base === 'ultima_ativa' && <div style={{ color: '#777', fontSize: 10 }}>estimado</div>}
                  </td>
                  <td style={{ ...E.td, textAlign: 'right', color: '#e08080', whiteSpace: 'nowrap' }}>{restrito ? '—' : moeda(r.realizado)}</td>
                  <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap', color: corMargem(r.margem), fontWeight: 700 }}>
                    {restrito ? '—' : moeda(r.margem)}
                    {!restrito && r.margem_pct != null && <div style={{ fontSize: 10, fontWeight: 400 }}>{pct(r.margem_pct)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />
      {restrito && <p style={{ color: '#666', fontSize: 11, marginTop: 8 }}>Realizado e margem aparecem só para administradores (dependem do financeiro).</p>}

      {novaAberta && (
        <NovaObra
          onFechar={() => setNovaAberta(false)}
          onCriada={(obra) => { invalidarCacheObras(); setNovaAberta(false); navigate(`/obras/${obra.id}`); }}
        />
      )}
    </div>
  );
}

function NovaObra({ onFechar, onCriada }) {
  const [form, setForm] = useState({ nome: '', cliente_id: '', local: '', segmento: '', status: 'orcamento' });
  const [salvando, setSalvando] = useState(false);
  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Informe o nome da obra'); return; }
    setSalvando(true);
    try {
      const { data } = await criarObra({
        nome: form.nome.trim(), cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        local: form.local, status: form.status, ...(form.segmento ? { segmento: form.segmento } : {}),
      });
      toast.success(`Obra ${data.codigo} criada`);
      onCriada(data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao criar a obra');
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Modal titulo="Nova obra" onFechar={onFechar} espacoTitulo={16} style={{ padding: 24 }}>
      <form onSubmit={salvar}>
        <Campo label="Nome da obra *" style={{ marginBottom: 12 }}>
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
        </Campo>
        <Campo label="Cliente" style={{ marginBottom: 12 }}>
          <ClienteSelect value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} />
        </Campo>
        <Campo label="Local" style={{ marginBottom: 12 }}>
          <input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Endereço / local da obra" />
        </Campo>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Segmento">
            <Select value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })}>
              <option value="">Pelo tipo do cliente</option>
              {Object.entries(SEGMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Campo>
          <Campo label="Status">
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </Select>
          </Campo>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={E.btnSecundario}>Cancelar</button>
          <button type="submit" disabled={salvando} style={E.btnPrimario}>{salvando ? 'Criando...' : 'Criar obra'}</button>
        </div>
      </form>
    </Modal>
  );
}
