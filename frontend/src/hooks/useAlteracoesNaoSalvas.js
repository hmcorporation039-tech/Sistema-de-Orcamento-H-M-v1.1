import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

// Alteração não salva na tela: pergunta antes de sair.
//   - fechar/recarregar a aba ou digitar outro endereço: aviso do navegador
//     (beforeunload — o texto é o padrão do navegador);
//   - trocar de tela dentro do sistema (menu, abas, voltar): window.confirm
//     com `mensagem` (useBlocker — por isso o App usa createBrowserRouter).
// Devolve `liberar()`: a própria tela chama antes de navegar depois de gravar
// (o estado "sujo" só muda no próximo render).
export default function useAlteracoesNaoSalvas(sujo, mensagem) {
  const sujoRef = useRef(sujo);
  sujoRef.current = sujo;

  useEffect(() => {
    if (!sujo) return undefined;
    const aoSair = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [sujo]);

  const deveBloquear = useCallback(({ currentLocation, nextLocation }) => sujoRef.current
    && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search), []);
  const bloqueio = useBlocker(deveBloquear);

  useEffect(() => {
    if (bloqueio.state !== 'blocked') return;
    if (window.confirm(mensagem || 'Há alterações não salvas nesta tela. Sair mesmo assim?')) bloqueio.proceed();
    else bloqueio.reset();
  }, [bloqueio, mensagem]);

  return { liberar: useCallback(() => { sujoRef.current = false; }, []) };
}
