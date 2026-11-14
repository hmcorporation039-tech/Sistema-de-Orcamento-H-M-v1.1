import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, FileSearch } from 'lucide-react';
import { getObras, criarObra, getObrasParecidas } from '../../services/api';
import Select from '../../components/Select';
import ClienteSelect from '../../components/ClienteSelect';
import Modal from '../../components/ui/Modal';
import Paginacao from '../../components/Paginacao';
import CampoBusca from '../../components/ui/CampoBusca';
import PixSemObra from './PixSemObra';
import { invalidarCacheObras } from '../../components/ObraSelect';
import { formatarData, hojeBrasilia } from '../../utils/format';
import { normalizarNome } from '../../utils/texto';
import { STATUS_OBRA, SEGMENTO, BASE_ORCADO, Etiqueta, moeda, pct, corMargem, estilos as E, Campo, resumoItens, orcadoTexto } from './comum';
import { BotaoProximoPasso } from './EtapasObra';

// Aba "Obras" do hub Obras. Revisão de 14/11/2026 (2.42): botões de status com a contagem (abre em
// "Em andamento" — concluídas e canceladas só quando pedidas), a etapa e o PRÓXIMO PASSO de cada obra
// (regra no backend: utils/obras.js proximoPasso), responsável e prazo; a coluna de itens virou uma linha
// curta só com o que existe; margem sem custo ligado aparece como "sem pagamentos ligados" (antes: 100 %).
const EM_ANDAMENTO = ['prospeccao', 'orcamento', 'contratada', 'execucao'];
const FILTROS = [
  { chave: 'andamento', rotulo: 'Em andamento', status: EM_ANDAMENTO },
  ...Object.entries(STATUS_OBRA).map(([k, v]) => ({ chave: k, rotulo: v.rotulo, status: [k] })),
  { chave: 'todas', rotulo: 'Todas', status: [] },
];
const FILTRO_SALVO = 'hm_obras_filtro_status';
const lerFiltro = () => { try { return localStorage.getItem(FILTRO_SALVO) || 'andamento'; } catch { return 'andamento'; } };

