---
name: modelo-3d-arquitetura
description: Modelo 3D profissional a partir da arquitetura ou do projeto (DWG/DXF, PDF convertido ou IFC) com os pontos REAIS das disciplinas — diagnóstico e mapa das layers antes de gerar (para não subir parede ou pilar onde não existe), escolha da planta quando a prancha tem várias, leitura dos símbolos explodidos (QiBuilder/AltoQi, PDF) por layer e medida, postes e caixas da área externa (estacionamento, quadras, pátio) com circuitos e eletroduto enterrado dimensionados pela NBR 5410, distribuição de luminárias pelo cálculo real e checklist de entrega, no padrão da H&M Engenharia. Use quando o pedido envolver modelo 3D, maquete 3D, visualização 3D para o cliente, 3D da proposta, paredes ou pilares errados no 3D, símbolos virando pilar, luminárias mal distribuídas no 3D, postes de iluminação, iluminação de estacionamento ou quadra, alimentação de postes, eletroduto enterrado, IFC/BIM do arquiteto, Revit, DIALux ou melhorar a qualidade do 3D.
---

# Modelo 3D da arquitetura — H&M Engenharia

O sistema gera o 3D (`_comum/cad/gerar-3d.js` e o botão "Modelo 3D" no sistema) **adivinhando** pelo nome das layers o que é parede, pilar e janela, e **estimando** os pontos pela área das salas. Esta skill põe o **engenheiro no meio**:

- diagnostica as layers;
- escolhe a planta;
- lê os pontos reais do projeto;
- dimensiona o que alimenta os postes externos.

Só então o 3D é gerado. **Não refaça contas nem classificações de cabeça: rode os scripts.**

Todos os comandos rodam na pasta `C:\HM-Engenharia\hm-eng\skills` (para testar mudanças na skill, `C:\HM-Engenharia\hm-eng-v2\skills`). Os arquivos da obra (DXF convertido, mapas, pontos, HTML) ficam na **pasta do cliente**, nunca no repositório.

## O que o gerador já faz sozinho

- **Layers no padrão brasileiro (AsBEA) e de software de projeto:**
  - `ARQ-ALV-*` é parede e `ARQ-EST-*` é pilar.
  - Não sobem:
    - layers de outra disciplina ou da prancha: `EL-*`, `DI-*`, `IFC-*`, `P-*`, fios, condutos, unifilar, quadro, tabela;
    - vistas da arquitetura: `LOU`, `MOB`, `EQP`, `SAN`, `PIS`, `COB`, `POR`…
- **Símbolo curvo não é pilar:** forma fechada com mais de 8 vértices (círculo ou oval de poste, projetor, caixa, tomada de piso, que o PDF ou o "explodir" vira polígono) **não sobe**, nem como pilar nem como parede. Pilar redondo de verdade precisa estar numa layer de pilar.
- **Áreas externas:** quadra, campo, estacionamento, pátio e jardim são "externo". Ficam com piso verde, não recebem luminária de teto na estimativa e não contam como área interna.

## Fluxo de trabalho

1. **Triagem da entrada (nesta ordem de preferência):**
   - **IFC do arquiteto (Revit/ArchiCAD):** paredes, pilares, lajes e forro reais, sem palpite. Peça sempre. O sistema ainda não lê IFC (próximo passo: That Open Engine / web-ifc, gratuito); até lá, peça também o DWG.
   - **DWG/DXF do projeto ou da arquitetura:** caminho principal.
     - Exportação do QiBuilder/AltoQi vem com os blocos explodidos. Os passos 4 e 5 recuperam os pontos assim mesmo.
     - Peça a **estrutural** (forma) para conferir os pilares.
   - **PDF:** funciona, mas sem nomes de layer: tudo vira `PDF-PAREDE`/`PDF-LINHAS`.
     - O símbolo usado para três coisas diferentes (ex.: "caixa de passagem / poste do estacionamento / tomada de piso") só se separa com o DWG. **Peça o DWG.**
2. **Diagnóstico das layers e escolha da planta:**
   ```bash
   node modelo-3d/scripts/diagnosticar-layers.js "<projeto.dwg>" --saida "<pasta da obra>\mapa-layers.json"
   ```
   - Prancha com várias plantas lado a lado (implantação, lojas, detalhes): o script lista as plantas com os ambientes de cada uma. **Escolha UMA** e rode de novo com `--planta N`. Sem isso, o modelo junta todas.
   - A tabela mostra, por layer:
     - a classe no 3D;
     - pilares;
     - símbolos redondos ignorados;
     - fechadas, entidades e comprimento.
   - Leia os avisos (`!`):
     - "nenhuma layer de parede": tudo vira parede;
     - layer de parede com muitos "pilares": são símbolos ou mobiliário;
     - símbolos redondos ignorados: se forem pilares redondos de verdade, mapeie a layer como `pilar`.
