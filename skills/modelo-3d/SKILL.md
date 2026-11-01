---
name: modelo-3d-arquitetura
description: Modelo 3D profissional a partir da arquitetura (DWG/DXF ou IFC) com os pontos das disciplinas — diagnóstico e mapa das layers antes de gerar (para não subir parede ou pilar onde não existe), conferência de pilares/paredes com a planta, distribuição de luminárias pelo cálculo luminotécnico real e checklist de entrega, no padrão da H&M Engenharia. Use quando o pedido envolver modelo 3D, maquete 3D, visualização 3D para o cliente, 3D da proposta, paredes ou pilares errados no 3D, luminárias mal distribuídas no 3D, IFC/BIM do arquiteto, Revit, DIALux ou melhorar a qualidade do 3D.
---

# Modelo 3D da arquitetura — H&M Engenharia

O sistema gera o 3D (`skills/_comum/cad/gerar-3d.js` e o botão "Modelo 3D" no sistema) **adivinhando** pelo nome das layers o que é parede, pilar e janela. Quando o escritório de arquitetura usa nomes fora do padrão, aparecem parede e pilar onde não existe. Esta skill põe o **engenheiro no meio**: diagnostica as layers, ele confirma, e só então o 3D é gerado. **Não refaça contas nem classificações de cabeça: rode os scripts.**

## Fluxo de trabalho

1. **Triagem da entrada (nesta ordem de preferência):**
   - **IFC do arquiteto (Revit/ArchiCAD):** paredes, pilares, lajes e forro reais, sem palpite. Peça sempre. *O sistema ainda não lê IFC* (próximo passo: That Open Engine / web-ifc, gratuito) — até lá, peça também o DWG.
   - **DWG/DXF com layers de arquitetura:** caminho atual. Peça a planta **sem** mobiliário/layout quando der, e a **estrutural** (forma) para conferir os pilares.
   - **PDF:** não serve para 3D fiel. Peça o DWG.
2. **Diagnóstico das layers** (pasta `C:\HM-Engenharia\hm-eng\skills`; para testar mudanças na skill, `hm-eng-v2\skills`):
   ```bash
   node modelo-3d/scripts/diagnosticar-layers.js "<arquitetura.dwg|.dxf>" --saida "<pasta da obra>\mapa-layers.json"
   ```
   Mostra, por layer: a classe que o gerador daria (parede, pilar, janela, mureta, media, guarda ou —), quantos pilares sairiam, polilinhas fechadas, entidades e comprimento. Leia os avisos (`!`): "nenhuma layer de parede" (tudo vira parede), layer de parede com muitos "pilares" (são símbolos/mobiliário), nome de mobiliário subindo como parede.
3. **Conferir o mapa com o engenheiro:** mostre a tabela e pergunte layer a layer o que estiver em dúvida. Edite o `mapa-layers.json` — classes: `parede`, `pilar`, `janela`, `mureta`, `media`, `guarda`, `ignorar`. Compare o **total de pilares** com a estrutural ou com a própria planta. Não suponha: layer duvidosa é pergunta.
4. **Gerar a base limpa** (cópia; o original não muda):
   ```bash
   node modelo-3d/scripts/aplicar-mapa.js "<arquitetura>" "<pasta da obra>\mapa-layers.json" --saida "<pasta da obra>\base-3d.dxf"
   ```
   Pilar falso que está na **mesma layer** das paredes não sai pelo mapa: peça ao engenheiro para mover esses objetos para outra layer no AutoCAD (ou apagar na cópia) e rode de novo o diagnóstico.
5. **Luminárias (e demais pontos) pelo cálculo real, não pela estimativa:**
   - Sem formulário, o 3D usa uma **estimativa** (painel LED 4.000 lm de referência na caixa envolvente de cada sala) — serve só para ideia.
   - Para o 3D profissional, faça o cálculo na skill `iluminacao-nbr8995` com a **luminária real do fabricante** (W, lm, UGR, FU/fotometria IES-LDT) e passe o formulário: `--dados iluminacao=<obra>.json`. O mesmo vale para incêndio, CFTV etc. (`--dados <disciplina>=<form>.json`).
   - Confira na vista de cima: luminária em cima de pilar, fora do forro, ou grade torta em sala em L → ajuste o ambiente (divida a sala em L em dois retângulos no formulário).
   - Projeto luminotécnico **oficial** (lux, UGR, curvas isolux): DIALux evo ou Relux com a base DWG/IFC e as fotometrias reais; o 3D do sistema é ilustrativo.
6. **Gerar o 3D:**
   ```bash
   node _comum/cad/gerar-3d.js "<pasta da obra>\base-3d.dxf" --saida "<pasta da obra>\modelo-3d.html" --pe-direito 2.8 --disciplina iluminacao,incendio --dados iluminacao=<obra>.json --cliente "…" --obra "…"
   ```
   Pé-direito real (corte da arquitetura), nunca o padrão sem avisar.
7. **Checklist antes de entregar ao cliente** (abrir o HTML e girar o modelo):
   - [ ] Total de pilares bate com a estrutural; nenhum pilar no meio de circulação sem existir.
   - [ ] Nenhuma parede atravessando sala, porta ou janela; mobiliário não subiu como parede.
   - [ ] Portas abertas nos vãos; janelas com peitoril.
   - [ ] Escala certa (sala com área coerente — conferir duas salas com a planta).
   - [ ] Luminárias em grade alinhada, dentro do forro, sem cair em pilar; quantidade = a do memorial.
   - [ ] Detectores, câmeras e pontos com a quantidade do formulário (não da estimativa).
   - [ ] Avisos do gerador (`!`) lidos e resolvidos ou explicados ao cliente.
   - [ ] Legenda "modelo ilustrativo" mantida.

## Ferramentas externas (quando valem a pena)

| Ferramenta | Para quê | Custo |
|---|---|---|
| That Open Engine (web-ifc) | Ler IFC no sistema — 3D fiel sem adivinhar | Gratuito (código aberto) |
| DIALux evo / Relux | Cálculo luminotécnico oficial com fotometria real | Gratuito |
| Autodesk Platform Services | AutoCAD/Revit na nuvem: converter DWG→IFC/RVT, ler DWG com fidelidade | Pago por crédito |
| Reconhecimento de planta por IA (Kreo, Togal.AI…) | Levantamento por PDF | Assinatura — testar antes |

## Regras

- O gerador (`skills/_comum/cad/*`) é mantido por outra sessão de trabalho: esta skill só **lê** o desenho e grava cópias; mudanças no gerador combinar antes.
- Arquivos de obras reais (DWG, mapa, base-3d, HTML) ficam na pasta do cliente no servidor, **nunca** no repositório.
- Primeiro na versão de teste (`C:\HM-Engenharia\hm-eng-v2`, porta 3002); produção só com aprovação.
- O 3D é ilustrativo; o que vale tecnicamente é o memorial e as plantas assinadas pelo responsável técnico.
