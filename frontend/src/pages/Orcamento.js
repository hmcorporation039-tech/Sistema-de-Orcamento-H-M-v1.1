import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FolderPlus, BarChart3, Scale } from 'lucide-react';
import { getProximoNumero, criarProposta, atualizarProposta, getProposta, getPadroesOrcamento, pesquisarPrecoMercado, getAnaliseProjeto, getLaudo, duplicarProposta, baixarPdfProposta, baixarPlanilhaProposta } from '../services/api';
import { arred2 } from '../utils/dinheiro';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { useAuth } from '../hooks/useAuth';
import useAlteracoesNaoSalvas from '../hooks/useAlteracoesNaoSalvas';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import { resultadoDaPesquisa } from '../components/PesquisaMercado';
import { clientePorNome } from '../components/CampoCliente';
import useDisciplinas from '../hooks/useDisciplinas';
// Fase 3F (2.0): BDI pela fórmula do TCU e curva ABC da proposta
import CalculadoraBdi from '../components/CalculadoraBdi';
import CurvaAbcPainel from '../components/CurvaAbcPainel';
import { normalizarMemoriaBdi } from '../utils/bdiTcu';
// Fase 3 (2.0): kits da base de preços e aprovação da proposta por link
import InserirComposicao, { distribuirNasSecoes } from '../components/InserirComposicao';
import { OpcaoModelo3dProposta } from '../components/Modelo3d';
import { SECOES_PADRAO, apagarRascunho, chaveRascunho, ehMaoDeObra, formVazio, gerarId, gravarRascunho, lerRascunho, normalizarNome, origemDaProposta, retrato } from './orcamento/apoio';
import {
  avisosDoBdi, calcularTotais, formDaProposta, itensDaProposta, itensParaCurvaAbc, montarPayload, problemaParaSalvar, reordenarPorSubgrupo,
} from './orcamento/calculos';
import { useBasesDoEditor, usePrecosVendidos, useSegmentoProposta, useServicosDoEditor } from './orcamento/ganchos';
import { btnSecundario, card, fieldsetLimpo } from './orcamento/estilos';
import AvisoOrigem from './orcamento/AvisoOrigem';
import {
  AvisoBases, AvisoBdi, AvisoConflito, AvisoItensACotar, AvisoPadroesNaoDefinidos, AvisoRascunho, CabecalhoEditor, FaixaSomenteLeitura,
} from './orcamento/Avisos';
import DadosGerais from './orcamento/DadosGerais';
import SecaoOrcamento from './orcamento/SecaoOrcamento';
import BarraTotais from './orcamento/BarraTotais';

// Editor único de orçamento (proposta nova ou edição). Divisão em 2.39 (antes ~1.250 linhas
// aqui), sem mudar o funcionamento: as contas e montagens sem estado estão em
// orcamento/calculos.js; as bases (clientes, catálogo, serviços), o segmento do cliente/obra,
// os serviços e os preços praticados em orcamento/ganchos.js; as faixas de aviso em
// orcamento/Avisos.js e cada seção em orcamento/SecaoOrcamento.js. Aqui ficam o estado da
// proposta (formulário, seções, itens), rascunho, carga, salvar e as ações da tela.

// Proposta nova gravada: a URL vira /propostas/editar/:id e o React Router pode
// montar a tela de novo — o que estava nela (inclusive as pesquisas de mercado
// abertas) passa por aqui em vez de ser relido do servidor.
let transporte = null;

