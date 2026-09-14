import { useState } from 'react';
import { formatarMoeda } from '../utils/format';

// Converte texto digitado em formato brasileiro ("1.150,50", "1150,5" ou só
// "1150") num número — mesma ideia do paraNumeroBR do backend, do lado do
// navegador. Vírgula é sempre o separador decimal; ponto é só milhar.
function paraNumero(texto) {
  const limpo = String(texto || '').trim().replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(limpo) || 0;
}

// Campo de valor monetário: mostra formatado ("R$ 1.150,00") fora de foco, e
// um número simples editável (aceita vírgula como decimal) enquanto o
// usuário digita — um <input type="number"> comum não aceita vírgula nem
// formatação de milhar, então não dava pra mostrar em formato de moeda sem
// travar a digitação.
export default function CampoMoeda({ value, onChange, style, ...props }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={editando ? texto : formatarMoeda(value)}
      onFocus={e => {
        setTexto(value ? String(value).replace('.', ',') : '');
        setEditando(true);
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={e => {
        setTexto(e.target.value);
        onChange(paraNumero(e.target.value));
      }}
      onBlur={() => setEditando(false)}
      style={{ textAlign: 'right', ...style }}
    />
  );
}
