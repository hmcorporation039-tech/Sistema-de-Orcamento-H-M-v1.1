# Roteiro da grande implementação (02/11/2026)

Pedido do Márcio (02/11/2026):
- 3D interativo: abrir a tampa do quadro, ligar e desligar disjuntores, ver iluminação e tomadas funcionando, e mexer em interruptores, relés e botoeiras.
- Climatização como disciplina, com HVAC, VAV e chiller conforme a norma de cada um.
- Iluminação com 3D.
- Leitura de PDF e DWG mais precisa.
- O sistema conversa com o Márcio de fora do escritório, por mensagem, WhatsApp ou voz: custos, notas, envio de projetos, orçamentos.
- Referências: AutoCAD Electrical, Revit MEP, QiElétrico, EPLAN Pro Panel, Revit com famílias de fabricante e Revit de rede.
- Depender o mínimo possível de IA.

Este roteiro parte da auditoria de 02/11/2026: 8 áreas, 15 agentes, 73 achados confirmados por um verificador cético e 1 refutado. Os resultados estão na seção 6.

Regras de sempre:
- Cada fase nasce no v2 (porta 3002), com teste.
- Mudança de banco só por migração idempotente.
- Backup antes de ir para a produção, e só com o OK do Márcio.

---

## 1. Princípios

1. **Um modelo só da instalação.** Quadro → disjuntor → circuito → comando → ponto é UM dado, gerado pelas skills (formulário) ou lido do projeto (DWG/PDF/IFC) e conferido pelo engenheiro. Planta, quadro de cargas, unifilar, orçamento, caderno de fabricação e 3D leem esse mesmo dado.
   - É o que o Revit MEP faz com os "sistemas elétricos" e o EPLAN com a tag única do dispositivo.
   - Hoje cada saída tem a sua cópia, e o 3D não sabe a que circuito pertence cada ponto (achados 3D-06, SK-02, SK-06).
2. **Motor determinístico primeiro, IA por último.**
   - Norma e conta ficam no código: skills, NBR 5410, 16401, 8995.
   - A leitura de projeto se apoia em regra, biblioteca e aprendizado confirmado.
   - A IA só entra no que sobra (texto livre, pedido falado) e cada uso é contado: o painel de Integrações já mede a "IA evitada".
3. **Precisão medida, não percebida.**
   - Cada melhoria de leitura roda contra um conjunto fixo de projetos reais anonimizados, que fica no servidor e fora do repositório.
   - O resultado é um placar: acerto por símbolo, por metro de eletroduto e por ambiente.
4. **Ação irreversível sempre confirmada por quem tem o login.**
   - Enviar e-mail, emitir nota, mandar projeto e mudar preço continuam como "ação pendente", agora com prazo e nova conferência.
   - Isso vale igual pela tela, pelo WhatsApp ou pela voz.

---

## 2. O que tirar de cada referência

| Referência | O melhor dela | O que já temos | O que vamos fazer |
|---|---|---|---|
| **AutoCAD Electrical** | Tag única por dispositivo; referência cruzada bobina ↔ contatos do relé; listas automáticas (bornes, fios, materiais) | Tags no quadro (Q1, Qn, K, S, H), bornes um a um, caderno de fabricação | Referência cruzada no modelo único (contato NA/NF de K1 aparece na bobina e vice-versa); esquema de comando gerado do mesmo dado |
| **Revit MEP** | Circuito como objeto que liga painel e cargas; tabela do painel (panel schedule); famílias com conector; detecção de interferência; dutos e tubulações com perda de carga | Quadro de cargas e unifilar da skill elétrica; compatibilização por afastamento; dutos de pressurização (Altshul-Tsal) | Circuito como entidade no modelo único (fase 1); conectores nos símbolos 3D; dutos de HVAC na fase 4 |
| **QiElétrico / QiBuilder (AltoQi)** | Lançar na planta e calcular pela NBR 5410 na hora; quadro de cargas e unifilar saem do mesmo lançamento; padrão brasileiro | Cálculo NBR 5410 completo (_comum/eletrico); leitura dos símbolos explodidos do QiBuilder com o Mapa do CAD | Projeto lido do DWG vira formulário da skill (circuito por texto ao lado do símbolo), em vez de só contagem |
| **EPLAN Pro Panel** | Layout 3D do painel a partir do esquema; roteamento de fios; furação; dados do fabricante (Data Portal); dissipação térmica | Quadro 3D com porta, trilhos, canaletas e bornes; dissipação e IP no caderno; catálogo `componentes_quadro` | Estado dos dispositivos no 3D do quadro (fase 2); fio a fio a partir do esquema (depois) |
| **Revit com famílias do fabricante** | Dimensões reais, fotometria IES/LDT, curvas, modelo e referência | Catálogo de componentes com fonte; FU do fabricante na iluminação | Importar IES/LDT na iluminação (fase 5); catálogo de equipamentos de HVAC (fase 4) |
| **Revit (rede)** | Rack, patch panel e ponto rastreáveis de ponta a ponta | Rack dimensionado, caderno do rack, CFTV e cabeamento | Ponto ↔ porta do patch panel ↔ switch no modelo único (fase 1, sem pressa) |
| **IFC (openBIM)** | Classe, nível e família do objeto sem adivinhar | Não lemos IFC | Leitura de IFC com web-ifc (fase 3): o caminho mais curto para depender menos de heurística |

---

## 3. Fases

Cada fase entrega algo utilizável sozinha. A ordem segue a dependência técnica: o 3D interativo e a iluminação no 3D precisam do modelo único (fase 1).

### Fase 0 — Fundação (feita no v2 em 02/11/2026; falta levar à produção)
Corrigir no v2 os achados da auditoria que são seguros, isolar o teste da produção e pôr todos os testes no pré-deploy. Detalhe na seção 6.

O ramo `versao-2.0` estava marcado 2.10.0 e sem as entradas do RESUMO da 2.11 à 2.26 (OP-05). Foi mesclado com a main.

**Corrigidos no v2 (4 agentes em paralelo, cada um num grupo de arquivos):**
- **Leitura de DWG/DXF:** CAD-01 a 07, CAD-11 e CAD-13.
  - Módulos novos: `textoCad.js` (MTEXT e altura num lugar só) e `dxfDoDwg.js` (conversor testável).
  - No DWG real da Paróquia, 219 inserções passaram a trazer seus 417 atributos; antes eram 0.
  - Aparecem agora 865 splines, 3.618 elipses e 1.362 cotas.
  - Dos 40 blocos dinâmicos, 19 são lidos pelo nome verdadeiro.
  - Os 2 "postes" falsos sumiram.
  - No R04, a layer REF-LUMINOTECNICO deixou de contar em dobro: 20/20, 11/11, 10/10, 9/9.
