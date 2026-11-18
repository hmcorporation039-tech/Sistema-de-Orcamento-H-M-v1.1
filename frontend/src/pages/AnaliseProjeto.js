import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FilePlus2 } from 'lucide-react';
import {
  gerarRelatorioCompatibilizacao, getAnaliseProjeto,
  gerarOrcamentoDaAnalise, getPastaAnalise, abrirPastaAnalise, getDisciplinasProjeto, criarProjetoDeAnalise,
} from '../services/api';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { clientePorNome } from '../components/CampoCliente';
import { useClientes } from '../components/ClienteSelect';
import { CartaoModelo3dAnalise } from '../components/Modelo3d';
import EnviarParaAnalise from '../components/analise/EnviarParaAnalise';
import AnalisesSalvas from '../components/analise/ListaAnalises';
import ConflitosCompatibilizacao from '../components/analise/ConflitosCompatibilizacao';
import MapaCad from '../components/analise/MapaCad';
import ObjetivoDoProjeto from '../components/analise/ObjetivoDoProjeto';
import { ProjetoSugerido, PavimentosDaAnalise } from '../components/analise/ProjetoSugerido';
import { gerarId } from '../utils/ids';
import { card, tituloSecao, btnSecundario } from './analise/estilos';
import useSalvamentoAnalise from './analise/useSalvamentoAnalise';
import {
  CabecalhoAnalise, CartaoEstimativa, CartaoFuncionamento, CartaoPendencias, CartaoProjetos, BarraAcoesAnalise,
} from './analise/CartoesAnalise';
import { CartaoPontosCodificados, CartaoPontosPorDisciplina } from './analise/CartoesPontos';
import ItensExtraidos from './analise/ItensExtraidos';

// As disciplinas vêm do servidor (GET /projetos/disciplinas — fonte única em
// backend/src/utils/disciplinasProjeto.js): cada área de atuação é uma
// disciplina separada, e a lista cresce junto com as skills.

