# Auditoria do sistema — 02/11/2026

8 áreas, 15 agentes, cada achado conferido por um verificador cético. Roteiro e situação das correções: docs/ROTEIRO-GRANDE-IMPLEMENTACAO.md.


## backend-seguranca

- [baixa] frontend/src/pages/Materiais.js:421
  id: BK-01
  categoria: conexao
  descricao: O botão 'Verificar orçamentos de fornecedores' aparece para qualquer usuário, mas a rota exige administrador. Quem não é admin clica e só recebe o erro 'Acesso restrito a administradores'.
  evidencia: Materiais.js:421 mostra `<button onClick={verificarFornecedores} ...>` sem `{ehAdmin && ...}`, embora a página use ehAdmin (linha 39) em outros botões. routes/index.js:132 tem `router.post('/materiais/fornecedores/verificar-agora', autenticar, admin, ...)`.
  correcao_sugerida: Mostrar o botão só com `ehAdmin`, ou liberar a rota para todos se essa for a regra desejada. Decidir junto com o achado BK-02.
  esforco: minutos
  verificado: false

- [baixa] backend/src/controllers/integracoesController.js:26
  id: BK-02
  categoria: seguranca
  descricao: Os handlers de 'verificar agora' e de executar rotina pegam o erro e devolvem `err.message` cru na resposta 500. Assim o erro não passa pelo tratarErros nem é registrado no resumo diário de erros (errosSistema), e uma mensagem interna (do banco, IMAP ou caminho) pode chegar à tela. Há também uma regra desigual: a leitura da caixa de e-mail da empresa, que altera o catálogo, é liberada a qualquer usuário, enquanto as verificações do Pix e dos fornecedores exigem admin.
  evidencia: integracoesController.js:26 `res.status(err.code === 'EMAIL_CONEXAO' ? 503 : 500).json({ erro: err.message || ... })`; o mesmo em financeiroController.js:212, materiaisController.js:203 e rotinasController.js:22. routes/index.js:161 `router.post('/integracoes/email/verificar-agora', autenticar, integCtrl.verificarAgora)` sem admin; a linha 132 (fornecedores) e a linha 194 (financeiro) usam admin.
  correcao_sugerida: Responder com err.message só quando o erro tiver status/publico ou for EMAIL_CONEXAO. Nos demais casos, chamar next(err) para cair no tratarErros, que registra e responde 'Erro interno'. Decidir se a leitura de e-mail fica com admin.
  esforco: minutos
  verificado: false

- [baixa] backend/src/routes/index.js:284
  id: BK-03
  categoria: erro
  descricao: Uma rota /api que não existe responde com a página HTML padrão do Express ('Cannot GET ...'), não com JSON. O frontend e futuros clientes (app, bot, assistente) esperam sempre JSON com o campo `erro`.
  evidencia: `curl http://localhost:3002/api/nao-existe` devolveu 404 com Content-Type text/html: `<pre>Cannot GET /api/nao-existe</pre>`. O router da /api não termina com um 404 próprio, e o fallback do SPA em server.js:115 exclui /api.
  correcao_sugerida: No fim de routes/index.js, depois do loop das rotas v2, acrescentar `router.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))`.
  esforco: minutos
  verificado: false

- [baixa] backend/src/routes/index.js:118
  id: BK-04
  categoria: seguranca
  descricao: A troca de senha (`POST /auth/senha`) não tem limite de tentativas. Quem tiver um token de sessão vazado (vale 8 h e fica no localStorage) pode testar a senha atual sem limite. Ao acertar, troca a senha, derruba as sessões do dono e fica com a conta. Isso pesa mais quando o sistema for exposto fora do escritório.
  evidencia: routes/index.js:118 `router.post('/auth/senha', autenticar, authCtrl.alterarSenha);` sem rateLimit; authController.js:98 faz `bcrypt.compare(senhaAtual, usuario.senha)` a cada pedido.
  correcao_sugerida: Criar um rateLimit com keyGenerator `usuario:${req.usuario.id}` (por exemplo, 10 erros em 15 min com skipSuccessfulRequests) e aplicá-lo depois de `autenticar` nessa rota.
  esforco: minutos
  verificado: false

- [baixa] backend/src/controllers/usuariosController.js:15
  id: BK-05
  categoria: precisao
  descricao: O e-mail do login diferencia maiúsculas de minúsculas, e o cadastro de usuário não valida nem normaliza os campos. 'Marcio@...' e 'marcio@...' contam como contas diferentes, e o login falha se a pessoa digitar com outra caixa. No cadastro, uma senha enviada como número passa pelo `senha.length < 8` (undefined) e quebra no bcrypt, e um nome com mais de 100 caracteres dá erro 22001. Nos dois casos sai um 500 genérico sem log, porque o catch só trata o erro 23505.
  evidencia: authController.js:27 `'SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [email]` sem LOWER/trim. usuariosController.js:15-37: `const { nome, email, senha, role } = req.body; ... if (senha.length < 8)` e `catch (err) { if (err.code === '23505') ...; res.status(500).json({ erro: 'Erro ao criar usuário' }); }`. schema.js:27 `email VARCHAR(100) UNIQUE NOT NULL`, único com diferença de caixa. O atualizar (lerCamposUsuario, linhas 40-62) já valida os tipos. O limiteLoginConta (routes/index.js:66) já usa o e-mail em minúsculas.
  correcao_sugerida: No criar, aplicar a mesma validação do lerCamposUsuario. Gravar o e-mail com trim e em minúsculas no criar e no atualizar. No login, usar `WHERE LOWER(email) = LOWER($1)`. Criar uma migração idempotente com índice único em LOWER(email), depois de conferir se já há duplicados. Os demais erros vão para next(err).
  esforco: horas
  verificado: false

REFUTADOS: []


## banco-testes

- [baixa] backend/src/models/schema.js:178
  id: BD-01
  categoria: desempenho
  descricao: proposta_itens.secao_id tem FK com ON DELETE CASCADE, mas nenhum índice. Todo salvamento de proposta apaga as seções e recria. Para cada seção apagada, o PostgreSQL roda 'DELETE FROM proposta_itens WHERE secao_id=$1' e varre a tabela inteira de itens (sequential scan). O custo cresce com o total de itens de todas as propostas, não só os da proposta salva. Outras 53 FKs também estão sem índice, mas ficam fora do caminho quente (por exemplo analises_projeto.proposta_id e pasta_arquivos.obra_id, que viram SET NULL ao excluir proposta ou obra).
  evidencia: Consulta ao catálogo ('FKs sem índice'): 'proposta_itens | secao_id | proposta_secoes | c'. Os únicos índices de proposta_itens são idx_proposta_itens_proposta (schema.js:542) e a PK. O DELETE das seções acontece em controllers/propostasController.js:322, controllers/laudos/orcamento.js:139 e controllers/projetos/orcamento.js:140 ('DELETE FROM proposta_secoes WHERE proposta_id = $1').
  correcao_sugerida: Nova migração idempotente 2.0-39 com 'CREATE INDEX IF NOT EXISTS idx_proposta_itens_secao ON proposta_itens(secao_id)'. Na mesma migração, criar índices nas FKs que viram SET NULL ou CASCADE ao excluir obra ou proposta: analises_projeto(proposta_id), analises_projeto(pasta_obra_id), laudos_projetos(pasta_obra_id), pasta_arquivos(obra_id), vencimentos_laudos(obra_id) e regras_movimento_obra(obra_id).
  esforco: minutos
  verificado: true

- [baixa] backend/src/models/migracoes/2.0-18-modelo-3d-orfaos.js:14
  id: BD-02
  categoria: lixo
  descricao: A migração 2.0-18 só cria os gatilhos que apagam o modelo 3D quando a origem é excluída. Ela não remove os órfãos que já existiam. No v2 ficou um modelo de 1 MB de uma análise excluída antes do gatilho existir. Esse HTML vai em todo backup. A produção, que gerou modelos antes da 2.3, pode ter o mesmo resíduo (lá não foi conferido).
  evidencia: modelos_3d tem analise 67, gerado_em 2026-10-28T14:37:05Z, length(html)=1082408. A tabela auditoria registra 'analises_projeto | 67 | excluir | 2026-10-28T14:41:05Z'. O commit da 2.0-18 (a0356f8) é de 2026-10-28 12:46 -0300, ou seja, 15:46Z, depois da exclusão. Os gatilhos existem hoje.
  correcao_sugerida: Migração idempotente com DELETE FROM modelos_3d m WHERE NOT EXISTS (origem correspondente em analises_projeto, laudos_projetos ou propostas, conforme origem_tipo). Antes, conferir a mesma consulta (só leitura) na produção.
  esforco: minutos
  verificado: false

- [baixa] backend/src/services/sinapi.js:193
  id: BD-03
  categoria: lixo
  descricao: O banco de teste tem dois índices GIN de texto completo (to_tsvector('portuguese', descricao)) nas tabelas SINAPI que não estão em nenhuma migração nem no histórico do git: foram criados à mão. Nunca são usados, porque a busca é feita com translate(...) ILIKE '%termo%', que não aproveita GIN de tsvector. É divergência entre o banco de teste e o código: a produção não terá esses índices, e eles ocupam 9,4 MB à toa.
  evidencia: pg_indexes: idx_sinapi_insumos_desc 'USING gin (to_tsvector(...descricao))' 4768 kB, idx_scan=0; idx_sinapi_comp_desc 4656 kB, idx_scan=0. Rodei 'grep -r to_tsvector|sinapi_insumos_desc' em backend/src, backend/scripts, backend/testes, docs e 'Teste 2.0': nenhum resultado. 'git log --all -S idx_sinapi_insumos_desc' também não devolve nada.
  correcao_sugerida: Apagar os dois índices no v2 (DROP INDEX IF EXISTS numa migração ou à mão), ou colocar na migração um índice que a busca realmente usa. Exemplo: pg_trgm com gin_trgm_ops sobre a expressão normalizada, se a busca SINAPI ficar lenta.
  esforco: minutos
  verificado: false

- [baixa] backend/src/models/migracoes/2.0-25-sinapi.js:48
  id: BD-04
  categoria: desempenho
  descricao: Os ALTER COLUMN ... TYPE das tabelas SINAPI rodam sem condição a cada partida do backend. Cada um pede trava exclusiva das tabelas SINAPI (21 mil e 9,7 mil linhas) dentro da transação de migração. É o mesmo padrão que o próprio schema.js já corrigiu em prestadores.documento ('o ALTER TYPE incondicional reescrevia a tabela (trava exclusiva) em TODA partida'). A 2.0-01 e a 2.0-02 fazem certo, com o DO $$ e a conferência do tamanho.
  evidencia: 2.0-25-sinapi.js:48 'ALTER TABLE sinapi_composicoes ALTER COLUMN grupo TYPE VARCHAR(200), ALTER COLUMN unidade TYPE VARCHAR(40)' e :49, idem em sinapi_insumos, ambos fora de qualquer IF. schema.js:447-448 documenta o problema e a correção para prestadores.
  correcao_sugerida: Colocar os dois ALTER num DO $$ que só altera quando character_maximum_length estiver abaixo de 200, 40 ou 120 (como na 2.0-01). Isso não muda dado nenhum.
  esforco: minutos
  verificado: false