- **3D:** 3D-01 a 05, 3D-07 e SK-05.
  - Pontos sem ambiente: de 100 % para 0.
  - Cena de 1.200 salas: de 57 s para 2,6 s.
  - Chamadas de desenho: de 1.212 para 13 por quadro, e nada é desenhado com a cena parada.
  - O cache passou a acompanhar os símbolos aprendidos e o código do gerador, e há o botão "Gerar de novo".
- **Backend, assistente e operação:**
  - Assistente: INT-01, 02, 03, 06, 07, 09, 10.
  - Backend e segurança: BK-02, 03, 04, 05.
  - Banco (BD): 01, 02, 04, 05, 07; migrações 2.0-39 a 41.
  - Testes do frontend e das skills no pré-deploy: FE-03 e OP-04.
  - Operação: OP-01, 02, 03, 07, 08 (o script `skills/ligar-skills.ps1` está pronto, mas ainda não foi rodado).
- **Frontend e skills:**
  - Frontend: FE-01, 02, 04, 06 e 07, mais OP-09 e parte do FE-05.
  - Skills: SK-01, 07, 09 e 10.
- **Segunda rodada:** INT-04 (o Pix leva a obra da nota; faturado e a receber na obra), BD-06 (teste das migrações num banco vazio), BD-08 (coluna documentada), OP-06 (arquitetura do resumo), OP-09 no backend (`utils/texto.js` e `utils/xml.js`) e OP-11 (logo e cabeçalho com fonte única e teste de hash).
- **Desfeito de propósito:** OP-10. Tirar duas dependências sem uso obrigava a refazer o package-lock com mocha e typescript novos, um risco que não compensa.

**Mudanças que o Márcio vai notar:**
- O item da proposta de renovação usa o nome da disciplina no registro, por exemplo "Renovação do laudo de SPDA — para-raios". O histórico de preço vendido continua achando o texto antigo.
- O e-mail do login deixou de diferenciar maiúsculas de minúsculas.
- O 3D ganhou o botão "Gerar de novo".
- Confirmar um símbolo no Mapa do CAD refaz os 3D guardados na próxima abertura.

Falta, com decisão do Márcio:
- quem pode mandar ler a caixa de e-mail: hoje é qualquer usuário, e Pix e fornecedores exigem admin (BK-01/02);
- rodar `skills/ligar-skills.ps1` para a skill de quadros aparecer no Claude Code;
- antes da migração 2.0-40 na produção, conferir com uma consulta só de leitura quais modelos 3D órfãos ela apagaria;
- política de retenção dos backups e builds antigos;
- por que o dump do banco cresceu 40× numa semana: 0,19 MB em 27/10 e 8,4 MB em 02/11 (OP-12).

### Fase 1 — Modelo único da instalação (base do 3D interativo)
**Entrega:** um objeto `instalacao` gerado pelas skills e gravado na cena 3D:
- `quadros` {tag, local, geral, DR, disjuntores [{tag, circuito, polos, In, curva}]};
- `circuitos` {id, quadro, disjuntor, tipo iluminação/TUG/TUE/motor, pontos[]};
- `pontos` {id, tipo, posição, ambiente, circuito, comando};
- `comandos` {tipo: interruptor simples, paralelo ou intermediário; pulsador com relé de impulso; contator com botoeira liga/desliga e selo; sensor de presença; DALI/cena; quais pontos comanda}.

Passos:
1. Identificador de circuito comum à elétrica, à iluminação, aos quadros e ao 3D. Chaves de disciplina unificadas pelo registro (SK-05, feito na fase 0).
2. Iluminação → elétrica/quadros: os circuitos IL* entram no quadro de cargas e no unifilar, e a planta elétrica usa a grade do luminotécnico em vez de "1 ponto a cada 16 m²" (SK-06, SK-02).
3. O 3D para de descartar o atributo CIRCUITO e passa a gravar circuito e comando por ponto (3D-06).
4. No DWG recebido: ler o texto do circuito e do retorno junto ao símbolo (ex.: "3", "a", "b") e confirmar no Mapa do CAD.
5. Teste sem navegador: para um projeto exemplo, todo ponto tem circuito, todo circuito tem disjuntor e a soma das cargas bate com o quadro de cargas.

**Feito no v2 em 02/11/2026** (commit c94531e, junto com a fase 2; falta o OK do Márcio para levar à produção):
- Modelo único em `skills/_comum/instalacao/` (quadros, circuitos, pontos e comandos), gerado pelas skills eletrica, iluminacao e quadros e gravado na cena 3D (versão 3).
- Os circuitos IL* do luminotécnico entram no quadro de cargas, e a planta elétrica usa a grade do luminotécnico.
- O 3D grava circuito e comando por ponto, com ids iguais ao regerar. No DWG, o texto do circuito junto ao símbolo é lido (`circuitoDoDesenho.js`, commit 934ce3c).
- O validador sem navegador confere que todo ponto tem circuito, todo circuito tem disjuntor e a soma bate com o quadro. O caso IL2 (160 × 260 VA) foi resolvido na fase 5.
- **Falta:** ligar pela tela o projeto de iluminação ao de elétrica da mesma obra.

### Fase 2 — 3D interativo
**Entrega:**
- No 3D do prédio, clicar no quadro abre o quadro: a tampa abre e cada disjuntor tem alavanca.
- Desligar Q3 apaga as luminárias do circuito 3 e marca as tomadas como sem energia.
- Interruptores, pulsadores, relés de impulso, contatores com botoeira liga/desliga e emergência funcionam pela lógica de comando.
- Painel de comando de motor (bomba, ventilador, pressurização): botoeira liga, desliga e emergência, sinaleiro e relé térmico (simulado "desarmado").

Como:
1. **Simulador lógico separado da cena** (JS puro, testável no Node):
   - `energizado(ponto) = geral ∧ DR ∧ disjuntor ∧ lógica do comando`;
   - o relé de impulso alterna;
   - o contator com selo fica ligado depois do pulso e cai com o desliga ou com a emergência;
   - sem cálculo de corrente: Ib, queda de tensão e seção já vêm da skill e aparecem na ficha.
