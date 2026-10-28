import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PainelPasta from '../components/PainelPasta';
import { FileDown, Plus, Trash2, FolderSearch, FilePlus2, Receipt, ExternalLink, DraftingCompass } from 'lucide-react';
import {
  analisarProjetoNaObra, gerarRelatorioCompatibilizacao,
  getAnalisesProjeto, getAnaliseProjeto, atualizarAnaliseProjeto, removerAnaliseProjeto,
  gerarOrcamentoDaAnalise, getPastaAnalise, abrirPastaAnalise, getDisciplinasProjeto, criarProjetoDeAnalise,
} from '../services/api';
import { formatarMoeda } from '../utils/format';
import BlocoPesquisaMercado from '../components/PesquisaMercado';
import ObraSelect from '../components/ObraSelect';
import Select from '../components/Select';
import { CartaoModelo3dAnalise } from '../components/Modelo3d';

let contador = 0;
const gerarId = () => `tmp_${Date.now()}_${contador++}`;

// Finalidade da análise (versão 2.1 — análise ≠ laudo). Escolhida ao enviar e
// editável depois; nenhuma das duas cria laudo (laudo é pedido quando
// necessário, em Obras › Laudos). Ordem A–Z nas listas.
const FINALIDADES = [
  { valor: 'elaboracao', rotulo: 'Elaboração de projeto', descricao: 'A H&M vai DEFINIR e ENTREGAR o projeto a partir do arquitetônico recebido: projeto por disciplina com definições técnicas, as-built, DXF, QElectroTech e PDF.' },
  { valor: 'orcamento', rotulo: 'Orçamento', descricao: 'Orçar a partir do projeto recebido: itens extraídos do PDF e "Gerar orçamento e abrir no editor".' },
];
const rotuloFinalidade = (v) => FINALIDADES.find(f => f.valor === v)?.rotulo || 'Orçamento';

// As disciplinas vêm do servidor (GET /projetos/disciplinas — fonte única em
// backend/src/utils/disciplinasProjeto.js): cada área de atuação é uma
// disciplina separada, e a lista cresce junto com as skills.

// Agrupa itens por subgrupo (na ordem em que aparecem, sem reordenar) —
// mesma ideia do agrupamento por subgrupo já usado no Orçamento.
function agruparPorSubgrupo(itens) {
  const linhas = [];
  let ultimo = null;
  for (const it of itens) {
    const sg = (it.subgrupo || '').trim() || null;
    if (sg !== ultimo) {
      if (sg) linhas.push({ tipo: 'cabecalho', nome: sg, key: `cab_${it.id}` });
      ultimo = sg;
    }
    linhas.push({ tipo: 'item', item: it });
  }
  return linhas;
}

