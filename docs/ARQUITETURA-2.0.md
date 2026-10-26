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
(pasta). Itens novos já nascem ligados à obra aberta.

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
