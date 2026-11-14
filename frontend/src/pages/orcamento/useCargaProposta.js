import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getProximoNumero, getProposta, getPadroesOrcamento, getAnaliseProjeto, getLaudo } from '../../services/api';
import { SECOES_PADRAO, apagarRascunho, chaveRascunho, formVazio, normalizarNome, origemDaProposta, retrato } from './apoio';
import { formDaProposta, itensDaProposta } from './calculos';
import { tomarTransporte } from './transporte';

// Carga da proposta no editor (saiu do Orcamento.js em 2.40, sem mudar o funcionamento):
// abrir uma proposta salva (ou a que acabou de ser gravada, pelo transporte), abrir uma
// em branco com o BDI/impostos padrão, "Novo Orçamento", "Recarregar do servidor" e a
// origem (análise/laudo) com as pesquisas e os itens que ficaram de fora.
//
// O estado da proposta continua no editor (recebe os setters); aqui ficam o que só a
// carga preenche: próximo número, padrões do administrador, "criada pelo assistente"
// e o e-mail do cliente vindo do cadastro.
export default function useCargaProposta({
  editandoId, obraDaUrl, usuario, navigate, versaoRef, sujo, liberar, idAtual, chaveDoRascunho,
  setForm, setSecoes, setItens, setBase, setPropostaSalva, setNumeroEditando, setCarregandoEdicao,
  setConflito, setSomenteLeitura, setPesquisas, setOrigem, setRascunhoPendente, oferecerRascunho,
}) {
  const [proximoNumero, setProximoNumero] = useState(null);
  // rascunho montado pelo assistente virtual (propostas.assistente_conversa_id)
  const [criadaPeloAssistente, setCriadaPeloAssistente] = useState(false);
  // E-mail do cliente já resolvido pelo backend via cliente_id (JOIN com a
  // tabela clientes) ao carregar uma proposta salva — mais confiável do que
  // bater o texto de cliente_nome contra a lista de clientes, que falha se o
  // nome tiver alguma diferença de digitação/espaço.
  const [clienteEmailCadastro, setClienteEmailCadastro] = useState('');
  // BDI e impostos padrão do administrador (null = ainda não carregou ou não conseguiu)
  const [padroesOrc, setPadroesOrc] = useState(null);
  const buscarPadroes = () => getPadroesOrcamento().then(r => { setPadroesOrc(r.data); return r.data; }).catch(() => null);

  // Carrega a proposta do servidor e tira o retrato "salvo" (base). Usado ao
  // abrir e no "Recarregar do servidor" do conflito de versão.
  function carregarDoServidor(id, { oferecer = true } = {}) {
    setCarregandoEdicao(true);
    return getProposta(id).then(res => {
      const p = res.data;
      versaoRef.current = p.versao ?? null;
      setNumeroEditando(p.numero);
      setCriadaPeloAssistente(p.assistente_conversa_id != null);
      setClienteEmailCadastro(p.cliente_email || '');
      const formCarregado = formDaProposta(p);
      const secoesCarregadas = (p.secoes || []).map(s => ({ id: s.id, nome: s.nome }));
      const itensCarregados = itensDaProposta(p);
      setForm(formCarregado);
      setSecoes(secoesCarregadas);
      setItens(itensCarregados);
      const retratoCarregado = retrato(formCarregado, secoesCarregadas, itensCarregados);
      setBase(retratoCarregado);
      setPropostaSalva(null);
      setConflito(null);
      // Proposta de outro usuário: abre só para leitura (o servidor recusaria
      // o salvar com 403). Registro antigo sem dono é livre, como na posse.
      const deOutro = usuario && usuario.role !== 'admin' && p.usuario_id != null && Number(p.usuario_id) !== Number(usuario.id);
      const criador = [...(p.eventos || [])].reverse().find(e => e.usuario_nome)?.usuario_nome || '';
      setSomenteLeitura(deOutro ? { mensagem: `Esta proposta é de ${criador || 'outro usuário'}: só quem a criou (ou um administrador) altera.` } : null);
      if (oferecer && !deOutro) oferecerRascunho(chaveRascunho(usuario?.id, id), retratoCarregado);
      carregarOrigem(p, itensCarregados);
    }).catch((err) => {
      if (err?.response?.status === 401) return; // sessão: o "Entre de novo" cuida
      toast.error(err?.response?.data?.erro || 'Erro ao carregar proposta para edição');
      navigate('/propostas?aba=lista');
    }).finally(() => setCarregandoEdicao(false));
  }

  useEffect(() => {
    // acabou de criar esta proposta aqui (a URL passou a ter o id): a tela já
    // tem tudo — recarregar perderia as pesquisas de mercado abertas
    // (a troca de rota pode montar a tela de novo: o estado vem pelo transporte)
    const t = tomarTransporte(editandoId);
    if (t) {
      setForm(t.form); setSecoes(t.secoes); setItens(t.itens);
      setPesquisas(t.pesquisas); setOrigem(t.origem);
      setPropostaSalva(t.propostaSalva); setNumeroEditando(t.numero || '');
      versaoRef.current = t.versao;
      setBase(t.base);
      setConflito(null); setSomenteLeitura(null); setRascunhoPendente(null);
      setCarregandoEdicao(false);
      return;
    }
    setPesquisas({});
    setOrigem(null);
    setRascunhoPendente(null);
    setConflito(null);
    setSomenteLeitura(null);
    if (!editandoId) {
      getProximoNumero().then(res => setProximoNumero(res.data.proximo)).catch(() => {});
      // o padrão de BDI/impostos vem do servidor: a proposta nova só monta depois dele (uma
      // chamada curta); se falhar, nasce com 0 e o aviso abaixo continua valendo
      let vivo = true;
      buscarPadroes().then(padroes => {
        if (!vivo) return;
        const inicial = { ...formVazio(padroes), obra_id: obraDaUrl || null };
        const secoesIniciais = SECOES_PADRAO();
        setForm(inicial);
        setSecoes(secoesIniciais);
        setItens([]);
        setPropostaSalva(null);
        const r = retrato(inicial, secoesIniciais, []);
        setBase(r);
        oferecerRascunho(chaveRascunho(usuario?.id, null), r);
      });
      return () => { vivo = false; };
    }
    carregarDoServidor(editandoId);
  }, [editandoId, obraDaUrl]); // eslint-disable-line

  // Origem do rascunho (análise ou laudo): mostra no topo com o link de volta.
  // Da análise, traz também (1) as pesquisas de mercado que ficaram salvas
  // nos itens dela — reabertas recolhidas, sem pesquisar de novo — e (2) os
  // itens que o gerar deixou de fora por estarem com quantidade 0, para
  // incluir aqui (a Análise não edita mais quantidade).
  function carregarOrigem(p, itensCarregados) {
    const org = origemDaProposta(p);
    if (!org) return;
    setOrigem(org);
    const ehDestaProposta = (id) => id != null && String(id) === String(p.id);
    if (org.tipo === 'analise') {
      getAnaliseProjeto(org.id).then(({ data: a }) => {
        const doItem = [...(a.servicos || []).map(s => ({ ...s, tipo: 'servico' })), ...(a.materiais || []).map(m => ({ ...m, tipo: 'material' }))];
        const pesquisaPorDescricao = new Map(doItem.filter(x => x.pesquisa_mercado?.resultado && x.descricao)
          .map(x => [normalizarNome(x.descricao), x.pesquisa_mercado]));
        const salvas = {};
        for (const it of itensCarregados) {
          const pm = pesquisaPorDescricao.get(normalizarNome(it.descricao));
          if (pm) salvas[it.id] = { ...pm, recolhidaInicial: true, daAnalise: true };
        }
        setPesquisas(atual => ({ ...salvas, ...atual }));
        const naProposta = new Set(itensCarregados.map(it => normalizarNome(it.descricao)));
        const faltando = doItem.filter(x => !x.pronto && !(Number(x.quantidade) > 0) && String(x.descricao || '').trim()
          && !naProposta.has(normalizarNome(x.descricao)));
        setOrigem({ ...org, existe: true, vinculada: ehDestaProposta(a.propostaId), titulo: a.nomeProjeto || a.cliente || '', faltando });
      }).catch(() => setOrigem({ ...org, existe: false }));
    } else {
      getLaudo(org.id).then(({ data: l }) => {
        setOrigem({
          ...org, existe: true, vinculada: Object.values(l.propostas || {}).some(ehDestaProposta),
          titulo: l.dados?.obra?.nome || l.titulo || l.cliente_nome || '',
          registro: l.tipo === 'projeto' ? 'projeto' : 'laudo', // 2.1: projeto ou laudo

        });
      }).catch(() => setOrigem({ ...org, existe: false }));
    }
  }

  function novoOrcamento() {
    if (sujo && !window.confirm('Há alterações não salvas nesta proposta. Começar um orçamento novo mesmo assim?\n\n(Elas ficam guardadas como rascunho neste navegador.)')) return;
    liberar();
    setPropostaSalva(null);
    if (editandoId) {
      navigate('/propostas?aba=editar');
    } else {
      // já está em "nova": o efeito de carga não roda de novo — limpa aqui
      buscarPadroes().then(padroes => {
        const inicial = formVazio(padroes);
        const secoesIniciais = SECOES_PADRAO();
        setForm(inicial);
        setSecoes(secoesIniciais);
        setItens([]);
        setPesquisas({});
        setOrigem(null);
        setBase(retrato(inicial, secoesIniciais, []));
      });
      getProximoNumero().then(r => setProximoNumero(r.data.proximo)).catch(() => {});
    }
  }

  function recarregarDoServidor() {
    if (sujo && !window.confirm('Descartar as suas alterações e carregar a versão que está no servidor?')) return;
    apagarRascunho(chaveDoRascunho);
    setPesquisas({});
    carregarDoServidor(idAtual, { oferecer: false });
  }

  return { proximoNumero, criadaPeloAssistente, clienteEmailCadastro, padroesOrc, novoOrcamento, recarregarDoServidor };
}
