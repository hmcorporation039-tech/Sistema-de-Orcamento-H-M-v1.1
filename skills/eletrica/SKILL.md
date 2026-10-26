---
name: eletrica-nbr5410
description: Projeto (memorial, quadro de cargas, dimensionamento de circuitos e alimentador), laudo de inspeção e orçamento de instalações elétricas prediais de baixa tensão pela ABNT NBR 5410, no padrão da H&M Engenharia. Use quando o pedido envolver instalação elétrica predial, quadro de distribuição, previsão de cargas, dimensionamento de cabos/disjuntores, queda de tensão, demanda, laudo NBR 5410/NR-10 ou orçamento de elétrica.
---

# Elétrica predial (NBR 5410) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 37 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo | `memorial` | Word |
| Quadro de cargas com fórmulas editáveis (e materiais) | `planilha` | Excel |
| Laudo de inspeção (NBR 5410 / NR-10) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Elétrica predial (NBR 5410)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-residencia.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js eletrica modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js eletrica calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js eletrica documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js eletrica orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Execução da instalação) ou `inspecao` (Inspeção e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Projeto a partir da arquitetura (AutoCAD)

Com a planta de arquitetura do cliente em DXF (no AutoCAD: Salvar como → DXF 2018; ambientes = polilinhas fechadas com o nome escrito dentro):

1. `node skills/_comum/cli.js eletrica ambientes arquitetura.dwg` (ou .dxf) — lista os ambientes com área e perímetro reais e as portas (use para preencher o formulário).
2. `node skills/_comum/cli.js eletrica planta dados.json --arquitetura arquitetura.dwg [--saida planta.dxf] [--escala 50]` — gera a planta DXF (milímetros, AutoCAD 2018+) com a arquitetura em cinza (ARQ-BASE), os pontos nas layers da disciplina (padrão H&M `<DISC>-<ELEMENTO>`, `skills/_comum/cad/padrao-hm.json`), legenda com quantidades, notas e o carimbo `HM-CARIMBO` com atributos.

Regra de posicionamento: tomadas pela previsão da NBR 5410 (9.5.2.2) distribuídas nas paredes, TUE com a potência, pontos de luz (mínimo 1 por cômodo) e interruptor por ambiente, quadro no primeiro ambiente. Posições são indicativas — o projetista revisa no AutoCAD, completa eletrodutos/infraestrutura e emite. No sistema: aba Laudos e projetos → "Enviar arquitetura (DXF)" e "Baixar planta (DXF)".

## Quadro de cargas editável

O projetista ajusta o quadro de cargas durante o projeto sem perder as contas da norma:

- **No formulário (sistema ou JSON):** ambientes (nome, tipo, área, perímetro, tomadas extras, iluminação e TUG adotadas); circuitos — depois de calcular, o botão **"Trazer os circuitos calculados"** copia a divisão automática para a tabela e cada campo pode ser alterado: descrição, potência (VA, ou `potencia_w` + `fp`), comprimento, fases (fixa a fase; vazio = balanceamento automático), método, agrupamento, **disjuntor** e **seção** (vazio = calculado; informado = conferido: Ib ≤ In ≤ Iz, Tabela 47 e queda, com aviso se não atender), DR. Fatores de demanda: fixos (`fd_ilum_tug_fixo`, `fd_tue_fixo`) ou por faixas ("Trazer os fatores padrão" copia a tabela típica para editar).
- **Na planilha Excel** (`scripts/lib/planilhaQuadro.js`): células **amarelas** editáveis e **brancas** com as fórmulas da NBR 5410, que recalculam sozinhas — previsão 9.5.2 (iluminação e tomadas mínimas, 600 VA), Ib, FCT (Tab. 40, ar/solo), FCA (Tab. 42), disjuntor, seção calculada (menor que atende mínima, Iz ≥ In e queda), Iz, queda, neutro, PE (Tab. 58), carga por fase e desequilíbrio, demanda (fixa ou por faixa), alimentador, reserva (Tab. 59) e DPS. A ligação ambiente → circuito fica em colunas da aba "Previsão de cargas" (trocar o número muda o ambiente de circuito). Linhas amarelas vazias para circuitos/ambientes novos. Abas protegidas sem senha. O teste recalcula a planilha num motor de fórmulas e compara com o motor da skill (também conferido no Excel).

## Critérios adotados

- Previsão de cargas pela NBR 5410, 9.5.2 (iluminação por área e TUG por perímetro/ambiente); TUEs por ambiente em `tues`.
- Seção pelo maior entre capacidade de condução (Tabelas 36–39, fatores das Tabelas 40 e 42), proteção (In ≤ Iz) e queda de tensão (6.2.7); seções mínimas da Tabela 47 e PE da Tabela 58.
- Alimentador bifásico com 3 condutores carregados (Tabela 46). Fatores de demanda típicos marcados [CONFERIR com a Neoenergia DIS-NOR-030/053].

O checklist de inspeção (37 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
