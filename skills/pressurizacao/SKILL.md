---
name: pressurizacao-escadas-nbr14880
description: Projeto (memorial de cálculo de vazões com PCF fechadas e abertas, alívio de sobrepressão, força de abertura, duto/grelhas/tomada de ar, pressão estimada e motor do ventilador, alimentação pela NBR 5410), automação (painel com inversor ou soft-starter, controlador, transmissor de pressão diferencial, pressostatos, reversão para o ventilador reserva, modos manual/automático/teste, integração com a central de alarme NBR 17240), laudo de inspeção/comissionamento e orçamento de sistemas de pressurização de escadas de segurança (controle de fumaça), pela ABNT NBR 14880, CBMDF NT 10/2015 (item 4.3.1.10) e o método da IT 13 do CBPMESP / CBMGO NT 13/2025, no padrão da H&M Engenharia. Use quando o pedido envolver escada pressurizada, pressurização de escada, escada à prova de fumaça pressurizada (PFP), ventilador de pressurização, damper de alívio, registro de sobrepressão, pressostato/transmissor de pressão diferencial, painel de comando da pressurização, teste de ΔP e velocidade nas portas corta-fogo, laudo de pressurização ou orçamento de pressurização.
---

# Pressurização de escadas — controle de fumaça e automação (NBR 14880 / CBMDF) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste: `npm test` nesta pasta ou na pasta `skills` — 70 verificações, com o exemplo resolvido do Anexo F da NT 13 e contas à mão). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo (vazões, alívio, força, dutos, ventilador, elétrica, automação, diagrama de comando, materiais) | `memorial` | Word |
| Planilha de cálculo, pontos de E/S e materiais | `planilha` | Excel |
| Laudo de inspeção / comissionamento (31 itens + medições) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema

Registrada em `backend/src/utils/disciplinasLaudo.js` (chave `pressurizacao`, pasta `pressurizacao`): **Obras → Laudos e projetos por disciplina → Pressurização de escadas**. O formulário da tela é o mesmo JSON (`formulario` de `scripts/lib/index.js`); documentos e orçamento saem pelos botões. Mão de obra pelos códigos `pres_*` de `backend/src/utils/precosMaoDeObraReferencia.js`. Kits-modelo `KIT-PRES-01` (ponto de medição de ΔP) e `KIT-PRES-02` (acionador remoto). Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto novo, adequação da automação (painel) de sistema existente ou inspeção/laudo. Pergunte o que faltar; não suponha. Confirme a ocupação, a altura e as portas de **cada** pavimento (simples/dupla, acesso/saída, frestas do fabricante), elevadores e janelas na caixa da escada.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). Exemplo completo: `exemplos/exemplo-edificio.json` (geometria do Anexo F da NT 13). `node _comum/cli.js pressurizacao modelo <obra>.json` grava o modelo em branco. Valor estimado leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:** `node _comum/cli.js pressurizacao calcular <obra>.json` — mostre indicadores e avisos.
4. **Documentos:** `node _comum/cli.js pressurizacao documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>]`.
5. **Orçamento:** `node _comum/cli.js pressurizacao orcamento <obra>.json --modo execucao|automacao|inspecao` (instalação completa; só painel/automação com ventiladores existentes; inspeção, manutenção e laudo). No sistema, botão da aba ou MCP `criar_rascunho_proposta`.

## Normas e valores adotados (fonte de cada um)

