import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, FilePlus2, FileText, FolderOpen, Target } from 'lucide-react';
import {
  gerarRelatorioCompatibilizacao, getAnaliseProjeto,
  gerarOrcamentoDaAnalise, getPastaAnalise, abrirPastaAnalise, getDisciplinasProjeto, criarProjetoDeAnalise, reprocessarMapaCad,
} from '../services/api';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { clientePorNome } from '../components/CampoCliente';
import { useClientes } from '../components/ClienteSelect';
import { CartaoModelo3dAnalise } from '../components/Modelo3d';
import EnviarParaAnalise from '../components/analise/EnviarParaAnalise';
import AnalisesSalvas from '../components/analise/ListaAnalises';
import PainelPasta from '../components/PainelPasta';
import MapaCad from '../components/analise/MapaCad';
import ObjetivoDoProjeto from '../components/analise/ObjetivoDoProjeto';
import { ProjetoSugerido, PavimentosDaAnalise } from '../components/analise/ProjetoSugerido';
import { gerarId } from '../utils/ids';
import { card, tituloSecao } from './analise/estilos';
import useSalvamentoAnalise from './analise/useSalvamentoAnalise';
import {
  CabecalhoAnalise, PainelMais, CampoFuncionamento, AbasAnalise, Pendencias, BarraAcoesAnalise,
} from './analise/CartoesAnalise';
import ItensEValores, { estimativaDa } from './analise/ItensEValores';
import BibliotecaBlocos from './analise/BibliotecaBlocos';
import { formatarMoeda } from '../utils/format';
import InstrucoesDaAnalise from '../components/analise/InstrucoesDaAnalise';

// As disciplinas vêm do servidor (GET /projetos/disciplinas — fonte única em
// backend/src/utils/disciplinasProjeto.js): cada área de atuação é uma
// disciplina separada, e a lista cresce junto com as skills.

