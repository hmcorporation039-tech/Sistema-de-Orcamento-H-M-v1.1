---
name: antena-coletiva
description: Projeto (memorial com cálculo de níveis por ponto, planilha de derivadores/multiswitch e materiais), relatório de medição/comissionamento e orçamento de sistemas de antena coletiva e TV — MATV para TV digital aberta ISDB-Tb (UHF, canais 14–51) por prumada com derivadores e SMATV com parabólica banda Ku, LNBF e multiswitch — com aterramento do mastro e DPS coaxial (NBR 5419 / NBR 5410), IEC/EN 60728 e NBR 14565 como referências, no padrão da H&M Engenharia. Use quando o pedido envolver antena coletiva, antena de TV, TV digital, ISDB-Tb, UHF, parabólica, banda Ku, LNBF, multiswitch, derivador, divisor, amplificador de linha/headend, cabo RG-6, nível de sinal em dBµV, MER/BER, medição de sinal de TV em prédio ou orçamento de antena coletiva.
---

# Antena coletiva / TV (MATV e SMATV) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 44 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo de níveis | `memorial` | Word |
| Planilha de níveis, componentes e materiais | `planilha` | Excel |
| Relatório de medição / comissionamento | `relatorio` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor pode rodar no Sistema de Orçamentos (**Análise de Projeto → Laudos e projetos por disciplina**) quando a chave `antena` for registrada em `backend/src/utils/disciplinasLaudo.js`. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pelos códigos `antena_*` da tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou medição/vistoria de sistema existente; só TV aberta, só satélite ou os dois. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-predio.json` (2 torres, áreas comuns, TV aberta + satélite); o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js antena modelo <obra>.json` grava o modelo em branco). **O nível na antena deve ser medido** com analisador no local; estimado sai com `[CONFERIR]`. Nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js antena calcular <obra>.json
   ```
   Mostre os indicadores, a tabela de derivadores por pavimento e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js antena documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js antena orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação da antena coletiva) ou `inspecao` (Vistoria e medição)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Entradas principais

- **Sistema:** `terrestre`, `satelite` ou `ambos`; em `ambos`, a TV aberta vai pela entrada terrestre do multiswitch (tomada TV/SAT, um cabo) ou por rede de derivadores separada (`rede_terrestre: separada`).
- **Sinais:** tabela de canais físicos com o nível de cada um na saída da antena (dBµV) — define o canal mais fraco e o mais forte; ou os dois níveis direto. Satélite: nível na saída do LNBF, topologia `cascata` (multiswitch por pavimento) ou `estrela` (multiswitch no headend).
- **Edificação:** por torre — pavimentos, unidades por pavimento, pontos de TV (e de satélite) por unidade, distância média/menor/maior da prumada à unidade, distância do headend à prumada, ambientes com TV da unidade-tipo; áreas comuns com pontos e cabo desde o headend.
- **Headend e cabos:** distância antena → headend, ganho máximo e nível máximo de saída do amplificador (DIN 45004B), figura de ruído, atenuação do RG-6 do catálogo (opcional), faixa e alvo de nível na tomada.

## Critérios adotados (cálculo de enlace)

- **Nível na tomada** = nível na antena − cabo até o headend + ganho − divisor do headend − cabo da prumada (dB/m × m) − inserções dos derivadores anteriores − derivação do pavimento − cabo até a unidade e a tomada − divisor da unidade − tomada. **Mínimo**: canal mais fraco na maior frequência (ex.: 698 MHz) e maior percurso; **máximo**: canal mais forte na menor frequência e menor percurso.
- **Derivador por pavimento:** o MAIOR valor comercial (8/12/16/20/24 dB; com 4+ saídas o mínimo é 12 ou 16 dB) que mantém a tomada pior do pavimento no alvo (padrão: mínimo + 10 dB) — equaliza a prumada e guarda sinal para os pavimentos de baixo. Se o máximo passar do limite, sobe a derivação; se nem 24 dB bastar, atenuador nas saídas. Até 8 unidades por derivador; saídas sem uso e fim da prumada com terminador 75 Ω.
- **Amplificador:** menor ganho (passo 0,5 dB) que leva todas as tomadas ao alvo, limitado pelo ganho máximo e pelo nível máximo de saída reduzido em 7,5·log(N − 1) para N canais; sinal forte demais → atenuador na entrada (sem amplificador); se o headend não basta → amplificador de linha na prumada (ganho útil ≥ 6 dB). C/N = nível na entrada − NF − 2,2 dBµV (ruído térmico em 5,57 MHz), estágios somados em potência.
- **Satélite:** um multiswitch 5×N (4 SAT + TERR) por pavimento até 32 saídas (cascata) ou todos no headend (estrela); uma saída por ponto; níveis a 950 e 2 150 MHz; amplificador de FI no headend e de linha no tronco quando necessário.
- **Faixas padrão [CONFERIR]:** TV digital 50–80 dBµV, MER ≥ 25 dB, BER pós-Viterbi ≤ 2×10⁻⁴; satélite 47–77 dBµV, MER ≥ 11 dB. Atenuações do cabo e perdas de derivadores/divisores são típicas de catálogo — conferir com o fabricante escolhido.
- **Proteção:** mastro na zona de proteção do SPDA e ligado à equipotencialização (16 mm² Cu — NBR 5419-3, IEC/EN 60728-11); DPS coaxial em cada cabo de antena na entrada do edifício, ligado ao BEL/BEP (NBR 5419-4, NBR 5410).
- **Normas:** a norma ABNT específica de distribuição de sinais de TV em edificações tem número a confirmar `[CONFERIR]`; o memorial cita IEC/EN 60728-1/-11, NBR 15601/15604 (ISDB-Tb), NBR 14565 (topologia, caminhos e identificação), NBR 5419, NBR 5410 e NBR 6123.

O checklist de inspeção (16 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção. As medições por ponto (nível, MER, BER) entram no parecer.

## Saídas para planta

`res.calc.unidades` lista cada unidade (torre, pavimento, número, derivador/multiswitch) com as tomadas (`id`, `ambiente`, `tipo` TV/SAT/TV-SAT e níveis de projeto); `res.calc.plantaTipo` dá as tomadas por ambiente da unidade-tipo de cada torre e `res.calc.pontosAreas` as das áreas comuns.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