2. **Visualizador:**
   - cor e emissão por instância (setColorAt) para ligado/desligado, raycast por instância;
   - alavanca do disjuntor e tampa articuladas no quadro.js, que já abre a porta;
   - luz: emissão da luminária, mais no máximo 8 a 16 luzes dinâmicas só no ambiente atual, para não pesar no celular;
   - desenho só quando algo muda (3D-04, feito na fase 0).
3. **Navegação** prédio ↔ quadro com o mesmo estado. Quadro do prédio = mesmo dado do caderno de fabricação (skill quadros).
4. **Estado:**
   - na primeira entrega, fica só no navegador ("o que acontece se...");
   - depois, se o Márcio quiser cenários salvos para mostrar ao cliente, a tabela `modelo_3d_estados` (origem, elemento, estado, usuário, data);
   - isso exige id estável dos elementos entre regerações.
5. **Dentro do sistema:** hoje o 3D abre numa aba isolada, sem login. Para gravar estado ou mostrar a ficha do circuito vinda do banco, embutir num iframe com `postMessage`.

Referências: Revit MEP (circuito ↔ painel), EPLAN (painel 3D a partir do esquema), AutoCAD Electrical (bobina ↔ contatos).

**Feito no v2 em 02/11/2026** (commit c94531e; falta o OK do Márcio para levar à produção):
- Simulador lógico em `skills/_comum/instalacao/simulador.js` (geral, DR, disjuntor, interruptores simples/paralelo/intermediário, relé de impulso, contator com selo, emergência e relé térmico), testado no Node.
- No 3D: clicar no interruptor ou na luminária liga e desliga; o quadro abre por cima do prédio com alavanca em cada disjuntor e DR; tomada sem energia fica vermelha; painel de motor com liga, desliga, emergência e sinaleiros; ficha do circuito com disjuntor, DR, corrente, seção e queda de tensão.
- Cena antiga abre como antes, sem a interação.
- **Falta:** estado salvo (`modelo_3d_estados`) e iframe com `postMessage` (hoje o estado fica só na aba); seletor MAN-0-AUT só liga e desliga; botões da porta do painel vão para os motores pela ordem.

### Fase 3 — Precisão da leitura de PDF e DWG
**Entrega:** um placar de precisão por projeto real e as correções que o fazem subir.

1. **Leitura bruta (fase 0, em andamento).** Limpeza do MTEXT; atributos, SPLINE, ELLIPSE, cotas e chamadas no DWG; bloco dinâmico e MINSERT; leitor único de altura; contagem dupla no mapa; corte de 8 formas por layer (CAD-01 a 07, 11, 13).
2. **Escala automática** (CAD-09). Nessa ordem:
   - escala informada na tela;
   - texto do carimbo;
   - nome do arquivo ("A0 1_50");
   - portas (já existe no 3D, falta na análise);
   - cota conhecida.
   O resultado diz de onde veio a escala.
3. **Biblioteca de blocos por fabricante e escritório:**
   - chave com medida real e escritório do carimbo (CAD-08);
   - alimentada pelas confirmações do Mapa do CAD;
   - exportável para levar de uma instalação para outra.
4. **Mapa único:**
   - uma medição só de eletroduto e eletrocalha para o 3D e o orçamento (CAD-10);
   - decisão por layer entre bloco e símbolo explodido (CAD-12).
5. **PDF:**
   - OCR local, que já existe para cotações, ligado à análise para o texto SHX desenhado como traço;
   - legenda e carimbo lidos pela posição na folha;
   - calibrar o classificador com a prancha luminotécnica A0 que hoje cai como "legenda" (CAD-14).
   - Corrigir um defeito achado na fase 0: em `legendaDoProjeto`, o símbolo da legenda cujo texto não tem tipo pega a linha vizinha.
     - No R04, INC-ISOLADOR sai como avisador, e INC-SIRENE vira "?".
     - O orçamento do R04 não muda, porque conta pelos blocos.
6. **IFC** com web-ifc (That Open): classe, pavimento e família sem heurística. É o melhor caso para a análise sem IA quando o arquiteto entrega BIM.
7. **Placar:**
   - pasta de fixtures no servidor (Paróquia NSA e os próximos projetos), com a contagem conferida pelo engenheiro;
   - teste que compara e mostra a % de acerto por disciplina;
   - cada mudança de leitor roda o placar antes de subir.

**Feito no v2 em 02/11/2026** (commit 934ce3c; falta o OK do Márcio para levar à produção):
- **Legenda** (`pontosDoDesenho.legendaDoProjeto`): cada texto da legenda é do símbolo mais perto dele. A linha sem tipo fica sem tipo, e a amostra de traço (raio de cobertura, campo de visão) não vira ponto.
  - No R04, INC-ISOLADOR passou a "?" com a descrição "Isolador de laço IDL 521" e INC-SIRENE voltou a avisador (legenda, 2,40 m).
  - O detector falso de INC-RAIO-COBERTURA sumiu, e CAB-AP virou access point.
- **Escala automática** (CAD-09, `backend/src/utils/escalaDaPlanta.js`): informada no envio → carimbo → título da vista → nome do arquivo → portas → cotas. Portas e cotas só contam dentro da planta.
  - O resultado traz `origemEscala`. A escala deduzida gera o achado "Escala da planta [CONFERIR]".
  - A tela de envio ganhou o campo "Escala 1:" para cada PDF.
  - O 3D também lê a escala do nome do arquivo.
- **Biblioteca de blocos** (CAD-08, migração `2.0-43`): a confirmação do Mapa do CAD vale pela medida real (±2 cm) e pelo escritório do carimbo.
  - Exporta e importa em JSON (`GET/POST /projetos/biblioteca-blocos`; importar só administrador).
  - Os botões ficam no rodapé do Mapa do CAD.
- **Mapa único** (CAD-10/12): o traçado do mapa é a mesma medição do orçamento (regra `RE_LAYER_INFRA` e `tipoDoTracado` em `disciplinasCad.js`, sem trecho repetido). A decisão entre bloco e símbolo explodido é por layer, com o motivo em cada linha do mapa.
- **PDF** (CAD-14): a prancha luminotécnica A0 da Paróquia passou a planta (parede dupla ≥ 150 m vale sozinha) e ganhou a escala pelo nome do arquivo.
  - Perfil e fita de LED medidos viram material em metros, não eletroduto.
  - Título sublinhado ("DETALHES EM …") não vira tipo de linha.
