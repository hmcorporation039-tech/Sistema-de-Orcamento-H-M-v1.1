---
name: telefonia-interfonia
description: Projeto (memorial, ramais, central e placas, prumada CI/CCI, DG e blocos IDC-110, DPS, nobreak e materiais), relatório de vistoria/teste ramal a ramal e orçamento de sistemas de telefonia e interfonia predial e condominial — centrais de interfonia/portaria analógicas (tipo Intelbras CP 112/CP 192/Comunic), terminais dedicados, porteiro eletrônico, terminal de portaria, PABX IP com ramais SIP, troncos e gateways, e sistemas híbridos — pelas práticas Telebrás de tubulação telefônica, ABNT NBR 14565 (pontos IP), NBR 14306, NBR 5410 e NBR 5419-4 (DPS de linha), no padrão da H&M Engenharia. Use quando o pedido envolver interfone, interfonia, central de portaria, porteiro eletrônico, ramais por apartamento, PABX, ramal SIP, telefone IP, cabo CCI ou CI, prumada telefônica, DG/distribuidor geral, bloco IDC-110/BLI, caixa de distribuição de andar, DPS de linha telefônica, teste ramal a ramal ou orçamento de telefonia/interfonia.
---

# Telefonia e interfonia (práticas Telebrás / NBR 14565 / NBR 14306) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 53 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo de telefonia e interfonia | `memorial` | Word |
| Planilha de ramais, cabos e materiais (abas Ramais, Prumada/Pavimentos, Resumo, Rede IP, Materiais) | `planilha` | Excel |
| Relatório de vistoria / teste (com teste ramal a ramal) | `laudo` | Word |
| Checklist de campo (com a lista de todos os ramais para o teste) | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos (chave `telefonia`, pasta `skills/telefonia`), depois de registrado em `backend/src/utils/disciplinasLaudo.js`: **Análise de Projeto → Laudos e projetos por disciplina → Telefonia e interfonia**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência (`tel_ponto`, `tel_central` e os códigos `tel_*` desta skill). Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** implantação nova (interfonia analógica, PABX IP ou híbrido), retrofit, ou vistoria/teste de sistema existente. Pergunte o que faltar (quantos blocos, pavimentos e unidades por andar, ramais por unidade, áreas comuns com ramal, portões com porteiro, se a tubulação existe, se há linha externa); não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-condominio.json` (2 torres × 9 pavimentos × 3 unidades = 54 ramais de unidades, 5 áreas comuns, portaria e 2 portões); o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js telefonia modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js telefonia calcular <obra>.json
   ```
   Mostre os indicadores (ramais, central/placas, cabos, blocos, nobreak, DPS), as **não conformidades de projeto** e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js telefonia documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js telefonia orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Implantação de telefonia/interfonia) ou `inspecao` (Vistoria / teste ramal a ramal)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Entradas principais

- `sistema`: tipo (`analogica`, `ip`, `hibrido`), topologia (`prumada` = CI do DG à caixa de cada andar + CCI até a unidade; `direta` = CCI do DG até cada unidade), ramais por unidade, reserva de ramais (%), ramais por placa da central, terminais de portaria e distância DG → portaria, troncos (`analogico` ou `sip`), cabo do ramal (`cci2`/`cci4`), reserva de pares na prumada (%), fator de cabo (1,15), ambiente do terminal na unidade (para a planta), nobreak e autonomia (h), DPS de linha, distância DG → BEP, tubulação existente, portas por switch (IP).
- `blocos[]`: nome, pavimentos, unidades por pavimento, 1º pavimento com unidades, pé-direito, distância do DG à base da prumada, distância média da caixa do andar à unidade, ramais por unidade (opcional, sobrepõe o do sistema), rota externa (cabo sai da edificação do DG).
- `areas_comuns[]`: nome, ramais, distância ao DG, externo (recebe DPS).
- `portoes[]`: nome, distância ao DG, fechadura (`nenhuma`, `existente`, `nova`).

## Critérios adotados

