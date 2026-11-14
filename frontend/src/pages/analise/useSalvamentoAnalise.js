import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { atualizarAnaliseProjeto } from '../../services/api';

// Salvamento automático da Análise de Projeto (saiu de pages/AnaliseProjeto.js em 2.39, sem
// mudar o funcionamento). Salva automaticamente as edições (cliente, serviços, materiais) — é
// exatamente o que resolve a análise sumir ao trocar de tela: a partir do momento em que existe
// um id (a análise já foi persistida), toda edição vira uma gravação no banco, não só um estado
// do React.
//
// Devolve:
//   salvarAgora()           grava já (em fila) e devolve a promessa — antes de gerar PDF/orçamento
//   salvando, salvoEm, setSalvoEm
//   registrarCarregada(d)   a análise `d` acabou de chegar do servidor (versão, conflito, "Salvo às")
//   esquecerAtual()         nenhuma análise aberta
//   gravarPendente()        trocou de análise com edição esperando o autosave: grava a anterior agora
export default function useSalvamentoAnalise(analise, clienteIdDaAnalise) {
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const idAutosaveRef = useRef(null);
  const pendenteRef = useRef(false); // há edição aguardando o autosave disparar
  // Versão gravada no servidor (bloqueio otimista), POR ANÁLISE. Em ref, não
  // em estado: mudar a versão não pode disparar outro autosave. Era uma só:
  // a gravação da análise A terminando depois de abrir a B punha a versão de A
  // no lugar da de B, e a próxima gravação de B dava 409 falso (revisão de 11/2026).
  const versoesRef = useRef(new Map()); // id → versão
  const filaSalvarRef = useRef(Promise.resolve()); // gravações em sequência, cada uma com a versão da anterior
  const conflitosRef = useRef(new Set()); // ids que outra pessoa gravou: para o autosave até recarregar
  const idAtualRef = useRef(null); // análise aberta agora (resposta de outra não mexe na tela)

  const registrarCarregada = useCallback((dados) => {
    idAtualRef.current = dados.id ?? null;
    versoesRef.current.set(dados.id, dados.versao ?? null);
    conflitosRef.current.delete(dados.id);
    setSalvoEm(dados.atualizadoEm ? new Date(dados.atualizadoEm) : null);
  }, []);

  const esquecerAtual = useCallback(() => { idAtualRef.current = null; }, []);

  const salvarAgora = useCallback(() => {
    if (!analise?.id || conflitosRef.current.has(analise.id)) return Promise.resolve();
    const id = analise.id;
    const corpo = {
      cliente_nome: analise.cliente,
      // 2.39: cliente escolhido da lista (ver clienteIdDaAnalise). O servidor ainda não grava
      // este campo no PUT /projetos/analises/:id — ignora até ser implementado lá.
      cliente_id: clienteIdDaAnalise ?? null,
      nome_projeto: analise.nomeProjeto ?? '',
      servicos: analise.servicos.map(({ id: _id, ...s }) => s),
      materiais: analise.materiais.map(({ id: _id, ...m }) => m),
      funcionamento: analise.funcionamento ?? '',
      pontos_por_disciplina: analise.pontosPorDisciplina ?? [],
      finalidade: analise.finalidade || 'orcamento',
    };
    // em fila: duas gravações ao mesmo tempo mandariam a mesma versão e a
    // segunda seria recusada como conflito (falso alarme)
    // A versão e o conflito são os DESTA análise (id): a gravação pode
    // terminar depois de o usuário abrir outra.
    filaSalvarRef.current = filaSalvarRef.current.then(async () => {
      if (conflitosRef.current.has(id)) return;
      setSalvando(true);
      try {
        const res = await atualizarAnaliseProjeto(id, { ...corpo, versao: versoesRef.current.get(id) ?? null });
        versoesRef.current.set(id, res.data?.versao ?? null);
        if (idAtualRef.current === id) setSalvoEm(new Date());
      } catch (err) {
        if (err.response?.status === 409) {
          conflitosRef.current.add(id);
          toast.error(err.response.data?.erro || 'A análise foi alterada em outro lugar. Recarregue a página.', { duration: 15000 });
        } else if (err.response?.status === 403 && err.response?.data?.codigo !== 'SENHA_PROVISORIA') {
          // análise de outro usuário (posse): não desloga mais; para o
          // salvamento automático e diz por quê
          conflitosRef.current.add(id);
          toast.error(`${err.response.data?.erro || 'Você não pode alterar esta análise.'} As alterações feitas aqui não são gravadas.`, { duration: 15000 });
        } else if (!err.sessaoEncerrada) {
          toast.error(err.response?.data?.erro || 'Erro ao salvar automaticamente — tente novamente em instantes');
        }
      } finally {
        setSalvando(false);
      }
    });
    return filaSalvarRef.current;
  }, [analise?.id, analise?.cliente, clienteIdDaAnalise, analise?.nomeProjeto, analise?.servicos, analise?.materiais, analise?.funcionamento, analise?.pontosPorDisciplina, analise?.finalidade]);

  // Reseta o "já assentou" toda vez que o id muda (nova análise carregada) —
  // assim a primeira renderização de cada análise não dispara um autosave à toa.
  useEffect(() => { idAutosaveRef.current = null; }, [analise?.id]);

  // Mantém a última versão da função de salvar acessível ao efeito de saída
  // abaixo, sem reativar o debounce a cada digitada.
  const salvarAgoraRef = useRef(salvarAgora);
  useEffect(() => { salvarAgoraRef.current = salvarAgora; }, [salvarAgora]);

  // Trocou de análise com edição esperando o autosave (< 1,5 s): grava a
  // anterior AGORA. O timer dela é cancelado quando a nova chega e o
  // "salvar ao sair" só roda ao desmontar — a edição se perdia. Quem chama
  // (a carga da análise) ainda tem a função de salvar da anterior.
  const gravarPendente = useCallback(() => {
    if (pendenteRef.current) {
      pendenteRef.current = false;
      salvarAgoraRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!analise?.id) return;
    if (idAutosaveRef.current !== analise.id) {
      idAutosaveRef.current = analise.id;
      return;
    }
    pendenteRef.current = true;
    const timer = setTimeout(() => { pendenteRef.current = false; salvarAgora(); }, 1500);
    return () => clearTimeout(timer);
    // dispara só quando o CONTEÚDO muda (não a cada nova função de salvar)
  }, [analise?.servicos, analise?.materiais, analise?.cliente, analise?.clienteId, analise?.nomeProjeto, analise?.funcionamento, analise?.pontosPorDisciplina, analise?.finalidade]); // eslint-disable-line

  // Salva o que ficou pendente ao sair da tela. O efeito acima cancela o timer
  // quando o componente desmonta, então quem editasse e trocasse de tela em
  // menos de 1,5s perdia a última alteração — justamente no recurso feito para
  // nada se perder. Deps vazias: este cleanup só roda na saída, não a cada
  // digitada.
  useEffect(() => () => {
    if (pendenteRef.current) salvarAgoraRef.current?.();
  }, []);

  return { salvarAgora, salvando, salvoEm, setSalvoEm, registrarCarregada, esquecerAtual, gravarPendente };
}
