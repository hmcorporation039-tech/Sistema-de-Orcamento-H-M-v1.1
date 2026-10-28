import { useState } from 'react';
import { formatarMoeda } from '../utils/format';
import { paraNumeroBR } from '../utils/dinheiro';

// Converte texto digitado em formato brasileiro num número — a MESMA regra do
// paraNumeroBR do backend (utils/dinheiro.js): "1.150,50" e "1150,5" com
// vírgula decimal; "1.150" e "1.150.000" são milhar (antes viravam 1,15 e 0);
// "12.5" sem vírgula é decimal. Símbolos (R$, espaços) são ignorados.
export function paraNumero(texto) {
  const limpo = String(texto || '').trim().replace(/[^\d,.-]/g, '');
  return paraNumeroBR(limpo) ?? 0;
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
