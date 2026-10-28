import { criarCacheBlob } from './cacheBlob';

test('miniatura em uso não é revogada; sem uso, só as mais antigas além do limite', () => {
  const revogadas = [];
  const c = criarCacheBlob({ maxLivres: 2, revogar: u => revogadas.push(u) });
  for (const k of ['a', 'b', 'c', 'd']) c.guardar(k, `blob:${k}`);
  expect(revogadas).toEqual([]);
  c.soltar('a'); c.soltar('b'); c.soltar('c');
  expect(revogadas).toEqual(['blob:a']); // 3 livres > 2: a mais antiga sai
  expect(c.pegar('b')).toBe('blob:b'); // voltou a ser usada: sai da lista de livres
  c.soltar('d');
  expect(revogadas).toEqual(['blob:a']);
  c.soltar('b');
  expect(revogadas).toEqual(['blob:a', 'blob:c']);
  expect(c.pegar('a')).toBeNull();
});

test('duas miniaturas da mesma foto carregando juntas: guarda uma, revoga a outra', () => {
  const revogadas = [];
  const c = criarCacheBlob({ revogar: u => revogadas.push(u) });
  expect(c.guardar('f', 'blob:1')).toBe('blob:1');
  expect(c.guardar('f', 'blob:2')).toBe('blob:1');
  expect(revogadas).toEqual(['blob:2']);
  c.soltar('f');
  c.esquecer('f'); // ainda usada por uma
  expect(revogadas).toEqual(['blob:2']);
  c.soltar('f');
  c.esquecer('f');
  expect(revogadas).toEqual(['blob:2', 'blob:1']);
});

test('limpar revoga tudo (sair do app / trocar de usuário)', () => {
  const revogadas = [];
  const c = criarCacheBlob({ revogar: u => revogadas.push(u) });
  c.guardar('x', 'blob:x');
  c.guardar('y', 'blob:y');
  c.soltar('y');
  c.limpar();
  expect(revogadas.sort()).toEqual(['blob:x', 'blob:y']);
  expect(c.tamanho()).toBe(0);
});
