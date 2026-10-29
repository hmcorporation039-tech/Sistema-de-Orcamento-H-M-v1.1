// Disciplinas do registro único do sistema (GET /disciplinas ← skills/_comum/disciplinas.js).
// Antes a tela tinha a sua cópia dos nomes (utils/disciplinasServico NOMES_DISCIPLINA).
// Carrega uma vez por sessão da tela; enquanto não chega, os nomes saem pela chave.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRegistroDisciplinas } from '../services/api';

let pedido = null;
const carregar = () => (pedido ||= getRegistroDisciplinas().then(r => r.data).catch((e) => { pedido = null; throw e; }));

export default function useDisciplinas() {
  const [registro, setRegistro] = useState(null);
  useEffect(() => {
    let vivo = true;
    carregar().then(r => { if (vivo) setRegistro(r); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  // todas = disciplinas + "outros" (a base de serviços e os kits têm "outros")
  const todas = useMemo(() => (registro ? [...registro.disciplinas, registro.outros] : []), [registro]);
  // nome da disciplina na base de serviços de mão de obra (tela de preços, composições, orçamento)
  const nomeServico = useCallback((chave) => todas.find(d => d.chave === (chave || 'outros'))?.nomes?.servico || chave, [todas]);
  return { carregado: !!registro, disciplinas: registro?.disciplinas || [], todas, nomeServico };
}
