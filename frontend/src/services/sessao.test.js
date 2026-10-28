import {
  ouvirSessao, aguardarNovoLogin, novoLoginConcluido, desistirDoNovoLogin, sessaoAguardandoLogin, temOuvinteSessao,
} from './sessao';

describe('sessão vencida (401) sem sair da tela', () => {
  test('vários pedidos recusados esperam o MESMO login e seguem depois dele', async () => {
    const eventos = [];
    const tirar = ouvirSessao(e => eventos.push(e.tipo));
    expect(temOuvinteSessao()).toBe(true);
    const a = aguardarNovoLogin();
    const b = aguardarNovoLogin();
    expect(a).toBe(b);
    expect(sessaoAguardandoLogin()).toBe(true);
    novoLoginConcluido();
    await expect(a).resolves.toBeUndefined();
    expect(sessaoAguardandoLogin()).toBe(false);
    expect(eventos).toEqual(['expirou', 'renovada']);
    tirar();
  });

  test('desistir rejeita os pedidos que esperavam e avisa "encerrada"', async () => {
    const eventos = [];
    const tirar = ouvirSessao(e => eventos.push(e.tipo));
    const p = aguardarNovoLogin();
    desistirDoNovoLogin();
    await expect(p).rejects.toMatchObject({ sessaoEncerrada: true });
    expect(eventos).toEqual(['expirou', 'encerrada']);
    tirar();
    expect(temOuvinteSessao()).toBe(false);
  });
});