- **Placar** (`backend/scripts/placar-precisao.js`, formato em `docs/PLACAR-PRECISAO.md`): a pasta de fixtures fica fora do repositório (`HM_PLACAR_PASTA`). Sem a pasta, o teste diz "pulado".
- **Ponto de extensão por disciplina** (`PROPRIOS_DA_DISCIPLINA` em `skills/_comum/cad/disciplinasCad.js`): para a climatização, duto, difusor e layers HVAC/AVAC/MEC deixam de ser "outra área".

**Ficou para depois:**
- **OCR do texto SHX desenhado como traço.** O desenho proposto:
  1. Achar os grupos de traços miúdos alinhados como texto dentro da planta.
  2. Renderizar só esses recortes, a cerca de 300 dpi, no processo principal. Na thread de leitura o @napi-rs/canvas é bloqueado.
  3. Passar os recortes pelo tesseract.js já instalado (`services/leitorCotacao.js`, função `ocr`).
  4. Devolver `{ s, x, y, h }` como texto da página, para o classificador (nome de sala) e para os ambientes.

  Uma A0 inteira a 300 dpi dá cerca de 100 MP, inviável dentro do tempo-limite de 60 s por página; por isso, só os recortes.
- **Legenda e carimbo pela posição na folha.** Não há prancha real que falhe nisso para calibrar. A legenda em tabela, o título e o carimbo pelos campos já funcionam.
- **IFC com web-ifc.** O desenho:
  - `web-ifc` com versão exata (a estável do dia, conferida no npm), só no backend;
  - leitura numa thread à parte, como `analiseCad/worker.js`;
  - classe: `IfcLightFixture`, `IfcOutlet`, `IfcSwitchingDevice`, `IfcFireSuppressionTerminal`, `IfcAlarm`, `IfcSensor`, `IfcCableCarrierSegment`, `IfcDuctSegment`…;
  - pavimento por `IfcRelContainedInSpatialStructure` → `IfcBuildingStorey`;
  - família por `IfcRelDefinesByType` → `*Type.Name`;
  - posição por `IfcLocalPlacement`;
  - saída no mesmo formato de `lerArquivoCad` (itens, espacial, ambientes por `IfcSpace`);
  - teste com um IFC sintético pequeno escrito à mão.

### Fase 4 — Disciplina Climatização (nova skill)
**Entrega:** a skill `climatizacao` no mesmo contrato das outras: formulário, memorial, planilhas, orçamento, laudo/PMOC, planta e 3D.

**Normas de base** (cada valor de tabela marcado [CONFERIR] até ser lido na norma vigente):

| Norma | Para quê |
|---|---|
| ABNT NBR 16401-1 | Projeto das instalações centrais e unitárias |
| ABNT NBR 16401-2 | Conforto térmico |
| ABNT NBR 16401-3 | Qualidade do ar e vazões de ar externo (já usada na automacao-bms) |
| ASHRAE 62.1 | Ventilação, para comparar |
| ASHRAE 90.1 | Eficiência mínima de chiller e ventilador, e controle de VAV |
| AHRI 550/590 | COP e IPLV do chiller |
| Lei 13.589/2018 e Portaria MS 3.523/1998 | PMOC: plano de manutenção, operação e controle |
| Resolução ANVISA RE 09/2003 | Referência de qualidade do ar interior |

**Escopo, em três etapas:**
1. **Carga térmica e seleção:**
   - carga por ambiente pelo método por componentes (envoltória, pessoas, iluminação, equipamentos, ar externo);
   - escolha do sistema (split/VRF, self, fancoil com chiller);
   - capacidade em TR/kW;
   - ar externo pela 16401-3, aproveitando o que existe na automação.
2. **Sistemas centrais:**
   - **chiller** (TR, COP/IPLV, vazão de água gelada pelo ΔT, bombas primária/secundária);
   - **fancoil/AHU**;
   - **VAV** (vazão mínima pelo ar externo, máxima pela carga, reaquecimento, controle de pressão do duto);
   - **dutos** (perda de carga com o motor Altshul-Tsal da pressurização, vazão por difusor).
   As bombas e os ventiladores usam o motor de motores e partidas, que vai para `_comum/eletrico/motores.js` (SK-08). O quadro elétrico de HVAC vem pela skill quadros, e a lista de pontos e o descritivo, pela automacao-bms.
3. **Operação e laudo:**
   - PMOC (obrigatório por lei para quem tem climatização acima do limite da lei; conferir o limite);
   - checklist de vistoria;
   - medição de vazão e temperatura;
   - orçamento.

**Sistema:**
- Leitura de CAD: as layers HVAC/AVAC/AR-CONDICIONADO/MEC-DUTOS deixam de ser "referência de outra área" quando a disciplina for climatização.
- Tipos de ponto: difusor, grelha, VAV, fancoil, evaporadora, condensadora e chiller.
- 3D: dutos e equipamentos.
- Banco: tabela `equipamentos_catalogo` (tipo, dados técnicos em JSON, fabricante, fonte, verificado), no padrão de `componentes_quadro`.

**Feito no v2 em 02/11/2026** (commit d752b05; falta o OK do Márcio para levar à produção):
- Skill `skills/climatizacao/` (carga térmica, seleção, centrais com chiller/VAV/dutos, PMOC, planta e símbolos HVAC) com 77 verificações; motores e dutos passaram para `skills/_comum/eletrico/motores.js` e `skills/_comum/dutos.js`, com a mesma saída nas skills eletrica-industrial e pressurizacao.
- Tabela `equipamentos_catalogo` (migração 2.0-42) e rotas `/equipamentos-catalogo` (leitura com login; escrita só admin); 22 códigos de mão de obra clim_*.
- Blocos HM-CLIM-* reconhecidos como climatização na análise do CAD (commit df08e34).
- **Falta:** tela do catálogo de equipamentos; estimativa 3D da climatização pela arquitetura; ligar a skill no Claude (`skills/ligar-skills.ps1`); conferir na norma os valores marcados [CONFERIR].

### Fase 5 — Iluminação no 3D
**Entrega:** o 3D mostra as luminárias da skill iluminacao-nbr8995 ligadas ao circuito e ao comando (sensor, dimmer, DALI, cena). A cena liga e desliga, dimeriza e troca de cena, e mostra o **mapa de iluminância** (cores no piso), à maneira do DIALux.