// Análise de projeto (PDF, e na 2.3 também DWG/DXF): compatibilização de projetos. Na versão
// 2.0 vira a aba "Análise de projeto" do hub Obras (pages/hubs/ObrasHub.js).
// Versão 2.1: a análise tem FINALIDADE — "Orçamento" (itens + gerar orçamento)
// ou "Elaboração de projeto" (elaborar o projeto de cada disciplina e
// entregar). Em nenhuma das duas sai laudo: o antigo "Calcular pela norma"
// cria um PROJETO da disciplina (aba "Projetos por disciplina").
// Divisão em 2.39: os cartões estão em pages/analise/ (CartoesAnalise, CartoesPontos,
// ItensExtraidos) e o salvamento automático no gancho useSalvamentoAnalise; aqui ficam a
// carga da análise, as edições e as ações (gerar orçamento, projeto, relatório).
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
  const [busca] = useSearchParams();
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
    <CartaoProjetos principal={principal} disciplinasComSkill={disciplinasComSkill} projetoDa={projetoDa}
      criandoProjeto={criandoProjeto} onElaborar={elaborarProjeto} />
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
        {/* 2.3: a mesma lista da obra (components/analise/ListaAnalises.js), com busca e páginas */}
        <AnalisesSalvas disciplinas={DISCIPLINAS} ativaId={analise?.id} versao={versaoLista}
          onExcluida={(a) => { if (String(analise?.id) === String(a.id)) novaAnalise(); }} />
      </div>

      {!analise && (
        <div style={card} data-testid="nova-analise">
          <h3 style={{ ...tituloSecao, marginBottom: 12 }}>Enviar o projeto para análise</h3>
          {/* 2.3: o mesmo bloco da página da obra (aba Análises) — components/analise/EnviarParaAnalise.js */}
          <EnviarParaAnalise obraInicial={obraDaUrl} disciplinas={DISCIPLINAS}
            onCriada={(a) => { popularAnalise(a); navigate(`/obras/analise/${a.id}`); setVersaoLista(v => v + 1); }} />
        </div>
      )}

      {carregandoAnalise && (
        <div style={card}><p style={{ fontSize: 13, color: 'var(--texto-3)' }}>Carregando análise...</p></div>
      )}

      {analise && !carregandoAnalise && (
        <>
          <CabecalhoAnalise
            analise={analise} clientes={clientes} clienteIdDaAnalise={clienteIdDaAnalise} elaboracao={elaboracao}
            salvando={salvando} salvoEm={salvoEm} tilesResumo={tilesResumo}
            onNomeProjeto={atualizarNomeProjeto} onCliente={atualizarCliente} onFinalidade={alterarFinalidade}
            carregarPasta={carregarPasta} abrirPasta={abrirPasta}
          />

          {/* Elaboração de projeto (2.45): o foco é o projeto sugerido por pavimento, o 3D onde ele é conferido e o
              projeto por disciplina; a leitura técnica do desenho (mapa do CAD, objetivo, itens, pontos codificados)
              fica recolhida — era informação demais, e pouca dela importa para projetar */}
          {elaboracao && (
            <>
              <ProjetoSugerido analise={analise} estiloCartao={card} estiloTitulo={tituloSecao}
                onVer3d={() => document.getElementById('cartao-3d-analise')?.scrollIntoView({ behavior: 'smooth' })} />
              <div id="cartao-3d-analise"><CartaoModelo3dAnalise analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} /></div>
              {cartaoProjetos(true)}
              <PavimentosDaAnalise analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />
              <CartaoPendencias achados={analise.achados} />
              <details style={{ ...card, padding: '10px 16px' }} data-testid="detalhes-leitura">
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--texto-2)' }}>Detalhes da leitura do desenho (mapa do CAD, itens lidos, objetivo)</summary>
                <ObjetivoDoProjeto analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />
                <MapaCad key={analise.id} analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} />
                <ItensExtraidos analise={analise} disciplinas={DISCIPLINAS} elaboracao={elaboracao} onPronto={alternarPronto} />
                <CartaoPontosCodificados analise={analise} />
                <ConflitosCompatibilizacao analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />
              </details>
            </>
          )}

          {!elaboracao && (
            <>
              <CartaoEstimativa analise={analise} resumoOrcamento={resumoOrcamento} onAbrirNoEditor={abrirNoEditor} />

              <CartaoFuncionamento valor={analise.funcionamento} onMudar={atualizarFuncionamento} />

              <CartaoPontosCodificados analise={analise} />

              <CartaoPontosPorDisciplina analise={analise} disciplinas={DISCIPLINAS}
                onAtualizar={atualizarPontoDisciplina} onRemover={removerPontoDisciplina} onAdicionar={adicionarPontoDisciplina} />

              <CartaoPendencias achados={analise.achados} />

              <PavimentosDaAnalise analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />

              <ObjetivoDoProjeto analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />

              <MapaCad key={analise.id} analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} />

              <ItensExtraidos analise={analise} disciplinas={DISCIPLINAS} elaboracao={elaboracao} onPronto={alternarPronto} />

              {/* Orçamento: dimensionar pela norma é opção secundária — cria um PROJETO, não laudo */}
              {disciplinasComSkill.length > 0 && cartaoProjetos(false)}

              {/* 2.3: conflitos de posição entre os DWG/DXF do pacote */}
              <ConflitosCompatibilizacao analise={analise} estiloCartao={card} estiloTitulo={tituloSecao} />

              {/* 2.3: 3D ilustrativo a partir da arquitetura (DWG/DXF) — nas duas finalidades */}
              <CartaoModelo3dAnalise analiseId={analise.id} estiloCartao={card} estiloTitulo={tituloSecao} />
            </>
          )}

          <BarraAcoesAnalise
            analise={analise} elaboracao={elaboracao} foraPorQuantidade={foraPorQuantidade}
            gerandoOrcamento={gerandoOrcamento} gerando={gerando}
            onAbrirNoEditor={abrirNoEditor} onGerarOrcamento={gerarOrcamento} onBaixarRelatorio={baixarRelatorio}
          />
        </>
      )}
    </div>
  );
}
