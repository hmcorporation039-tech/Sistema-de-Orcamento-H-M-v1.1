import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, FolderPlus, Calculator, BarChart3, Scale } from 'lucide-react';
import { getSegmentoCliente, getProximoNumero, criarProposta, atualizarProposta, getProposta, getPadroesOrcamento, getPrecosVendidos, pesquisarPrecoMercado, getAnaliseProjeto, getLaudo, getObra, duplicarProposta, baixarPdfProposta, baixarPlanilhaProposta } from '../services/api';
import { formatarMoeda } from '../utils/format';
import { categoriasComUsadas } from '../utils/categoriasMateriais';
import { arred2, arredQtd, totalDaLinha } from '../utils/dinheiro';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { useAuth } from '../hooks/useAuth';
import useAlteracoesNaoSalvas from '../hooks/useAlteracoesNaoSalvas';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import { resultadoDaPesquisa } from '../components/PesquisaMercado';
import { comparador } from '../components/Select';
import useDisciplinas from '../hooks/useDisciplinas';
// Fase 3F (2.0): BDI pela fórmula do TCU e curva ABC da proposta
import CalculadoraBdi from '../components/CalculadoraBdi';
import CurvaAbcPainel from '../components/CurvaAbcPainel';
import { normalizarMemoriaBdi, tributosBdi } from '../utils/bdiTcu';
// Fase 3 (2.0): kits da base de preços e aprovação da proposta por link
import InserirComposicao, { distribuirNasSecoes } from '../components/InserirComposicao';
import { OpcaoModelo3dProposta } from '../components/Modelo3d';
import { BASES_DO_EDITOR, SECOES_PADRAO, SUBGRUPOS_PADRAO, apagarRascunho, chaveRascunho, ehMaoDeObra, formVazio, gerarId, gravarRascunho, lerRascunho, normalizarNome, origemDaProposta, pertenceASecao, retrato, temBdiMateriais } from './orcamento/apoio';
import { btnIcone, btnPrimario, btnSecundario, card, fieldsetLimpo } from './orcamento/estilos';
import AvisoOrigem from './orcamento/AvisoOrigem';
import DadosGerais from './orcamento/DadosGerais';
import LinhaItem from './orcamento/LinhaItem';
import BarraTotais from './orcamento/BarraTotais';