- [baixa] backend/src/models/schema.js:730
  id: BD-05
  categoria: erro
  descricao: listarMigracoes ordena os arquivos em ordem alfabética (.sort()). Quando existir a 2.0-100, ela vai rodar entre a 2.0-10 e a 2.0-11 num banco novo. verificarMigracoes, do pre-deploy, confere repetição e buraco de numeração, mas não a ordem de execução, então não pegaria isso. Hoje há 38 migrações, então ainda não acontece.
  evidencia: schema.js:730 'fs.readdirSync(pasta).filter(f => /^\d.*\.js$/.test(f)).sort()'. Rodando node, ['2.0-38-a.js','2.0-100-b.js','2.0-11-c.js','2.0-99-d.js'].sort() devolve [ '2.0-100-b.js', '2.0-11-c.js', '2.0-38-a.js', '2.0-99-d.js' ].
  correcao_sugerida: Ordenar pelo número extraído de /^2\.0-(\d+)-/ (sort numérico) em listarMigracoes e no pre-deploy, ou adotar 3 dígitos (2.0-039) daqui para frente, com um teste em preDeploy.test.js.
  esforco: minutos
  verificado: false

- [baixa] backend/testes/assistenteIntegracao.test.js:118
  id: BD-06
  categoria: teste
  descricao: Nenhum teste roda as migrações num banco VAZIO, que é o caso de uma instalação nova ou de um servidor reconstruído. criarTabelas só é testado sobre o banco v2 já migrado (rodar 2 vezes). O teste de restauração restaura um dump, não as migrações. Uma migração que dependa de tabela criada por outra mais à frente, ou o problema do BD-05, só apareceria num desastre.
  evidencia: assistenteIntegracao.test.js:118-119 'await criarTabelas(); await criarTabelas(); // migração idempotente'. revisaoBackend.test.js:306 usa um cliente falso. scripts/testar-restauracao.js restaura um dump em hm_teste_restauracao. Não há outro uso de criarTabelas nos testes.
  correcao_sugerida: Teste opcional (só com DB_NAME=hm_orcamentos_v2) que cria um banco temporário (CREATE DATABASE hm_teste_migracoes), roda criarTabelas duas vezes, confere a lista de tabelas e colunas contra o v2 e apaga o banco. Isso também detectaria divergências como a do BD-03.
  esforco: horas
  verificado: false

- [baixa] backend/testes/notasFiscais.test.js:undefined
  id: BD-07
  categoria: teste
  descricao: A suíte apaga o que cria, mas deixa linhas em auditoria apontando para entidades que não existem mais: 39 linhas numa única rodada do npm test. A tabela de teste cresce a cada rodada e polui a trilha de auditoria do v2. O arquivo exato de cada ação não foi isolado; notas_fiscais vem dos testes de notas.
  evidencia: Depois do npm test: auditoria na última hora = notas_fiscais criar_de_proposta 6, vincular_proposta 6, ligar_recebimento 3, desligar_recebimento 3; analises_projeto mapa_cad 9; configuracoes padroes_orcamento 12 (padroesOrcamento.test.js:21 conta essas linhas, mas não as remove).
  correcao_sugerida: No fim de cada teste de banco, apagar a auditoria das entidades que o teste criou (WHERE entidade=... AND entidade_id = ANY(ids criados)). Também dá para gravar uma marca de teste em detalhes e limpar por ela.
  esforco: minutos
  verificado: false

- [baixa] backend/src/models/migracoes/2.0-19-pastas-clientes.js:64
  id: BD-08
  categoria: lixo
  descricao: A coluna pastas_movidas.pasta_obra_antes é criada, mas nunca é gravada nem lida. O script que move as pastas e desfaz a mudança só usa pasta_antes. É sobra de projeto.
  evidencia: grep -rn pasta_obra_antes backend frontend só acha a criação em 2.0-19:64. scripts/mudar-pastas-para-clientes.js:57 faz INSERT (tabela, registro_id, origem, destino, pasta_antes) e :75 desfaz com pasta_antes.
  correcao_sugerida: Deixar como está (a migração não apaga coluna) e registrar no LEIA-ME, ou gravar o valor se o desfazer tiver mesmo de restaurar pasta_obra_id.
  esforco: minutos
  verificado: false

- [baixa] backend/package.json:3
  id: BD-09
  categoria: conexao
  descricao: O ramo de teste versao-2.0 continua marcado 2.10.0, enquanto o main, que é a produção, está em 2.26.0, com o mesmo backend/src. A verificação de versões do pre-deploy só confere se os 4 arquivos do ramo concordam entre si. O ambiente de teste mostra uma versão 16 releases mais velha que a da produção, o que confunde a comparação teste × produção.
  evidencia: No v2: '"version": "2.10.0"' em backend/package.json e frontend/package.json, e npm test diz 'versões iguais nos 4 arquivos (2.10.0)'. 'git show main:backend/package.json' dá '"version": "2.26.0"'. 'git log versao-2.0..main' só lista commits 'Versão 2.11.0…2.26.0' e merges; 'git diff --stat versao-2.0 main -- backend/src' sai vazio.
  correcao_sugerida: Depois de cada subida, trazer o commit de versão do main de volta para versao-2.0 (git merge main), ou fazer o bump já no ramo de teste antes do merge.
  esforco: minutos
  verificado: false

REFUTADOS: []


## leitura-pdf-dwg

- [alta] skills/_comum/cad/projetoDxf.js:41
  id: CAD-01
  categoria: precisao
  descricao: A limpeza do texto MTEXT não trata os códigos de sublinhado, sobrelinha e riscado (\L \l \O \o \K \k), que não terminam em ';', nem os escapes \U+XXXX. Resultado: o título de legenda sublinhado não é reconhecido, a amostra da legenda passa a contar como ponto da planta e a descrição da legenda se perde. Quando há um ';' depois de \l ou \k, o texto entre os dois é apagado. O arquivo arquitetura.js:82 tem uma segunda implementação com o mesmo defeito (e comportamento diferente).
  evidencia: Script legendaSublinhada.js: com 'LEGENDA', 4 tomadas e descrição 'Tomada alta 2P+T 20A'; com '\LLEGENDA\l', título null, 5 tomadas e descrição null. Script mtext2.js: '\LNOTAS:\l tomadas baixas a 0,30 m do piso; interruptores a 1,10 m' vira 'interruptores a 1,10 m' (arquitetura.js) e '\LNOTAS: interruptores a 1,10 m' (projetoDxf.js); 'ELETRODUTO \U+2205 25mm' fica como está. O DXF convertido do DWG real da Paróquia contém '\L\OMAPA CHAVE}'.
  correcao_sugerida: Um limpador único de MTEXT em skills/_comum/cad (usado por projetoDxf.js e arquitetura.js) que: remove os toggles \L\l\O\o\K\k sem exigir ';'; trata \f \H \C \A \Q \T \W \S...; até o ';'; decodifica \U+XXXX e \M+; respeita \\, \{ e \}. Incluir no teste-projeto-dxf.js um caso com título sublinhado e uma nota com ';'.
  esforco: horas
  verificado: true

- [alta] skills/_comum/cad/disciplinasCad.js:86
  id: CAD-02
  categoria: erro
  descricao: alturaDoTexto só entende 'h=' e 'altura'. Texto de legenda no formato 'a 2,20m do piso' cai na regra /\bpiso\b/ e volta como altura 0, montagem 'piso'. A análise de DWG/DXF com blocos usa essa função na descrição vinda da legenda (analiseCad/index.js:161). Por isso tomada alta, tomada média e interruptor descritos pela legenda saem no piso, enquanto o leitor do mapa e do 3D (tiposDePonto.alturaEscrita) lê certo o mesmo texto.
  evidencia: alturas.js: alturaDoTexto('Tomada alta a 2,20m do piso'), ('Tomada baixa a 0,30m do piso') e ('Interruptor simples 1 tecla - 1,20m do piso') dão todos {"altura_m":0,"montagem":"piso"}; alturaEscrita dá 2.2 / 0.3 / 1.2. descreverSimbolo({bloco:'TA', descricaoLegenda:'Tomada alta a 2,20m do piso'}).altura = {"altura_m":0,"montagem":"piso"}.
  correcao_sugerida: Em alturaDoTexto, testar antes RE_ALTURA_PISO de tiposDePonto ('N m|cm do piso') e só depois as regras de piso, teto e porta. Melhor ainda: um leitor de altura só para o sistema. Hoje são três: disciplinasCad.alturaDoTexto, tiposDePonto.alturaEscrita e pontosDoDesenho RE_ALTURA_LEGENDA/RE_ALTURA_NOTA (este último não aceita 'h:'). Acrescentar um caso de teste com bloco e legenda 'a 2,20m do piso'.
  esforco: minutos
  verificado: true

- [alta] skills/_comum/cad/pontosDoDesenho.js:371
  id: CAD-03
  categoria: precisao
  descricao: aplicarMapa casa cada símbolo desenhado com TODAS as linhas do mapa da mesma layer cuja medida esteja a ±3 cm, sem dar o símbolo a uma linha só. A proteção contra repetição só vale para o mesmo tipo (pontos.some(o => o.simbolo === m.simbolo ...)). Se o engenheiro confirma duas linhas vizinhas com tipos diferentes, o mesmo símbolo vira dois pontos que contam no orçamento. Com o mesmo tipo, os pontos vão para a linha errada e o 'contados' da tela não bate com a quantidade da linha.
  evidencia: duplaContagem.js: quadrados de 0,20, 0,22 e 0,24 m (3 de cada) geram as linhas 0.2x0.2 qtd=6 e 0.24x0.24 qtd=3. Confirmadas como tomada e interruptor, saem 12 pontos para 9 símbolos (as posições 0.11,2.11, 2.11,2.11 e 4.11,2.11 viram tomada E interruptor). No DXF real R04, a layer REF-LUMINOTECNICO mostra qtd 26/11/10/8 e contados 27/15/5/7.
  correcao_sugerida: No aplicarMapa, dar cada grupo à linha de medida mais próxima (e de preenchimento compatível), uma vez só, na mesma regra do agrupamento de propostaDeMapa. Ou guardar no mapa o índice dos grupos de cada linha e reaplicar por esse índice. Acrescentar um teste com duas linhas vizinhas de tipos diferentes.
  esforco: horas
  verificado: true

- [alta] skills/_comum/cad/dwg-para-dxf.mjs:92
  id: CAD-04
  categoria: conexao
  descricao: Na conversão de DWG, os atributos (ATTRIB) são gravados como TEXT solto, sem a tag. A leitura do projeto (projetoDxf.js:106-113) só liga ao bloco as entidades ATTRIB que vêm depois do INSERT. Então, em todo DWG, ALTURA, DESCR e TAG nunca chegam ao bloco: perdem-se a altura por posição e a descrição por atributo, que funcionam com o mesmo projeto em DXF.
  evidencia: DWG real da Paróquia convertido: 1844 INSERT, 227 seguidos de TEXT e 0 de ATTRIB. No DXF R04, 75 INSERT são seguidos de ATTRIB, e o 'ELE QD' e o 'ATERR' só têm descrição por atributo (origemDescricao 'atributo'). Código: case 'ATTRIB' → comum('TEXT', e) sem o código 2 (tag).
  correcao_sugerida: No conversor, gravar os atributos como ATTRIB de verdade: 66=1 no INSERT, ATTRIB com 2 (tag), 1 (valor), 10/20/40 e SEQEND. Manter também o texto, para a arquitetura achar o nome da sala. Acrescentar um teste DWG→DXF com bloco e atributo ALTURA (ou um DXF que imite a saída do conversor).
  esforco: horas
  verificado: true

- [media] skills/_comum/cad/dwg-para-dxf.mjs:121
  id: CAD-05
  categoria: precisao
  descricao: O conversor de DWG não grava SPLINE, ELLIPSE, DIMENSION, MLEADER, POINT nem SOLID (caem no 'default'). A medição de eletroduto por spline ou elipse, que existe e tem teste para DXF ('metragem pela curva'), não funciona com DWG. Cotas e chamadas (leaders), que poderiam conferir a escala e ler 'Eletrocalha 300x100', também se perdem.
  evidencia: tiposDwg.mjs no DWG real: o LibreDWG lê ELLIPSE 3618, DIMENSION 1362, SPLINE 865, POINT 5203, SOLID 41. Na lista de entidades do DXF convertido (lerReal.js) não aparece nenhum desses tipos.
  correcao_sugerida: Acrescentar os casos SPLINE (pontos de controle/ajuste, graus e nós), ELLIPSE (centro, eixo maior, razão, ângulos), SOLID, e o texto de DIMENSION e de MLEADER/LEADER, como TEXT na posição ou como entidade própria. Depois, um teste comparando a metragem de DWG e DXF do mesmo desenho.
  esforco: horas
  verificado: true