function formatarHora(data) {
  return data ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Análise de projeto (PDF): compatibilização de projetos em PDF. Na versão
// 2.0 vira a aba "Análise de projeto" do hub Obras (pages/hubs/ObrasHub.js).
// Versão 2.1: a análise tem FINALIDADE — "Orçamento" (itens + gerar orçamento)
// ou "Elaboração de projeto" (elaborar o projeto de cada disciplina e
// entregar). Em nenhuma das duas sai laudo: o antigo "Calcular pela norma"
// cria um PROJETO da disciplina (aba "Projetos por disciplina").
export default function Compatibilizacao() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const [DISCIPLINAS, setDisciplinasLista] = useState([]);
  useEffect(() => {
    getDisciplinasProjeto()
      .then(r => setDisciplinasLista(r.data))
      .catch(() => toast.error('Não foi possível carregar a lista de disciplinas'));
  }, []);
  // agrupadas para a tela (Elétrica, Energia, Proteção, Telecom, Segurança, Automação)
  // grupos na ordem da fonte única; dentro de cada grupo, A–Z (regra do usuário: listas sempre em ordem alfabética)
  const gruposDisciplinas = DISCIPLINAS.reduce((acc, d) => {
    (acc[d.grupo] = acc[d.grupo] || []).push(d);
    return acc;
  }, {});
  Object.values(gruposDisciplinas).forEach(lista => lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true })));

  // Cada arquivo escolhido carrega sua PRÓPRIA lista de disciplinas — não uma
  // lista única pro lote inteiro. Isso evita que, por exemplo, um arquivo de
  // iluminação enviado junto com arquivos de CFTV/rede contamine a contagem
  // de câmeras/pontos de rede (só arquivos marcados com aquela disciplina
  // entram na soma). [{ id, arquivo: File, disciplinas: string[] }]
  const [arquivosComDisciplinas, setArquivosComDisciplinas] = useState([]);
  const [nomeProjetoNovo, setNomeProjetoNovo] = useState(''); // nome da pasta do projeto em Arquivos do Sistema
  const [finalidadeNova, setFinalidadeNova] = useState(''); // 'orcamento' | 'elaboracao' — escolha obrigatória ao enviar
  // obra da análise nova (2.0): vem pré-selecionada de /obras?aba=analise&obra=ID
  // e vai no multipart (obra_id) — a pasta passa a morar dentro da obra
  const [busca] = useSearchParams();
  const obraDaUrl = Number(busca.get('obra')) || null;
  const [obraNova, setObraNova] = useState(obraDaUrl);
  useEffect(() => { if (obraDaUrl) setObraNova(obraDaUrl); }, [obraDaUrl]);
  const [analisando, setAnalisando] = useState(false);
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [gerandoOrcamento, setGerandoOrcamento] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const [analisesSalvas, setAnalisesSalvas] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const inputRef = useRef(null);
  const idAutosaveRef = useRef(null);
  const pendenteRef = useRef(false); // há edição aguardando o autosave disparar
  // Versão gravada no servidor (bloqueio otimista). Em ref, não em estado:
  // mudar a versão não pode disparar outro autosave.
  const versaoRef = useRef(null);
  const filaSalvarRef = useRef(Promise.resolve()); // gravações em sequência, cada uma com a versão da anterior
  const conflitoRef = useRef(false); // outra pessoa gravou: para o autosave até recarregar

  const carregarListaSalvas = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const res = await getAnalisesProjeto({ porPagina: 20 });
      setAnalisesSalvas(res.data.itens);
    } catch {
      // lista salva é conveniência — não bloqueia a tela principal se falhar
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  useEffect(() => { carregarListaSalvas(); }, [carregarListaSalvas]);

  const popularAnalise = useCallback((dados) => {
    const servicosComId = dados.servicos.map(s => ({ ...s, id: gerarId() }));
    const materiaisComId = dados.materiais.map(m => ({ ...m, id: gerarId() }));
    setAnalise({
      ...dados,
      servicos: servicosComId,
      materiais: materiaisComId,
    });
    versaoRef.current = dados.versao ?? null;
    conflitoRef.current = false;
    setSalvoEm(dados.atualizadoEm ? new Date(dados.atualizadoEm) : null);
    // A pesquisa de mercado que já tinha ficado salva num item
    // (pesquisa_mercado, de antes do editor único) continua aparecendo aqui,
    // recolhida e só como informação (ver TabelaItensLeitura); o editor da
    // proposta também a reaproveita.
  }, []);

  useEffect(() => {
    if (!idParam) {
      setAnalise(null);
      return;
    }
    setCarregandoAnalise(true);
    getAnaliseProjeto(idParam)
      .then(res => popularAnalise(res.data))
      .catch(() => {
        toast.error('Análise não encontrada');
        navigate('/obras');
      })
      .finally(() => setCarregandoAnalise(false));
  }, [idParam, navigate, popularAnalise]);

  function selecionarArquivos(e) {
    const lista = Array.from(e.target.files || []);
    setArquivosComDisciplinas(lista.map(arquivo => ({ id: gerarId(), arquivo, disciplinas: [] })));
  }

  function alternarDisciplinaDoArquivo(itemId, chave) {
    setArquivosComDisciplinas(lista => lista.map(it => it.id !== itemId ? it : {
      ...it,
      disciplinas: it.disciplinas.includes(chave) ? it.disciplinas.filter(c => c !== chave) : [...it.disciplinas, chave],
    }));
  }

  async function analisar() {
    if (arquivosComDisciplinas.length === 0) {
      toast.error('Selecione ao menos um PDF do projeto');
      return;
    }
    if (arquivosComDisciplinas.some(it => it.disciplinas.length === 0)) {
      toast.error('Marque ao menos uma disciplina pra cada arquivo enviado');
      return;
    }
    if (!finalidadeNova) {
      toast.error('Escolha a finalidade da análise: Orçamento ou Elaboração de projeto');
      return;
    }
    setAnalisando(true);
    try {
      const res = await analisarProjetoNaObra(arquivosComDisciplinas, nomeProjetoNovo.trim(), obraNova, finalidadeNova);
      setNomeProjetoNovo('');
      setFinalidadeNova('');
      popularAnalise(res.data);
      navigate(`/obras/analise/${res.data.id}`);
      toast.success(`Projeto analisado: ${res.data.ambientes.length} ambientes, ${res.data.cameras.total} câmeras`);
      carregarListaSalvas();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao analisar o projeto');
    } finally {
      setAnalisando(false);
    }
  }

  function novaAnalise() {
    navigate('/obras');
    setArquivosComDisciplinas([]);
    setSalvoEm(null);
  }

  function abrirAnaliseSalva(item) {
    navigate(`/obras/analise/${item.id}`);
  }

  async function excluirAnaliseSalva(item) {
    if (!window.confirm(`Excluir a análise de "${item.cliente_nome || 'projeto sem cliente'}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await removerAnaliseProjeto(item.id);
      toast.success('Análise excluída');
      carregarListaSalvas();
      if (String(analise?.id) === String(item.id)) novaAnalise();
    } catch {
      toast.error('Erro ao excluir análise');
    }
  }

  // Salva automaticamente as edições (cliente, serviços, materiais) — é
  // exatamente o que resolve a análise sumir ao trocar de tela: a partir do
  // momento em que existe um id (a análise já foi persistida), toda edição
  // vira uma gravação no banco, não só um estado do React.
  const salvarAgora = useCallback(() => {
    if (!analise?.id || conflitoRef.current) return Promise.resolve();
    const id = analise.id;
    const corpo = {
      cliente_nome: analise.cliente,
      nome_projeto: analise.nomeProjeto ?? '',
      servicos: analise.servicos.map(({ id: _id, ...s }) => s),
      materiais: analise.materiais.map(({ id: _id, ...m }) => m),
      funcionamento: analise.funcionamento ?? '',
      pontos_por_disciplina: analise.pontosPorDisciplina ?? [],
      finalidade: analise.finalidade || 'orcamento',
    };
    // em fila: duas gravações ao mesmo tempo mandariam a mesma versão e a
    // segunda seria recusada como conflito (falso alarme)
    filaSalvarRef.current = filaSalvarRef.current.then(async () => {
      if (conflitoRef.current) return;
      setSalvando(true);
      try {
        const res = await atualizarAnaliseProjeto(id, { ...corpo, versao: versaoRef.current });
        versaoRef.current = res.data?.versao ?? null;
        setSalvoEm(new Date());
      } catch (err) {
        if (err.response?.status === 409) {
          conflitoRef.current = true;
          toast.error(err.response.data?.erro || 'A análise foi alterada em outro lugar. Recarregue a página.', { duration: 15000 });
        } else if (err.response?.status === 403 && err.response?.data?.codigo !== 'SENHA_PROVISORIA') {
          // análise de outro usuário (posse): não desloga mais; para o
          // salvamento automático e diz por quê
          conflitoRef.current = true;
          toast.error(`${err.response.data?.erro || 'Você não pode alterar esta análise.'} As alterações feitas aqui não são gravadas.`, { duration: 15000 });
        } else if (!err.sessaoEncerrada) {
          toast.error(err.response?.data?.erro || 'Erro ao salvar automaticamente — tente novamente em instantes');
        }
      } finally {
        setSalvando(false);
      }
    });
    return filaSalvarRef.current;
  }, [analise?.id, analise?.cliente, analise?.nomeProjeto, analise?.servicos, analise?.materiais, analise?.funcionamento, analise?.pontosPorDisciplina, analise?.finalidade]);

  // Reseta o "já assentou" toda vez que o id muda (nova análise carregada) —
  // assim a primeira renderização de cada análise não dispara um autosave à toa.
  useEffect(() => { idAutosaveRef.current = null; }, [analise?.id]);

  // Mantém a última versão da função de salvar acessível ao efeito de saída
  // abaixo, sem reativar o debounce a cada digitada.
  const salvarAgoraRef = useRef(salvarAgora);
  useEffect(() => { salvarAgoraRef.current = salvarAgora; }, [salvarAgora]);

  useEffect(() => {
    if (!analise?.id) return;
    if (idAutosaveRef.current !== analise.id) {
      idAutosaveRef.current = analise.id;
      return;
    }
    pendenteRef.current = true;
    const timer = setTimeout(() => { pendenteRef.current = false; salvarAgora(); }, 1500);
    return () => clearTimeout(timer);
  }, [analise?.servicos, analise?.materiais, analise?.cliente, analise?.nomeProjeto, analise?.funcionamento, analise?.pontosPorDisciplina, analise?.finalidade]);

  // Salva o que ficou pendente ao sair da tela. O efeito acima cancela o timer
  // quando o componente desmonta, então quem editasse e trocasse de tela em
  // menos de 1,5s perdia a última alteração — justamente no recurso feito para
  // nada se perder. Deps vazias: este cleanup só roda na saída, não a cada
  // digitada.
  useEffect(() => () => {
    if (pendenteRef.current) salvarAgoraRef.current?.();
  }, []);

  function atualizarCliente(valor) {
    setAnalise(a => ({ ...a, cliente: valor }));
  }

  const carregarPasta = useCallback(() => getPastaAnalise(analise.id), [analise?.id]);
  const abrirPasta = useCallback(() => abrirPastaAnalise(analise.id), [analise?.id]);

  function atualizarNomeProjeto(valor) {
    setAnalise(a => ({ ...a, nomeProjeto: valor }));
  }

  // Versão 2.0 (editor único de orçamento): os itens extraídos do PDF ficam em
  // LEITURA aqui — quantidade, preço, pesquisa de mercado e referências são
  // revisados no editor da proposta. Da análise sobra só o "Já pronto"
  // (o que já existe na obra e sai do escopo), que também vale para o
  // relatório de compatibilização.
  function alternarPronto(lista, id, pronto) {
    setAnalise(a => ({ ...a, [lista]: a[lista].map(x => x.id === id ? { ...x, pronto } : x) }));
  }

  // ── Enriquecimento (Claude Desktop): funcionamento + pontos por disciplina ──
  // Campos ADICIONAIS, editáveis, salvos pelo mesmo autosave. Os pontos por
  // disciplina só aparecem/são editados para as disciplinas SELECIONADAS na
  // análise (é o que evita sair caçando disciplina que não foi escolhida).
  function atualizarFuncionamento(valor) {
    setAnalise(a => ({ ...a, funcionamento: valor }));
  }

  function atualizarPontoDisciplina(disciplina, idx, campo, valor) {
    setAnalise(a => ({
      ...a,
      pontosPorDisciplina: (a.pontosPorDisciplina || []).map(g =>
        g.disciplina !== disciplina ? g : { ...g, itens: g.itens.map((it, i) => i === idx ? { ...it, [campo]: valor } : it) }
      ),
    }));
  }

  function removerPontoDisciplina(disciplina, idx) {
    setAnalise(a => ({
      ...a,
      pontosPorDisciplina: (a.pontosPorDisciplina || []).map(g =>
        g.disciplina !== disciplina ? g : { ...g, itens: g.itens.filter((_, i) => i !== idx) }
      ),
    }));
  }

  function adicionarPontoDisciplina(disciplina) {
    setAnalise(a => {
      const lista = a.pontosPorDisciplina || [];
      const novoItem = { descricao: '', tipo: '', modelo: '', quantidade: 0, observacao: '' };
      if (lista.some(g => g.disciplina === disciplina)) {
        return { ...a, pontosPorDisciplina: lista.map(g => g.disciplina === disciplina ? { ...g, itens: [...g.itens, novoItem] } : g) };
      }
      return { ...a, pontosPorDisciplina: [...lista, { disciplina, itens: [novoItem] }] };
    });
  }

  async function baixarRelatorio() {
    setGerando(true);
    try {
      await salvarAgora(); // garante que o PDF reflete a última edição, não uma versão atrasada
      const res = await gerarRelatorioCompatibilizacao(analise.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const nomeCliente = (analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      link.download = `Compatibilizacao_${nomeCliente}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  }

  // Cria (ou atualiza, se já existir) a proposta rascunho a partir dos
  // serviços/materiais SALVOS desta análise (o backend lê o banco, não a tela)
  // e abre o editor único de orçamento — é lá que quantidades, preços,
  // pesquisa de mercado, BDI e impostos são revisados. Nunca automático: só
  // pelo botão, pra não encher a lista de propostas a cada gravação.
  // Atualizar SUBSTITUI os itens da proposta vinculada (enquanto "Ativa") pelos
  // da análise — por isso pede confirmação: o que foi ajustado no editor se perde.
  async function gerarOrcamento() {
    if (analise.propostaNumero && !window.confirm(
      `Atualizar o orçamento ${analise.propostaNumero} com os itens desta análise?\n\n` +
      'Os itens da proposta serão SUBSTITUÍDOS pelos da análise — quantidades e preços ajustados no editor se perdem ' +
      '(BDI e impostos ficam). Se a proposta já foi aprovada ou recusada, é criada uma nova.\n\n' +
      'Para só continuar a revisão, use "Abrir no editor".'
    )) return;
    setGerandoOrcamento(true);
    try {
      await salvarAgora(); // o orçamento tem que refletir a última edição, não uma versão atrasada
      const res = await gerarOrcamentoDaAnalise(analise.id);
      const { propostaId, numero, criada, semQuantidade } = res.data;
      setAnalise(a => ({ ...a, propostaId, propostaNumero: numero }));
      toast.success(criada ? `Orçamento ${numero} criado a partir desta análise` : `Orçamento ${numero} atualizado com os itens desta análise`, {
        duration: 6000,
        icon: criada ? '🧾' : '🔄',
      });
      // a mensagem do servidor manda "preencher na análise", que não edita mais quantidade
      if (semQuantidade) {
        toast(`${semQuantidade} item(ns) com quantidade 0 ficaram fora do rascunho — o editor lista esses itens para incluir com a quantidade certa.`, { duration: 10000, icon: '⚠️' });
      }
      navigate(`/propostas/editar/${propostaId}`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar orçamento');
    } finally {
      setGerandoOrcamento(false);
    }
  }

  // Cria o PROJETO da disciplina a partir desta análise (nunca laudo) e abre
  // na aba "Projetos por disciplina" (o aviso lista o que foi estimado e
  // precisa conferir). Se a análise já tem o projeto da disciplina, abre o existente.
  const [criandoProjeto, setCriandoProjeto] = useState('');
  async function elaborarProjeto(d) {
    const existente = (analise.projetos || []).find(p => p.disciplina === d.skill && p.tipo === 'projeto');
    if (existente) { navigate(`/obras?aba=projetos&laudo=${existente.id}`); return; }
    setCriandoProjeto(d.skill);
    try {
      await salvarAgora();
      const r = await criarProjetoDeAnalise(analise.id, d.skill);
      (r.data.avisos || []).forEach(a => toast(a, { duration: 12000, icon: /\[CONFERIR\]/.test(a) ? '⚠️' : 'ℹ️' }));
      navigate(`/obras?aba=projetos&laudo=${r.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao preparar o projeto');
    } finally {
      setCriandoProjeto('');
    }
  }

  function alterarFinalidade(valor) {
    setAnalise(a => ({ ...a, finalidade: valor }));
  }

  // O rótulo traz o prefixo do código (CAMx/Rx/Ax) pra nunca deixar ambíguo
  // qual tipo de ponto está sendo contado — "Ambientes" (salas/áreas, sem
  // relação nenhuma com esses códigos) aparece à parte, com o mesmo cuidado.
  const tilesResumo = analise ? [
    { label: 'Ambientes (salas/áreas)', valor: analise.ambientes.length },
    ...(analise.disciplinas?.includes('cftv') ? [{ label: 'Câmeras — código CAMnº', valor: analise.cameras.total }] : []),
    ...(analise.disciplinas?.includes('rede') ? [{ label: 'Pontos de rede — código Rnº', valor: analise.pontosRedeAntena?.rede?.total ?? 0 }] : []),
    ...(analise.disciplinas?.includes('antena') ? [{ label: 'Pontos de TV/antena — código Anº', valor: analise.pontosRedeAntena?.antena?.total ?? 0 }] : []),
    { label: 'Pendências', valor: analise.achados.length },
  ] : [];

  // Estimativa pelo que foi extraído — mesmo cálculo do resumo "Orçamento
  // Geral" do relatório PDF (calcularResumo em relatorioCompatibilizacaoTemplate.js).
  // Só informação: o valor que vale é o da proposta, revisada no editor.
  const resumoOrcamento = analise ? (() => {
    const blocoMaoDeObra = analise.servicos.filter(s => !s.pronto)
      .reduce((soma, s) => soma + (Number(s.quantidade) || 0) * (Number(s.valor_unitario) || 0), 0);
    const blocoMateriais = analise.materiais.filter(m => !m.pronto)
      .reduce((soma, m) => soma + (Number(m.quantidade) || 0) * (Number(m.preco_catalogo) || 0), 0);
    return { blocoMaoDeObra, blocoMateriais, total: blocoMaoDeObra + blocoMateriais };
  })() : null;
  // itens que o "Gerar orçamento" deixa de fora (quantidade 0, fora do "Já pronto")
  const foraPorQuantidade = analise
    ? [...analise.servicos, ...analise.materiais].filter(x => !x.pronto && !(Number(x.quantidade) > 0)).length
    : 0;
  const abrirNoEditor = () => navigate(`/propostas/editar/${analise.propostaId}`);

  // Finalidade (2.1) e as disciplinas da análise que têm skill (podem virar projeto)
  const elaboracao = analise?.finalidade === 'elaboracao';
  const disciplinasComSkill = analise ? [...new Map(DISCIPLINAS
    .filter(d => d.skill && (analise.disciplinas || []).includes(d.chave))
    .map(d => [d.skill, d])).values()] : [];
  const projetoDa = (skill) => (analise?.projetos || []).find(p => p.disciplina === skill && p.tipo === 'projeto');

  // Cartão "Elaborar projeto por disciplina" (foco na Elaboração de projeto) ou
  // "Dimensionar pela norma (projeto)" (opção secundária no Orçamento)
  const cartaoProjetos = (principal) => (
    <div style={{ ...card, ...(principal ? { borderColor: '#2f4f6f' } : {}) }} data-testid="cartao-projetos">
      <h3 style={{ ...tituloSecao, color: principal ? '#8ab4f8' : '#c9a227', display: 'flex', alignItems: 'center', gap: 8 }}>
        <DraftingCompass size={16} /> {principal ? 'Elaborar projeto por disciplina' : 'Dimensionar pela norma (projeto) — opcional'}
      </h3>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
        {principal
          ? <>Cada disciplina vira um <b>projeto</b> (aba "Projetos por disciplina") já preenchido com o que foi lido deste PDF: calcule pela norma, gere o memorial e os desenhos e escolha as <b>entregas</b> — definições técnicas, as-built, DXF (abre no AutoCAD), QElectroTech e PDF. <b>Não gera laudo</b>: laudo é pedido quando necessário, em Obras › Laudos.</>
          : <>Cria o <b>projeto</b> da disciplina (não é laudo) já preenchido com o que foi lido deste PDF, para quantificar melhor pela norma e gerar o orçamento de execução lá. O que for estimado vem marcado para conferir.</>}
      </p>
      {disciplinasComSkill.length === 0 ? (
        <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic', margin: 0 }}>Nenhuma disciplina desta análise tem cálculo pela norma ainda.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {disciplinasComSkill.map(d => {
            const existente = projetoDa(d.skill);
            return (
              <button key={d.skill} onClick={() => elaborarProjeto(d)} disabled={!!criandoProjeto}
                style={{ ...btnSecundario, padding: '9px 14px', fontSize: 12, ...(existente ? { borderStyle: 'solid', borderColor: '#2f4f6f', color: '#8ab4f8' } : {}) }}
                title={existente ? `Abre o projeto #${existente.id} desta disciplina` : 'Cria o projeto da disciplina a partir desta análise'}>
                {criandoProjeto === d.skill ? 'Preparando...' : existente ? `Abrir projeto — ${d.nome}` : `${principal ? 'Elaborar projeto — ' : ''}${d.nome}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {analise && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={novaAnalise} style={btnSecundario}>
            <FilePlus2 size={13} style={{ marginRight: 5 }} /> Nova análise
          </button>
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Análises salvas</h3>
        </div>
        {carregandoLista ? (
          <p style={{ fontSize: 12, color: '#666' }}>Carregando...</p>
        ) : analisesSalvas.length === 0 ? (
          <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Nenhuma análise salva ainda.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px 8px 0' }}>Cliente</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Finalidade</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Disciplinas</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Atualizado em</th>
                <th style={{ padding: '4px 8px 8px 0' }}>Pendências</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {analisesSalvas.map(item => (
                <tr
                  key={item.id}
                  onClick={() => abrirAnaliseSalva(item)}
                  style={{
                    cursor: 'pointer', borderTop: '1px solid #1e1e1e',
                    background: String(analise?.id) === String(item.id) ? '#1a1a1a' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 8px 8px 0' }}>{item.cliente_nome || '—'}</td>
                  <td style={{ padding: '8px 8px 8px 0', color: item.finalidade === 'elaboracao' ? '#8ab4f8' : '#c9a227', whiteSpace: 'nowrap' }}>{rotuloFinalidade(item.finalidade)}</td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>
                    {(item.disciplinas || []).map(c => DISCIPLINAS.find(d => d.chave === c)?.nome || c).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>
                    {new Date(item.atualizado_em).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.total_achados ?? 0}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => excluirAnaliseSalva(item)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!analise && (
        <div style={card}>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 14, lineHeight: 1.6 }}>
            Envie os PDFs do projeto do cliente (plantas de CFTV, cabeamento estruturado, elétrica, iluminação
            etc.) e marque a disciplina de CADA arquivo — um projeto real costuma vir em várias plantas separadas
            (ex.: CFTV 1 + CFTV 2 do mesmo cliente), e cada uma pode ser de uma disciplina diferente. Arquivos da
            mesma disciplina continuam somando entre si (câmeras de CFTV 1 + CFTV 2, por exemplo); um arquivo de
            outra disciplina nunca entra na contagem que não é dele.
          </p>

          {/* Finalidade (2.1): obrigatória — define a tela da análise. Nenhuma gera laudo. */}
          <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Para que é esta análise?</div>
          <div role="radiogroup" aria-label="Finalidade da análise" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 8 }}>
            {[...FINALIDADES].reverse().map(f => {
              const marcada = finalidadeNova === f.valor;
              return (
                <label key={f.valor} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${marcada ? (f.valor === 'elaboracao' ? '#2f4f6f' : '#5a4a12') : '#2a2a2a'}`, background: marcada ? '#161616' : 'transparent' }}>
                  <input type="radio" name="finalidade" value={f.valor} checked={marcada} onChange={() => setFinalidadeNova(f.valor)} style={{ width: 'auto', marginTop: 3 }} />
                  <span>
                    <b style={{ fontSize: 13, color: marcada ? (f.valor === 'elaboracao' ? '#8ab4f8' : '#c9a227') : '#ccc' }}>{f.rotulo}</b>
                    <span style={{ display: 'block', fontSize: 12, color: '#888', lineHeight: 1.5, marginTop: 2 }}>{f.descricao}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: '0 0 14px' }}>
            Análise de projeto não gera laudo. Laudo (inspeção, vistoria, medição) é pedido quando necessário, em Obras › Laudos.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: arquivosComDisciplinas.length > 0 ? 18 : 0, flexWrap: 'wrap' }}>
            <input value={nomeProjetoNovo} onChange={e => setNomeProjetoNovo(e.target.value)} placeholder="Nome do projeto (nome da pasta; vazio = nome do cliente)" style={{ flex: '1 1 280px', maxWidth: 420 }} />
            <div style={{ flex: '1 1 320px', maxWidth: 480 }} title="Obra a que este projeto pertence (opcional) — a análise, a pasta e o orçamento gerado ficam ligados a ela">
              <ObraSelect value={obraNova} onChange={(id) => setObraNova(id)} rotuloVazio="Sem obra (opcional)" />
            </div>
            <input ref={inputRef} type="file" accept=".pdf" multiple onChange={selecionarArquivos} />
            <button onClick={analisar} disabled={analisando || arquivosComDisciplinas.length === 0} style={btnPrimario}>
              <FolderSearch size={13} style={{ marginRight: 6 }} /> {analisando ? 'Analisando...' : 'Analisar projeto'}
            </button>
          </div>

          {arquivosComDisciplinas.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                Disciplina de cada arquivo (marque pelo menos uma)
              </div>
              {arquivosComDisciplinas.map(it => (
                <div key={it.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #1e1e1e' }}>
                  <div style={{ fontSize: 13, color: '#c9a227', fontWeight: 700, marginBottom: 6 }}>{it.arquivo.name}</div>
                  {Object.entries(gruposDisciplinas).map(([grupo, lista]) => (
                    <div key={grupo} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#666', width: 76, textTransform: 'uppercase' }}>{grupo}</span>
                      {lista.map(d => (
                        <label key={d.chave} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: it.disciplinas.includes(d.chave) ? '#c9a227' : '#999', cursor: 'pointer' }}>
                          <input type="checkbox" checked={it.disciplinas.includes(d.chave)} onChange={() => alternarDisciplinaDoArquivo(it.id, d.chave)} />
                          {d.nome}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {carregandoAnalise && (
        <div style={card}><p style={{ fontSize: 13, color: '#777' }}>Carregando análise...</p></div>
      )}

      {analise && !carregandoAnalise && (
        <>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Nome do projeto (pasta)</div>
                <input value={analise.nomeProjeto || ''} onChange={e => atualizarNomeProjeto(e.target.value)} placeholder={analise.cliente || 'Nome do projeto'} style={{ fontSize: 15, fontWeight: 700, color: '#e8e8e8', background: 'transparent', border: 'none', padding: '2px 0' }} />
              </div>
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Cliente</div>
                <input value={analise.cliente || ''} onChange={e => atualizarCliente(e.target.value)} placeholder="Nome do cliente" style={{ fontSize: 15, fontWeight: 700, color: '#c9a227', background: 'transparent', border: 'none', padding: '2px 0' }} />
              </div>
              <div style={{ flex: '0 1 230px' }} title="Muda a tela desta análise: Orçamento (itens e gerar orçamento) ou Elaboração de projeto (projeto por disciplina e entregas). Nenhuma gera laudo.">
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Finalidade</div>
                <Select aria-label="Finalidade da análise" value={analise.finalidade || 'orcamento'} onChange={e => alterarFinalidade(e.target.value)}
                  style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: elaboracao ? '#8ab4f8' : '#c9a227', padding: '6px 8px', fontSize: 13, fontWeight: 700 }}>
                  {FINALIDADES.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
                </Select>
              </div>
              {analise.obra && (
                <div style={{ flex: '0 1 260px' }}>
                  <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Obra</div>
                  <div style={{ fontSize: 13, color: '#ccc' }}>{analise.obra.nome} <span style={{ color: '#777' }}>({analise.obra.codigo})</span></div>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#666' }}>
                {salvando ? 'Salvando...' : salvoEm ? `Salvo às ${formatarHora(salvoEm)}` : ''}
              </div>
            </div>
            <PainelPasta carregar={carregarPasta} abrir={abrirPasta} atualizarQuando={salvoEm} />
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tilesResumo.length}, 1fr)`, gap: 16 }}>
              {tilesResumo.map(t => <Info key={t.label} label={t.label} valor={t.valor} />)}
            </div>
          </div>

          {/* Elaboração de projeto: o foco é o projeto por disciplina e as entregas */}
          {elaboracao && cartaoProjetos(true)}

          {!elaboracao && <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Estimativa pelo que foi extraído</h3>
              {analise.propostaId && (
                <button onClick={abrirNoEditor} style={{ ...btnSecundario, padding: '6px 12px' }}>
                  <ExternalLink size={12} style={{ marginRight: 5 }} /> Orçamento {analise.propostaNumero} no editor
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <ResumoBloco rotulo="Bloco 1 — Mão de obra" valor={resumoOrcamento.blocoMaoDeObra} />
              <ResumoBloco rotulo="Bloco 2 — Materiais e equipamentos" valor={resumoOrcamento.blocoMateriais} />
              <ResumoBloco rotulo="Total estimado" valor={resumoOrcamento.total} destaque />
            </div>
            <p style={{ fontSize: 11, color: '#666', marginTop: 12, lineHeight: 1.5 }}>
              Só informação: soma dos itens não marcados "já pronto", com o valor sugerido pela análise (serviço sem
              referência ou material sem correspondência no catálogo entra como R$ 0,00). Quantidades, preços, pesquisa
              de mercado e referências são revisados no editor do orçamento — o valor que vale é o da proposta.
            </p>
          </div>}

          <div style={card}>
            <h3 style={tituloSecao}>Funcionamento do Projeto</h3>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
              Como o projeto opera — preenchido pela análise do Claude Desktop (visão do PDF) e editável aqui. Cobre só as disciplinas selecionadas.
            </p>
            <textarea
              value={analise.funcionamento || ''}
              onChange={(e) => atualizarFuncionamento(e.target.value)}
              placeholder="Ex.: CFTV com N câmeras gravando em NVR de X canais; rede com switch PoE alimentando as câmeras; elétrica com quadro dedicado alimentando os racks..."
              rows={5}
              style={{ width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', fontSize: 13, padding: 10, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {(analise.disciplinas?.includes('cftv') || analise.disciplinas?.includes('rede') || analise.disciplinas?.includes('antena')) && (
            <div style={card}>
              <h3 style={tituloSecao}>Pontos Identificados no Projeto</h3>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
                Cada ponto abaixo é identificado na planta por um código individual. "Ocorrências" é quantas vezes o
                código aparece no texto do PDF; "Pontos únicos" é a quantidade real de pontos físicos distintos — é
                esse o número usado no orçamento.
              </p>
              {analise.disciplinas.includes('cftv') && (
                <TabelaPontos titulo="Câmeras" prefixo="CAM" detalhe={analise.cameras?.detalhePorArquivo} />
              )}
              {analise.disciplinas.includes('rede') && (
                <TabelaPontos titulo="Pontos de rede" prefixo="R" detalhe={analise.pontosRedeAntena?.rede?.detalhePorArquivo} />
              )}
              {analise.disciplinas.includes('antena') && (
                <TabelaPontos titulo="Pontos de TV/antena" prefixo="A" detalhe={analise.pontosRedeAntena?.antena?.detalhePorArquivo} />
              )}

              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #1e1e1e' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 6 }}>Pontos por Ambiente</div>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.6 }}>
                  Distribuição <b>aproximada</b> — calculada pela posição de cada código no desenho, sem noção de
                  parede ou fronteira entre salas. Confira sempre contra a planta antes de usar. Só aparece ambiente
                  com pelo menos 1 ponto identificado.
                </p>
                <TabelaPontosPorAmbiente linhas={analise.pontosPorAmbiente} disciplinas={analise.disciplinas} />
              </div>
            </div>
          )}

          <div style={card}>
            <h3 style={tituloSecao}>Pontos por Disciplina</h3>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
              Marcação por disciplina com tipo, modelo e quantidade — preenchida pela análise do Claude Desktop (inclusive elétrica, iluminação e outras que a contagem por código não alcança) e editável aqui. Só aparecem as disciplinas selecionadas na análise; sempre confira contra a planta.
            </p>
            {(analise.disciplinas || []).length === 0 && (
              <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic', margin: 0 }}>Nenhuma disciplina selecionada nesta análise.</p>
            )}
            {(analise.disciplinas || []).map(disc => {
              const grupo = (analise.pontosPorDisciplina || []).find(g => g.disciplina === disc);
              const itens = grupo?.itens || [];
              const nomeDisc = DISCIPLINAS.find(d => d.chave === disc)?.nome || disc;
              return (
                <div key={disc} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #1e1e1e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#c9a227' }}>{nomeDisc}</div>
                    <button type="button" onClick={() => adicionarPontoDisciplina(disc)} style={{ ...btnSecundario, padding: '3px 8px', fontSize: 11 }}>
                      <Plus size={11} style={{ marginRight: 3 }} /> Adicionar ponto
                    </button>
                  </div>
                  {itens.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic', margin: 0 }}>Nenhum ponto marcado ainda para esta disciplina.</p>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.4fr 0.7fr 1.6fr 28px', gap: 8, fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                        <span>Descrição</span><span>Tipo</span><span>Modelo</span><span>Qtd</span><span>Observação</span><span />
                      </div>
                      {itens.map((it, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.4fr 0.7fr 1.6fr 28px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                          <input value={it.descricao || ''} onChange={(e) => atualizarPontoDisciplina(disc, idx, 'descricao', e.target.value)} style={inputPonto} />
                          <input value={it.tipo || ''} onChange={(e) => atualizarPontoDisciplina(disc, idx, 'tipo', e.target.value)} style={inputPonto} />
                          <input value={it.modelo || ''} onChange={(e) => atualizarPontoDisciplina(disc, idx, 'modelo', e.target.value)} style={inputPonto} />
                          <input type="number" min="0" value={it.quantidade ?? 0} onChange={(e) => atualizarPontoDisciplina(disc, idx, 'quantidade', e.target.value === '' ? 0 : Number(e.target.value))} style={{ ...inputPonto, textAlign: 'right' }} />
                          <input value={it.observacao || ''} onChange={(e) => atualizarPontoDisciplina(disc, idx, 'observacao', e.target.value)} style={inputPonto} />
                          <button type="button" onClick={() => removerPontoDisciplina(disc, idx)} title="Remover ponto" style={{ background: 'none', border: 'none', color: '#8a4040', cursor: 'pointer', padding: 0 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {analise.achados.length > 0 && (
            <div style={card}>
              <h3 style={tituloSecao}>Compatibilização — Pendências e Observações</h3>
              {analise.achados.map((a, i) => (
                <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 3 }}>{a.tema}</div>
                  <div style={{ fontSize: 13, color: '#999' }}>{a.observacao}</div>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const tabelas = (
              <>
                <div style={card}>
                  <h3 style={tituloSecao}>Serviços (Mão de Obra) — extraídos do projeto</h3>
                  <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
                    Leitura do que a análise montou a partir do PDF. Quantidade, preço, pesquisa de mercado e referências são
                    revisados no editor do orçamento ("Gerar orçamento e abrir no editor", abaixo). Marque "Já pronto" para o que
                    não faz parte do seu escopo (ex.: cabeamento já passado) — sai do orçamento e do relatório como pendência.
                  </p>
                  <TabelaItensLeitura tipo="servico" itens={analise.servicos} disciplinas={DISCIPLINAS}
                    onPronto={(id, v) => alternarPronto('servicos', id, v)} />
                </div>

                <div style={card}>
                  <h3 style={tituloSecao}>Materiais / Equipamentos — extraídos do projeto</h3>
                  {analise.materiais.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>Nenhum material extraído do projeto — lance os materiais no editor do orçamento (catálogo ou digitados).</p>
                  ) : (
                    <TabelaItensLeitura tipo="material" itens={analise.materiais} disciplinas={DISCIPLINAS}
                      onPronto={(id, v) => alternarPronto('materiais', id, v)} />
                  )}
                </div>
              </>
            );
            // Elaboração de projeto: os itens do PDF ficam recolhidos, só como referência
            return elaboracao ? (
              <details style={{ ...card, padding: '14px 22px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: '#999', fontWeight: 700 }}>
                  Itens extraídos do PDF (referência) — {analise.servicos.length} serviço(s), {analise.materiais.length} material(is)
                </summary>
                <div style={{ marginTop: 14 }}>{tabelas}</div>
              </details>
            ) : tabelas;
          })()}

          {/* Orçamento: dimensionar pela norma é opção secundária — cria um PROJETO, não laudo */}
          {!elaboracao && disciplinasComSkill.length > 0 && cartaoProjetos(false)}

          {/* 2.3: 3D ilustrativo a partir da arquitetura (DWG/DXF) — nas duas finalidades */}
          <CartaoModelo3dAnalise analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} />

          <div style={{ ...card, display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#666', marginRight: 'auto', lineHeight: 1.5 }}>
              {elaboracao
                ? <>Elaboração de projeto: o orçamento de execução sai do projeto de cada disciplina.{analise.propostaNumero && <> Esta análise já tem o orçamento <b style={{ color: '#c9a227' }}>{analise.propostaNumero}</b>.</>}</>
                : analise.propostaNumero
                  ? <>Vinculada ao orçamento <b style={{ color: '#c9a227' }}>{analise.propostaNumero}</b>.</>
                  : 'O orçamento é revisado no editor de propostas.'}
              {!elaboracao && foraPorQuantidade > 0 && <><br /><span style={{ color: '#a08a3a' }}>{foraPorQuantidade} item(ns) com quantidade 0 ficam fora do rascunho — o editor lista para incluir.</span></>}
            </span>
            {analise.propostaId && (
              <button onClick={abrirNoEditor} style={{ ...btnSecundario, padding: '13px 18px', fontSize: 13 }}>
                <ExternalLink size={14} style={{ marginRight: 6 }} /> Abrir no editor
              </button>
            )}
            {!elaboracao && (
              <button onClick={gerarOrcamento} disabled={gerandoOrcamento} style={{ ...btnSecundario, padding: '13px 20px', fontSize: 13, borderStyle: 'solid', borderColor: '#c9a227', color: '#c9a227' }}
                title={analise.propostaNumero ? 'Substitui os itens da proposta pelos desta análise e abre o editor' : 'Cria a proposta rascunho com os itens desta análise e abre o editor'}>
                <Receipt size={14} style={{ marginRight: 6 }} />
                {gerandoOrcamento ? 'Gerando...' : analise.propostaNumero ? `Atualizar orçamento (${analise.propostaNumero}) e abrir` : 'Gerar orçamento e abrir no editor'}
              </button>
            )}
            <button onClick={baixarRelatorio} disabled={gerando} style={{ ...btnPrimario, padding: '13px 26px', fontSize: 13 }}>
              <FileDown size={14} style={{ marginRight: 6 }} /> {gerando ? 'Gerando...' : 'Baixar Relatório PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Itens extraídos do projeto (serviços ou materiais), só LEITURA — versão 2.0,
// editor único de orçamento: quantidade, valor unitário, "Ref.: … usar",
// referências oficial/particular e "Pesquisar mercado" por item saíram daqui
// e estão no editor da proposta (pages/Orcamento.js). Fica o que a análise
// leu do PDF (descrição, quantidade, unidade, disciplina, observação/origem)
// e a sugestão de preço como informação. Quantidade 0 = modelo da disciplina
// ainda não conferido na planta: o gerar deixa de fora (o editor lista para
// incluir). Só o "Já pronto" continua editável (escopo da obra).
function TabelaItensLeitura({ tipo, itens, disciplinas, onPronto }) {
  const servico = tipo === 'servico';
  const colunas = '2.4fr 1fr 0.5fr 0.5fr 1.5fr 1.8fr 0.8fr';
  const nomeDisc = (chave) => disciplinas.find(d => d.chave === chave)?.nome || chave;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, marginBottom: 8, fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        <span>Descrição</span><span>Disciplina</span><span>Qtd</span><span>Un.</span><span>Sugestão de preço</span><span>Observação / origem</span><span>Escopo</span>
      </div>
      {agruparPorSubgrupo(itens).map(linha => {
        if (linha.tipo === 'cabecalho') {
          return (
            <div key={linha.key} style={{ fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.5px', borderTop: '1px solid #222', paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
              {linha.nome}
            </div>
          );
        }
        const it = linha.item;
        const semQtd = !it.pronto && !(Number(it.quantidade) > 0);
        return (
          <div key={it.id} style={{ marginBottom: 10, borderBottom: '1px solid #1e1e1e', paddingBottom: 10, opacity: it.pronto ? 0.55 : 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10, alignItems: 'start', fontSize: 13 }}>
              <div style={{ color: '#ddd' }}>
                {it.descricao || <i style={{ color: '#666' }}>(sem descrição)</i>}
                {it.referencia_fabricante && <div style={{ color: '#777', fontSize: 11 }}>Ref. fabricante: {it.referencia_fabricante}</div>}
              </div>
              <span style={{ color: '#999', fontSize: 12 }}>{it.disciplina ? nomeDisc(it.disciplina) : (it.subgrupo || '—')}</span>
              <span style={{ color: semQtd ? '#c9a227' : '#ccc', fontWeight: semQtd ? 700 : 400 }}
                title={semQtd ? 'Quantidade 0: confira na planta — este item fica fora do rascunho do orçamento' : undefined}>
                {Number(it.quantidade) || 0}
              </span>
              <span style={{ color: '#999' }}>{it.unidade || '—'}</span>
              <div style={{ fontSize: 12 }}>
                {servico ? <SugestaoServico it={it} /> : <SugestaoMaterial it={it} />}
              </div>
              <span style={{ color: '#888', fontSize: 12, lineHeight: 1.45 }}>
                {it.observacao || '—'}
                {semQtd && <div style={{ color: '#a08a3a', marginTop: 3 }}>Quantidade 0 — fica fora do rascunho; inclua no editor se fizer parte.</div>}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: it.pronto ? '#3fb95f' : '#999', whiteSpace: 'nowrap' }}
                title='"Já pronto": já existe na obra, não faz parte do escopo orçado'>
                <input type="checkbox" checked={!!it.pronto} onChange={e => onPronto(it.id, e.target.checked)} />
                Já pronto
              </label>
            </div>
            {/* pesquisa que ficou salva no item (de antes do editor único), só para consulta */}
            {it.pesquisa_mercado?.resultado && (
              <BlocoPesquisaMercado pesquisa={{ ...it.pesquisa_mercado, recolhidaInicial: true }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Serviço: o valor que a análise sugeriu (vai para o rascunho) e as referências
// de mão de obra (H&M, oficial/governo, particular) — tudo como informação.
function SugestaoServico({ it }) {
  const valor = Number(it.valor_unitario) || 0;
  const refs = [
    ['Ref.', it.valor_referencia_mercado, 'Referência H&M (tela Preços de Mão de Obra)'],
    ['oficial', it.referencias_mercado?.publico, 'Referência oficial / governo (SINAPI, ORSE, licitações)'],
    ['particular', it.referencias_mercado?.privado, 'Referência do mercado particular'],
  ].filter(([, v]) => v != null && Number(v) !== valor);
  return (
    <>
      {valor > 0
        ? <div style={{ color: '#c9a227' }}><b>{formatarMoeda(valor)}</b> <span style={{ color: '#777' }}>(vai para o rascunho)</span></div>
        : <div style={{ color: '#a08a3a' }}>Sem preço — entra "a cotar"</div>}
      {refs.map(([rot, v, titulo]) => (
        <div key={rot} style={{ fontSize: 11, color: '#6f7f8f', marginTop: 2 }} title={titulo}>{rot}: {formatarMoeda(v)}</div>
      ))}
    </>
  );
}

// Material: preço adotado de uma pesquisa (tem prioridade ao gerar) e/ou a
// correspondência no catálogo, com a confiança e a descrição do catálogo.
function SugestaoMaterial({ it }) {
  const adotado = Number(it.preco_unitario) > 0;
  return (
    <>
      {adotado && (
        <div style={{ color: '#c9a227' }}><b>{formatarMoeda(it.preco_unitario)}</b> <span style={{ color: '#777' }}>(pesquisa de mercado adotada)</span></div>
      )}
      {it.preco_catalogo != null ? (
        <div style={{ color: adotado ? '#777' : it.confianca_catalogo >= 70 ? '#3fb95f' : '#c9a227' }}>
          {adotado ? 'catálogo: ' : ''}<b>{formatarMoeda(it.preco_catalogo)}</b> ({it.confianca_catalogo}% match)
          <div style={{ color: '#777', fontSize: 11 }} title={it.descricao_catalogo}>{it.descricao_catalogo}</div>
        </div>
      ) : !adotado && (
        <div style={{ color: '#a08a3a' }}>Sem correspondência no catálogo — entra "a cotar"</div>
      )}
    </>
  );
}

// Tabela de um tipo de ponto codificado (câmera/rede/antena) — mostra, por
// arquivo, quantas ocorrências do código apareceram, quantos pontos únicos
// isso representa, a lista dos próprios códigos encontrados e os avisos de
// duplicidade/numeração com falha. Sem essa lista, o número sozinho ("77")
// não dizia se era câmera, rede ou antena, nem dava pra conferir contra a
// planta quais códigos entraram na conta.
function TabelaPontos({ titulo, prefixo, detalhe }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 8 }}>
        {titulo} — código {prefixo}nº (ex.: {prefixo}1, {prefixo}2...)
      </div>
      {!detalhe || detalhe.length === 0 ? (
        <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Nenhum código {prefixo}nº identificado nos arquivos analisados.</p>
      ) : (
        detalhe.map((d, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none', fontSize: 13 }}>
            <div style={{ color: '#ccc', marginBottom: 4 }}>
              <b>{d.arquivo}</b> — {d.ocorrencias} ocorrências, {d.total} pontos únicos
            </div>
            <div style={{ color: '#777', fontSize: 12, marginBottom: 4 }}>
              Códigos: {d.unicas.map(n => prefixo + n).join(', ')}
            </div>
            {d.repetidas.length > 0 && (
              <div style={{ color: '#c9a227', fontSize: 12 }}>Repetidos: {d.repetidas.map(n => prefixo + n).join(', ')}</div>
            )}
            {d.faltando.length > 0 && (
              <div style={{ color: '#c9a227', fontSize: 12 }}>Faltando na numeração: {d.faltando.map(n => prefixo + n).join(', ')}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ResumoBloco({ rotulo, valor, destaque }) {
  return (
    <div style={{
      border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px',
      background: destaque ? '#1a1a1a' : 'transparent',
    }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: destaque ? '#c9a227' : '#777', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: destaque ? '#fff' : '#ccc' }}>{formatarMoeda(valor)}</div>
    </div>
  );
}

// Tabela "Pontos por Ambiente" — mesmo formato da planilha de referência da
// empresa (Ambiente | Rede | TV/Antena | Câmeras | Total), colunas variando
// conforme a disciplina selecionada. Sempre aproximada (ver
// utils/pontosPorAmbiente.js no backend) — daí o aviso logo acima, no card.
function TabelaPontosPorAmbiente({ linhas, disciplinas }) {
  const colunas = [
    disciplinas?.includes('rede') && { chave: 'rede', titulo: 'Rede' },
    disciplinas?.includes('antena') && { chave: 'antena', titulo: 'TV/Antena' },
    disciplinas?.includes('cftv') && { chave: 'cftv', titulo: 'Câmeras' },
  ].filter(Boolean);

  if (!linhas || linhas.length === 0) {
    return <p style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>Não foi possível estimar a distribuição por ambiente nos arquivos analisados.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
          <th style={{ padding: '4px 8px 8px 0' }}>Ambiente</th>
          {colunas.map(c => <th key={c.chave} style={{ padding: '4px 8px 8px 0', textAlign: 'right' }}>{c.titulo}</th>)}
          <th style={{ padding: '4px 0 8px 0', textAlign: 'right' }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map(l => (
          <tr key={l.ambiente} style={{ borderTop: '1px solid #1e1e1e' }}>
            <td style={{ padding: '6px 8px 6px 0' }}>{l.ambiente}</td>
            {colunas.map(c => <td key={c.chave} style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: '#999' }}>{l[c.chave]}</td>)}
            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>{l.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Info({ label, valor }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 19, color: '#c9a227', fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 22, marginBottom: 16
};

const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 10 };
const inputPonto = { width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '5px 7px', boxSizing: 'border-box', fontFamily: 'inherit' };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent',
  border: '1px dashed #333', borderRadius: 6, color: '#999', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};