export default function Orcamento() {
  const { nomeServico: nomeDisciplina } = useDisciplinas();
  const { id: editandoId } = useParams();
  const navigate = useNavigate();
  const [busca] = useSearchParams();
  const obraDaUrl = Number(busca.get('obra')) || null; // /propostas?aba=editar&obra=ID

  const [proximoNumero, setProximoNumero] = useState(null);

  const [form, setForm] = useState(formVazio);
  const [secoes, setSecoes] = useState(SECOES_PADRAO);
  const [itens, setItens] = useState([]);
  // Campos transientes do reajuste/desconto — só existem enquanto o usuário
  // digita; "Aplicar" consome o valor e reescreve os itens (ver
  // aplicarAjustePercentual), não fica guardado como parte da proposta.
  const [ajusteMateriaisInput, setAjusteMateriaisInput] = useState('');
  const [ajusteMaoDeObraInput, setAjusteMaoDeObraInput] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [propostaSalva, setPropostaSalva] = useState(null);
  // versão da proposta no servidor (bloqueio otimista): quem gravou depois
  // que esta tela abriu faz o salvar daqui ser recusado, em vez de sobrescrito
  const versaoRef = useRef(null);
  // Alteração não salva = o que está na tela difere do retrato tirado ao
  // carregar/gravar (`base`). Antes só se sabia isso depois do primeiro
  // salvamento — e nada avisava ao sair da tela, fechar a aba ou clicar em
  // "Novo Orçamento".
  const [base, setBase] = useState(null);
  const { usuario } = useAuth();
  // { mensagem } — proposta de outro usuário (abre só para leitura) ou 403 ao salvar
  const [somenteLeitura, setSomenteLeitura] = useState(null);
  // { mensagem } — 409: outra pessoa gravou a proposta depois que esta tela abriu
  const [conflito, setConflito] = useState(null);
  // rascunho guardado neste navegador esperando a pessoa decidir (restaurar/descartar)
  const [rascunhoPendente, setRascunhoPendente] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [carregandoEdicao, setCarregandoEdicao] = useState(!!editandoId);
  const [numeroEditando, setNumeroEditando] = useState('');
  // rascunho montado pelo assistente virtual (propostas.assistente_conversa_id)
  const [criadaPeloAssistente, setCriadaPeloAssistente] = useState(false);
  // E-mail do cliente já resolvido pelo backend via cliente_id (JOIN com a
  // tabela clientes) ao carregar uma proposta salva — mais confiável do que
  // bater o texto de cliente_nome contra a lista de clientes, que falha se o
  // nome tiver alguma diferença de digitação/espaço.
  const [clienteEmailCadastro, setClienteEmailCadastro] = useState('');
  // Pesquisa de mercado por item (editor único: antes só a Análise de Projeto
  // tinha) — { [id do item na tela]: { carregando } | resultado | { erro } }.
  // Fica na memória da tela; repetir a pesquisa da mesma descrição em até 48 h
  // vem do histórico do servidor, sem gastar outra consulta.
  const [pesquisas, setPesquisas] = useState({});
  // { tipo: 'analise'|'laudo', id, rotulo?, titulo?, existe?, vinculada?, faltando? }
  const [origem, setOrigem] = useState(null);
  // Fase 3F: calculador de BDI (TCU), painel da curva ABC e anexos opcionais do PDF
  const [calculadoraBdiAberta, setCalculadoraBdiAberta] = useState(false);
  const [mostrarCurvaAbc, setMostrarCurvaAbc] = useState(false);
  const [anexosPdf, setAnexosPdf] = useState({ curva_abc: false, composicao_bdi: false });
  const calculadoraJaSugerida = useRef(null); // id da proposta em que o calculador já abriu sozinho
  // BDI e impostos padrão do administrador (null = ainda não carregou ou não conseguiu)
  const [padroesOrc, setPadroesOrc] = useState(null);
  const buscarPadroes = () => getPadroesOrcamento().then(r => { setPadroesOrc(r.data); return r.data; }).catch(() => null);

  // clientes, catálogo de materiais e base de serviços (inteiros), com o aviso de falha
  const { clientes, materiais, servicos, basesComFalha, carregarBases } = useBasesDoEditor();

  // ── alteração não salva, rascunho e aviso ao sair ──
  const estadoAtual = useMemo(() => retrato(form, secoes, itens), [form, secoes, itens]);
  const sujo = base !== null && estadoAtual !== base;
  const chaveDoRascunho = chaveRascunho(usuario?.id, editandoId);
  const { liberar } = useAlteracoesNaoSalvas(sujo && !carregandoEdicao,
    'Há alterações não salvas nesta proposta. Sair mesmo assim?\n\n(Elas ficam guardadas como rascunho neste navegador e podem ser restauradas ao abrir a proposta de novo.)');

  // grava o rascunho ~1 s depois da última alteração (não enquanto a tela
  // oferece restaurar um rascunho anterior — senão ele seria sobrescrito)
  useEffect(() => {
    if (!sujo || rascunhoPendente || carregandoEdicao) return undefined;
    const t = setTimeout(() => gravarRascunho(chaveDoRascunho, {
      salvoEm: new Date().toISOString(), versao: versaoRef.current, numero: numeroEditando || null, form, secoes, itens,
    }), 800);
    return () => clearTimeout(t);
  }, [sujo, rascunhoPendente, carregandoEdicao, chaveDoRascunho, form, secoes, itens, numeroEditando]);

  // depois de carregar (ou abrir em branco): há rascunho diferente do que veio?
  function oferecerRascunho(chave, retratoCarregado) {
    const r = lerRascunho(chave);
    if (r && retrato(r.form, r.secoes, r.itens) !== retratoCarregado) setRascunhoPendente({ ...r, chave });
    else if (r) apagarRascunho(chave);
  }

  function restaurarRascunho() {
    const r = rascunhoPendente;
    if (!r) return;
    setForm({ ...formVazio(), ...r.form });
    setSecoes(r.secoes);
    setItens(r.itens);
    // a versão do rascunho: se a proposta mudou no servidor depois dele, o
    // salvar dá conflito (409) em vez de sobrescrever o trabalho do outro
    if (editandoId && r.versao != null) versaoRef.current = r.versao;
    setRascunhoPendente(null);
    toast.success('Rascunho restaurado — confira e salve');
  }

  function descartarRascunho() {
    if (rascunhoPendente) apagarRascunho(rascunhoPendente.chave);
    setRascunhoPendente(null);
  }

  // segmento do cliente (pelo nome, no servidor) e da obra: órgão público pela obra OU pelo cliente
  const { segmento, segmentoObra, ehPublico } = useSegmentoProposta(form.cliente_nome, form.obra_id);

  // Órgão público (cliente ou obra): a proposta precisa da composição do BDI
  // (memória do cálculo pelo TCU). Ao abrir uma proposta salva de órgão
  // público sem memória, o calculador abre sozinho (uma vez), já sugerido;
  // o PDF passa a sugerir o anexo da composição.
  const memoriaBdi = useMemo(() => normalizarMemoriaBdi(form.bdi_memoria), [form.bdi_memoria]);
  useEffect(() => {
    if (!editandoId || carregandoEdicao || !ehPublico || form.bdi_memoria) return;
    if (calculadoraJaSugerida.current === editandoId) return;
    calculadoraJaSugerida.current = editandoId;
    setCalculadoraBdiAberta(true);
  }, [editandoId, carregandoEdicao, ehPublico, form.bdi_memoria]);
  useEffect(() => {
    setAnexosPdf(a => ({ ...a, composicao_bdi: ehPublico && !!memoriaBdi }));
  }, [ehPublico, memoriaBdi]);

  const { servicosPorCodigo, gruposServicos, sugestaoDoServico, servicoDoItem } = useServicosDoEditor(servicos, segmento, nomeDisciplina);
  const materiaisPorId = useMemo(() => Object.fromEntries(materiais.map(m => [String(m.id), m])), [materiais]);

  // Faixa praticada (propostas aprovadas) dos materiais que estão nesta proposta
  const vendidos = usePrecosVendidos(itens, editandoId);

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
    // (a troca de rota pode montar a tela de novo: o estado vem pelo `transporte`)
    if (editandoId && transporte && transporte.id === String(editandoId)) {
      const t = transporte;
      transporte = null;
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

  // Inclui um item que ficou fora do rascunho (quantidade 0 na análise), com
  // quantidade 0 e "a cotar": a pessoa informa a quantidade aqui.
  function incluirFaltante(x) {
    const ehServico = x.tipo === 'servico';
    const nomeSecao = ehServico ? 'Serviços (Mão de Obra)' : 'Materiais e Equipamentos';
    let sec = secoes.find(s => ehMaoDeObra(s.nome) === ehServico);
    if (!sec) {
      sec = { id: gerarId(), nome: nomeSecao };
      setSecoes(s => [...s, sec]);
    }
    const valor = ehServico ? Number(x.valor_unitario) || 0
      : (Number(x.preco_unitario) > 0 ? Number(x.preco_unitario) : Number(x.preco_catalogo) || 0);
    const novo = {
      id: gerarId(), sid: sec.id, material_id: ehServico ? null : (x.material_id || null),
      descricao: x.descricao, quantidade: 0, unidade: x.unidade || 'un', valor_unitario: valor,
      ncm: '', codigo: x.codigo || '', subgrupo: x.subgrupo || '', status: 'a_cotar',
    };
    setItens(it => reordenarPorSubgrupo([...it, novo], sec.id));
    if (x.pesquisa_mercado?.resultado) setPesquisas(ps => ({ ...ps, [novo.id]: { ...x.pesquisa_mercado, recolhidaInicial: true, daAnalise: true } }));
    setOrigem(o => ({ ...o, faltando: (o.faltando || []).filter(f => f !== x) }));
    toast.success('Item incluído com quantidade 0 — informe a quantidade');
  }

  // Pesquisa de mercado de um item — mesma API e comportamento da Análise de
  // Projeto (busca real na web pela cadeia de IA; de 30 s a 1 min). Serviço
  // pesquisa como serviço; o "Usar R$ X" troca o valor unitário da linha
  // (para material, é o preço adotado). Nunca grava nada sozinha.
  // fresco: refaz a consulta mesmo havendo pesquisa guardada (a da lista vale 7 dias)
  async function pesquisarMercado(item, maoDeObra, fresco = false) {
    const descricao = String(item.descricao || '').trim();
    if (!descricao) {
      toast.error('Preencha a descrição antes de pesquisar');
      return;
    }
    setPesquisas(p => ({ ...p, [item.id]: { ...(p[item.id] || {}), erro: null, carregando: true } }));
    try {
      const res = await pesquisarPrecoMercado(descricao, maoDeObra ? 'servico' : 'material', fresco);
      setPesquisas(p => ({ ...p, [item.id]: resultadoDaPesquisa(res.data) }));
    } catch (err) {
      const erro = err.response?.data?.erro || (err.code === 'ECONNABORTED' ? 'A pesquisa demorou demais — tente de novo' : 'Erro ao pesquisar');
      setPesquisas(p => ({ ...p, [item.id]: { ...(p[item.id] || {}), carregando: false, erro } }));
    }
  }

  // Cliente do cadastro (2.39): o escolhido na lista (form.cliente_id) manda. Sem ele (proposta
  // antiga ou rascunho de antes), só o nome IGUAL ao de um único cliente liga — sem acento e
  // maiúsculas ("CLINICA" × "CLÍNICA"); com dois homônimos não liga mais o primeiro que achar.
  // Cliente ligado que saiu da lista (inativo) continua ligado: não se perde o cliente_id ao salvar.
  const clienteResolvido = useMemo(() => {
    if (form.cliente_id != null && form.cliente_id !== '') {
      return clientes.find(c => String(c.id) === String(form.cliente_id)) || { id: Number(form.cliente_id), nome: form.cliente_nome };
    }
    return clientePorNome(clientes, form.cliente_nome);
  }, [clientes, form.cliente_id, form.cliente_nome]);

  // Botão de salvar, PDF/planilha/e-mail: "alterações não salvas" = sujo
  const alteracoesPendentes = sujo;

  // Mesma conta do servidor (orcamento/calculos.js ↔ backend/src/utils/calculoProposta.js)
  const { subtotalMateriais, subtotalMaoObra, valorBdi, valorBdiMateriais, valorBdiMaoObra, valorImpostoVenda, valorImpostoServico, total } = useMemo(
    () => calcularTotais(itens, secoes, { bdi: form.bdi, bdi_materiais: form.bdi_materiais, imposto_venda: form.imposto_venda, imposto_servico: form.imposto_servico }),
    [itens, secoes, form.bdi, form.bdi_materiais, form.imposto_venda, form.imposto_servico],
  );

  // itens para a curva ABC (tipo pela seção, como no PDF e na planilha)
  const itensCurvaAbc = useMemo(() => itensParaCurvaAbc(itens, secoes), [itens, secoes]);

  // Avisos do BDI (Fase 3F): memória com tributos dentro + impostos por fora e BDI mudado à mão
  const avisosBdi = useMemo(
    () => avisosDoBdi(memoriaBdi, { bdi: form.bdi, bdi_materiais: form.bdi_materiais, imposto_venda: form.imposto_venda, imposto_servico: form.imposto_servico }),
    [memoriaBdi, form.bdi, form.bdi_materiais, form.imposto_venda, form.imposto_servico],
  );

  function aplicarBdiCalculado({ bdi, bdi_materiais, memoria, zerarImpostos }) {
    setForm(f => ({
      ...f, bdi, bdi_materiais, bdi_memoria: memoria,
      ...(zerarImpostos ? { imposto_venda: 0, imposto_servico: 0 } : {}),
    }));
    setCalculadoraBdiAberta(false);
    toast.success(`BDI ${bdi.toLocaleString('pt-BR')} %${bdi_materiais != null ? ` (materiais ${bdi_materiais.toLocaleString('pt-BR')} %)` : ''} aplicado — salve a proposta para gravar a composição`);
  }

  function removerComposicaoBdi() {
    if (!window.confirm('Remover a composição do BDI (memória do cálculo pelo TCU) e o BDI diferenciado de materiais? O BDI atual fica como está.')) return;
    setForm(f => ({ ...f, bdi_memoria: null, bdi_materiais: null }));
  }

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

  // itens de um kit (InserirComposicao) entram como itens normais, cada um na
  // seção de materiais ou de serviços (criada se faltar), agrupados pelo subgrupo
  function inserirItensDoKit(novos) {
    const { secoes: secoesNovas, itens: comSid } = distribuirNasSecoes(novos, secoes, { gerarId, ehMaoDeObra });
    setSecoes(secoesNovas);
    setItens(lista => {
      let l = [...lista, ...comSid];
      for (const sid of new Set(comSid.map(i => i.sid))) l = reordenarPorSubgrupo(l, sid);
      return l;
    });
  }

  // o cliente aprovou/recusou pelo link: o status (e a versão) mudam no servidor;
  // sem isso o próximo "Salvar" daria conflito de versão à toa
  function atualizarStatusSalvo() {
    if (!propostaSalva) return;
    getProposta(propostaSalva.id).then(res => {
      if (!alteracoesPendentes) versaoRef.current = res.data.versao ?? versaoRef.current;
      setPropostaSalva(ps => (ps ? { ...ps, status: res.data.status } : ps));
    }).catch(() => {});
  }

  function atualizarItem(id, campo, valor) {
    setItens(it => {
      // confirmar na tela é o engenheiro conferindo: o item sugerido pela IA perde a marca e, ao salvar, entra no
      // catálogo e ensina o vínculo como qualquer item confirmado (revisão do uso de IA de 06/11/2026)
      const confirmou = campo === 'status' && valor === 'confirmado';
      const atualizado = it.map(i => i.id === id ? { ...i, [campo]: valor, ...(confirmou ? { origem_item: null } : {}) } : i);
      if (campo !== 'subgrupo') return atualizado;
      const item = atualizado.find(i => i.id === id);
      return reordenarPorSubgrupo(atualizado, item.sid);
    });
  }

  // Reescreve de vez o valor_unitario de cada item de UMA categoria
  // (materiais ou mão de obra) — (+) aumenta, (-) desconta, aplicado sobre o
  // valor que o item já tem hoje. É uma ação (bem diferente de BDI/impostos,
  // que recalculam ao vivo): rodar de novo aplica em cima do que já foi
  // ajustado — dois "+10%" seguidos viram +21%, não +20%. Só um desconto
  // fica anotado (desconto_materiais_pct/desconto_mao_obra_pct) pra avisar
  // no PDF — um aumento limpa a anotação, já que o efeito deixou de ser um
  // desconto.
  function aplicarAjustePercentual(categoria, pctTexto) {
    const pct = Number(String(pctTexto).replace(',', '.'));
    if (!Number.isFinite(pct) || pct === 0) {
      toast.error('Informe um percentual diferente de zero');
      return;
    }
    const ehCategoriaMaoDeObra = categoria === 'maoDeObra';
    const sidsDaCategoria = secoes.filter(sec => ehMaoDeObra(sec.nome) === ehCategoriaMaoDeObra).map(sec => sec.id);
    const qtdItens = itens.filter(it => sidsDaCategoria.includes(it.sid)).length;
    const rotulo = ehCategoriaMaoDeObra ? 'Mão de Obra' : 'Materiais';
    if (qtdItens === 0) {
      toast.error(`Nenhum item de ${rotulo} encontrado`);
      return;
    }
    const sinal = pct > 0 ? '+' : '';
    if (!window.confirm(`Isso vai multiplicar o valor unitário de ${qtdItens} item(ns) de ${rotulo} em ${sinal}${pct}%. Não tem desfazer automático. Confirma?`)) {
      return;
    }
    const fator = 1 + pct / 100;
    setItens(it => it.map(item => sidsDaCategoria.includes(item.sid)
      ? { ...item, valor_unitario: arred2((Number(item.valor_unitario) || 0) * fator) }
      : item
    ));
    const campoDesconto = ehCategoriaMaoDeObra ? 'desconto_mao_obra_pct' : 'desconto_materiais_pct';
    setForm(f => ({ ...f, [campoDesconto]: pct < 0 ? pct : null }));
    toast.success(`${qtdItens} item(ns) de ${rotulo} ajustado(s) em ${sinal}${pct}%`);
  }

  function aplicarMaterialNoItem(id, materialId) {
    const mat = materiais.find(m => String(m.id) === String(materialId));
    if (!mat) return;
    setItens(it => {
      // Se o item ainda não tem categoria escolhida, herda a do material do
      // catálogo — assim a categoria já reflete de onde o material veio,
      // mesmo que a pessoa tenha pulado direto pro catálogo sem escolher a
      // categoria antes.
      const atualizado = it.map(i => i.id === id ? {
        ...i, material_id: mat.id, descricao: mat.descricao, unidade: mat.unidade,
        valor_unitario: mat.preco, ncm: mat.ncm || '', codigo: mat.codigo || '',
        subgrupo: i.subgrupo || mat.categoria || '',
      } : i);
      const item = atualizado.find(i => i.id === id);
      return reordenarPorSubgrupo(atualizado, item.sid);
    });
  }

  function aplicarCategoriaMaoDeObra(id, categoria) {
    if (!categoria) return;
    setItens(it => it.map(i => i.id === id ? { ...i, descricao: categoria } : i));
  }

  // Preenche descrição, unidade, valor e código a partir de um serviço da
  // base única — mesma ideia de aplicarMaterialNoItem, pra padronizar a
  // descrição do mesmo serviço entre clientes diferentes. O valor é a
  // sugestão do segmento do cliente (valor H&M adotado ?? referência do
  // segmento); sem sugestão, o valor digitado na linha fica como está.
  function aplicarServicoNoItem(id, codigo) {
    const s = servicosPorCodigo[codigo];
    if (!s) return;
    const sugestao = sugestaoDoServico(s);
    setItens(it => it.map(i => i.id === id ? {
      ...i, descricao: s.descricao, unidade: s.unidade || i.unidade, codigo: s.codigo,
      valor_unitario: sugestao != null ? sugestao : i.valor_unitario,
    } : i));
  }

  function removerItem(id) {
    setItens(it => it.filter(i => i.id !== id));
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

  // id e número da proposta aberta (salva agora ou carregada para edição)
  const idAtual = propostaSalva?.id || editandoId || null;
  const numeroAtual = propostaSalva?.numero || numeroEditando || '';

  const [gerandoPlanilha, setGerandoPlanilha] = useState(false);
  async function baixarPlanilha() {
    if (!idAtual) return;
    setGerandoPlanilha(true);
    try {
      // nome do servidor; o montado aqui é só a reserva
      await baixarArquivo(
        baixarPlanilhaProposta(idAtual),
        `${form.cliente_nome.trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_')}_${numeroAtual}.xlsx`,
      );
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao gerar a planilha'));
    } finally {
      setGerandoPlanilha(false);
    }
  }

  async function baixarPdf() {
    if (!idAtual) return;
    setGerandoPdf(true);
    try {
      // anexos opcionais (Fase 3F): curva ABC e composição do BDI — desligados por padrão
      const params = {};
      if (anexosPdf.curva_abc) params.curva_abc = 1;
      if (anexosPdf.composicao_bdi) params.composicao_bdi = 1;
      // nome do servidor (o mesmo da cópia nas pastas); o montado aqui é só a reserva
      const nomeCliente = form.cliente_nome.trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      await baixarArquivo(baixarPdfProposta(idAtual, params), `${nomeCliente}_${numeroAtual}.pdf`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao gerar PDF'));
    } finally {
      setGerandoPdf(false);
    }
  }

  // Confere o que o servidor também recusaria, apontando o item com problema
  function validarParaSalvar() {
    const problema = problemaParaSalvar(form, itens);
    if (problema) toast.error(problema);
    return !problema;
  }

  // Gravou: o que está na tela passa a ser o "salvo" e o rascunho sai
  function marcarSalvo(chaveRascunhoAntiga) {
    setBase(estadoAtual);
    apagarRascunho(chaveRascunhoAntiga || chaveDoRascunho);
    setConflito(null);
  }

  // Proposta nova gravada: a URL passa a ser a da proposta (F5, voltar e
  // favoritos abrem ela), sem recarregar a tela
  function irParaProposta(id, salva) {
    transporte = {
      id: String(id), form, secoes, itens, pesquisas, origem, propostaSalva: salva,
      numero: salva?.numero || '', versao: versaoRef.current, base: estadoAtual,
    };
    liberar();
    navigate(`/propostas/editar/${id}`, { replace: true });
  }

  async function salvar() {
    if (somenteLeitura) return;
    if (!validarParaSalvar()) return;
    setSalvando(true);
    try {
      const payload = montarPayload(form, secoes, itens, clienteResolvido?.id);
      // Depois de salvar uma proposta nova, novas gravações precisam ATUALIZAR
      // aquela proposta — antes o botão sumia e as correções feitas em seguida
      // não tinham como ser salvas (o PDF saía com os valores antigos).
      const idAlvo = editandoId || propostaSalva?.id;
      const res = idAlvo ? await atualizarProposta(idAlvo, { ...payload, versao: versaoRef.current }) : await criarProposta(payload);
      versaoRef.current = res.data.versao ?? null;
      toast.success(res.data.mensagem || 'Proposta salva com sucesso!');
      setPropostaSalva(res.data);
      if (res.data.numero) setNumeroEditando(res.data.numero);
      marcarSalvo();
      if (!idAlvo && res.data.id) irParaProposta(res.data.id, res.data);
    } catch (err) {
      const status = err.response?.status;
      const mensagem = err.response?.data?.erro;
      if (status === 409) {
        // outra pessoa gravou depois que esta tela abriu: nada é sobrescrito;
        // a pessoa escolhe recarregar (perde o daqui) ou salvar como cópia
        setConflito({ mensagem: mensagem || 'Esta proposta foi alterada por outra pessoa depois que você a abriu.' });
      } else if (status === 403 && err.response?.data?.codigo !== 'SENHA_PROVISORIA') {
        // não é dono: a tela fica só para leitura, com as alterações à vista
        // (rascunho guardado) e a opção de salvar como cópia própria
        setSomenteLeitura({ mensagem: mensagem || 'Você não pode alterar esta proposta.' });
        toast.error(mensagem || 'Você não pode alterar esta proposta', { duration: 8000 });
      } else if (!err.sessaoEncerrada) {
        toast.error(mensagem || (err.response ? 'Erro ao salvar proposta' : 'Sem resposta do servidor — a proposta continua na tela e guardada como rascunho; tente de novo'));
      }
    } finally {
      setSalvando(false);
    }
  }

  // "Salvar como cópia" (conflito de versão ou proposta de outro usuário): grava
  // o que está na tela como uma proposta NOVA, deste usuário, com outro número.
  // Sem alteração na tela, usa o duplicar do servidor (copia tudo, inclusive a origem).
  async function salvarComoCopia() {
    if (!idAtual) return;
    if (!sujo) {
      setSalvando(true);
      try {
        const r = await duplicarProposta(idAtual);
        toast.success(r.data.mensagem || 'Proposta duplicada');
        liberar();
        navigate(`/propostas/editar/${r.data.id}`);
      } catch (err) {
        if (!err.sessaoEncerrada) toast.error(err.response?.data?.erro || 'Erro ao duplicar a proposta');
      } finally {
        setSalvando(false);
      }
      return;
    }
    if (!validarParaSalvar()) return;
    setSalvando(true);
    try {
      const chaveAntiga = chaveDoRascunho;
      const res = await criarProposta(montarPayload(form, secoes, itens, clienteResolvido?.id));
      toast.success(`Salva como cópia: proposta ${res.data.numero || ''}`.trim());
      versaoRef.current = res.data.versao ?? null;
      setPropostaSalva(res.data);
      setNumeroEditando(res.data.numero || '');
      setSomenteLeitura(null);
      marcarSalvo(chaveAntiga);
      irParaProposta(res.data.id, res.data);
    } catch (err) {
      if (!err.sessaoEncerrada) toast.error(err.response?.data?.erro || 'Erro ao salvar a cópia');
    } finally {
      setSalvando(false);
    }
  }

  function recarregarDoServidor() {
    if (sujo && !window.confirm('Descartar as suas alterações e carregar a versão que está no servidor?')) return;
    apagarRascunho(chaveDoRascunho);
    setPesquisas({});
    carregarDoServidor(idAtual, { oferecer: false });
  }

  if (carregandoEdicao) {
    return <p style={{ color: 'var(--texto-3)', textAlign: 'center', padding: 40 }}>Carregando proposta...</p>;
  }

  // props comuns de cada linha de item (SecaoOrcamento → LinhaItem)
  const linha = {
    aplicarCategoriaMaoDeObra, aplicarMaterialNoItem, aplicarServicoNoItem, atualizarItem,
    gruposServicos, materiaisPorId, pesquisarMercado, removerItem, servicoDoItem, sugestaoDoServico, vendidos,
  };

  return (
    <div>
      <CabecalhoEditor editandoId={editandoId} somenteLeitura={somenteLeitura} numeroEditando={numeroEditando}
        criadaPeloAssistente={criadaPeloAssistente} proximoNumero={proximoNumero} />

      <AvisoBases basesComFalha={basesComFalha} onTentarDeNovo={carregarBases} />

      {rascunhoPendente && (
        <AvisoRascunho rascunho={rascunhoPendente} editandoId={editandoId} versaoAtual={versaoRef.current}
          onRestaurar={restaurarRascunho} onDescartar={descartarRascunho} />
      )}

      {somenteLeitura && (
        <FaixaSomenteLeitura somenteLeitura={somenteLeitura} sujo={sujo} salvando={salvando} onSalvarComoCopia={salvarComoCopia} />
      )}

      {conflito && (
        <AvisoConflito conflito={conflito} salvando={salvando} onRecarregar={recarregarDoServidor} onSalvarComoCopia={salvarComoCopia} />
      )}

      {origem && <AvisoOrigem origem={origem} incluirFaltante={incluirFaltante} />}

      <AvisoItensACotar itens={itens} />

      {/* Proposta nova com BDI/impostos padrão ainda não definidos pelo administrador */}
      {!editandoId && padroesOrc && !padroesOrc.definidos && <AvisoPadroesNaoDefinidos ehAdmin={usuario?.role === 'admin'} />}

      {/* BDI (Fase 3F): órgão público sem composição do BDI e avisos da composição */}
      <AvisoBdi ehPublico={ehPublico} memoriaBdi={memoriaBdi} avisosBdi={avisosBdi} segmento={segmento} segmentoObra={segmentoObra}
        onCalcular={() => setCalculadoraBdiAberta(true)} />

      {/* Somente leitura (proposta de outro usuário): o fieldset desabilita
          todos os campos e botões de edição de uma vez */}
      <fieldset disabled={!!somenteLeitura} style={fieldsetLimpo}>
      {/* Dados gerais */}
      <DadosGerais
        clienteResolvido={clienteResolvido}
        clientes={clientes}
        form={form}
        setForm={setForm}
      />

      {/* Seções e itens */}
      {secoes.map(sec => (
        <SecaoOrcamento
          key={sec.id}
          sec={sec}
          itens={itens}
          materiais={materiais}
          segmento={segmento}
          pesquisas={pesquisas}
          linha={linha}
          onRenomear={renomearSecao}
          onRemover={removerSecao}
          onAdicionarItem={adicionarItem}
        />
      ))}
      </fieldset>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {!somenteLeitura && (<>
          <button onClick={adicionarSecao} style={btnSecundario}>
            <FolderPlus size={13} style={{ marginRight: 4 }} /> Adicionar seção
          </button>
          <InserirComposicao segmento={ehPublico ? 'publico' : 'privado'} onInserir={inserirItensDoKit} />
        </>)}
        <button type="button" onClick={() => setMostrarCurvaAbc(v => !v)} disabled={itens.length === 0}
          style={{ ...btnSecundario, ...(mostrarCurvaAbc ? { borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' } : {}) }}
          title="Itens do maior para o menor valor, com % do total, % acumulado e classe A/B/C">
          <BarChart3 size={13} style={{ marginRight: 4 }} /> {mostrarCurvaAbc ? 'Fechar curva ABC' : 'Curva ABC'}
        </button>
        {/* comparador com o orçamento de um concorrente para o mesmo projeto (aba Concorrência, 06/11/2026) */}
        {editandoId && (
          <Link to={`/propostas?aba=concorrencia&proposta=${editandoId}`} style={{ ...btnSecundario, textDecoration: 'none' }}
            title="Importar o orçamento de um concorrente para este projeto e comparar item a item">
            <Scale size={13} style={{ marginRight: 4 }} /> Comparar com concorrente
          </Link>
        )}
      </div>

      {mostrarCurvaAbc && itens.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: '#c9a227', fontSize: 13, marginBottom: 10 }}>Curva ABC da proposta</div>
          <CurvaAbcPainel itens={itensCurvaAbc} />
        </div>
      )}

      {/* 2.3: modelo 3D ilustrativo — só aparece quando a origem (análise/projeto) tem arquitetura */}
      {idAtual && <OpcaoModelo3dProposta propostaId={idAtual} somenteLeitura={!!somenteLeitura} />}

      {/* Totais */}
      <BarraTotais
        ajusteMaoDeObraInput={ajusteMaoDeObraInput}
        ajusteMateriaisInput={ajusteMateriaisInput}
        alteracoesPendentes={alteracoesPendentes}
        anexosPdf={anexosPdf}
        aplicarAjustePercentual={aplicarAjustePercentual}
        atualizarStatusSalvo={atualizarStatusSalvo}
        baixarPdf={baixarPdf}
        baixarPlanilha={baixarPlanilha}
        editandoId={editandoId}
        ehPublico={ehPublico}
        form={form}
        gerandoPdf={gerandoPdf}
        gerandoPlanilha={gerandoPlanilha}
        idAtual={idAtual}
        memoriaBdi={memoriaBdi}
        novoOrcamento={novoOrcamento}
        propostaSalva={propostaSalva}
        removerComposicaoBdi={removerComposicaoBdi}
        salvando={salvando}
        salvar={salvar}
        salvarComoCopia={salvarComoCopia}
        setAjusteMaoDeObraInput={setAjusteMaoDeObraInput}
        setAjusteMateriaisInput={setAjusteMateriaisInput}
        setAnexosPdf={setAnexosPdf}
        setCalculadoraBdiAberta={setCalculadoraBdiAberta}
        setForm={setForm}
        setModalEmail={setModalEmail}
        somenteLeitura={somenteLeitura}
        subtotalMaoObra={subtotalMaoObra}
        subtotalMateriais={subtotalMateriais}
        sujo={sujo}
        total={total}
        valorBdi={valorBdi}
        valorBdiMaoObra={valorBdiMaoObra}
        valorBdiMateriais={valorBdiMateriais}
        valorImpostoServico={valorImpostoServico}
        valorImpostoVenda={valorImpostoVenda}
      />

      <ModalEnviarEmail
        aberto={modalEmail}
        onFechar={() => setModalEmail(false)}
        proposta={propostaSalva}
        emailInicial={clienteEmailCadastro || clienteResolvido?.email || ''}
      />

      <CalculadoraBdi
        aberto={calculadoraBdiAberta}
        onFechar={() => setCalculadoraBdiAberta(false)}
        memoria={form.bdi_memoria}
        publico={ehPublico}
        impostoVenda={form.imposto_venda}
        impostoServico={form.imposto_servico}
        onAplicar={aplicarBdiCalculado}
      />
    </div>
  );
}
