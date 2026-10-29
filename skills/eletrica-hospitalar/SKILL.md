---
name: eletrica-hospitalar-nbr13534
description: Projeto (classificação dos locais em grupo 0/1/2 e classe de segurança, sistema IT médico com transformador de separação, DSI e painel de alarme, circuitos IT × TN-S com DR, equipotencialização suplementar, fonte de segurança UPS/gerador), laudo de inspeção e orçamento de instalações elétricas de estabelecimentos assistenciais de saúde pela ABNT NBR 13534:2008, RDC 50/2002 da Anvisa e NBR 5410, no padrão da H&M Engenharia. Use quando o pedido envolver hospital, clínica, UTI, centro cirúrgico, sala de parto, emergência, enfermaria, elétrica hospitalar, IT médico, transformador isolador, DSI, BEP/BEL de sala cirúrgica, tomadas hospitalares, gerador/UPS de hospital, laudo NBR 13534 ou orçamento de elétrica hospitalar.
---

# Elétrica hospitalar (NBR 13534) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 82 verificações desta disciplina). O dimensionamento de cada circuito (seção, disjuntor, queda) é o **mesmo motor da skill `eletrica`** (`require` de `skills/_comum/eletrico/calculo.js`, o motor comum da NBR 5410). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo e de cálculo | `memorial` | Word |
| Planilha de locais, circuitos, IT e materiais | `planilha` | Excel |
| Laudo de inspeção (NBR 13534) | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

Chave da disciplina `eletrica_hospitalar`, pasta `eletrica-hospitalar` (registrar em `backend/src/utils/disciplinasLaudo.js`). O formulário da tela é o mesmo JSON; documentos pelos botões e orçamento direto, com materiais casados com o catálogo e mão de obra pelos códigos `hosp_*` / `ele_*` da tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto novo/reforma ou laudo de instalação existente. Peça a lista de ambientes com o tipo da RDC 50, nº de leitos/postos e os equipamentos médicos (potência, suporte à vida). **A classificação dos locais deve ser acordada com a equipe médica do EAS** — a tabela só sugere.
2. **Montar o JSON da obra** (fora do repositório, na pasta do cliente): `node skills/_comum/cli.js eletrica-hospitalar modelo <obra>.json` grava o modelo em branco; o exemplo completo está em `exemplos/exemplo-hospital.json`. Tipos de ambiente em `dados/tipos_ambiente_rdc50.json`. Valor estimado leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng
   node skills/_comum/cli.js eletrica-hospitalar calcular <obra>.json
   ```
   Mostre os indicadores, as NC de projeto e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node skills/_comum/cli.js eletrica-hospitalar documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node skills/_comum/cli.js eletrica-hospitalar orcamento <obra>.json --modo execucao|inspecao [--saida proposta.json]`. Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Estrutura do JSON (além de identificação e `inspecao`)

- `instalacao`: tensões, sistema, esquema na entrada, cabos, método; `tensao_it_v` (≤ 250 V), `fator_simultaneidade_it`, VA por tomada IT/TN livre, limites por circuito, `fator_demanda_quadros`.
- `fonte_seguranca`: `gerador` e `ups` = `prever` | `existente` | `nao`; kVA existentes, autonomias, tempo de partida + transferência, outras cargas essenciais (climatização, gases medicinais…).
- `quadros`: QD por setor (id, nome, comprimento do alimentador). Os QDIT são criados por sistema IT.
- `ambientes`: nome, `tipo` (RDC 50), `grupo`/`classe` (vazio = sugerido), área, `leitos`, `quadro`, comprimento dos circuitos, tomadas extras IT/TN, iluminação (VA) e `sistema_it` (mesmo texto = salas que dividem o transformador).
- `equipamentos`: ambiente, descrição, quantidade, potência, FP, `suporte_vida`, `classe`, `sistema` (vazio = automático; `TN` para mesa cirúrgica, raios X, > 5 kVA, não críticos), `circuito_exclusivo`, `ligacao`.
- `existente` (só laudo): por ambiente, `sem_it`, `dr_no_it`, `tomadas_sem_identificacao`, `sem_bel` — viram NC.
- `inspecao`: checklist, NCs, `isolamento`, `equipotencializacao` (Ω), `dsi` (ajuste kΩ, alarmes, fuga mA), `ensaios_dr`, `comutacao` (fonte, classe, tempo s).

