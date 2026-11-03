import { renovarSessao, guardarSessao, temRenovacao, idDispositivo, encerrarNoServidor } from './renovacaoSessao';

// Renovação do token curto (Fase 6): pedidos juntos esperam a MESMA renovação, a chave nova é guardada,
// a recusa do servidor apaga a chave, e sair encerra a sessão no servidor.
const respostaJson = (status, corpo) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(corpo) });

describe('renovação da sessão', () => {
  beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });

  test('dois pedidos ao mesmo tempo fazem uma renovação só e guardam a chave nova', async () => {
    guardarSessao({ token: 't-velho', renovacao: '1.chave-velha' });
    global.fetch.mockImplementation(() => respostaJson(200, { token: 't-novo', renovacao: '1.chave-nova' }));
    const [a, b] = await Promise.all([renovarSessao(), renovarSessao()]);
    expect(a).toBe('t-novo');
    expect(b).toBe('t-novo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ renovacao: '1.chave-velha' });
    expect(localStorage.getItem('hm_token')).toBe('t-novo');
    expect(localStorage.getItem('hm_renovacao')).toBe('1.chave-nova');
  });

  test('resposta sem chave nova (outra aba já renovou) mantém a chave guardada', async () => {
    guardarSessao({ token: 't', renovacao: '1.chave-da-outra-aba' });
    global.fetch.mockImplementation(() => respostaJson(200, { token: 't2' }));
    await renovarSessao();
    expect(localStorage.getItem('hm_renovacao')).toBe('1.chave-da-outra-aba');
    expect(localStorage.getItem('hm_token')).toBe('t2');
  });

  test('sessão encerrada no servidor: rejeita e esquece a chave', async () => {
    guardarSessao({ token: 't', renovacao: '1.chave' });
    global.fetch.mockImplementation(() => respostaJson(401, { erro: 'A sessão terminou.' }));
    await expect(renovarSessao()).rejects.toMatchObject({ status: 401 });
    expect(temRenovacao()).toBe(false);
  });

  test('sem chave guardada nem tenta', async () => {
    await expect(renovarSessao()).rejects.toMatchObject({ semRenovacao: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('o id do navegador é criado uma vez e reaproveitado', () => {
    const id = idDispositivo();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
    expect(idDispositivo()).toBe(id);
  });

  test('sair com o token vencido renova uma vez só para encerrar a sessão', async () => {
    global.fetch
      .mockImplementationOnce(() => respostaJson(401, {}))                                   // /auth/sair com o token vencido
      .mockImplementationOnce(() => respostaJson(200, { token: 't-novo', renovacao: 'x' }))  // /auth/renovar
      .mockImplementationOnce(() => respostaJson(200, { ok: true }));                        // /auth/sair de novo
    await encerrarNoServidor('t-vencido', '1.chave');
    expect(global.fetch.mock.calls.map(c => c[0])).toEqual(['/api/auth/sair', '/api/auth/renovar', '/api/auth/sair']);
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer t-novo');
    expect(localStorage.getItem('hm_token')).toBeNull();   // o token renovado para sair não fica guardado
  });
});
