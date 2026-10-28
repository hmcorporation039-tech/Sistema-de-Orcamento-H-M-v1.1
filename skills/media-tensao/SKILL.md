---
name: media-tensao-nbr14039
description: Projeto de subestação de média tensão (13,8 kV) para a distribuidora — demanda e escolha do transformador, correntes e curto-circuito, proteção geral (disjuntor com relé 50/51/50N/51N ou fusível), cabo de MT pela integral de Joule, para-raios, disjuntor geral e barramento de BT, malha de aterramento com toque e passo, medição e demanda contratada —, laudo de inspeção/manutenção de SE e orçamento, pela ABNT NBR 14039:2021, NBR 15751, NBR 5356 e REN ANEEL 1000/2021, no padrão da H&M Engenharia. Use quando o pedido envolver subestação, cabine primária, transformador de MT, entrada em média tensão, Grupo A, ligação nova em 13,8 kV na Neoenergia, relé de proteção 50/51, malha de aterramento de SE, manutenção preventiva de subestação, ensaio de óleo, termografia de SE ou orçamento de subestação.
---

# Média tensão / subestação (NBR 14039) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 59 verificações desta disciplina, com o caso à mão do trafo de 500 kVA, o exemplo 1 da IEEE 80 e os casos da revisão de 27/10/2026 (brita, trafos grandes, chave fusível, TC, para-raios)). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo para a distribuidora | `memorial` | Word |
| Planilha de cálculo e materiais (demanda, trafo, correntes, proteção, cabos, malha, unifilar, materiais) | `planilha` | Excel |
| Laudo de inspeção/manutenção da SE (28 itens + ensaios) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

O lado de baixa tensão (cabos do transformador ao QGBT) usa as tabelas da NBR 5410 da skill de **elétrica** (`skills/eletrica/scripts/lib/tabelas.js`), e a demanda pode ser importada de um projeto da skill de elétrica.

## Também no sistema (aba Análise de Projeto)

