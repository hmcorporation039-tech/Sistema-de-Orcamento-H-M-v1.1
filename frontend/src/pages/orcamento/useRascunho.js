import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apagarRascunho, chaveRascunho, formVazio, gravarRascunho, lerRascunho, retrato } from './apoio';

// Rascunho da proposta neste navegador (saiu do Orcamento.js em 2.40, sem mudar o
// funcionamento): grava ~1 s depois da última alteração, oferece restaurar ao abrir
// quando o rascunho difere do que veio e restaura/descarta a pedido.
//
// O estado da proposta (form, seções, itens, número, versão) continua no editor; aqui
// fica só o rascunho pendente (o que a tela oferece restaurar).
export default function useRascunho({
  usuarioId, editandoId, sujo, carregandoEdicao, numeroEditando, versaoRef,
  form, secoes, itens, setForm, setSecoes, setItens,
}) {
  // rascunho guardado neste navegador esperando a pessoa decidir (restaurar/descartar)
  const [rascunhoPendente, setRascunhoPendente] = useState(null);
  const chaveDoRascunho = chaveRascunho(usuarioId, editandoId);

  // grava o rascunho ~1 s depois da última alteração (não enquanto a tela
  // oferece restaurar um rascunho anterior — senão ele seria sobrescrito)
  useEffect(() => {
    if (!sujo || rascunhoPendente || carregandoEdicao) return undefined;
    const t = setTimeout(() => gravarRascunho(chaveDoRascunho, {
      salvoEm: new Date().toISOString(), versao: versaoRef.current, numero: numeroEditando || null, form, secoes, itens,
    }), 800);
    return () => clearTimeout(t);
  }, [sujo, rascunhoPendente, carregandoEdicao, chaveDoRascunho, form, secoes, itens, numeroEditando, versaoRef]);

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

  return { rascunhoPendente, setRascunhoPendente, chaveDoRascunho, oferecerRascunho, restaurarRascunho, descartarRascunho };
}