3. **Conferir o mapa com o engenheiro e gerar a base limpa:**
   - Edite o `mapa-layers.json`. As classes são `parede`, `pilar`, `janela`, `mureta`, `media`, `guarda` e `ignorar`.
   - Compare o **total de pilares** com a estrutural. Layer duvidosa é pergunta, não suposição.
   - Gere a base (é uma cópia: o original não muda):
     ```bash
     node modelo-3d/scripts/aplicar-mapa.js "<projeto.dwg>" "<pasta da obra>\mapa-layers.json" --saida "<pasta da obra>\base-3d.dxf"
     ```
   - Pilar falso na **mesma layer** das paredes que não seja curvo não sai pelo mapa. Peça ao engenheiro para movê-lo de layer no AutoCAD.
4. **Pontos reais do projeto (luminárias, tomadas, postes, caixas, quadros):**
   ```bash
   node modelo-3d/scripts/extrair-pontos.js "<projeto.dwg>" --planta N --listar --saida "<pasta da obra>\mapa-pontos.json"
   ```
   - **O que o script lista:** por layer de instalação, os símbolos agrupados pela **medida**, com a quantidade e quantos estão na área externa. Também propõe o símbolo do 3D:
     - traço comprido e fino na área externa vira `HM-ILU-POSTE`;
     - caixa na área externa vira `HM-ELE-CAIXA-PISO`;
     - lâmpada vira `HM-ILU-LUMINARIA`.
   - **Conferir com o engenheiro.** Confira cada tipo com a **legenda e o quadro de cargas** do projeto, preenchendo:
     - `simbolo` (`"?"` = não entra);
     - `rotulo`: a descrição da legenda;
     - `altura_m` do poste;
     - `area`: `"externa"` ou `"interna"` (a mesma caixa é de piso lá fora e de teto dentro).
   - **Mesma luminária em duas layers** (símbolo + contorno IFC): o script propõe só uma. Não marque as duas.
   - **Gravar os pontos:**
     ```bash
     node modelo-3d/scripts/extrair-pontos.js "<projeto.dwg>" --planta N --mapa "<pasta da obra>\mapa-pontos.json" --saida-pontos "<pasta da obra>\pontos.json" --saida-trechos "<pasta da obra>\trechos.json"
     ```
   - **Conferir a contagem com o quadro de cargas.** Na Arena, o quadro de cargas dava 2 400 W por circuito de quadra = 6 postes de 400 W, e a leitura deu 52 postes simples e 8 duplos.
5. **Área externa — alimentação dos postes (estacionamento, quadras, pátio):**
   ```bash
   node modelo-3d/scripts/circuitos-externos.js "<pasta da obra>\pontos.json" "<pasta da obra>\obra-externa.json" --memorial "<pasta da obra>\memorial-externo.md" --json "<pasta da obra>\resumo-externo.json" --saida-trechos "<pasta da obra>\trechos-externos.json" --saida-pontos "<pasta da obra>\caixas-externas.json"
   ```
   - **`obra-externa.json`:** modelo em `modelo-3d/exemplos/obra-externa.json`. Informe:
     - o quadro de origem;
     - a tensão e a ligação (FN/FF/3F);
     - a potência e a altura de cada tipo de poste, da legenda, do quadro de cargas ou do catálogo. Com `"ambiente"`, a potência vale só naquela área: o mesmo símbolo pode ter outra potência no estacionamento.
     - **Nunca invente potência:** sem dado, pergunte ou marque [CONFERIR].
   - **O que o script calcula:**
     - **Traçado:** a vala é o caminho mais curto em "L" a partir do quadro.
     - **Circuitos:** os postes são agrupados por área em sequência e divididos por igual, até a corrente máxima.
     - **Cabo:** cabo 0,6/1 kV, dimensionado pela tabela 36 método D com o agrupamento da tabela 42. A queda de tensão é ≤ 4 %, calculada trecho a trecho.
     - **Disjuntor e PE:** disjuntor pela corrente do circuito; PE pela tabela 58.
     - **Duto:** PEAD corrugado com ocupação ≤ 40 %.
     - **Caixas 30 × 30 × 30 cm:** no pé de cada poste, nas mudanças de direção e a cada 30 m.
     - **Quantitativos:** cabo por seção, ramal PP, duto por bitola, vala, caixas, disjuntores, DR e hastes.
   - **Antes de usar o memorial:**
     - Compare com o quadro de cargas do projeto. Se o projetista usou outro método de instalação (ex.: B1), aponte a diferença ao engenheiro.
     - O traçado é proposta: o executivo segue vias, canteiros e interferências.
   - **Caixas no 3D:** se o desenho já tem as caixas de passagem dos postes, use as do desenho (passo 4) e **não** passe `caixas-externas.json`, para não duplicar.