- [media] skills/_comum/cad/pontosDoDesenho.js:309
  id: CAD-06
  categoria: precisao
  descricao: propostaDeMapa guarda só as 8 formas de símbolo mais frequentes de cada layer (.slice(0, 8)). As outras somem do mapa sem aviso: não aparecem nem como 'não reconhecido' e o engenheiro não tem como conferir. Uma layer genérica (QiBuilder 'SIMBOLOS' ou projeto luminotécnico) perde símbolos.
  evidencia: corte8.js: no DXF R04, a layer com 16 tipos teve 8 descartados (25 símbolos); no DWG de arquitetura, 10 tipos com 2 descartados (o mapa mostrou exatamente 8 linhas).
  correcao_sugerida: Tirar o corte, ou juntar o resto numa linha 'outras formas (N símbolos)' com os centros, para a tela mostrar. Se o limite for para proteger o tamanho do JSON, usar o limite de pontos que já existe (MAX_PONTOS_PLANTA) e avisar.
  esforco: minutos
  verificado: true

- [media] skills/_comum/cad/projetoDxf.js:212
  id: CAD-07
  categoria: precisao
  descricao: Bloco anônimo (*U…, que é como o AutoCAD grava o bloco dinâmico com o parâmetro alterado, por exemplo a tomada com visibilidade alta/média/baixa) nunca é contado como símbolo: é aberto como contêiner. E um MINSERT (bloco em arranjo) de símbolo conta 1, porque o arranjo nl×nc só é aplicado a contêiner.
  evidencia: blocosAnonimos.js: 1 LUMINARIA normal, 3 '*U12' (dinâmico) e 1 MINSERT 3x2 = 10 luminárias desenhadas; lerProjetoDxf devolve 'grupo LUMINARIA quantidade 2'. O DWG real da Paróquia tem 39 inserções *U (contaU.js).
  correcao_sugerida: No conversor e na leitura de DXF, recuperar o nome verdadeiro do bloco dinâmico (BLOCK_RECORD: AcDbDynamicBlockTrueName / AcDbBlockRepresentation, ou o xdata 'AcDbBlockRepBTag') e tratar o *U como símbolo com esse nome. No símbolo, aplicar rowCount×columnCount do MINSERT como já se faz para contêiner. Acrescentar o teste.
  esforco: horas
  verificado: true

- [baixa] backend/src/services/simbolosAprendidos.js:14
  id: CAD-08
  categoria: precisao
  descricao: A chave do aprendizado de símbolos é layer + proporção + preenchimento, sem o tamanho. Dois símbolos de mesma proporção e tamanhos diferentes na mesma layer (tomada 20 cm e quadro 40 cm, os dois quadrados) caem na mesma linha do banco, e a confirmação mais recente sobrescreve a anterior (mapaCad.aprender, ON CONFLICT (chave)). No desenho seguinte, as duas formas recebem o mesmo tipo. O aprendizado também é global (não separa por escritório), ao contrário das notas.
  evidencia: chaveAprendida.js: chaveDe dá 'EL-SIMBOLOS|1.00|0.00' para [0.2,0.2] e para [0.4,0.4]. Com o aprendizado (quadro, usuario:true), propostaDeMapa devolve 'linha 0.2x0.2 qtd 3 → HM-ELE-QUADRO aprendido' e 'linha 0.4x0.4 qtd 2 → HM-ELE-QUADRO aprendido'.
  correcao_sugerida: Em DWG/DXF, que estão em tamanho real, pôr na chave a medida arredondada (a 1-2 cm) e o escritório do carimbo (chaveEscritorio, como em cad_notas_aprendidas). Deixar a chave só pela proporção apenas para PDF sem escala confiável. Precisa de migração idempotente em schema.js para a nova chave ou coluna.
  esforco: horas
  verificado: true

- [media] backend/src/services/compatibilizacaoAnalise.js:127
  id: CAD-09
  categoria: conexao
  descricao: A análise do PDF não recebe a escala informada pelo usuário e não usa a escala pelas portas. A escala sai só do texto (pdfVetorial.js:617). O 3D (pdfParaDxf.js:221-231) pergunta a escala e tenta pelas portas. Num PDF sem 'ESC. 1:n' em texto, a metragem das linhas da legenda fica null, e a escala que existe só no nome do arquivo ('A0 1_50') é ignorada.
  evidencia: No PDF real 'Lumino - ... A0 1_50.pdf': escalaDoCarimbo null, rotulosDeEscala [] e 3 linhas (perfis PDL21/PDL22) sem metros. No PDF REV.04 da elétrica: o único texto é 'ESCALA/FOLHA DA PRANCHA:', sem valor. O pdf3d.js também falha com ESCALA nos dois (as portas não resolveram). A chamada lerPdfVetorial(arquivos[i].buffer, { maxPaginas }) não passa escala.
  correcao_sugerida: Levar a escala informada da tela até a análise (o mesmo campo do 3D, por arquivo e página). Como alternativas marcadas [CONFERIR], usar: o nome do arquivo (/1[_:-]\s?(\d{2,3})\b/), as portas (escalaPelasPortas, já pronta) e uma cota conhecida. Guardar a origem da escala no resultado e pôr no achado quando não houver escala.
  esforco: horas
  verificado: true

- [baixa] skills/_comum/cad/pontosDoDesenho.js:276
  id: CAD-10
  categoria: redundancia
  descricao: Os trechos de infraestrutura do mapa do CAD (usados no 3D e na tela do mapa) são medidos por um caminho diferente do da análise. A disciplina está fixa em 'eletrica', a regex é outra (RE_TRECHO não tem INFRA, FIAÇÃO nem CABEAMENTO) e não se tiram as sobreposições. Por isso o mesmo DXF dá disciplina e metragem diferentes no 3D e no orçamento.
  evidencia: trechosMapa.js no R04: no mapa, CAB-ELETROCALHA, CAB-ELETRODUTO-EXT, INC-ELETRODUTO e INC-ELETRODUTO-RET são todos 'eletrica', e CA-INFRA não aparece. Na análise: rede, rede, incêndio, incêndio, e CA-INFRA 13,2 m (controle_acesso). INC-ELETRODUTO dá 66,83 m no mapa e 66,2 m na análise.
  correcao_sugerida: Usar disciplinaDaLayer/descreverLinha e a mesma RE_LAYER_LINHA no mapa, ou montar mapa.trechos a partir de projeto.linhas (que já tira as repetições). Uma medição só, consumida pelo 3D e pelo orçamento.
  esforco: horas
  verificado: true

- [baixa] skills/_comum/cad/arquitetura.js:82
  id: CAD-11
  categoria: redundancia
  descricao: Há funções duplicadas, e as cópias se comportam diferente: limparTexto em arquitetura.js:82 e projetoDxf.js:41, dentro() em arquitetura.js e analiseCad/index.js:183, e três leitores de altura (disciplinasCad.alturaDoTexto, tiposDePonto.alturaEscrita e pontosDoDesenho RE_ALTURA_LEGENDA/RE_ALTURA_NOTA). O tiposDePonto.js diz ser 'a mesma regra em todo o sistema', mas não é. A RE_ALTURA_NOTA (pontosDoDesenho.js:167) aceita 'h=' e não 'h:'; a RE_ALTURA_H aceita os dois.
  evidencia: Saídas diferentes do mtext2.js para a mesma entrada. alturas.js: 'Interruptor h: 1,10 m' é lido por alturaDoTexto e alturaEscrita, mas RE_ALTURA_NOTA = /(?:\bh\s*=|\baltura\b\s*:?)/ não casa com 'h:'.
  correcao_sugerida: Ficar com um módulo de texto CAD (limpeza de MTEXT e altura) e um de geometria (dentro, área), e importar dos dois lados. Fazer isso junto com as correções CAD-01 e CAD-02.
  esforco: horas
  verificado: false

- [baixa] backend/src/services/analiseCad/index.js:297
  id: CAD-12
  categoria: precisao
  descricao: O uso dos símbolos explodidos no orçamento é tudo ou nada: se o desenho tiver um único bloco nomeado reconhecido (usaMapa = !itens.some(simbolo)), todos os pontos explodidos ficam fora do orçamento. A tela avisa ('Este desenho tem blocos nomeados...'), mas num desenho misto (por exemplo um quadro em bloco e centenas de tomadas explodidas) as tomadas não entram nem depois de conferidas.
  evidencia: Código das linhas 297-319; aviso em frontend/src/components/analise/MapaCad.js:180-183. No R04 (com blocos), valeParaOrcamento=false e as 55 luminárias explodidas de REF-LUMINOTECNICO ficaram só no mapa. Ali isso pode estar certo, porque é uma layer de referência; o risco é o caso misto.
  correcao_sugerida: Decidir por layer: usar o mapa nas layers de instalação que não têm bloco nomeado e manter os blocos onde existem. Tirar as repetições pela posição (< 0,3 m e mesma família) entre bloco e ponto explodido.
  esforco: horas
  verificado: false

- [baixa] skills/_comum/cad/pontosDoDesenho.js:28
  id: CAD-13
  categoria: precisao
  descricao: A RE_INSTALACAO casa 'SIMB' em qualquer layer, inclusive na simbologia de arquitetura ('#ARQUITETURA SIMBOLOGIA'). Num DWG só de arquitetura, aparecem 8 linhas de mapa nessa layer e 2 'Poste de iluminação' sugeridos pela regra. Eles ficam como 'a conferir' e não entram no orçamento.
  evidencia: lerReal.js no DWG de arquitetura da Paróquia: o mapa tem 8 linhas, todas '#ARQUITETURA SIMBOLOGIA'; uma delas é 'iluminacao-externa', qtd 2, origem 'regra', e vira o item 'Poste de iluminação' 2 [ambíguo].
  correcao_sugerida: Pôr ARQUIT|^#?ARQ|MOBIL na RE_FORA de pontosDoDesenho, na mesma regra de RE_LAYER_FORA do projetoDxf.js.
  esforco: minutos
  verificado: false

- [baixa] backend/src/utils/classificarPranchaPdf.js:1
  id: CAD-14
  categoria: precisao
  descricao: Uma prancha luminotécnica real em A0 (planta inteira) foi classificada como 'legenda/notas', sem planta (temPlanta false, regiões 'desconhecido'). A contagem continua, porque semPlanta é false. Mas a folha não é tratada como planta, e isso afeta o que depende de temPlanta: a escolha de página do 3D e os pontos por ambiente. Não medi o efeito em cada caso.
  evidencia: lerPdfVetorial no 'Lumino - Paroquia N.S.da Assunção_M1 - 01-07 - A0 1_50.pdf': folha tipo 'legenda', temPlanta false, semPlanta false, regiões ['desconhecido','legenda','desconhecido'].
  correcao_sugerida: Acrescentar esse PDF (fora do repositório, numa pasta de fixtures do servidor) ao conjunto de calibração do classificador, e conferir por que paredes e portas não pontuaram como planta (pode ser falta de nomes de sala como texto).
  esforco: horas
  verificado: false

REFUTADOS: []


## 3d

