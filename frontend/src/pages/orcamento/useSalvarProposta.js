import { useState } from 'react';
import toast from 'react-hot-toast';
import { criarProposta, atualizarProposta, getProposta, duplicarProposta } from '../../services/api';
import { apagarRascunho } from './apoio';
import { montarPayload, problemaParaSalvar } from './calculos';
import { guardarTransporte } from './transporte';

// Salvar a proposta (saiu do Orcamento.js em 2.40, sem mudar o funcionamento): gravar
// (POST na nova, PUT com a versão na existente — bloqueio otimista), "Salvar como
// cópia", o 409 de conflito e o 403 de proposta de outro usuário, e a troca de URL da
// proposta nova gravada. O estado da proposta continua no editor (recebe os setters);
// aqui fica só o "salvando".
export default function useSalvarProposta({
  form, secoes, itens, clienteId, editandoId, idAtual, propostaSalva, somenteLeitura, sujo, alteracoesPendentes,
  pesquisas, origem, estadoAtual, chaveDoRascunho, versaoRef, liberar, navigate,
  setPropostaSalva, setNumeroEditando, setConflito, setSomenteLeitura, setBase,
}) {
  const [salvando, setSalvando] = useState(false);

  // o cliente aprovou/recusou pelo link: o status (e a versão) mudam no servidor;
  // sem isso o próximo "Salvar" daria conflito de versão à toa
  function atualizarStatusSalvo() {
    if (!propostaSalva) return;
    getProposta(propostaSalva.id).then(res => {
      if (!alteracoesPendentes) versaoRef.current = res.data.versao ?? versaoRef.current;
      setPropostaSalva(ps => (ps ? { ...ps, status: res.data.status } : ps));
    }).catch(() => {});
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
    guardarTransporte({
      id: String(id), form, secoes, itens, pesquisas, origem, propostaSalva: salva,
      numero: salva?.numero || '', versao: versaoRef.current, base: estadoAtual,
    });
    liberar();
    navigate(`/propostas/editar/${id}`, { replace: true });
  }

  async function salvar() {
    if (somenteLeitura) return;
    if (!validarParaSalvar()) return;
    setSalvando(true);
    try {
      const payload = montarPayload(form, secoes, itens, clienteId);
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
      const res = await criarProposta(montarPayload(form, secoes, itens, clienteId));
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

  return { salvando, salvar, salvarComoCopia, atualizarStatusSalvo };
}