Passos:
1. Fotometria por luminária:
   - importar IES/LDT do fabricante;
   - sem arquivo, usar fluxo e ângulo do cadastro.
2. Cálculo ponto a ponto simples (lei do inverso do quadrado do cosseno, sem refletância na primeira versão, avisado) para a uniformidade calculada, que hoje só existe medida em campo.
3. Cenas definidas (nome, grupos, % de cada grupo) em vez de só "contar teclados".
4. A grade em sala não retangular completa as luminárias (SK-01, fase 0).

Iluminação de emergência continua na skill de incêndio (NBR 10898).

**Feito no v2 em 02/11/2026** (commit 3bb4728; falta o OK do Márcio para levar à produção):
- **Fotometria** (`skills/_comum/fotometria/leitor.js`, JS puro): lê IES LM-63 (tipo C, TILT, multiplicador e fator de reator, simetrias de eixo, quadrantes, C0–C180, C90–C270 e completa) e LDT/EULUMDAT (simetrias 0 a 4). Sem arquivo, curva simétrica aproximada I0·cos^m γ pelo fluxo e pelo facho do cadastro (sem facho, 120°), avisada com [CONFERIR]. Testado com arquivos sintéticos gerados no teste; nenhum arquivo de fabricante no repositório.
- **Ponto a ponto** (`skills/_comum/fotometria/pontoAPonto.js`, o mesmo código na skill e no 3D): E = FM × Σ I(C, γ) × cos γ / d², só luz direta, sem interreflexão (avisado). A skill dá Em, Emín, Emáx e U0 nos centros da malha de medição. Ficam lado a lado com a Em do método dos lúmens e com a U0 mínima da atividade, no resumo, no memorial (item 6.1) e na planilha (aba "Ponto a ponto").
- **Cenas** (`skills/iluminacao/scripts/lib/cenas.js`): no formulário, tabelas de grupos ("filas 2-3", "1-4", "coluna 1", "demais") e de cenas ("Mesa 100; Tela 30"), para DALI-2 e teclado de cenas. Vão para o modelo da instalação (`comando.cenas`, `ponto.grupo`, `ponto.luminaria` e `instalacao.luminotecnico`, com a fotometria compacta). No simulador, o nível de cada luminária segue o grupo dela na cena ativa; o teclado troca de cena (… → desligado → 1ª) e o DALI-2 com cenas também chama cena. O teclado sem cenas no projeto segue com 100/60/30 %/desligado, como antes.
- **3D:** o botão "Mapa de iluminância" pinta o piso de cada ambiente do luminotécnico em falsa-cor, com legenda em lux. Leva em conta o estado das luzes (cena, dimerização, disjuntor). Dentro do ambiente, mostra Em, Emín e U0 na mesma malha do memorial, e os números batem: na cena de teste, 463 / 268 / 0,58 nos dois. O painel "Dentro do ambiente" tem os botões das cenas, e a ficha da luminária e do teclado mostra a cena ativa e o grupo. A grade é grossa (≤ 250 células por ambiente no celular, ≤ 600 no computador), calculada só quando o botão é ligado; numa cena grande demais, só o ambiente atual. Cena antiga ou sem luminotécnico abre como antes, sem o botão.
- **Formulário:** coluna "Fotometria (IES/LDT)" com botão "Carregar" (novo tipo de coluna `arquivo` em `frontend/src/components/laudos/campos.js`, até 512 KB, guardado no próprio formulário) e coluna "Facho (°)".
- **SK-01:** já resolvido na fase 0 (`posicionamento.gradeNxNy` → `completarDentro`, casos SK-01 em `teste-cad.js`). O 3D usa a mesma regra da planta.
- **Achado da fase 2 ("Circuito IL2: os pontos somam 160 VA e o quadro de cargas tem 260 VA"):**
  - Era dado incompleto no modelo, não erro do validador. O IL2 (Cozinha + Banheiro) entrava inteiro no quadro de cargas, mas a elétrica só gerava pontos para os ambientes dela, e o Banheiro estava só no luminotécnico.
  - Agora as luminárias desses ambientes entram no modelo, depois dos ids da planta, sem posição (a planta elétrica não tem o ambiente). O validador continua exigindo que a soma feche.
- **Testes:** fotometria 10 casos, instalação 11 (+1), simulador 12 (+1), iluminação 83 verificações (+18, com cálculo à mão), testar-todas sem falha, backend modelo3d 16. No navegador headless, o mapa aparece, a troca de cena muda luzes e mapa, o dimmer e o disjuntor mudam o mapa, a cena antiga abre sem o botão, nenhum erro de JS e 9 ms para calcular no celular.
- **[CONFERIR]:**
  - U0 mínima de 0,4/0,6 (premissa EN 12464-1, já marcada no JSON das atividades).
  - Malha p = 0,2 × 5^log10(d).
  - Área da tarefa: o ponto a ponto usa o ambiente inteiro, inclusive junto às paredes.
  - Curva aproximada sem arquivo e facho padrão de 120°.
  - Fluxo do arquivo × cadastro quando diferem mais de 5 %.
- **Fica para depois:** interreflexão (radiosidade) e luz natural; orientação da luminária diferente da grade (C0 ao longo do lado maior); fonte linear (o perfil é tratado como pontual); cenas salvas por cliente (`modelo_3d_estados`).

### Fase 6 — Falar com o sistema de fora do escritório (WhatsApp, Telegram, voz)
**Entrega:** mandar mensagem e receber resposta, por exemplo:
- "custos da obra Santa Lucia este mês";
- "notas em aberto";
- "manda o projeto da Paróquia para o cliente";
- "faz um orçamento de 12 câmeras".

O que for irreversível pede confirmação ("SIM 4821"), com prazo.

**Antes de abrir para fora (segurança, obrigatório):**
1. HTTPS válido por túnel (Cloudflare Tunnel) ou proxy reverso, com TRUST_PROXY e CORS restrito ao domínio. Nada de abrir porta no roteador.
2. Sessões revogáveis: token curto mais renovação por dispositivo, logout e "encerrar sessões".
3. 2FA (TOTP) para o administrador e para qualquer acesso de fora.
4. Telefone verificado ligado ao usuário, com cadastro por código de uso único.
5. Auditoria de login e de cada mensagem e ação pelo canal, e aviso de "login novo".
6. Ação pendente com prazo e nova conferência ao aplicar (INT-08), e a conferência de envio no cartão (INT-03, fase 0).
7. Papéis além de admin/user (financeiro, técnico de campo) antes de dar acesso a mais gente.

