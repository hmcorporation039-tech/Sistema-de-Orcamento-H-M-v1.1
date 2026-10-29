import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Trash2, X, FileDown, FileSpreadsheet, Copy, Send, Pencil, Plus, Link2, CheckCircle2, XCircle } from 'lucide-react';
import {
  getPropostas, getProposta, atualizarStatus, removerProposta, duplicarProposta, getRelatorioPropostas,
  exportarRelatorioPropostas, baixarPdfProposta,
} from '../services/api';
import { formatarMoeda, formatarData, formatarNcm } from '../utils/format';
import { baixarArquivo, salvarBlob, mensagemDeErro } from '../utils/download';
import Paginacao from '../components/Paginacao';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import Select from '../components/Select';
import BotaoLinkAprovacao from '../components/BotaoLinkAprovacao';
import { useClientes } from '../components/ClienteSelect';
import Modal from '../components/ui/Modal';
import { estilos } from '../components/ui/estilos';
import { STATUS_PROPOSTA as STATUS_CORES } from '../utils/statusProposta';

const ACAO_LABEL = {
  criada: 'Criada',
  editada: 'Editada',
  status: 'Status alterado',
  duplicada: 'Duplicada',
  email: 'Enviada por e-mail',
  link_aprovacao: 'Link de aprovação',
  link_revogado: 'Link revogado',
  aprovada_link: 'Aprovada pelo cliente (link)',
  recusada_link: 'Recusada pelo cliente (link)',
};