- [media] backend/src/services/modelo3d/index.js:125
  id: 3D-01
  categoria: conexao
  descricao: Os componentes do projeto lidos do DWG (analises_projeto.espacial, caminho principal do 3D da análise) vão para a cena com ambiente: null. O montarCena só acha o ambiente pelo NOME, então todos os itens ficam com índice -1. No visualizador: (a) dentro do ambiente as etiquetas dos pontos próximos não aparecem; (b) a dica do mouse sai sem o nome do ambiente; (c) dentro do ambiente, os pontos a mais de 4 m da câmera não podem ser escolhidos; (d) a escolha do ponto de vista ignora quadros e racks.
  evidencia: index.js:125 `... id: '', ambiente: null });` → modelo3d.js:968 `const amb = indiceAmb.has(d.ambiente) ? indiceAmb.get(d.ambiente) : -1;`. app.js:584 usa `porAmbiente.get(atual)`; a escolha do ponto ignora `it[5] !== atual && d > 4`. Saída: `HM-ELE-TOMADA-BAIXA [[-2,0,0.3,0,0,-1,""]]`; na grade de 300 salas, 2700 de 2700 itens com -1; Chromium: etiquetasPontosDentro 0 (null) contra 5 (com ambiente).
  correcao_sugerida: No montarCena, quando o nome não casar, usar o menor ambiente cujo polígono contém (x, y) (função dentro() de arquitetura.js, como pontosDoDesenho.ambienteDe), antes de montar o item. Acrescentar ao teste-3d um caso com ambiente null.
  esforco: minutos
  verificado: true

- [baixa] skills/_comum/cad/visualizador3d/app.js:122
  id: 3D-02
  categoria: erro
  descricao: Cada piso de ambiente sobe 0,4 mm por posição na ordem de área (o menor fica por cima), sem teto. A planta de referência (louças, móveis) e o campo de visão das câmeras e IVPs ficam fixos a 0,03 m. Com mais de 63 ambientes, os pisos das salas menores (banheiros e depósitos, justamente onde estão as louças) passam a cobrir essas linhas. Com 300 ambientes o piso chega a 0,125 m e enterra postes, caixas de piso e catracas (z = 0). Com 1.200 ambientes chega a 0,485 m, acima das tomadas baixas (centro a 0,30 m).
  evidencia: app.js:122 `mesh.position.y = 0.005 + k * 0.0004;` (k = índice na ordem de área, até o nº de ambientes), polygonOffsetUnits -1 - k (linha 120); planta: app.js:248 `pos[j + 1] = 0.03`; campo: app.js:418 `0.03`. Medido: 300 amb → 0,125 m; 1.200 amb → 0,485 m (scratchpad/grande.js).
  correcao_sugerida: Limitar o deslocamento (ex.: 0,005 + min(k, 20) × 0,0004) e deixar o polygonOffset resolver a sobreposição, ou empilhar só os ambientes que de fato se sobrepõem. Desenhar a planta e o campo logo acima do piso mais alto, ou com polygonOffset próprio.
  esforco: minutos
  verificado: true

- [baixa] skills/_comum/cad/infraestrutura.js:173
  id: 3D-03
  categoria: desempenho
  descricao: sugerirCaminhos (ligado por padrão em modelosPorPlanta) cresce de forma quadrática. Em cada ponto ligado: reordena todos os pendentes; recalcula maisPerto sobre os segmentos novos para todos os pendentes; cada rota testa todas as paredes. No passo 1, cada interruptor percorre todas as peças. Em desenho sem traçado (PDF convertido, DWG só com pontos), um pavimento grande se aproxima do limite de 90 s do worker, que inclui a leitura e as outras plantas.
  evidencia: infraestrutura.js:173-191 (`[...pendentes].filter(...).sort(...)` a cada volta; `atualizar()` em todos os pendentes), :104 `paredes.filter(w => cruza(l, w))`, :134 `pecas.forEach`. Medido: 2.700 pontos/300 salas → 3,4 s; 10.800/1.200 → 51,2 s; com sugerirInfra:false → 0,118 s. Perfil: sugerirCaminhos 4,5 s + laço da linha 174 2,4 s numa cena de 10 s.
  correcao_sugerida: Índice espacial em grade (células de 2 a 5 m) para os alvos e as paredes; fila de prioridade (heap) para os pendentes, em vez de ordenar tudo a cada volta; no passo 1, indexar as luminárias por ambiente. Pôr um teto (ex.: 3.000 pendentes) com aviso, como já se faz com os 20.000 segmentos.
  esforco: horas
  verificado: true

- [baixa] skills/_comum/cad/visualizador3d/app.js:1157
  id: 3D-04
  categoria: desempenho
  descricao: O visualizador do prédio redesenha a cena e reposiciona todas as etiquetas HTML em todo quadro de animação, mesmo parado. Além disso, cada ambiente cria um Mesh e um MeshStandardMaterial próprios para o piso (uma chamada de desenho por sala). O 3D do quadro (quadro.js) já passou a desenhar só quando algo muda, por causa da perda de contexto no SwiftShader. O do prédio não recebeu a mesma correção: gasta CPU e GPU parado (celular do cliente) e pesa na captura do PDF.
  evidencia: app.js:1181-1186 `function quadro(agora) { requestAnimationFrame(quadro); desenhar(agora); }` sem o controle 'sujo'; app.js:120 `new Mesh(g, new MeshStandardMaterial({...}))` por ambiente. quadro.js:19-27 documenta a correção ('desenho só quando algo muda'). Chromium/SwiftShader: 1.200 amb → 1.212 chamadas de desenho, 244 ms por quadro; 300 amb → 312 chamadas, 6,6 ms.
  correcao_sugerida: Usar o mesmo esquema do quadro.js (pedirDesenho no change dos controles, na animação, nas teclas, no redimensionamento e nos botões). Juntar os pisos numa só BufferGeometry com cor por vértice, com um índice por triângulo para o raycast do duplo clique. Só atualizar as etiquetas quando a câmera mudar.
  esforco: horas
  verificado: true

- [media] backend/src/services/modelo3d/index.js:137
  id: 3D-05
  categoria: erro
  descricao: A chave do cache do 3D não inclui os símbolos aprendidos, mas eles são enviados ao worker e mudam a leitura dos pontos desenhados (laudo com arquitetura e análise sem espacial). Também não inclui vários arquivos que mudam o resultado: simbolos.js, disciplinasCad.js (usado por arquitetura.js), planta.js, plantasDisciplina.js, posicionamento.js e ../empresa.js (cabeçalho). Depois de confirmar um símbolo no Mapa do CAD, ou de atualizar esses arquivos, o 3D já guardado continua sendo servido. Não há rota nem botão para forçar a geração de novo.
  evidencia: index.js:137-143 chaveDa usa versaoDoGerador + dxf + dispositivosReais/trechos + [disciplinas, dadosPorDisciplina, peDireito, título…], sem aprendidos; index.js:156 `aprendidos: await simbolosAprendidos.carregar()`; worker.js passa aprendidos a montarCenasPorPlanta → pontosDoDesenho (modelosPorPlanta.js:45). Lista de versaoDoGerador em index.js:40 sem os arquivos citados; modelo3d.js:24 `require('./simbolos')`; arquitetura.js:16 `require('./disciplinasCad')`. Nenhuma ocorrência de 'forcar'/'refazer' em modelo3dController.js nem em routes/v2/modelo3d.js.
  correcao_sugerida: Incluir na chave um hash dos aprendidos carregados (ou só dos que valem para as layers do DXF). Trocar a lista fixa de arquivos por um hash de todos os .js de skills/_comum/cad e de _comum/empresa.js. Criar um 'Gerar de novo' (admin ou dono da análise) que limpe a linha de modelos_3d.
  esforco: minutos
  verificado: true

- [baixa] skills/_comum/cad/modelo3d.js:969
  id: 3D-06
  categoria: conexao
  descricao: O ponto que o próprio sistema gera (formulário do projeto) já traz o atributo CIRCUITO (TUG e ponto de luz, vindo de calc.circuitos), mas o 3D o descarta: o item da cena guarda só x, y, z, normal, ambiente, id e campo. Hoje não há nenhuma ligação objeto 3D ↔ circuito ↔ disjuntor, que é o requisito básico do 3D interativo pedido.
  evidencia: plantasDisciplina.js:17/20 `atributos: { CIRCUITO: circuitoDe(a.nome, 'tug') }`; planta.js:176-179 o dispositivo sai com `atributos`; modelo3d.js:969 `t.itens.push([x, y, r2(p.z), r2(p.nx), r2(p.ny), amb, d.id || '', ...campo])`, sem atributos; compatibilidadeEspacial.js:413 grava só { x, y, descricao, disciplina, classe, altura_m, montagem }.
  correcao_sugerida: Acrescentar ao item (ou a uma tabela paralela na cena) o circuito, o quadro e o comando (interruptor/relé) de cada ponto, preenchidos pelo formulário e, no DWG, pelo texto de circuito junto ao símbolo. É o primeiro passo do roteiro do 3D interativo.
  esforco: horas
  verificado: false

- [baixa] skills/_comum/cad/visualizador3d/quadro.js:222
  id: 3D-07
  categoria: desempenho
  descricao: No 3D do quadro, cada clique numa peça clona o material para o destaque e, ao trocar a seleção, volta ao original sem liberar a cópia. O impacto é pequeno (a sessão de visualização é curta), mas vai crescer quando o 3D interativo trocar o estado das peças com frequência.
  evidencia: quadro.js:218-223 `selecionado.material = selecionado.userData.__mat;` … `selecionado.material = selecionado.material.clone();`, sem `.dispose()` na cópia descartada.
  correcao_sugerida: Ter um material de destaque em cache por cor (como material() já faz), ou chamar dispose() na cópia ao desfazer a seleção. Para estados (ligado/desligado), usar materiais em cache por estado.
  esforco: minutos
  verificado: false

REFUTADOS: []


## skills

- [media] skills/_comum/cad/posicionamento.js:94
  id: SK-01
  categoria: erro
  descricao: Numa sala que não é retangular (em L, por exemplo), a grade de luminárias da planta e do 3D descarta sem aviso os pontos que caem fora do polígono. Assim, a planta e o 3D mostram menos luminárias do que o memorial e o orçamento da skill de iluminação.
  evidencia: gradeNxNy monta a grade na caixa envolvente e faz `if (dentro(p, poligono)) pts.push(...)`. Em planta.js:71, `grade_nxny: (pol, n, fase, it) => P.gradeNxNy(pol, it.nx, it.ny).slice(0, n)` não completa o que falta, ao contrário da regra de perímetro (planta.js, linha 27 do bloco REGRAS, que completa com noPerimetro). Teste: sala em L de 64 m² com 4×4 = 16 luminárias pedidas → 'posicionadas 12', naoEncontrados [], nenhum aviso.
  correcao_sugerida: Em grade_nxny, quando sobrar menos que n, redistribuir os pontos que faltam dentro do polígono (subdividir as células válidas ou recalcular a grade por retângulo da decomposição do L). No mínimo, devolver um aviso 'N de M luminárias fora do polígono'. Acrescentar um caso de sala em L em teste-cad.js.
  esforco: horas
  verificado: true

- [media] skills/_comum/cad/plantasDisciplina.js:136
  id: SK-02
  categoria: conexao
  descricao: As luminárias da skill de iluminação vão para a planta (e para o 3D) sem o circuito, embora o cálculo saiba qual circuito alimenta cada ambiente (a.circuitos = ['IL1', ...]). O bloco HM-ILU-LUMINARIA nem tem o atributo CIRCUITO, ao contrário de HM-ELE-PONTO-LUZ. É a ligação que falta para o 3D interativo (desligar o disjuntor e apagar o circuito).
  evidencia: plantasDisciplina.js:136: `{ simbolo: 'HM-ILU-LUMINARIA', ..., atributos: { } }`. simbolos.js:28: HM-ILU-LUMINARIA tem só `atributos: [{ ...ID, x: 0.35 }]`; simbolos.js:25: HM-ELE-PONTO-LUZ tem `{ tag: 'CIRCUITO' ... }`. O cálculo (iluminacao/scripts/lib/calculo.js:330) preenche `x.amb.circuitos.push(id)`. Saída real: 'Escritório aberto ... [ 'IL1' ]'. Em modelo3d.js, cada peça é gravada como [x, y, z, nx, ny, amb, id], sem circuito.
  correcao_sugerida: Acrescentar a tag CIRCUITO ao bloco HM-ILU-LUMINARIA e, no gerador iluminacao(), passar `atributos: (k) => ({ CIRCUITO: circuitoDaLuminaria(a, k) })`, repartindo as luminárias quando o ambiente for dividido em vários circuitos. Levar o circuito para o registro da peça no 3D.
  esforco: horas
  verificado: true