## Critérios adotados (cláusulas pela numeração da IEC 60364-7-710:2002, base da NBR 13534:2008 — [CONFERIR] a numeração na NBR)

- **Classificação** (710.3, 710.556.5.1): grupo 0/1/2 e classe ≤ 0,15 s / ≤ 0,5 s / ≤ 15 s / > 15 s sugeridos pelo tipo da RDC 50; grupos 1 e 2 pelo menos ≤ 15 s. Equipamento de suporte à vida → classe 0,15 s e alerta se estiver em local de grupo < 2.
- **IT médico** (710.413.1.5, 710.512.1): obrigatório no grupo 2; um sistema por grupo de salas com a mesma função; transformador monofásico 0,5–10 kVA (comerciais 3,15/4/5/6,3/8/10), secundário ≤ 250 V, fuga ≤ 0,5 mA; potência = (equipamentos + tomadas livres) × fator; > 10 kVA divide em vários sistemas, cada transformador ≥ o maior equipamento ligado a ele; um equipamento sozinho > 10 kVA no IT vira NC IT2 (NBR 13534, 6.1.3.1.101 b) — vai para TN-S com DR. DSI com alarme ≥ 50 kΩ, monitoração de carga/temperatura e painel de alarme (verde/amarelo/sonoro) no local (salas) ou no posto de enfermagem (leitos). Sem DR no IT. Primário com disjuntor curva D a 1,25 × In [CONFERIR].
- **Tomadas** (710.53): por posto, ≥ 2 circuitos IT; tomadas IT identificadas. Quantidades por leito são premissa H&M [CONFERIR].
- **DR** (NBR 13534, 5.1.2.2.4.2, conferido no texto): 30 mA tipo A (B se houver CC lisa) nos circuitos de tomadas do grupo 1 e, no grupo 2, só nos circuitos TN fora do IT (mesa cirúrgica, raios X, > 5 kVA, não críticos); AC não permitido. Iluminação do grupo 1 sem DR obrigatório pela NBR (a IEC 60364-7-710 estende a todos os circuitos finais ≤ 32 A — critério opcional do projeto [CONFERIR]). DPS dos quadros pela Tabela 49 (função comum). Sem PEN a jusante do quadro geral (710.312.2.1).
- **Circuitos** (NBR 5410 6.2): motor da skill de elétrica, cabos não halogenados (BD4 [CONFERIR]); disjuntor mínimo 16 A em tomadas e 10 A em iluminação quando o cabo permite; geral do QD acima do maior disjuntor a jusante.
- **Equipotencialização** (710.413.1.6): BEL em cada local dos grupos 1/2; ≤ 0,2 Ω no grupo 2 (referência no grupo 1); seção por S ≥ ρL/(0,2 − 0,02), mínimo 4 mm².
- **Fonte de segurança** (710.556.5.2.2): UPS para as classes ≤ 0,5 s (carregamento 80 %, autonomia de ponte ou 3 h sem gerador); gerador ≤ 15 s com 24 h (classe 15 × FD + entrada da UPS × 1,3 + outras cargas, carregamento 80 %). Premissas [CONFERIR com fabricantes].
- **Iluminação de segurança** (710.560.9): ≥ 50 % no grupo 2, ≥ 1 luminária no grupo 1 e nos serviços essenciais/rotas.

O checklist (32 itens) está em `dados/checklist_base.json`. NC de projeto, da situação existente e de medições fora do critério viram NC do checklist (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo de inspeção.

## Planta (DXF)

A planta automática ainda não está ligada para esta disciplina (`_comum/cad/plantasDisciplina.js` não tem gerador `eletrica-hospitalar`). O resultado por ambiente (`res.calc.ambientes[]`) já expõe o que o gerador precisa: `tomadasIt`, `tomadasTn`, `luminarias`, `luminariasSeguranca`, `equipamentos`, `sistemaIt`, `bel`, `paineisAlarme`, `quadro` e os ids de circuito em `circuitos.{it,tn,iluminacao,seguranca,exclusivos}`.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos de "Cliente Exemplo").
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ensaios que interrompem IT de locais do grupo 2 só com a direção clínica e sem paciente em suporte à vida.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
