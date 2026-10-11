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
(async () => {
  for (const tp of motor.tiposDisponiveis(res)) igual(`documento ${tp}`, (await motor.gerarDocumento(res, tp)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento usa os códigos de mão de obra existentes', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'rede_ponto'), true);
  fim();
})();
