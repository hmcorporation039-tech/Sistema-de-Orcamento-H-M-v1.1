// Teste da função comum de Uc do DPS (skills/_comum/dps.js) — NBR 5410:2004, Tabela 49,
// conferida no texto da norma. Fica aqui (pasta testes da elétrica) para rodar no
// `npm test` da pasta skills; a função é usada pelas skills elétrica, hospitalar,
// industrial, solar e carregador.
const { ucDps } = require('../../_comum/dps');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('DPS (Tabela 49)');

// TN-S 127/220 V: 1,1 × 127 = 139,7 V → 175 V comercial
const a = ucDps({ vfn: 127, vff: 220, esquema: 'TN-S' });
perto('127 V TN-S: mínimo 1,1·Uo', a.ucMinimo, 139.7, 0.0001);
igual('127 V TN-S: 175 V', a.uc, 175);
igual('127 V TN-S: neutro–PE ≥ Uo = 127 V → 175 V', [a.ucNeutroPeMinimo, a.ucNeutroPe], [127, 175]);
// TN-S 220/380 V (DF): 1,1 × 220 = 242 V → 275 V
igual('220/380 V TN-S: 275 V', ucDps({ vfn: 220, vff: 380, esquema: 'TN-S' }).uc, 275);
// 254/440 V: 1,1 × 254 = 279,4 V → 275 V NÃO serve; 320 V (era fixo em 275 V no unifilar industrial)
const b = ucDps({ vfn: 254, vff: 440, esquema: 'TN-S' });
perto('254/440 V: mínimo 279,4 V', b.ucMinimo, 279.4, 0.0001);
igual('254/440 V: 320 V', b.uc, 320);
// IT sem neutro distribuído: Uc ≥ U (tensão entre fases) — 380 V → 385 V (antes 1,1·220 = 242 → 275 V)
igual('IT sem neutro 380 V: U = 380 → 385 V', ucDps({ vfn: 220, vff: 380, esquema: 'IT' }).uc, 385);
igual('IT sem neutro 440 V: 440 V', ucDps({ vfn: 254, vff: 440, esquema: 'IT' }).uc, 440);
// IT com neutro: fase–PE ≥ √3·Uo = 381,1 V → 385 V
const c = ucDps({ vfn: 220, vff: 380, esquema: 'IT', neutro: true });
perto('IT com neutro: √3·220', c.ucMinimo, 381.05, 0.0001);
igual('IT com neutro: 385 V', c.uc, 385);
// IT médico (secundário monofásico 220 V, sem neutro): U = 220 V → 275 V
igual('IT médico 220 V: 275 V', ucDps({ vfn: 220, vff: 220, esquema: 'IT' }).uc, 275);
// TN-C: fase–PEN 1,1·Uo; TT: igual ao TN-S nas fases
igual('TN-C 220 V: 275 V, só fase–PEN', [ucDps({ vfn: 220, vff: 380, esquema: 'TN-C' }).uc, ucDps({ vfn: 220, vff: 380, esquema: 'TN-C' }).ucNeutroPe], [275, null]);
igual('TT 127 V: 175 V', ucDps({ vfn: 127, vff: 220, esquema: 'TT' }).uc, 175);
igual('TN-C-S segue o TN-S', ucDps({ vfn: 220, vff: 380, esquema: 'TN-C-S' }).esquema, 'TN-S');
igual('texto cita a Tabela 49', /Tabela 49, TN-S: 1,1·Uo = 279,4 V/.test(b.texto), true);
fim();