**Segurança feita no v2 em 02/11/2026** (itens 2 a 5 e 7; o 1 ficou só configurado, desligado; falta o OK do Márcio):
- **Sessões revogáveis** (`services/sessoesUsuario.js`, migração 2.0-44): o login abre uma sessão por navegador, com token de acesso de 15 min (`SESSAO_TOKEN_MINUTOS`) e chave de renovação guardada no banco só como hash. A chave muda a cada renovação; a anterior vale 60 s (duas abas) e, depois disso, usá-la derruba a sessão. A sessão termina ao sair, em "encerrar", em "encerrar as outras", com a senha trocada ou redefinida, com o usuário desativado, com 7 dias parada ou com 30 dias de vida. A tela renova sozinha (`frontend/src/services/renovacaoSessao.js`, usado pelo axios, pelo app de campo e pelo assistente); só se a renovação for recusada aparece o "Entre de novo". Tokens de antes (sem `sid`) valem até vencer.
- **Duas etapas (TOTP, RFC 6238)** só com `crypto` (`services/totp.js` e `segundaEtapa.js`, migração 2.0-45). Ativa em Cadastros › Minha conta, com QR (o `qrcode` do backend), chave e URL otpauth, e 10 códigos de recuperação de uso único. A chave fica cifrada (AES-256-GCM) com `TOTP_CHAVE_CIFRA`. Obrigatoriedade no `.env`, desligada: `TOTP_OBRIGATORIO_ADMIN` e `TOTP_OBRIGATORIO_FORA`.
- **Telegram/WhatsApp verificados** (`services/telefonesVerificados.js`, migração 2.0-46): código de 6 dígitos com 10 min, uso único, guardado como hash; o canal chama `confirmarVinculo` com "/vincular 123456" e `usuarioPeloCanal` antes de atender. 5 erros em 15 min travam o id externo (50 no total).
- **Auditoria de acesso** na tabela `auditoria` (entidade `acesso`, com origem e IP): login com e sem sucesso, segunda etapa, renovação, saída, sessões encerradas, senha, duas etapas e vínculos. "Login novo" (aparelho ou IP nunca vistos) vai para a auditoria e por e-mail, se o envio estiver configurado. Tela em Cadastros › Auditoria, só administrador.
- **Papéis** `financeiro` e `tecnico`, escolhidos na tela de usuários. Nenhuma rota existente mudou; rota nova usa `exigePapel('financeiro')` depois do `autenticar` (`middleware/auth.js`), e o administrador passa sempre.
- **Para o túnel** (não ligado): `TRUST_PROXY` e `CORS_ORIGENS` documentados no `.env.example`. Sem `TRUST_PROXY`, pedido com cabeçalho de proxy conta como "de fora".

**Canal feito no v2 em 02/11/2026** (desligado: `CANAL_TELEGRAM_ATIVO` e `CANAL_WHATSAPP_ATIVO` em `false`; falta o OK e as decisões do Márcio):
- **Fila no banco** (`services/canal/fila.js`, migração 2.0-47): `canal_mensagens` com `(canal, id_externo)` único, para não processar duas vezes. O webhook responde na hora e um trabalhador no backend processa e responde.
- **Webhooks** em `/api/canal/webhook/telegram` e `/whatsapp`, sem login mas com assinatura obrigatória (segredo do Telegram e `X-Hub-Signature-256` do WhatsApp, em tempo constante, sobre o corpo bruto), limite de tamanho e de taxa. Com o canal desligado, devolvem 404.
- **Interpretador local, sem IA:** ajuda, custos <obra> [este mês], margem, notas abertas ou a receber, Pix sem obra, vencimentos, novidades, cotações, proposta <nº>, enviar <proposta> para <cliente>, enviar projeto <nome> para <cliente>. Com mais de um candidato, pergunta qual. O resto vai para o assistente.
- **Ação pendente com prazo (INT-08):** envio pede "SIM 1234" em 10 min (`CANAL_ACAO_PRAZO_MIN`); ao confirmar, confere de novo se o registro mudou e se o usuário ainda pode, e passa pela conferência de envio da tela (INT-03). O "Aplicar" da tela do assistente também confere prazo e mudança.
- **Ferramentas novas do assistente** (só leitura): custos, margem, Pix sem obra, notas fiscais, notas a receber, vencimentos, novidades das pastas, cotações e cronograma; as do financeiro só para admin e financeiro. Envio do pacote do projeto por e-mail como ação pendente.
- **INT-05:** uma lista só de ferramentas (`mcp/catalogoFerramentas.mjs`) para o Claude Desktop e o assistente; as 10 de antes mantêm nomes e parâmetros.
- **Voz:** transcrição local com whisper.cpp se `WHISPER_CPP_BIN` e `WHISPER_MODELO` existirem; senão, responde que a voz não está ativada.
- **Tela Cadastros › Canal remoto** (só admin): estado dos canais e o que falta no `.env`, simulador de conversa (o que for confirmado ali é executado de verdade), ações e mensagens.
- **Ficou de fora:** troca Claude Max → API → Gemini dentro do canal; NFS-e pelo canal (depende da etapa 2); áudio no simulador; teste automático do envio real de e-mail do projeto; limpeza periódica da auditoria.
- **Para ligar o Telegram:** @BotFather → token; `CANAL_TELEGRAM_TOKEN`, `CANAL_TELEGRAM_SEGREDO` e `CANAL_TELEGRAM_ATIVO=true` no `.env`; Cloudflare Tunnel só para a API, com `TRUST_PROXY` e `CORS_ORIGENS`; reiniciar; `setWebhook` com `secret_token`; cada pessoa vincula com `/vincular`.

**Canal:**
- **Telegram:** gratuito, sem aprovação, o mais rápido para começar.
- **WhatsApp Business Cloud API (Meta):** exige verificar a empresa e um número próprio, e tem custo por mensagem conforme a categoria. É o que o Márcio e os clientes já usam.
- Sugestão: começar pelo Telegram para validar o fluxo e passar ao WhatsApp com o fluxo já testado. **Decisão do Márcio.**

