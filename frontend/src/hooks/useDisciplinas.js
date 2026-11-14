// Disciplinas do registro único do sistema (GET /disciplinas ← skills/_comum/disciplinas.js).
// Antes a tela tinha a sua cópia dos nomes (utils/disciplinasServico NOMES_DISCIPLINA).
// Carrega uma vez por sessão da tela; enquanto não chega, os nomes saem pela chave.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRegistroDisciplinas } from '../services/api';

let pedido = null;
// Promise.resolve().then: um erro síncrono do pedido também vira rejeição (a tela segue com as chaves como nome)
const carregar = () => (pedido ||= Promise.resolve().then(() => getRegistroDisciplinas()).then(r => r.data).catch((e) => { pedido = null; throw e; }));

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
  // nome curto e cor (2.37): os mesmos da legenda do 3D — a paleta de componentes, o marcador inserido e o Mapa do
  // CAD usavam tabelas próprias, com cores diferentes das do modelo. Aceita os nomes antigos ('controle-acesso',
  // 'veicular') e a iluminação externa.
  const visual = useCallback((chave) => {
    if (!registro) return null;
    const k = registro.aliases?.[chave] || chave;
    return registro.disciplinas.find(d => d.chave === k) || (registro.extras || []).find(d => d.chave === k) || null;
  }, [registro]);
  const nomeCurto = useCallback((chave) => visual(chave)?.curto || chave, [visual]);
  const cor = useCallback((chave, padrao = '#c9a227') => visual(chave)?.cor || padrao, [visual]);
  return { carregado: !!registro, disciplinas: registro?.disciplinas || [], todas, nomeServico, nomeCurto, cor };
}
