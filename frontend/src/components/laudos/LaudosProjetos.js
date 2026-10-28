import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FilePlus2, FileDown, Upload, Calculator, Receipt, Trash2, Download, BookOpen, FolderDown, ExternalLink } from 'lucide-react';
import {
  getDisciplinasLaudo, getModeloLaudo, getLaudos, getLaudo, criarLaudoNaObra, atualizarLaudo, removerLaudo,
  calcularLaudo, baixarDocumentoLaudo, enviarFotosLaudo, getFotoLaudo, removerFotoLaudo, gerarOrcamentoDoLaudo,
  salvarDocumentosLaudo, getPastaLaudo, abrirPastaLaudo,
  enviarArquiteturaLaudo, getArquiteturaLaudo, baixarPlantaLaudo, baixarUnifilarLaudo,
} from '../../services/api';
import PainelPasta from '../PainelPasta';
import { BotoesModelo3d } from '../Modelo3d';
import ObraSelect from '../ObraSelect';
import FormularioSpda from './FormularioSpda';
import ResultadoSpda from './ResultadoSpda';
import FormularioGenerico from './FormularioGenerico';
import ResultadoGenerico from './ResultadoGenerico';
import EntregasProjeto from './EntregasProjeto';
import Select from '../Select';
import { useAuth } from '../../hooks/useAuth';
import useAlteracoesNaoSalvas from '../../hooks/useAlteracoesNaoSalvas';

// Projetos e laudos por disciplina — abas "Projetos por disciplina" e
// "Laudos" do hub Obras (versão 2.1: separados). O mesmo componente atende os
// dois tipos de registro (prop `tipo`):
//   projeto — documentos de projeto (memorial, planilhas), desenhos (planta DXF,
//             unifilar QElectroTech), ENTREGAS e orçamento de execução;
//   laudo   — documentos de laudo (inspeção, checklist, medições), fotos e
//             orçamento de inspeção/correção. Laudo é pedido quando necessário
//             e nunca nasce da análise de projeto.
// O que é de cada tipo vem do servidor (`uso` em cada documento e modo de
// orçamento — skills/_comum/tipos-documento.js).
// O SPDA tem tela própria; as demais disciplinas usam o formulário genérico,
// desenhado a partir do esquema que a skill envia (skills/_comum/formulario.js).
// O backend usa a skill da disciplina (mesmo motor do Claude Code).
const TELAS_POR_DISCIPLINA = {
  spda: { Formulario: FormularioSpda, Resultado: ResultadoSpda },
};
const TELA_GENERICA = { Formulario: FormularioGenerico, Resultado: ResultadoGenerico };
// reserva, caso o servidor não diga (versão antiga): disciplinas com unifilar
// (skills/_comum/cad/unifilar.js) e com planta automática (cad/plantasDisciplina.js)
const DISCIPLINAS_COM_UNIFILAR = ['eletrica', 'eletrica_industrial', 'media_tensao'];
const DISCIPLINAS_COM_PLANTA = ['eletrica', 'incendio', 'cftv', 'cabeamento', 'alarme', 'iluminacao', 'eletrica_hospitalar', 'controle_acesso', 'telefonia', 'antena'];

const TEXTOS = {
  projeto: {
    titulo: 'Projetos por disciplina', aba: 'projetos', novo: 'Novo projeto', criado: 'Projeto criado', item: 'projeto', semTitulo: 'Projeto sem título',
    vazio: 'Nenhum projeto salvo nesta disciplina.', semObra: 'Novo projeto sem obra',
    intro: 'Projeto que a H&M elabora e entrega: memorial e planilhas (definições técnicas), desenhos e entregas — as-built, DXF, QElectroTech e PDF. Pode nascer aqui ou da Análise de projeto ("Elaborar projeto da disciplina"). Não é laudo.',
  },
  laudo: {
    titulo: 'Laudos', aba: 'laudos', novo: 'Novo laudo', criado: 'Laudo criado', item: 'laudo', semTitulo: 'Laudo sem título',
    vazio: 'Nenhum laudo salvo nesta disciplina.', semObra: 'Novo laudo sem obra',
    intro: 'Laudo de inspeção, vistoria, medição ou comissionamento — criado só quando o cliente pede: checklist, não conformidades, ensaios, fotos e orçamento de inspeção/correção. Análise de projeto não gera laudo.',
  },
};
const serve = (uso, tipo) => uso === 'ambos' || uso === tipo || uso == null;

// Projeto: o painel de resultado não mostra o parecer/checklist da inspeção
// (é do laudo). O "Trazer do cálculo" do formulário continua com o resumo inteiro.
const DA_INSPECAO = /inspe[cç][aã]o|parecer|checklist|n[aã]o conformidade/i;
function resumoDoTipo(resumo, tipo) {
  if (!resumo || tipo !== 'projeto') return resumo;
  return {
    ...resumo,
    inspecao: undefined, // SPDA
    indicadores: resumo.indicadores?.filter(i => !DA_INSPECAO.test(`${i.rotulo} ${i.detalhe || ''}`)),
    tabelas: resumo.tabelas?.filter(t => !DA_INSPECAO.test(t.titulo || '')),
  };
}

function baixarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function LaudosProjetos({ tipo = 'laudo' }) {
  const T = TEXTOS[tipo] || TEXTOS.laudo;
  const ehProjeto = tipo === 'projeto';
  const navigate = useNavigate();
  const [disciplinas, setDisciplinas] = useState([]);
  // sem disciplina pré-escolhida (pedido do usuário, 28/10/2026): a lista mostra
  // todas e só se cria projeto/laudo depois de escolher a disciplina
  const [disciplina, setDisciplina] = useState('');
  const [modelo, setModelo] = useState(null); // { modelo, exemplo, checklistBase }
  const [lista, setLista] = useState([]);
  const [laudo, setLaudo] = useState(null); // { id, tipo, disciplina, propostas, gerar_orcamento, obra, analise_id, entregas }
  const [dados, setDados] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [urlsFotos, setUrlsFotos] = useState({});
  const [resumo, setResumo] = useState(null);
  const [sujo, setSujo] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [pastaMudou, setPastaMudou] = useState(0); // recarrega o painel da pasta após gravar arquivos
  const entradaJson = useRef(null);
  const salvandoRef = useRef(null);
  const versaoRef = useRef(null); // versão no servidor (bloqueio otimista)
  const conflitoRef = useRef(false); // outro gravou: para o salvamento automático até reabrir
  // Salvamento automático sem perder digitação: cada alteração soma 1 na
  // revisão; a gravação leva os dados MAIS NOVOS (dadosRef) e só marca "salvo"
  // se nada mudou enquanto ela ia e voltava — antes o setSujo(false) da
  // resposta descartava o que fora digitado durante a gravação.
  const revisaoRef = useRef(0);
  const dadosRef = useRef(null);
  dadosRef.current = dados;
  const laudoAbertoRef = useRef(null); // id do registro aberto (resposta de outro registro é ignorada)
  laudoAbertoRef.current = laudo?.id ?? null;
  const sujoRef = useRef(false);
  sujoRef.current = sujo;
  const { usuario } = useAuth();
  // registro de outro usuário: abre só para leitura (o servidor recusa com 403)
  const [somenteLeitura, setSomenteLeitura] = useState(null);
  const somenteLeituraRef = useRef(null);
  somenteLeituraRef.current = somenteLeitura;

  // A barra de ações fica presa logo abaixo do menu do sistema (que também é
  // fixo e muda de altura quando os botões quebram linha em telas estreitas)
  const [alturaMenu, setAlturaMenu] = useState(0);
  useEffect(() => {
    const medir = () => setAlturaMenu(document.querySelector('header')?.offsetHeight || 0);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const infoDisciplina = disciplinas.find(d => d.chave === disciplina);
  const tela = TELAS_POR_DISCIPLINA[disciplina] || (modelo?.formulario ? TELA_GENERICA : null);
  // o que serve a este tipo de registro (projeto ou laudo)
  const documentosDoTipo = (infoDisciplina?.documentos || []).filter(d => serve(d.uso, tipo));
  const desenhos = infoDisciplina?.desenhos || {
    planta: DISCIPLINAS_COM_PLANTA.includes(disciplina), unifilar: DISCIPLINAS_COM_UNIFILAR.includes(disciplina),
  };

  // GET /laudos corta a lista (cabeçalho X-Lista-Truncada): avisa "lista parcial"
  const [listaParcial, setListaParcial] = useState(0);
  const carregarLista = useCallback(async () => {
    try {
      const r = await getLaudos({ ...(disciplina ? { disciplina } : {}), tipo });
      setLista(r.data);
      setListaParcial(r.headers?.['x-lista-truncada'] === "1" ? Number(r.headers['x-limite-lista']) || r.data.length : 0);
    } catch { /* lista vazia já informa */ }
  }, [disciplina, tipo]);

  useEffect(() => {
    getDisciplinasLaudo().then(r => setDisciplinas(r.data)).catch(() => toast.error('Erro ao carregar as disciplinas'));
  }, []);

  const disponivel = !!disciplinas.find(d => d.chave === disciplina)?.disponivel;
  useEffect(() => {
    setModelo(null);
    carregarLista();
    if (disponivel) {
      getModeloLaudo(disciplina).then(r => setModelo(r.data)).catch(err => toast.error(err.response?.data?.erro || 'Erro ao carregar o modelo'));
    }
  }, [disciplina, disponivel, carregarLista]);

  // Miniaturas das fotos (object URLs): liberadas ao trocar de laudo e ao sair da tela
  const urlsRef = useRef({});
  useEffect(() => { urlsRef.current = urlsFotos; }, [urlsFotos]);
  useEffect(() => () => Object.values(urlsRef.current).forEach(u => window.URL.revokeObjectURL(u)), []);

  async function carregarFotos(id, listaFotos) {
    Object.values(urlsRef.current).forEach(u => window.URL.revokeObjectURL(u));
    setUrlsFotos({});
    const urls = {};
    for (const f of listaFotos) {
      try {
        const r = await getFotoLaudo(id, f.id);
        urls[f.id] = window.URL.createObjectURL(r.data);
      } catch { /* foto removida ou inacessível: o cartão mostra "não carregada" */ }
    }
    setUrlsFotos(urls);
  }

  // Antes de trocar de registro (abrir outro, trocar de disciplina, sair da
  // tela): grava o que ainda está pendente. Se não der, pergunta.
  async function gravarPendente() {
    if (!sujoRef.current || somenteLeituraRef.current || !laudoAbertoRef.current) return true;
    try {
      await salvarAgora();
      return true;
    } catch {
      return window.confirm(`As últimas alterações deste ${T.item} não puderam ser salvas. Continuar mesmo assim e perdê-las?`);
    }
  }

  async function abrir(id, { semGravar = false } = {}) {
    if (!semGravar && !(await gravarPendente())) return;
    try {
      const r = await getLaudo(id);
      setLaudo({
        id: r.data.id, tipo: r.data.tipo || 'laudo', disciplina: r.data.disciplina, propostas: r.data.propostas || {},
        gerar_orcamento: r.data.gerar_orcamento !== false, obra: r.data.obra || null, analise_id: r.data.analise_id || null, entregas: r.data.entregas || null,
      });
      laudoAbertoRef.current = r.data.id;
      versaoRef.current = r.data.versao ?? null;
      conflitoRef.current = false;
      revisaoRef.current += 1; // gravação em curso do registro anterior não marca este como salvo
      setDados(r.data.dados);
      dadosRef.current = r.data.dados;
      setFotos(r.data.fotos);
      setResumo(null);
      setSujo(false);
      setSalvoEm(new Date(r.data.atualizado_em));
      const deOutro = usuario && usuario.role !== 'admin' && r.data.usuario_id != null && Number(r.data.usuario_id) !== Number(usuario.id);
      setSomenteLeitura(deOutro ? { mensagem: `Este ${T.item} é de outro usuário: só quem o criou (ou um administrador) altera.` } : null);
      carregarFotos(r.data.id, r.data.fotos);
    } catch (err) {
      toast.error(err.response?.data?.erro || `Erro ao abrir o ${T.item}`);
    }
  }

  // fecha o registro aberto (trocar de disciplina) depois de gravar o pendente
  async function fechar() {
    if (!(await gravarPendente())) return false;
    revisaoRef.current += 1;
    setLaudo(null); setDados(null); setResumo(null); setSujo(false); setSomenteLeitura(null);
    return true;
  }

  // "Duplicar para mim" (registro de outro usuário): cria um registro meu com os mesmos dados
  async function duplicarParaMim() {
    await novo(dadosRef.current);
  }

  // ?aba=projetos|laudos&laudo=ID — vindo da Análise de Projeto ("Elaborar
  // projeto da disciplina"), da página da obra ou de um link antigo: seleciona
  // a disciplina e abre o registro. Registro do OUTRO tipo (ex.: link antigo
  // ?aba=laudos&laudo=ID de um projeto) vai para a aba certa, mantendo o ?laudo=.
  const [busca, setBusca] = useSearchParams();
  const laudoDaUrl = busca.get('laudo');
  // obra do registro novo (2.0): /obras?aba=laudos&obra=ID já pré-seleciona
  const obraDaUrl = Number(busca.get('obra')) || null;
  const [obraNovo, setObraNovo] = useState(obraDaUrl);
  useEffect(() => { if (obraDaUrl) setObraNovo(obraDaUrl); }, [obraDaUrl]);
  useEffect(() => {
    if (!laudoDaUrl) return;
    const comObra = (aba, extra = {}) => ({ aba, ...extra, ...(obraDaUrl ? { obra: String(obraDaUrl) } : {}) });
    getLaudo(laudoDaUrl)
      .then(r => {
        const tipoDoRegistro = r.data.tipo || 'laudo';
        if (tipoDoRegistro !== tipo) {
          setBusca(comObra(TEXTOS[tipoDoRegistro].aba, { laudo: String(r.data.id) }), { replace: true });
          return;
        }
        setDisciplina(r.data.disciplina);
        abrir(r.data.id);
        setBusca(comObra(T.aba), { replace: true });
      })
      .catch(() => { toast.error('Registro não encontrado'); setBusca(comObra(T.aba), { replace: true }); });
  }, [laudoDaUrl]); // só quando o id da URL muda

  async function novo(base) {
    if (!(await gravarPendente())) return;
    try {
      const r = await criarLaudoNaObra(disciplina, base, obraNovo, tipo);
      toast.success(T.criado);
      await carregarLista();
      await abrir(r.data.id, { semGravar: true });
    } catch (err) {
      toast.error(err.response?.data?.erro || `Erro ao criar o ${T.item}`);
    }
  }

  async function importarJson(arquivo) {
    try {
      const texto = await arquivo.text();
      const json = JSON.parse(texto);
      await novo(json);
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'O arquivo não é um JSON válido' : 'Erro ao importar o arquivo');
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir o ${T.item} "${item.titulo}"? As fotos dele também serão apagadas; a pasta vai para Arquivos do Sistema\\_Excluídos.`)) return;
    try {
      await removerLaudo(item.id);
      if (laudo?.id === item.id) { revisaoRef.current += 1; laudoAbertoRef.current = null; setSujo(false); setLaudo(null); setDados(null); setResumo(null); }
      toast.success(`${T.item.charAt(0).toUpperCase()}${T.item.slice(1)} excluído`);
      carregarLista();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir');
    }
  }

  const carregarPasta = useCallback(() => getPastaLaudo(laudo.id), [laudo?.id]);
  const abrirPasta = useCallback(() => abrirPastaLaudo(laudo.id), [laudo?.id]);

  const salvarAgora = useCallback(async () => {
    const id = laudoAbertoRef.current;
    if (!id || !dadosRef.current) return;
    if (somenteLeituraRef.current) return; // de outro usuário: nada a gravar
    if (conflitoRef.current) {
      throw Object.assign(new Error('conflito de versão'), {
        response: { data: { erro: `Este ${T.item} foi alterado em outro lugar depois que você o abriu. Reabra-o para continuar.` } },
      });
    }
    if (salvandoRef.current) await salvandoRef.current.catch(() => {});
    if (laudoAbertoRef.current !== id) return; // trocou de registro enquanto esperava
    const revisao = revisaoRef.current;
    const promessa = atualizarLaudo(id, dadosRef.current, null, versaoRef.current)
      .then((r) => {
        if (laudoAbertoRef.current !== id) return; // resposta de um registro que já foi fechado
        versaoRef.current = r.data?.versao ?? null;
        setSalvoEm(new Date());
        // só "salvo" se nada mudou enquanto gravava; senão o automático grava de novo
        if (revisaoRef.current === revisao) setSujo(false);
      })
      .catch(err => {
        const status = err.response?.status;
        if (status === 409) conflitoRef.current = true;
        if (status === 403 && err.response?.data?.codigo !== 'SENHA_PROVISORIA') {
          setSomenteLeitura({ mensagem: err.response?.data?.erro || `Você não pode alterar este ${T.item}.` });
        }
        if (!err.sessaoEncerrada) toast.error(err.response?.data?.erro || 'Erro ao salvar', status === 409 ? { duration: 15000 } : undefined);
        throw err;
      })
      .finally(() => { salvandoRef.current = null; });
    salvandoRef.current = promessa;
    return promessa;
  }, [T.item]);

  // Salvamento automático 2 s depois da última alteração
  useEffect(() => {
    if (!sujo || somenteLeitura) return undefined;
    const t = setTimeout(() => { salvarAgora().then(carregarLista).catch(() => {}); }, 2000);
    return () => clearTimeout(t);
  }, [sujo, somenteLeitura, dados, salvarAgora, carregarLista]);

  // Saindo da tela com alteração ainda não gravada: grava na hora (sem
  // esperar os 2 s) e, até lá, o navegador avisa ao fechar/recarregar a aba
  useAlteracoesNaoSalvas(sujo && !somenteLeitura,
    `Há alterações deste ${T.item} que ainda não foram salvas. Sair mesmo assim?`);
  useEffect(() => () => {
    if (sujoRef.current && !somenteLeituraRef.current && laudoAbertoRef.current) salvarAgora().catch(() => {});
  }, [salvarAgora]);

  const alterarDados = (atualizador) => {
    if (somenteLeituraRef.current) return;
    revisaoRef.current += 1;
    setDados(atual => (typeof atualizador === 'function' ? atualizador(atual) : atualizador));
    setSujo(true);
  };

  async function calcular() {
    setOcupado('calcular');
    try {
      await salvarAgora();
      const r = await calcularLaudo(laudo.id);
      setResumo(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro no cálculo', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  // Gera todos os documentos do padrão da disciplina e grava na pasta do laudo
  // (substituindo as versões anteriores, sem acumular cópias).
  async function salvarDocumentosNaPasta() {
    setOcupado('pasta');
    try {
      await salvarAgora();
      const r = await salvarDocumentosLaudo(laudo.id);
      const gravados = r.data.documentos.filter(d => d.gravado).length;
      toast.success(`${gravados} documento(s) salvos na pasta do ${T.item}`);
      if (gravados < r.data.documentos.length) toast.error('Algum documento não pôde ser gravado — feche-o no Word/Excel e tente de novo', { duration: 8000 });
      setPastaMudou(Date.now());
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar os documentos na pasta', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  // "Sem orçamento" ("só laudo" / projeto sem orçamento): desliga os orçamentos
  // deste registro (os documentos continuam iguais)
  async function alternarOrcamento(valor) {
    try {
      await salvarAgora().catch(() => {});
      const r = await atualizarLaudo(laudo.id, dados, valor, versaoRef.current);
      versaoRef.current = r.data?.versao ?? null;
      setLaudo(l => ({ ...l, gerar_orcamento: r.data.gerar_orcamento }));
      carregarLista();
      toast.success(valor ? `${ehProjeto ? 'Projeto' : 'Laudo'} com orçamento` : (ehProjeto ? 'Projeto sem orçamento' : 'Só laudo — sem orçamento'));
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao alterar a opção de orçamento');
    }
  }

  async function baixar(doc) {
    setOcupado(`doc_${doc.tipo}`);
    try {
      await salvarAgora();
      const r = await baixarDocumentoLaudo(laudo.id, doc.tipo);
      const nome = decodeURIComponent(r.headers['x-nome-arquivo'] || `${doc.tipo}.${doc.formato === 'Excel' ? 'xlsx' : 'docx'}`);
      baixarBlob(r.data, nome);
      setPastaMudou(Date.now()); // a cópia também foi gravada na pasta do laudo
    } catch (err) {
      let msg = 'Erro ao gerar o documento';
      try { msg = JSON.parse(await err.response.data.text()).erro || msg; } catch { /* resposta não-JSON */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  // ── Arquitetura (DWG/DXF) e planta gerada ──
  const entradaArquitetura = useRef(null);
  const [arquitetura, setArquitetura] = useState(null);
  useEffect(() => {
    setArquitetura(null);
    if (laudo?.id && laudo.tipo === 'projeto' && desenhos.planta) {
      getArquiteturaLaudo(laudo.id).then(r => setArquitetura(r.data)).catch(() => {});
    }
  }, [laudo?.id, laudo?.tipo, desenhos.planta]);

  async function enviarArquiteturaDoLaudo(arquivo) {
    setOcupado('arquitetura');
    try {
      await salvarAgora();
      const r = await enviarArquiteturaLaudo(laudo.id, arquivo);
      toast.success(`${r.data.ambientes.length} ambientes e ${r.data.portas ?? 0} portas lidos da arquitetura${r.data.origem === 'dwg' ? ' (DWG)' : ''}${r.data.preenchidos ? ` — ${r.data.preenchidos} preenchidos no formulário (área e perímetro reais)` : ''}`, { duration: 8000 });
      if (r.data.preenchidos) await abrir(laudo.id); // recarrega o formulário com os ambientes
      else setArquitetura((await getArquiteturaLaudo(laudo.id)).data);
      setPastaMudou(Date.now());
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao ler a arquitetura', { duration: 9000 });
    } finally {
      setOcupado('');
    }
  }

  async function baixarUnifilar() {
    setOcupado('unifilar');
    try {
      await salvarAgora();
      const r = await baixarUnifilarLaudo(laudo.id);
      const nome = decodeURIComponent((r.headers['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1] || 'unifilar.qet');
      baixarBlob(r.data, nome);
      setPastaMudou(Date.now());
    } catch (err) {
      let msg = 'Erro ao gerar o unifilar';
      try { msg = JSON.parse(await err.response.data.text()).erro || msg; } catch { /* resposta não-JSON */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  async function baixarPlanta() {
    setOcupado('planta');
    try {
      await salvarAgora();
      const r = await baixarPlantaLaudo(laudo.id);
      const nome = decodeURIComponent((r.headers['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1] || 'planta.dxf');
      baixarBlob(r.data, nome);
      const faltaram = decodeURIComponent(r.headers['x-ambientes-nao-encontrados'] || '');
      if (faltaram) toast(`Ambientes do formulário que não estão na arquitetura (sem pontos na planta): ${faltaram}`, { duration: 10000, icon: '⚠️' });
      setPastaMudou(Date.now());
    } catch (err) {
      let msg = 'Erro ao gerar a planta';
      try { msg = JSON.parse(await err.response.data.text()).erro || msg; } catch { /* resposta não-JSON */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  function exportarJson() {
    const nome = `${(dados?.meta?.prefixo || dados?.obra?.nome || 'laudo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40)}_dados_${disciplina.toUpperCase()}.json`;
    baixarBlob(new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' }), nome);
  }

  // Gera (ou atualiza) a proposta rascunho deste laudo e abre o editor único
  // de orçamento (/propostas/editar/:id) — quantidades, preços, pesquisa de
  // mercado e referências são revisados lá. Atualizar SUBSTITUI os itens da
  // proposta vinculada (enquanto "Ativa"), por isso pede confirmação.
  async function orcar(modo) {
    if (laudo.propostas?.[modo.modo] && !window.confirm(
      `Atualizar o orçamento "${modo.rotulo}" com o cálculo atual deste ${T.item}?\n\n` +
      'Os itens da proposta serão SUBSTITUÍDOS — quantidades e preços ajustados no editor se perdem (BDI e impostos ficam). ' +
      'Se a proposta já foi aprovada ou recusada, é criada uma nova.\n\nPara só continuar a revisão, use "Abrir no editor".'
    )) return;
    setOcupado(`orc_${modo.modo}`);
    try {
      await salvarAgora();
      const r = await gerarOrcamentoDoLaudo(laudo.id, modo.modo);
      setLaudo(l => ({ ...l, propostas: { ...l.propostas, [modo.modo]: r.data.propostaId } }));
      toast.success(r.data.mensagem, { duration: 9000 });
      navigate(`/propostas/editar/${r.data.propostaId}`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar o orçamento', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  async function enviarFotos(arquivos) {
    setOcupado('fotos');
    try {
      await salvarAgora();
      const r = await enviarFotosLaudo(laudo.id, arquivos);
      const novas = r.data;
      setFotos(f => [...f, ...novas]);
      const urls = {};
      arquivos.forEach((a, i) => { if (novas[i]) urls[novas[i].id] = window.URL.createObjectURL(a); });
      setUrlsFotos(u => ({ ...u, ...urls }));
      alterarDados(atual => {
        const listaFotos = [...((atual.inspecao || {}).fotos || [])];
        novas.forEach(f => {
          listaFotos.push({ id: `F-${String(listaFotos.length + 1).padStart(2, '0')}`, local: '', subsistema: '', descricao: f.nome_arquivo.replace(/\.[^.]+$/, ''), ref: '', arquivo: `foto:${f.id}`, largura_cm: 8 });
        });
        return { ...atual, inspecao: { ...(atual.inspecao || {}), fotos: listaFotos } };
      });
      toast.success(`${novas.length} foto(s) enviada(s)`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar as fotos');
    } finally {
      setOcupado('');
    }
  }

  async function removerFoto(fotoId) {
    try {
      await removerFotoLaudo(laudo.id, fotoId);
      setFotos(f => f.filter(x => x.id !== fotoId));
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover a foto');
    }
  }

  return (
    <div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ ...tituloSecao, marginBottom: 0, flex: 1 }}>{T.titulo}</h3>
          <Select value={disciplina} onChange={e => { const v = e.target.value; fechar().then(ok => { if (ok) setDisciplina(v); }); }}
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', padding: '8px 10px', fontSize: 13 }}>
            <option value="">Todas as disciplinas — escolha uma para criar</option>
            {disciplinas.map(d => <option key={d.chave} value={d.chave}>{d.nome}{d.disponivel ? '' : ' — em preparação'}</option>)}
          </Select>
        </div>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, margin: '-4px 0 14px' }}>{T.intro}</p>

        {infoDisciplina && !infoDisciplina.disponivel ? (
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            A disciplina <b>{infoDisciplina.nome}</b> ainda está em preparação. Ela vai usar este mesmo fluxo: formulário,
            cálculo pela norma, documentos em Word e orçamento integrado ao catálogo de materiais.
            {infoDisciplina.erro && <><br /><span style={{ color: '#e05050' }}>{infoDisciplina.erro}</span></>}
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button style={btnPrimario} disabled={!modelo} onClick={() => novo(modelo?.modelo)} title={disciplina ? '' : 'Escolha a disciplina acima para criar'}><FilePlus2 size={14} /> {T.novo}</button>
              <button style={btnSecundario} disabled={!modelo} onClick={() => novo(modelo?.exemplo)} title={`Cria um ${T.item} preenchido com o exemplo, para conhecer o formulário`}>
                <BookOpen size={13} style={{ marginRight: 5 }} /> Novo a partir do exemplo
              </button>
              <button style={btnSecundario} disabled={!disciplina} onClick={() => entradaJson.current?.click()} title={`Importa um arquivo JSON de dados da disciplina (ex.: HX_Exemplo_dados_SPDA.json) como ${T.item}`}>
                <Upload size={13} style={{ marginRight: 5 }} /> Importar JSON
              </button>
              <input ref={entradaJson} type="file" accept=".json,application/json" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) importarJson(e.target.files[0]); e.target.value = ''; }} />
              <div style={{ flex: '1 1 320px', maxWidth: 480, marginLeft: 'auto' }} title={`Obra do próximo ${T.item} criado aqui (novo, exemplo ou JSON importado) — opcional`}>
                <ObraSelect value={obraNovo} onChange={(id) => setObraNovo(id)} rotuloVazio={T.semObra} />
              </div>
            </div>

            {listaParcial > 0 && (
              <p data-testid="lista-parcial" style={{ fontSize: 11.5, color: '#c9a227', margin: '0 0 8px' }}>Lista parcial: mostrando os {listaParcial} mais recentes — os mais antigos não aparecem aqui.</p>
            )}
            {lista.length === 0 ? (
              <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>{T.vazio}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px 8px 0' }}>Obra</th>{!disciplina && <th style={{ padding: '4px 8px 8px 0' }}>Disciplina</th>}<th style={{ padding: '4px 8px 8px 0' }}>Cliente</th>
                    <th style={{ padding: '4px 8px 8px 0' }}>Revisão</th><th style={{ padding: '4px 8px 8px 0' }}>Fotos</th>
                    <th style={{ padding: '4px 8px 8px 0' }}>Atualizado em</th><th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map(item => (
                    <tr key={item.id} onClick={() => abrir(item.id)} style={{ cursor: 'pointer', borderTop: '1px solid #1e1e1e', background: laudo?.id === item.id ? '#1a1a1a' : 'transparent' }}>
                      <td style={{ padding: '8px 8px 8px 0' }}>{item.titulo}</td>
                      {!disciplina && <td style={{ padding: '8px 8px 8px 0', color: '#c9a227' }}>{disciplinas.find(d => d.chave === item.disciplina)?.nome?.replace(/\s*\(.*\)$/, '') || item.disciplina}</td>}
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.cliente_nome || '—'}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{(item.revisao || '').split(' ')[0] || '—'}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.total_fotos}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{new Date(item.atualizado_em).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => excluir(item)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {laudo && dados && tela && (
        <>
          {somenteLeitura && (
            <div data-testid="faixa-somente-leitura" style={{ ...card, padding: '12px 16px', borderColor: '#2f4f6f', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
                <b style={{ color: '#8ab4f8' }}>Somente leitura</b> — {somenteLeitura.mensagem}
                <span style={{ color: '#888' }}> Você pode calcular e baixar os documentos; para alterar, faça uma cópia sua.</span>
              </div>
              <button style={btnPrimario} onClick={duplicarParaMim}><FilePlus2 size={14} /> Duplicar para mim</button>
            </div>
          )}
          <div style={{ ...card, position: 'sticky', top: alturaMenu, zIndex: 40, boxShadow: '0 6px 14px rgba(0,0,0,.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ddd' }}>
                  <span style={{ ...selo, ...(ehProjeto ? seloProjeto : seloLaudo) }}>{ehProjeto ? 'PROJETO' : 'LAUDO'}</span>
                  {dados.obra?.nome || dados.cliente?.nome || T.semTitulo}
                </div>
                <div style={{ fontSize: 11, color: '#777' }}>
                  {sujo ? 'Alterações não salvas…' : salvoEm ? `Salvo às ${salvoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {laudo.obra && <> · Obra: <span style={{ color: '#bbb' }}>{laudo.obra.nome} ({laudo.obra.codigo})</span></>}
                  {laudo.analise_id && <> · elaborado a partir da <a href={`/obras/analise/${laudo.analise_id}`} onClick={e => { e.preventDefault(); navigate(`/obras/analise/${laudo.analise_id}`); }} style={{ color: '#8ab4f8' }}>análise #{laudo.analise_id}</a></>}
                </div>
              </div>
              <button style={btnPrimario} onClick={calcular} disabled={!!ocupado}><Calculator size={14} /> {ocupado === 'calcular' ? 'Calculando…' : 'Calcular'}</button>
              <button style={btnSecundario} onClick={exportarJson}><Download size={13} style={{ marginRight: 5 }} /> Exportar JSON</button>
              {!somenteLeitura && (
                <button style={{ ...btnSecundario, borderStyle: 'solid', borderColor: '#5a2a2a', color: '#e07070' }} disabled={!!ocupado} data-testid="excluir-registro"
                  onClick={() => excluir({ id: laudo.id, titulo: dados?.obra?.nome || dados?.meta?.titulo || T.semTitulo })}
                  title={`Exclui este ${T.item}. A pasta dele vai para Arquivos do Sistema\\_Excluídos (dá para recuperar os arquivos).`}>
                  <Trash2 size={13} style={{ marginRight: 5 }} /> Excluir {T.item}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <button style={{ ...btnSecundario, borderColor: '#2f5a2f', color: '#8fd18f' }} disabled={!!ocupado} onClick={salvarDocumentosNaPasta} title={`Gera os documentos ${ehProjeto ? 'de projeto' : 'do laudo'} (Word e Excel) e grava na pasta do ${T.item}, substituindo as versões anteriores`}>
                <FolderDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'pasta' ? 'Salvando…' : 'Salvar documentos na pasta'}
              </button>
              {documentosDoTipo.map(doc => (
                <button key={doc.tipo} style={btnSecundario} disabled={!!ocupado} onClick={() => baixar(doc)} title={`Gerar ${doc.rotulo} (${doc.formato})`}>
                  <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === `doc_${doc.tipo}` ? 'Gerando…' : doc.rotulo}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#bbb', marginRight: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                title={ehProjeto ? 'Desmarque quando o projeto for entregue sem orçamento de execução' : 'Desmarque quando for emitido só o laudo, sem orçamento'}>
                <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={laudo.gerar_orcamento !== false} disabled={!!somenteLeitura} onChange={e => alternarOrcamento(e.target.checked)} />
                {ehProjeto ? 'Gerar orçamento de execução' : 'Gerar orçamento (inspeção/correção)'}
              </label>
              {laudo.gerar_orcamento === false && <span style={{ fontSize: 12, color: '#777' }}>{ehProjeto ? 'Projeto sem orçamento — só os documentos e as entregas.' : 'Só laudo — os documentos são emitidos sem orçamento.'}</span>}
              {/* só os modos do tipo do registro; proposta já ligada em outro modo (antes da 2.1) continua acessível */}
              {laudo.gerar_orcamento !== false && (infoDisciplina?.modosOrcamento || []).filter(m => serve(m.uso, tipo) || laudo.propostas?.[m.modo]).map(m => (
                <span key={m.modo} style={{ display: 'inline-flex', gap: 4 }}>
                  {laudo.propostas?.[m.modo] && (
                    <button style={{ ...btnSecundario, borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }} disabled={!!ocupado}
                      onClick={() => navigate(`/propostas/editar/${laudo.propostas[m.modo]}`)} title={`Abre a proposta deste ${T.item} no editor de orçamento, sem mudar os itens`}>
                      <ExternalLink size={13} style={{ marginRight: 5 }} /> Abrir no editor — {m.rotulo}
                    </button>
                  )}
                  <button style={{ ...btnSecundario, borderColor: '#5a4a12', color: '#c9a227' }} disabled={!!ocupado} onClick={() => orcar(m)}
                    title={`${m.descricao || ''}${m.descricao ? ' — ' : ''}${laudo.propostas?.[m.modo] ? 'substitui os itens da proposta pelo cálculo atual e abre o editor' : 'cria a proposta rascunho e abre o editor'}`}>
                    <Receipt size={13} style={{ marginRight: 5 }} />
                    {ocupado === `orc_${m.modo}` ? 'Gerando…' : laudo.propostas?.[m.modo] ? `Atualizar e abrir — ${m.rotulo}` : `Gerar orçamento e abrir no editor — ${m.rotulo}`}
                  </button>
                </span>
              ))}
            </div>
            {/* desenhos são do PROJETO (planta DXF e unifilar) */}
            {ehProjeto && (desenhos.planta || desenhos.unifilar) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#bbb', marginRight: 4 }}>Desenhos (AutoCAD / QElectroTech):</span>
                {desenhos.planta && (<>
                <input ref={entradaArquitetura} type="file" accept=".dxf,.dwg" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviarArquiteturaDoLaudo(f); }} />
                <button style={btnSecundario} disabled={!!ocupado} onClick={() => entradaArquitetura.current?.click()}
                  title="Planta de arquitetura do cliente em DWG ou DXF (AutoCAD 2004 ou mais novo). Ambientes pela polilinha de área ou pelas paredes, com o nome dentro; portas pelo arco de abertura.">
                  <Upload size={13} style={{ marginRight: 5 }} /> {ocupado === 'arquitetura' ? 'Lendo…' : arquitetura ? 'Trocar arquitetura (DWG/DXF)' : 'Enviar arquitetura (DWG/DXF)'}
                </button>
                {arquitetura && (
                  <>
                    <span style={{ fontSize: 12, color: '#777' }}>{arquitetura.nome_arquivo} — {arquitetura.resumo?.ambientes?.length || 0} ambientes{arquitetura.resumo?.portas != null ? `, ${arquitetura.resumo.portas} portas` : ''} lidos</span>
                    <button style={{ ...btnSecundario, borderColor: '#2f4f6f', color: '#8ab4f8' }} disabled={!!ocupado} onClick={baixarPlanta}
                      title="Gera a planta (DXF) com os pontos da disciplina posicionados pela norma, legenda, quantitativo e carimbo — para revisar no AutoCAD">
                      <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'planta' ? 'Gerando…' : 'Baixar planta (DXF)'}
                    </button>
                    <BotoesModelo3d origem="laudo" id={laudo.id} desabilitado={!!ocupado} antes={salvarAgora} />
                  </>
                )}
                </>)}
                {desenhos.unifilar && (
                  <button style={{ ...btnSecundario, borderColor: '#2f4f6f', color: '#8ab4f8' }} disabled={!!ocupado} onClick={baixarUnifilar}
                    title={laudo.disciplina === 'media_tensao'
                      ? 'Diagrama unifilar da subestação para o QElectroTech (0.100 ou mais novo): entrada, para-raios, medição, proteção com relé, transformador e QGBT'
                      : 'Diagrama unifilar do quadro para o QElectroTech (0.100 ou mais novo): disjuntor geral, DPS, barramento e circuitos com seção, disjuntor e DR'}>
                    <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'unifilar' ? 'Gerando…' : 'Unifilar (QElectroTech)'}
                  </button>
                )}
              </div>
            )}
            <PainelPasta carregar={carregarPasta} abrir={abrirPasta} atualizarQuando={`${salvoEm}-${pastaMudou}`} />
          </div>

          {ehProjeto && (
            <div style={card}>
              <EntregasProjeto key={laudo.id} laudo={laudo} desenhos={desenhos} temArquitetura={!!arquitetura}
                revisaoAtual={dados.meta?.revisao} salvarAgora={salvarAgora} ocupado={ocupado} setOcupado={setOcupado}
                onGerado={(entregas) => { setLaudo(l => ({ ...l, entregas: { ...entregas, gerado_em: new Date().toISOString() } })); setPastaMudou(Date.now()); }} />
            </div>
          )}

          {resumo && (
            <div style={card}>
              <h3 style={tituloSecao}>Resultado</h3>
              <tela.Resultado resumo={resumoDoTipo(resumo, laudo.tipo)} />
            </div>
          )}

          {/* somente leitura: o fieldset desabilita todos os campos do formulário */}
          <fieldset disabled={!!somenteLeitura} style={{ ...card, minWidth: 0, margin: '0 0 16px' }}>
            <tela.Formulario
              esquema={modelo?.formulario}
              dados={dados} onChange={alterarDados} checklistBase={modelo?.checklistBase || []} resumo={resumo}
              fotos={fotos} urlsFotos={urlsFotos} onEnviarFotos={enviarFotos} onRemoverFoto={removerFoto}
              tipo={laudo.tipo}
            />
          </fieldset>
        </>
      )}
    </div>
  );
}

const card = { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 18, marginBottom: 16 };
const selo = { display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '.6px', padding: '2px 7px', borderRadius: 4, marginRight: 8, verticalAlign: 'middle' };
const seloProjeto = { background: '#12304a', color: '#8ab4f8', border: '1px solid #2f4f6f' };
const seloLaudo = { background: '#3a2a10', color: '#e0b050', border: '1px solid #5a4a12' };
const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 10 };
const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none',
  borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: 5, color: '#999', cursor: 'pointer',
};
