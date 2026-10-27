import { novoUuid, uuidDeBytes, RE_UUID } from './uuid';

test('usa crypto.randomUUID quando existe (contexto seguro)', () => {
  expect(novoUuid({ randomUUID: () => 'fixo' })).toBe('fixo');
});

test('sem randomUUID (HTTP da rede local): v4 válido com getRandomValues', () => {
  const vistos = new Set();
  const cripto = { getRandomValues: (b) => { for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256); return b; } };
  for (let i = 0; i < 500; i++) {
    const u = novoUuid(cripto);
    expect(u).toMatch(RE_UUID);
    vistos.add(u);
  }
  expect(vistos.size).toBe(500);
});

test('randomUUID que falha cai na alternativa', () => {
  const u = novoUuid({ randomUUID: () => { throw new Error('inseguro'); }, getRandomValues: b => b.fill(7) });
  expect(u).toMatch(RE_UUID);
});

test('bits de versão e variante', () => {
  expect(uuidDeBytes(new Uint8Array(16).fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(uuidDeBytes(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000');
});
