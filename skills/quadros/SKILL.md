---
name: quadros-nbr61439
description: Projeto de fabricação de quadros elétricos e de automação a partir do unifilar/quadro de cargas — tamanho do invólucro (série comercial), arranjo dos disjuntores em fileiras com módulos DIN, reserva (NBR 5410 Tabela 59), canaletas com ocupação ≤ 50 %, barramentos (DIN 43671, curto térmico e esforço eletrodinâmico), barra N/PE (Tabela 58), coordenação Icu × Icc, DR (5.1.3.2.2), DPS, elevação de temperatura (IEC TR 60890) e ventilação, IP/IK e forma de separação, automação (E/S do CLP com reserva, fonte 24 Vcc, relés de interface, bornes, NBR IEC 60204-1/NR-12), as 13 verificações de projeto e os ensaios de rotina da ABNT NBR IEC 61439-1/-2 — com memorial, lista de materiais com preço (Excel), desenho DXF (vista frontal e layout interno com carimbo H&M), checklist de fabricação, relatório de ensaios e orçamento de montagem, no padrão da H&M Engenharia. Use quando o pedido envolver montar/fabricar quadro, QD, QGBT, CCM, painel elétrico, painel de automação/CLP, layout de quadro, disposição de disjuntores, barramento, dimensionamento do invólucro, lista de materiais de quadro, ensaios de rotina NBR IEC 61439 ou orçamento de montagem de painel.
---

# Quadros elétricos e de automação — projeto de fabricação (NBR IEC 61439) — H&M Engenharia