**Menos IA:**
- Comandos e perguntas frequentes são resolvidos por um interpretador local, sem IA: "custos <obra>", "notas abertas", "vencimentos", "proposta <nº>", "enviar <proposta> para <cliente>".
- O assistente (Claude Max) só entra no pedido livre.
- A voz é transcrita localmente (whisper.cpp, sem nuvem) e entra como texto no mesmo fluxo.

**Ferramentas que faltam ao assistente:**
- leitura do financeiro: de onde vêm os custos, por obra e categoria, Pix sem obra, margem;
- notas e notas a receber;
- vencimentos;
- novidades das pastas;
- cotações;
- cronograma;
- enviar projeto ou pacote por e-mail (ação pendente).

**Emitir NFS-e** depende da emissão, que ainda não existe: hoje só há rascunho, PDF, e-mail e cancelamento em homologação. Ela entra como ação pendente depois da etapa 2 da NFS-e (certificado A1), com o OK do Márcio.

**Infra:**
- webhook público isolado, com verificação da assinatura do provedor;
- id da mensagem único, para não processar duas vezes;
- fila no banco, em vez de memória;
- resposta assíncrona;
- os dois MCPs unificados (INT-05), para o Claude Desktop e o assistente terem as mesmas capacidades.

### Fase 7 — Estrutura para crescer (em paralelo, aos poucos)
- npm workspaces na raiz com um pacote `comum` (formatação, texto, dinheiro, XML, escapeHtml, timbrado único: OP-09, OP-11) e um `npm test` único.
- Motor de CAD/PDF como pacote próprio, com as fixtures e o placar da fase 3.
- Quebrar os arquivos grandes quando forem tocados: Orcamento.js, NotasFiscais.js, visualizador3d/app.js, modelo3d.js, pdfVetorial.js.
- ~~Teste das migrações num banco vazio (BD-06).~~ Feito na fase 0.

**Feito no v2 em 02/11/2026** (commit 3303e15; falta o OK do Márcio para levar à produção). Nada muda no jeito de instalar e rodar, nem no que o usuário vê:
- **Pacote comum sem npm workspaces.** Fica em `skills/_comum/base` (`texto`, `formato`, `dinheiro`, `html`, `xml`, `timbrado` e `index.js`), sem dependências, e é carregado por `require` relativo, como o resto do `_comum`.
  - Por que não workspaces:
    - as skills vão ao Claude como pastas soltas (`ligar-skills.ps1`) e chegam ao `_comum` por caminho relativo, então um pacote fora de `skills/` não iria junto;
    - workspaces içariam o `node_modules` para a raiz, o que muda o `npm install` de cada pasta (`instalar.bat`, `atualizar-sistema.bat`) e arrisca a checagem de dependências do CRA;
    - o CRA não compila código de fora de `frontend/src`.
  - Backend: `utils/htmlPdf.js`, `texto.js`, `xml.js` e `numeroBR.js`, além das regras de centavo e quantidade de `calculoProposta.js`, viraram ponte para o pacote. Os `require` de sempre continuam valendo. O `esc` de XML continua passando por `String()`, então o XML da NFS-e sai igual.
  - O assistente (`acoes.js`) e o atestado de capacidade passaram a usar o `formatarMoeda` único.
  - Skills: `docx-base` (`fmtNum`, `fmtData` e a pasta da identidade visual), `entrega.js` (XML e data) e `fabricacao/caderno.js`, `svg.js` e `rack.js` (data e escape) usam o pacote.
  - Timbrado: `base/timbrado.js` reúne os dados da empresa (`empresa.js`, que continua sendo a fonte) e os caminhos da logo e do cabeçalho.
  - Frontend: continua com `utils/format.js` e `utils/dinheiro.js`. O teste novo `backend/testes/comum.test.js` roda as duas versões, frontend e pacote, com a mesma tabela de valores e falha se o resultado divergir. Ele também confere que backend e skills usam o pacote, sem cópia própria.
- **`npm test` único na raiz:** o `package.json` da raiz não tem dependências nem workspaces. O `npm test` chama o pré-deploy (`cd backend && npm test`), e há também o `npm run test:rapido`.
- **Arquivos grandes quebrados, sem mudar comportamento.** O conteúdo foi conferido linha a linha contra o original.
  - `frontend/src/pages/Orcamento.js`: de 1.762 para 1.233 linhas. As partes foram para `pages/orcamento/`:
    - `apoio.js`: rascunho, formulário vazio e origem da proposta;
    - `estilos.js` e `Dicas.js`;
    - `AvisoOrigem.js`, `DadosGerais.js`, `LinhaItem.js` e `BarraTotais.js`.
  - `frontend/src/pages/NotasFiscais.js`: de 1.473 para 327 linhas. As partes foram para `pages/notasFiscais/`: `comum.js` e um arquivo por modal.
  - `backend/src/utils/pdfVetorial.js`: de 966 para 185 linhas.
    - Ficaram aqui a entrada, os limites e o resumo da folha. Os `require('./pdfVetorial')` e o worker não mudam.
    - Os passos foram para `utils/pdfVetorial/`: `pagina.js`, `simbolos.js`, `legenda.js`, `tabelaLegenda.js`, `escala.js`, `analise.js` e `tempo.js`.
- **Ficou fora de propósito:**
  - `visualizador3d/app.js` e `modelo3d.js`, porque a fase 2 está editando esses arquivos;
  - as cópias de escape do visualizador 3D, que são bundles do navegador;
  - o `semAcento` de `cad/disciplinasCad.js` e o `normalizar` de `cad/planta.js`, que vão junto com o motor de CAD;
  - os `arred` das skills, que tratam nulo de jeitos diferentes;
  - o `moeda` de `pesquisaMercado.js` e de `revisaoPreEnvio.js`, que usam espaço comum em vez do espaço que não quebra do `toLocaleString` (trocar mudaria o texto);
  - o `xml` de `planilhaCronograma.js`, que escapa o apóstrofo com `&apos;`.