// Análise de projeto (PDF, e na 2.3 também DWG/DXF): compatibilização de projetos. Na versão
// 2.0 vira a aba "Análise de projeto" do hub Obras (pages/hubs/ObrasHub.js).
// Versão 2.1: a análise tem FINALIDADE — "Orçamento" (itens + gerar orçamento)
// ou "Elaboração de projeto" (elaborar o projeto de cada disciplina e
// entregar). Em nenhuma das duas sai laudo: o antigo "Calcular pela norma"
// cria um PROJETO da disciplina (aba "Projetos por disciplina").
// Divisão em 2.39: as peças estão em pages/analise/ e o salvamento automático no gancho useSalvamentoAnalise; aqui
// ficam a carga da análise, as edições e as ações (gerar orçamento, projeto, relatório).
// 2.48 (tela única): cabeçalho compacto com o resumo numa linha e o "⋯ Mais", o campo de instruções, as abas Projeto ·
// Itens e valores · Pendências e a barra de ações fixa — as mesmas nas duas finalidades (antes, 13 cartões empilhados).
export default function Compatibilizacao() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const [DISCIPLINAS, setDisciplinasLista] = useState([]);
  useEffect(() => {
    getDisciplinasProjeto()
      .then(r => setDisciplinasLista(r.data))
      .catch(() => toast.error('Não foi possível carregar a lista de disciplinas'));
  }, []);
  // obra da análise nova (2.0): vem pré-selecionada de /obras?aba=analise&obra=ID
  const [busca, setBusca] = useSearchParams();
  const obraDaUrl = Number(busca.get('obra')) || null;
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);
  const [analise, setAnalise] = useState(null);
  // Cliente do cadastro (2.39): o escolhido na lista (analise.clienteId) manda; análise antiga sem
  // ele liga só pelo nome IGUAL ao de um único cliente (a mesma regra do editor de proposta).
  const clientes = useClientes();
  const clienteIdDaAnalise = analise
    ? (analise.clienteId ?? clientePorNome(clientes, analise.cliente)?.id ?? null)
    : null;
  const [gerando, setGerando] = useState(false);
  const [gerandoOrcamento, setGerandoOrcamento] = useState(false);
  const [versaoLista, setVersaoLista] = useState(0); // muda para a lista de análises recarregar
  const {
    salvarAgora, salvando, salvoEm, setSalvoEm, registrarCarregada, esquecerAtual, gravarPendente,
  } = useSalvamentoAnalise(analise, clienteIdDaAnalise);

  const popularAnalise = useCallback((dados) => {
    const servicosComId = dados.servicos.map(s => ({ ...s, id: gerarId() }));
    const materiaisComId = dados.materiais.map(m => ({ ...m, id: gerarId() }));
    setAnalise({
      ...dados,
      servicos: servicosComId,
      materiais: materiaisComId,
    });
    registrarCarregada(dados);
    // A pesquisa de mercado que já tinha ficado salva num item
    // (pesquisa_mercado, de antes do editor único) continua aparecendo aqui,
    // recolhida e só como informação (ver TabelaItensLeitura); o editor da
    // proposta também a reaproveita.
  }, [registrarCarregada]);

  useEffect(() => {
    // Trocou de análise com edição esperando o autosave (< 1,5 s): grava a
    // anterior AGORA (useSalvamentoAnalise.gravarPendente).
    gravarPendente();
    if (!idParam) {
      esquecerAtual();
      setAnalise(null);
      return;
    }
    let cancelado = false; // resposta de uma análise que já não é a pedida não entra na tela
    setCarregandoAnalise(true);
    getAnaliseProjeto(idParam)
      .then(res => { if (!cancelado) popularAnalise(res.data); })
      .catch(() => {
        if (cancelado) return;
        toast.error('Análise não encontrada');
        navigate('/obras?aba=analise');
      })
      .finally(() => { if (!cancelado) setCarregandoAnalise(false); });
    return () => { cancelado = true; };
  }, [idParam, navigate, popularAnalise, gravarPendente, esquecerAtual]);

  // volta para a aba de análise (envio novo). Antes ia para /obras, que abre a
  // aba "Obras" — e a aba "Análise de projeto", já marcada, não reage ao clique.
  function novaAnalise() {
    navigate('/obras?aba=analise');
    setSalvoEm(null);
  }

  // cliente escolhido da lista (id) ou nome novo (id null) — components/CampoCliente.js
  function atualizarCliente({ id, nome }) {
    setAnalise(a => ({ ...a, cliente: nome, clienteId: id }));
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
      // nome do servidor (com acento); o montado aqui é só a reserva
      const nomeCliente = (analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      await baixarArquivo(gerarRelatorioCompatibilizacao(analise.id), `Compatibilizacao_${nomeCliente}.pdf`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao gerar relatório'));
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
      const { propostaId, numero, criada, semQuantidade, pontosCadSemConferir } = res.data;
      setAnalise(a => ({ ...a, propostaId, propostaNumero: numero }));
      toast.success(criada ? `Orçamento ${numero} criado a partir desta análise` : `Orçamento ${numero} atualizado com os itens desta análise`, {
        duration: 6000,
        icon: criada ? '🧾' : '🔄',
      });
      // a mensagem do servidor manda "preencher na análise", que não edita mais quantidade
      if (semQuantidade) {
        toast(`${semQuantidade} item(ns) com quantidade 0 ficaram fora do rascunho — o editor lista esses itens para incluir com a quantidade certa.`, { duration: 10000, icon: '⚠️' });
      }
      if (pontosCadSemConferir > 0) {
        toast(`${pontosCadSemConferir} ponto(s) do desenho (CAD) ainda não foram conferidos no "Mapa do CAD" e ficaram fora do orçamento. Confira o mapa e reprocesse a análise para incluí-los.`, { duration: 12000, icon: '⚠️' });
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

  // itens que o "Gerar orçamento" deixa de fora (quantidade 0, fora do "Já pronto")
  const foraPorQuantidade = analise
    ? [...analise.servicos, ...analise.materiais].filter(x => !x.pronto && !(Number(x.quantidade) > 0)).length
    : 0;
  const abrirNoEditor = () => navigate(`/propostas/editar/${analise.propostaId}`);

  // Finalidade (2.1) e as disciplinas da análise que têm skill (podem virar projeto)
  const elaboracao = analise?.finalidade === 'elaboracao';
  const temPlantaCad = !!analise && (analise.dadosExtraidos || []).some(d => d?.mapa_cad);
  const disciplinasComSkill = analise ? [...new Map(DISCIPLINAS
    .filter(d => d.skill && (analise.disciplinas || []).includes(d.chave))
    .map(d => [d.skill, d])).values()] : [];
  const projetoDa = (skill) => (analise?.projetos || []).find(p => p.disciplina === skill && p.tipo === 'projeto');

  // ── Tela única (2.48): aba aberta (?vista=projeto|itens|pendencias, para o voltar do navegador e o link) e o painel
  // do "⋯ Mais". A aba de entrada é a do trabalho de cada finalidade: o projeto na Elaboração, os itens no Orçamento.
  const vista = ['projeto', 'itens', 'pendencias'].includes(busca.get('vista')) ? busca.get('vista') : (elaboracao ? 'projeto' : 'itens');
  const trocarVista = (v) => setBusca(p => { const n = new URLSearchParams(p); n.set('vista', v); return n; }, { replace: true });
  const [painel, setPainel] = useState(null);
  useEffect(() => { setPainel(null); }, [analise?.id]);
  const [semQuantidade, setSemQuantidade] = useState(0); // muda para a aba Itens abrir no filtro "Sem quantidade"

  const temObjetivo = !!analise && (analise.dadosExtraidos || []).some(e => e?.objetivo);
  const itensMais = analise ? [
    { chave: 'pasta', testid: 'mais-pasta', icone: <FolderOpen size={14} />, rotulo: 'Pasta da análise', detalhe: 'Caminho e arquivos no servidor', onClick: () => setPainel('pasta') },
    { chave: 'objetivo', testid: 'mais-objetivo', icone: <Target size={14} />, rotulo: 'O que é o projeto', detalhe: 'Vistas, legendas e componentes lidos do desenho', desabilitado: !temObjetivo, onClick: () => setPainel('objetivo') },
    { chave: 'funcionamento', testid: 'mais-funcionamento', icone: <FileText size={14} />, rotulo: 'Funcionamento do projeto', detalhe: 'Texto que vai para o relatório', onClick: () => setPainel('funcionamento') },
    { chave: 'biblioteca', testid: 'mais-biblioteca', icone: <BookOpen size={14} />, rotulo: 'Biblioteca de blocos do CAD', detalhe: 'Exportar ou importar o que o sistema aprendeu (JSON)', onClick: () => setPainel('biblioteca') },
    { separador: true },
    { chave: 'nova', testid: 'mais-nova', icone: <FilePlus2 size={14} />, rotulo: 'Nova análise', onClick: novaAnalise },
  ] : [];
  // (o painel do objetivo já traz o próprio título)
  const TITULO_PAINEL = { pasta: 'Pasta da análise', objetivo: '', funcionamento: 'Funcionamento do projeto', biblioteca: 'Biblioteca de blocos do CAD' };

  // resumo numa linha (no lugar dos 4–5 quadros grandes de números)
  const resumo = (() => {
    if (!analise) return [];
    const pavs = new Set((analise.ambientes || []).map(a => a?.pavimento).filter(Boolean)).size;
    const sugeridos = (analise.dadosExtraidos || []).reduce((t, e) => t + (Number(e?.projeto_sugerido?.componentes) || 0), 0);
    const nPend = (analise.achados || []).length + (analise.conflitos || []).length;
    const partes = [{ texto: `${analise.ambientes.length} ambiente(s)${pavs > 1 ? ` em ${pavs} pavimentos` : ''}` }];
    if (sugeridos) partes.push({ texto: `${sugeridos} componente(s) no projeto sugerido` });
    if (analise.disciplinas?.includes('cftv') && analise.cameras?.total) partes.push({ texto: `${analise.cameras.total} câmera(s) CAMnº` });
    if (analise.disciplinas?.includes('rede') && analise.pontosRedeAntena?.rede?.total) partes.push({ texto: `${analise.pontosRedeAntena.rede.total} ponto(s) de rede Rnº` });
    if (analise.disciplinas?.includes('antena') && analise.pontosRedeAntena?.antena?.total) partes.push({ texto: `${analise.pontosRedeAntena.antena.total} ponto(s) de TV Anº` });
    partes.push({ texto: `${analise.servicos.length + analise.materiais.length} item(ns)` });
    partes.push(nPend ? { texto: `${nPend} pendência(s)`, cor: '#e0a030' } : { texto: 'sem pendências' });
    if (!elaboracao) partes.push({ texto: `estimativa ${formatarMoeda(estimativaDa(analise).total)}`, cor: '#c9a227' });
    return partes;
  })();
  const nPendencias = analise ? (analise.achados || []).length + (analise.conflitos || []).length + (foraPorQuantidade > 0 ? 1 : 0) : 0;

  const regerarProjeto = async (criterios) => {
    // 2.46: o projeto sugerido de novo com os critérios escolhidos — análise nova (a atual continua salva)
    try {
      const r = await reprocessarMapaCad(analise.id, { criterios });
      toast.success('Projeto gerado de novo com os critérios escolhidos — análise nova gravada; a anterior continua salva.', { duration: 7000 });
      navigate(`/obras/analise/${r.data.id}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui gerar o projeto de novo'), { duration: 10000 });
    }
  };
  const mapa = analise && <MapaCad key={`${analise.id}-${analise.versao ?? 0}`} analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} />;
  const cartao3d = analise && <div id="cartao-3d-analise"><CartaoModelo3dAnalise compacto key={`3d-${analise.versao ?? 0}`} analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} /></div>;

  return (
    <div>
      {!analise && !carregandoAnalise && (
        <>
          <div style={card} data-testid="nova-analise">
            <h3 style={{ ...tituloSecao, marginBottom: 12 }}>Enviar o projeto para análise</h3>
            {/* 2.3: o mesmo bloco da página da obra (aba Análises) — components/analise/EnviarParaAnalise.js */}
            <EnviarParaAnalise obraInicial={obraDaUrl} disciplinas={DISCIPLINAS}
              onCriada={(a) => { popularAnalise(a); navigate(`/obras/analise/${a.id}`); setVersaoLista(v => v + 1); }} />
          </div>
          <div style={card}>
            <h3 style={tituloSecao}>Análises salvas</h3>
            {/* 2.3: a mesma lista da obra (components/analise/ListaAnalises.js), com busca e páginas. 2.48: só aqui, sem
                análise aberta — com uma aberta, o ← do cabeçalho volta para cá */}
            <AnalisesSalvas disciplinas={DISCIPLINAS} ativaId={null} versao={versaoLista} />
          </div>
        </>
      )}

      {carregandoAnalise && (
        <div style={card}><p style={{ fontSize: 13, color: 'var(--texto-3)' }}>Carregando análise...</p></div>
      )}

      {analise && !carregandoAnalise && (
        <>
          <CabecalhoAnalise
            analise={analise} clientes={clientes} clienteIdDaAnalise={clienteIdDaAnalise} elaboracao={elaboracao}
            salvando={salvando} salvoEm={salvoEm} resumo={resumo} itensMais={itensMais}
            onNomeProjeto={atualizarNomeProjeto} onCliente={atualizarCliente} onFinalidade={alterarFinalidade} onVoltar={novaAnalise}
          />

          {painel && (
            <PainelMais titulo={TITULO_PAINEL[painel]} onFechar={() => setPainel(null)}>
              {painel === 'pasta' && <PainelPasta carregar={carregarPasta} abrir={abrirPasta} atualizarQuando={salvoEm} />}
              {painel === 'objetivo' && <ObjetivoDoProjeto analise={analise} estiloCartao={{}} estiloTitulo={{ display: 'none' }} />}
              {painel === 'funcionamento' && <CampoFuncionamento valor={analise.funcionamento} onMudar={atualizarFuncionamento} />}
              {painel === 'biblioteca' && <BibliotecaBlocos />}
            </PainelMais>
          )}

          {/* 2.47: o engenheiro escreve o que mudar; a mesma análise é recalculada (só com planta do CAD) */}
          {temPlantaCad && <InstrucoesDaAnalise analise={analise} onAtualizada={popularAnalise} />}

          <AbasAnalise ativa={vista} onTrocar={trocarVista} abas={[
            { chave: 'projeto', rotulo: 'Projeto' },
            { chave: 'itens', rotulo: 'Itens e valores', n: analise.servicos.length + analise.materiais.length },
            { chave: 'pendencias', rotulo: 'Pendências', n: nPendencias, alerta: true },
          ]} />

          {/* Projeto: na Elaboração, o projeto sugerido por pavimento e o 3D vêm primeiro e a leitura do desenho (mapa do
              CAD) fica recolhida; no Orçamento, o mapa do CAD vem primeiro — é nele que os pontos entram no orçamento */}
          {vista === 'projeto' && (
            <div data-testid="aba-projeto">
              <ProjetoSugerido analise={analise} estiloCartao={card} estiloTitulo={tituloSecao}
                onVer3d={() => document.getElementById('cartao-3d-analise')?.scrollIntoView({ behavior: 'smooth' })}
                onRegerar={elaboracao ? regerarProjeto : undefined} />
              {elaboracao ? (
                <>
                  {cartao3d}
                  <PavimentosDaAnalise analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />
                  {temPlantaCad && (
                    <details style={{ ...card, padding: '12px 18px' }} data-testid="detalhes-leitura">
                      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--texto-2)' }}>Mapa do CAD — o que o sistema leu do desenho</summary>
                      <div style={{ marginTop: 12 }}>{mapa}</div>
                    </details>
                  )}
                </>
              ) : (
                <>
                  {mapa}
                  <PavimentosDaAnalise analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />
                  {cartao3d}
                </>
              )}
            </div>
          )}

          {vista === 'itens' && (
            <div style={card}>
              <ItensEValores key={semQuantidade} filtroInicial={semQuantidade ? 'sem_qtd' : 'todos'} analise={analise} disciplinas={DISCIPLINAS} elaboracao={elaboracao}
                onPronto={alternarPronto} onAbrirNoEditor={abrirNoEditor}
                pontos={{ onAtualizar: atualizarPontoDisciplina, onRemover: removerPontoDisciplina, onAdicionar: adicionarPontoDisciplina }} />
            </div>
          )}

          {vista === 'pendencias' && (
            <div style={card}>
              <Pendencias analise={analise} foraPorQuantidade={foraPorQuantidade}
                onVerSemQuantidade={() => { setSemQuantidade(n => n + 1); trocarVista('itens'); }} />
            </div>
          )}

          <BarraAcoesAnalise
            analise={analise} elaboracao={elaboracao} foraPorQuantidade={foraPorQuantidade}
            gerandoOrcamento={gerandoOrcamento} gerando={gerando}
            onAbrirNoEditor={abrirNoEditor} onGerarOrcamento={gerarOrcamento} onBaixarRelatorio={baixarRelatorio}
            disciplinasComSkill={disciplinasComSkill} projetoDa={projetoDa} criandoProjeto={criandoProjeto} onElaborar={elaborarProjeto}
          />
        </>
      )}
    </div>
  );
}
