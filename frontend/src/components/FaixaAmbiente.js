import { useEffect, useState } from 'react';

// Instância de teste (AMBIENTE=teste no .env do backend): faixa no topo, selo
// fixo no canto e "[TESTE]" no título da aba, para ninguém lançar trabalho de
// verdade na cópia de teste achando que é a produção. Em produção não aparece.
export default function FaixaAmbiente() {
  const [ambiente, setAmbiente] = useState(null);

  useEffect(() => {
    fetch('/health').then(r => r.json()).then(j => setAmbiente(j.ambiente || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (ambiente !== 'teste') return;
    if (!document.title.startsWith('[TESTE]')) document.title = `[TESTE] ${document.title}`;
  }, [ambiente]);

  if (ambiente !== 'teste') return null;
  return (
    <>
      <div role="status" style={{
        background: '#b3261e', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center',
        padding: '6px 12px', lineHeight: 1.35,
      }}>
        AMBIENTE DE TESTE — versão 2.0. Nada do que for feito aqui vale para a produção
        (e-mails não são enviados; propostas e números são só de teste).
      </div>
      <div aria-hidden="true" style={{
        position: 'fixed', left: 10, bottom: 10, zIndex: 9999, background: '#b3261e', color: '#fff',
        fontSize: 12, fontWeight: 800, letterSpacing: 1, padding: '4px 10px', borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,.5)', pointerEvents: 'none',
      }}>
        TESTE
      </div>
    </>
  );
}