// Arredondamentos iguais aos do servidor (utils/dinheiro.js ↔ calculoProposta):
// quantidade 3 casas, unitário 2, linha 2 (totalDaLinha), parcelas 2 (arred2).

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
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  // Base única de serviços de mão de obra (versão 2.0): os padrão da Análise
  // de Projeto/laudos + os já lançados em qualquer proposta, com as
  // referências oficial e particular e a sugestão por segmento (ver
  // aplicarServicoNoItem). Um serviço digitado à mão entra na base ao salvar
  // a proposta (backend: utils/servicosBase.js).
  const [servicos, setServicos] = useState([]);
  // segmento do cliente da proposta: 'publico' (cadastro "Órgão Público" ou
  // nome de órgão) usa a referência oficial; os demais, a particular
  const [segmento, setSegmento] = useState('privado');

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
  // segmento da obra (obras.segmento) — órgão público pela obra OU pelo cliente
  const [segmentoObra, setSegmentoObra] = useState(null);
  const calculadoraJaSugerida = useRef(null); // id da proposta em que o calculador já abriu sozinho
  // BDI e impostos padrão do administrador (null = ainda não carregou ou não conseguiu)
  const [padroesOrc, setPadroesOrc] = useState(null);
  const buscarPadroes = () => getPadroesOrcamento().then(r => { setPadroesOrc(r.data); return r.data; }).catch(() => null);

  // catálogo e clientes inteiros (o servidor pagina em até 1000 por vez). Se uma base não carregar, avisa e
  // oferece "Tentar de novo": antes o erro era engolido, e a lista vazia do "+ catálogo" parecia material não cadastrado.
  const [basesComFalha, setBasesComFalha] = useState([]);
  const carregarBases = useCallback((quais = Object.keys(BASES_DO_EDITOR)) => {
    const guardar = { clientes: (d) => setClientes(d.itens), materiais: (d) => setMateriais(d.itens), servicos: (d) => setServicos(d.itens || []) };
    setBasesComFalha(f => f.filter(b => !quais.includes(b)));
    quais.forEach(b => BASES_DO_EDITOR[b].carregar().then(res => guardar[b](res.data)).catch(() => {
      setBasesComFalha(f => (f.includes(b) ? f : [...f, b]));
      toast.error(`Não foi possível carregar ${BASES_DO_EDITOR[b].nome}. Use "Tentar de novo" no aviso do topo.`, { id: `falha-base-${b}` });
    }));
  }, []);
  useEffect(() => { carregarBases(); }, [carregarBases]);

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

  // Segmento pelo backend (mesma regra dos laudos e da Análise de Projeto),
  // só depois que o nome do cliente para de mudar
  useEffect(() => {
    const nome = (form.cliente_nome || '').trim();
    if (!nome) { setSegmento('privado'); return undefined; }
    const t = setTimeout(() => {
      getSegmentoCliente(nome).then(res => setSegmento(res.data.segmento === 'publico' ? 'publico' : 'privado')).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [form.cliente_nome]);

  useEffect(() => {
    if (!form.obra_id) { setSegmentoObra(null); return; }
    getObra(form.obra_id).then(res => setSegmentoObra(res.data?.segmento ?? res.data?.obra?.segmento ?? null)).catch(() => setSegmentoObra(null));
  }, [form.obra_id]);

  // Órgão público (cliente ou obra): a proposta precisa da composição do BDI
  // (memória do cálculo pelo TCU). Ao abrir uma proposta salva de órgão
  // público sem memória, o calculador abre sozinho (uma vez), já sugerido;
  // o PDF passa a sugerir o anexo da composição.
  const ehPublico = segmento === 'publico' || segmentoObra === 'publico';
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

  const servicosPorCodigo = useMemo(() => Object.fromEntries(servicos.map(s => [s.codigo, s])), [servicos]);
  // lista suspensa: um grupo por disciplina, grupos em ordem alfabética (as
  // opções dentro de cada grupo o Select já ordena A–Z)
  const gruposServicos = useMemo(() => {
    const grupos = {};
    for (const s of servicos) (grupos[s.disciplina || 'outros'] = grupos[s.disciplina || 'outros'] || []).push(s);
    return Object.entries(grupos)
      .map(([disc, lista]) => ({ disc, nome: nomeDisciplina(disc), lista }))
      .sort((a, b) => comparador.compare(a.nome, b.nome));
  }, [servicos, nomeDisciplina]);
  const sugestaoDoServico = (s) => (s?.sugerido ? s.sugerido[segmento] : null);
  // item sem código (veio digitado, ou de uma análise antiga) ainda acha o
  // serviço da base pela descrição, para mostrar as referências
  const servicosPorDescricao = useMemo(() => Object.fromEntries(servicos.map(s => [normalizarNome(s.descricao), s])), [servicos]);
  const servicoDoItem = (it) => servicosPorCodigo[it.codigo] || servicosPorDescricao[normalizarNome(it.descricao)];
  const materiaisPorId = useMemo(() => Object.fromEntries(materiais.map(m => [String(m.id), m])), [materiais]);

  // Faixa praticada (propostas aprovadas) dos materiais que estão nesta proposta. A tela da
  // própria proposta não conta contra si; falha de rede só some com a dica.
  const [vendidos, setVendidos] = useState({});
  const idsMateriais = [...new Set(itens.map(i => Number(i.material_id)).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  const chaveIdsMateriais = idsMateriais.join(',');
  useEffect(() => {
    if (!chaveIdsMateriais) { setVendidos({}); return undefined; }
    let vivo = true;
    getPrecosVendidos(chaveIdsMateriais.split(',').map(Number), editandoId)
      .then(r => { if (vivo) setVendidos(r.data || {}); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [chaveIdsMateriais, editandoId]);

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
      const formCarregado = {
        data: (p.data || '').slice(0, 10),
        validade: p.validade,
        tipo: p.tipo || '',
        porte: p.porte || '',
        cliente_nome: p.cliente_nome || '',
        responsavel: p.responsavel || '',
        local_obra: p.local_obra || '',
        escopo: p.escopo || '',
        pagamento: p.pagamento || '',
        observacoes: p.observacoes || '',
        bdi: Number(p.bdi) || 0,
        bdi_materiais: temBdiMateriais(p.bdi_materiais) ? Number(p.bdi_materiais) : null,
        bdi_memoria: p.bdi_memoria || null,
        imposto_venda: Number(p.imposto_venda) || 0,
        imposto_servico: Number(p.imposto_servico) || 0,
        desconto_materiais_pct: p.desconto_materiais_pct != null ? Number(p.desconto_materiais_pct) : null,
        desconto_mao_obra_pct: p.desconto_mao_obra_pct != null ? Number(p.desconto_mao_obra_pct) : null,
        obra_id: p.obra_id ?? null,
      };
      const secoesCarregadas = (p.secoes || []).map(s => ({ id: s.id, nome: s.nome }));
      // Reagrupa por subgrupo já ao carregar — sem isso, uma proposta salva
      // antes dessa correção (ou com itens lançados fora de ordem) só ficava
      // reorganizada depois que alguém mexesse manualmente num subgrupo.
      let itensCarregados = (p.itens || []).map(it => ({
        id: gerarId(), sid: it.secao_id, material_id: it.material_id,
        descricao: it.descricao, quantidade: Number(it.quantidade), unidade: it.unidade,
        valor_unitario: Number(it.valor_unitario), ncm: it.ncm || '', codigo: it.codigo || '',
        subgrupo: it.subgrupo || '', status: it.status || 'confirmado',
        // 'assistente' = sugerido pela IA (assistente virtual): fica "a cotar" até o engenheiro confirmar aqui
        origem_item: it.origem_item || null
      }));
      for (const sid of new Set(itensCarregados.map(it => it.sid))) {
        itensCarregados = reordenarPorSubgrupo(itensCarregados, sid);
      }
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

  const clienteResolvido = useMemo(
    // `c.nome` pode vir nulo do banco; sem a guarda, um único cliente sem nome
    // derrubava a tela inteira a cada tecla digitada no campo Cliente.
    // Ignora acentuação na comparação — "CLINICA" (proposta antiga, sem
    // acento) e "CLÍNICA" (nome certo no cadastro) são o mesmo cliente, mas
    // sem normalizar isso a busca falhava e o e-mail nunca era encontrado.
    () => clientes.find(c => normalizarNome(c.nome) === normalizarNome(form.cliente_nome)),
    [clientes, form.cliente_nome]
  );

  // Botão de salvar, PDF/planilha/e-mail: "alterações não salvas" = sujo
  const alteracoesPendentes = sujo;

  // Mesma conta do servidor (backend/src/utils/calculoProposta.js): quantidade
  // com 3 casas, unitário com 2, total de cada linha arredondado, e cada
  // componente (subtotais, BDI, impostos, total) arredondado — tela e PDF batem no centavo.
  function subtotalSecao(sid) {
    return itens
      .filter(it => pertenceASecao(it, sid))
      .reduce((s, it) => s + totalDaLinha(it.quantidade, it.valor_unitario), 0);
  }

  const { subtotalMateriais, subtotalMaoObra, valorBdi, valorBdiMateriais, valorBdiMaoObra, valorImpostoVenda, valorImpostoServico, total } = useMemo(() => {
    let mat = 0, mao = 0;
    for (const sec of secoes) {
      const sub = subtotalSecao(sec.id);
      if (ehMaoDeObra(sec.nome)) mao += sub;
      else mat += sub;
    }
    mat = arred2(mat);
    mao = arred2(mao);
    const bdiPct = Number(form.bdi) || 0;
    // BDI diferenciado (calculoProposta.detalharBdi): sem ele, a expressão de sempre
    let vBdi, vBdiMat = null, vBdiMao = null;
    if (temBdiMateriais(form.bdi_materiais)) {
      vBdiMat = arred2(mat * (Number(form.bdi_materiais) / 100));
      vBdiMao = arred2(mao * (bdiPct / 100));
      vBdi = arred2(vBdiMat + vBdiMao);
    } else {
      vBdi = arred2((mat + mao) * (bdiPct / 100));
    }
    const vImpVenda = arred2(mat * ((Number(form.imposto_venda) || 0) / 100));
    const vImpServico = arred2(mao * ((Number(form.imposto_servico) || 0) / 100));
    return {
      subtotalMateriais: mat, subtotalMaoObra: mao, valorBdi: vBdi, valorBdiMateriais: vBdiMat, valorBdiMaoObra: vBdiMao,
      valorImpostoVenda: vImpVenda, valorImpostoServico: vImpServico,
      total: arred2(mat + mao + vBdi + vImpVenda + vImpServico),
    };
  }, [itens, secoes, form.bdi, form.bdi_materiais, form.imposto_venda, form.imposto_servico]);

  // itens para a curva ABC (tipo pela seção, como no PDF e na planilha)
  const itensCurvaAbc = useMemo(() => {
    const tipoDaSecao = new Map(secoes.map(s => [s.id, ehMaoDeObra(s.nome) ? 'servico' : 'material']));
    return itens.map(it => ({
      // como o servidor grava (quantidade 3 casas, unitário 2): mesma curva do PDF
      descricao: it.descricao, quantidade: arredQtd(it.quantidade), unidade: it.unidade,
      valor_unitario: arred2(it.valor_unitario), codigo: it.codigo, tipo: tipoDaSecao.get(it.sid) || 'material',
    }));
  }, [itens, secoes]);

  // Avisos do BDI (Fase 3F): memória com tributos dentro + impostos por fora
  // (imposto contado duas vezes) e BDI mudado à mão depois do cálculo.
  const avisosBdi = useMemo(() => {
    const lista = [];
    if (!memoriaBdi) return lista;
    const tributosDentro = tributosBdi(memoriaBdi.parcelas, memoriaBdi.regime) > 0;
    if (tributosDentro && ((Number(form.imposto_venda) || 0) > 0 || (Number(form.imposto_servico) || 0) > 0)) {
      lista.push('O BDI calculado já inclui os tributos (PIS, COFINS, ISS…) e a proposta ainda soma "Imp. Vendas"/"Imp. Serviços" por fora — o imposto entra duas vezes. Zere esses campos ou recalcule o BDI sem tributos.');
    }
    if (Math.abs((Number(form.bdi) || 0) - memoriaBdi.bdi) > 0.005) {
      lista.push(`O BDI da proposta (${form.bdi} %) não é o da composição calculada (${memoriaBdi.bdi.toLocaleString('pt-BR')} %) — o anexo do PDF vai avisar a diferença. Abra o calculador e aplique de novo, ou remova a composição.`);
    }
    if (memoriaBdi.materiais && (!temBdiMateriais(form.bdi_materiais) || Math.abs(Number(form.bdi_materiais) - memoriaBdi.materiais.bdi) > 0.005)) {
      lista.push(`O BDI de materiais da proposta não é o da composição (${memoriaBdi.materiais.bdi.toLocaleString('pt-BR')} %).`);
    }
    return lista;
  }, [memoriaBdi, form.bdi, form.bdi_materiais, form.imposto_venda, form.imposto_servico]);

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
    const lista = itens.filter(it => pertenceASecao(it, sid));
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
      somaGrupo += totalDaLinha(it.quantidade, it.valor_unitario);
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
    if (!form.cliente_nome.trim()) {
      toast.error('Informe o cliente da proposta');
      return false;
    }
    if (itens.length === 0) {
      toast.error('Adicione ao menos um item à proposta');
      return false;
    }
    for (const [i, it] of itens.entries()) {
      if (!String(it.descricao || '').trim()) {
        toast.error(`O item ${i + 1} está sem descrição`);
        return false;
      }
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd < 0) {
        toast.error(`Quantidade inválida no item ${i + 1}`);
        return false;
      }
      const vu = Number(it.valor_unitario);
      if (!Number.isFinite(vu) || vu < 0) {
        toast.error(`Valor unitário inválido no item ${i + 1}`);
        return false;
      }
    }
    return true;
  }

  function montarPayload() {
    return {
      data: form.data,
      validade: Number(form.validade) || 5,
      tipo: form.tipo,
      porte: form.porte,
      cliente_id: clienteResolvido?.id || null,
      cliente_nome: form.cliente_nome.trim(),
      responsavel: form.responsavel,
      local_obra: form.local_obra,
      escopo: form.escopo,
      pagamento: form.pagamento,
      observacoes: form.observacoes,
      bdi: Number(form.bdi) || 0,
      // Fase 3F: sempre enviados — null limpa (BDI único / sem composição)
      bdi_materiais: temBdiMateriais(form.bdi_materiais) ? Number(form.bdi_materiais) : null,
      bdi_memoria: form.bdi_memoria || null,
      imposto_venda: Number(form.imposto_venda) || 0,
      imposto_servico: Number(form.imposto_servico) || 0,
      desconto_materiais_pct: form.desconto_materiais_pct,
      desconto_mao_obra_pct: form.desconto_mao_obra_pct,
      // obra (2.0): sempre enviada — no PUT, null desliga a proposta da obra
      obra_id: form.obra_id || null,
      // Subtotais/BDI/impostos/total não são mais enviados: o backend
      // recalcula tudo a partir dos itens (antes ele gravava o que o
      // navegador mandasse, e uma quantidade zerada fazia o PDF sair com a
      // linha valendo o preço cheio e o total geral sem ela).
      secoes: secoes.map(s => ({ id: s.id, nome: s.nome })),
      itens: itens.map(it => ({
        // quantidade com 3 casas e unitário com 2, como o servidor grava
        sid: it.sid, desc: it.descricao, qtd: arredQtd(it.quantidade),
        un: it.unidade, vu: arred2(it.valor_unitario), ncm: it.ncm || null,
        codigo: it.codigo || null, material_id: it.material_id || null,
        subgrupo: it.subgrupo?.trim() || null, status: it.status || 'confirmado',
        // a marca do item sugerido pela IA vai junto (o servidor o mantém "a cotar" e fora do catálogo enquanto existir)
        origem_item: it.origem_item || null
      })),
    };
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
      const payload = montarPayload();
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
      const res = await criarProposta(montarPayload());
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>
          {editandoId ? `${somenteLeitura ? 'Proposta' : 'Editando Proposta'} ${numeroEditando}` : 'Novo Orçamento'}
          {editandoId && criadaPeloAssistente && (
            <span title="Rascunho montado pelo assistente virtual — revise antes de enviar ao cliente"
              style={{ marginLeft: 10, fontSize: 11.5, fontWeight: 700, color: '#c9a227', border: '1px solid #4a3d10', background: '#17140a', borderRadius: 10, padding: '2px 8px', verticalAlign: 'middle' }}>
              criada pelo assistente
            </span>
          )}
        </h2>
        {!editandoId && proximoNumero != null && (
          <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
            Próxima proposta: <b style={{ color: '#c9a227' }}>P{String(proximoNumero).padStart(3, '0')}</b>
          </span>
        )}
      </div>

      {basesComFalha.length > 0 && (
        <div data-testid="aviso-bases" role="alert" style={{ ...card, padding: '12px 16px', borderColor: '#6a2a2a', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
            Não foi possível carregar <b style={{ color: '#e0a050' }}>{basesComFalha.map(b => BASES_DO_EDITOR[b].nome).join(', ')}</b>.
            As listas podem estar vazias ou incompletas: um material que não aparece no "+ catálogo" pode só não ter carregado.
          </div>
          <button type="button" onClick={() => carregarBases(basesComFalha)} style={{ ...btnSecundario, padding: '8px 14px' }}>Tentar de novo</button>
        </div>
      )}

      {rascunhoPendente && (
        <div data-testid="aviso-rascunho" style={{ ...card, padding: '12px 16px', borderColor: '#5a4a12', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
            Há um <b style={{ color: '#c9a227' }}>rascunho não salvo</b> desta {editandoId ? 'proposta' : 'proposta nova'} neste navegador
            {rascunhoPendente.salvoEm ? `, de ${new Date(rascunhoPendente.salvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
            {rascunhoPendente.form?.cliente_nome ? ` (cliente: ${rascunhoPendente.form.cliente_nome})` : ''}
            {` — ${rascunhoPendente.itens.length} item(ns)`}.
            {editandoId && rascunhoPendente.versao != null && versaoRef.current != null && rascunhoPendente.versao !== versaoRef.current && (
              <span style={{ color: '#e0a050' }}> A proposta foi alterada no servidor depois desse rascunho: ao salvar, o sistema vai avisar do conflito.</span>
            )}
          </div>
          <button type="button" onClick={restaurarRascunho} style={{ ...btnPrimario, padding: '8px 14px' }}>Restaurar rascunho</button>
          <button type="button" onClick={() => { if (window.confirm('Descartar o rascunho? Ele não poderá ser recuperado.')) descartarRascunho(); }} style={btnSecundario}>Descartar</button>
        </div>
      )}

      {somenteLeitura && (
        <div data-testid="faixa-somente-leitura" style={{ ...card, padding: '12px 16px', borderColor: '#2f4f6f', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
            <b style={{ color: '#8ab4f8' }}>Somente leitura</b> — {somenteLeitura.mensagem}
            <span style={{ color: 'var(--texto-3)' }}>{sujo ? ' As alterações feitas aqui continuam na tela: salve-as numa cópia sua.' : ' Para trabalhar nela, faça uma cópia sua.'}</span>
          </div>
          <button type="button" onClick={salvarComoCopia} disabled={salvando} style={{ ...btnPrimario, padding: '8px 14px' }}>
            {salvando ? 'Salvando…' : sujo ? 'Salvar como cópia minha' : 'Duplicar para mim'}
          </button>
        </div>
      )}

      {conflito && (
        <div data-testid="aviso-conflito" style={{ ...card, padding: '12px 16px', borderColor: '#6a2a2a', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
            <b style={{ color: '#e08080' }}>Não foi salvo:</b> {conflito.mensagem}
            <span style={{ color: 'var(--texto-3)' }}> Nada foi sobrescrito. As suas alterações continuam na tela (e no rascunho deste navegador).</span>
          </div>
          <button type="button" onClick={recarregarDoServidor} disabled={salvando} style={btnSecundario}
            title="Descarta as alterações desta tela e abre a versão que está gravada agora">Recarregar do servidor</button>
          <button type="button" onClick={salvarComoCopia} disabled={salvando} style={{ ...btnPrimario, padding: '8px 14px' }}
            title="Grava o que está na tela como uma proposta nova (outro número); a original fica como a outra pessoa deixou">
            {salvando ? 'Salvando…' : 'Salvar como cópia'}
          </button>
        </div>
      )}

      {origem && <AvisoOrigem origem={origem} incluirFaltante={incluirFaltante} />}

      {(() => {
        const aCotar = itens.filter(it => it.status === 'a_cotar').length;
        const semPreco = itens.filter(it => !(Number(it.valor_unitario) > 0)).length;
        if (!aCotar && !semPreco) return null;
        return (
          <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
            {[aCotar && `${aCotar} item(ns) "a cotar"`, semPreco && `${semPreco} item(ns) sem preço (R$ 0,00)`].filter(Boolean).join(' · ')}
            <span style={{ color: 'var(--texto-3)' }}> — revise antes de enviar ao cliente: use "Pesquisar mercado", as referências ("usar") ou o catálogo em cada linha.</span>
          </div>
        );
      })()}

      {/* Proposta nova com BDI/impostos padrão ainda não definidos pelo administrador */}
      {!editandoId && padroesOrc && !padroesOrc.definidos && (
        <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
          ⚠ O BDI e os impostos padrão ainda não foram definidos{usuario?.role === 'admin' ? <> (<Link to="/cadastros?aba=integracoes" style={{ color: '#c9a227', textDecoration: 'underline' }}>Integrações → BDI e impostos padrão</Link>)</> : ' — peça ao administrador (Integrações)'}.
          Os campos abaixo vieram com 0 %: confira BDI, imposto sobre venda e imposto sobre serviço antes de salvar.
        </div>
      )}

      {/* BDI (Fase 3F): órgão público sem composição do BDI e avisos da composição */}
      {((ehPublico && !memoriaBdi) || avisosBdi.length > 0) && (
        <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
          {ehPublico && !memoriaBdi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 260 }}>
                Cliente órgão público{segmentoObra === 'publico' && segmento !== 'publico' ? ' (pela obra)' : ''}: a proposta não tem a <b>composição do BDI</b>
                <span style={{ color: 'var(--texto-3)' }}> (memória do cálculo pela fórmula do TCU, Acórdão 2.622/2013), que costuma ser exigida pelo órgão.</span>
              </span>
              <button type="button" onClick={() => setCalculadoraBdiAberta(true)} style={{ ...btnSecundario, borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }}>
                <Calculator size={13} style={{ marginRight: 4 }} /> Calcular BDI (TCU)
              </button>
            </div>
          )}
          {avisosBdi.map(a => <div key={a} style={{ marginTop: ehPublico && !memoriaBdi ? 6 : 0 }}>⚠ {a}</div>)}
        </div>
      )}

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
      {secoes.map(sec => {
        const maoDeObra = ehMaoDeObra(sec.nome);
        const colunas = maoDeObra
          ? '0.9fr 1.2fr 3.1fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px'
          : '0.9fr 1.2fr 2.4fr 0.9fr 0.7fr 0.7fr 0.9fr 0.9fr 1fr 32px';
        // Seções de Materiais usam as categorias do cadastro de Materiais (coligado
        // com o catálogo — ver filtro no dropdown "+ catálogo" abaixo); seções de
        // Mão de Obra continuam com os subgrupos livres de sempre.
        const opcoesSubgrupo = maoDeObra
          ? subgruposDaSecao(sec.id)
          : categoriasComUsadas(materiais.map(m => m.categoria));

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
              {maoDeObra && (
                <span style={{ fontSize: 12, color: '#6f7f8f' }} title={'Define qual referência de mercado a lista de serviços sugere (cadastro do cliente: tipo "Órgão Público" → oficial)'}>
                  Preços sugeridos: cliente {segmento === 'publico' ? 'órgão público (referência oficial)' : 'particular'}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Subtotal: <b style={{ color: '#c9a227' }}>{formatarMoeda(subtotalSecao(sec.id))}</b></span>
              <button onClick={() => removerSecao(sec.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover seção">
                <Trash2 size={13} />
              </button>
            </div>

            {itens.filter(it => it.sid === sec.id).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                <span>{maoDeObra ? 'Subgrupo' : 'Categoria'}</span>
                <span>{maoDeObra ? 'Serviço' : 'Catálogo'}</span>
                <span>Descrição</span>
                {!maoDeObra && <span>NCM/SH</span>}
                <span>Qtd</span><span>Un.</span><span>Vlr. Unit.</span><span>Total</span><span>Status</span><span />
              </div>
            )}

            {itensAgrupados(sec.id).map(linha => {
              if (linha.tipo === 'cabecalho') {
                return (
                  <div key={linha.key} style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, marginBottom: 6 }}>
                    {linha.nome}
                  </div>
                );
              }
              if (linha.tipo === 'subtotal') {
                return (
                  <div key={linha.key} style={{ textAlign: 'right', fontSize: 12, color: 'var(--texto-3)', paddingRight: 4, marginBottom: 10 }}>
                    Subtotal {linha.nome}: <b style={{ color: '#c9a227' }}>{formatarMoeda(linha.soma)}</b>
                  </div>
                );
              }
              const it = linha.item;
              return (
                <LinhaItem
                  key={it.id}
                  aplicarCategoriaMaoDeObra={aplicarCategoriaMaoDeObra}
                  aplicarMaterialNoItem={aplicarMaterialNoItem}
                  aplicarServicoNoItem={aplicarServicoNoItem}
                  atualizarItem={atualizarItem}
                  colunas={colunas}
                  gruposServicos={gruposServicos}
                  it={it}
                  maoDeObra={maoDeObra}
                  materiais={materiais}
                  materiaisPorId={materiaisPorId}
                  opcoesSubgrupo={opcoesSubgrupo}
                  pesquisa={pesquisas[it.id]}
                  pesquisarMercado={pesquisarMercado}
                  removerItem={removerItem}
                  segmento={segmento}
                  servicoDoItem={servicoDoItem}
                  sugestaoDoServico={sugestaoDoServico}
                  vendidos={vendidos}
                />
              );
            })}

            <button onClick={() => adicionarItem(sec.id)} style={{ ...btnSecundario, marginTop: 4 }}>
              <Plus size={13} style={{ marginRight: 4 }} /> Adicionar item
            </button>
          </div>
        );
      })}
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