Gera, a partir de **um arquivo JSON por quadro** (o unifilar/quadro de cargas), o projeto de fabricação do quadro. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills/quadros` ou `skills`: 118 verificações). **Não refaça contas de cabeça: rode os scripts.** As partidas de motores usam o motor da skill de elétrica industrial (`eletrica-industrial/scripts/lib/calculo.js → dispositivosPartida`) e o DPS a função comum `_comum/dps.js`.

| Documento | Tipo | Formato | Registro |
|---|---|---|---|
| Memorial de cálculo e especificação do quadro | `memorial` | Word | projeto |
| Lista de materiais (BOM, com coluna de preço) e planilha de cálculo (circuitos, arranjo, barramentos/térmica, verificações 61439, E/S, fonte 24 Vcc, bornes) | `planilha` | Excel | projeto |
| Desenho de fabricação: vista frontal externa, vista lateral, layout interno da placa (fileiras na ordem do unifilar, trilhos, canaletas, barramentos, bornes, reserva, cotas), legenda, notas e carimbo H&M | `desenho` | DXF (AutoCAD 2018+, mm) | projeto |
| Modelo 3D do quadro: invólucro, porta articulada com os dispositivos de porta, placa, trilhos, canaletas translúcidas, cada dispositivo com L × A × P reais e cor por tipo, barramentos com isoladores ou pente, barras N/PE, bornes, reserva; camadas liga/desliga, abrir/fechar porta, só a placa, clique = TAG/fabricante/referência/medidas/fonte | `modelo3d` | HTML autossuficiente (three.js embutido) | projeto |
| Caderno de fabricação e montagem: capa com timbrado, dados nominais e normas, vista frontal com as plaquetas no lugar e vista lateral, layout interno, detalhe do barramento (isoladores, vãos, corte, emendas com parafuso/furo/torque, barras N/PE) e das réguas de bornes, folha de plaquetas 1:1 (comandos da porta, identificação externa, advertências e a plaqueta H&M com a marcação da NBR IEC 61439-1 6.1), componentes com fabricante/referência/medidas/fonte, barramentos, materiais "da caixa aos parafusos" com a regra de cada quantidade, fiação por seção e cor, torques, furação, sequência de montagem e checklist das verificações de rotina (seção 11) — mesma geometria do DXF (`scripts/lib/vistas.js`), motor comum `skills/_comum/fabricacao` | `caderno` | PDF (A4, retrato/paisagem) | projeto |
| Checklist de fabricação e ensaios de rotina | `ensaios` | Word | projeto e laudo |
| Relatório de ensaios de rotina / inspeção do quadro (com parecer) | `laudo` | Word | laudo |

Orçamento: modos `fabricacao` (materiais da lista + mão de obra `qd_*` de montagem, fiação, programação e ensaios) e `inspecao` (inspeção, termografia, ensaios, relatório e correção das NCs).

## No sistema

Registrada em `skills/_comum/disciplinas.js` (chave `quadros`, sigla `QD`); documentos e modos classificados em `skills/_comum/tipos-documento.js` (`desenho`, `modelo3d` e `caderno` → projeto, `ensaios` → ambos, `fabricacao` → projeto); códigos `qd_*` em `backend/src/services/precosMaoDeObraReferencia.js` (preencher os preços na tela Preços de Mão de Obra). A tela é montada pelo `formulario` de `scripts/lib/index.js`.

## Fabricantes e medidas oficiais (catálogo)

Entrada `fabricantes: { padrao, por_tipo: { contator: "WEG", … } }` e, em qualquer circuito/motor, `fabricante`/`referencia` (motor: `referencias: { Q1, K1, T1 }`). A skill junta os registros na ordem `catalogo_componentes` (o backend injeta os do banco: usuário/pesquisa IA) > `dados/catalogo-componentes.json` (catálogo H&M: só `verificado:true`, origem `catalogo_hm` e `fonte_url` oficial — **nunca inventar medidas**) e escolhe, por dispositivo, a referência informada ou o **menor modelo do fabricante que atende** (polos, In, curva, Icu ≥ Icc, IΔn, classe/Uc/In do DPS, AC-3, faixa do disjuntor-motor, A/kW do soft/inversor, saída da fonte, pontos do módulo, seção do borne) — `scripts/lib/catalogo.js`. Sem registro: medida típica, `medida.origem: "tipica"` e o item vai para `componentes_sem_medida` com uma `especificacao` que serve de busca ("WEG contator 25 A AC-3 bobina 24 Vcc"). O arranjo, o invólucro, o DXF, a lista de materiais (fabricante, referência, L × A × P, fonte) e o 3D usam as medidas escolhidas; o memorial (10.1) mostra o aproveitamento do espaço (área da placa, trilho, reserva) e a comparação com as medidas típicas. Registro com `verificado:false` sai com [CONFERIR]. Formato do registro: ver `dados/catalogo-componentes.json` e o teste (`testes/catalogo-fixture.json` tem registros FICTÍCIOS, só para o teste).

## Fluxo de trabalho

1. **Entender o quadro:** distribuição (QD/QGBT), CCM, automação (CLP) ou comando de máquina; local de instalação; montagem (sobrepor/embutir/autoportante); Icc no ponto (estudo de curto ou distribuidora — não suponha). Pergunte o que faltar.
2. **Montar o JSON:** copie `exemplos/modelo-vazio.json` para a pasta do cliente (fora do repositório). Exemplos fictícios: `exemplos/exemplo-qd-predial.json` (QD de escritório, pente, DR em grupo) e `exemplos/exemplo-automacao.json` (painel de estação elevatória com soft-starters, inversor, CLP, IHM e SPDA).
   - `quadro`: tensões, sistema, esquema, `icc_ka`/`ipk_ka`, geral, DPS/SPDA, local, montagem, temperaturas, barramento, reserva, bornes.
   - `circuitos`: um por linha na ordem do unifilar (ligação FN/FF/FFN/FFF/FFFN, fases, P ou Ib, disjuntor, curva, Icu, DR `ddr`/`idr` + `dr_grupo`, cabo, `local_dr` para os locais de 5.1.3.2.2).
   - `motores`: dados de placa e partida (direta, estrela-triângulo, soft-starter, inversor).
   - `automacao`: CLP (E/S da CPU), sinais de campo, cargas 24 Vcc, IHM, comunicação, dispositivos de porta.
   - **Importar** de um projeto já feito: `node skills/quadros/scripts/importar.js <projeto.json> --de eletrica [--tag QD-01]` ou `--de eletrica-industrial --quadro CCM-01` (só lê as outras skills; revise grupos de DR, local e montagem).
3. **Calcular e conferir com o engenheiro:** `node _comum/cli.js quadros calcular <quadro>.json` — mostre indicadores, avisos e premissas [CONFERIR].
4. **Documentos:** `node _comum/cli.js quadros documentos <quadro>.json --saida <pasta do cliente>` (`--so memorial,desenho`).
5. **Orçamento:** `node _comum/cli.js quadros orcamento <quadro>.json --modo fabricacao|inspecao`; no sistema, ferramenta MCP `criar_rascunho_proposta` ou o botão da aba de projetos.

## Critérios adotados (resumo; detalhes e fontes em `scripts/lib/tabelas.js`)

- **Correntes:** Ib = P/(V·FP) ou P/(√3·V·FP); quadro = FD × ΣIb por fase + motores (1,25 × In do maior + Σ dos demais, NBR 5410 6.5.1); FD = fator de diversidade nominal da NBR IEC 61439-2 pelo nº de saídas quando não informado [CONFERIR].
- **Coordenação:** Ib ≤ In ≤ Iz (5.3.4.1); Icu/Icn ≥ Icc (5.3.5.5.1), filiação só com tabela do fabricante; Ics da NBR NM 60898; seletividade por razão In ≥ 1,6 só como aviso; redução de corrente DIN no ar interno ≈ 0,45 %/°C [CONFERIR].
- **DR:** obrigatório nos circuitos de 5.1.3.2.2 (texto conferido) e no esquema TT; IDR ≥ maior disjuntor do grupo e ≥ ΣIb.
- **DPS:** Uc pela Tabela 49; classe II In ≥ 5 kA (N-PE 20/10 kA), classe I Iimp ≥ 12,5 kA (N-PE 50/25 kA) — NBR 5410 6.3.5.2.4 d; classe I com SPDA (NBR 5419-4:2026 C.1.7); ligações ≤ 0,5 m e DPS–PE 4/16 mm² (6.3.5.2.9).
- **Espaço:** módulo 17,5 mm (reserva 18 mm); dimensões típicas de catálogo [CONFERIR]; reserva = máx(Tabela 59, % do projeto); canaletas ≤ 50 % pela área dos condutores; esquerda potência, direita comando; invólucro = o menor da série comercial que comporta largura, altura e profundidade (série [CONFERIR com o fornecedor]).
- **Barramentos:** DIN 43671 (65/35 °C) × k2 = ((θb − θa)/30)^0,61 [CONFERIR]; S ≥ Icw·√t/k com k adiabático (IEC 60949, θf 200 °C da IEC 60865-1 [CONFERIR]); esforço F = 0,173·ip²·L/a e σ = 0,73·F·L/(8Z) ≤ 1,5·Rp0,2 (estimativa); PE pela Tabela 58 e ao curto; pente até 125 A sem partidas.
- **Térmica:** perdas a Ib (P·(Ib/In)², disjuntores DIN pelos máximos da NBR NM 60898 [CONFERIR tabela]), barramento e fiação; Ae pela IEC TR 60890; ΔT = P/(k·Ae); topo ≈ 1,3 × ΔT (estimativa); ventilação V = f·(P − P_adm)/ΔT com f pela altitude [CONFERIR].
- **IP/IK e forma:** recomendação por local (influências AD/AE/AG, NBR 5410 6.5.4.4) [CONFERIR]; formas 1 a 4b da NBR IEC 61439-2 8.101.
- **Automação:** E/S de campo + motores + porta, reserva 20 %; módulos pela capacidade da CPU; fonte = consumo × (1 + 25 %); relé de interface por DO; bornes por sinal; separação potência × comando; NBR IEC 60204-1 (cores, emergência) e NR-12 com [CONFERIR itens].
- **NBR IEC 61439-1:** as 13 verificações de projeto (seção 10, Anexo D) com o meio de atendimento e as verificações de rotina (seção 11) no checklist — numeração [CONFERIR], a norma não estava na biblioteca.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados fictícios — "Cliente Exemplo").
- Documento gerado é rascunho técnico revisado e assinado pelo responsável habilitado; modelos de catálogo genérico — confirmar fabricante, dimensões e coordenação antes de comprar e furar a placa.
- O desenho DXF não tem cota associativa (limitação da base `_comum/cad/dxf.js`): medidas vão como texto.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
