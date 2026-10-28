import { arred2, arredQtd, totalDaLinha, paraNumeroBR } from './dinheiro';
import { paraNumero } from '../components/CampoMoeda';

// As mesmas regras do servidor (backend/src/utils/calculoProposta.js e
// numeroBR.js). Quando o backend está ao lado (cópia de trabalho), compara
// também com as funções de lá.
let backend = null;
try {
  // eslint-disable-next-line
  const calc = require('../../../backend/src/utils/calculoProposta.js');
  // eslint-disable-next-line
  const nbr = require('../../../backend/src/utils/numeroBR.js');
  backend = { arredondar: calc.arredondar, arredondarQuantidade: calc.arredondarQuantidade, paraNumeroBR: nbr.paraNumeroBR };
} catch { /* frontend sozinho */ }

describe('paraNumeroBR / CampoMoeda', () => {
  const casos = [
    ['1.150', 1150], ['1.150.000', 1150000], ['1.150,50', 1150.5], ['1150,5', 1150.5],
    ['1150', 1150], ['12.5', 12.5], ['12.50', 12.5], ['0,99', 0.99], ['R$ 1.234,56', 1234.56],
  ];
  test.each(casos)('CampoMoeda "%s" → %p', (texto, esperado) => {
    expect(paraNumero(texto)).toBe(esperado);
  });
  test('vazio vira 0 no campo e null na função', () => {
    expect(paraNumero('')).toBe(0);
    expect(paraNumeroBR('')).toBeNull();
  });
  (backend?.paraNumeroBR ? test : test.skip)('igual ao backend', () => {
    for (const t of ['1.150', '1.150.000', '1.150,50', '12.5', '12.50', '0.150', '-1.234', 'abc', '3,']) {
      expect(paraNumeroBR(t)).toEqual(backend.paraNumeroBR(t));
    }
  });
});

describe('arredondamentos da proposta', () => {
  test('linha com unitário de 3 casas: arred2(qtd × arred2(vu))', () => {
    // 3 × 10,555: o PDF usa 10,56 → 31,68 (antes a tela mostrava 31,66/31,67)
    expect(totalDaLinha(3, 10.555)).toBe(31.68);
  });
  test('quantidade com 3 casas antes de multiplicar (como o banco grava)', () => {
    expect(arredQtd(1.0004)).toBe(1);
    expect(arredQtd(1.0005)).toBe(1.001);
    expect(totalDaLinha(1.0004, 1000)).toBe(1000);
  });
  (backend?.arredondarQuantidade ? test : test.skip)('igual ao backend', () => {
    for (const v of [1.0004, 1.0005, 2.675, 0.1 + 0.2, 1e-7, -1.0005, 12345.6785]) {
      expect(arredQtd(v)).toBe(backend.arredondarQuantidade(v));
      expect(arred2(v)).toBe(backend.arredondar(v));
    }
  });
});
