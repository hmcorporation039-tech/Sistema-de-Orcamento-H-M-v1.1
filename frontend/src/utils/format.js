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

function formatarCpf(digitos) {
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

function formatarCnpj(digitos) {
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  if (digitos.length <= 12) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

// Detecta CPF (até 11 dígitos) ou CNPJ (12 a 14 dígitos) pela quantidade digitada
export function formatarCpfCnpj(v) {
  const digitos = String(v || '').replace(/\D/g, '').slice(0, 14);
  return digitos.length <= 11 ? formatarCpf(digitos) : formatarCnpj(digitos);
}

export function validarCpf(v) {
  const cpf = String(v || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcularDigito(cpf.slice(0, 9));
  const dv2 = calcularDigito(cpf.slice(0, 9) + dv1);
  return cpf === cpf.slice(0, 9) + dv1 + dv2;
}

// Validação oficial do dígito verificador do CNPJ (módulo 11)
export function validarCnpj(v) {
  const cnpj = String(v || '').replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const doze = cnpj.slice(0, 12);
  const dv1 = calcularDigito(doze);
  const treze = doze + dv1;
  const dv2 = calcularDigito(treze);
  return cnpj === treze + dv2;
}

// Valida CPF (11 dígitos) ou CNPJ (14 dígitos) conforme a quantidade de dígitos
export function validarCpfCnpj(v) {
  const digitos = String(v || '').replace(/\D/g, '');
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}
