import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, FolderPlus, FileDown, Send, FilePlus2, Search, ArrowLeft, Calculator, BarChart3 } from 'lucide-react';
import {
  getClientes, getMateriais, getServicos, getSegmentoCliente, getProximoNumero, criarProposta, atualizarProposta, getProposta,
  pesquisarPrecoMercado, getAnaliseProjeto, getLaudo, getObra,
} from '../services/api';
import api from '../services/api';
import { formatarMoeda } from '../utils/format';
import ModalEnviarEmail from '../components/ModalEnviarEmail';
import CampoMoeda from '../components/CampoMoeda';
import BlocoPesquisaMercado, { resultadoDaPesquisa } from '../components/PesquisaMercado';
import ObraSelect from '../components/ObraSelect';
import Select, { Sugestoes, comparador } from '../components/Select';
import { nomeDisciplina, ROTULO_SEGMENTO } from '../utils/disciplinasServico';
// Fase 3F (2.0): BDI pela fórmula do TCU e curva ABC da proposta
import CalculadoraBdi from '../components/CalculadoraBdi';
import CurvaAbcPainel from '../components/CurvaAbcPainel';
import { normalizarMemoriaBdi, tributosBdi } from '../utils/bdiTcu';
// Fase 3 (2.0): kits da base de preços e aprovação da proposta por link
import InserirComposicao, { distribuirNasSecoes } from '../components/InserirComposicao';
import BotaoLinkAprovacao from '../components/BotaoLinkAprovacao';

// BDI diferenciado de materiais preenchido? (vazio/null = mesmo BDI para tudo — calculoProposta.bdiMateriaisDefinido)
const temBdiMateriais = (v) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

// arredondamento a 2 casas igual ao do servidor (calculoProposta.arredondar)
const arred2 = (v) => Math.round(((Number(v) || 0) + Number.EPSILON) * 100) / 100;

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
  escopo: '',
  pagamento: '',
  observacoes: '',
  bdi: 20,
  // BDI diferenciado dos materiais (null = o mesmo BDI) e memória do cálculo
  // pelo TCU (null = BDI digitado à mão) — 2.0, Fase 3F
  bdi_materiais: null,
  bdi_memoria: null,
  imposto_venda: 0,
  imposto_servico: 6,
  // Só registram o percentual do ÚLTIMO reajuste/desconto aplicado direto
  // nos valores unitários (ver aplicarAjustePercentual) — não entram em
  // nenhuma conta de total, servem só pro PDF avisar quando foi desconto.
  desconto_materiais_pct: null,
  desconto_mao_obra_pct: null,
  // obra (2.0, Fase 2D/2E): a proposta pertence a uma obra (ou a nenhuma);
  // proposta nova aberta a partir da obra (?obra=ID) já vem com ela
  obra_id: null,
};

const SECOES_PADRAO = () => [
  { id: gerarId(), nome: 'Materiais' },
  { id: gerarId(), nome: 'Mão de Obra' },
];

