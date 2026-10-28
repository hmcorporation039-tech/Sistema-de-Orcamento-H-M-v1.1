---
name: cabeamento-nbr14565
description: Projeto (memorial, pontos, racks e materiais), relatório de certificação/inspeção e orçamento de cabeamento estruturado pela ABNT NBR 14565:2019, no padrão da H&M Engenharia. Use quando o pedido envolver pontos de rede, cabeamento Cat 5e/6/6A, rack, patch panel, distribuidor de piso, backbone óptico, certificação de rede ou orçamento de cabeamento.
---

# Cabeamento estruturado (NBR 14565) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 18 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial de cabeamento estruturado | `memorial` | Word |
| Planilha de pontos e materiais | `planilha` | Excel |
| Relatório de inspeção / certificação | `laudo` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Cabeamento estruturado (NBR 14565)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-escritorio.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js cabeamento modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js cabeamento calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js cabeamento documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js cabeamento orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação do cabeamento) ou `certificacao` (Certificação e relatório)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Projeto a partir da arquitetura (AutoCAD)

Com a planta de arquitetura do cliente em DXF (no AutoCAD: Salvar como → DXF 2018; ambientes = polilinhas fechadas com o nome escrito dentro):

1. `node skills/_comum/cli.js cabeamento ambientes arquitetura.dwg` (ou .dxf) — lista os ambientes com área e perímetro reais e as portas (use para preencher o formulário).
2. `node skills/_comum/cli.js cabeamento planta dados.json --arquitetura arquitetura.dwg [--saida planta.dxf] [--escala 50]` — gera a planta DXF (milímetros, AutoCAD 2018+) com a arquitetura em cinza (ARQ-BASE), os pontos nas layers da disciplina (padrão H&M `<DISC>-<ELEMENTO>`, `skills/_comum/cad/padrao-hm.json`), legenda com quantidades, notas e o carimbo `HM-CARIMBO` com atributos.

Regra de posicionamento: pontos de telecomunicações por área de trabalho em cada ambiente da arquitetura, rack no primeiro ambiente. Posições são indicativas — o projetista revisa no AutoCAD, completa eletrodutos/infraestrutura e emite. No sistema: aba Laudos e projetos → "Enviar arquitetura (DXF)" e "Baixar planta (DXF)".

## Critérios adotados

- Duas tomadas por área de trabalho (6.7.7.1) e duas por ponto de acesso sem fio (Seção 15).
- Comprimento máximo do cabo horizontal pela Tabela 3 (H = 107 − 3 − F·X para Cat 6 em interconexão), reduzido por temperatura (0,4 %/°C; 0,2 % blindado), limitado a 90 m.
- Um distribuidor de piso por pavimento e por 1 000 m² (6.7.3); cada FD com os próprios patch panels e switches; rack por FD = (patch panels + switches) × 2U (com organizador) + 2U, com reserva; backbone OM3 quando há mais de um distribuidor, um lance por FD.

O checklist de inspeção (18 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