Depois de registrada em `backend/src/utils/disciplinasLaudo.js` (chave `media_tensao`, pasta `media-tensao`), o mesmo motor roda em **Análise de Projeto → Laudos e projetos por disciplina → Média tensão — subestação (NBR 14039)**. O formulário da tela é o mesmo JSON; documentos e orçamento saem pelos botões. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto de SE nova / aumento de carga, ou manutenção/laudo de SE existente. Pergunte o que faltar; não suponha. **Peça à distribuidora o nível de curto (kA ou MVA) no ponto de entrega** e confirme a revisão vigente da norma de fornecimento.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-subestacao.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js media-tensao modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
   - Demanda: `cargas.quadros` (kW e FP por quadro) **ou** `cargas.demanda_total_kw`. Para importar da skill de elétrica: `cargas.arquivo_eletrica` com o caminho do JSON da obra elétrica (absoluto ou relativo à pasta onde o comando é rodado; aceita lista) ou o próprio JSON em `cargas.eletrica`.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js media-tensao calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js media-tensao documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js media-tensao orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Execução da subestação) ou `inspecao` (Manutenção preventiva e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.
6. **Diagrama unifilar:** o resultado traz `calc.unifilar` (elementos na ordem ponto de entrega → proteção → trafo → QGBT, com `ligacoes` em série, `derivacoes` para a terra e `comandos` TC → relé → disjuntor), base para desenhar o unifilar no QElectroTech. A mesma sequência sai na aba "Unifilar" da planilha e na seção 13 do memorial.

## Critérios adotados

- **Demanda e transformador:** soma dos kVA dos quadros × fator de diversidade, com reserva de crescimento; potência comercial imediatamente superior (75/112,5/150/225/300/500/750/1000/1500… kVA, NBR 5356); Z típica (3,5 / 4,5 / 5 / 6 %) só se a placa não for informada [CONFERIR].
- **Correntes:** In = S/(√3·V); Icc no secundário = S/(√3·V·Z%) (barramento infinito, usada para especificar o disjuntor e o barramento) e também com a impedância da fonte; pico κ·√2·Icc (IEC 60909).
- **Tipo de SE e proteção (Neoenergia — tudo [CONFERIR]):** até 300 kVA, SE em poste e proteção por chave fusível (elo pela tabela usual de 13,8 kV) ou seccionadora + fusível HH; acima de 300 kVA, SE abrigada/blindada/ao tempo com disjuntor e relé secundário 50/51 e 50N/51N (NBR 14039). Medição em BT até 300 kVA com transformador único, senão em MT.
- **Relé (indicativo):** 51 = 1,2 × In primária, curva IEC muito inversa, dial 0,1, abaixo do ponto ANSI (100/Z × In, 2–5 s); 50 = 1,1 × maior entre a magnetização (8 × In) e o curto do secundário referido ao primário; 51N = 0,3 × 51; TC com primário ≥ Icc/20. Os ajustes definitivos são do estudo de proteção aprovado pela distribuidora.
- **Cabo de MT:** maior entre capacidade (tabela típica 8,7/15 kV EPR 90 °C [CONFERIR]), seção mínima (NBR 14039: 10 mm²; distribuidora: 35 mm² [CONFERIR]) e curto pela integral de Joule S ≥ I·√t/k (k = 143, Cu EPR/XLPE 90→250 °C).
- **Para-raios:** ZnO 12 kV / 10 kA para 13,8 kV com neutro efetivamente aterrado; **18 kV (MCOV 15,3 kV) se não efetivamente aterrado** — as fases sãs ficam na tensão de linha durante a falta à terra, então a MCOV precisa cobrir ~1,05 × a tensão entre fases (15 kV, MCOV ~12,7 kV, não serve) [CONFERIR].
- **Chave fusível de derivação/proteção:** corrente nominal 100 ou 200 A ≥ In primária; capacidade de interrupção usual de chave tipo expulsão 7,1 kA simétricos — curto maior gera aviso; elo 80K (≈ 120 A contínuos) não cobre trafo com In primária maior. Em SE em poste com disjuntor, as chaves fusíveis fazem o seccionamento visível a montante [CONFERIR com a distribuidora].
- **TC de proteção:** escolhido pelo curto (primário ≥ Icc/20); se a partida do 51 ou do 51N ficar abaixo de ~5 % da nominal do TC no secundário, sai aviso para conferir a faixa do relé ou usar TC menor/neutro sensível [CONFERIR].
- **Lado de BT:** se nenhuma combinação de até 10 cabos de até 300 mm² por fase atender o disjuntor geral, adota barramento blindado (bus way) com aviso; corrente secundária acima do maior disjuntor da tabela (6.300 A) gera aviso de que o arranjo não tem proteção geral única.
- **Malha (NBR 15751 / IEEE 80, simplificado [CONFERIR]):** solo em duas camadas reduzido a ρ aparente (camadas em paralelo até a profundidade de influência); resistência por Sverak (conferência por Laurent-Niemann); condutor por Onderdonk (mín. 50 mm²); toque e passo admissíveis pelo critério de Dalziel (50 kg por padrão) — **brita só entra se for informada** (ρs e espessura; aí ela é orçada); sem brita, Cs = 1 e ρs = ρ do solo — comparados com Em/Es da IEEE 80 e o GPR. Para projeto definitivo, verificar com software de malha.
- **Demanda contratada (REN 1000/2021):** demanda arredondada a 5 kW, mínimo 30 kW, ultrapassagem acima de 105 %; banco de capacitores se FP < 0,92.

O checklist de inspeção (28 itens) está em `dados/checklist_base.json`; itens não conformes e pontos quentes da termografia viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção. Ensaios do laudo: isolamento, óleo (rigidez/água), termografia (ΔT), relé (tempo medido × curva) e resistência da malha.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Tudo que depende da norma da distribuidora está em `scripts/lib/tabelas.js` (`DISTRIBUIDORA`, `ELO_FUSIVEL_13_8`, capacidades de cabo) e marcado [CONFERIR] — atualize ali quando a Neoenergia revisar a norma.
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
