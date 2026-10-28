---
name: usina-solar-fotovoltaica
description: Dimensionamento, memorial descritivo para a distribuidora, relatório de comissionamento (NBR 16274) e orçamento de usinas solares fotovoltaicas conectadas à rede (micro/minigeração, REN Aneel 1000 e Lei 14.300), no padrão da H&M Engenharia. Use quando o pedido envolver energia solar, sistema fotovoltaico, módulos, inversor, strings, homologação na distribuidora, geração estimada ou comissionamento de usina.
---

# Usina solar fotovoltaica (NBR 16690 / REN 1000) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 41 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo da usina | `memorial` | Word |
| Planilha de dimensionamento e materiais | `planilha` | Excel |
| Relatório de comissionamento / inspeção (NBR 16274) | `laudo` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Usina solar fotovoltaica (NBR 16690 / REN 1000)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-residencia.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js solar modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js solar calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js solar documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js solar orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação da usina) ou `inspecao` (Comissionamento / inspeção)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Critérios adotados

- Potência: P = (consumo − disponibilidade 30/50/100 kWh) ÷ 30 ÷ (HSP × TD) — CRESESB Eq. 6.28. HSP no plano dos módulos vem do CRESESB SunData (sai com [CONFERIR]).
- Strings: Voc na temperatura mínima ≤ tensão máxima do inversor (string fixa acima disso é erro, não aviso); Vmp na temperatura máxima do módulo (Tamb + (NOCT − 20)/800 × 1000) ≥ MPPT mínimo — CRESESB Eq. 6.30 a 6.32. Coeficientes de temperatura sempre negativos (−|β|, com aviso se vier positivo). Tmín não informada = 0 °C com [CONFERIR] (DF: mínima histórica 1,4 °C, INMET); no DF, Tmín acima disso gera aviso. FDI usual 0,75 a 1,05.
- Enquadramento micro/mini pela potência instalada = menor entre módulos (kWp) e inversores (kW) — critério da Neoenergia para a REN 1000 [CONFERIR artigo vigente]. Geração mês a mês com os dias de cada mês; ano = soma dos meses.
- Ensaio por string (NBR 16274): "C" só com Voc e isolamento + / − medidos e dentro do critério; faltando um, "NV".
- Cabo CC pela Tabela C.2 da NBR 16612 corrigida pela temperatura; fusível gPV com 3 ou mais strings em paralelo quando (n − 1) × 1,25 × Isc passa da corrente reversa do módulo (1,5–2,4 × Isc); DPS CC Ucpv ≥ 1,2 × Voc; DPS CA pela Tabela 49 da NBR 5410 (função comum); lado CA pelo motor da elétrica com corrente de projeto 1,25 × nominal.

O checklist de inspeção (28 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
