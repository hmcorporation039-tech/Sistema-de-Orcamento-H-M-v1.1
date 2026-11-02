# Plano das próximas melhorias (02/11/2026)

Ordem pensada para entregar valor cedo, mexer pouco em produção por vez e deixar
as decisões do Márcio para o momento em que elas realmente travam algo.
Regra de sempre: cada item nasce no v2 (porta 3002), tem teste em `backend/testes`,
migração idempotente (CLAUDE.md), backup antes de ir para a produção e só vai com o OK do Márcio.

| # | Melhoria | Esforço | Precisa de decisão? | Depende de |
|---|----------|---------|---------------------|------------|
| 1 | Cache das chamadas à IA | **feito no v2 (02/11)**; falta levar à produção | Não | — |
| 2 | Layout de fornecedor aprendido (adiado: a IA quase não é usada aqui; contador instalado em 02/11) | 1 dia | Não | uso real de IA nas cotações |
| 3 | Tela de confirmação do mapa do CAD | 2–3 dias | Não (só o visual) | — |
| 4 | BDI e impostos ajustáveis (decidido 02/11) — **feito no v2 (02/11)** | 0,5 dia | Não: sem valor fixo (reforma tributária) | — |
| 5 | Histórico de preços vendidos — **feito no v2 (02/11)** | 1 dia | Não | — |
| 6 | Tabela SINAPI local (DF) | **feito no v2 (02/11)**; falta tela | Regime (com/sem desoneração) | importar a planilha todo mês |
| 9 | Atestado de capacidade técnica (corpo do texto) | 1–2 dias | Não | nota fiscal emitida |
| 7 | Classificador local de materiais | 2 dias | Não | ~500 itens confirmados (item 5 ajuda) |
| 8 | Aprendizado de notas do DWG | 2 dias | Não | tela do item 3 (para corrigir) |

---

## 1. Cache das chamadas à IA  (feito no v2 em 02/11/2026)
**Feito:** migração `2.0-26-ia-cache.js` (`ia_cache`, `ia_cache_uso`), `services/iaCache.js` (`comCache`, contador, `situacao`), extração de equipamentos com cache de 90 dias (`equipamentoExtratorIA.js`), pesquisa de mercado com validade de 7 dias (era 48 h) e `fresco` (`?fresco=1` ou `fresco: true` no corpo; também na mão de obra), card de IA em Integrações mostrando as chamadas evitadas, `testes/iaCache.test.js`. A pesquisa de preço continua guardada em `pesquisas_mercado` (que também é o histórico) e só entra no contador; a tela já mostrava "reaproveitada do histórico, feita em…".
Tela: o bloco de pesquisa do orçamento mostra "(há N dias)" e o botão "Pesquisar de novo" quando a pesquisa veio do histórico; em Materiais, o 2º clique sobre uma pesquisa reaproveitada consulta a web de novo.
**Falta:** levar à produção (migração + reinício do backend) com o OK do Márcio. No v2 (3002), reiniciar com `C:\HM-Engenharia\hm-eng-v2\reiniciar-backend.bat` (administrador) para o backend carregar o código novo.

(Plano original, mantido como registro:)
**Problema:** `equipamentoExtratorIA.js` e `pesquisaMercado.js` refazem a mesma consulta
em projetos parecidos: custo e tempo à toa.
**Como:**
- Tabela `ia_cache` (`chave` = hash de função + modelo + entrada normalizada, `resultado` jsonb, `criado_em`, `expira_em`, `acertos`).
- Helper único `services/iaCache.js` com `comCache(nome, entrada, ttlDias, () => chamada())`; entra só nos dois serviços acima.
- Validade: pesquisa de preço 7 dias (preço muda), extração de equipamento 90 dias.
- Não grava no cache resposta com erro ou vazia.
- Botão "ignorar cache" (parâmetro `?fresco=1`) para o engenheiro forçar nova pesquisa.
**Teste:** mesma entrada duas vezes = 1 chamada; entrada diferente = 2; expirado = nova chamada; erro não cacheia.
**Risco:** preço velho aparecer como novo → mostrar "pesquisado há N dias" na tela.
**Pronto quando:** painel Integrações mostra "acertos de cache" e a economia de chamadas.

