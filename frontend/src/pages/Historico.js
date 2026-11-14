import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import {
  getPropostas, getProposta, atualizarStatus, removerProposta, duplicarProposta, getRelatorioPropostas,
  exportarRelatorioPropostas, baixarPdfProposta,
} from '../services/api';
import { formatarMoeda, hojeBrasilia } from '../utils/format';
import { baixarArquivo, salvarBlob, mensagemDeErro } from '../utils/download';
import Paginacao from '../components/Paginacao';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import BotaoLinkAprovacao from '../components/BotaoLinkAprovacao';
import { useClientes } from '../components/ClienteSelect';
import { clienteDaProposta } from '../components/CampoCliente';
import Indicador from '../components/ui/Indicador';
import { POR_PAGINA, INICIO_DO_HISTORICO, filtrosDoRelatorio, btnPrimario } from './historico/apoio';
import FiltrosPropostas from './historico/FiltrosPropostas';
import TabelaPropostas from './historico/TabelaPropostas';
import DetalheProposta from './historico/DetalheProposta';

// Lista de propostas (aba "Propostas" do hub Propostas). Na versão 2.0 juntou
// o antigo Histórico com o antigo Relatórios: os filtros de período/status/
// busca, os totais e a exportação CSV/PDF ficam no topo da lista.
//   - Sem período: a lista vem de /propostas (paginada no servidor, com o aviso
//     de vencimento) e o resumo de /relatorios/propostas com todo o histórico.
//   - Com período: a mesma chamada de /relatorios/propostas dá o resumo e a
//     lista (o /propostas não filtra por data), paginada aqui no navegador.
// Divisão em 2.39: filtros, tabela e detalhe estão em pages/historico/; aqui ficam
// os dados (lista, resumo, detalhe) e as ações.
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
  const fimEfetivo = dataFim || hojeBrasilia();

  // Reserva para o e-mail do cliente quando o servidor não trouxe (detalhe.cliente_email
  // vem do cadastro ligado por cliente_id): o cliente pelo cliente_id da proposta; só sem
  // ele (proposta antiga) pelo nome igual ao de um único cliente — antes era sempre pelo
  // nome, e um homônimo podia emprestar o e-mail de outro cliente.
  const clienteDoDetalhe = useMemo(
    () => clienteDaProposta(clientes, detalhe?.cliente_id, detalhe?.cliente_nome),
    [clientes, detalhe?.cliente_id, detalhe?.cliente_nome]
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

      <FiltrosPropostas
        dataInicio={dataInicio} setDataInicio={setDataInicio} dataFim={dataFim} setDataFim={setDataFim}
        statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro} busca={busca} setBusca={setBusca}
        exportando={exportando} semPropostas={totais.propostas === 0} onExportar={exportar}
      />

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
        <Indicador rotulo={temPeriodo ? 'Propostas no período' : 'Propostas (todo o histórico)'} valor={totais.propostas} />
        <Indicador rotulo="Valor total" valor={formatarMoeda(totais.valorTotal)} />
        <Indicador rotulo="Valor aprovado" valor={formatarMoeda(totais.valorAprovado)} destaque />
      </div>

      <TabelaPropostas
        linhas={linhas} carregando={carregandoLista} temPeriodo={temPeriodo}
        onAbrir={abrirDetalhe} onEditar={editar} onLinkAprovacao={setLinkAprovacao} onExcluir={excluir}
      />

      {temPeriodo ? (
        <Paginacao pagina={paginaPeriodo} totalPaginas={totalPaginasPeriodo} total={doPeriodo.length} onMudarPagina={setPagina} />
      ) : (
        <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />
      )}

      {detalhe && (
        <DetalheProposta
          detalhe={detalhe} carregando={carregandoDetalhe} onFechar={() => setDetalhe(null)}
          onMudarStatus={mudarStatus} onEditar={editar} onDuplicar={duplicar} duplicando={duplicando}
          onEnviarEmail={() => setModalEmail(true)} onBaixarPdf={baixarPdf} gerandoPdf={gerandoPdf}
        />
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
        emailInicial={detalhe?.cliente_email || clienteDoDetalhe?.email || ''}
      />
    </div>
  );
}
