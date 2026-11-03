import { act } from 'react';
import { createRoot } from 'react-dom/client';
import PixSemObra from './PixSemObra';
import { getPixSemObra } from '../../services/api';

// Pix sem obra: a sugestão mostra de onde vem a confiança ('alta' = nota fiscal ligada; 'media' = cadastro).
jest.mock('../../services/api', () => ({ getPixSemObra: jest.fn(), atribuirPixObra: jest.fn() }));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getPixSemObra.mockReset();
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const grupo = (chave, sugestao) => ({ tipo: 'recebido', chave, nome: chave.toUpperCase(), n: 1, total: 1000, de: '2026-10-05', ate: '2026-10-05', sugestao });
const obra = { id: 7, codigo: 'OB-007', nome: 'Hospital' };

test('selo de confiança: alta pela nota, "confira" pelo cadastro, nenhum quando só há candidatas', async () => {
  getPixSemObra.mockResolvedValue({ data: {
    resumo: { recebido: { n: 3, valor: 3000 }, realizado: { n: 0, valor: 0 } },
    obras: [obra],
    grupos: [
      grupo('pela nota', { obra_id: 7, obra, motivo: 'o Pix está ligado a uma nota desta obra', confianca: 'alta' }),
      grupo('pelo cadastro', { obra_id: 7, obra, motivo: 'o pagador é o cliente desta obra', confianca: 'media' }),
      grupo('duas obras', { obra_id: null, candidatas: [obra], motivo: 'o pagador é cliente de mais de uma obra' }),
    ],
  } });
  await act(async () => { raiz.render(<PixSemObra />); });
  const abrir = [...caixa.querySelectorAll('button')].find(b => b.textContent.includes('Ligar às obras'));
  await act(async () => { abrir.click(); });
  const alta = document.querySelectorAll('[data-testid="confianca-alta"]');
  const media = document.querySelectorAll('[data-testid="confianca-media"]');
  expect(alta).toHaveLength(1);
  expect(alta[0].textContent).toBe('confiança alta');
  expect(alta[0].title).toMatch(/nota fiscal/);
  expect(media).toHaveLength(1);
  expect(media[0].textContent).toBe('confira');
  expect(document.body.textContent).toContain('Sugestão: OB-007 — o Pix está ligado a uma nota desta obra.');
  expect(document.body.textContent).toContain('o pagador é cliente de mais de uma obra: OB-007.');
});
