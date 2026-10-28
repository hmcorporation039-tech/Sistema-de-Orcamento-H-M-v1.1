// Controle de acesso — dimensionamento por ponto de acesso (porta, portão,
// catraca, cancela): leitores, fechaduras (força pelo tipo de porta),
// botoeiras de saída e de emergência, sensores, controladoras com reserva,
// fontes com bateria (autonomia), cabos (manga blindada, alimentação das
// fechaduras com queda de tensão, UTP), switch/PoE, credenciais e licença.
//
// Referências: IEC 60839-11-1/-11-2 (sistemas eletrônicos de controle de
// acesso), IEC 60839-11-5 (OSDP), ABNT NBR 9077 e instruções técnicas do Corpo
// de Bombeiros (saídas de emergência), NBR 11785 (barra antipânico),
// NBR 9050 (acessibilidade), NBR 14565 (cabeamento), NBR 5410 (alimentação/DPS)
// e Lei 13.709/2018 (LGPD). Correntes, potências e forças são típicas de
// mercado e saem com [CONFERIR] — usar a ficha técnica do equipamento escolhido.

const TIPOS = {
  simples: { rotulo: 'Porta simples', folhas: 1, fechaduraPadrao: 'eletroima' },
  dupla: { rotulo: 'Porta dupla', folhas: 2, fechaduraPadrao: 'eletroima' },
  portao: { rotulo: 'Portão', folhas: 1, fechaduraPadrao: 'fecho', externo: true },
  catraca: { rotulo: 'Catraca', folhas: 0, fechaduraPadrao: 'nenhuma', autonomo: true },
  cancela: { rotulo: 'Cancela', folhas: 0, fechaduraPadrao: 'nenhuma', externo: true },
};

const SENTIDOS = {
  entrada: 'Entrada por leitor, saída por botoeira',
  entrada_livre: 'Entrada por leitor, saída mecânica livre (maçaneta/barra)',
  entrada_saida: 'Entrada e saída por leitor',
};

// Correntes em 12 Vcc por fechadura (A): contínua (em repouso, porta travada) e
// de pico (no acionamento). [CONFERIR] com o fabricante.
const FECHADURAS = {
  eletroima: { rotulo: 'Fechadura eletromagnética (eletroímã)', falhaPadrao: 'fail_safe', sempreFailSafe: true },
  fecho: { rotulo: 'Fecho elétrico', falhaPadrao: 'fail_secure', continua: { fail_safe: 0.25, fail_secure: 0 }, pico: { fail_safe: 0.25, fail_secure: 0.5 } },
  solenoide: { rotulo: 'Fechadura solenoide', falhaPadrao: 'fail_secure', continua: { fail_safe: 0.35, fail_secure: 0 }, pico: { fail_safe: 0.9, fail_secure: 0.9 } },
  motor: { rotulo: 'Automatizador do portão (contato seco)', falhaPadrao: 'fail_secure', propria: true },
  nenhuma: { rotulo: 'Sem fechadura (equipamento com travamento próprio)', falhaPadrao: '', propria: true },
};
const ROTULO_FALHA = { fail_safe: 'fail-safe (destrava sem energia)', fail_secure: 'fail-secure (trava sem energia)', '': '—' };

// Eletroímãs comerciais (força de retenção) e corrente em 12 Vcc [CONFERIR]
const ELETROIMAS = [{ kgf: 150, a: 0.28 }, { kgf: 300, a: 0.48 }, { kgf: 500, a: 0.5 }];
// Força recomendada pelo material/uso da porta (kgf) [CONFERIR]
const FORCA_MATERIAL = { madeira_leve: 150, madeira: 300, vidro: 300, aluminio: 300, metal: 500 };
const ROTULO_MATERIAL = { madeira_leve: 'Madeira leve / interna', madeira: 'Madeira maciça', vidro: 'Vidro temperado', aluminio: 'Alumínio', metal: 'Metálica / externa' };
function forcaPorPeso(kg) { return kg <= 40 ? 150 : kg <= 80 ? 300 : 500; }

// Leitores por tecnologia: corrente em 12 Vcc (A) quando alimentado pela fonte,
// potência PoE (W) quando IP. [CONFERIR]
const TECNOLOGIAS = {
  proximidade: { rotulo: 'Cartão de proximidade 125 kHz', leitor: 'Leitor de cartão de proximidade 125 kHz', a: 0.1, w: 3 },
  mifare: { rotulo: 'Cartão MIFARE 13,56 MHz', leitor: 'Leitor de cartão MIFARE 13,56 MHz (ISO 14443A, DESFire)', a: 0.12, w: 3.5 },
  biometria: { rotulo: 'Biometria (digital) + cartão', leitor: 'Leitor biométrico de impressão digital com cartão MIFARE', a: 0.25, w: 5, sensivel: true },
  facial: { rotulo: 'Reconhecimento facial', leitor: 'Terminal de reconhecimento facial com cartão MIFARE, PoE', a: 0.6, w: 12, sensivel: true, ip: true },
  qrcode: { rotulo: 'QR Code + cartão', leitor: 'Leitor de QR Code com cartão MIFARE', a: 0.25, w: 5 },
  uhf: { rotulo: 'TAG veicular UHF', leitor: 'Leitor UHF de longa distância para TAG veicular', a: 0.8, w: 10 },
};