export default function ListaObras() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(lerFiltro);
  const [segmento, setSegmento] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1, restrito_financeiro: false, contagem_status: null });
  const [carregando, setCarregando] = useState(true);
  const [novaAberta, setNovaAberta] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina, porPagina: 30 };
      const f = FILTROS.find(x => x.chave === filtro) || FILTROS[0];
      if (busca) params.busca = busca;
      if (f.status.length) params.status = f.status.join(',');
      if (segmento) params.segmento = segmento;
      if (clienteId) params.cliente_id = clienteId;
      const r = await getObras(params);
      setDados(r.data);
    } catch {
      toast.error('Erro ao carregar as obras');
    } finally {
      setCarregando(false);
    }
  }, [busca, filtro, segmento, clienteId, pagina]);

  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [carregar]);
  useEffect(() => { setPagina(1); }, [busca, filtro, segmento, clienteId]);
  const escolherFiltro = (k) => { setFiltro(k); try { localStorage.setItem(FILTRO_SALVO, k); } catch { /* sem armazenamento: só não lembra */ } };

  const restrito = dados.restrito_financeiro;
  const cont = dados.contagem_status;
  const contagem = (f) => (cont ? (f.status.length ? f.status : Object.keys(STATUS_OBRA)).reduce((s, k) => s + (cont[k] || 0), 0) : null);
  const hoje = hojeBrasilia();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div role="group" aria-label="Filtrar por status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {FILTROS.map(f => {
            const n = contagem(f);
            const ativo = f.chave === filtro;
            if (n === 0 && !ativo && !['andamento', 'todas'].includes(f.chave)) return null; // status sem nenhuma obra: não ocupa espaço
            return (
              <button key={f.chave} type="button" aria-pressed={ativo} onClick={() => escolherFiltro(f.chave)} data-testid={`filtro-${f.chave}`}
                style={{ ...E.btnSecundario, padding: '6px 12px', fontSize: 12.5, background: ativo ? 'var(--ouro)' : 'var(--superficie-2)', color: ativo ? '#111' : 'var(--texto)', fontWeight: ativo ? 700 : 500, borderColor: ativo ? 'var(--ouro)' : 'var(--borda-forte)' }}>
                {f.rotulo}{n != null ? <span style={{ opacity: 0.75 }}> {n}</span> : null}
              </button>
            );
          })}
        </div>
        <Link to="/obras?aba=analise" style={E.btnSecundario} title="Recebeu um projeto e ainda não sabe a obra? Analise primeiro e ligue depois"><FileSearch size={14} /> Analisar projeto recebido</Link>
        <button type="button" onClick={() => setNovaAberta(true)} style={E.btnPrimario}><Plus size={14} /> Nova obra</button>
      </div>

      {!restrito && <PixSemObra aoMudar={carregar} />}

      <div style={{ ...E.card, display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 1fr minmax(180px, 1.5fr)', gap: 12, alignItems: 'end', padding: 16 }}>
        <Campo label="Buscar">
          <CampoBusca value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código, nome, cliente ou local..." />
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
            <tr>
              <th style={E.th}>Código</th>
              <th style={E.th}>Obra · cliente</th>
              <th style={E.th}>Etapa e próximo passo</th>
              <th style={E.th}>Responsável · prazo</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Orçado</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Realizado</th>
              <th style={{ ...E.th, textAlign: 'right' }}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={7} style={E.tdVazio}>Carregando...</td></tr>}
            {!carregando && dados.itens.length === 0 && (
              <tr><td colSpan={7} style={E.tdVazio}>
                Nenhuma obra {filtro === 'andamento' ? 'em andamento' : 'encontrada'} com esses filtros.
                {filtro !== 'todas' && <> <button type="button" onClick={() => escolherFiltro('todas')} style={{ ...E.botaoTexto, ...E.link }}>Ver todas</button></>}
              </td></tr>
            )}
            {!carregando && dados.itens.map(o => {
              const r = o.resumo || {};
              const passo = o.proximo_passo;
              const atrasada = o.fim_previsto && String(o.fim_previsto).slice(0, 10) < hoje && !['concluida', 'cancelada'].includes(o.status);
              const itens = resumoItens(o, restrito);
              return (
                <tr key={o.id} style={{ ...E.linhaTabela, cursor: 'pointer' }} onClick={() => navigate(`/obras/${o.id}`)}>
                  <td style={{ ...E.td, whiteSpace: 'nowrap' }}><Link to={`/obras/${o.id}`} style={E.link} onClick={e => e.stopPropagation()}>{o.codigo}</Link></td>
                  {/* largura mínima: com o menu lateral a coluna ficava estreita e o nome quebrava em 5–6 linhas */}
                  <td style={{ ...E.td, minWidth: 240 }}>
                    <div style={{ color: 'var(--texto)', fontWeight: 600 }}>{o.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                      {!o.cliente_nome
                        ? <span style={{ color: '#d69a2d' }} title="Escolha o cliente na obra (Visão geral › Editar)">sem cliente</span>
                        : !normalizarNome(o.nome).includes(normalizarNome(o.cliente_nome)) && o.cliente_nome /* o nome da obra já cita o cliente: não repete */}
                      {o.local && !normalizarNome(o.nome).includes(normalizarNome(o.local)) && <span style={{ color: 'var(--texto-3)' }}>{o.cliente_nome && !normalizarNome(o.nome).includes(normalizarNome(o.cliente_nome)) ? ' · ' : ''}{o.local}</span>}
                    </div>
                    {itens && <div style={{ color: 'var(--texto-3)', fontSize: 11.5, marginTop: 2 }}>{itens}</div>}
                  </td>
                  <td style={{ ...E.td, minWidth: 210, maxWidth: 300 }} onClick={e => e.stopPropagation()}>
                    <Etiqueta info={STATUS_OBRA[o.status]}>{STATUS_OBRA[o.status]?.rotulo || o.status}</Etiqueta>
                    {passo && <div style={{ color: 'var(--texto-2)', fontSize: 12, margin: '5px 0 4px', lineHeight: 1.4 }}>{passo.texto}</div>}
                    {passo?.acao && passo.acao.tipo !== 'status' && (
                      <BotaoProximoPasso compacto acao={passo.acao} onSecao={(s) => navigate(`/obras/${o.id}?secao=${s}`)} />
                    )}
                  </td>
                  <td style={{ ...E.td, fontSize: 12.5 }}>
                    <div>{o.responsavel_nome || <span style={{ color: 'var(--texto-3)' }}>—</span>}</div>
                    {o.fim_previsto && <div style={{ color: atrasada ? '#e08080' : 'var(--texto-3)', fontSize: 12 }} title={atrasada ? 'Prazo previsto já passou' : 'Fim previsto'}>{atrasada && <AlertTriangle size={11} style={{ verticalAlign: -1 }} />} até {formatarData(o.fim_previsto)}</div>}
                  </td>
                  <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap' }} title={BASE_ORCADO[r.orcado_base]}>
                    <span style={{ color: '#c9a227', fontWeight: 700 }}>{orcadoTexto(r)}</span>
                    {r.orcado_base === 'ultima_ativa' && <div style={{ color: 'var(--texto-3)', fontSize: 11.5 }}>estimado</div>}
                  </td>
                  <td style={{ ...E.td, textAlign: 'right', color: '#e08080', whiteSpace: 'nowrap' }}>{restrito || r.sem_custos ? '—' : moeda(r.realizado)}</td>
                  <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap', color: corMargem(restrito || r.sem_custos ? null : r.margem), fontWeight: 700 }}>
                    {restrito ? '—' : r.sem_custos
                      ? <span style={{ color: 'var(--texto-3)', fontWeight: 400, fontSize: 12 }} title="Nenhum pagamento ligado a esta obra: a margem ainda não diz nada">sem pagamentos ligados</span>
                      : <>{moeda(r.margem)}{r.margem_pct != null && <div style={{ fontSize: 11.5, fontWeight: 400 }}>{pct(r.margem_pct)}</div>}</>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />
      {restrito && <p style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 8 }}>Realizado e margem aparecem só para administradores (dependem do financeiro).</p>}

      {novaAberta && (
        <NovaObra
          onFechar={() => setNovaAberta(false)}
          onCriada={(obra) => { invalidarCacheObras(); setNovaAberta(false); navigate(`/obras/${obra.id}`); }}
        />
      )}
    </div>
  );
}

// Nova obra: avisa quando já existe uma obra parecida (mesmo nome, mesmo local ou várias palavras em comum
// no mesmo cliente — utils/obras.js obrasParecidas), com o link para abrir a que já existe.
function NovaObra({ onFechar, onCriada }) {
  const [form, setForm] = useState({ nome: '', cliente_id: '', local: '', segmento: '', status: 'orcamento' });
  const [salvando, setSalvando] = useState(false);
  const [parecidas, setParecidas] = useState([]);
  useEffect(() => {
    if (form.nome.trim().length < 3 && form.local.trim().length < 3) { setParecidas([]); return undefined; }
    const t = setTimeout(() => {
      getObrasParecidas({ nome: form.nome, local: form.local, ...(form.cliente_id ? { cliente_id: form.cliente_id } : {}) })
        .then(r => setParecidas(r.data.itens || [])).catch(() => setParecidas([]));
    }, 400);
    return () => clearTimeout(t);
  }, [form.nome, form.local, form.cliente_id]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Informe o nome da obra'); return; }
    if (parecidas.length && !window.confirm(`Já existe obra parecida (${parecidas.map(o => o.codigo).join(', ')}). Criar mesmo assim?`)) return;
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
        <Campo label="Cliente" style={{ marginBottom: 12 }}>
          <ClienteSelect value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} />
        </Campo>
        <Campo label="Nome da obra *" style={{ marginBottom: 12 }}>
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus placeholder="ex.: Reforma elétrica do bloco B" />
        </Campo>
        <Campo label="Local" style={{ marginBottom: 12 }}>
          <input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Endereço / local da obra" />
        </Campo>
        {parecidas.length > 0 && (
          <div data-testid="obras-parecidas" style={{ border: '1px solid #4a3d10', background: '#16140c', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12.5 }}>
            <div style={{ color: '#e2c35a', fontWeight: 700, marginBottom: 4 }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Já existe obra parecida — não seria a mesma?</div>
            {parecidas.map(o => (
              <div key={o.id} style={{ color: 'var(--texto-2)', marginTop: 3 }}>
                <Link to={`/obras/${o.id}`} style={E.link} onClick={onFechar}>{o.codigo}</Link> — {o.nome}{o.cliente_nome ? ` · ${o.cliente_nome}` : ''} ({STATUS_OBRA[o.status]?.rotulo || o.status})
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Segmento">
            <Select value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })}>
              <option value="">Pelo tipo do cliente</option>
              {Object.entries(SEGMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Campo>
          <Campo label="Status">
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_OBRA).filter(([k]) => k !== 'cancelada').map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
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
