---
name: alarme-intrusao
description: Projeto (memorial, zonas, partições, central, bateria e materiais), relatório de vistoria/teste e orçamento de sistemas de alarme de intrusão monitorado — sensores magnéticos, IVP/pet/dupla tecnologia, barreiras infravermelhas, sirenes, teclados, comunicação IP/4G com a central de monitoramento — com referência na IEC 62642 / EN 50131 e EN 50136, no padrão da H&M Engenharia. Use quando o pedido envolver alarme, sensor de presença, IVP, sensor magnético de porta/janela, barreira infravermelha, central de alarme, monitoramento 24 h, zonas e partições, bateria da central, teste de alarme ou orçamento de alarme.
---

# Alarme de intrusão monitorado (EN 50131 / EN 50136) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 55 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo do alarme | `memorial` | Word |
| Planilha de ambientes, zonas e materiais | `planilha` | Excel |
| Relatório de vistoria e teste | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

Não há NBR específica de sistemas de alarme de intrusão: o memorial diz isso e adota a IEC 62642 / série EN 50131 e a EN 50136 como referência, com a ABNT NBR 5410 e a NBR 5419-4 para a alimentação e os DPS.

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Alarme de intrusão monitorado**, depois que a pasta `alarme` for registrada em `backend/src/utils/disciplinasLaudo.js`. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência (códigos `alarme_*`). Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** instalação nova (projeto + execução) ou vistoria/teste de sistema existente. Pergunte o que faltar (grau de segurança, monitoramento, meios de comunicação, partições, animais); não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-residencia.json` (casa térrea com 8 ambientes, híbrido, 2 partições, barreiras no muro); o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js alarme modelo <obra>.json` grava o modelo em branco). Portas e janelas podem vir da legenda de esquadrias da arquitetura. Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js alarme calcular <obra>.json
   ```
   Mostre os indicadores, as zonas e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js alarme documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js alarme orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Instalação do alarme) ou `inspecao` (Vistoria e teste)). Com `orcamento.incluir_mensalidade`, a mensalidade do monitoramento entra só nas **observações** da proposta (contrato à parte; não é item, para não somar no total). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Critérios adotados

- **Grau de segurança** 1 a 4 e **classe ambiental** I a IV (EN 50131-1 / EN 50130-5); externos sempre classe IV.
- **Magnéticos** (EN 50131-2-6): 1 por porta de acesso + 1 por janela acessível (configurável: todas / nenhuma / por janela). Com fio: os do mesmo ambiente e função em série numa zona; sem fio: um por zona.
- **IVP** (EN 50131-2-2): área coberta = π·r²·θ/360 (12 m / 90° → 113 m²); nº = maior entre ⌈área ÷ área coberta⌉ e ⌈maior dimensão ÷ alcance⌉. Animais → IVP pet; risco alto → dupla tecnologia (EN 50131-2-4), área coberta × 0,5 e mínimo 2. Pé-direito acima de 3,6 m gera aviso.
- **Perímetro:** pares de barreira IVA = maior entre nº de trechos retos e ⌈comprimento ÷ alcance útil⌉ (alcance útil = metade do nominal).
- **Zonas e central:** zonas × (1 + 20 % de reserva) → central típica de 16/64/128/256 zonas que também comporte as partições; expansores de 8 zonas para as zonas com fio além da placa; receptor sem fio por 64 dispositivos; repetidores = ⌈área com sem fio ÷ 300 m²⌉ − 1.
- **Comando e aviso:** teclados = maior entre partições e acessos principais; sirenes internas = 1 por partição, externa 1 (autoalimentada nos graus 3 e 4 — EN 50131-4).
- **Bateria** (EN 50131-6): autonomia pelo grau — 12 h (graus 1–2), 30 h / 60 h (graus 3–4 com/sem notificação da falta de rede) [CONFERIR edição vigente]; C = 1,25 × (I_repouso × T + I_alarme × t_alarme) / 1000. Fonte = repouso + recarga de 80 % em 72 h (graus 1–2) ou 24 h (graus 3–4).
- **Comunicação** (EN 50136-1): categoria mínima do ATS por grau (SP2/DP1 no grau 2, SP4/DP2 no grau 3, SP5/DP3 no grau 4), Contact ID / SIA DC-09; grau 3+ com uma via só gera aviso de dupla via. Verificação por vídeo → LGPD.
- **Cabeamento:** cabo de alarme 4 vias por detector/grupo/teclado com fio = distância média × 1,3 + 2 m; sirenes em 2 × 0,75 mm²; infraestrutura ≈ 50 % do cabo.
- Autonomias, categorias, dígitos de senha, tempo de entrada (≤ 45 s), consumos, alcances e capacidades de central saem com **[CONFERIR]** — conferir na edição vigente da norma e na ficha técnica do equipamento escolhido.

O checklist de vistoria (26 itens: teste de cada zona, tamper, bateria, falta de rede, sirenes, tempos de entrada/saída, senhas, partições, pânico/coação, comunicação com a central de monitoramento, via reserva, LGPD, infraestrutura e DPS) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção. O teste zona a zona e os ensaios (tempo de entrada, tempo de transmissão, tensão da bateria sem rede) entram no parecer.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