const CORRENTE_CONTROLADORA = 0.3; // A em 12 Vcc [CONFERIR]
const FONTES_A = [3, 5, 10];
const BATERIAS_AH = [7, 9, 12, 18, 26, 40];
const SECOES_MM2 = [0.5, 0.75, 1, 1.5, 2.5];
const RHO = 0.0178; // Ω·mm²/m — cobre
const SECAO_24AWG = 0.205; // mm² — condutor da manga blindada 24 AWG (0,2047 mm²)
const TENSAO = 12;
const QUEDA_MAX = 0.10; // 10 % de 12 V na fechadura [CONFERIR com o fabricante]
const LICENCAS = [4, 8, 16, 32, 64, 128, 256, 512];
const FATOR_CABO = 1.15;
const MARGEM_FONTE = 1.25;
const FATOR_BATERIA = 1.25; // envelhecimento/temperatura [CONFERIR]
const LIMITE = { wiegand: 100, rs485: 1000, utp: 90 };

const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const sim = (v) => v === true || v === 'true' || v === 'sim' || v === 1;

function forcaRecomendada(p, tipo) {
  if (Number(p.forca_kgf) > 0) return Number(p.forca_kgf);
  if (tipo === 'portao') return 500;
  const porMaterial = FORCA_MATERIAL[p.material] || 300;
  return Number(p.peso_kg) > 0 ? Math.max(porMaterial, forcaPorPeso(Number(p.peso_kg))) : porMaterial;
}

function secaoAlimentacao(comprimento, corrente) {
  if (!corrente) return { secao: null, queda: 0 };
  const queda = (s) => 2 * comprimento * corrente * RHO / s;
  const s = SECOES_MM2.find(x => queda(x) <= QUEDA_MAX * TENSAO);
  return { secao: s || SECOES_MM2[SECOES_MM2.length - 1], queda: queda(s || SECOES_MM2[SECOES_MM2.length - 1]), excede: !s };
}

function comercial(lista, necessario) {
  const v = lista.find(x => x >= necessario);
  if (v) return { qtd: 1, valor: v };
  const maior = lista[lista.length - 1];
  const qtd = Math.ceil(necessario / maior);
  return { qtd, valor: lista.find(x => x * qtd >= necessario) || maior };
}