## 2. Layout de fornecedor aprendido  (revisado em 02/11/2026 — ver "Achado")
**Achado ao começar:** a premissa abaixo não se confirma no código nem nos dados. A leitura já é local primeiro (layouts conhecidos → leitor universal → OCR) e a IA é o último recurso, só quando nada fecha (quantidade × unitário = total e soma batendo com o total do documento). Nos 30 arquivos de fornecedor já registrados no banco do v2, **nenhum usou IA**: 12 saíram por layout conhecido (ADM, ECO, Pedido de venda) e 18 ficaram com 0 itens, lidos pela versão 1 do leitor (a versão atual os relê na próxima varredura; os arquivos não estão mais nas pastas, então não deu para medir). O leitor universal já lê layout novo sem precisar de "aprendizado".
**Feito no lugar:** a leitura de cotação passou a entrar no contador de Integrações (`leitura_cotacao`: lida só com leitores locais = chamada evitada; foi para a IA = chamada). Com alguns meses de uso, o contador mostra se existe IA a economizar aqui.
**Decisão:** só construir o aprendizado de layout se o contador mostrar IA frequente nas cotações. Até lá, o esforço rende mais nos itens 4, 3 e 5.
**Problema (texto original):** `leitorCotacaoIA.js` lê qualquer layout, mas chama a IA a cada cotação, mesmo do mesmo fornecedor.
**Como:**
- Tabela `fornecedor_layouts` (`fornecedor_id`, `assinatura` do cabeçalho, `mapa_colunas` jsonb, `usos`, `ultima_vez`).
- Depois de uma leitura bem-sucedida (confirmada pelo usuário), grava o mapeamento de colunas.
- Na próxima cotação, se a assinatura do cabeçalho bate, usa o mapa direto (`leitorCotacao.js`, sem IA); se não bate ou der confiança baixa, cai na IA como hoje.
**Teste:** layout conhecido não chama IA; layout novo chama e grava; coluna renomeada cai na IA.
**Risco:** mapa errado ficar "gravado" → só grava após confirmação, e tem botão "esquecer layout".

## 3. Tela de confirmação do mapa do CAD
**Problema:** o mapa de layers e pontos lidos do DWG vai direto para o 3D e para o orçamento, sem o engenheiro ver.
**Como:**
- Rota `GET/PUT /projetos/analises/:id/mapa` (com `posseAnalise`), devolve as layers, a disciplina e o tipo de ponto de cada uma, a quantidade e a altura lida.
- Tela em `AnaliseProjeto.js`: tabela por layer (disciplina, tipo, qtd, altura, "veio da legenda / aprendido / regra"), edição do tipo e da altura, e planta com os pontos destacados.
- Cada correção alimenta `cad_simbolos_aprendidos` (já existe), então o erro corrigido uma vez não se repete.
- Gerar 3D / orçamento passa a usar o mapa confirmado, com aviso se houver layers não revisadas.
**Teste:** correção muda a quantidade no orçamento; correção vira aprendizado; análise antiga sem mapa continua funcionando.
**Risco:** é a maior entrega; fatiar em (a) só leitura, (b) edição, (c) planta visual.

## 4. BDI e impostos ajustáveis  (feito no v2 em 02/11/2026)
**Problema:** o frontend sugere BDI 20 % e imposto 6 %; análise, skills e MCP sugerem 0 %.
**Decisão do Márcio:** não fixar valor: as novas alíquotas da reforma tributária ainda não existem, então BDI e impostos ficam **ajustáveis** pelo administrador.
**Como:** chaves em `configuracoes` (`bdi_padrao`, `imposto_servico_padrao`, `imposto_venda_padrao`), por tipo de cliente (privado × licitação) se ele quiser; tela de ajuste em Integrações/Admin; lidas pelo frontend (`Orcamento.js`), pela análise e pelo MCP, que hoje têm cada um o seu número. Sem valor configurado, a análise/MCP não inventam: pedem o valor. Proposta já salva nunca muda (o valor fica gravado nela).
**Teste:** `regressaoTotais.test.js` nos três caminhos; trocar a configuração muda só as propostas novas.
**Feito:** `services/padroesOrcamento.js` (chaves `bdi_padrao`, `imposto_venda_padrao`, `imposto_servico_padrao`, sem valor de fábrica; vazio = não definido), rotas `GET/PUT /api/configuracoes/padroes-orcamento` (PUT só admin, com auditoria), cartão "BDI e impostos padrão" em Integrações. Proposta nova pela tela, pelo orçamento da análise/laudo, pelo assistente e pelo MCP nasce com o padrão; sem valor definido o campo fica 0 e a tela/assistente/MCP avisam (nunca inventam). Proposta já salva não muda. Teste: `padroesOrcamento.test.js`. **Não feito:** padrão por tipo de cliente (privado × licitação) — só se o Márcio quiser.

