---
name: spda-nbr5419
description: Laudo de inspeção, análise de risco, projeto/memorial e orçamento de SPDA (para-raios) pela ABNT NBR 5419:2026 no padrão da H&M Engenharia. Use quando o pedido envolver SPDA, para-raios, descargas atmosféricas, NBR 5419, análise de risco R1, laudo de SPDA, aterramento de SPDA, ensaio de continuidade (Anexo F), DPS/MPS da NBR 5419-4 ou orçamento de instalação de SPDA.
---

# SPDA — NBR 5419:2026 (H&M Engenharia)

Gera, a partir de **um arquivo JSON por obra**, os documentos que a H&M entrega:

| Documento | Arquivo gerado |
|---|---|
| Laudo técnico de inspeção (13 seções, NBR 5419-3, Seção 7) | `<obra>_Laudo_SPDA_<rev>.docx` |
| Memorial descritivo e de cálculo (SPDA e MPS) | `<obra>_Memorial_SPDA_<rev>.docx` |
| Relatório de análise de risco (NBR 5419-2, com varredura de cenários) | `<obra>_Relatorio_Risco_NBR5419-2_<rev>.docx` |
| Checklist de campo (formulário impresso da visita) | `<obra>_Checklist_Campo_SPDA_<rev>.docx` |
| Planilha de medições (continuidade, aterramento, instrumentos) | `<obra>_Medicoes_SPDA.xlsx` |
| Planilha de materiais (com coluna de preço) e risco | `<obra>_Materiais_e_Risco.xlsx` |

e o **rascunho de orçamento** no Sistema de Orçamentos (ferramenta MCP `criar_rascunho_proposta`).

Os cálculos estão em `scripts/lib/` e reproduzem o laudo HM original (teste `npm test`: 38 verificações do laudo R06 + 42 de parecer, risco e materiais em `testes/teste-parecer.js`). **Não refaça contas de cabeça: rode os scripts.**

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos: **Análise de Projeto → Laudos e projetos por disciplina → SPDA**. Lá o formulário é o mesmo JSON (importa/exporta o arquivo), as fotos ficam no banco, os documentos são baixados pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência (códigos `spda_*`). Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois. O contrato que o sistema usa está em `scripts/lib/index.js` (toda nova disciplina segue o mesmo).

## Onde roda

No **Claude Code** do PC da H&M. A skill fica em `C:\HM-Engenharia\hm-eng\skills\spda` (versionada no repositório) e está ligada em `%USERPROFILE%\.claude\skills\spda-nbr5419`. Rode os comandos a partir dessa pasta. O orçamento usa o servidor MCP `hm-orcamentos`, registrado no `.mcp.json` da raiz do projeto (abra o Claude Code em `C:\HM-Engenharia\hm-eng`).

As dependências ficam em `skills/node_modules`, compartilhadas por todas as disciplinas. Se não existir (máquina nova), rode uma vez:

```bash
cd C:\HM-Engenharia\hm-eng\skills
npm install              # instala docx e exceljs
npm test                 # todas as disciplinas; o SPDA deve dar "38/38 verificações OK" e "42/42" no teste de parecer
```

## Fluxo de trabalho

1. **Entender o serviço.** Inspeção/laudo de SPDA existente (`inspecao.tipo`: `periodica`, `apos_instalacao`, `provisorio`, `alteracao`, `descarga`), projeto de SPDA novo, ou só análise de risco. Pergunte o que faltar; não suponha.

2. **Montar o JSON da obra.** Copie `exemplos/modelo-vazio.json` para a pasta da obra (ex.: `…\<Cliente>\SPDA - Laudo HM\<obra>_dados_SPDA.json`). O exemplo completo está em `exemplos/exemplo-hospital.json`; **cada campo e as opções aceitas estão em `referencia/esquema-dados.md`** — leia antes de preencher.
   - Tire os dados dos documentos do cliente (projeto aprovado, arquitetura, elétrico, cartão CNPJ, alvará, fotos). Registre de onde veio cada dado em `inspecao.dados_projeto` (`dado`, `valor`, `fonte`) e cada documento em `inspecao.documentos`.
   - **Valor estimado ou duvidoso leva `[CONFERIR]` no texto** — sai em vermelho no documento. Nunca invente medição, nome, CREA, ART ou data: deixe vazio.
   - **NG só da Tabela F.1 da NBR 5419-2:2026** (F.1.1 proíbe outras fontes): `node scripts/ng.js "Município" UF` ou deixe `estrutura.ng` vazio para o script buscar.
   - Zonas de estudo: uma `externa` (até 3 m da edificação, só RA) e as internas com ocupação, piso, proteção contra incêndio, perigo especial, pessoas (`nz`) e horas/ano (`tz`). `nz`/`tz` são premissas: confirme com o cliente.

3. **Calcular e conferir com o engenheiro.**
   ```bash
   node scripts/calcular.js <obra>_dados_SPDA.json
   ```
   Mostra ND/NM/NL/NI, componentes RA…RZ por zona, R1 × RT (10⁻⁵), F × FT (0,1 para sistemas críticos, 1 para os demais), o cenário sem proteção, o **menor cenário que atende** e o dimensionamento (malha, descidas, anel, re × l1, distância de segurança, raios dos captores verticais pela esfera rolante). Apresente esses números ao usuário e combine o NP antes de gerar os documentos. Se R1 não atende, o relatório já recomenda o cenário mínimo; se nenhum atende, a NBR 5419-2, 5.4.6 manda informar o proprietário e adotar o NP mais alto.