function calcular(dados) {
  const s = dados.sistema || {};
  const avisos = [];
  const ncsProjeto = [];
  const ppc = Number(s.portas_por_controladora) || 4;
  const lpc = Number(s.leitores_por_controladora) || ppc;
  const reserva = s.reserva_pct === 0 || s.reserva_pct === '0' ? 0 : (Number(s.reserva_pct) || 20) / 100;
  const autonomiaH = Number(s.autonomia_h) || 4;
  const grau = Number(s.grau_seguranca) || 2;
  const tecSistema = TECNOLOGIAS[s.tecnologia] ? s.tecnologia : 'mifare';
  const comunicacao = ['wiegand', 'rs485', 'ip'].includes(s.comunicacao) ? s.comunicacao : 'wiegand';
  const incendio = sim(s.integracao_incendio);
  const cftv = sim(s.integracao_cftv);

  // ── Pontos de acesso ──
  const pontos = (dados.portas || []).filter(p => p && (p.local || p.id) && (Number(p.quantidade) || 1) > 0).map((p, i) => {
    const id = p.id || `P${i + 1}`;
    const tipo = TIPOS[p.tipo] ? p.tipo : 'simples';
    const T = TIPOS[tipo];
    const qtd = Number(p.quantidade) || 1;
    const sentido = SENTIDOS[p.sentido] ? p.sentido : 'entrada';
    const rota = sim(p.rota_fuga);
    let fechadura = T.autonomo || tipo === 'cancela' ? 'nenhuma' : (FECHADURAS[p.fechadura] && p.fechadura !== 'nenhuma' ? p.fechadura : T.fechaduraPadrao);
    if (fechadura === 'motor' && tipo !== 'portao') fechadura = T.fechaduraPadrao;
    const F = FECHADURAS[fechadura];
    let falha = ['fail_safe', 'fail_secure'].includes(p.modo_falha) ? p.modo_falha : F.falhaPadrao;
    if (F.sempreFailSafe && falha !== 'fail_safe') {
      avisos.push(`${id}: eletroímã é sempre fail-safe (destrava sem energia) — modo de falha corrigido.`);
      falha = 'fail_safe';
    }
    if (fechadura === 'nenhuma') falha = '';
    const tecnologia = TECNOLOGIAS[p.tecnologia] ? p.tecnologia : (tipo === 'cancela' ? 'uhf' : tecSistema);
    const Tec = TECNOLOGIAS[tecnologia];
    const leitorIp = !T.autonomo && (Tec.ip || (comunicacao === 'ip' && tecnologia !== 'uhf'));

    // Fechadura e força
    let forca = null;
    let correnteCont = 0;
    let correntePico = 0;
    let modeloEletroima = null;
    const nFechaduras = F.propria ? 0 : T.folhas;
    if (fechadura === 'eletroima') {
      forca = forcaRecomendada(p, tipo);
      modeloEletroima = ELETROIMAS.find(e => e.kgf >= forca) || ELETROIMAS[ELETROIMAS.length - 1];
      if (forca > modeloEletroima.kgf) avisos.push(`${id}: força de ${forca} kgf acima do maior eletroímã de linha (${modeloEletroima.kgf} kgf) — usar dois eletroímãs por folha ou fechadura de outro tipo. [CONFERIR]`);
      correnteCont = correntePico = modeloEletroima.a * nFechaduras;
    } else if (!F.propria) {
      correnteCont = F.continua[falha] * nFechaduras;
      correntePico = F.pico[falha] * nFechaduras;
    }

    // Leitores, botoeiras e sensores (por unidade)
    const leitores = sentido === 'entrada_saida' ? 2 : 1;
    const leitoresCtrl = T.autonomo || leitorIp ? 0 : leitores; // ligados na entrada de leitor da controladora
    const botoeiraSaida = !T.autonomo && tipo !== 'cancela' && sentido === 'entrada' ? 1 : 0;
    const comFechaduraEletrica = nFechaduras > 0 || fechadura === 'motor';
    const botoeiraEmergencia = rota && comFechaduraEletrica ? 1 : 0;
    const sensores = T.folhas;
    const lacos = tipo === 'cancela' ? 1 + (sentido === 'entrada' ? 1 : 0) : 0;
    const distancia = Number(p.distancia_m) || 30;
    const comprimento = distancia * FATOR_CABO;

    // Alimentação da fechadura pela fonte (queda de tensão)
    const alim = secaoAlimentacao(comprimento, correntePico);
    if (alim.excede) avisos.push(`${id}: queda de tensão de ${br(alim.queda, 2)} V na alimentação da fechadura mesmo com 2,5 mm² (${br(comprimento, 0)} m) — instalar fonte com bateria próxima à porta.`);

    // Limites de cabo
    const cabosLeitor = T.autonomo || leitorIp ? 'utp' : (comunicacao === 'rs485' ? 'rs485' : 'wiegand');
    if (cabosLeitor === 'utp' && comprimento > LIMITE.utp) avisos.push(`${id}: cabo UTP de ${br(comprimento, 0)} m excede 90 m (NBR 14565) — usar switch intermediário, extensor ou fibra.`);
    if (cabosLeitor === 'wiegand' && comprimento > LIMITE.wiegand) avisos.push(`${id}: cabo de leitor Wiegand de ${br(comprimento, 0)} m acima de ${LIMITE.wiegand} m — limite prático do Wiegand (~150 m com 22 AWG blindado); preferir RS-485/OSDP ou controladora mais próxima. [CONFERIR]`);
    if (cabosLeitor === 'rs485' && comprimento > LIMITE.rs485) avisos.push(`${id}: barramento RS-485 de ${br(comprimento, 0)} m próximo do limite de 1 200 m — conferir topologia e terminação.`);

    // Alimentação do leitor pelo par da manga 24 AWG (12 V da controladora):
    // ΔV = 2·L·I·ρ ÷ 0,205 mm², mesmo limite da fechadura. Acima dele o leitor
    // recebe par de alimentação próprio (cabo PP dimensionado) ou fonte local.
    const iLeitor = cabosLeitor !== 'utp' ? Tec.a : 0;
    const quedaLeitor = iLeitor ? 2 * comprimento * iLeitor * RHO / SECAO_24AWG : 0;
    let alimLeitor = null;
    if (iLeitor && quedaLeitor > QUEDA_MAX * TENSAO) {
      alimLeitor = secaoAlimentacao(comprimento, iLeitor);
      avisos.push(`${id}: queda de ${br(quedaLeitor, 2)} V (${br(quedaLeitor / TENSAO * 100, 0)} % de 12 V) na alimentação do leitor (${br(iLeitor, 2)} A) pelo par 24 AWG da manga em ${br(comprimento, 0)} m — acima de ${br(QUEDA_MAX * 100, 0)} %: alimentar o leitor por cabo PP 2 × ${br(alimLeitor.secao, 2)} mm² à parte${alimLeitor.excede ? ' (ainda acima do limite — instalar fonte com bateria junto ao leitor)' : ' ou por fonte local'}. [CONFERIR faixa de tensão do leitor]`);
    }

    // Requisitos de rota de fuga (NBR 9077 / IT de saídas de emergência)
    if (rota && comFechaduraEletrica && falha === 'fail_secure' && sentido !== 'entrada_livre') {
      ncsProjeto.push({ cod: 'R1', porta: id, descricao: `${id} (${p.local || ''}): porta em rota de fuga com ${F.rotulo.toLowerCase()} fail-secure e sem saída mecânica livre`, recomendacao: 'Trocar por fechadura fail-safe (eletroímã) liberada pelo alarme de incêndio, por falta de energia e por botoeira de emergência — ou garantir saída mecânica livre (maçaneta/barra antipânico) pelo lado de dentro.', prioridade: 'P1' });
    }
    if (rota && T.autonomo) {
      ncsProjeto.push({ cod: 'R5', porta: id, descricao: `${id} (${p.local || ''}): catraca marcada em rota de fuga`, recomendacao: 'Catraca não deve obstruir a rota de fuga: prever passagem livre alternativa com a largura da rota ou catraca com liberação total (braço que cai) pelo alarme e por falta de energia. [CONFERIR IT local]', prioridade: 'P2' });
    }
    if (rota && sentido === 'entrada_saida' && comFechaduraEletrica) avisos.push(`${id}: saída controlada por leitor em rota de fuga — só admissível com liberação automática pelo alarme e por botoeira de emergência; algumas ITs não permitem. [CONFERIR IT local]`);

    return {
      ...p, id, local: p.local || '', tipo, rotuloTipo: T.rotulo, qtd, sentido, rotuloSentido: SENTIDOS[sentido], rota, fechadura, rotuloFechadura: F.rotulo,
      falha, rotuloFalha: ROTULO_FALHA[falha], forca, eletroima: modeloEletroima ? modeloEletroima.kgf : null, nFechaduras, correnteCont, correntePico,
      tecnologia, rotuloTecnologia: Tec.rotulo, leitorIp, leitores, leitoresCtrl, botoeiraSaida, botoeiraEmergencia, sensores, lacos,
      distancia, comprimento, secao: alim.secao, queda: alim.queda, cabosLeitor, iLeitor, quedaLeitor, quedaLeitorPct: quedaLeitor / TENSAO * 100, secaoLeitor: alimLeitor ? alimLeitor.secao : null, quedaLeitorPP: alimLeitor ? alimLeitor.queda : null, autonomo: !!T.autonomo, externo: !!T.externo, sensivel: !!Tec.sensivel,
    };
  });
  if (!pontos.length) throw new Error('Cadastre ao menos uma porta ou ponto de acesso.');

  const soma = (lista, f) => lista.reduce((a, p) => a + f(p) * p.qtd, 0);
  const portas = pontos.filter(p => !p.autonomo);
  const catracas = pontos.filter(p => p.tipo === 'catraca');
  const cancelas = pontos.filter(p => p.tipo === 'cancela');
  const rotas = pontos.filter(p => p.rota);
  const nPontos = soma(pontos, () => 1);
  const nPortas = soma(portas, () => 1);

  if (rotas.some(p => !p.autonomo) && !incendio) {
    ncsProjeto.push({ cod: 'R2', porta: rotas.filter(p => !p.autonomo).map(p => p.id).join(', '), descricao: `Portas em rota de fuga (${rotas.filter(p => !p.autonomo).map(p => p.id).join(', ')}) sem liberação automática pelo alarme de incêndio`, recomendacao: 'Ligar contato da central de alarme (NBR 17240) para cortar a alimentação das fechaduras das rotas de fuga; se não houver central exigida, liberar ao menos por falta de energia e botoeira de emergência e registrar a aceitação do Corpo de Bombeiros. [CONFERIR IT local]', prioridade: 'P1' });
  }
  if (catracas.length && !sim(s.passagem_acessivel)) {
    ncsProjeto.push({ cod: 'A2', porta: catracas.map(p => p.id).join(', '), descricao: 'Conjunto de catracas sem passagem acessível informada', recomendacao: 'Prever, junto a cada conjunto de catracas, passagem acessível com largura livre ≥ 0,90 m (portinhola ou catraca PNE) — NBR 9050. [CONFERIR]', prioridade: 'P2' });
  }

  // ── Controladoras (portas por controladora, entradas de leitor e reserva) ──
  const unidades = [];
  for (const p of portas) for (let k = 0; k < p.qtd; k++) unidades.push({ ...p, uid: p.qtd > 1 ? `${p.id}.${k + 1}` : p.id });
  const leitoresCtrlTotal = unidades.reduce((a, u) => a + u.leitoresCtrl, 0);
  let nCtrl = unidades.length ? Math.max(1, Math.ceil(unidades.length * (1 + reserva) / ppc), Math.ceil(leitoresCtrlTotal * (1 + reserva) / lpc)) : 0;
  const grupos = Array.from({ length: nCtrl }, () => []);
  const alvo = nCtrl ? Math.ceil(unidades.length / nCtrl) : 0;
  let g = 0;
  for (const u of unidades) {
    const cabe = (grp) => grp.length < Math.min(alvo, ppc) && grp.reduce((a, x) => a + x.leitoresCtrl, 0) + u.leitoresCtrl <= lpc;
    while (g < grupos.length && !cabe(grupos[g]) && grupos[g].length) g++;
    if (g >= grupos.length) { grupos.push([]); nCtrl++; }
    if (u.leitoresCtrl > lpc) avisos.push(`${u.uid}: ${u.leitoresCtrl} leitores na porta e a controladora aceita ${lpc} — conferir modelo.`);
    grupos[g].push(u);
  }
  const controladoras = grupos.map((grp, i) => {
    const leitoresFonte = grp.reduce((a, u) => a + u.leitoresCtrl * TECNOLOGIAS[u.tecnologia].a, 0);
    const iRep = CORRENTE_CONTROLADORA + leitoresFonte + grp.reduce((a, u) => a + u.correnteCont, 0);
    const iPico = iRep + grp.reduce((a, u) => a + (u.correntePico - u.correnteCont), 0);
    const fonteNec = iPico * MARGEM_FONTE;
    const fonte = comercial(FONTES_A, fonteNec);
    const ahNec = iRep * autonomiaH * FATOR_BATERIA;
    const bateria = comercial(BATERIAS_AH, ahNec);
    return { id: `CTRL${i + 1}`, portas: grp.map(u => u.uid), nPortas: grp.length, leitores: grp.reduce((a, u) => a + u.leitoresCtrl, 0), iRep, iPico, fonteNec, fonteA: fonte.valor, nFontes: fonte.qtd, ahNec, bateriaAh: bateria.valor, nBaterias: bateria.qtd };
  });

  // ── Leitores, dispositivos e credenciais ──
  const leitoresTotal = soma(pontos, p => p.leitores);
  const leitoresEntrada = nPontos;
  const leitoresIp = soma(pontos.filter(p => p.leitorIp), p => p.leitores);
  const botoeirasSaida = soma(pontos, p => p.botoeiraSaida);
  const botoeirasEmergencia = soma(pontos, p => p.botoeiraEmergencia);
  const sensores = soma(pontos, p => p.sensores);
  const fechaduras = soma(pontos, p => p.nFechaduras);
  const perfis = (dados.perfis || []).filter(x => x && x.perfil);
  const usuarios = Number(s.usuarios) || perfis.reduce((a, x) => a + (Number(x.usuarios) || 0), 0);
  const visitantes = Number(s.visitantes_simultaneos) || 0;
  const usaCartao = s.credencial_cartao !== false && s.credencial_cartao !== 'false';
  const cartoes = usaCartao ? Math.ceil(usuarios * 1.1) : 0;
  const cartoesVisitante = usaCartao && tecSistema !== 'qrcode' ? Math.ceil(visitantes * 1.1) : 0;
  const veiculos = Number(s.veiculos) || 0;
  const tags = cancelas.length ? Math.ceil(veiculos * 1.1) : 0;
  if (cancelas.length && !veiculos) avisos.push('Há cancela: informe a quantidade de veículos para as TAGs veiculares.');
  if (!usuarios) avisos.push('Informe a quantidade de usuários (ou os perfis de acesso) para dimensionar cartões e licença.');
  const licencaNec = Math.ceil(nPontos * (1 + reserva));
  const licenca = LICENCAS.find(l => l >= licencaNec) || Math.ceil(licencaNec / 64) * 64;
  const sensivel = pontos.some(p => p.sensivel);

  // ── Rede (leitores IP, catracas, controladoras) ──
  const portasRede = leitoresIp + soma(catracas, () => 1) + nCtrl;
  const poeW = soma(pontos.filter(p => p.leitorIp), p => p.leitores * TECNOLOGIAS[p.tecnologia].w);
  const portasSwitch = Number(s.portas_switch) || 8;
  const switches = portasRede && !sim(s.switch_existente) ? Math.ceil((portasRede + 2) / portasSwitch) : 0;

  // ── Cabos (distância × 1,15) ──
  const ceil = Math.ceil;
  const mangaLeitor6 = ceil(soma(pontos.filter(p => p.cabosLeitor === 'wiegand'), p => p.leitores * p.comprimento));
  const mangaLeitor4 = ceil(soma(pontos.filter(p => p.cabosLeitor === 'rs485'), p => p.leitores * p.comprimento));
  const mangaIo = ceil(soma(portas.filter(p => p.sensores || p.botoeiraSaida || p.lacos || p.fechadura === 'motor'), p => p.comprimento));
  const utpM = ceil(soma(pontos.filter(p => p.cabosLeitor === 'utp'), p => (p.autonomo ? 1 : p.leitores) * p.comprimento));
  const alimPorSecao = {};
  for (const p of portas.filter(x => x.secao)) alimPorSecao[p.secao] = (alimPorSecao[p.secao] || 0) + p.comprimento * p.qtd;
  const alimLeitorPorSecao = {};
  for (const p of pontos.filter(x => x.secaoLeitor)) alimLeitorPorSecao[p.secaoLeitor] = (alimLeitorPorSecao[p.secaoLeitor] || 0) + p.comprimento * p.leitores * p.qtd;
  const distIncendio = Number(s.distancia_central_incendio_m) || 20;
  const caboIncendio = incendio ? ceil(distIncendio * FATOR_CABO) : 0;
  const infraM = ceil(soma(pontos, p => p.comprimento));
  const nFontes = controladoras.reduce((a, c) => a + c.nFontes, 0);
  const pontosEnergia = (nCtrl ? 1 : 0) + soma(catracas, () => 1) + soma(cancelas, () => 1);

  // ── Avisos de segurança (IEC 60839-11-1 / LGPD) ──
  if (pontos.some(p => p.tecnologia === 'proximidade') && grau >= 2) avisos.push('Cartão de proximidade 125 kHz é facilmente clonável — para grau de segurança 2 ou maior, preferir MIFARE DESFire EV2/EV3 com chave própria. [CONFERIR IEC 60839-11-1]');
  if (comunicacao === 'wiegand' && grau >= 3 && pontos.some(p => p.cabosLeitor === 'wiegand')) avisos.push('Wiegand não é supervisionado nem criptografado — para grau 3/4, usar OSDP com canal seguro em RS-485 (IEC 60839-11-5).');
  if (sensivel) avisos.push('Biometria/face é dado pessoal sensível (LGPD art. 5º II e art. 11): aviso ao titular junto ao leitor, base legal registrada (art. 11, II, "g"), alternativa sem biometria, templates criptografados e política de exclusão.');
  if (rotas.length) avisos.push(`Rotas de fuga (${rotas.map(p => p.id).join(', ')}): fechadura fail-safe liberada pelo alarme de incêndio, pela falta de energia e por botoeira de emergência que corta a alimentação diretamente. Conferir a IT de saídas de emergência do Corpo de Bombeiros local. [CONFERIR]`);
  avisos.push('Correntes de fechaduras/leitores, potências PoE e forças de retenção são típicas de mercado — conferir com a ficha técnica dos equipamentos escolhidos. [CONFERIR]');

  // ── Materiais ──
  const M = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) M.push({ codigo, descricao, unidade, quantidade, referencia }); };
  const agrupar = (lista, chave, qtd) => { const r = {}; for (const p of lista) { const k = chave(p); if (k) r[k] = (r[k] || 0) + qtd(p); } return r; };
  Object.entries(agrupar(pontos.filter(p => !p.autonomo), p => `${TECNOLOGIAS[p.tecnologia].leitor}${p.leitorIp && !TECNOLOGIAS[p.tecnologia].ip ? ', IP/PoE' : p.cabosLeitor === 'rs485' ? ', OSDP/RS-485' : p.cabosLeitor === 'wiegand' ? ', Wiegand' : ''}${p.externo ? ', IP65 (externo)' : ''}`, p => p.leitores * p.qtd))
    .forEach(([d, q]) => add('LEI', d, 'un', q, 'IEC 60839-11-1'));
  Object.entries(agrupar(catracas, p => `Catraca/bloqueio de pedestres ${p.sentido === 'entrada_saida' ? 'bidirecional' : 'unidirecional'} com ${TECNOLOGIAS[p.tecnologia].rotulo.toLowerCase()} embutido, controladora própria TCP/IP, braço com queda/liberação em falta de energia${p.modelo ? ` — ${p.modelo}` : ''}`, p => p.qtd))
    .forEach(([d, q]) => add('CAT', d, 'un', q, 'NBR 9077 / IT de saídas'));
  if (catracas.length && !sim(s.passagem_acessivel)) add('PNE', 'Portinhola/passagem acessível motorizada, largura livre ≥ 0,90 m, integrada ao controle de acesso [CONFERIR]', 'un', new Set(catracas.map(p => p.local)).size, 'NBR 9050');
  add('CAN', 'Cancela automática para veículos com braço articulado/antiesmagamento [CONFERIR comprimento]', 'un', soma(cancelas, () => 1), 'Fabricante');
  add('LACO', 'Sensor de presença veicular (laço indutivo/fotocélula) para cancela', 'un', soma(cancelas, p => p.lacos), 'Segurança antiesmagamento');
  add('TAG', 'TAG veicular UHF', 'un', tags, 'Veículos × 1,1');
  Object.entries(agrupar(portas.filter(p => p.fechadura === 'eletroima'), p => `Fechadura eletromagnética (eletroímã) ${p.eletroima} kgf, 12 Vcc, fail-safe, com sensor de status`, p => p.nFechaduras * p.qtd))
    .forEach(([d, q]) => add('ELM', d, 'un', q, 'Força pelo tipo de porta [CONFERIR]'));
  const nVidro = soma(portas.filter(p => p.fechadura === 'eletroima' && p.material === 'vidro'), p => p.nFechaduras);
  add('SUP', 'Kit de suporte para eletroímã em porta de vidro (L/ZL/U)', 'un', nVidro, 'Fabricante');
  add('SUP', 'Kit de suporte/cantoneira para eletroímã (porta de madeira/metal)', 'un', soma(portas.filter(p => p.fechadura === 'eletroima' && p.material !== 'vidro'), p => p.nFechaduras), 'Fabricante');
  Object.entries(agrupar(portas.filter(p => p.fechadura === 'fecho' || p.fechadura === 'solenoide'), p => `${p.fechadura === 'fecho' ? `Fecho elétrico${p.tipo === 'portao' ? ' para portão' : ''}` : 'Fechadura solenoide de embutir'} 12 Vcc, ${p.falha === 'fail_safe' ? 'fail-safe (normalmente aberto)' : 'fail-secure (normalmente fechado)'}`, p => p.nFechaduras * p.qtd))
    .forEach(([d, q]) => add('FEC', d, 'un', q, 'Fabricante'));
  add('REL', 'Módulo relé de interface com o automatizador do portão (contato seco)', 'un', soma(portas.filter(p => p.fechadura === 'motor'), () => 1), '—');
  add('BOT', 'Botoeira de saída (REX) inox, sem contato/toque, contato NA/NF com LED', 'un', botoeirasSaida, 'IEC 60839-11-1');
  add('EMG', 'Acionador de emergência para porta (botoeira verde quebra-vidro/rearmável com tampa), contato NF em série com a alimentação da fechadura', 'un', botoeirasEmergencia, 'NBR 9077 / IT de saídas');
  add('SEN', 'Sensor magnético de abertura (contato de porta) de sobrepor/embutir', 'un', sensores, 'IEC 60839-11-1 (porta forçada/aberta)');
  add('CTRL', `Controladora de acesso ${ppc} portas / ${lpc} leitores, TCP/IP, ${comunicacao === 'rs485' ? 'OSDP/RS-485' : 'Wiegand'}, com entradas de sensor, botoeira e alarme de incêndio`, 'un', nCtrl, 'IEC 60839-11-1');
  add('GAB', 'Gabinete metálico com chave e tamper para controladora, fonte e bateria', 'un', nCtrl, 'IEC 60839-11-1 (violação)');
  Object.entries(agrupar(controladoras, c => `Fonte de alimentação 12 Vcc ${c.fonteA} A com carregador e supervisão de falta de CA/bateria baixa`, c => c.nFontes))
    .forEach(([d, q]) => add('FON', d, 'un', q, `Pico × ${MARGEM_FONTE}`));
  Object.entries(agrupar(controladoras, c => `Bateria selada VRLA 12 V ${c.bateriaAh} Ah`, c => c.nBaterias))
    .forEach(([d, q]) => add('BAT', d, 'un', q, `Repouso × ${autonomiaH} h × ${FATOR_BATERIA}`));
  if (incendio) {
    add('INC', 'Módulo relé de interface com a central de alarme de incêndio (corte das fechaduras das rotas de fuga)', 'un', Math.max(1, nFontes), 'NBR 17240 / IT de saídas');
    add('CBI', 'Cabo blindado 2 × 1,0 mm² para sinal da central de incêndio', 'm', caboIncendio, 'NBR 17240');
  }
  add('MG6', 'Cabo manga blindada 6 vias 24 AWG (leitor Wiegand)', 'm', mangaLeitor6, 'Distância × 1,15');
  add('MG4', 'Cabo manga blindada 4 vias 24 AWG (leitor RS-485/OSDP)', 'm', mangaLeitor4, 'Distância × 1,15');
  add('MG4', 'Cabo manga blindada 4 vias 24 AWG (sensor de porta, botoeira, comandos)', 'm', mangaIo, 'Distância × 1,15');
  Object.entries(alimPorSecao).sort((a, b) => a[0] - b[0]).forEach(([sec, m]) => add('PP', `Cabo PP/paralelo 2 × ${String(sec).replace('.', ',')} mm² (alimentação das fechaduras)`, 'm', ceil(m), `Queda ≤ ${QUEDA_MAX * 100} % de 12 V`));
  Object.entries(alimLeitorPorSecao).sort((a, b) => a[0] - b[0]).forEach(([sec, m]) => add('PP', `Cabo PP/paralelo 2 × ${String(sec).replace('.', ',')} mm² (alimentação dos leitores — queda na manga 24 AWG acima de ${QUEDA_MAX * 100} %)`, 'm', ceil(m), `Queda ≤ ${QUEDA_MAX * 100} % de 12 V`));
  add('UTP', 'Cabo U/UTP Cat 6 (leitores IP e catracas)', 'm', utpM, 'NBR 14565');
  add('RJ', 'Conector RJ-45 Cat 6 — 2 por ponto de rede', 'un', (leitoresIp + soma(catracas, () => 1)) * 2, '—');
  add('PCD', 'Patch cord Cat 6 2,5 m (controladoras no rack)', 'un', nCtrl, 'NBR 14565');
  if (switches) add('SW', `Switch Gigabit ${portasSwitch} portas${poeW ? `, PoE com orçamento ≥ ${ceil(poeW * 1.2 / switches)} W` : ''}`, 'un', switches, poeW ? 'IEEE 802.3af/at' : '—');
  add('CX', 'Caixa 4×2 para leitor/botoeira', 'un', soma(portas.filter(p => p.tipo !== 'cancela'), p => p.leitores + p.botoeiraSaida + p.botoeiraEmergencia), '—');
  if (!sim(s.infra_existente)) add('INF', 'Infraestrutura (eletroduto 3/4" ou eletrocalha compartilhada) com acessórios — rota até cada ponto [CONFERIR com o projeto de infraestrutura]', 'm', infraM, 'NBR 5410 / NBR 14565');
  add('DPS', 'DPS de sinal para cabos de leitor/comando que saem da edificação (portão/cancela)', 'un', soma(pontos.filter(p => p.externo), () => 1), 'NBR 5410 / NBR 5419-4');
  add('DPSCA', 'DPS classe II na alimentação CA das fontes do controle de acesso', 'un', nCtrl ? 1 : 0, 'NBR 5410, 6.3.5');
  add('CRT', `Cartão ${tecSistema === 'proximidade' ? 'de proximidade 125 kHz' : (grau >= 3 ? 'MIFARE DESFire EV3 13,56 MHz' : 'MIFARE 13,56 MHz (DESFire EV2/EV3 recomendado)')} — usuários`, 'un', cartoes, 'Usuários × 1,1');
  add('CRV', 'Cartão de visitante (recolhido na saída)', 'un', cartoesVisitante, 'Visitantes simultâneos × 1,1');
  add('CAD', 'Leitor cadastrador de mesa (USB) para cartões', 'un', usaCartao || visitantes ? 1 : 0, '—');
  add('CADB', 'Cadastrador biométrico/facial de mesa (USB) para a recepção/RH', 'un', sensivel ? 1 : 0, '—');
  add('LIC', `Licença de software de controle de acesso para ${licenca} portas${cftv ? ', com módulo de integração ao CFTV (eventos → vídeo)' : ''}`, 'un', 1, `${nPontos} pontos + ${Math.round(reserva * 100)} % de reserva`);
  add('LGPD', 'Placa/aviso de privacidade junto aos leitores biométricos/faciais (LGPD — transparência)', 'un', new Set(pontos.filter(p => p.sensivel).map(p => p.local)).size, 'Lei 13.709/2018, art. 6º VI e art. 9º');

  return {
    pontos, portas, catracas, cancelas, rotas, nPontos, nPortas, controladoras, nCtrl, ppc, lpc, reserva, autonomiaH, grau, tecSistema, comunicacao, incendio, cftv,
    leitoresTotal, leitoresEntrada, leitoresIp, botoeirasSaida, botoeirasEmergencia, sensores, fechaduras, usuarios, visitantes, cartoes, cartoesVisitante, tags, veiculos,
    licenca, sensivel, perfis, portasRede, poeW, switches, nFontes, pontosEnergia,
    cabos: { mangaLeitor6, mangaLeitor4, mangaIo, utpM, alimPorSecao, alimLeitorPorSecao, caboIncendio, infraM },
    materiais: M, avisos, ncsProjeto,
  };
}

module.exports = { calcular, TIPOS, SENTIDOS, FECHADURAS, TECNOLOGIAS, ELETROIMAS, FORCA_MATERIAL, ROTULO_MATERIAL, ROTULO_FALHA, FONTES_A, BATERIAS_AH, SECOES_MM2, CORRENTE_CONTROLADORA, MARGEM_FONTE, FATOR_BATERIA, QUEDA_MAX, RHO, SECAO_24AWG, FATOR_CABO, forcaRecomendada, secaoAlimentacao };
