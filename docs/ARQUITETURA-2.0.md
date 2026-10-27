# Versão 2.0 — arquitetura e fases

Pedido do usuário (25/10/2026): reformular o sistema numa versão 2.0, na ordem
sugerida pela análise de fusões e pela comparação com sistemas de mercado.
**Fora da 2.0:** emissão de nota fiscal (já existe sistema próprio) e cobranças
(boleto, Pix Cobrança, conciliação bancária). Portal do cliente e BIM/IFC ficam
para depois.

## Como a 2.0 é desenvolvida

- Cópia de trabalho separada `C:\HM-Engenharia\hm-eng-v2` (ramo `versao-2.0`);
  a produção continua rodando da pasta principal até a 2.0 ser aprovada.
- Banco de teste `hm_orcamentos_v2` (cópia do dump de 25/10/2026), porta 3002,
  `ROTINAS_AUTOMATICAS=desligadas`, sem credenciais de e-mail, pasta de arquivos
  `C:\HM-Engenharia\Arquivos do Sistema - teste v2`.
- Migrações por tema em `backend/src/models/migracoes/` e rotas por tema em
  `backend/src/routes/v2/` (ver os LEIA-ME de cada pasta).

## Fase 1 — arrumação (sem mudar dados de cliente)

- **Menu em 6 grupos** com abas internas: Painel · Obras · Propostas · Base de
  preços · Financeiro · Cadastros e administração. Rotas antigas redirecionam.
- **Base única de serviços:** `mao_de_obra_itens` (itens livres das propostas) e
  `precos_mao_de_obra_referencia` (192 códigos padrão com referência oficial e
  particular) viram uma só lista; a tela Orçamento sugere o preço do segmento do
  cliente.
- **Módulo único de IA** (`utils/ia.js`, ordem Claude Max → API → Gemini) e
  **painel de Integrações** com as três rotinas automáticas existentes.

## Fase 2 — a entidade Obra e o editor único de orçamento

### Modelo

```
obras
  id, codigo (OB-AAAA-NNN), nome, cliente_id → clientes, cliente_nome (cópia),
  local, segmento ('publico' | 'privado' — padrão: tipo do cliente),
  status ('prospeccao' | 'orcamento' | 'contratada' | 'execucao' | 'concluida' | 'cancelada'),
  inicio_previsto, fim_previsto, responsavel_id → usuarios, pasta, observacoes,
  criado_em, atualizado_em, versao
```

`obra_id` (nulo permitido, `ON DELETE SET NULL`) em `propostas`,
`analises_projeto`, `laudos_projetos`, `contratos` e `financeiro_movimentos`.

### Migração dos dados existentes (idempotente, sem apagar nada)

1. Cada análise de projeto sem obra vira uma obra (nome = `nome_projeto` ou
   cliente + data), com a proposta ligada (`analises_projeto.proposta_id`).
2. Cada laudo sem obra entra na obra da mesma análise quando veio de "Calcular
   pela norma"; senão vira uma obra (nome = título); as propostas em
   `laudos_projetos.propostas` vão junto.
3. Propostas soltas: obra pelo `local_obra` + cliente (normalizados); sem local,
   uma obra por proposta.
4. Contratos: obra cujo nome/local bate com `contratos.local_obra` (normalizado);
   senão ficam sem obra. Movimentos do financeiro ficam sem obra (o usuário liga
   na tela).
5. Cliente por nome → `cliente_id` onde ainda for nulo (laudos guardavam só o nome).

### Tela "Obras" (hub do grupo Obras)

Lista com filtros (status, cliente, segmento) e, por obra, abas: **Resumo**
(orçado × realizado: total aprovado das propostas × despesas e pagamentos
ligados — margem), **Projeto** (análises do PDF), **Disciplinas** (laudos e
projetos), **Propostas**, **Execução** (contratos, prestadores e, na Fase 3,
cronograma e medições), **Financeiro** (movimentos ligados) e **Arquivos**
(pasta). Itens novos já nascem ligados à obra aberta. (Versão 2.1: as abas
Projeto e Disciplinas viraram **Análises**, **Projetos** e **Laudos** — ver o
fim deste documento.)

