---
name: carregador-veicular-nbr17019
description: Projeto, memorial, laudo de vistoria e orçamento de pontos de recarga de veículos elétricos (wallbox, modo 2/3/4) pela ABNT NBR 17019:2022 com a NBR 5410, no padrão da H&M Engenharia. Use quando o pedido envolver carregador veicular, recarga de VE, wallbox, eletroposto, NBR 17019 ou aumento de carga para recarga.
---

# Carregador veicular (NBR 17019) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 14 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial do ponto de recarga | `memorial` | Word |
| Planilha de circuitos e materiais | `planilha` | Excel |
| Laudo de vistoria (NBR 17019) | `laudo` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Carregador veicular (NBR 17019)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-condominio.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js carregador modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js carregador calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js carregador documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js carregador orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação do ponto de recarga) ou `vistoria` (Vistoria e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Critérios adotados

- Circuito exclusivo por ponto, fator de demanda 1 (salvo controle de recarga), dimensionado pelo mesmo motor da skill de elétrica.
- DR 30 mA no mínimo tipo A; modo 3 sem RDC-DD no carregador exige tipo B (6.3.3.2.102). Sem PEN no esquema TN.
- Verificação da carga adicional no padrão de entrada (7.1.101) e DPS obrigatório em local com público.

O checklist de inspeção (18 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
