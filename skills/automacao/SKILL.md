---
name: automacao-bms
description: Projeto (lista de pontos, arquitetura, descritivo de funcionamento e materiais), diagnóstico/comissionamento e orçamento de automação predial — BMS/supervisório (BACnet, Modbus), automação de climatização (zonas, ar externo e controle por CO₂ pela NBR 16401-3), classe de eficiência ISO 52120-1/EN 15232 e automação residencial (Zigbee, Wi-Fi, KNX), no padrão da H&M Engenharia. Use quando o pedido envolver BMS, BACS, supervisório, lista de pontos, controladores DDC, integração de chiller/VRF/medidores, automação de ar-condicionado, CO₂/DCV, retrofit de automação, KNX, casa inteligente, Alexa ou orçamento de automação.
---

# Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 30 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo da automação | `memorial` | Word |
| Lista de pontos e materiais | `planilha` | Excel |
| Relatório de comissionamento / diagnóstico | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-comercial.json` (BMS + climatização + retrofit) e `exemplos/exemplo-residencia.json` (residencial Zigbee); o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js automacao modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js automacao calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js automacao documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js automacao orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Implantação da automação) ou `diagnostico` (Diagnóstico / comissionamento)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Critérios adotados

- Lista de pontos com pontos típicos por equipamento (editáveis), 20 % de reserva, controladores de 32 pontos, segmentos RS-485 com até 32 dispositivos e 1 200 m, licença do supervisório pelo total de pontos. Pontos típicos saem com [CONFERIR].
- Ar externo pela NBR 16401-3 (Vbz = Fp·Pz + Fa·Az, nível 1, Ez = 1); setpoint de CO₂ = 420 ppm + 0,0052/(vazão por pessoa), limitado a 1 100 ppm; redução média do DCV pela ocupação média.
- Classe da automação (D a A) pela menor classe entre as funções avaliadas (simplificação da ISO 52120-1); economia pelos fatores BAC da EN 15232 sobre os consumos informados — estimativa marcada [CONFERIR].
- Residencial: Zigbee/Wi-Fi com módulos atrás dos interruptores (exigem neutro), hub a cada 50 dispositivos, AP a cada 30 dispositivos Wi-Fi; KNX com atuadores de 8/4 canais, até 64 dispositivos e 1 000 m por linha, fonte de 640 mA.

O checklist de inspeção (29 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