const dataHoraCurta = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Decisão do cliente pelo link de aprovação (decisao_cliente da listagem:
// { decisao, nome, data } da última decisão). Selo pequeno ao lado do status;
// o nome e a hora ficam na dica (title) para não alargar a tabela.
function SeloDecisaoCliente({ decisao }) {
  if (!decisao?.decisao) return null;
  const aprovou = decisao.decisao === 'aprovada';
  const quando = decisao.data ? new Date(decisao.data) : null;
  const dica = `${aprovou ? 'Aprovada' : 'Recusada'} pelo cliente pelo link de aprovação`
    + (decisao.nome ? ` — ${decisao.nome}` : '')
    + (quando ? `, ${dataHoraCurta(quando)}` : '');
  const Icone = aprovou ? CheckCircle2 : XCircle;
  return (
    <span title={dica} aria-label={dica} data-testid="selo-decisao-cliente"
      style={{
        marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20,
        fontSize: 10, fontWeight: 700, verticalAlign: 'middle',
        background: aprovou ? '#0a1a0f' : '#1a0a0a', color: aprovou ? '#3fb95f' : '#d06060',
        border: `1px dashed ${aprovou ? '#1a4a26' : '#4a1a1a'}`,
      }}>
      <Icone size={11} /> {aprovou ? 'Cliente aprovou' : 'Cliente recusou'}
      {quando ? ` ${quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
    </span>
  );
}

// Remove acentuação e normaliza caixa/espaços — usado pra achar o cliente pelo
// nome quando a proposta não está linkada por cliente_id (ex.: "CLINICA" na
// proposta x "CLÍNICA" no cadastro são o mesmo cliente).
function normalizarNome(txt) {
  return (txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// Só faz sentido avisar sobre vencimento de propostas que ainda estão em aberto.
// As linhas que vêm do resumo por período (/relatorios/propostas) não trazem a
// validade — sem ela não dá para calcular, e não se pode supor "0 dias" (isso
// marcaria toda proposta ativa antiga como vencida).
function diasParaVencer(p) {
  if (p.status !== 'Ativa' || !p.data || p.validade == null) return null;
  const dataLimite = new Date(p.data);
  dataLimite.setUTCDate(dataLimite.getUTCDate() + (Number(p.validade) || 0));
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((dataLimite.getTime() - hojeUTC) / 86400000);
}

// Mesmo tamanho de página do backend (utils/paginacao.js), para a lista ter o
// mesmo jeito com ou sem período escolhido.
const POR_PAGINA = 30;

// A rota /relatorios/propostas sempre filtra por período (sem datas ela usa o
// mês atual). Sem período escolhido aqui, a lista mostra todo o histórico —
// então o resumo e a exportação vão de uma data bem antiga até hoje.
const INICIO_DO_HISTORICO = '2000-01-01';

function paraIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hojeIso() {
  return paraIso(new Date());
}

const ATALHOS_PERIODO = [
  { rotulo: 'Todo o histórico', calcular: () => ['', ''] },
  { rotulo: 'Este mês', calcular: () => { const d = new Date(); return [paraIso(new Date(d.getFullYear(), d.getMonth(), 1)), hojeIso()]; } },
  { rotulo: 'Mês passado', calcular: () => { const d = new Date(); return [paraIso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), paraIso(new Date(d.getFullYear(), d.getMonth(), 0))]; } },
  { rotulo: 'Este ano', calcular: () => [`${new Date().getFullYear()}-01-01`, hojeIso()] },
];

function filtrosDoRelatorio(dataInicio, dataFim, status, busca) {
  return {
    dataInicio, dataFim,
    ...(status ? { status } : {}),
    ...(busca ? { busca } : {}),
  };
}

// Lista de propostas (aba "Propostas" do hub Propostas). Na versão 2.0 juntou
// o antigo Histórico com o antigo Relatórios: os filtros de período/status/
// busca, os totais e a exportação CSV/PDF ficam no topo da lista.
//   - Sem período: a lista vem de /propostas (paginada no servidor, com o aviso
//     de vencimento) e o resumo de /relatorios/propostas com todo o histórico.
//   - Com período: a mesma chamada de /relatorios/propostas dá o resumo e a
//     lista (o /propostas não filtra por data), paginada aqui no navegador.
export default function Historico() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState([]);
  const clientes = useClientes(); // todas as páginas, só ativos (antes: cortava em 1000)
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [relatorio, setRelatorio] = useState({ propostas: [], totais: { propostas: 0, valorTotal: 0, valorAprovado: 0 } });
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(true);
  const [exportando, setExportando] = useState(null);
  // Incrementa para recarregar lista e resumo depois de mudar status, excluir ou duplicar
  const [versao, setVersao] = useState(0);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
  // Proposta com o modal do link de aprovação aberto ({ id, numero, status }).
  // Um modal só, fora da tabela: recarregar a lista (depois de gerar o link ou de
  // uma decisão do cliente) não o fecha — o endereço novo só aparece uma vez.
  const [linkAprovacao, setLinkAprovacao] = useState(null);

  const temPeriodo = Boolean(dataInicio || dataFim);
  const inicioEfetivo = dataInicio || INICIO_DO_HISTORICO;
  const fimEfetivo = dataFim || hojeIso();

  // Fallback pro e-mail do cliente quando a proposta não está linkada por
  // cliente_id (detalhe.cliente_email vem nulo) — busca pelo nome no cadastro.
  const clienteResolvidoPeloNome = useMemo(
    () => clientes.find(c => normalizarNome(c.nome) === normalizarNome(detalhe?.cliente_nome)),
    [clientes, detalhe?.cliente_nome]
  );

  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => { setPagina(1); }, [busca, statusFiltro, dataInicio, dataFim]);

  // Resumo (totais) — e, com período escolhido, também a lista
  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      setCarregandoRelatorio(true);
      try {
        const res = await getRelatorioPropostas(filtrosDoRelatorio(inicioEfetivo, fimEfetivo, statusFiltro, busca));
        if (!cancelado) setRelatorio(res.data);
      } catch {
        if (!cancelado) toast.error('Erro ao calcular o resumo das propostas');
      } finally {
        if (!cancelado) setCarregandoRelatorio(false);
      }
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [inicioEfetivo, fimEfetivo, statusFiltro, busca, versao]);

  // Lista paginada no servidor (só sem período)
  useEffect(() => {
    if (temPeriodo) return undefined;
    let cancelado = false;
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const res = await getPropostas({
          ...(busca ? { busca } : {}),
          ...(statusFiltro ? { status: statusFiltro } : {}),
          pagina,
        });
        if (cancelado) return;
        setPropostas(res.data.itens);
        setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
      } catch {
        if (!cancelado) toast.error('Erro ao carregar propostas');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [temPeriodo, busca, statusFiltro, pagina, versao]);

  const doPeriodo = relatorio.propostas || [];
  const totalPaginasPeriodo = Math.max(1, Math.ceil(doPeriodo.length / POR_PAGINA));
  const paginaPeriodo = Math.min(pagina, totalPaginasPeriodo);
  const linhas = temPeriodo
    ? doPeriodo.slice((paginaPeriodo - 1) * POR_PAGINA, paginaPeriodo * POR_PAGINA)
    : propostas;
  const carregandoLista = temPeriodo ? carregandoRelatorio : carregando;
  // status atual da proposta do modal (a decisão do cliente pode mudá-lo)
  const statusLinkAprovacao = linkAprovacao
    ? (linhas.find(l => l.id === linkAprovacao.id)?.status || linkAprovacao.status)
    : null;
  const totais = relatorio.totais || { propostas: 0, valorTotal: 0, valorAprovado: 0 };

  function aplicarAtalho(atalho) {
    const [ini, fim] = atalho.calcular();
    setDataInicio(ini);
    setDataFim(fim);
  }

  function atalhoAtivo(atalho) {
    const [ini, fim] = atalho.calcular();
    return ini === dataInicio && fim === dataFim;
  }

  async function exportar(tipo) {
    setExportando(tipo);
    try {
      const params = filtrosDoRelatorio(inicioEfetivo, fimEfetivo, statusFiltro, busca);
      const res = await exportarRelatorioPropostas(tipo, params);
      // o nome daqui (com o período) diz mais que o genérico do servidor
      // ("relatório-propostas.csv"), então ele continua valendo
      salvarBlob(res.data, temPeriodo
        ? `Relatorio_Propostas_${inicioEfetivo}_a_${fimEfetivo}.${tipo}`
        : `Relatorio_Propostas_ate_${fimEfetivo}.${tipo}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, `Erro ao exportar ${tipo.toUpperCase()}`));
    } finally {
      setExportando(null);
    }
  }

  function editar(id) {
    navigate(`/propostas/editar/${id}`);
  }

  // cliques rápidos em propostas diferentes: só a resposta do ÚLTIMO pedido
  // vale (antes a mais lenta chegava depois e mostrava a proposta errada)
  const pedidoDetalheRef = useRef(0);
  async function abrirDetalhe(id) {
    const pedido = ++pedidoDetalheRef.current;
    setCarregandoDetalhe(true);
    setDetalhe({});
    try {
      const res = await getProposta(id);
      if (pedido !== pedidoDetalheRef.current) return;
      setDetalhe(res.data);
    } catch {
      if (pedido !== pedidoDetalheRef.current) return;
      toast.error('Erro ao carregar proposta');
      setDetalhe(null);
    } finally {
      if (pedido === pedidoDetalheRef.current) setCarregandoDetalhe(false);
    }
  }

  async function mudarStatus(id, status) {
    try {
      await atualizarStatus(id, status);
      toast.success(`Status atualizado para ${status}`);
      recarregar();
      if (detalhe?.id === id) abrirDetalhe(id);
    } catch (err) {
      // 409 APROVADA_PELO_CLIENTE (o cliente aceitou pelo link; só admin tira de
      // "Aprovada"), 403 de posse etc.: a mensagem do servidor diz o porquê
      toast.error(err.response?.data?.erro || 'Erro ao atualizar status', { duration: err.response?.status === 409 ? 10000 : 4000 });
      if (err.response?.status === 409) recarregar();
    }
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir a proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
    try {
      await removerProposta(p.id);
      toast.success('Proposta excluída');
      recarregar();
      if (detalhe?.id === p.id) setDetalhe(null);
    } catch {
      toast.error('Erro ao excluir proposta');
    }
  }

  async function duplicar(id) {
    setDuplicando(true);
    try {
      const res = await duplicarProposta(id);
      toast.success(res.data.mensagem);
      setDetalhe(null);
      recarregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao duplicar proposta');
    } finally {
      setDuplicando(false);
    }
  }

  async function baixarPdf(id, numero, clienteNome) {
    setGerandoPdf(true);
    try {
      // nome do servidor (o mesmo da cópia nas pastas); o montado aqui é só a reserva
      const nomeCliente = (clienteNome || '').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      await baixarArquivo(baixarPdfProposta(id), `${nomeCliente}_${numero}.pdf`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao gerar PDF'));
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Propostas</h2>
        <button onClick={() => navigate('/propostas?aba=editar')} style={btnPrimario}>
          <Plus size={13} /> Nova proposta
        </button>
      </div>

      {/* Filtros e exportação (antigo Relatórios) — valem para a lista e para os totais */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Campo label="Data início" largura={150}>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </Campo>
          <Campo label="Data fim" largura={150}>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </Campo>
          <Campo label="Status" largura={150}>
            <Select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="Ativa">Ativa</option>
              <option value="Aprovada">Aprovada</option>
              <option value="Recusada">Recusada</option>
              <option value="Cancelada">Cancelada</option>
            </Select>
          </Campo>
          <Campo label="Buscar" flexivel>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Número, cliente ou local..."
                style={{ paddingLeft: 30 }}
              />
            </div>
          </Campo>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => exportar('csv')}
              disabled={!!exportando || totais.propostas === 0}
              style={btnSecundario}
            >
              <FileSpreadsheet size={13} /> {exportando === 'csv' ? 'Gerando...' : 'Exportar CSV'}
            </button>
            <button
              onClick={() => exportar('pdf')}
              disabled={!!exportando || totais.propostas === 0}
              style={btnPrimario}
            >
              <FileDown size={13} /> {exportando === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
          <span style={{ ...rotulo, marginBottom: 0, marginRight: 4 }}>Período:</span>
          {ATALHOS_PERIODO.map(a => {
            const ativo = atalhoAtivo(a);
            return (
              <button
                key={a.rotulo}
                onClick={() => aplicarAtalho(a)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: ativo ? '1px solid #c9a227' : '1px solid #2a2a2a',
                  background: ativo ? '#c9a227' : 'transparent',
                  color: ativo ? '#000' : '#999',
                }}
              >
                {a.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
        <CardResumo label={temPeriodo ? 'Propostas no período' : 'Propostas (todo o histórico)'} valor={totais.propostas} />
        <CardResumo label="Valor total" valor={formatarMoeda(totais.valorTotal)} />
        <CardResumo label="Valor aprovado" valor={formatarMoeda(totais.valorAprovado)} destaque />
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Número</th>
              <th style={th}>Data</th>
              <th style={th}>Cliente</th>
              <th style={th}>Local</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregandoLista && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregandoLista && linhas.length === 0 && (
              <tr><td colSpan={7} style={tdVazio}>{temPeriodo ? 'Nenhuma proposta encontrada no período.' : 'Nenhuma proposta encontrada'}</td></tr>
            )}
            {!carregandoLista && linhas.map(p => {
              const cor = STATUS_CORES[p.status] || STATUS_CORES.Ativa;
              const dias = diasParaVencer(p);
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={() => abrirDetalhe(p.id)}>
                  <td style={{ ...td, color: '#c9a227', fontWeight: 700 }}>{p.numero}</td>
                  <td style={td}>{formatarData(p.data)}</td>
                  <td style={td}>{p.cliente_nome}</td>
                  <td style={td}>{p.local_obra || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(p.total)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cor.bg, color: cor.cor, border: `1px solid ${cor.borda}` }}>
                      {p.status}
                    </span>
                    {dias !== null && dias < 0 && (
                      <span style={{ marginLeft: 6, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#1a0a0a', color: '#b04040', border: '1px solid #4a1a1a' }}>
                        Vencida
                      </span>
                    )}
                    {dias !== null && dias >= 0 && dias <= 3 && (
                      <span style={{ marginLeft: 6, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#1a1408', color: '#d69a2d', border: '1px solid #4a3a10' }}>
                        {dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`}
                      </span>
                    )}
                    <SeloDecisaoCliente decisao={p.decisao_cliente} />
                  </td>
                  <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => editar(p.id)} style={btnIcone} title="Editar">
                        <Pencil size={13} />
                      </button>
                      {p.status === 'Ativa' && (
                        <button onClick={() => setLinkAprovacao({ id: p.id, numero: p.numero, status: p.status })}
                          style={btnIcone} title="Link de aprovação para o cliente"
                          aria-label={`Link de aprovação da proposta ${p.numero}`} data-testid="abrir-link-aprovacao">
                          <Link2 size={13} />
                        </button>
                      )}
                      {/* mantém o "excluir" alinhado nas linhas sem o ícone do link */}
                      {p.status !== 'Ativa' && <span aria-hidden="true" style={{ width: 26, flex: '0 0 26px' }} />}
                      <button onClick={() => excluir(p)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {temPeriodo ? (
        <Paginacao pagina={paginaPeriodo} totalPaginas={totalPaginasPeriodo} total={doPeriodo.length} onMudarPagina={setPagina} />
      ) : (
        <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />
      )}

      {detalhe && (
        // enquanto carrega, só o "Carregando..." (sem cabeçalho), como sempre foi
        <Modal titulo={carregandoDetalhe || !detalhe.id ? null : `Proposta ${detalhe.numero}`} rotulo="Detalhe da proposta"
          onFechar={() => setDetalhe(null)} largura={680} espacoTitulo={18} tamanhoTitulo={17} style={{ maxHeight: '88vh' }}>
            {carregandoDetalhe || !detalhe.id ? (
              <p style={{ color: '#666', textAlign: 'center', padding: 30 }}>Carregando...</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: 12 }}>
                  <InfoLinha label="Cliente" valor={detalhe.cliente_nome} />
                  <InfoLinha label="Data" valor={formatarData(detalhe.data)} />
                  <InfoLinha label="Local da obra" valor={detalhe.local_obra || '—'} />
                  <InfoLinha label="Validade" valor={`${detalhe.validade} dias`} />
                  <InfoLinha label="Tipo" valor={detalhe.tipo || '—'} />
                  <InfoLinha label="Porte" valor={detalhe.porte || '—'} />
                </div>

                {detalhe.secoes?.map(sec => (
                  <div key={sec.id} style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: 12, color: '#c9a227', fontWeight: 700, marginBottom: 8 }}>{sec.nome}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <tbody>
                        {detalhe.itens?.filter(it => it.secao_id === sec.id).map(it => (
                          <tr key={it.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                            <td style={{ padding: '6px 4px', color: '#ccc' }}>{it.descricao}</td>
                            <td style={{ padding: '6px 4px', color: '#888', width: 80 }}>{formatarNcm(it.ncm) || '—'}</td>
                            <td style={{ padding: '6px 4px', color: '#888', textAlign: 'right', width: 70 }}>{Number(it.quantidade)} {it.unidade}</td>
                            <td style={{ padding: '6px 4px', color: '#888', textAlign: 'right', width: 90 }}>{formatarMoeda(it.valor_unitario)}</td>
                            <td style={{ padding: '6px 4px', color: '#ccc', textAlign: 'right', width: 100, fontWeight: 700 }}>{formatarMoeda(it.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 14, marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 26, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: '#888' }}>Materiais: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_materiais)}</b></span>
                  {Number(detalhe.imposto_venda) > 0 && (
                    <span style={{ color: '#888' }}>Imp. Vendas ({detalhe.imposto_venda}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_imposto_venda)}</b></span>
                  )}
                  <span style={{ color: '#888' }}>Mão de obra: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_mao_obra)}</b></span>
                  {Number(detalhe.imposto_servico) > 0 && (
                    <span style={{ color: '#888' }}>Imp. Serviços ({detalhe.imposto_servico}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_imposto_servico)}</b></span>
                  )}
                  <span style={{ color: '#888' }}>BDI ({detalhe.bdi}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_bdi)}</b></span>
                  <span style={{ color: '#c9a227', fontSize: 14 }}>Total: <b>{formatarMoeda(detalhe.total)}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#666', marginRight: 4 }}>Status:</span>
                  {['Ativa', 'Aprovada', 'Recusada', 'Cancelada'].map(s => (
                    <button
                      key={s}
                      onClick={() => mudarStatus(detalhe.id, s)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        border: detalhe.status === s ? '1px solid #c9a227' : '1px solid #2a2a2a',
                        background: detalhe.status === s ? '#c9a227' : 'transparent',
                        color: detalhe.status === s ? '#000' : '#999',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => editar(detalhe.id)}
                    style={{ ...btnSecundario, marginLeft: 'auto' }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => duplicar(detalhe.id)}
                    disabled={duplicando}
                    style={btnSecundario}
                  >
                    <Copy size={13} /> {duplicando ? 'Duplicando...' : 'Duplicar'}
                  </button>
                  <button onClick={() => setModalEmail(true)} style={btnSecundario}>
                    <Send size={13} /> Enviar por E-mail
                  </button>
                  <button
                    onClick={() => baixarPdf(detalhe.id, detalhe.numero, detalhe.cliente_nome)}
                    disabled={gerandoPdf}
                    style={btnPrimario}
                  >
                    <FileDown size={13} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                </div>

                {detalhe.eventos?.length > 0 && (
                  <div style={{ marginTop: 22, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
                    <h4 style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                      Histórico de alterações
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {detalhe.eventos.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 11, color: '#888', alignItems: 'baseline' }}>
                          <span style={{ color: '#555', whiteSpace: 'nowrap' }}>
                            {new Date(ev.criado_em).toLocaleString('pt-BR')}
                          </span>
                          <span style={{ color: '#c9a227', fontWeight: 700 }}>{ACAO_LABEL[ev.acao] || ev.acao}</span>
                          <span>{ev.detalhes}</span>
                          <span style={{ marginLeft: 'auto', color: '#666' }}>{ev.usuario_nome || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
        </Modal>
      )}

      <BotaoLinkAprovacao
        key={linkAprovacao?.id || 'nenhuma'}
        aberto={!!linkAprovacao}
        onFechar={() => setLinkAprovacao(null)}
        propostaId={linkAprovacao?.id}
        numero={linkAprovacao?.numero}
        status={statusLinkAprovacao}
        onAlterado={recarregar}
      />

      <ModalEnviarEmail
        aberto={modalEmail}
        onFechar={() => setModalEmail(false)}
        proposta={detalhe}
        emailInicial={detalhe?.cliente_email || clienteResolvidoPeloNome?.email || ''}
      />
    </div>
  );
}

function InfoLinha({ label, valor }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ color: '#ddd' }}>{valor}</div>
    </div>
  );
}

function CardResumo({ label, valor, destaque }) {
  return (
    <div style={{ ...card, marginBottom: 0 }}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: destaque ? '#c9a227' : '#e8e0cc' }}>{valor}</div>
    </div>
  );
}

// largura: coluna de tamanho fixo; flexivel: ocupa o que sobrar da linha
// Campo com largura fixa ou flexível (a barra de filtros quebra em linhas)
function Campo({ label, children, largura, flexivel }) {
  return (
    <div style={flexivel ? { flex: '1 1 220px', minWidth: 0 } : { width: largura, flex: '0 1 auto' }}>
      <label style={rotulo}>{label}</label>
      {children}
    </div>
  );
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário desta
// tela é um pouco maior e mais apagado que o do kit — mantido como era.
const { rotulo, card, th, td, tdVazio, btnPrimario, btnIcone } = estilos;
const btnSecundario = { ...estilos.btnSecundario, padding: '9px 16px', color: '#999' };