- [baixa] C:\Users\Laboratorio\.claude\skills:undefined
  id: SK-04
  categoria: conexao
  descricao: A skill quadros-nbr61439 (pasta skills/quadros, pronta desde 29/10, 207 verificações) não está ligada em %USERPROFILE%\.claude\skills. O Claude Code não consegue chamá-la: ela não aparece na lista de skills desta sessão, onde as outras 18 estão.
  evidencia: Get-ChildItem mostra 18 junções (alarme-intrusao … usina-solar-fotovoltaica e modelo-3d-arquitetura) para C:\HM-Engenharia\hm-eng\skills\*, e nenhuma para skills\quadros. skills/quadros/SKILL.md:2: `name: quadros-nbr61439`. RESUMO §3.1 lista a skill como pronta.
  correcao_sugerida: Criar a junção `mklink /J "%USERPROFILE%\.claude\skills\quadros-nbr61439" C:\HM-Engenharia\hm-eng\skills\quadros` depois de aprovar em produção, e documentar no RESUMO §3.1 o passo de ligar cada skill nova.
  esforco: minutos
  verificado: true

- [baixa] skills/_comum/cad/modelo3d.js:451
  id: SK-05
  categoria: redundancia
  descricao: As chaves de disciplina do 3D são uma tabela à parte, que diverge do registro único e da leitura de CAD: 'controle-acesso' contra 'controle_acesso', 'veicular' contra 'carregador', HOSP→'eletrica' contra 'eletrica_hospitalar'. Um componente de um DWG analisado na layer VE-* chega ao 3D como 'carregador', que não está na tabela do 3D, e sai cinza (#dddddd) com o rótulo cru 'carregador' na legenda. O mesmo vale para eletrica_hospitalar.
  evidencia: modelo3d.js:451-458: DISCIPLINAS com 'controle-acesso' e 'veicular'; disciplinaDoSimbolo mapeia VE: 'veicular'. disciplinasCad.js:14-18: PREFIXO_HM com ACE: 'controle_acesso', VE: 'carregador', HOSP: 'eletrica_hospitalar'. Teste: disciplinaDaLayer('VE-PONTOS') → 'carregador'; modelo3d.DISCIPLINAS.carregador → undefined. backend/src/services/modelo3d/index.js:108 só traduz cabeamento, rede e controle_acesso. Na linha 1020, `DISCIPLINAS[k] || { rotulo: k, cor: '#dddddd' }`. Há ainda uma terceira tabela em tiposDePonto.js (linhas 25-37: 'controle-acesso', 'veicular').
  correcao_sugerida: Usar as chaves do registro (disciplinas.js) em todo o CAD/3D, com a cor e o rótulo do 3D como campos do registro, e remover as tabelas paralelas e o DISCIPLINA_3D_TRECHO do backend.
  esforco: horas
  verificado: false

- [baixa] skills/_comum/cad/plantasDisciplina.js:20
  id: SK-06
  categoria: conexao
  descricao: Elétrica predial e iluminação não conversam. A planta da elétrica põe pontos de luz por estimativa (1 a cada 16 m²), sem usar a grade do luminotécnico. O importador de quadros (quadros/scripts/lib/importar.js) só aceita as skills de elétrica predial e industrial, e não os circuitos de iluminação (IL1…).
  evidencia: plantasDisciplina.js:19-20: `// um ponto de luz a cada ~16 m² ... [CONFERIR] com o luminotécnico` com `n: Math.max(1, Math.round(a.area_m2 / 16))`. Os requires entre skills (grep) dão quadros → eletrica e eletrica-industrial, e pressurizacao → eletrica-industrial. Nenhuma skill lê iluminacao.
  correcao_sugerida: Criar um adaptador iluminação → elétrica/quadros: os circuitos IL* entram no quadro de cargas e no unifilar, e a planta elétrica usa a grade da skill de iluminação quando existir. É a base da cadeia disjuntor → circuito → luminária que o 3D interativo vai precisar.
  esforco: dias
  verificado: false

- [baixa] skills/solar/scripts/lib/index.js:147
  id: SK-07
  categoria: conexao
  descricao: As skills escrevem os subgrupos do orçamento à mão em vez de tirá-los do registro único. Três subgrupos de serviço não são reconhecidos por servicosBase.disciplinaDoSubgrupo: 'Usina solar', 'Recarga de VE' e 'Medição de iluminação'. Os subgrupos de material também diferem dos de kits/composições (ex.: cabeamento 'Cabeamento estruturado' contra 'Redes / Cabeamento Estruturado'; telefonia 'Telefonia e interfonia' contra 'Interfonia'). Hoje o efeito é pequeno, porque o código padrão decide a disciplina, mas a mesma disciplina aparece em dois subgrupos na proposta quando se mistura kit com orçamento de skill.
  evidencia: solar/index.js:147 `subgrupo: 'Usina solar'`. carregador/index.js:110 `subgrupo: 'Recarga de VE'`. iluminacao/index.js:271 `'Medição de iluminação'`. disciplinas.js: solar servico 'Solar', aliases ['Energia solar','Usina solar fotovoltaica','Fotovoltaico']; carregador servico 'Recarga de veículo elétrico', aliases ['Carregador veicular', ...]. servicosBase.js:35-39 compara só o nome exato normalizado.
  correcao_sugerida: No srv() e nos materiais de cada skill, usar `porChave('<chave>').subgrupo.servico/material` de _comum/disciplinas.js, ou ao menos acrescentar os três nomes em `aliases`.
  esforco: minutos
  verificado: false

- [baixa] skills/eletrica-industrial/scripts/lib/calculo.js:undefined
  id: SK-08
  categoria: redundancia
  descricao: Duas duplicações. (a) O motor de motores e partidas mora dentro de uma skill (eletrica-industrial) e é importado direto por quadros e pressurização, que é o mesmo caso que levou a NBR 5410 para _comum/eletrico. Vai ser também a base de chillers, bombas e ventiladores de HVAC. (b) Funções de número e formatação (n/num/arred/br/fmt/r1/r2) estão redefinidas em uns 20 arquivos, com regras diferentes (Number.isNaN aceita Infinity; Number.isFinite não aceita).
  evidencia: require('../../../eletrica-industrial/scripts/lib/calculo') em pressurizacao/scripts/lib/calculo.js e quadros/scripts/lib/calculo.js. grep de definições: br em alarme, automacao, cftv, controle-acesso, incendio, solar, telefonia, modelo-3d; n/num com isNaN em automacao:9, solar:32, iluminacao:33, eletrica-industrial:23; com isFinite em quadros:19 e catalogo:22.
  correcao_sugerida: Mover as partidas e motores para _comum/eletrico/motores.js (a eletrica-industrial passa a reexportar, como já faz a eletrica) e criar _comum/numeros.js com num/arred/br.
  esforco: horas
  verificado: false

- [baixa] skills/spda/package.json:undefined
  id: SK-09
  categoria: teste
  descricao: O CLAUDE.md manda rodar `npm test` na pasta da skill antes de mudá-la. Na SPDA, esse script roda só 2 dos 3 testes: o teste do laudo no modelo HM 29/10 (40 verificações) fica de fora. Além disso, só SPDA (laudo R06), carregador (projeto AP-1103) e pressurização (exemplo resolvido da NT 13) comparam com um trabalho real ou com o exemplo da norma. As outras 15 skills se apoiam em contas feitas à mão sobre exemplos fictícios.
  evidencia: spda/package.json: `"test": "node testes/teste-regressao.js && node testes/teste-parecer.js"`; testes/teste-laudo-modelo.js existe e só roda por testar-todas.js. Cabeçalhos dos testes: carregador 'conferido com o projeto real AP-1103'; spda 'laudo HM original (R06)'; os demais 'conferidos à mão' ou 'Cliente Exemplo'.
  correcao_sugerida: Incluir `node testes/teste-laudo-modelo.js` no script de teste. Para cada skill, acrescentar um caso de regressão com um trabalho entregue, com os dados anonimizados fora do repositório ou só com os números.
  esforco: minutos
  verificado: false

- [baixa] docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md:556
  id: SK-10
  categoria: lixo
  descricao: As contagens de verificações na documentação ficaram para trás em relação aos testes. A mensagem de erro da SPDA com formulário vazio também expõe o nome técnico do campo.
  evidencia: RESUMO §3.1 diz quadros 127/127 e iluminação 61/61; o real é 207 e 65. Os SKILL.md dizem alarme 55 (real 63), antena 44 (48), cftv 29 (30), controle-acesso 42 (50), incêndio 20 (26), quadros 118 (207), spda 38 (43), telefonia 60 (64). O RESUMO cita '13 casos da base de CAD'; hoje são 26 + 24 + 16. spda/scripts/lib/risco.js:55: `NG não encontrado para ${est.municipio}/${est.uf} na Tabela F.1 — informe estrutura.ng` (com o formulário vazio sai 'para /').
  correcao_sugerida: Atualizar os números (ou trocar por 'ver npm test') e reescrever a mensagem da SPDA ('Informe o município e a UF da obra, ou o NG').
  esforco: minutos
  verificado: false

REFUTADOS: [{"id":"SK-03","descricao":"O 3D por formulário de projeto aceita só 7 disciplinas (cftv, cabeamento/rede, elétrica, iluminação, incêndio, alarme, controle de acesso). Telefonia, antena e elétrica hospitalar já têm gerador de pontos de planta em PLANTAS, mas um projeto dessas disciplinas com arquitetura abre o 3D com 'Esta disciplina ainda não tem pontos no 3D'.","motivo":"Os fatos do código conferem. estimativaArquitetura.js:13-16 e backend/src/services/modelo3d/index.js:26-29 listam as mesmas 7 disciplinas, PLANTAS (plantasDisciplina.js:306) também tem eletrica_hospitalar, telefonia e antena, e modelo3d/index.js:66 mostra a mensagem 'Esta disciplina ainda não tem pontos no 3D'. Só que isso é um limite já documentado: RESUMO-MELHORIAS-E-IMPLANTACAO.md:337 diz 'Só elétrica, iluminação, incêndio, cabeamento/rede, CFTV, alarme e controle de acesso têm pontos no 3D [...]; as demais mostram só a arquitetura.' Não é erro. É oportunidade de evolução: o gerador de planta existe, e com o formulário real (dadosPorDisciplina) bastaria incluir a disciplina nos dois mapas. Para a estimativa só pela arquitetura também faltaria a função em ESTIMATIVAS (estimativaArquitetura.js:143-144 lança erro sem ela). Por isso o esforço 'minutos' só vale para o caso com formulário."}]


## frontend

- [media] frontend/src/components/VencimentosLaudos.js:12
  id: FE-01
  categoria: conexao
  descricao: O formulário de vencimento de laudo tem uma lista própria de 6 disciplinas (SPDA, Incêndio, Elétrica, CFTV, Cabeamento, Outro). Ela não vem do registro único (hooks/useDisciplinas ← GET /disciplinas ← skills/_comum/disciplinas.js, que tem 19 disciplinas) e não está em ordem alfabética. Laudo de pressurização, média tensão, solar, quadros, iluminação etc. só pode ser cadastrado à mão como 'Outro', e a chave 'outro' não existe no registro (lá é 'outros'). No backend, a proposta de renovação usa a mesma lista curta: um laudo importado sozinho com disciplina 'pressurizacao' gera o item 'Renovação do laudo de PRESSURIZACAO'.
  evidencia: VencimentosLaudos.js:12-15 `const DISCIPLINAS = [['spda','SPDA'],['incendio','Incêndio'],['eletrica','Elétrica'],['cftv','CFTV'],['cabeamento','Cabeamento'],['outro','Outro']]`; linha 111 usa `<select>` nativo com DISCIPLINAS.map. backend/src/services/propostaRenovacao.js:17 `const ROTULOS = { spda, incendio, eletrica, cftv, cabeamento, outro }` e :26 `ROTULOS[...] || String(disciplina).toUpperCase()`. backend/src/services/vencimentos.js:155-169 (sincronizarLaudos) grava l.disciplina do laudos_projetos, que usa as chaves do registro.
  correcao_sugerida: No frontend, usar useDisciplinas() (filtrando laudo:true, mais 'outros') e o <Select> de components/Select.js. No backend, trocar ROTULOS pelo nome do registro (nomes.servico ou nomes.laudo) em propostaRenovacao. Ajustar VencimentosLaudos.test.js se ele depender da ordem.
  esforco: horas
  verificado: true

- [baixa] frontend/src/components/VencimentosLaudos.js:97
  id: FE-02
  categoria: precisao
  descricao: Quatro listas fogem da regra do usuário de lista sempre em ordem alfabética, pelo Select.js ou Sugestoes. As opções estão na ordem do código, não do alfabeto.
  evidencia: VencimentosLaudos.js:97 `<datalist>{DOCUMENTOS.map(...)}` (Certidão federal/estadual/municipal/FGTS/trabalhista, Alvará, Anuidade, Seguro: Alvará deveria vir primeiro; o certo é usar Sugestoes). NotasFiscais.js:1367 `<select>` com 'Erro na emissão', 'Serviço não prestado', 'Outros'. Integracoes.js:483 'sem desoneração' antes de 'com desoneração'. Integracoes.js:492 'Insumos' antes de 'Composições'.
  correcao_sugerida: Trocar por `import Select, { Sugestoes } from './Select'`. O código do motivo de cancelamento continua no value, só a ordem exibida muda.
  esforco: minutos
  verificado: false

- [media] frontend/package.json:12
  id: FE-03
  categoria: teste
  descricao: Os 113 testes Jest do frontend não rodam em nenhum processo automático. O package.json não tem script 'test', e o pré-deploy (backend/scripts/pre-deploy.js, o 'npm test' que decide se a versão sobe) só descobre backend/testes/*.test.js e confere as versões. Uma regressão nos testes do app de campo (sincronização offline) ou do Modal pode chegar à produção sem aviso.
  evidencia: `npm test` na pasta frontend dá 'npm error Missing script: "test"'. grep 'frontend|react-scripts|jest' em backend/scripts/pre-deploy.js só encontra as linhas 24/30 (conferência de versão do package/lock). Rodando à mão, os testes passam: 15 arquivos, 113 testes.
  correcao_sugerida: Adicionar `"test": "react-scripts test --watchAll=false"` no frontend/package.json e fazer o pre-deploy.js rodar `CI=true npm test` no frontend, com 'NÃO SUBA' se falhar.
  esforco: minutos
  verificado: true

- [media] frontend/src/pages/Orcamento.js:260
  id: FE-04
  categoria: erro
  descricao: O editor de proposta carrega clientes, o catálogo inteiro de materiais (paginado, até 50 pedidos de 15 s cada) e a base de serviços, e descarta qualquer erro sem avisar. Se uma página do catálogo der timeout, a lista de materiais do '+ catálogo' e de clientes fica vazia ou incompleta sem nenhum aviso, e a pessoa pode concluir que o material não está cadastrado.
  evidencia: Orcamento.js:260-262: `getTodosClientes().then(...).catch(() => {}); getTodosMateriais().then(...).catch(() => {}); getServicos().then(...).catch(() => {});`. api.js:9 `timeout: 15000` e api.js:83 `getTodosMateriais = (params) => buscarTodasPaginas(getMateriais, params)`. O frontend tem 42 `.catch(() => {})`, 8 deles no Orcamento.js.
  correcao_sugerida: No catch, mostrar toast.error('Não foi possível carregar o catálogo — recarregue') e guardar um estado de erro com botão 'Tentar de novo' ao lado do '+ catálogo'. Também cabe um timeout maior para buscarTodasPaginas.
  esforco: minutos
  verificado: true

- [baixa] frontend/src/pages/Orcamento.js:137
  id: FE-05
  categoria: redundancia
  descricao: Código repetido que já se afasta do registro único: a lista de categorias de material copiada em dois arquivos, mapas de nome de disciplina feitos à mão e utilitários de data redefinidos em vários componentes. A lógica de abrir aba nova com aviso de bloqueio também existe duas vezes. Quem incluir uma disciplina nova (ex.: Climatização) vai ter de mexer em vários lugares.
  evidencia: CATEGORIAS_PADRAO_MATERIAIS (Orcamento.js:137-142) é igual a CATEGORIAS_PADRAO (Materiais.js:24-29). NOME_DISC em ConflitosCompatibilizacao.js:11 (sem spda/solar/pressurizacao etc.) e MapaCad.js:19. `dataBr` em ComparativoFornecedores:13, FollowUpPropostas:11, NotasAReceber:13, VencimentosLaudos:20 e PixSemObra:11; `hojeIso` em VencimentosLaudos:19, Historico:92 e CronogramaObra:28. Abrir aba e mostrar 'O navegador bloqueou a aba' em Modelo3d.js:49-74 e LaudosProjetos.js:411-427.
  correcao_sugerida: Levar dataBr e hojeIso para utils/format.js, as categorias para um utils/categoriasMateriais.js (ou para o servidor), os nomes de disciplina para useDisciplinas, e criar um helper abrirEmAbaNova(gerarUrl, rotulo) em utils/download.js.
  esforco: horas
  verificado: false

- [baixa] frontend/src/pages/Historico.js:4
  id: FE-06
  categoria: lixo
  descricao: Pequeno lixo: um import sem uso, uma função exportada que nada usa e pastas de build antigas na produção que o .gitignore não cobre e que aparecem como untracked.
  evidencia: ESLint: 'X' is defined but never used (Historico.js:4). validarCpfCnpj (utils/format.js:88) não é usada fora do próprio arquivo: Clientes e Prestadores chamam validarCpf/validarCnpj direto. Na produção, C:\HM-Engenharia\hm-eng\frontend tem build-1.8.3-anterior … build-2.8.0-anterior (10 pastas, cerca de 42 MB, de 27/10 a 02/11), e o .gitignore só cobre frontend/build-novo/ e frontend/build-anterior/ (git status: '?? frontend/build-2.x.0-anterior/').
  correcao_sugerida: Tirar o import X e a função sem uso (ou passar a usá-la nos dois cadastros). Para as cópias de build, se forem pontos de volta de propósito, juntá-las em C:\HM-Engenharia\Backups ou incluir `frontend/build-*-anterior/` no .gitignore e guardar só as 2 últimas.
  esforco: minutos
  verificado: false

- [baixa] frontend/src/pages/Historico.js:426
  id: FE-07
  categoria: erro
  descricao: Acessibilidade: o detalhe da proposta e a abertura do laudo/projeto só funcionam pelo clique do mouse na linha (<tr onClick>), sem botão, link, tabIndex ou role. Quem usa teclado não consegue abrir o detalhe da proposta nem o registro. Em ListaObras isso não acontece, porque ela tem um <Link> no código.
  evidencia: Historico.js:426 `<tr ... onClick={() => abrirDetalhe(p.id)}>`; as ações da última coluna são só editar, link de aprovação e excluir. LaudosProjetos.js:598 `<tr key={item.id} onClick={() => abrir(item.id)}>`, e a célula de ações (linha 605) só tem 'Excluir'.
  correcao_sugerida: Colocar o número da proposta e o título do laudo dentro de um <button> ou <Link> (como em ListaObras.js:104), ou dar tabIndex=0 e onKeyDown (Enter) com role='button' à linha.
  esforco: minutos
  verificado: false

REFUTADOS: []


## integracao

- [alta] backend/src/mcp/assistenteFerramentas.mjs:435
  id: INT-01
  categoria: erro
  descricao: No assistente, gerar_orcamento com origem "itens" (proposta montada a partir de itens livres, sem PDF) sempre falha. A ferramenta lê o BDI e os impostos padrão em GET /api/configuracoes/padroes-orcamento, mas essa rota não está na lista ROTAS do escopo do assistente. O token do assistente recebe 403, a ferramenta devolve erro e a proposta não é criada. O problema existe desde a 2.10.0, que acrescentou essa leitura.
  evidencia: assistenteFerramentas.mjs:435 `const padroes = await api('GET', '/api/configuracoes/padroes-orcamento');`. middleware/escopoAssistente.js:43-85 (ROTAS) não tem '/configuracoes/padroes-orcamento'. Execução do middleware com essa rota: `403 {"erro":"O assistente não pode fazer isso sozinho. Use a ferramenta propor_acao...","codigo":"ASSISTENTE_NAO_PERMITIDO"}`. assistenteIntegracao.test.js só chama gerar_orcamento com origem 'analise' (linhas 209 e 232).
  correcao_sugerida: Incluir ['GET', '/configuracoes/padroes-orcamento'] em ROTAS de escopoAssistente.js (é só leitura, liberada a qualquer usuário logado). Acrescentar no assistenteIntegracao.test.js um caso com gerar_orcamento origem 'itens'.
  esforco: minutos
  verificado: true

- [media] backend/testes/assistente.test.js:165
  id: INT-02
  categoria: teste
  descricao: Falta no teste do assistente a conferência no sentido contrário: ele confere que toda rota liberada existe no roteador, mas não que toda rota chamada pelas ferramentas do MCP está liberada. Por isso o INT-01 passou. padroesOrcamento.test.js:76 confere só que o texto da rota aparece no arquivo do MCP.
  evidencia: assistente.test.js:165-175 ("rotas do token do assistente ... todas existem") percorre apenas rotasPermitidas(). padroesOrcamento.test.js:76: `assert.ok(src(f).includes('/api/configuracoes/padroes-orcamento'), f)`.
  correcao_sugerida: No assistente.test.js, extrair por regex os pares método + caminho das chamadas api('MÉTODO', `/api/...`) de assistenteFerramentas.mjs, trocar ${...} por :id e conferir cada um com rotasPermitidas(). Para query string, comparar só o caminho.
  esforco: horas
  verificado: true

- [media] backend/src/services/assistente/acoes.js:67
  id: INT-03
  categoria: conexao
  descricao: Quando o e-mail da proposta ou o link de aprovação sai pelo cartão do assistente ("Aplicar"), a conferência antes do envio (revisaoPreEnvio: total zerado, total diferente dos itens, itens a cotar, BDI 0 %, validade vencida) não aparece. Ela só é consultada pelo ModalEnviarEmail da tela, e o servidor não bloqueia o envio (comportamento documentado). Com isso, o caminho pelo assistente, que é a base do futuro canal externo, envia sem as travas que a tela mostra.
  evidencia: acoes.js:67-88 (enviar_email_proposta.preparar) e 89-97 (gerar_link_aprovacao) não chamam revisaoPreEnvio. O único uso de getRevisaoEnvio no frontend é components/ModalEnviarEmail.js:22. Plano (02/11): "O servidor NÃO bloqueia o envio (a conferência é da tela)". GET /propostas/:id/revisao-envio também não está nas ROTAS do escopo.
  correcao_sugerida: Em preparar() desses dois tipos, chamar services/revisaoPreEnvio.js, juntar ao resumo do cartão os bloqueios e avisos e recusar a ação (ErroAcao) quando houver bloqueio, a menos que o payload traga confirmação explícita. Conferir de novo em executar().
  esforco: horas
  verificado: true

- [media] backend/src/services/notasAReceber.js:174
  id: INT-04
  categoria: conexao
  descricao: Ligar um Pix a uma nota fiscal grava só financeiro_movimentos.nota_id. A obra que a nota já conhece (nota → proposta_id → propostas.obra_id) não vai para o Pix, e atribuicaoObras não usa esse vínculo como sugestão segura. O "recebido" e a margem da obra seguem sem esse dinheiro (o plano registra que, na produção, nenhum dos 701 Pix estava ligado a uma obra). A tela da obra também não mostra as notas emitidas (faturado).
  evidencia: notasAReceber.js:174 `UPDATE financeiro_movimentos SET nota_id = $1 WHERE id = $2 ...`. notasFiscaisController.js:773 faz o mesmo. `grep nota services/atribuicaoObras.js` não retorna nada. utils/obras.js:174-186: recebido vem dos movimentos ligados à obra e a_receber = orçado − recebido. controllers/obrasController.js não consulta notas_fiscais. pages/obras/DetalheObra.js não tem cartão de notas.
  correcao_sugerida: Ao ligar Pix ↔ nota, preencher obra_id do movimento quando ele estiver vazio e a proposta da nota tiver obra; incluir esse vínculo como sinal em atribuicaoObras. No detalhe da obra, somar 'faturado' (notas emitidas das propostas da obra) e mostrar faturado − recebido.
  esforco: horas
  verificado: true

- [baixa] backend/src/mcp/mcpServer.mjs:252
  id: INT-05
  categoria: redundancia
  descricao: O MCP do Claude Desktop (hm-orcamentos) reimplementa ferramentas que o assistente já tem (buscar material, histórico de preço, analisar, criar rascunho) e ficou desatualizado. analisar_projeto aceita só PDF de até 15 MB e não liga a análise à obra, enquanto a tela e o assistente aceitam PDF, DWG e DXF de até 40 MB e passam obra_id. O comentário em regras.js ainda diz que os 15 MB são "o mesmo limite do upload da tela". As pastas permitidas não incluem PASTA_CLIENTES quando a pasta dos clientes é a do servidor de rede, que é onde o monitor de pastas avisa que chegou projeto novo.
  evidencia: mcpServer.mjs:254 'Analisar projeto (PDF)' e form só com application/pdf. regras.js:17 `const TAMANHO_MAX_PDF = 15 * 1024 * 1024; // o mesmo limite do upload da tela`. routes/index.js:38-39 com fileSize 40 MB e comentário de DWG/DXF. assistenteFerramentas.mjs:269-290 (analisar_arquivo PDF/DWG/DXF com obra_id). regras.js:21-28 (pastas permitidas sem PASTA_CLIENTES).
  correcao_sugerida: Fazer o mcpServer.mjs registrar as mesmas definirFerramentas() de assistenteFerramentas.mjs, com uma api() que usa o login do usuário dedicado, e manter à parte só o que é exclusivo do Desktop (salvar_pesquisa_mercado, caminho de arquivo local). Enquanto isso não for feito: aceitar .dwg/.dxf, limite de 40 MB, parâmetro obra_id e PASTA_CLIENTES nas pastas permitidas.
  esforco: dias
  verificado: true

- [media] backend/src/mcp/mcpServer.mjs:35
  id: INT-06
  categoria: seguranca
  descricao: No ambiente de teste, o MCP do Claude Desktop/Code aponta para a produção. O endereço padrão é http://localhost:3001 e ignora o PORT do .env. No v2, PORT=3002 e MCP_API_URL está vazio, e o .mcp.json da raiz do v2 registra esse servidor. Hoje o login falha porque MCP_LOGIN_EMAIL não está definido no v2, mas basta preencher as credenciais para analisar_projeto, criar_rascunho_proposta e salvar_pesquisa_mercado gravarem no banco de produção a partir de uma sessão do teste. O MCP do assistente usa PORT corretamente (services/assistente/config.js:36).
  evidencia: mcpServer.mjs:35 `const API_URL = process.env.MCP_API_URL || 'http://localhost:3001';`. Em hm-eng-v2/backend/.env: `PORT=3002` e `MCP_API_URL=` (vazio). hm-eng-v2/.mcp.json: hm-orcamentos → backend/src/mcp/mcpServer.mjs.
  correcao_sugerida: Usar `process.env.MCP_API_URL || `http://localhost:${process.env.PORT || 3001}``, como faz o assistente, e definir MCP_API_URL=http://localhost:3002 no .env do v2.
  esforco: minutos
  verificado: true

- [baixa] backend/src/mcp/mcpServer.mjs:322
  id: INT-07
  categoria: precisao
  descricao: A descrição de enriquecer_analise_projeto diz "Não substitui nada do que a análise já tem; só acrescenta", mas o PUT /projetos/analises/:id troca a lista inteira de pontos_por_disciplina e o funcionamento (COALESCE com o valor novo). O que estava lá, inclusive o que o usuário editou na tela, é sobrescrito. O PUT também vai sem versao, ou seja, sem controle de conflito.
  evidencia: controllers/projetos/analises.js:300-301 `funcionamento = COALESCE($4, funcionamento), pontos_por_disciplina = COALESCE($5::jsonb, pontos_por_disciplina)`. mcpServer.mjs:344-346 manda só { funcionamento, pontos_por_disciplina }.
  correcao_sugerida: No MCP, fazer GET da análise, mesclar por disciplina e mandar o resultado com versao; ou corrigir a descrição para "substitui".
  esforco: minutos
  verificado: false

- [baixa] backend/src/controllers/assistenteController.js:246
  id: INT-08
  categoria: seguranca
  descricao: Ação pendente do assistente não tem prazo e não é conferida de novo ao aplicar. O cartão mostra o estado do momento em que foi preparada (ex.: total da proposta no resumo), e o "Aplicar" dias depois executa sobre o estado atual. Um e-mail pode sair com o PDF de um total diferente do que o usuário leu no cartão. O status 'falhou' existe no CHECK da tabela, mas o código nunca o usa (a falha deixa a ação 'pendente').
  evidencia: migração 2.0-15-assistente.js:80-95 (assistente_acoes sem coluna de prazo e com CHECK incluindo 'falhou'). assistenteController.js:246-271 (aplicarAcao chama executarAcao direto, sem preparar de novo). acoes.js:28 (rotuloProposta inclui o total no resumo).
  correcao_sugerida: Acrescentar expira_em (ex.: 24 h) e, em aplicarAcao, rodar preparar() de novo e recusar se o resumo mudou (pedir nova confirmação). Usar 'falhou' ou retirá-lo do CHECK. Isso é pré-requisito para confirmar ações por WhatsApp.
  esforco: horas
  verificado: false

- [baixa] backend/src/services/rotinas.js:5
  id: INT-09
  categoria: lixo
  descricao: A documentação das rotinas está desatualizada. O cabeçalho lista 3 rotinas, mas existem 6. A rotina 'vencimentos' ainda se chama "Laudos a vencer" e a descrição não fala dos documentos da empresa nem do certificado A1 (o e-mail já se chama "Vencimentos a renovar"). O log de instância desligada diz que só e-mail de notas, Pix e cotações deixam de rodar, mas também param SINAPI, vencimentos e o resumo de erros.
  evidencia: rotinas.js:5-7 (só notas-email, pix-email, fornecedores-pastas); rotinas.js:101-102 (nome 'Laudos a vencer'); rotinas.js:259 (mensagem do log). testes/rotinas.test.js:151 confirma as 6 chaves.
  correcao_sugerida: Atualizar o cabeçalho, o nome e a descrição da rotina 'vencimentos' ("Vencimentos a renovar") e a mensagem do log.
  esforco: minutos
  verificado: false

- [baixa] backend/src/services/email/smtp.js:11
  id: INT-10
  categoria: conexao
  descricao: O envio de e-mail (propostas, notas, atestados, avisos de vencimento e de erro, monitor de saúde) usa smtp.gmail.com fixo, enquanto a leitura usa EMAIL_IMAP_HOST, que é configurável. Se o provedor mudar, toda a saída de e-mail para, e também qualquer canal futuro que responda por e-mail.
  evidencia: smtp.js:11 `host: 'smtp.gmail.com', port: 465`. imap.js:18 `host: process.env.EMAIL_IMAP_HOST`.
  correcao_sugerida: Ler EMAIL_SMTP_HOST e EMAIL_SMTP_PORT do .env, com smtp.gmail.com:465 como padrão.
  esforco: minutos
  verificado: false

REFUTADOS: []


## lixo-operacao

- [media] backend/src/mcp/mcpServer.mjs:35
  id: OP-01
  categoria: conexao
  descricao: No ambiente de teste, o servidor MCP hm-orcamentos (registrado no .mcp.json da raiz do v2) fala com a API de PRODUÇÃO. O .env do v2 tem MCP_API_URL com valor vazio, e o código cai no padrão fixo http://localhost:3001 em vez de usar o PORT do .env (3002). Ferramentas que gravam (criar_rascunho_proposta, analisar_projeto, salvar_pesquisa_mercado, enriquecer_analise_projeto), usadas numa sessão do Claude Code aberta em hm-eng-v2, gravam no banco hm_orcamentos de produção. O assistente faz isso certo: services/assistente/config.js:37 usa env.PORT.
  evidencia: mcpServer.mjs:33 `dotenv.config({ path: ...'..','..','.env' })`; :35 `const API_URL = process.env.MCP_API_URL || 'http://localhost:3001';`. No .env do v2: linha 18 `MCP_API_URL=` com valor de comprimento 0 e `PORT=3002`. .mcp.json do v2: `"args": ["backend/src/mcp/mcpServer.mjs"]`.
  correcao_sugerida: Trocar o padrão para `process.env.MCP_API_URL || `http://localhost:${process.env.PORT || 3001}`` (igual a assistente/config.js) e preencher MCP_API_URL=http://localhost:3002 no .env do v2. Opcional: no início, logar a URL e o DB_NAME usados.
  esforco: minutos
  verificado: true

- [media] frontend/cypress.config.js:5
  id: OP-02
  categoria: conexao
  descricao: No v2, a suíte Cypress e o modo de desenvolvimento apontam por padrão para a produção (3001). Os specs criam clientes, materiais, propostas, usuários e contratos (02_clientes digita 'Responsável Cypress', CNPJ 11.222.333/0001-81 etc.). Quem rodar `npx cypress run` no v2 sem `--config baseUrl=http://localhost:3002` (exigência que só está numa linha do RESUMO) grava dados de teste no banco de produção. O `npm start` do v2 também manda a API para a produção, pelo proxy do package.json. O iniciar.bat do v2 só testa a porta 3001 e abre a produção.
  evidencia: cypress.config.js:5 `baseUrl: 'http://localhost:3001'`; frontend/package.json:19 `"proxy": "http://localhost:3001"`; iniciar.bat:9 e :13 com 3001 fixo; RESUMO:283 `--config baseUrl=http://localhost:3002`.
  correcao_sugerida: Ler a porta do backend/.env no cypress.config.js (ou usar CYPRESS_BASE_URL) e falhar se o DB_NAME não for hm_orcamentos_v2, como o pre-deploy já faz com os testes de banco. No v2, trocar o proxy por um setupProxy.js que leia o PORT. Fazer o iniciar.bat ler o PORT, como o reiniciar.ps1 faz.
  esforco: horas
  verificado: true

- [baixa] .gitignore:2
  id: OP-03
  categoria: lixo
  descricao: O padrão `build/` não cobre as cópias de rollback `frontend/build-X.Y.Z-anterior/`, que se acumulam a cada instalação na produção. O enviar-para-github.bat faz `git add -A` e commita tudo: rodado na produção, subiria 130 arquivos de build minificado (cerca de 43 MB) e o atalho .lnk antigo para o GitHub. A pasta frontend/cypress/reports/ (gerada pelo reporter mochawesome) também não é ignorada e aparece como não rastreada no v2.
  evidencia: `git check-ignore -v frontend/build-2.8.0-anterior/index.html` → exit 1 (não ignorado); `git status --porcelain --untracked-files=all | grep -c build-.*-anterior` = 130. git status da produção mostra `?? frontend/build-1.8.3-anterior/` … `build-2.8.0-anterior/` e `?? "HM Engenharia - Sistema (atalho antigo da Inicializacao).lnk"`. enviar-para-github.bat:16 `git add -A`. v2: `?? frontend/cypress/reports/`.
  correcao_sugerida: Acrescentar ao .gitignore `frontend/build-*/`, `frontend/cypress/reports/` e `*.lnk`. No enviar-para-github.bat, mostrar `git status --short` e recusar se houver arquivos com mais de N MB ou caminhos build-*.
  esforco: minutos
  verificado: true

- [media] frontend/package.json:14
  id: OP-04
  categoria: teste
  descricao: Os 15 arquivos de teste Jest do frontend (113 testes: dinheiro, download, sessão, app de campo, FollowUp, NotasAReceber, Vencimentos, Modal etc.) não estão em nenhum script. O package.json não tem 'test', e o backend/scripts/pre-deploy.js (npm test do backend) só roda backend/testes. Os testes passam hoje, mas nada impede que quebrem sem ninguém ver antes de instalar.
  evidencia: Scripts do frontend: só start, build e build:direto. `npm test` → 'npm error Missing script: "test"'. Rodando `CI=true react-scripts test --watchAll=false` → 'Test Suites: 15 passed, 15 total / Tests: 113 passed'. pre-deploy.js:16 `PASTA_TESTES = path.join(__dirname, '..', 'testes')`.
  correcao_sugerida: Adicionar `"test": "react-scripts test"` e `"test:ci": "cross-env CI=true react-scripts test --watchAll=false"` (ou equivalente no Windows) e chamar esse passo no pre-deploy.js ou no atualizar-sistema.bat, junto com `npm test` das skills.
  esforco: minutos
  verificado: true

- [media] docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md:621
  id: OP-05
  categoria: conexao
  descricao: O ramo versao-2.0 (o v2) nunca recebe de volta os commits 'Versão X.Y.Z' feitos na main. O ambiente de teste se diz 2.10.0 enquanto a produção é 2.26.0, e o RESUMO do v2, que o CLAUDE.md manda ler primeiro, não traz as entradas da 2.11 à 2.26 (161 linhas). Uma sessão trabalhando no v2 lê um histórico incompleto, e o /health do teste mostra uma versão que não corresponde ao código, que já tem as migrações até a 2.0-38.
  evidencia: `git diff --stat versao-2.0 main` → backend/package.json, frontend/package.json, os dois locks e `docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md | 161 +++`. main: `"version": "2.26.0"`; v2: `"version": "2.10.0"`. O RESUMO do v2 termina em '### 02/11/2026: versão 2.10.0'. server.js:14 expõe VERSAO do package.json no /health.
  correcao_sugerida: Depois de cada 'Versão X' na main, fazer `git merge main` no versao-2.0 (são só fast-forwards de package.json e docs) ou mudar o fluxo para bump e entrada no RESUMO no próprio versao-2.0 antes do merge.
  esforco: minutos
  verificado: true

- [baixa] docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md:43
  id: OP-06
  categoria: precisao
  descricao: A seção 1 (Arquitetura atual) contradiz o código. Diz que o backend 'ainda não tem testes automatizados (npm test)' e que o Cypress é '01..10 (43 testes)', e lista 18 tabelas. Hoje há 62 arquivos backend/testes/*.test.js rodados por `npm test` (pre-deploy.js), 14 specs Cypress e 65 CREATE TABLE. A frase manda começar por `calculoEletrico.js`, que não existe (a elétrica virou skills/eletrica, como a própria seção 4 diz).
  evidencia: RESUMO:43 'O backend ainda **não** tem testes automatizados (`npm test`); o passo 2 da seção 4 propõe começar por `calculoEletrico.js`.' `ls backend/testes/*.test.js | wc -l` = 62; `ls frontend/cypress/e2e` = 14 specs; `grep -rhoiE 'CREATE TABLE IF NOT EXISTS [a-z_]+' src/models | sort -u | wc -l` = 65; `find -name calculoEletrico*` → nada.
  correcao_sugerida: Reescrever a seção 1 com o estado real: testes do backend, das skills, do frontend (Jest) e do Cypress, e apontar para o schema/migrações em vez de listar tabelas.
  esforco: minutos
  verificado: false

- [baixa] README.md:4
  id: OP-07
  categoria: precisao
  descricao: O README de instalação está desatualizado em dois pontos. Pede 'Node.js 18+', mas puppeteer 25 exige Node >=22.12 e pdfjs-dist, pdf-parse, nodemailer e libredwg-web exigem >=20; nenhum package.json declara engines. Ensina também `JWT_SECRET=hm_eng_secret_2024_mude_isso` (28 caracteres), que o backend recusa ao subir (mínimo de 32): uma instalação nova seguindo o README não sobe.
  evidencia: README.md:4 '- Node.js 18+ instalado'; README.md:31 `JWT_SECRET=hm_eng_secret_2024_mude_isso`; config/segredos.js:16 `if (!JWT_SECRET || JWT_SECRET.trim().length < 32) { ... process.exit(1)`; `echo -n hm_eng_secret_2024_mude_isso | wc -c` = 28; engines do puppeteer: '>=22.12.0'.
  correcao_sugerida: README: 'Node.js 22.12+' e o comando de geração do segredo (o mesmo de segredos.js). Declarar `"engines": {"node": ">=22.12"}` nos três package.json.
  esforco: minutos
  verificado: false

- [baixa] skills/quadros/SKILL.md:2
  id: OP-08
  categoria: conexao
  descricao: A skill quadros-nbr61439 (pasta skills/quadros) está 'Pronta' na seção 3.1 do RESUMO, que diz que as skills 'são ligadas em %USERPROFILE%\.claude\skills\', mas é a única sem junction. O Claude Code não a enxerga: ela não aparece entre as skills disponíveis, embora as outras 17 apareçam.
  evidencia: Get-ChildItem $env:USERPROFILE\.claude\skills → 17 junctions para hm-eng\skills\* (alarme … telefonia, solar), nenhuma para skills\quadros. RESUMO:534 'são ligadas em `%USERPROFILE%\.claude\skills\`'; RESUMO:556 '`quadros-nbr61439` (pasta `quadros`) | **Pronta (29/10/2026)**'.
  correcao_sugerida: Criar a junction `mklink /J %USERPROFILE%\.claude\skills\quadros-nbr61439 C:\HM-Engenharia\hm-eng\skills\quadros` e ter um script (ex.: skills/ligar-skills.ps1) que crie todas a partir do registro skills/_comum/disciplinas.js, para não esquecer as próximas (HVAC, iluminação 3D).
  esforco: minutos
  verificado: false

- [baixa] frontend/src/components/NotasAReceber.js:13
  id: OP-09
  categoria: redundancia
  descricao: Helpers de formatação copiados apesar de já existirem módulos únicos. No frontend, `dataBr` está redefinido em 5 arquivos e `moeda` em 2, embora utils/format.js tenha formatarData e formatarMoeda. No backend, `semAcento` está redefinida em utils/textoAtestado.js e em mcp/assistenteFerramentas.mjs, embora utils/texto.js diga que é 'um lugar só'. O `esc` de XML está duplicado em atestadoCapacidade.js e nfseNacional.js. Não há bug hoje, mas as variantes já divergem (a de VencimentosLaudos.js:20 quebra com valor nulo; as outras tratam).
  evidencia: `const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '')` em ComparativoFornecedores.js:13, FollowUpPropostas.js:11, NotasAReceber.js:13, PixSemObra.js:11; VencimentosLaudos.js:20 `const dataBr = (iso) => iso.split('-').reverse().join('/')` (sem nulo). textoAtestado.js:7 `const semAcento = ...` × utils/texto.js:1-7 ('um lugar só'). atestadoCapacidade.js:294 e nfseNacional.js:25 com `esc` idênticos.
  correcao_sugerida: Exportar `dataIsoBr` em frontend/src/utils/format.js e trocar as 5 cópias; no backend, importar semAcento de utils/texto.js e mover `esc` de XML para utils/xml.js.
  esforco: horas
  verificado: false

- [baixa] frontend/package.json:34
  id: OP-10
  categoria: lixo
  descricao: Duas devDependencies sem nenhum uso: mochawesome-merge e mochawesome-report-generator (nenhum script as chama; só o reporter 'mochawesome' é usado em cypress.config.js).
  evidencia: grep por 'mochawesome-merge' e 'marge' fora de node_modules e locks: só aparecem em frontend/package.json. cypress.config.js:9 `reporter: 'mochawesome'` com `html: false, json: true`.
  correcao_sugerida: Remover as duas ou criar o script `relatorio:cypress` que as use (merge + HTML).
  esforco: minutos
  verificado: false

- [baixa] backend/src/assets/logo.png:undefined
  id: OP-11
  categoria: redundancia
  descricao: A identidade visual está versionada em várias cópias binárias idênticas: logo.png em 3 lugares e cabecalho.png em 2 (cerca de 1,2 MB duplicado no git). Trocar o timbrado exige lembrar de todas as cópias.
  evidencia: md5 f03f1b92… em backend/src/assets/logo.png, frontend/public/logo.png e skills/_comum/assets/logo.png (198.778 bytes cada); md5 662e9506… em backend/src/assets/cabecalho.png e skills/_comum/assets/cabecalho.png (606.818 bytes cada).
  correcao_sugerida: Fonte única em skills/_comum/assets (já usada por empresa.js). O backend lê de lá por config/caminhos.js, e o frontend copia no build (prebuild) ou fica com a sua, com um teste de hash igual ao de bdiCurvaAbc.test.js:154.
  esforco: horas
  verificado: false

- [baixa] backend/scripts/backup-db.ps1:72
  id: OP-12
  categoria: lixo
  descricao: Na produção (só listado), backups e builds antigos se acumulam dentro da pasta do código. backend/backups tem 60 dumps (175 MB), 21 deles só em 02/11/2026, um por instalação; o dump cresceu de 0,19 MB (27/10) para 8,4 MB (02/11). A retenção é só por idade (30 dias), então um dia de muitas instalações guarda 20 cópias quase iguais por um mês. Somam-se cerca de 43 MB de frontend/build-*-anterior e as pastas Orçamentos V13–V15, Projetos recebidos clientes e projetos-recebidos (cerca de 34 MB de dados de clientes na raiz do repositório, ignoradas pelo git).
  evidencia: `ls hm-eng/backend/backups | wc -l` = 60; `grep -c 2026-11-02` = 21; `du -sh hm-eng/backend/backups` = 175M; tamanhos: hm_orcamentos_2026-10-27_02-00.dump 193.902 B × hm_orcamentos_2026-11-02_19-49.dump 8.416.460 B. backup-db.ps1:72-74 `Where-Object { ... LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item`.
  correcao_sugerida: Retenção em camadas (os últimos 7 diários, 1 por semana por 2 meses e no máximo N dumps de instalação por dia) e um script `limpar-builds-anteriores` que guarde só os 2 mais recentes. Também vale medir qual tabela fez o dump crescer 40× (provável: JSON do modelo 3D ou das análises) antes da grande implementação de 3D.
  esforco: horas
  verificado: false

REFUTADOS: []