6. **Luminárias internas pelo cálculo, quando o projeto não as traz:**
   - Sem pontos e sem formulário, o 3D usa a **estimativa**: painel LED de 4.000 lm na caixa envolvente de cada sala. Serve só para dar ideia.
   - Para o 3D profissional, faça o cálculo na skill `iluminacao-nbr8995` com a **luminária real** (W, lm, UGR, fotometria IES/LDT) e passe `--dados iluminacao=<obra>.json`.
   - Projeto luminotécnico **oficial** (lux, UGR, isolux): DIALux evo ou Relux com a base DWG/IFC.
7. **Gerar o 3D** (`--pontos` e `--trechos` repetem):
   ```bash
   node _comum/cad/gerar-3d.js "<projeto.dwg>" --planta N --pe-direito 3 --pontos "<pasta da obra>\pontos.json" --trechos "<pasta da obra>\trechos.json" --trechos "<pasta da obra>\trechos-externos.json" --saida "<pasta da obra>\modelo-3d.html" --cliente "…" --obra "…"
   ```
   - Com `--pontos`, não passe `--disciplina` da mesma disciplina: a estimativa somaria pontos que não existem.
   - Use o pé-direito real (corte da arquitetura), nunca o padrão sem avisar.
   - Os postes aparecem com braço e projetor, as caixas no piso e o eletroduto enterrado rente ao chão (camada "Iluminação externa").
8. **Checklist antes de entregar ao cliente** (abrir o HTML e girar o modelo):
   - [ ] Uma planta só (`--planta`); escala certa (conferir duas salas com a planta).
   - [ ] Total de pilares bate com a estrutural; nenhum pilar onde há símbolo (poste, caixa).
   - [ ] Nenhuma parede atravessando sala, porta ou janela; fio, unifilar e mobiliário não subiram.
   - [ ] Pontos = legenda/quadro de cargas (luminárias, tomadas, postes, quadros); nenhum duplicado.
   - [ ] Área externa: todos os postes com caixa e eletroduto até o quadro; memorial com queda ≤ 4 %.
   - [ ] Avisos (`!`) e itens [CONFERIR] lidos e resolvidos ou explicados ao cliente.
   - [ ] Legenda "modelo ilustrativo" mantida.

## Ferramentas externas (quando valem a pena)

| Ferramenta | Para quê | Custo |
|---|---|---|
| That Open Engine (web-ifc) | Ler IFC no sistema — 3D fiel sem adivinhar | Gratuito (código aberto) |
| DIALux evo / Relux | Cálculo luminotécnico oficial (interno e de quadras/estacionamento) com fotometria real | Gratuito |
| Autodesk Platform Services | AutoCAD/Revit na nuvem: converter DWG→IFC/RVT, ler DWG com fidelidade | Pago por crédito |
| Reconhecimento de planta por IA (Kreo, Togal.AI…) | Levantamento por PDF | Assinatura — testar antes |

## Regras

- **Gerador:** fica em `_comum/cad/*` e é compartilhado com o botão "Modelo 3D" do sistema. Mudança nele exige:
  - teste em `_comum/cad/teste-3d.js` e em `modelo-3d/testes/teste.js`;
  - bundle novo do visualizador: `npm run build:3d`.
- **Dados das obras:** arquivos de obras reais (DWG, mapas, pontos, memorial, HTML) ficam na pasta do cliente no servidor, **nunca** no repositório.
- **Ambientes:** primeiro na versão de teste (`C:\HM-Engenharia\hm-eng-v2`, porta 3002); produção só com aprovação.
- **Valor técnico:** o 3D é ilustrativo. Valem o memorial e as plantas assinadas pelo responsável técnico.