Conferidos no texto em 27/10/2026:
- **CBMDF NT 10/2015 — Saídas de emergência** (Portaria 02/2015, item 4.3.1.10): escada PFP pela NBR 14880; dispositivo que impede pressão acima de **60 Pa** (r); tomada de ar no térreo ou próxima (e), cobertura só em adequação, com parede 1 m acima e 5 m (ou 3 m com 2 m acima) (f/g); grelhas a cada no máximo 2 pavimentos (k); cabos e dutos protegidos por **2 h** (l); **gerador 4 h** (o), isentos residencial ≤ 60 m, serviço profissional ≤ 21 m e escolar ≤ 30 m, que ligam antes da chave geral (p/q); ventilador em **duplicata**, único em residencial ≤ 60 m, serviço profissional ≤ 45 m e escolar ≤ 9 m (4.3.1.10.3 c), com registros de retenção (d); acionamento por detecção de fumaça nos halls, nunca dentro do espaço pressurizado, acionadores manuais complementares, acionadores "liga" na sala de controle, compartimento do ventilador e portaria, **parada só manual no painel** (4.3.1.10.5). [CONFERIR se há revisão mais nova da NT 10]
- **CBMGO NT 13/2025** (mesmo texto da IT 13 do CBPMESP — a IT 13/2019 de SP não foi aberta, [CONFERIR]): ΔP de projeto **50 Pa** (2 estágios: 15 + 50 Pa), máx. **60 Pa** com PCF fechadas (Tabela A1, 5.1.5.1); **Q = 0,827·A·ΔP^(1/N)**, N = 2 (PCF) e 1,6 (janelas) (Eq. 1); série 1/A² = Σ1/Ai² (Eq. 3); **1 m/s** nas PCF abertas (5.1.6.4 c) e 4 m/s em abertura permanente (b); QT = maior entre QFT e QAT (Eq. 4); **QTS = QT × 1,4** (duto metálico) ou × 1,5 (alvenaria/misto) (Eq. 5); áreas da Tabela A2 (PCF 2,10 × 0,89: simples 0,03/0,04 m², dupla 0,045/0,06 m², vão 1,64 m²/folha; elevador 0,06 m²); PCF abertas pela Tabela B1 (residencial ≤ 80 m → 1; serviço profissional ≤ 21 m → 1; demais → 2; +1 com local de reunião, 5.1.6.4 f), multiplicadas pelas PCF de acesso do pavimento mais desfavorável quando houver 2 ou mais (Nota 5 do Anexo B — campo `escada.acessos_por_pavimento`; vazio = ⌈PCF de acesso ÷ pavimentos⌉ com aviso [CONFERIR]); alívio QD = QTS − QFT(60 Pa) (Anexo F); velocidades nos dutos ≤ 8 m/s (captação), 10 m/s (alvenaria), 15 m/s (metálico); medido ≥ 90 % do projeto e ≤ 60 Pa; velocidade média de ≥ 12 pontos; teste semanal e ΔP anual (5.3.12); detector da casa de máquinas em laço exclusivo inibe o automático (5.3.10 l/n); PCF com destravador fecham em 30 s (q).
- **ABNT NBR 14880:2014** — norma paga, **não lida**; os valores acima são os que os bombeiros atribuem a ela. [CONFERIR]

Adotados sem norma brasileira conferida — **[CONFERIR]**:
- Força de abertura: F = Fdc + W·A·ΔP/(2(W − d)) (ASHRAE/NFPA 92), limite **133 N** (NFPA 101; a EN 12101-6 usa 100 N), fechador 40 N.
- Tempo até a pressão de projeto ≤ **60 s** (referência EN 12101-6; a NT só exige acionamento imediato) e reversão ao reserva se o pressostato não confirmar em 15 s.
- Pressão estática do ventilador **estimada**: atrito por Darcy-Weisbach com fator de Altshul-Tsal (ASHRAE Fundamentals, cap. 21; ε 0,09 mm chapa, 1,5 mm alvenaria), curvas K = 0,3, tomada de ar + filtro 50 Pa, grelha 20 Pa, registro 10 Pa, 60 Pa da escada e +10 % de efeito do sistema; rendimento do ventilador 0,6 e folga de 15 % no motor; η/FP típicos de motor IR3. Confirme com o traçado real e o catálogo.
- Velocidade de projeto no duto 10 m/s (metálico) / 8 m/s (alvenaria), tomada de ar 6 m/s, face da grelha 2,5 m/s (ruído ≤ 85 dB(A)).

## Valores da norma não são afrouxados pelo formulário

- ΔP de projeto < 50 Pa, ΔP máxima > 60 Pa, velocidade < 1 m/s, PCF abertas forçadas abaixo da Tabela B1 (+ Nota 5) ou **altura da edificação vazia** viram aviso **BLOQUEANTE** (`calc.bloqueios`) e o memorial não é gerado.
- O laudo mede sempre pelo critério normativo (`calc.criterios`): ΔP entre 90 % de máx(projeto, 50 Pa) e 60 Pa (NT 13 GO 5.1.5.1 e 5.5.3 d), V ≥ 1 m/s, força ≤ menor entre o limite do projeto e 133 N.
- Limite da força de abertura é escolha explícita do projeto (133 N NFPA 101 ou 100 N EN 12101-6; a NT 13 não fixa); vazio = 133 N com aviso. [CONFERIR na NBR 14880]

## Automação coberta

Painel dedicado com controlador programável (pontos de E/S gerados com 20 % de reserva), inversor por ventilador (PID de ΔP: setpoint 50 Pa, limite 60 Pa) ou soft-starter/partida direta com damper de alívio motorizado/gravidade; transmissor de ΔP (meio da altura, topo e base, ou por pavimento); pressostato de fluxo por ventilador com reversão automática; seletora MANUAL–0–AUTOMÁTICO, chave de TESTE, botoeiras e sinaleiros; acionadores remotos; módulo de comando da central (alarme → partida imediata) e módulos de entrada (operação/falha → central); inibição pelo detector da casa de máquinas; parada só no painel; sinal de gerador; supervisão BACnet/Modbus opcional. A calibração da automação segue o serviço real da H&M de 2026 (adequação do comando de 3 escadas pressurizadas de um hospital no DF: 2 ventiladores com soft-starter por escada, controlador, pressostatos e 1 transmissor de pressão por conjunto) — dados anonimizados, sem memorial de vazão disponível.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos).
- A detecção dos halls é projetada pela skill de incêndio (NBR 17240); aqui entram só os módulos de integração (ou os detectores, se `sistema.deteccao_existente = false`).
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test`.