(A parte de impostos por regime e a reforma tributária voltam aqui quando as alíquotas saírem: basta o admin atualizar.)

## 5. Histórico de preços vendidos  (feito no v2 em 02/11/2026)
**Feito:** em vez da tabela espelho `material_precos_vendidos`, a faixa é calculada na hora de `propostas` × `proposta_itens` (`services/precosVendidos.js`): só proposta **Aprovada**, item **confirmado** e com preço. Assim cancelada, recusada, ativa ou apagada nunca entra, aprovação desfeita sai na hora e não há carga única nem rotina de sincronização que possa ficar para trás (sem migração). Rota `GET /api/materiais/precos-vendidos?ids=1,2,3&excluir=<proposta>` (até 500 ids; a proposta aberta não conta contra si). Tela do orçamento: abaixo do preço de cada material aparece "vendido: menor – maior · mediana · N×" (dica com o último preço, proposta e data) e dois avisos: valor da linha abaixo do menor preço já vendido, e custo de compra do catálogo acima do último preço vendido. Teste: `testes/precosVendidos.test.js`. Só aparece para item ligado ao catálogo (`material_id`); no banco do v2 ainda não há venda aprovada com material ligado (3 aprovadas, nenhuma com material), então a faixa só enche com o uso. **Não feito:** separar por tipo de cliente (privado × licitação).

(Plano original, mantido como registro:)
**Problema:** o catálogo guarda só o último preço.
**Como:**
- Tabela `material_precos_vendidos` (`material_id`, `proposta_id`, `preco_unit`, `quantidade`, `data`, `cliente_tipo`), preenchida quando a proposta é aprovada/fechada, mais carga única das propostas já existentes.
- Na tela do orçamento, ao lado do item: faixa praticada (mín – mediana – máx) e alerta quando o custo atual passou do último preço vendido.
**Teste:** carga única idempotente; mediana certa; proposta cancelada não entra.
**Feito (02/11/2026):** em vez da tabela espelho `material_precos_vendidos`, a faixa é calculada na hora de `propostas` × `proposta_itens` (`services/precosVendidos.js`): só proposta **Aprovada**, item **confirmado** e com preço. Assim cancelada, recusada, ativa ou apagada nunca entra, aprovação desfeita sai na hora e não há carga única nem rotina de sincronização que possa ficar para trás (sem migração). Rota `GET /api/materiais/precos-vendidos?ids=1,2,3&excluir=<proposta>` (até 500 ids; a proposta aberta não conta contra si). Tela do orçamento: abaixo do preço de cada material aparece "vendido: menor – maior · mediana · N×" (dica com o último preço, proposta e data) e dois avisos: valor da linha abaixo do menor preço já vendido, e custo de compra do catálogo acima do último preço vendido. Teste: `testes/precosVendidos.test.js`. Só aparece para item ligado ao catálogo (`material_id`); no banco do v2 ainda não há venda aprovada com material ligado (3 aprovadas, nenhuma com material), então a faixa só enche com o uso. **Não feito:** separar por tipo de cliente (privado × licitação).