4. **Inspeção.** O checklist-base tem 60 itens (`dados/checklist_base.json`, com "onde" e "como" verificar). No JSON, informe em `inspecao.checklist` só os itens apurados (`cod`, `situacao` C/NC/NA/NV, `obs`, `foto`, `prioridade`); os demais ficam NV automaticamente e CP8 (≤ 60 m) e componentes naturais inexistentes viram NA.
   - Para cada não conformidade relevante, descreva em `inspecao.ncs` (`item`, `local`, `descricao`, `requisito`, `recomendacao`, `prioridade` P1–P4, `foto`). Ela substitui a NC automática do mesmo item (não duplica).
   - Prioridades: P1 imediato (48 h), P2 30 dias, P3 90 dias, P4 próxima manutenção (7.4.2).
   - Ensaios em `inspecao.continuidade` com o tipo do **Anexo F de 2026**: F.1 cruzado topo × base de pilares diferentes (≤ 1 Ω), F.2 topo × base do mesmo pilar (≤ 1 Ω), F.3 fundação (≤ 1 Ω), F.4 captação × BEP (≤ 0,2 Ω), F.5 descida não natural, F.6 eletrodo não natural, F.7 ligação equipotencial (F.5–F.7: informar `material`, `secao_mm2`, `comprimento_m` para o critério por resistência esperada). Resistência de aterramento é só informativa (7.1.4).
   - Fotos em `inspecao.fotos` (`id` F-01…, `arquivo` relativo à pasta do JSON ou `inspecao.pasta_fotos`).
   - Antes da visita, gere só o checklist de campo: `--so checklist,planilhas`.

5. **Gerar os documentos.**
   ```bash
   node scripts/gerar-documentos.js <obra>_dados_SPDA.json --saida "<pasta da obra>" [--fotos "<pasta das fotos>"] [--so laudo,memorial,risco,checklist,planilhas]
   ```
   O parecer sai sozinho: CONFORME, NÃO CONFORME, NÃO CONFORME (preliminar) ou INCONCLUSIVO, conforme checklist, NCs e ensaios. Sem nenhum ensaio de continuidade registrado o laudo não sai CONFORME (INCONCLUSIVO), e R1 > RT ou F > FT no cenário atual gera NC automática no item D2 (`scripts/lib/parecer-risco.js`). Revise o texto gerado; para PDF, converta pelo Word (o PC tem o Office: abra via COM `Word.Application` e salve com formato 17). Para conferir visualmente, renderize as páginas do PDF com `Windows.Data.Pdf`.

6. **Orçamento.**
   ```bash
   node scripts/orcamento.js <obra>_dados_SPDA.json --modo inspecao   # ou --modo execucao
   ```
   Gera `cliente_nome`, `escopo` e `itens` (seções "Materiais e Equipamentos" / "Serviços (Mão de Obra)", subgrupo SPDA, sem preço). Antes de criar a proposta: busque preços no catálogo (`buscar_material`, `historico_preco`) ou pesquise (`salvar_pesquisa_mercado`), **mostre os itens ao usuário e só então** chame `criar_rascunho_proposta` passando `escopo`. Se o MCP não estiver conectado (`/mcp` no Claude Code), confira se o backend está no ar em `http://localhost:3001/health` e entregue o JSON e a planilha de materiais.

7. **Revisões.** Cada emissão incrementa `meta.revisao` (R00, R01…) com uma descrição curta; não sobrescreva revisões anteriores.

## Regras que não podem ser quebradas

- O laudo é assinado pelo engenheiro responsável com ART: os campos de responsável/CREA/ART vêm do usuário, nunca preenchidos por você.
- Norma de origem: a conformidade do SPDA existente é verificada contra a edição vigente quando o projeto foi feito (7.3.1 a). A NBR 5419:2026 admite manter a edição de 2015 em projetos protocolados antes da publicação ou até 180 dias depois — registre em `inspecao.justificativa_norma` e marque a data do protocolo com `[CONFERIR]` se não estiver comprovada.
- Periodicidade: 1 ano para serviço essencial (saúde, energia, água, sinais), áreas classificadas, corrosão severa ou explosivos; 3 anos para as demais (7.3.2 f).
- Os dados do cliente ficam na pasta do cliente no servidor; não copie o JSON de uma obra real para dentro do repositório.

## Arquivos da skill

- `scripts/calcular.js`, `scripts/gerar-documentos.js`, `scripts/orcamento.js`, `scripts/ng.js` — comandos
- `scripts/lib/tabelas.js` — fatores das NBR 5419-2 e 5419-3:2026 com a tabela de origem
- `scripts/lib/risco.js` — Anexos A, B e C, Eq. 1 a 15, frequência de danos e varredura de cenários
- `scripts/lib/dimensionamento.js` — malha, descidas, aterramento (re × l1), distância de segurança, esfera rolante, materiais
- `dados/ng_municipios.json` — Tabela F.1 (5 565 municípios); `dados/checklist_base.json` — 60 itens
- `referencia/esquema-dados.md` — todos os campos do JSON e as opções; `referencia/metodo.md` — resumo das regras da norma usadas
- `exemplos/` — modelo em branco e exemplo completo (hospital, NP III, SPDA provisório)
