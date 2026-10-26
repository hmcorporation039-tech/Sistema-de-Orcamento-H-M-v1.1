---
name: eletrica-industrial
description: Projeto (memorial, motores, partidas, CCM, alimentadores, correção do fator de potência e curto-circuito), laudo de inspeção e orçamento de instalações elétricas industriais de baixa tensão pela ABNT NBR 5410 (6.5.1), NBR 17094-1, NBR IEC 60947-4-1, NBR IEC 61439 e REN ANEEL 1000, no padrão da H&M Engenharia. Use quando o pedido envolver motores elétricos, partida direta, estrela-triângulo, soft-starter, inversor de frequência, CCM, QGBT de indústria, contatores e relés térmicos, banco de capacitores, correção de fator de potência, corrente de curto-circuito/Icu, capacidade do transformador, laudo de elétrica industrial (NR-10/NR-12) ou orçamento de elétrica industrial.
---

# Elétrica industrial (motores, CCM, correção de FP) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 48 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.** Cada cabo é dimensionado pelo mesmo motor da skill de elétrica predial (`skills/eletrica/scripts/lib/calculo.js → dimensionarCircuito`), então tabelas e critérios da NBR 5410 são os mesmos.

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo | `memorial` | Word |
| Planilha (motores, circuitos, partidas, quadros, banco de capacitores, curto-circuito, materiais) | `planilha` | Excel |
| Laudo de inspeção (NBR 5410 / NBR IEC 61439 / NR-10 / NR-12) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

Para aparecer em **Análise de Projeto → Laudos e projetos por disciplina**, a disciplina precisa estar registrada em `backend/src/utils/disciplinasLaudo.js` (chave `eletrica_industrial`, pasta `eletrica-industrial`) e os códigos `ind_*` em `backend/src/utils/precosMaoDeObraReferencia.js`. O formulário da tela é o mesmo JSON; mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/ampliação (motores novos, CCM, banco de capacitores) ou inspeção/laudo da instalação existente. Pergunte o que faltar (placa dos motores, transformador, distâncias); não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-industria.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js eletrica-industrial modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
   - `quadros`: CCMs/QDs alimentados pelo QGBT (o QGBT já existe; não cadastrar).
   - `motores`: um tipo por linha com dados de placa (potência em cv ou kW, η, FP, Ip/In, FS, tensões de placa), partida (`direta`, `estrela_triangulo`, `soft_starter`, `inversor`), regime (S1…S10), distância do quadro, `quantidade` e `simultaneos` (o resto é reserva).
   - `outras_cargas`: iluminação, tomadas, resistivas e outras, por quadro.
   - `instalacao`: tensão (380/220 ou 440/254 V), transformador (kVA, Z %, perdas), cabo trafo → QGBT, temperatura, métodos de instalação, FP medido e alvo.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js eletrica-industrial calcular <obra>.json
   ```
   Mostre os indicadores, os avisos e as premissas [CONFERIR] antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js eletrica-industrial documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js eletrica-industrial orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Execução da instalação) ou `inspecao` (Inspeção e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Diagrama unifilar (dados)

`processar(dados).calc.unifilar` (em `scripts/lib/unifilar.js → montarUnifilar`) traz a árvore pronta para um gerador de esquema: origem (transformador kVA/Z%/Icc), cabo de entrada, QGBT (disjuntor geral, barramento, Icw, Icc, DPS, saídas: alimentadores, motores diretos, banco de capacitores) e cada CCM com as saídas de motor (TAG, kW/cv, In, partida com os dispositivos Q/K/F/T, faixas, ajustes, categoria AC-3, Icu mínimo, cabo com nº de condutores). `dadosUnifilarQD(res, { quadro })` adapta um quadro para o gerador de unifilar de quadro já existente em `skills/_comum/cad/qet/unifilar-qd.mjs` (desenha disjuntor + carga; símbolo de motor e contatores ainda não existem lá).

```bash
node -e "const m=require('./eletrica-industrial/scripts/lib/index');console.log(JSON.stringify(m.processar(require('./<obra>.json')).calc.unifilar,null,1))"
```

## Critérios adotados

- In = P / (√3·V·η·FP) (NBR 17094-1); In de placa prevalece quando informada.
- Circuito de motor (NBR 5410, 6.5.1): Ib = max(1,25; FS) × In; capacidade (Tabelas 36–42), seção mínima 2,5 mm² (Tabela 47), queda em regime ≤ 4 % e total ≤ 7 % a partir do transformador (6.2.7). Y-Δ com 6 condutores a In/√3.
- Queda na partida ≤ 10 % nos terminais do dispositivo de partida e no motor, com Ip por tipo de partida (direta Ip; Y-Δ Ip/3; soft 3 × In; inversor 1,5 × In) e FP de partida 0,35 [CONFERIR]; a seção do circuito e do alimentador sobem até atender.
- Alimentador de CCM (6.5.1): 1,25·In do maior + ΣIn dos demais em operação + outras cargas; cabos em paralelo acima de 240 mm².
- Partidas (NBR IEC 60947-4-1/-4-2): contatores AC-3; disjuntor-motor até 100 A, acima caixa moldada + relé; Y-Δ K1 = K2 ≥ In/√3, K3 ≥ In/3.
- Curto-circuito (IEC 60909): Icc = c·V/(√3·|Z|) somando rede, transformador (Z %), cabos a 20 °C e contribuição dos motores → Icu mínimo dos disjuntores e Icw dos conjuntos (NBR IEC 61439).
- Correção do FP (REN ANEEL 1000/2021, FP 0,92): Qc = P·(tg φ1 − tg φ2); banco automático em estágios iguais, dessintonizado se inversores ≥ 20 % da demanda; cabo/proteção a 1,43·Ic.
- Demanda: motores P/η × fator de utilização (0,70–0,87 por faixa [CONFERIR]); outras cargas com fatores típicos [CONFERIR]; carregamento do transformador antes e depois da correção.

O checklist de inspeção (29 itens: documentação, CCM, partidas, proteção térmica, Icu, aterramento das carcaças, intertravamentos, emergência NR-12, banco de capacitores, termografia) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos — "Cliente Exemplo").
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado. Modelos de disjuntor-motor, contator, soft-starter e inversor saem por catálogo genérico — confirmar na tabela de coordenação tipo 2 do fabricante.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