## 6. Tabela SINAPI local (DF)  (importador e dados prontos no v2, 02/11/2026)
**Decisão do Márcio:** estado de referência = **DF**.
**Feito:** migração `2.0-25-sinapi.js` (`sinapi_insumos`, `sinapi_composicoes`, `sinapi_importacoes`, configuração `sinapi_uf`/`sinapi_regime`), serviço `services/sinapi.js` (leitura da planilha, importação por mês/UF idempotente, busca sem acento por termos soltos, queda para o mês anterior com aviso), `scripts/importar-sinapi.js`, rotas `GET /sinapi/situacao`, `GET /sinapi/buscar`, `PUT /sinapi/config` (admin) e `testes/sinapi.test.js`. Dados oficiais da Caixa, referência **09/2026** (a mais recente publicada em 02/11), já importados no banco do v2: 4.878 insumos e 10.599 composições do DF, nos dois regimes.
**Falta:**
- Escolher o regime de referência (hoje "sem desoneração"; é uma chave, troca na hora).
- Ligar à `precosMaoDeObraReferencia.js` como segunda referência e à tela de orçamento (sugestão de preço/composição).
- Tela simples em Integrações: mês importado, regime, busca.
- Rotina mensal: a Caixa publica por volta do dia 10 (a de 09/2026 saiu em 09/10); baixar o zip `SINAPI-AAAA-MM-formato-xlsx.zip` em caixa.gov.br e rodar `node scripts/importar-sinapi.js "<SINAPI_Referência_AAAA_MM.xlsx>" DF`. Dá para agendar o download.
- Levar para a produção (migração + importação lá) só com o OK do Márcio.

## 7. Classificador local de materiais
**Como:** treinar sobre os itens já confirmados (`aprendizadoMateriais.js`, `classificacaoMateriais.js`); primeiro kNN sobre termos, sem dependência nova; IA só quando a confiança for baixa.
**Medir antes de ligar:** separar 20 % dos itens, medir acerto; só substitui a IA se passar de ~90 %.
**Risco:** classificar errado em silêncio → abaixo do limite de confiança, volta para a IA.

## 8. Aprendizado de notas do DWG
**Como:** extrair da legenda e das notas (texto do desenho) padrões como "a X cm do piso", guardar por projetista/escritório em `cad_notas_aprendidas`, aplicar como sugestão (não como verdade) no mapa do item 3.
**Depende do item 3:** a correção do engenheiro é o que valida o padrão.

## 9. Atestado de capacidade técnica  (pedido do Márcio em 02/11/2026)
**Problema:** depois de emitir a nota fiscal, o cliente costuma pedir o atestado; hoje ele é escrito à mão.
**Regra:** o papel timbrado é **do cliente**. O sistema entrega só o **corpo** do atestado (texto), para o cliente colar no papel dele e assinar. Sem logo da H&M, sem cabeçalho, sem assinatura nossa.
**Como:**
- Gerar a partir da nota fiscal + proposta/obra: objeto, local, período, valor (opcional), disciplinas e quantitativos reais (pontos, metros, potência, normas aplicadas), responsável técnico e CREA/ART da H&M.
- Texto em `.docx` e em texto puro para copiar (o cliente cola no Word dele), com o nome do cliente e do signatário já preenchidos; o signatário é conferido pelo Márcio antes de enviar.
- Botão na nota fiscal ("Gerar atestado") e no e-mail de envio da nota; registro de quando foi enviado.
- Alimenta o aprendizado: os quantitativos vêm do que foi realmente executado, sem IA; redação por modelo por disciplina (as skills já têm os termos das normas).
**Teste:** corpo sem timbre nem logo; valores e datas da nota; disciplina sem quantitativo não inventa número.
**Risco:** o atestado é declaração do cliente: o sistema só propõe o texto, nunca marca como emitido.

---

## Foco geral (diretriz do Márcio, 02/11/2026)
Deixar o sistema **robusto e com alta capacidade de aprendizado**, para fazer as análises sozinho e depender cada vez menos de IA. Por isso a ordem dá prioridade ao que acumula conhecimento próprio: cache das respostas (1), layouts de fornecedor (2), mapa do CAD confirmado pelo engenheiro (3), preços vendidos (5), SINAPI local (6), classificador local (7) e notas do DWG (8). Cada item novo mede quantas vezes **evitou** uma chamada à IA (painel de Integrações), para ver a dependência cair.

## Fora desta lista (continuam pendentes)
- NFS-e: cancelamento real na Receita (`NFSE_AMBIENTE=producao`), ACL e nome do certificado .pfx, `NFSE_CERT_SENHA` — retomar quando o Márcio decidir.
- Alerta de sistema fora do ar (tarefa que consulta o `/health` e avisa por e-mail).
- Usuário de banco limitado para o v2 e `.env` do v2 trancado.
- BIOS: "AC Power Recovery: Power On" (só no PC do servidor).
