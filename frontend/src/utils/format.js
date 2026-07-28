export function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarNcm(v) {
  const digitos = String(v || '').replace(/\D/g, '');
  if (digitos.length !== 8) return v || '';
  return `${digitos.slice(0, 4)}.${digitos.slice(4, 6)}.${digitos.slice(6, 8)}`;
}

export function formatarData(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Padrão brasileiro DDD + 9 dígitos: (XX) XXXXX-XXXX
export function formatarTelefone(v) {
  const digitos = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (resto.length <= 5) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}
