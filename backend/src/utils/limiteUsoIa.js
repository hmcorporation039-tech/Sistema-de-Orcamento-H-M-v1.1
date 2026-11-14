// Limite de uso da IA por USUÁRIO e por PESO (revisão geral de 14/11/2026, versão 2.39).
// O limitador de requisições (express-rate-limit, por IP) conta pedidos, não buscas: a busca de
// medidas em lote faz até 15 pesquisas na web e contava como uma só, e a leitura com IA do orçamento
// da concorrência não tinha limite nenhum. Aqui cada pesquisa conta, numa janela deslizante de 1 h:
//   pesquisa  — pesquisas na web com IA (pesquisa de mercado, medida de componente, lote, preços da
//               especificação): IA_PESQUISAS_POR_HORA, padrão 60 por usuário;
//   leitura   — leitura de documento pela IA (orçamento da concorrência escaneado): IA_LEITURAS_POR_HORA,
//               padrão 10 por usuário.
// Em memória (um processo só, como o resto das filas): reiniciar o backend zera as janelas.
const JANELA_MS = 60 * 60 * 1000;
const PADROES = { pesquisa: ['IA_PESQUISAS_POR_HORA', 60], leitura: ['IA_LEITURAS_POR_HORA', 10] };

const usos = new Map(); // `${tipo}:${usuario}` → [{ t, n }]

function maximoDe(tipo) {
  const [variavel, padrao] = PADROES[tipo] || [null, 0];
  const v = Number(process.env[variavel]);
  return Number.isInteger(v) && v >= 0 ? v : padrao; // 0 = sem limite
}

function janela(chave, agora) {
  const lista = (usos.get(chave) || []).filter(u => agora - u.t < JANELA_MS);
  usos.set(chave, lista);
  return lista;
}

// Quanto ainda cabe na janela (Infinity sem limite) e em quanto tempo libera a próxima vaga.
function disponivel(tipo, usuarioId, agora = Date.now()) {
  const maximo = maximoDe(tipo);
  if (!maximo) return { restam: Infinity, maximo: 0, liberaEmMs: 0 };
  const lista = janela(`${tipo}:${usuarioId ?? 'anonimo'}`, agora);
  const usados = lista.reduce((s, u) => s + u.n, 0);
  return { restam: Math.max(0, maximo - usados), maximo, liberaEmMs: lista.length ? JANELA_MS - (agora - lista[0].t) : 0 };
}

// Consome até `n` (quando `parcial`, o que couber; senão, tudo ou nada). Devolve quanto consumiu.
function consumir(tipo, usuarioId, n = 1, { parcial = false, agora = Date.now() } = {}) {
  const d = disponivel(tipo, usuarioId, agora);
  if (d.restam === Infinity) return n;
  const vai = parcial ? Math.min(n, d.restam) : (d.restam >= n ? n : 0);
  if (vai > 0) janela(`${tipo}:${usuarioId ?? 'anonimo'}`, agora).push({ t: agora, n: vai });
  return vai;
}

function mensagemLimite(tipo, usuarioId) {
  const d = disponivel(tipo, usuarioId);
  const minutos = Math.max(1, Math.ceil(d.liberaEmMs / 60000));
  const oque = tipo === 'leitura' ? 'leituras de documento pela IA' : 'pesquisas na web com IA';
  return `Limite de ${d.maximo} ${oque} por hora atingido. Libera de novo em ${minutos} min (o administrador ajusta em ${PADROES[tipo][0]} no .env).`;
}

// Middleware: consome `peso` (número ou função do req) do tipo; sem vaga, 429.
function exigirUsoIa(tipo, peso = 1) {
  return (req, res, next) => {
    const n = typeof peso === 'function' ? peso(req) : peso;
    if (!n) return next();
    if (consumir(tipo, req.usuario?.id, n) === n) return next();
    res.status(429).json({ erro: mensagemLimite(tipo, req.usuario?.id) });
  };
}

const _zerar = () => usos.clear(); // testes

module.exports = { disponivel, consumir, exigirUsoIa, mensagemLimite, JANELA_MS, _zerar };
