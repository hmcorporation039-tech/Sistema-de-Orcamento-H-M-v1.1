---
name: incendio-nbr17240
description: Projeto (memorial e quantitativos), laudo de inspeção/comissionamento e orçamento de sistemas de detecção e alarme de incêndio (ABNT NBR 17240) e iluminação de emergência (ABNT NBR 10898), no padrão da H&M Engenharia. Use quando o pedido envolver detectores de fumaça/temperatura, acionadores manuais, avisadores, central de alarme, laços, bateria da central, iluminação de emergência, balizamento ou laudo de incêndio.
---

# Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 20 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial de detecção, alarme e emergência | `memorial` | Word |
| Planilha de dispositivos, bateria e materiais | `planilha` | Excel |
| Laudo de inspeção / comissionamento | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-escritorio.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js incendio modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js incendio calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js incendio documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js incendio orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação do sistema) ou `inspecao` (Inspeção e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Projeto a partir da arquitetura (AutoCAD)

Com a planta de arquitetura do cliente em DXF (no AutoCAD: Salvar como → DXF 2018; ambientes = polilinhas fechadas com o nome escrito dentro):

1. `node skills/_comum/cli.js incendio ambientes arquitetura.dwg` (ou .dxf) — lista os ambientes com área e perímetro reais e as portas (use para preencher o formulário).
2. `node skills/_comum/cli.js incendio planta dados.json --arquitetura arquitetura.dwg [--saida planta.dxf] [--escala 50]` — gera a planta DXF (milímetros, AutoCAD 2018+) com a arquitetura em cinza (ARQ-BASE), os pontos nas layers da disciplina (padrão H&M `<DISC>-<ELEMENTO>`, `skills/_comum/cad/padrao-hm.json`), legenda com quantidades, notas e o carimbo `HM-CARIMBO` com atributos.

Regra de posicionamento: detectores em grade com a quantidade calculada por ambiente (raio de cobertura, 5.4.1.1), acionadores e avisadores nas rotas de fuga, central no primeiro ambiente. Posições são indicativas — o projetista revisa no AutoCAD, completa eletrodutos/infraestrutura e emite. No sistema: aba Laudos e projetos → "Enviar arquitetura (DXF)" e "Baixar planta (DXF)".

## Critérios adotados

- Raio de cobertura = lado/√2 (fumaça 9/√2 = 6,36 m; temperatura 6/√2 = 4,24 m), reduzido por vigas a 2/3 ou 1/2 (NBR 17240, 5.4.1.4).
- Acionadores a no máximo 30 m de caminhamento, altura 0,90–1,35 m; avisadores 2,20–3,50 m. Bateria pelo Anexo B: 1,2 × (24·Irep + 5/60·Ialm).
- Emergência (NBR 10898:2023): autonomia 2 h (4.9; a edição de 2013 pedia 1 h) ou a maior exigida pela IT/NT local (`sistema.autonomia_iluminacao_h`, nunca abaixo de 2 h) [CONFERIR CBMDF], 3 lx (5 lx em escadas), espaçamento ≤ 4 × altura, balizamento a cada 15 m.

O checklist de inspeção (32 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
