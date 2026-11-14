// Bateria e nobreak — o dimensionamento que estava copiado em cinco skills (14/11/2026):
//   - bateria de central/fonte pela autonomia: alarme, incêndio, controle de acesso
//     (e a bateria do nobreak da telefonia e do CFTV);
//   - escolha do modelo comercial (série de cada skill; acima da maior, unidades em paralelo);
//   - nobreak: potência aparente pela carga e bateria pela autonomia (telefonia e CFTV).
// As séries comerciais e os fatores de envelhecimento também moram aqui, NOMEADOS (2.40 — antes cada
// skill tinha a sua lista em linha): cada skill escolhe a sua série pelo nome e passa por parâmetro.
// As séries são diferentes de propósito (o gabinete da central de alarme, o par 24 V do incêndio, as
// fontes do controle de acesso, as baterias do nobreak) — valores típicos de mercado, não de norma
// [CONFERIR com o fornecedor].

// ── Séries comerciais ──────────────────────────────────────────────────────
// Baterias seladas chumbo-ácido (VRLA) de 12 V — capacidade (Ah)
const SERIES_BATERIA = {
  vrla12vCentralAlarme: [7, 12, 18, 26, 40, 65],     // central de alarme de intrusão (skill alarme)
  vrla12vIncendio: [7, 12, 18, 26, 40, 55, 65, 100], // central de incêndio, 2 em série para 24 V (skill incêndio)
  vrla12vFonteAcesso: [7, 9, 12, 18, 26, 40],        // fonte com bateria da controladora (skill controle de acesso)
  vrla12vNobreak: [7, 9, 18, 26, 40, 60, 100],       // bateria do nobreak, interna ou módulo externo (telefonia e CFTV)
};
// Nobreaks — potência aparente de saída (VA)
const SERIES_NOBREAK_VA = {
  ate3kva: [600, 1000, 1200, 1500, 2000, 3000],         // centrais de telefonia/interfonia (skill telefonia)
  ate10kva: [600, 1000, 1500, 2200, 3000, 6000, 10000], // NVR, switches PoE e câmeras (skill CFTV)
};

// ── Fator de envelhecimento da bateria ─────────────────────────────────────
// Multiplica a capacidade calculada pela autonomia (envelhecimento, temperatura e fim de vida).
const FATOR_ENVELHECIMENTO = {
  nbr17240: 1.2, // central de incêndio — ABNT NBR 17240:2010, Anexo B (cálculo da bateria da central)
  // alarme de intrusão, controle de acesso e nobreak: 1,25 sem referência normativa na biblioteca da
  // H&M (a skill de alarme cita a EN 50131-6 para a autonomia, não para o fator) [CONFERIR]
  alarme: 1.25,
  controleAcesso: 1.25,
  nobreak: 1.25,
};

// Capacidade necessária da bateria (Ah) pela autonomia:
//   C = fator × (I_repouso · T_repouso + I_alarme · t_alarme)
// correntes em A e tempos em h. `fator`: envelhecimento/temperatura/fim de vida de cada skill
// (FATOR_ENVELHECIMENTO: incêndio 1,2 — NBR 17240, Anexo B; alarme e controle de acesso 1,25 [CONFERIR]).
function capacidadeBateriaAh({ iRepouso = 0, tRepouso = 0, iAlarme = 0, tAlarme = 0, fator = 1 } = {}) {
  return fator * (iRepouso * tRepouso + iAlarme * tAlarme);
}

// Modelo comercial: o menor valor da série que atende. Acima do maior, N unidades iguais em paralelo
// (N = ⌈necessário ÷ maior⌉), com o menor valor que, vezes N, atende. → { qtd, valor }
function comercial(lista, necessario) {
  const v = lista.find(x => x >= necessario - 1e-9);
  if (v != null) return { qtd: 1, valor: v };
  const maior = lista[lista.length - 1];
  const qtd = Math.ceil(necessario / maior);
  return { qtd, valor: lista.find(x => x * qtd >= necessario - 1e-9) || maior };
}

// Nobreak (valores típicos de mercado, os que a skill de telefonia usava):
const FP_NOBREAK = 0.7;          // fator de potência de saída do nobreak line-interactive [CONFERIR modelo]
const MARGEM_NOBREAK = 1.25;     // folga sobre a carga — critério de projeto [CONFERIR]
const EFICIENCIA_INVERSOR = 0.85; // rendimento do inversor na descarga da bateria — típico [CONFERIR modelo]
const TENSAO_BATERIA = 12;       // V — bateria selada de 12 V
// padrões do dimensionarNobreak (os nomes antigos continuam exportados)
const FATOR_BATERIA_NOBREAK = FATOR_ENVELHECIMENTO.nobreak; // [CONFERIR]
const NOBREAKS_VA = SERIES_NOBREAK_VA.ate3kva;
const BATERIAS_NOBREAK_AH = SERIES_BATERIA.vrla12vNobreak;

// Nobreak pela carga e pela autonomia:
//   VA = carga (W) ÷ FP × margem               → modelo comercial (série `nobreaksVa`)
//   Wh = carga (W) × autonomia (h) ÷ eficiência → Ah = Wh ÷ tensão da bateria × fator → série `bateriasAh`
// A autonomia não muda o VA (o inversor é escolhido pela carga); ela define a bateria — interna ou
// módulo de baterias externo, conforme o modelo [CONFERIR com o fabricante].
function dimensionarNobreak({ cargaW, autonomiaH = 0, fp = FP_NOBREAK, margem = MARGEM_NOBREAK, eficiencia = EFICIENCIA_INVERSOR,
  tensaoBateria = TENSAO_BATERIA, fatorBateria = FATOR_BATERIA_NOBREAK, nobreaksVa = NOBREAKS_VA, bateriasAh = BATERIAS_NOBREAK_AH } = {}) {
  const vaNec = (cargaW / fp) * margem;
  const nb = comercial(nobreaksVa, vaNec);
  const whNec = (cargaW * autonomiaH) / eficiencia;
  const ahNec = (whNec / tensaoBateria) * fatorBateria;
  const bat = autonomiaH > 0 ? comercial(bateriasAh, ahNec) : { qtd: 0, valor: 0 };
  return { cargaW, vaNec, va: nb.valor, nNobreaks: nb.qtd, whNec, ahNec, bateriaAh: bat.valor, nBaterias: bat.qtd, fp, eficiencia, tensaoBateria, fatorBateria };
}

module.exports = {
  capacidadeBateriaAh, comercial, dimensionarNobreak, SERIES_BATERIA, SERIES_NOBREAK_VA, FATOR_ENVELHECIMENTO,
  FP_NOBREAK, MARGEM_NOBREAK, EFICIENCIA_INVERSOR, TENSAO_BATERIA, FATOR_BATERIA_NOBREAK, NOBREAKS_VA, BATERIAS_NOBREAK_AH,
};