- **Ramais** = unidades × ramais/unidade + áreas comuns + terminais de portaria + porteiros; com reserva = ⌈em uso × (1 + reserva)⌉ (padrão 20 %).
- **Central analógica:** a menor de linha com capacidade ≥ ramais com reserva (16 compacta, 48, 112 tipo CP 112, 192 tipo CP 192); acima de 192 → centrais interligadas + aviso para avaliar IP. Placas = ⌈ramais ÷ ramais por placa (16)⌉; placa de tronco a cada 4 linhas [CONFERIR modelo].
- **PABX IP:** licenças SIP = ramais com reserva; gateway FXO para troncos analógicos; **híbrido**: gateway FXS com portas = ⌈ramais analógicos × (1 + reserva)⌉ (8/16/24/32 portas), portaria em telefone IP.
- **Cabos** (fator 1,15): CI por pavimento com pares = ⌈unidades do andar × ramais × (1 + reserva de pares)⌉ → cabo comercial 10/20/30/50/75/100/200 pares, comprimento = (DG → base + pavimento × pé-direito) × 1,15 + 2 m; CCI por ramal = distância média × 1,15 + descida (pé-direito); áreas comuns, portaria e portões: distância × 1,15 + 3 m; porteiro em CCI 4 pares. Alcance prático do ramal analógico 500 m [CONFERIR].
- **DG e blocos IDC-110/BLI de 10 pares:** DG = ⌈pares dos cabos ÷ 10⌉ + ⌈ramais instalados na central ÷ 10⌉ + ⌈troncos ÷ 10⌉; caixa de andar = maior entre ⌈pares do CI ÷ 10⌉ e ⌈pares dos ramais ÷ 10⌉; suporte para até 10 blocos; fio jumper 1,5 m por ramal/tronco.
- **IP (NBR 14565):** UTP Cat 6 ≤ 90 m; bloco com ponto acima de 90 m ou em outra edificação recebe switch na base da prumada com fibra OM3 até o DG; switches PoE com VLAN de voz; PoE típico 4 W (telefone), 6 W (portaria), 8 W (porteiro) [CONFERIR].
- **DPS de linha** (NBR 5410 6.3.5, NBR 5419-4, NBR 14306 [CONFERIR vigência]): em cada tronco analógico, porteiro, ramal de área externa e, nas interligações entre edificações, módulo de 10 pares nas duas pontas; DPS classe II na CA; TAP ligado ao BEP com cobre 16 mm². DPS desativado com pares externos → **NC T1 (P2)**.
- **Nobreak** por local: VA ≥ carga ÷ 0,7 × 1,25; bateria (12 V) ≥ carga × autonomia ÷ (12 × 0,85) × 1,25. Consumos típicos: central 15–40 W + 4 W por placa; PABX 30–120 W; gateway 15 W; switch 20 W + PoE [CONFERIR].
- **Referência de quantitativo:** um memorial real de cotação recebido pela empresa listava central de 112 ramais, placas de 16 ramais, 54 terminais dedicados, porteiro, terminal de portaria, CCI 50 2 pares (~3.800 m), CI 50 10 pares (~560 m), nobreak, blocos de engate rápido IDC-110 10P com suportes e plug RJ-11 — a mesma composição que a skill gera. O CCI alto daquele memorial (~70 m por ramal) indica ramais que saem direto do DG: nesse caso use a topologia `direta` ou aumente a distância média.

O checklist (20 itens) está em `dados/checklist_base.json`: teste ramal a ramal, identificação no terminal de portaria, porteiro, identificação de pares, blocos e caixas de andar, continuidade dos pares, DPS, aterramento, nobreak e, se IP, rede e segurança do PABX. Itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo `inspecao`. O teste ramal a ramal (`inspecao.teste_ramais`: chamada, áudio, identificação) entra como medição no relatório.

## Saída para planta

`calc.ambientes[]` traz um registro por unidade (`tipo: 'unidade'`, `bloco`, `pavimento`, `unidade`, `ambiente_planta` = ambiente do terminal, `ramais`, `terminais`, `tomadas`, `ramal_numeros`, `cabo`, `comprimento_m`, `simbolo: 'HM-TEL-PONTO'`), por área comum, portaria, portão (`porteiro: 1`, `fechadura`) e DG (`central`, `blocosIdc`, `nobreak`); `calc.blocos[].pavimentos[]` traz a caixa de andar (`caixa`, `ciPares`, `blocosIdc`). Gerador de planta automático ainda não registrado em `_comum/cad/plantasDisciplina.js`.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos — "Cliente Exemplo").
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado. Modelos citados ("tipo Intelbras …") são referência de capacidade — conferir ficha técnica e homologação Anatel.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