**Plano: motor de CAD/PDF como pacote próprio** (avaliado, nada foi movido: há trabalho não comitado das fases 1, 2 e 3 nesses arquivos):
- **Hoje o motor está em dois lugares:**
  - DWG/DXF, 3D e símbolos em `skills/_comum/cad`. As dependências (`dxf`, `@tarikjabiri/dxf`, `@mlightcad/libredwg-web`, `three` e `esbuild`) ficam em `skills/package.json`.
  - A leitura de PDF no backend, com `pdfjs-dist` no `backend/package.json`:
    - em `utils/`: `pdfVetorial*`, `desenhoPdf`, `escalaDaPlanta`, `classificarPranchaPdf`, `pontosPorAmbiente` e `compatibilidadeEspacial`;
    - em `services/`: `pdfParaDxf`, `analiseCad`, `mapaCad` e `tarefasCad`.
  - O placar e as fixtures da fase 3 estão em `backend/scripts/placar-precisao.js`, `utils/placarPrecisao.js` e na pasta externa `HM_PLACAR_PASTA`.
- **Destino:** `skills/_comum/cad` vira o pacote `cad`, com subpastas `dxf/`, `pdf/`, `3d/` e `placar/`. Fica pelo mesmo motivo do pacote comum: as skills e o modelo 3D já usam o motor de lá. O backend chega a ele por `config/caminhos.js` (`CAD`).
- **Passos, um commit cada e com o placar rodando antes e depois:**
  1. Mover `utils/pdfVetorial/` e `pdfVetorialWorker.js` para `cad/pdf/`, que agora são módulos pequenos. `utils/pdfVetorial.js` fica como ponte de uma linha.
     - O `pdfjs-dist` passa para `skills/package.json` com a mesma versão exata. O `backend/package.json` mantém a dele até a ponte sair, para não mudar o `npm install`.
     - O worker continua no backend (`executarNoWorker`), recebendo só o caminho do módulo.
  2. Mover `desenhoPdf`, `escalaDaPlanta` e `classificarPranchaPdf`, que não dependem do banco, para `cad/pdf/`.
  3. Mover o núcleo de `placarPrecisao.js` para `cad/placar/`. O script `placar-precisao.js` do backend fica como interface de linha de comando.
  4. Separar em `cad/3d/` o que é 3D (`modelo3d`, `visualizador3d` e `modelosPorPlanta`), só depois de a fase 2 comitar. Ao mesmo tempo, quebrar `visualizador3d/app.js` e `modelo3d.js`. O hash do gerador (`services/modelo3d`) passa a olhar `cad/3d` e `cad/dxf`.
  5. Escrever um `cad/README` curto com a entrada de cada parte: `lerPdfVetorial`, leitura de DXF/DWG, `gerar-3d` e o placar.
- **Risco principal:** o hash do gerador do 3D muda, e todo 3D guardado é refeito uma vez na próxima abertura. É esperado, mas é bom avisar o Márcio.

---

## 4. Ordem sugerida e tamanho

| Ordem | Fase | Tamanho | Precisa de decisão do Márcio? |
|---|---|---|---|
| 0 | Fundação (achados da auditoria) | em andamento | Retenção de backups; leitura de e-mail só para admin? (BK-01/02) |
| 1 | Modelo único da instalação | 1–2 semanas | Não |
| 2 | 3D interativo (primeira entrega: quadro + iluminação + tomadas + interruptores) | 2–3 semanas | Estado só no navegador ou cenários salvos? |
| 3 | Precisão PDF/DWG (escala, biblioteca, placar; IFC depois) | contínuo, 1–2 semanas por bloco | Quais projetos entram no placar |
| 4 | Climatização (etapa 1: carga e seleção; 2: chiller/VAV/dutos; 3: PMOC) | 3–5 semanas | Escopo inicial: projeto, PMOC ou os dois |
| 5 | Iluminação no 3D | 1–2 semanas (depois da 1 e da 2) | Não |
| 6 | Canal remoto (segurança antes; depois Telegram/WhatsApp; voz por último) | 2–4 semanas | Canal, domínio público, quem pode usar |
| 7 | Estrutura | aos poucos | Não |

Os tamanhos são estimativas de trabalho no v2. Não incluem o tempo de conferência do Márcio.

---

## 5. Primeiro passo proposto
Fase 1, passo 1 e 3: identificador de circuito comum e o 3D gravando circuito e comando por ponto, com teste sem navegador. É pequeno, não muda nada que o usuário vê e destrava as fases 2 e 5.

---

## 6. Auditoria de 02/11/2026: resumo

**Escopo:** 8 áreas (backend e segurança, banco e testes, leitura PDF/DWG, 3D, skills, frontend, integração e assistente, lixo e operação), 15 agentes e um verificador cético por área.

**Resultado:** 73 achados confirmados (5 altos, 19 médios, 49 baixos), 1 refutado (SK-03: limite já documentado) e nenhuma falha crítica de segurança.

**Testes rodados na auditoria:**

| Suíte | Resultado |
|---|---|
| Backend `npm test` | 62/62 em 149 s |
| Skills `testar-todas` | tudo verde, cerca de 1.400 verificações |
| Frontend Jest | 113/113 (fora de qualquer script, OP-04) |
| CAD | 26 + 16 + cerca de 90 casos no backend |
| 3D | 24 casos, modelo3d 12, quadros 207 |
| Cruzamento frontend × rotas | 237 chamadas, nenhuma quebrada |

**Altos:**
- **INT-01:** o assistente não conseguia gerar orçamento a partir de itens. A rota `padroes-orcamento` estava fora do escopo.
- **CAD-01:** MTEXT sublinhado: o título da legenda não era lido e a amostra contava como ponto.
- **CAD-02:** "a 2,20 m do piso" virava altura 0 / piso.
- **CAD-03:** contagem dupla no mapa do CAD: 9 símbolos viravam 12 pontos.
- **CAD-04:** o DWG convertido perdia todos os atributos dos blocos (ALTURA, DESCR, TAG).

**Médios que pesam na operação:**
- **INT-06/OP-01, OP-02:** o MCP, o Cypress e o proxy do v2 apontavam para a produção.
- **FE-03/OP-04:** os testes do frontend fora do pré-deploy.
- **3D-01:** pontos do DWG sem ambiente no 3D.
- **3D-05:** cache do 3D que não acompanha o aprendizado.
- **INT-03:** e-mail pelo assistente sem a conferência de envio.
- **INT-04:** Pix ligado à nota não chega à obra. *(corrigido)*
- **FE-01:** vencimentos com 6 disciplinas fixas.
- **SK-01:** luminárias somem em sala em L.

A lista completa, com evidência e correção de cada achado, está em `docs/historico/AUDITORIA-2026-11-02.md`. A situação de cada correção está no commit da fase 0.
