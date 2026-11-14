import { semAcento, chaveBusca, normalizarNome } from './texto';

// "Tirar acento" num lugar só (antes havia sete cópias)
test('semAcento: tira os acentos e mantém maiúsculas e espaços', () => {
  expect(semAcento('Clínica São José ')).toBe('Clinica Sao Jose ');
  expect(semAcento('ELÉTRICA ção')).toBe('ELETRICA cao');
  expect(semAcento(null)).toBe('');
  expect(semAcento(undefined)).toBe('');
  expect(semAcento('')).toBe('');
  expect(semAcento(123)).toBe('123');
});

test('chaveBusca: sem acento e em minúsculas, sem mexer nos espaços', () => {
  expect(chaveBusca(' Elétrica ')).toBe(' eletrica ');
  expect(chaveBusca('ELETRICA')).toBe(chaveBusca('elétrica'));
  expect(chaveBusca(null)).toBe('');
});

test('normalizarNome: também tira os espaços das pontas', () => {
  expect(normalizarNome('  CLÍNICA Boa Saúde ')).toBe('clinica boa saude');
  expect(normalizarNome(undefined)).toBe('');
});
