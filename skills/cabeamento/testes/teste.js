// Teste do cabeamento estruturado — Tabela 3 da NBR 14565:2019
const motor = require('../scripts/lib/index');
const { comprimentoHorizontalMax } = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('cabeamento');

perto('Cat 5e interconexão, F=10, X=1,5 → 109 − 15 = 94 → limitado a 90', comprimentoHorizontalMax({ categoria: '5e', modelo: 'interconexao', F: 10, X: 1.5, temperatura: 20 }), 90);
perto('Cat 6 interconexão, F=10, X=1,5 → 107 − 3 − 15 = 89', comprimentoHorizontalMax({ categoria: '6', modelo: 'interconexao', F: 10, X: 1.5, temperatura: 20 }), 89);
perto('Cat 6 conexão cruzada → 106 − 3 − 15 = 88', comprimentoHorizontalMax({ categoria: '6', modelo: 'conexao_cruzada', F: 10, X: 1.5, temperatura: 20 }), 88);
perto('Cat 6 a 30 °C sem blindagem → 89 × (1 − 0,04)', comprimentoHorizontalMax({ categoria: '6', modelo: 'interconexao', F: 10, X: 1.5, temperatura: 30 }), 89 * 0.96);
perto('Cat 6 a 30 °C blindado → 89 × (1 − 0,02)', comprimentoHorizontalMax({ categoria: '6', modelo: 'interconexao', F: 10, X: 1.5, temperatura: 30, blindado: true }), 89 * 0.98);

const res = motor.processar(motor.exemplo());
const t = res.calc.pavimentos[0];
igual('térreo: 400 m² ÷ 10 = 40 áreas de trabalho', t.areasTrabalho, 40);
igual('térreo: 80 + 3 APs × 2 + 6 extras = 92 pontos', t.pontos, 92);
igual('dois pavimentos → backbone', res.calc.backbone, true);
igual('certificação: 93 m aprovado no teste mas > 90 m → NC', res.certificacao[1].resultado, 'NC');

// ── Achado A2.9 (revisão 27/10/2026) ──
// Rack: os organizadores dos switches entram na conta de U (já entravam nos materiais).
// Térreo: 92 pontos → 4 patch panels de 24 e 2 switches de 48 → (4 + 2) × 2U + 2U = 14U × 1,3 = 18,2 → 19U → rack 24U
// (antes: 4 × 2 + 2 + 2 = 12U × 1,3 = 15,6 → 16U → rack 16U, sem lugar para 2 organizadores)
igual('térreo: 19U necessários → rack 24U (antes 16U)', [t.uNecessario, t.rackU], [19, 24]);
igual('organizadores = patch panels + switches', res.calc.materiais.find(m => m.codigo === 'ORG').quantidade, res.calc.pavimentos.reduce((a, p) => a + p.paineis + p.switches, 0));
// Galpão 200 m² com ponto a 150 m (H = 89 m) → 2 FDs; 40 pontos → 20 por FD → 1 painel e 1 switch POR FD
// (antes: 1 switch para os 2 racks) e um lance de backbone para CADA FD: (15 + 15 + 150/2) × 1,2 = 126 m (antes 18 m)
{
  const d = JSON.parse(JSON.stringify(motor.exemplo()));
  d.pavimentos = [{ nome: 'Galpão', area_util_m2: 200, distancia_media_m: 60, distancia_max_m: 150, aps: 0, pontos_extra: 0 }];
  const g = motor.processar(d).calc;
  const p = g.pavimentos[0];
  igual('2 FDs no mesmo piso: switch e patch panel por FD', [p.fds, p.paineis, p.switches], [2, 2, 2]);
  igual('backbone com um lance por FD', g.backboneM, Math.ceil((15 + 15 + 150 / 2) * 1.2));
  // pavimento só com APs era descartado (APs sumiam do projeto)
  const d2 = JSON.parse(JSON.stringify(motor.exemplo()));
  d2.pavimentos.push({ nome: 'Área externa', area_util_m2: 0, aps: 4, pontos_extra: 0 });
  const g2 = motor.processar(d2).calc;
  igual('pavimento só com APs entra (4 APs × 2 tomadas = 8 pontos)', g2.pavimentos.find(x => x.nome === 'Área externa')?.pontos, 8);
}
(async () => {
  for (const tp of motor.tiposDisponiveis(res)) igual(`documento ${tp}`, (await motor.gerarDocumento(res, tp)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento usa os códigos de mão de obra existentes', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'rede_ponto'), true);
  fim();
})();
