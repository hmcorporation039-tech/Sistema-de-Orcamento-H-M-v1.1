---
name: climatizacao-nbr16401
description: Projeto (memorial de carga térmica por componentes — envoltória, pessoas, iluminação, equipamentos e ar externo pela NBR 16401-3 com o mínimo de 27 m³/h·pessoa —, capacidade em TR/kW/BTU/h, escolha do sistema split/VRF/self/água gelada, chiller com COP/IPLV pela AHRI 550/590 e mínimo da ASHRAE 90.1, vazão de água gelada e bombas primária/secundária, fancoil/AHU, VAV com vazão mínima pelo ar externo, reaquecimento e controle de pressão do duto, dutos pelo método de Altshul-Tsal, difusores e cargas elétricas), PMOC (Lei 13.589/2018 e Portaria MS 3.523/1998 — inventário, rotinas por equipamento e periodicidade, cronograma e responsável técnico), relatório de vistoria com medições (vazão, temperatura, umidade, CO₂ pela NBR 17037/RE 09/2003, água gelada) e orçamento de climatização, pela ABNT NBR 16401-1/2/3, ASHRAE 62.1 e 90.1, no padrão da H&M Engenharia. Use quando o pedido envolver ar-condicionado, climatização, HVAC, carga térmica, TR/BTU, split, VRF/VRV, self-contained, rooftop, chiller, água gelada, fancoil, AHU, VAV, dutos, difusores, ar externo/renovação de ar, PMOC, qualidade do ar interior, vistoria de ar-condicionado ou orçamento de climatização.
---

# Climatização — carga térmica, sistemas centrais e PMOC (NBR 16401 / Lei 13.589) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste: `npm test` nesta pasta ou na pasta `skills` — 77 verificações com contas à mão). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo (condições, carga por ambiente e por componente, ar externo, sistema, unidades de ar, VAV, dutos, central de água gelada, bombas, cargas elétricas, materiais e **pendências [CONFERIR]**) | `memorial` | Word |
| Planilha de carga térmica, envoltória, unidades de ar, VAV, água gelada, cargas elétricas, PMOC e materiais | `planilha` | Excel |
| PMOC — Plano de Manutenção, Operação e Controle (identificação, RT, inventário, rotinas, cronograma anual, registro) | `pmoc` | Word |
| Relatório de vistoria e medições (35 itens + vazão, ambiente e água gelada) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema

Registrada em `skills/_comum/disciplinas.js` (chave `climatizacao`, pasta `climatizacao`, sigla `CLIM`): **Obras → Projetos por disciplina / Laudos → Climatização**. O formulário da tela é o mesmo JSON (`formulario` de `scripts/lib/index.js`). Mão de obra pelos códigos `clim_*` de `backend/src/services/precosMaoDeObraReferencia.js`. O catálogo de equipamentos do banco (`equipamentos_catalogo`, migração 2.0-42, rotas `/api/equipamentos-catalogo`, escrita só do admin) entra em `dados.catalogo_equipamentos` e a skill escolhe o menor modelo que atende, preferindo os verificados.

## Fluxo de trabalho

1. **Entender o serviço:** projeto novo, PMOC de sistema existente ou vistoria/medição. Confirme cidade (dados climáticos), uso e ocupação de cada ambiente, fachadas e vidros, e se o uso é público e coletivo (PMOC obrigatório).
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). Exemplo completo e fictício: `exemplos/exemplo-escritorio.json` (chiller com VAV). Valor estimado leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:** `node _comum/cli.js climatizacao calcular <obra>.json` — mostre indicadores, avisos e pendências.
4. **Documentos:** `node _comum/cli.js climatizacao documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>]`.
5. **Orçamento:** `node _comum/cli.js climatizacao orcamento <obra>.json --modo execucao|pmoc|vistoria`.

## Etapas cobertas

1. **Carga térmica e seleção** (`calculo.js`): psicrometria no local (altitude, TBU), envoltória por U·A·(ΔT + α·I·Rse) e vidros por U·A·ΔT + A·FS·I, pessoas, iluminação, equipamentos, infiltração e ar externo (Fp·Pz + Fa·Az ÷ Ez, mínimo 27 m³/h·pessoa); capacidade com fator de segurança; escolha automática do sistema (critério H&M declarado) e pré-seleção de split, VRF (combinação) ou self.
2. **Sistemas centrais** (`centrais.js`): unidades de ar (fancoil/AHU ou self dutado), ar externo multizona (Zpz, Ev, Vot), serpentina e água gelada, VAV (mínima pelo ar externo e fração controlável, caixas por zona, reaquecimento, limite 90.1 6.5.2.1, setpoint e sensor de pressão do duto), dutos e ventilador pelo motor comum de dutos (`_comum/dutos.js`, Altshul-Tsal — o mesmo da pressurização) e pelo motor comum de motores e partidas (`_comum/eletrico/motores.js`), central de água gelada (chillers N/N+1, COP/IPLV, mínimo 90.1, condensação e torre, bombas primárias/secundárias/condensação com tubo pela velocidade).
3. **Operação e laudo** (`pmoc.js` + `index.js`): obrigatoriedade (Lei 13.589 art. 1º; RT acima de 5 TR — Portaria 3.523 art. 6º), inventário, rotinas por equipamento e periodicidade, cronograma; vistoria com medições pelos critérios NBR 17037 (padrão) ou RE 09/2003.

## Normas e valores (fonte de cada um)

Conferidos no texto em 02/11/2026: **Lei 13.589/2018** (art. 1º PMOC em uso público e coletivo, sem limite de capacidade; art. 3º padrões da RE 09/2003 e posteriores alterações); **Portaria MS 3.523/1998** (art. 5º a–g, inclusive 27 m³/h·pessoa e filtro G1 na tomada de ar; art. 6º RT acima de 5 TR = 60 000 BTU/h; Anexo I **não** aberto); comunicado ABRAVA de 05/08/2024 (RE 09/2003 substituída pelos padrões da **NBR 17037** — norma não lida).

Tudo o mais é **[CONFERIR]** e sai listado no memorial (`calc.pendencias`): condições externas (NBR 16401-1 Anexo A) e internas (16401-2), Fp/Fa/Ez (16401-3), Ev (62.1), calor de pessoas, U/FS/absortância, irradiância de pré-dimensionamento, mínimos de chiller (90.1 Tab. 6.8.1-3), IPLV (AHRI 550/590), limite de reaquecimento (90.1 6.5.2.1), controle de pressão (90.1 6.5.3.2), perdas e rendimentos de catálogo, capacidades comerciais, critério de escolha do sistema, rotinas do PMOC (Anexo I / NBR 13971) e critérios de vistoria.

## CAD e 3D

`scripts/lib/cad.js`: tipos de ponto HVAC (difusor, grelha, VAV, fancoil, evaporadora, condensadora, chiller) no formato de `_comum/cad/tiposDePonto.js`, reconhecimento das layers HVAC/AVAC/AR-COND/MEC-DUTOS (`ehLayerDaClimatizacao`, para o ponto de extensão dos leitores de DWG/PDF), símbolos de planta (`SIMBOLOS_PLANTA`), ESPEC do 3D (`ESPEC_3D`, formas que o visualizador já desenha) e o gerador da planta (`planta`). A ligação em `_comum/cad/simbolos.js`, `modelo3d.js` e `plantasDisciplina.js` está pendente (o teste do 3D exige ESPEC para todo símbolo da biblioteca).

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados fictícios).
- Quadro elétrico de HVAC pela skill de quadros; circuitos pela elétrica/elétrica industrial; lista de pontos e descritivo de automação pela skill de automação.
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test`.
