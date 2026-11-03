import { dataBr, paraIso, hojeIso, validarCpfCnpj, formatarMoeda, dataHoraBr, FUSO_BRASILIA } from './format';

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

// Dinheiro e datas num lugar só (OP-09): as variações que as telas já mostravam viraram opções
test('formatarMoeda: sem opção, nulo vira R$ 0,00; com vazio, nulo e texto vazio mostram o traço', () => {
  expect(formatarMoeda(1234.5)).toMatch(/^R\$\s1\.234,50$/);
  expect(formatarMoeda('1234.5')).toBe(formatarMoeda(1234.5));
  expect(formatarMoeda(null)).toMatch(/^R\$\s0,00$/);
  expect(formatarMoeda(undefined)).toMatch(/^R\$\s0,00$/);
  expect(formatarMoeda(null, { vazio: '—' })).toBe('—');
  expect(formatarMoeda(undefined, { vazio: '—' })).toBe('—');
  expect(formatarMoeda('', { vazio: '—' })).toBe('—');
  expect(formatarMoeda(0, { vazio: '—' })).toMatch(/^R\$\s0,00$/);   // zero é valor, não "sem valor"
  expect(formatarMoeda(-50, { vazio: '—' })).toMatch(/^-R\$\s50,00$/);
});

test('dataBr: o texto do vazio é opção (traço na página do cliente, "Sem data" no campo)', () => {
  expect(dataBr(null, { vazio: '—' })).toBe('—');
  expect(dataBr('', { vazio: 'Sem data' })).toBe('Sem data');
  expect(dataBr('2026-11-02', { vazio: '—' })).toBe('02/11/2026');
});

test('dataHoraBr: data e hora, só a data, sem o ano, no fuso de Brasília e o texto do vazio', () => {
  const local = new Date(2026, 10, 2, 21, 48, 5);
  expect(dataHoraBr(local)).toBe('02/11/2026, 21:48');
  expect(dataHoraBr(local)).toBe(local.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }));   // a das OS
  expect(dataHoraBr(local, { hora: false })).toBe(local.toLocaleDateString('pt-BR'));
  expect(dataHoraBr(local, { hora: false })).toBe('02/11/2026');
  expect(dataHoraBr(local, { ano: false })).toBe('02/11, 21:48');
  // 00:48 UTC do dia 3 ainda é dia 2 em Brasília
  expect(dataHoraBr('2026-11-03T00:48:00Z', { fuso: FUSO_BRASILIA })).toBe('02/11/2026, 21:48');
  expect(dataHoraBr(local.toISOString())).toBe('02/11/2026, 21:48');
  expect(dataHoraBr(null)).toBe('—');
  expect(dataHoraBr('')).toBe('—');
  expect(dataHoraBr('não é data')).toBe('—');
  expect(dataHoraBr(undefined, { vazio: '' })).toBe('');
});
