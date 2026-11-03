import { dataBr, paraIso, hojeIso, validarCpfCnpj } from './format';

// Datas num lugar só (antes cada componente tinha a sua cópia, e a de VencimentosLaudos quebrava com nulo)
test('dataBr: ISO vira DD/MM/AAAA sem mudar de dia pelo fuso; vazio ou nulo vira texto vazio', () => {
  expect(dataBr('2026-11-02')).toBe('02/11/2026');
  expect(dataBr('2026-11-02T23:30:00-03:00')).toBe('02/11/2026');
  expect(dataBr(null)).toBe('');
  expect(dataBr(undefined)).toBe('');
  expect(dataBr('')).toBe('');
});

test('paraIso e hojeIso usam o dia do calendário local', () => {
  expect(paraIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(hojeIso()).toBe(paraIso(new Date()));
});

test('validarCpfCnpj escolhe CPF ou CNPJ pela quantidade de dígitos', () => {
  expect(validarCpfCnpj('529.982.247-25')).toBe(true);
  expect(validarCpfCnpj('11.222.333/0001-81')).toBe(true);
  expect(validarCpfCnpj('11.222.333/0001-80')).toBe(false);
  expect(validarCpfCnpj('123')).toBe(false);
});
