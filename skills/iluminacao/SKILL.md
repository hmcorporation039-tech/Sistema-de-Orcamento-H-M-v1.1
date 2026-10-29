---
name: iluminacao-nbr8995
description: Projeto luminotécnico (método dos lúmens, grade de luminárias, densidade de potência), automação de iluminação (sensores de presença, dimmers, DALI-2, 0-10 V, cenas), circuitos de iluminação pela NBR 5410, relatório de medição de iluminância/comissionamento e orçamento, pela ABNT NBR ISO/CIE 8995-1:2013, no padrão da H&M Engenharia. Use quando o pedido envolver iluminação de interiores, luminotécnico, quantidade de luminárias, lux/iluminância, UGR, IRC/Ra, painel/downlight/perfil LED, sensor de presença, DALI, dimerização, medição com luxímetro ou orçamento de iluminação. Iluminação de emergência (NBR 10898) é da skill de incêndio.
---

# Iluminação — luminotécnico e automação (NBR ISO/CIE 8995-1) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 65 verificações desta disciplina, incluindo o caso do escritório 10 × 8 m calculado à mão). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial luminotécnico (critérios, premissas, cálculo por ambiente, automação, circuitos, materiais) | `memorial` | Word |
| Planilha de cálculo, circuitos, posições da grade e materiais | `planilha` | Excel |
| Relatório de medição de iluminância e comissionamento | `relatorio` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → Iluminação** (depois de registrada em `skills/_comum/disciplinas.js` (registro único das disciplinas) com chave e pasta `iluminacao`). O formulário da tela é o mesmo JSON; os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pelos códigos `ilum_*` da tabela de preços de referência. Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto novo (luminotécnico + automação + circuitos) ou medição/comissionamento de instalação existente. Pergunte o que faltar (atividade de cada ambiente, pé-direito, forro, luminária pretendida, tipo de comando); não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-escritorio.json`; o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js iluminacao modelo <obra>.json` grava o modelo em branco). Cadastre primeiro as **luminárias** (código, tipo, W, lm da luminária, Ra, TCC, UGR, FU do fabricante se houver) e depois os **ambientes** (atividade da tabela, C × L ou área, pé-direito, plano, refletâncias, luminária, controle, sensor). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js iluminacao calcular <obra>.json
   ```
   Mostre os indicadores, a tabela por ambiente e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js iluminacao documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha,relatorio,checklist]
   ```
5. **Orçamento:** `node _comum/cli.js iluminacao orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (fornecimento e instalação) ou `inspecao` (medição e relatório)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

A CLI acha a skill pelo nome da pasta (`skills/iluminacao/scripts/lib/index.js`).

## Critérios adotados

- **Requisitos por atividade** (`dados/atividades_iso8995.json`): Em mantida, UGR_L e Ra mínimo da NBR ISO/CIE 8995-1, Tabela 1; uniformidade Emin/Emed ≥ 0,7 na tarefa (0,4 em circulação/depósito/garagem). Linhas de saúde e residência marcadas `conferir` saem com [CONFERIR].
- **Método dos lúmens:** N = (Em × A) / (Φ × FU × FM); k = C·L / (hm·(C + L)), hm = altura de montagem − plano de trabalho (pendente: pé-direito − suspensão). FU do fabricante quando informado; senão a tabela simplificada `dados/fator_utilizacao.json` (interpolação em k e nas refletâncias) [CONFERIR]. FM: limpo 0,80 / normal 0,70 / sujo 0,60 [CONFERIR].
- **Grade nx × ny:** a menor grade com N ≥ calculado, espaçamento ≤ 1,5 × hm nos dois sentidos e razão entre espaçamentos ≤ 1,5 (fila única só quando a largura não passa do passo — corredor). Em obtida = N·Φ·FU·FM / A. Posições no centro das células, origem no canto, x na maior dimensão.
- **Eficiência:** DPI = W/m² e W/m²/100 lx, comparada à referência do método das atividades (RTQ-C) [CONFERIR com a INI-C]; eficácia mínima 100 lm/W (Inmetro/Procel) [CONFERIR].
- **Automação:** sensor de presença pela cobertura Ø 8 m (quadrado inscrito, lado Ø/√2); dimmer até 200 W; 0-10 V até 20 drivers por controlador; DALI-2 até 64 endereços por linha, com fonte de barramento por linha; cenas = DALI + teclado de cenas.
- **Circuitos (NBR 5410):** motor `skills/eletrica` (`config` + `dimensionarCircuito`): agrupamento até 10 A (e a potência máxima opcional por circuito), locais com DR (5.1.3.2.2) em circuitos próprios, seção mínima 1,5 mm², queda ≤ 4 % com L equivalente = distância ao quadro + metade do percurso interno; carga mínima de 9.5.2.1.2 em locais de habitação.
- **Medição:** malha p = 0,2 × 5^log10(d) (premissa da EN 12464-1) [CONFERIR]; leituras por ambiente → E média, E mín., Uo → C/NC.

O checklist (18 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo `inspecao`. Iluminação de emergência (NBR 10898) fica NA aqui — é da skill de incêndio.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos de "Cliente Exemplo").
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