Pastas: itens novos vão para `Arquivos do Sistema\Obras\<nome da obra>\`
(Projeto, Laudos\<disciplina>, Propostas, Contratos). As pastas antigas não são
movidas pela migração (risco em arquivos de produção); a obra aponta para elas.

### Editor único de orçamento

A Análise de Projeto e os laudos **geram o rascunho** da proposta e abrem o
editor da tela Propostas; a revisão de quantidades, preços, pesquisa de mercado
por item e referências (oficial/particular) passa a acontecer só ali. A Análise
fica com o que foi extraído do PDF (leitura) e o botão "Gerar orçamento".

## Fase 3 — recursos de mercado

- **Curva ABC** da proposta (itens por valor, % acumulado, classes A/B/C) — na
  tela, no PDF (anexo opcional) e na planilha Excel do cliente.
- **Cronograma físico-financeiro** por etapa e período, com **medições** do
  realizado × previsto, na aba Execução da obra; planilha do cliente usa o
  cronograma.
- **BDI pela fórmula do TCU** (Acórdão 2.622/2013): BDI = [(1+AC+S+R+G)(1+DF)(1+L)/(1−I)] − 1,
  regime desonerado/não desonerado, faixas de referência por tipo de obra e
  aviso fora da faixa; usado na proposta.
- **Composições e kits** na base de preços (ex.: ponto de tomada = caixa +
  eletroduto + cabo + mão de obra) inseridos no orçamento de uma vez.
- **Aprovação da proposta por link** (token aleatório com validade; o cliente vê
  a proposta, aprova ou recusa com nome e documento; registro de data/hora/IP;
  aceite eletrônico simples, não ICP-Brasil).

### Como ficou (implementado)

| Recurso | Migração | Backend | Frontend |
|---|---|---|---|
| Curva ABC e BDI TCU | 2.0-06 (`bdi_memoria` JSONB, `bdi_materiais`) | `utils/curvaAbc.js`, `utils/bdiTcu.js`, `calculoProposta.js` (BDI diferenciado opcional), anexos no `pdfTemplate.js` (`?curva_abc=1&composicao_bdi=1`), aba "Curva ABC" na planilha | `CalculadoraBdi`, `CurvaAbcPainel` no editor; `utils/curvaAbc.js` e `utils/bdiTcu.js` são cópias do núcleo do backend (o teste confere que são iguais) |
| Cronograma e medições | 2.0-07 (`obra_cronogramas`, `obra_etapas`, `obra_etapa_periodos`, `obra_medicoes`) | `utils/cronograma.js`, `utils/duracaoCronograma.js` (regra de duração compartilhada com a planilha do cliente), `planilhaCronograma.js` (Gantt + curva S nativa do Excel), boletim de medição em PDF, `routes/v2/cronograma.js` | `pages/obras/CronogramaObra.js`, `CurvaS.js` na aba Execução |
| Composições e kits | 2.0-08 (`composicoes`, `composicao_itens`; kits-modelo uma vez só, marca `composicoes_kits_modelo`) | `utils/composicoes.js` (custo por segmento com `valorSugerido`; sem preço = "a cotar"), `routes/v2/composicoes.js` (`/composicoes/explodir`) | aba "Composições e kits" na Base de preços; `InserirComposicao` no editor |
| Aprovação por link | 2.0-09 (`proposta_links_aprovacao` com hash sha-256 do token, `proposta_decisoes_aprovacao` com hash do conteúdo aprovado) | `utils/aprovacaoLink.js`, `routes/v2/aprovacao.js`; públicas em `/api/publico/aprovacao/:token` com limite de taxa e 404 igual para token inválido/expirado/revogado; o status muda por `aplicarStatusProposta` (o mesmo da tela) | página pública `/aprovacao/:token` (fora do login); `BotaoLinkAprovacao` no editor |

Para o cliente abrir o link de fora da rede, o sistema precisa estar publicado
na internet e `URL_PUBLICA` definida no `.env`.

Ajustes antes da produção (26/10/2026):

- **Rolo/caixa → metro nos kits:** material do catálogo em RL/CX com a
  metragem escrita na descrição ("100MT", "CX 305M", "caixa com 305 metros")
  vale para item do kit em metro (preço ÷ metragem, "convertido de RL 100 m");
  sem metragem clara continua "a cotar". Calcular/explodir nunca liga item
  sozinho. Migração 2.0-11 (uma vez, marca `composicoes_kits_metragem`) liga
  os cabos/eletrodutos "sem catálogo" dos kits-modelo nunca editados
  (`versao = 0`) quando o casamento acha rolo/caixa com metragem; o seed 2.0-08
  já casa assim numa instalação nova. Na tela do kit, item ligado a rolo/caixa
  com metragem pode ser contado em "m" (a unidade continua em m ao salvar).
- **Lista de propostas:** selo "Cliente aprovou/recusou" (`decisao_cliente`
  da listagem e do relatório por período, uma consulta só) e ícone do link de
  aprovação nas propostas Ativas.
- **Downloads:** `utils/nomeArquivoDownload.js` monta o `Content-Disposition`
  com `filename` ASCII + `filename*` UTF-8 (RFC 5987) em todas as rotas.
- **App de campo:** `GET /obras?pode_abrir_os=1` (ver `docs/CAMPO-API.md`).

Itens marcados `[CONFERIR]` no `bdiTcu.js`: ISS padrão de 2 % (depende do
município), cronograma da CPRB pela Lei 14.973/2024 e a comparação da faixa do
TCU no regime desonerado (feita sem a CPRB).

## Fase 4 — campo

- **App de campo (PWA)**: ordens de serviço por obra, checklist (o mesmo dos
  laudos/inspeções), fotos, assinatura do cliente, funcionamento offline com
  sincronização; relatório PDF da OS.

### Como ficou (implementado)

- **Backend:** migração 2.0-10 (`ordens_servico`, `os_fotos`, `campo_operacoes`),
  regras puras em `utils/campo.js`, `controllers/campoController.js`,
  `routes/v2/campo.js`, PDF em `utils/osPdfTemplate.js`. Fotos e assinatura na
  pasta da obra, em `Campo/<numero da OS>/`. Contrato completo em
  `docs/CAMPO-API.md`.
- **Escritório:** aba "Campo (OS)" na página da obra
  (`pages/obras/OrdensServicoObra.js`) e cartão "OS abertas" no Resumo.
- **App:** `/campo/*` fora do Layout e carregado à parte
  (`frontend/src/pages/campo/`); IndexedDB por usuário, fila de operações com
  `op_uuid`, fotos reduzidas no aparelho (até 1600 px), service worker
  `public/sw-campo.js` com escopo `/campo/` e manifesto `manifest-campo.json`.
  O escritório não tem service worker.
- **HTTP × HTTPS:** em HTTP o app funciona com rede e guarda os dados offline,
  mas precisa estar aberto antes de a rede cair; com HTTPS configurado ele abre
  também sem rede.

## Versão 2.1 — análise ≠ laudo (27/10/2026)

Pedido do usuário: "nem sempre uma análise de projetos vai ter que gerar um
laudo, laudos serão pedidos quando necessário e não toda vez que se analisa um
projeto". Até aqui o "Calcular pela norma" da análise criava um registro
"laudo/projeto" que misturava os documentos de projeto e os de laudo.

### Modelo

```
analises_projeto.finalidade   'orcamento' | 'elaboracao'   (NOT NULL, padrão 'orcamento')
laudos_projetos.tipo          'projeto' | 'laudo'          (NOT NULL, padrão 'laudo')
laudos_projetos.entregas      JSONB  { itens[], as_built: { data, revisao } | null, gerado_em }
laudos_projetos.pasta_raiz    'laudos' | 'projetos'        (onde a pasta nasceu; nulo = ainda sem pasta)
```

Migração `2.0-13-finalidade-projeto-laudo.js` (idempotente, só onde a coluna
nova é nula): análises existentes → `orcamento`; registros existentes pela
regra de `utils/projetoLaudo.js → classificarExistente`, nesta ordem —
(1) dado de inspeção preenchido (checklist com C/NC/NA, qualquer tabela de
`dados.inspecao` com linha — NCs, ensaios, medições, fotos, documentos,
instrumentos —, nº ou data da inspeção, foto enviada) → `laudo`;
(2) nasceu de análise (`analise_id`) → `projeto`; (3) só orçamento(s) de
execução ligado(s) → `projeto`; (4) o resto → `laudo`. Pastas que já existem
ficam `pasta_raiz = 'laudos'` (nada é movido).

### Fluxo

- **Análise de projeto** (aba "Análise de projeto"): a finalidade é escolhida
  ao enviar (obrigatória na tela; a API e o MCP assumem `orcamento`) e pode ser
  trocada depois. *Orçamento*: itens do PDF, estimativa e "Gerar orçamento e
  abrir no editor"; "Dimensionar pela norma (projeto)" é opção secundária.
  *Elaboração de projeto*: "Elaborar projeto por disciplina" em destaque, itens
  do PDF recolhidos como referência, sem "Gerar orçamento". As duas chamam
  `POST /laudos/de-analise`, que cria um **projeto** (nunca laudo) e devolve o
  existente quando a análise já tem o projeto daquela disciplina.
- **Projetos por disciplina** (aba nova): documentos de projeto, desenhos
  (planta DXF, unifilar QElectroTech), entregas e orçamento de execução. O
  formulário esconde as seções só de inspeção (todas com campos em
  `inspecao.*`; no SPDA, as seções 6 a 12) — os dados continuam salvos.
- **Laudos**: documentos de laudo, fotos, checklist, medições e orçamento de
  inspeção/correção. Nasce só de "Novo laudo" (aba Laudos ou página da obra).
- A API recusa com 400 o que é do outro tipo: documento
  (`GET /laudos/:id/documento/:tipo`), planta/unifilar, entrega e modo de
  orçamento (proposta já ligada num modo antes da 2.1 continua atualizável).

### Classificação dos documentos (um lugar só)

`skills/_comum/tipos-documento.js` diz o uso de cada tipo de documento das
skills, dos desenhos da base de CAD e dos modos de orçamento:

| Tipo | Uso | Onde aparece |
|---|---|---|
| `memorial` | projeto | as 17 skills |
| `planilha` | projeto | 16 skills (todas menos SPDA) |
| `materiais` | projeto | SPDA (planilha de materiais e risco) |
| `risco` | **ambos** | SPDA (análise de risco NBR 5419-2: exigida no projeto e no laudo) |
| `laudo` | laudo | 15 skills (laudo / relatório de inspeção, vistoria, certificação, comissionamento, teste) |
| `relatorio` | laudo | iluminação e antena (relatório de medição / comissionamento) |
| `checklist` | laudo | 13 skills |
| `medicoes` | laudo | SPDA (planilha de medições) |
| `planta` (DXF), `unifilar` (QET) | projeto | base de CAD |
| modos `execucao`, `automacao` | projeto | orçamento de execução (pressurização: automação/adequação do painel) |
| modos `inspecao`, `vistoria`, `certificacao`, `diagnostico` | laudo | orçamento de inspeção com a correção das NCs |

O backend anota a lista de `GET /laudos/disciplinas` com `uso` e `desenhos`; a
tela mostra só o que serve ao registro aberto. O teste
`skills/_comum/teste-tipos-documento.js` varre todas as pastas de skill e falha
se aparecer documento ou modo sem classificação (e se uma skill ficar sem
documento ou orçamento de um dos tipos).

### Entregas do projeto

`POST /laudos/:id/entrega?destino=zip|pasta` (corpo `{ itens, as_built }`),
catálogo em `GET /laudos/entregas` (`utils/projetoLaudo.js → ENTREGAS`):

- **Definições técnicas**: os documentos de projeto da skill (memorial Word e
  planilhas Excel; `risco` do SPDA também entra).
- **As-built**: a mesma documentação marcada AS BUILT (`skills/_comum/entrega.js`):
  faixa no início do corpo e nos cabeçalhos do Word; cabeçalho de impressão e
  aba "AS BUILT" no Excel (células e fórmulas intactas); título, revisão e data
  nas folhas do QElectroTech; título, fase "AS BUILT (conforme executado)",
  revisão e descrição da revisão no carimbo da planta DXF. Revisão e data do
  as-built entram também na identificação dos documentos. O conteúdo reflete o
  executado quando o formulário foi atualizado com o que foi feito na obra.
- **DXF (abre no AutoCAD; DWG não é gerado)**: o `@mlightcad/libredwg-web`
  instalado foi compilado com `disable-write` — só lê DWG (exporta só
  `dwg_write_dxf`, que é DWG → DXF). Precisa da arquitetura enviada.
- **QElectroTech (.qet)**: elétrica predial, industrial e média tensão.
- **PDF**: folha de entrega (HTML → PDF pelo puppeteer, `utils/folhaEntregaTemplate.js`,
  com `escapeHtml`) com a identificação, a lista dos arquivos e o resumo
  técnico do cálculo (sem os indicadores da inspeção). Não há conversor de
  Word para PDF no projeto: o memorial em PDF sai pelo Word (Arquivo › Salvar
  como › PDF).

Os arquivos vão para `<pasta do projeto>\Entrega\` com nome fixo (os do
as-built com o prefixo "AS BUILT - "), sobrescritos a cada geração; o ZIP é
montado com `jszip` (dependência declarada em `skills/package.json`).

### Pastas

Projeto novo: `Obras\<obra>\Projetos\<disciplina>` (sem obra:
`Projetos\<nome>`, ao lado das análises; nome repetido ganha " (P12)") com
"Dados do projeto.json". Laudo: `Obras\<obra>\Laudos\<disciplina>` (sem obra:
`Laudos\<nome>`) com "Dados do laudo.json". `pasta_raiz` é gravada antes de
criar a pasta, e a checagem de nome repetido considera a raiz.

### Telas e rotas

- Hub Obras: `?aba=obras|analise|projetos|laudos`. `?aba=laudos&laudo=ID` de um
  projeto (links antigos, `/analise-projeto?aba=laudos&laudo=ID`, origem de
  propostas antigas) é levado para `?aba=projetos&laudo=ID`.
- Página da obra: `?secao=analises|projetos|laudos` (as chaves antigas
  `projeto` e `disciplinas` abrem Análises e Projetos).
- Editor de proposta: a origem mostra "projeto #N" ou "laudo #N" e volta para a aba certa.
