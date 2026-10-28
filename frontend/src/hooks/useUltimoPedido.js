import { useCallback, useRef } from 'react';

// Busca enquanto digita: só a resposta do ÚLTIMO pedido vale. Sem isso, uma
// resposta mais lenta de uma busca antiga chegava depois e sobrescrevia a
// lista certa ("ab" depois de "abc").
//   const novoPedido = useUltimoPedido();
//   const vale = novoPedido();  ...  const res = await …;  if (!vale()) return;
export default function useUltimoPedido() {
  const ultimo = useRef(0);
  return useCallback(() => {
    const n = ++ultimo.current;
    return () => n === ultimo.current;
  }, []);
}