// Remove acentuação e normaliza caixa/espaços — usado pra comparar nome de
// cliente sem falhar por causa de "CLINICA" x "CLÍNICA", maiúscula/minúscula
// ou espaço a mais.
function normalizarNome(txt) {
  return (txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

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

// Mesma lista usada no cadastro de Materiais (ver CATEGORIAS_PADRAO em
// Materiais.js) — nas seções de Materiais do orçamento, o campo que antes era
// "Subgrupo" (texto livre) virou "Categoria", com as mesmas opções do
// cadastro, pra ficar coligado com o catálogo (ver opcoesAgrupamento).
const CATEGORIAS_PADRAO_MATERIAIS = [
  // categorias usadas no catálogo (a tela mostra em ordem alfabética); 'Não classificado'
  // só aparece se algum material ainda estiver aguardando a classificação automática
  'Alarme', 'Antena coletiva', 'Automação', 'CFTV', 'Controle de acesso', 'Elétrica', 'EPI', 'Ferragens', 'Ferramentas',
  'Informatica', 'Infraestrutura', 'Interfonia', 'Nobreaks', 'Redes / Cabeamento Estruturado', 'Sonorização',
];

// Propostas antigas guardam no item subgrupos de texto livre que não batem com
// as categorias do catálogo ("Redes de Computadores (dados)", "Controle de
// Acesso" x "Controle de acesso"...). Comparar sem diferenciar maiúsculas e,
// sem nenhuma correspondência, mostrar o catálogo inteiro evita que o
// "+ catálogo" dessas linhas apareça vazio.
function filtrarCatalogoPorCategoria(materiais, categoria) {
  const alvo = (categoria || '').trim().toLowerCase();
  if (!alvo) return materiais;
  const daCategoria = materiais.filter(m => (m.categoria || '').trim().toLowerCase() === alvo);
  return daCategoria.length > 0 ? daCategoria : materiais;
}

// Origem do rascunho (versão 2.0 — editor único de orçamento): a Análise de
// Projeto e os laudos GERAM a proposta e abrem este editor. A proposta guarda
// a origem em origem_tipo/origem_id (migração 2.0-05); propostas sem esse
// campo caem na leitura do histórico ("… a partir da Análise de Projeto #12"
// / "… a partir de Laudos e projetos #5 (SPDA — Execução)"; vale o evento mais
// antigo) e do escopo. O vínculo é conferido depois na própria origem
// (analises_projeto.proposta_id / laudos_projetos.propostas), porque uma
// proposta duplicada herda o escopo sem ser a vinculada.
function origemDaProposta(p) {
  if ((p.origem_tipo === 'analise' || p.origem_tipo === 'laudo') && p.origem_id) {
    const doHistorico = [...(p.eventos || [])].map(e => /Laudos e projetos #\d+\s*\(([^)]*)\)/i.exec(String(e.detalhes || ''))).find(Boolean);
    return { tipo: p.origem_tipo, id: Number(p.origem_id), rotulo: doHistorico ? doHistorico[1] : '' };
  }
  const textos = [...(p.eventos || [])].reverse().map(e => String(e.detalhes || ''));
  textos.push(String(p.escopo || ''));
  for (const t of textos) {
    let m = /An[áa]lise de Projeto #(\d+)/i.exec(t);
    if (m) return { tipo: 'analise', id: Number(m[1]) };
    m = /Laudos e projetos #(\d+)(?:\s*\(([^)]*)\))?/i.exec(t);
    if (m) return { tipo: 'laudo', id: Number(m[1]), rotulo: m[2] || '' };
  }
  return null;
}

const linkDaOrigem = (o) => (o.tipo === 'analise' ? `/obras/analise/${o.id}` : `/obras?aba=laudos&laudo=${o.id}`);

export default function Orcamento() {
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

  const [form, setForm] = useState(FORM_VAZIO);
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
  // Vira true quando o usuário edita algo DEPOIS de já ter salvo — nesse caso o
  // botão de salvar reaparece. Antes ele sumia para sempre após o primeiro
  // salvamento, mas os campos continuavam editáveis: a pessoa corrigia um
  // preço, via o total mudar na tela e não tinha como gravar a correção.
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [carregandoEdicao, setCarregandoEdicao] = useState(!!editandoId);
  const [numeroEditando, setNumeroEditando] = useState('');
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

  useEffect(() => {
    getClientes({ porPagina: 1000 }).then(res => setClientes(res.data.itens)).catch(() => {});
    getMateriais({ porPagina: 1000 }).then(res => setMateriais(res.data.itens)).catch(() => {});
    getServicos().then(res => setServicos(res.data.itens || [])).catch(() => {});
  }, []);

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
  }, [servicos]);
  const sugestaoDoServico = (s) => (s?.sugerido ? s.sugerido[segmento] : null);
  // item sem código (veio digitado, ou de uma análise antiga) ainda acha o
  // serviço da base pela descrição, para mostrar as referências
  const servicosPorDescricao = useMemo(() => Object.fromEntries(servicos.map(s => [normalizarNome(s.descricao), s])), [servicos]);
  const servicoDoItem = (it) => servicosPorCodigo[it.codigo] || servicosPorDescricao[normalizarNome(it.descricao)];
  const materiaisPorId = useMemo(() => Object.fromEntries(materiais.map(m => [String(m.id), m])), [materiais]);

  useEffect(() => {
    setPesquisas({});
    setOrigem(null);
    if (!editandoId) {
      getProximoNumero().then(res => setProximoNumero(res.data.proximo)).catch(() => {});
      if (obraDaUrl) setForm(f => ({ ...f, obra_id: obraDaUrl }));
      return;
    }
    setCarregandoEdicao(true);
    getProposta(editandoId).then(res => {
      const p = res.data;
      versaoRef.current = p.versao ?? null;
      setNumeroEditando(p.numero);
      setClienteEmailCadastro(p.cliente_email || '');
      setForm({
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
      carregarOrigem(p, itensCarregados);
    }).catch(() => {
      toast.error('Erro ao carregar proposta para edição');
      navigate('/orcamento');
    }).finally(() => setCarregandoEdicao(false));
  }, [editandoId, navigate, obraDaUrl]);

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
  async function pesquisarMercado(item, maoDeObra) {
    const descricao = String(item.descricao || '').trim();
    if (!descricao) {
      toast.error('Preencha a descrição antes de pesquisar');
      return;
    }
    setPesquisas(p => ({ ...p, [item.id]: { ...(p[item.id] || {}), erro: null, carregando: true } }));
    try {
      const res = await pesquisarPrecoMercado(descricao, maoDeObra ? 'servico' : 'material');
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

  // Marca que há edição não salva depois de a proposta já ter sido gravada.
  useEffect(() => {
    if (propostaSalva) setAlteracoesPendentes(true);
    // eslint-disable-next-line
  }, [form, secoes, itens]);

  // Mesma conta do servidor (backend/src/utils/calculoProposta.js): unitário
  // arredondado a 2 casas, total de cada linha arredondado, e cada componente
  // (subtotais, BDI, impostos, total) arredondado — tela e PDF batem no centavo.
  function subtotalSecao(sid) {
    return itens
      .filter(it => it.sid === sid)
      .reduce((s, it) => s + arred2((Number(it.quantidade) || 0) * arred2(Number(it.valor_unitario) || 0)), 0);
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
      descricao: it.descricao, quantidade: Number(it.quantidade) || 0, unidade: it.unidade,
      valor_unitario: Number(it.valor_unitario) || 0, codigo: it.codigo, tipo: tipoDaSecao.get(it.sid) || 'material',
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
    if (propostaSalva) setAlteracoesPendentes(true);
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
      const atualizado = it.map(i => i.id === id ? { ...i, [campo]: valor } : i);
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
      ? { ...item, valor_unitario: Math.round((Number(item.valor_unitario) || 0) * fator * 100) / 100 }
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

  const [gerandoPlanilha, setGerandoPlanilha] = useState(false);
  async function baixarPlanilha() {
    if (!propostaSalva) return;
    setGerandoPlanilha(true);
    try {
      const res = await api.get(`/propostas/${propostaSalva.id}/planilha`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.cliente_nome.trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_')}_${propostaSalva.numero}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar a planilha');
    } finally {
      setGerandoPlanilha(false);
    }
  }

  async function baixarPdf() {
    if (!propostaSalva) return;
    setGerandoPdf(true);
    try {
      // anexos opcionais (Fase 3F): curva ABC e composição do BDI — desligados por padrão
      const params = {};
      if (anexosPdf.curva_abc) params.curva_abc = 1;
      if (anexosPdf.composicao_bdi) params.composicao_bdi = 1;
      const res = await api.get(`/propostas/${propostaSalva.id}/pdf`, { responseType: 'blob', params });
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
      const res = idAlvo ? await atualizarProposta(idAlvo, { ...payload, versao: versaoRef.current }) : await criarProposta(payload);
      versaoRef.current = res.data.versao ?? null;
      toast.success(res.data.mensagem || 'Proposta salva com sucesso!');
      setPropostaSalva(res.data);
      setAlteracoesPendentes(false);
    } catch (err) {
      const conflito = err.response?.status === 409;
      toast.error(err.response?.data?.erro || 'Erro ao salvar proposta', conflito ? { duration: 15000 } : undefined);
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

      {origem && (
        <div style={{ ...card, padding: '12px 16px', borderColor: '#3a3216' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
              Rascunho gerado a partir {origem.tipo === 'analise'
                ? <>da <b style={{ color: '#c9a227' }}>Análise de Projeto #{origem.id}</b></>
                : <>do <b style={{ color: '#c9a227' }}>laudo/projeto #{origem.id}</b>{origem.rotulo ? ` (${origem.rotulo})` : ''}</>}
              {origem.titulo ? ` — ${origem.titulo}` : ''}.{' '}
              <span style={{ color: '#777' }}>
                {origem.existe === false
                  ? (origem.tipo === 'analise' ? 'A análise foi excluída.' : 'O laudo foi excluído.')
                  : origem.vinculada === false
                    ? 'A origem hoje está vinculada a outra proposta (esta pode ser uma cópia).'
                    : `Quantidades, preços, pesquisa de mercado e referências são revisados aqui. ${origem.tipo === 'analise' ? '"Atualizar orçamento" na análise' : '"Atualizar e abrir" no laudo'} substitui os itens desta proposta pelos de lá.`}
              </span>
            </div>
            {origem.existe !== false && (
              <Link to={linkDaOrigem(origem)} style={{ ...btnSecundario, textDecoration: 'none', borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }}>
                <ArrowLeft size={13} style={{ marginRight: 4 }} /> Voltar {origem.tipo === 'analise' ? 'à análise' : 'ao laudo'}
              </Link>
            )}
          </div>
          {origem.faltando?.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #222', fontSize: 12, color: '#999' }}>
              <div style={{ marginBottom: 6 }}>
                {origem.faltando.length} item(ns) da análise ficaram fora do rascunho por estarem com <b>quantidade 0</b> (modelo ainda não conferido na planta). Inclua os que fizerem parte e informe a quantidade:
              </div>
              {origem.faltando.map((x, i) => (
                <div key={`${x.tipo}_${i}_${x.descricao}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <span style={{ flex: 1, color: '#bbb' }}>{x.descricao} <span style={{ color: '#666' }}>({x.tipo === 'servico' ? 'serviço' : 'material'}{x.subgrupo ? ` — ${x.subgrupo}` : ''})</span></span>
                  <button type="button" onClick={() => incluirFaltante(x)} style={{ ...btnSecundario, padding: '3px 10px', fontSize: 11 }}>
                    <Plus size={11} style={{ marginRight: 3 }} /> Incluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(() => {
        const aCotar = itens.filter(it => it.status === 'a_cotar').length;
        const semPreco = itens.filter(it => !(Number(it.valor_unitario) > 0)).length;
        if (!aCotar && !semPreco) return null;
        return (
          <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
            {[aCotar && `${aCotar} item(ns) "a cotar"`, semPreco && `${semPreco} item(ns) sem preço (R$ 0,00)`].filter(Boolean).join(' · ')}
            <span style={{ color: '#777' }}> — revise antes de enviar ao cliente: use "Pesquisar mercado", as referências ("usar") ou o catálogo em cada linha.</span>
          </div>
        );
      })()}

      {/* BDI (Fase 3F): órgão público sem composição do BDI e avisos da composição */}
      {((ehPublico && !memoriaBdi) || avisosBdi.length > 0) && (
        <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
          {ehPublico && !memoriaBdi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 260 }}>
                Cliente órgão público{segmentoObra === 'publico' && segmento !== 'publico' ? ' (pela obra)' : ''}: a proposta não tem a <b>composição do BDI</b>
                <span style={{ color: '#777' }}> (memória do cálculo pela fórmula do TCU, Acórdão 2.622/2013), que costuma ser exigida pelo órgão.</span>
              </span>
              <button type="button" onClick={() => setCalculadoraBdiAberta(true)} style={{ ...btnSecundario, borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }}>
                <Calculator size={13} style={{ marginRight: 4 }} /> Calcular BDI (TCU)
              </button>
            </div>
          )}
          {avisosBdi.map(a => <div key={a} style={{ marginTop: ehPublico && !memoriaBdi ? 6 : 0 }}>⚠ {a}</div>)}
        </div>
      )}

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
            <Sugestoes id="clientes-lista">
              {clientes.map(c => <option key={c.id} value={c.nome} />)}
            </Sugestoes>
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
            <Sugestoes id="tipos-lista">
              <option value="Instalação" /><option value="Manutenção" /><option value="Reforma" /><option value="Projeto" />
            </Sugestoes>
          </Campo>
          <Campo label="Porte">
            <input list="portes-lista" value={form.porte} onChange={e => setForm({ ...form, porte: e.target.value })} placeholder="Pequeno, Médio, Grande" />
            <Sugestoes id="portes-lista">
              <option value="Pequeno" /><option value="Médio" /><option value="Grande" />
            </Sugestoes>
          </Campo>
          <Campo label="Responsável técnico">
            <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Campo label="Obra">
            <ObraSelect
              value={form.obra_id}
              clienteId={clienteResolvido?.id || null}
              clienteNome={form.cliente_nome}
              onChange={(id, obra) => setForm(f => ({
                ...f, obra_id: id,
                // obra escolhida numa proposta ainda sem cliente: traz o cliente da obra
                cliente_nome: f.cliente_nome.trim() || !obra?.cliente_nome ? f.cliente_nome : obra.cliente_nome,
              }))}
            />
          </Campo>
          <Campo label="Local da obra">
            <input value={form.local_obra} onChange={e => setForm({ ...form, local_obra: e.target.value })} />
          </Campo>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Campo label="Escopo">
            <textarea rows={3} value={form.escopo} onChange={e => setForm({ ...form, escopo: e.target.value })} placeholder="O que está sendo executado/fornecido — aparece logo após a saudação no PDF" />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Condições de pagamento">
            <textarea rows={3} value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })} />
          </Campo>
          <Campo label="Observações">
            <textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas gerais — aparece logo após as condições de pagamento no PDF" />
          </Campo>
        </div>
      </div>

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
          : Array.from(new Set([...CATEGORIAS_PADRAO_MATERIAIS, ...materiais.map(m => m.categoria).filter(Boolean)])).sort((x, y) => x.localeCompare(y, 'pt-BR'));

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
                <span style={{ fontSize: 11, color: '#6f7f8f' }} title={'Define qual referência de mercado a lista de serviços sugere (cadastro do cliente: tipo "Órgão Público" → oficial)'}>
                  Preços sugeridos: cliente {segmento === 'publico' ? 'órgão público (referência oficial)' : 'particular'}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#666' }}>Subtotal: <b style={{ color: '#c9a227' }}>{formatarMoeda(subtotalSecao(sec.id))}</b></span>
              <button onClick={() => removerSecao(sec.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover seção">
                <Trash2 size={13} />
              </button>
            </div>

            {itens.filter(it => it.sid === sec.id).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, marginBottom: 6, fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
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
              const semPreco = !(Number(it.valor_unitario) > 0);
              const pesquisa = pesquisas[it.id];
              return (
                <div
                  key={it.id}
                  style={{
                    marginBottom: 8, background: aCotar ? 'rgba(201,162,39,0.08)' : 'transparent',
                    borderRadius: 4, padding: aCotar ? '4px 4px' : 0,
                  }}
                >
                <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, alignItems: 'start' }}>
                  <Select
                    value={it.subgrupo || ''}
                    onChange={e => {
                      if (e.target.value === '__novo__') {
                        const novo = window.prompt(maoDeObra ? 'Nome do novo subgrupo:' : 'Nome da nova categoria:', it.subgrupo || '');
                        if (novo !== null) atualizarItem(it.id, 'subgrupo', novo.trim());
                        return;
                      }
                      atualizarItem(it.id, 'subgrupo', e.target.value);
                    }}
                  >
                    <option value="">{maoDeObra ? '(sem subgrupo)' : '(sem categoria)'}</option>
                    {opcoesSubgrupo.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                    {it.subgrupo && !opcoesSubgrupo.includes(it.subgrupo) && (
                      <option value={it.subgrupo}>{it.subgrupo}</option>
                    )}
                    <option value="__novo__">{maoDeObra ? '+ novo subgrupo...' : '+ nova categoria...'}</option>
                  </Select>
                  {maoDeObra ? (
                    <Select value="" onChange={e => {
                      const [tipo, valor] = e.target.value.split('::');
                      if (tipo === 'cat') aplicarCategoriaMaoDeObra(it.id, valor);
                      else if (tipo === 'srv') aplicarServicoNoItem(it.id, valor);
                    }} title="Serviços da base única (padrão + já lançados em propostas), com o preço sugerido para o segmento do cliente">
                      <option value="">+ serviço</option>
                      <optgroup label="Categorias">
                        {CATEGORIAS_MAO_DE_OBRA.map(c => <option key={c} value={`cat::${c}`}>{c}</option>)}
                      </optgroup>
                      {gruposServicos.map(g => (
                        <optgroup key={g.disc} label={g.nome}>
                          {g.lista.map(s => {
                            const sug = sugestaoDoServico(s);
                            return <option key={s.codigo} value={`srv::${s.codigo}`}>{s.descricao}{sug != null ? ` — ${formatarMoeda(sug)}` : ''}</option>;
                          })}
                        </optgroup>
                      ))}
                    </Select>
                  ) : (
                    <Select value="" onChange={e => aplicarMaterialNoItem(it.id, e.target.value)}>
                      <option value="">{it.subgrupo ? `+ catálogo (${it.subgrupo})` : '+ catálogo'}</option>
                      {filtrarCatalogoPorCategoria(materiais, it.subgrupo).map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                    </Select>
                  )}
                  <div>
                    <input value={it.descricao} onChange={e => atualizarItem(it.id, 'descricao', e.target.value)} placeholder="Descrição do item" style={{ width: '100%' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => pesquisarMercado(it, maoDeObra)} disabled={pesquisa?.carregando}
                        title={maoDeObra ? 'Pesquisa o preço deste serviço no mercado (busca real na web; leva de 30 s a 1 min)' : 'Pesquisa o preço deste material no mercado (busca real na web; leva de 30 s a 1 min)'}
                        style={btnPesquisar}>
                        <Search size={10} style={{ marginRight: 3 }} /> {pesquisa?.carregando ? 'Pesquisando...' : 'Pesquisar mercado'}
                      </button>
                      {aCotar && <span style={{ ...etiqueta, color: '#c9a227', borderColor: '#5a4a12' }} title='Preço estimado ou pendente — confirme antes de enviar ao cliente'>a cotar</span>}
                      {semPreco && <span style={{ ...etiqueta, color: '#e08080', borderColor: '#5a2a2a' }} title="Item com valor unitário R$ 0,00">sem preço</span>}
                    </div>
                  </div>
                  {!maoDeObra && (
                    <input value={it.ncm} onChange={e => atualizarItem(it.id, 'ncm', e.target.value.replace(/[^\d.]/g, ''))} placeholder="NCM/SH" />
                  )}
                  <input type="number" step="1" min="0" value={it.quantidade} onChange={e => atualizarItem(it.id, 'quantidade', e.target.value)} />
                  <input value={it.unidade} onChange={e => atualizarItem(it.id, 'unidade', e.target.value)} />
                  {maoDeObra ? (
                    <div>
                      <CampoMoeda value={it.valor_unitario} onChange={v => atualizarItem(it.id, 'valor_unitario', v)} />
                      <DicasReferencia servico={servicoDoItem(it)} segmento={segmento} valor={it.valor_unitario}
                        onUsar={v => atualizarItem(it.id, 'valor_unitario', v)} />
                    </div>
                  ) : (
                    <div>
                      <CampoMoeda value={it.valor_unitario} onChange={v => atualizarItem(it.id, 'valor_unitario', v)} />
                      <DicaCatalogo material={it.material_id ? materiaisPorId[String(it.material_id)] : null} valor={it.valor_unitario}
                        onUsar={v => atualizarItem(it.id, 'valor_unitario', v)} />
                    </div>
                  )}
                  <span style={{ fontSize: 12, color: '#ccc', textAlign: 'right', paddingRight: 4 }}>
                    {formatarMoeda((Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0))}
                  </span>
                  <Select value={it.status || 'confirmado'} onChange={e => atualizarItem(it.id, 'status', e.target.value)}>
                    <option value="confirmado">Confirmado</option>
                    <option value="a_cotar">A cotar</option>
                  </Select>
                  <button onClick={() => removerItem(it.id)} style={{ ...btnIcone, color: '#b04040' }} title="Remover item">
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* key com a data: a pesquisa que chega salva (da análise) já nasce recolhida */}
                <BlocoPesquisaMercado key={`${it.id}_${pesquisa?.pesquisadoEm || ''}`} pesquisa={pesquisa} precoAtual={it.valor_unitario}
                  onUsarPreco={v => atualizarItem(it.id, 'valor_unitario', v)} />
                {pesquisa?.erro && <div style={{ marginTop: 6, fontSize: 12, color: '#b04040' }}>{pesquisa.erro}</div>}
                </div>
              );
            })}

            <button onClick={() => adicionarItem(sec.id)} style={{ ...btnSecundario, marginTop: 4 }}>
              <Plus size={13} style={{ marginRight: 4 }} /> Adicionar item
            </button>
          </div>
        );
      })}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <button onClick={adicionarSecao} style={btnSecundario}>
          <FolderPlus size={13} style={{ marginRight: 4 }} /> Adicionar seção
        </button>
        <InserirComposicao segmento={ehPublico ? 'publico' : 'privado'} onInserir={inserirItensDoKit} />
        <button type="button" onClick={() => setMostrarCurvaAbc(v => !v)} disabled={itens.length === 0}
          style={{ ...btnSecundario, ...(mostrarCurvaAbc ? { borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' } : {}) }}
          title="Itens do maior para o menor valor, com % do total, % acumulado e classe A/B/C">
          <BarChart3 size={13} style={{ marginRight: 4 }} /> {mostrarCurvaAbc ? 'Fechar curva ABC' : 'Curva ABC'}
        </button>
      </div>

      {mostrarCurvaAbc && itens.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: '#c9a227', fontSize: 13, marginBottom: 10 }}>Curva ABC da proposta</div>
          <CurvaAbcPainel itens={itensCurvaAbc} />
        </div>
      )}

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
              <label style={rotulo}>{temBdiMateriais(form.bdi_materiais) ? 'BDI mão de obra (%)' : 'BDI (%)'}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" step="0.01" min="0" value={form.bdi} onChange={e => setForm({ ...form, bdi: e.target.value })} style={{ width: 80 }} />
                <button type="button" onClick={() => setCalculadoraBdiAberta(true)}
                  style={{ ...btnSecundario, padding: '4px 8px', fontSize: 11, ...(ehPublico && !memoriaBdi ? { borderStyle: 'solid', borderColor: '#c9a227', color: '#c9a227' } : {}) }}
                  title="Calcular o BDI pela fórmula do TCU (Acórdão 2.622/2013) — tipo de obra, regime, parcelas e faixas de referência">
                  <Calculator size={12} style={{ marginRight: 3 }} /> TCU
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {formatarMoeda(temBdiMateriais(form.bdi_materiais) ? valorBdiMaoObra : valorBdi)}
                {memoriaBdi && (
                  <span title={`Composição pelo TCU guardada na proposta (${memoriaBdi.regime === 'desonerado' ? 'desonerado' : 'não desonerado'})`} style={{ color: '#8a7333' }}>
                    {' '}· composição <button type="button" onClick={removerComposicaoBdi} style={btnUsar} title="Remover a composição do BDI">remover</button>
                  </span>
                )}
              </div>
            </div>
            {form.bdi_materiais != null && (
              <div>
                <label style={rotulo} title="BDI diferenciado (reduzido) para o fornecimento de materiais — Acórdão 2.622/2013-TCU. Vazio = o mesmo BDI para tudo.">BDI materiais (%)</label>
                <input type="number" step="0.01" min="0" value={form.bdi_materiais} onChange={e => setForm({ ...form, bdi_materiais: e.target.value })} style={{ width: 80 }} />
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{formatarMoeda(valorBdiMateriais)}</div>
              </div>
            )}
            <div>
              <label style={rotulo} title="Multiplica o valor unitário de cada item de Materiais por esse percentual. (+) aumenta, (-) desconta. Roda na hora, ao clicar em Aplicar — não recalcula sozinho depois.">Reajuste Materiais (%)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" step="0.1" value={ajusteMateriaisInput} onChange={e => setAjusteMateriaisInput(e.target.value)} placeholder="+10 / -10" style={{ width: 70 }} />
                <button
                  type="button"
                  onClick={() => { aplicarAjustePercentual('materiais', ajusteMateriaisInput); setAjusteMateriaisInput(''); }}
                  style={{ ...btnSecundario, padding: '4px 8px', fontSize: 11 }}
                >
                  Aplicar
                </button>
              </div>
              {form.desconto_materiais_pct < 0 && (
                <div style={{ fontSize: 10.5, color: '#e08080', marginTop: 4 }}>Desconto de {Math.abs(form.desconto_materiais_pct)}% já aplicado</div>
              )}
            </div>
            <div>
              <label style={rotulo} title="Multiplica o valor unitário de cada item de Mão de Obra por esse percentual. (+) aumenta, (-) desconta. Roda na hora, ao clicar em Aplicar — não recalcula sozinho depois.">Reajuste Mão de Obra (%)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" step="0.1" value={ajusteMaoDeObraInput} onChange={e => setAjusteMaoDeObraInput(e.target.value)} placeholder="+10 / -10" style={{ width: 70 }} />
                <button
                  type="button"
                  onClick={() => { aplicarAjustePercentual('maoDeObra', ajusteMaoDeObraInput); setAjusteMaoDeObraInput(''); }}
                  style={{ ...btnSecundario, padding: '4px 8px', fontSize: 11 }}
                >
                  Aplicar
                </button>
              </div>
              {form.desconto_mao_obra_pct < 0 && (
                <div style={{ fontSize: 10.5, color: '#e08080', marginTop: 4 }}>Desconto de {Math.abs(form.desconto_mao_obra_pct)}% já aplicado</div>
              )}
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
              {/* anexos opcionais do PDF (Fase 3F) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5, color: '#888' }} title="Anexos no fim do PDF da proposta">
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={anexosPdf.curva_abc} onChange={e => setAnexosPdf(a => ({ ...a, curva_abc: e.target.checked }))} style={{ width: 'auto' }} />
                  anexo curva ABC
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title={memoriaBdi ? 'Composição do BDI pela fórmula do TCU (exigida em proposta para órgão público)' : 'Sem composição calculada: o anexo mostra só o BDI adotado'}>
                  <input type="checkbox" checked={anexosPdf.composicao_bdi} onChange={e => setAnexosPdf(a => ({ ...a, composicao_bdi: e.target.checked }))} style={{ width: 'auto' }} />
                  anexo composição do BDI
                </label>
              </div>
              <button onClick={baixarPlanilha} disabled={gerandoPlanilha || alteracoesPendentes} style={btnSecundario}
                title={alteracoesPendentes ? 'Salve as alterações antes de gerar a planilha' : 'Planilha para o cliente: orçamento, resumo, pesquisa de preços, fornecedores e cronograma'}>
                <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPlanilha ? 'Gerando...' : 'Planilha Excel'}
              </button>
              <button onClick={() => setModalEmail(true)} disabled={alteracoesPendentes} style={btnSecundario}
                title={alteracoesPendentes ? 'Salve as alterações antes de enviar' : ''}>
                <Send size={13} style={{ marginRight: 4 }} /> Enviar E-mail
              </button>
              <BotaoLinkAprovacao propostaId={propostaSalva.id} numero={propostaSalva.numero}
                status={propostaSalva.status} onAlterado={atualizarStatusSalvo} />
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

// Referências do serviço do item, como na Análise de Projeto: "Ref." é o valor
// H&M adotado (tela Preços de Mão de Obra) e oficial / particular são as
// referências de mercado; só aparecem quando diferem do valor da linha, e a do
// segmento do cliente vem destacada. "usar" troca o valor unitário.
function DicasReferencia({ servico, segmento, valor, onUsar }) {
  if (!servico) return null;
  const dicas = [
    ['hm', servico.valor_referencia, 'valor adotado pela H&M (tela Preços de Mão de Obra)'],
    ['publico', servico.valor_publico, servico.fonte_publico],
    ['privado', servico.valor_privado, servico.fonte_privado],
  ].filter(([, v]) => v != null && Number(v) !== Number(valor || 0));
  if (!dicas.length) return null;
  return dicas.map(([seg, v, fonte]) => (
    <div key={seg} style={{ fontSize: 10.5, color: seg === 'hm' || seg === segmento ? '#8a7333' : '#6f7f8f', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={seg === 'hm' ? `Referência: ${fonte}` : `Referência ${ROTULO_SEGMENTO[seg]}${seg === segmento ? ' (segmento do cliente)' : ''}${fonte ? ` — ${fonte}` : ''}`}>
      {seg === 'hm' ? 'Ref.' : seg === 'publico' ? 'oficial' : 'particular'}: {formatarMoeda(v)}{' '}
      <button type="button" onClick={() => onUsar(Number(v))} style={btnUsar}>usar</button>
    </div>
  ));
}

// Preço do material no catálogo, quando o item está ligado a ele e o valor da
// linha é outro (pesquisa de mercado adotada, reajuste, digitado à mão).
function DicaCatalogo({ material, valor, onUsar }) {
  if (!material || material.preco == null || !(Number(material.preco) > 0) || Number(material.preco) === Number(valor || 0)) return null;
  return (
    <div style={{ fontSize: 10.5, color: '#8a7333', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={`Preço do catálogo de materiais — ${material.descricao}`}>
      catálogo: {formatarMoeda(material.preco)}{' '}
      <button type="button" onClick={() => onUsar(Number(material.preco))} style={btnUsar}>usar</button>
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

const btnUsar = { background: 'none', border: 'none', color: '#c9a227', textDecoration: 'underline', cursor: 'pointer', fontSize: 10.5, padding: 0 };
const btnPesquisar = {
  display: 'inline-flex', alignItems: 'center', padding: '2px 7px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 5, color: '#999', fontWeight: 700, fontSize: 10.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const etiqueta = { fontSize: 10, border: '1px solid', borderRadius: 4, padding: '0 5px', textTransform: 'uppercase', letterSpacing: '.4px' };

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
