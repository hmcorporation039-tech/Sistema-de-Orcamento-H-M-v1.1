---
name: cftv-iec62676
description: Projeto (estudo de cobertura DORI, gravação, PoE e materiais), laudo de vistoria e orçamento de sistemas de CFTV IP, pela IEC 62676-4, NBR 14565 e LGPD, no padrão da H&M Engenharia. Use quando o pedido envolver câmeras, CFTV, NVR/DVR, armazenamento de gravação, densidade de pixels, PoE, vistoria de câmeras ou orçamento de CFTV.
---

# CFTV (IEC 62676-4 / LGPD) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 21 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial do sistema de CFTV | `memorial` | Word |
| Planilha de câmeras e materiais | `planilha` | Excel |
| Laudo de vistoria do CFTV | `laudo` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → CFTV (IEC 62676-4 / LGPD)**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova ou inspeção/laudo de instalação existente. Pergunte o que faltar; não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-comercio.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js cftv modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js cftv calcular <obra>.json
   ```
   Mostre os indicadores e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js cftv documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js cftv orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação do CFTV) ou `vistoria` (Vistoria e laudo)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Projeto a partir da arquitetura (AutoCAD)

Com a planta de arquitetura do cliente em DXF (no AutoCAD: Salvar como → DXF 2018; ambientes = polilinhas fechadas com o nome escrito dentro):

1. `node skills/_comum/cli.js cftv ambientes arquitetura.dwg` (ou .dxf) — lista os ambientes com área e perímetro reais e as portas (use para preencher o formulário).
2. `node skills/_comum/cli.js cftv planta dados.json --arquitetura arquitetura.dwg [--saida planta.dxf] [--escala 50]` — gera a planta DXF (milímetros, AutoCAD 2018+) com a arquitetura em cinza (ARQ-BASE), os pontos nas layers da disciplina (padrão H&M `<DISC>-<ELEMENTO>`, `skills/_comum/cad/padrao-hm.json`), legenda com quantidades, notas e o carimbo `HM-CARIMBO` com atributos.

Regra de posicionamento: câmeras nos cantos do ambiente indicado em "local", apontando para o centro. Posições são indicativas — o projetista revisa no AutoCAD, completa eletrodutos/infraestrutura e emite. No sistema: aba Laudos e projetos → "Enviar arquitetura (DXF)" e "Baixar planta (DXF)".

## Critérios adotados

- Densidade de pixels: px/m = resolução horizontal ÷ (2·d·tg(abertura/2)), comparada com DORI da IEC 62676-4 (25/62/125/250 px/m).
- Armazenamento (TB) = Mbps × 3 600 × horas × dias × atividade ÷ 8 ÷ 10⁶; NVR com 25 % de canais de reserva; PoE com 20 % de margem (câmera > 25,5 W exige porta IEEE 802.3bt; > 71,3 W fonte própria); RAID 5 com no mínimo 3 discos; cabo ≤ 90 m (NBR 14565) — o memorial lista as câmeras que excedem; quantidade 0 tira a câmera; 5 MP = 2592 px (4:3); teste de câmera só é C com imagem E gravação verificadas.
- Bitrate e consumos são típicos de mercado e saem com [CONFERIR] — usar a ficha técnica do equipamento escolhido. Placa de ambiente monitorado e política de retenção (LGPD).

O checklist de inspeção (17 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
