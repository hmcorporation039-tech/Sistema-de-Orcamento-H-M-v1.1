# Sistema de Orçamentos H&M — Resumo das melhorias e guia de implantação

> Documento de referência para continuar o desenvolvimento no VS Code, nesta máquina (`laboratorio`).
> Gerado em 10/10/2026 e atualizado no mesmo dia com a v1.6.0 e a v1.6.1. Pasta do sistema: `C:\HM-Engenharia\hm-eng`. Repositório: `hmcorporation039-tech/Sistema-de-Orcamento-H-M-v1.1`.

---

## 0. Antes de mexer em qualquer coisa

| Item | Onde está |
|---|---|
| Backup completo do código e da configuração antes desta etapa | `C:\HM-Engenharia\Backups\hm-eng_backup_2026-10-10.zip`. O passo a passo para restaurar está em `LEIA-ME_RESTAURAR.txt`, dentro do zip |
| Dump diário automático do banco | `backend\backups\hm_orcamentos_AAAA-MM-DD_HH-MM.sql.zip`, gerado por `backend\scripts\backup-db.ps1` |
| Cópia do código no servidor de backup | `\\MARCIO-SERVER\Arquivos Gerais 2\H&M\Projeto do sistema de orçamentos\Backups\Codigo` (robocopy espelhado, sem `.env`, PDFs e `node_modules`) |
| Enviar ao GitHub as alterações do PC | `enviar-para-github.bat`, na raiz do projeto. Mostra o que mudou, pede a mensagem do commit e faz o push |
| Atualizar dependências e gerar o build | `atualizar-sistema.bat` |
| Reiniciar o backend (porta 3001) depois de mudar o código | `reiniciar-backend.bat`. Pede permissão de administrador sozinho, porque o backend de produção roda elevado |

**Regra importante:** o PC (produção) é a fonte da verdade. Em 10/10/2026 o GitHub foi sincronizado com o PC (versão 1.6.0, tag `v1.6.0`). Antes de qualquer `git reset` ou `git checkout`, confira com `git status` se não há alteração local ainda não enviada.

**Fluxo de implantação de cada mudança:**
1. Editar em `backend/src` ou `frontend/src`.
2. Para mudanças no backend, rodar `reiniciar-backend.bat` (aceitar o pedido de administrador). Os ajustes de schema rodam sozinhos no boot, via `models/schema.js` (`ALTER TABLE ... IF NOT EXISTS`).
3. Para mudanças no frontend, rodar `cd frontend && npm run build`. O backend serve o build na porta 3001.
4. Recarregar o navegador com Ctrl+F5.
5. Fazer o commit em português, descrevendo o "porquê", no mesmo padrão dos commits existentes, e depois o push (ou rodar `enviar-para-github.bat`).
6. Atualizar a versão em `backend/src/server.js` (`/health`) e nos dois `package.json`, criar a tag `vX.Y.Z` e copiar o código para o servidor de backup.

---

## 1. Arquitetura atual

- **Backend:** Node.js + Express (`backend/src/server.js`) e PostgreSQL (`hm_orcamentos`), com autenticação JWT.
  - Organização: `routes/index.js` → `controllers/*` → `utils/*` e `services/*`.
  - O schema é criado e migrado de forma idempotente em `models/schema.js`.
- **Frontend:** React (CRA). Páginas em `frontend/src/pages`, chamadas de API em `frontend/src/services/api.js` e login em `hooks/useAuth.js`.
- **Produção:** um único processo. O backend serve a API e o build do React em `http://localhost:3001` e sobe sozinho quando o Windows faz login (`scripts/iniciar-producao.ps1`).
- **IA:**
  - Versão 2.0: módulo único `utils/ia.js` com uma cadeia só, na ordem Claude Max (CLI `claude -p` isolada) → Claude via API → Gemini (`IA_ORDEM` troca a ordem). Painel em Administração › Integrações (`GET /integracoes/rotinas`, `POST /integracoes/ia/testar`).
  - Gemini (`utils/geminiClient.js`, transporte usado por `ia.js`), com troca para um modelo alternativo quando a cota estoura.
  - Claude Desktop via servidor MCP: é o caminho recomendado, porque não gasta cota.
- **Tabelas:** usuarios, clientes, materiais, mao_de_obra_itens, propostas, proposta_secoes, proposta_itens, proposta_eventos, analises_projeto, precos_mao_de_obra_referencia, pesquisas_mercado, configuracoes, emails_processados, notas_processadas, arquivos_fornecedores_processados, prestadores, contratos, financeiro_movimentos.
- **Testes:** Cypress E2E em `frontend/cypress/e2e/01..10` (43 testes), cobrindo login, clientes, materiais, orçamento/histórico, usuários, dashboard, relatórios, financeiro, prestadores e contratos. O backend ainda **não** tem testes automatizados (`npm test`); o passo 2 da seção 4 propõe começar por `calculoEletrico.js`.
- **Tarefas automáticas** (`server.js`), todas às **06:00 e às 18:00** (hora do PC): notas fiscais por e-mail, Pix por e-mail e leitura das pastas de orçamentos de fornecedores. Fora desses horários, use os botões "Verificar agora" em Materiais e Financeiro. Se o PC estiver desligado no horário, aquela leitura é pulada.

---

## 2. Linha do tempo do que já foi implementado

### v1.0 → v1.5 (20/07 a 31/08/2026): base do sistema
- Cadastro de clientes, materiais, usuários (com papéis), propostas com seções e itens, histórico e duplicação.
- PDF profissional da proposta, com cabeçalho e logo (`utils/pdfTemplate.js` + Puppeteer) e envio por e-mail (SMTP).
- Dashboard e relatórios por período, em PDF e CSV.
- **Financeiro Pix:** importação automática por e-mail e lançamento manual.
- **Prestadores de serviço**, com vínculo automático ao Financeiro.
- **Contratos de prestação de serviço**, gerados automaticamente, editáveis, com código de registro. O PDF sai com o nome do contratado.
- Imposto de serviços com padrão de 6%, BDI e impostos de venda e serviço na proposta.

### 11 a 12/09/2026: orçamento inteligente e fornecedores
- Itens do orçamento com **subgrupo** e **status** (confirmado / a cotar), além de subgrupos padrão sugeridos.
- **Importação automática de cotações de fornecedores em PDF.** O sistema monitora a pasta local e a pasta de rede (na época, a cada 15 minutos; desde a v1.6.1, às 06:00 e às 18:00).
  - Parsers dedicados: **SOL Atacadista**, **Dispel Eletrônica** (grava também o código do fornecedor) e **BAND Tecnologia**.
  - Implementação em `utils/cotacaoFornecedorParser.js` e `services/cotacaoFornecedorService.js`.
- Categorias de materiais em dropdown, com uma lista padrão.
- **Análise de Projeto (compatibilização) a partir de PDF.**
  - Arquivos: `utils/projetoParser.js`, `utils/compatibilizacaoAnalise.js` e `pages/AnaliseProjeto.js`.
  - Estrutura completa de cabeamento, CFTV e alarme.
  - Extração de pontos de **rede (R)**, **antena/TV (A)** e **câmeras (CAM)** por código (regex).
  - Extração de equipamentos por IA e **pesquisa de mercado** (Gemini, com fallback para o Claude).

### 13/09/2026: QA em 7 fases e evolução da Análise de Projeto
- **QA Fases 1 a 7:**
  1. Segurança de acesso.
  2. Estabilidade: o processo não cai por erro isolado (`middleware/erros.js`).
  3. Totais de faturamento confiáveis (`utils/calculoProposta.js`, `utils/validacaoProposta.js`).
  4. Revogação de acesso e posse de registros (`middleware/posse.js`), com áreas só para admin.
  5. Proteção do catálogo e dos jobs automáticos.
  6. Análise de Projeto confiável.
  7. Escape de HTML nos documentos e desempenho do banco.
- Nova conta de admin, com troca de senha obrigatória no primeiro acesso (`pages/DefinirSenha.js`).
- Análise de Projeto:
  - **Disciplinas selecionáveis**, com uma disciplina por arquivo (`utils/disciplinasProjeto.js`).
  - Itens reais de Elétrica e Iluminação, persistência e autosave.
  - **Pontos por ambiente** por proximidade geométrica no PDF (`utils/pontosPorAmbiente.js`), validados contra a planilha `Orcamento_Definitivo_CRH.xlsx`: os totais batem e a distribuição por sala é aproximada.
  - Resumo no estilo Excel.
  - **Relatório de compatibilização** (`utils/relatorioCompatibilizacaoTemplate.js`), que identifica cada ponto coletado.
  - **Gerar orçamento provisório** a partir da análise (`POST /projetos/analises/:id/gerar-orcamento`).
- **Preço de referência de mão de obra** (`utils/precosMaoDeObraReferencia.js` e a tela `PrecosMaoDeObra.js`). É uma sugestão editável, nunca definitiva. Há também pesquisa de mercado para itens de serviço.
- **Servidor MCP `hm-orcamentos`** (ver a seção 3).

### 14/09/2026: refinamentos do orçamento
- Valor unitário em formato de moeda (`components/CampoMoeda.js`) e **subtotal por subgrupo**, com organização automática da lista.
- **Ajuste Geral** (+% / −%), que reescreve o valor unitário real de todos os itens.
- O e-mail da proposta sempre leva a assinatura padrão da empresa e já vem preenchido com o e-mail do cliente.
- **Auto-cadastro de material novo no catálogo** (`utils/catalogoAutoCadastro.js`) e sugestão de itens de mão de obra já usados.
- Correção da leitura de cotações da SOL Atacadista, que antes reconhecia 0 itens.

### Até 02/10/2026: alterações feitas direto no PC (enviadas ao GitHub na v1.6.0, em 10/10)

| Área | O que mudou | Arquivos |
|---|---|---|
| **Proposta: Escopo × Observações** | O antigo campo "Observações", exibido após a saudação, era na verdade o **escopo**. A coluna foi renomeada `observacoes → escopo` por migração idempotente, e foi criado um novo campo `observacoes` (notas gerais), exibido após as condições de pagamento. No PDF, os dois aparecem como blocos destacados com barra dourada. | `models/schema.js`, `controllers/propostasController.js`, `controllers/projetosController.js`, `utils/pdfTemplate.js`, `pages/Orcamento.js` |
| **Orçamento: Categoria** | Nas seções de **Materiais**, o "Subgrupo" virou **Categoria**, com as mesmas opções do cadastro de Materiais. O item herda a categoria do material do catálogo. As seções de Mão de Obra continuam com subgrupos livres. | `pages/Orcamento.js` |
| **Fornecedores: verificar agora** | Botão que dispara na hora a leitura da pasta de cotações, sem esperar o ciclo automático. | `controllers/materiaisController.js`, `routes/index.js` (`POST /materiais/fornecedores/verificar-agora`), `services/api.js`, `pages/Materiais.js` |
| **Análise de Projeto: enriquecimento** | Novos campos `funcionamento` (TEXT) e `pontos_por_disciplina` (JSONB) em `analises_projeto`, preenchidos pelo Claude Desktop a partir da leitura visual do PDF. Também são editáveis na tela e aparecem no relatório de compatibilização. **São tratadas só as disciplinas selecionadas.** | `models/schema.js`, `controllers/projetosController.js`, `pages/AnaliseProjeto.js`, `utils/relatorioCompatibilizacaoTemplate.js` |
| **Análise: certificação de pontos** | O item "Certificação e etiquetagem" só entra se **rede** ou **CFTV** estiverem selecionados, e deixou de citar telefonia. | `utils/compatibilizacaoAnalise.js` |
| **Pesquisa de mercado salva pelo Claude** | `POST /pesquisa-mercado/salvar` grava uma pesquisa feita pelo próprio Claude Desktop, sem cota de API. Ela entra no cache de 48h e no histórico. Na tela, o resultado fica recolhível (recolhido ao reabrir uma análise). | `controllers/pesquisaMercadoController.js`, `utils/pesquisaMercadoService.js`, `routes/index.js`, `pages/AnaliseProjeto.js` |
| **Login sincronizado entre abas** | Sair ou entrar numa aba reflete nas outras, via evento `storage`. | `hooks/useAuth.js` |
| **Script** | `reiniciar-backend.bat`: para o processo da porta 3001 e sobe o backend oculto, com checagem de `/health`. | raiz |

### 10/10/2026: v1.6.0 (auditoria completa) e v1.6.1

**v1.6.0.** Auditoria antes da publicação: Cypress 43/43, 61 testes de segurança e 16 checagens de integridade do banco, todos aprovados. Correções que saíram dela:

| Área | O que mudou | Arquivos |
|---|---|---|
| **Salvar proposta** | A proposta deixava de salvar ("valor é muito longo para tipo character varying(300)") quando um item tinha descrição longa: o auto-cadastro tentava gravá-la no catálogo (limite de 300 caracteres). Agora descrições longas ficam só na proposta. | `utils/catalogoAutoCadastro.js` |
| **Fornecedores sem duplicar** | O botão "Verificar agora" e o ciclo automático podiam rodar juntos e cadastrar o mesmo material duas vezes. Agora quem chega durante uma varredura recebe o resultado dela. | `services/cotacaoFornecedorService.js` |
| **"+ catálogo" vazio** | Itens antigos, cujo subgrupo não bate com nenhuma categoria do catálogo, mostravam a lista vazia. Agora a comparação ignora maiúsculas e, sem correspondência, mostra o catálogo inteiro. | `pages/Orcamento.js` |
| **ID gigante** | Um ID acima do limite do banco gerava erro 500. Agora responde 400. | `middleware/validarId.js` |
| **Análise: validação** | `funcionamento` e `pontos_por_disciplina` passaram a ser validados no servidor. | `controllers/projetosController.js` |
| **Testes Cypress** | Atualizados para a Categoria em lista, a senha provisória e a lista paginada de materiais. | `cypress/e2e/03`, `05` |

**v1.6.1.** As leituras automáticas (notas e Pix por e-mail e as pastas de fornecedores) deixaram de rodar a cada 15 minutos / 8 horas e passaram a rodar só às **06:00 e às 18:00**. Também deixaram de rodar logo ao ligar o backend. Os scripts `reiniciar-backend.bat` (pede administrador sozinho), `enviar-para-github.bat` (reutilizável) e `atualizar-sistema.bat` foram ajustados. Arquivos: `server.js`, `pages/Materiais.js` e os `.bat` da raiz.

**v1.7.0 — orçamentos de fornecedor em qualquer layout (pasta e e-mail), 10/10/2026.**

- **Leitura** (`utils/leitorCotacao.js`), da mais barata para a mais cara:
  1. layouts conhecidos (`cotacaoFornecedorParser.js`: ADM/SOL/DF Atacadista, Dispel, BAND, ECO Automação);
  2. **leitor universal** (`leitorCotacaoUniversal.js`): acha em cada linha o trio quantidade × unitário = total, monta a descrição (também quebrada em várias linhas ou em blocos) e confere a soma com o total impresso. Sozinho, leu os 28 PDFs reais da pasta com as mesmas 587 descrições dos leitores específicos, e todos conferiram com o total;
  3. **OCR local** (tesseract.js, português embutido) para PDF escaneado e foto PNG/JPG;
  4. **IA**, só para documentos com cara de lista de preços que o local não leu (`leitorCotacaoIA.js`). Ordem pedida pelo usuário: **Claude pela assinatura Claude Max** (Claude Code `claude -p`, modelo Sonnet, sem crédito de API) → Claude pela API (se houver crédito) → Gemini como complemento.
- **Proteções:**
  - item só entra com a conta fechando;
  - leitura por OCR ou IA só entra se a soma bater com um total do documento, ou se OCR e IA concordarem;
  - propostas da própria H&M são ignoradas;
  - no e-mail, o documento precisa estar endereçado à H&M (separa cotação de carta-convite, RFQ e planilha de licitação);
  - imagens de assinatura não gastam IA;
  - limite de 15 leituras por IA por varredura.
- **Catálogo** (`services/catalogoMateriais.js`): cadastra automaticamente **só materiais novos**. Para decidir se o material já existe, compara a descrição igual, a descrição sem acentos e pontuação, ou o mesmo código de fabricante (ex.: 5SY4102-7). Material existente **não tem preço alterado por cotação**; a cotação só completa custo, código, marca e NCM vazios. As notas fiscais continuam gravando o último preço pago e usam a mesma comparação.
- **E-mail:** além das notas (DANFE), lê os e-mails com orçamento, cotação, proposta ou pedido anexado (PDF ou imagem).
- **Releitura:**
  - arquivo ou e-mail lido com 0 itens é relido quando `VERSAO_LEITOR` sobe;
  - quando a IA estava indisponível, ele fica pendente e é tentado na próxima varredura;
  - colunas novas: `itens_lidos`, `metodo`, `confere_total` e `leitor_versao` em `arquivos_fornecedores_processados`; `tipo`, `itens_lidos` e `leitor_versao` em `emails_processados`.
- **Classificação:** componentes elétricos (relé, contator, fusível, comutador…) não caem mais em Ferragens/CFTV.
- **Teste:** `npm test` no backend (`testes/leitorCotacoes.test.js`, textos sintéticos).
- **Configuração opcional no `.env`:**
  - `COTACAO_IA=desligada` desliga toda a IA;
  - `COTACAO_IA_CLI=desligada` desliga só o Claude Max;
  - `CLAUDE_CLI_MODELO` (padrão `sonnet`) e `CLAUDE_CLI_PATH` controlam a CLI;
  - `COTACAO_IA_MAX_POR_VARREDURA` (padrão 15) limita as leituras por IA.
- **Atenção:** o backend precisa rodar com o mesmo usuário do Windows que fez login no Claude Code (hoje, Laboratorio).

**Pasta do sistema para projetos e laudos (pedido do usuário, 11/10/2026).**
- **Onde:** base `C:\HM-Engenharia\Arquivos do Sistema` (muda pelo `.env` em `PASTA_ARQUIVOS_SISTEMA`, ex.: uma pasta no servidor), com as subpastas `Projetos\<nome do projeto>` e `Laudos\<nome do laudo>`. Código: `utils/pastasSistema.js` e `services/pastasRegistros.js`.
- **Projeto (Análise de Projeto):**
  - "Arquivos do projeto" guarda os PDFs recebidos (antes eram lidos e descartados);
  - "Relatório de compatibilização.pdf" é atualizado a cada geração;
  - "Orçamento Pxxx.pdf" é atualizado a cada PDF ou e-mail da proposta;
  - "Dados da análise.json" é atualizado a cada salvamento.
  - O campo novo "Nome do projeto" dá nome à pasta (vazio = nome do cliente).
- **Laudo:**
  - documentos do padrão da disciplina (Word e Excel) com nome fixo pelo rótulo;
  - "Fotos";
  - "Orçamento Pxxx.pdf", quando houver orçamento;
  - "Dados do laudo.json" (reimportável).
  - O botão "Salvar documentos na pasta" gera o conjunto completo, e cada documento baixado também é gravado lá.
  - A opção "Gerar orçamento de material" (desmarcada = **só laudo**) esconde e bloqueia os orçamentos sem mudar os documentos (coluna `laudos_projetos.gerar_orcamento`).
- **Versões:** os arquivos têm nome fixo e cada versão nova sobrescreve a anterior (gravação segura: temporário + troca). Quando o nome do projeto ou do laudo muda, a pasta é renomeada; nome repetido ganha " (A14)" / " (L3)".
- **Exclusão:** excluir no sistema move a pasta para `_Excluídos` (não apaga às cegas).
- **Erros:** falha de disco (arquivo aberto no Word, rede fora) nunca impede salvar no sistema; só gera aviso.
- **Na tela:** painel "Pasta dos arquivos" com caminho, lista, "Copiar caminho" e "Abrir pasta" (abre o Explorer só quando o acesso é deste PC). Rotas `GET /projetos/analises/:id/pasta`, `POST .../pasta/abrir`, `POST /laudos/:id/salvar-documentos`, `GET /laudos/:id/pasta` e `POST .../pasta/abrir`. Colunas `pasta`/`nome_projeto` em `analises_projeto` e `pasta` em `laudos_projetos`.
- **Situação em 11/10/2026:** as 3 análises existentes ganharam pasta, com os PDFs originais (achados em "Projetos recebidos clientes"), relatório, dados e o orçamento P228. Teste: `cypress/e2e/11_laudos.cy.js` (pasta e só laudo).

**Regras permanentes de interface e catálogo (pedido do usuário, 10/10/2026).**
- **Toda lista suspensa em ordem alfabética.** As telas usam `components/Select.js` (`<Select>` no lugar de `<select>`; `<Sugestoes>` no lugar de `<datalist>`). O componente ordena as opções em ordem do português (sem diferenciar acentos, números em ordem natural) e mantém no topo a opção vazia ("Todos", "Selecione…"). **Lista nova deve usar esse componente.** O teste `cypress/e2e/12_listas_ordenadas.cy.js` confere as telas.
- **Todo material tem categoria.** `services/classificacaoMateriais.js` decide, nesta ordem:
  1. NCM igual a materiais já classificados;
  2. material mais parecido já classificado no catálogo;
  3. palavras-chave (`utils/classificadorMaterial.js`, que já conhece Alarme, Controle de acesso, Interfonia, Automação, Sonorização, Nobreaks, Antena coletiva e Informática);
  4. IA (Claude Max e, de complemento, Gemini), só entre as categorias existentes.
- Isso vale para as cotações (pasta e e-mail), para o cadastro automático pela proposta (que antes gravava "Geral") e para os orçamentos gerados pelos laudos.
- A rotina `classificarPendentes` roda depois de cada varredura e de cada proposta salva. Em 10/10/2026, os 14 materiais em "Geral" foram classificados (13 pelas regras, 1 pela IA) e o catálogo ficou 469/469 classificado.
- O catálogo enviado à tela de Orçamento sai ordenado por categoria e descrição.

**Auditoria de segurança, integridade e disponibilidade (25/10/2026).** Correções na ordem de risco. Testes: `npm test` do backend (`testes/seguranca.test.js`, 9 casos, mais os 11 do leitor) e `npm test` da skill SPDA (43/43).
- **Falhas exploráveis:**
  - a CLI do Claude (cotações, classificação, extrator de equipamentos) roda com `--restricted --strict-mcp-config --disable-slash-commands --tools Read|""`. O `--allowedTools` usado antes SOMAVA às permissões do usuário: um PDF de fornecedor com instruções escondidas podia mandar ler o `.env` ou executar comandos. Instruções dentro do documento são tratadas como conteúdo. Texto longo vai como arquivo (a linha de comando do Windows aceita só ~32 mil caracteres);
  - laudo: caminho de foto digitado no formulário é descartado (só valem fotos enviadas, `foto:<id>`). Antes, dava para embutir no Word qualquer arquivo do servidor;
  - e-mail de Pix e de NF precisa ser autêntico (cabeçalho Authentication-Results do Gmail: DMARC aprovado ou DKIM alinhado; `utils/autenticidadeEmail.js`). Pix só de `PIX_REMETENTES_PERMITIDOS` (padrão `inter.co`). NF só com destinatário de raiz `NF_DESTINATARIOS_PERMITIDOS` (padrão `04003376`). Recusados ficam em `emails_processados` com o assunto `[rejeitado]`;
  - preço vindo de NF entra em quarentena (não altera o catálogo; fica em `materiais_precos_historico` com `aplicado=false`) quando a nota não tem XML, a unidade é diferente ou a variação passa de 50% (`NF_LIMITE_VARIACAO_PRECO`).
- **API:**
  - limite de login também por conta (10 tentativas em 15 min);
  - fotos e projetos conferidos pelo conteúdo (bytes iniciais), não pela extensão; nota fiscal só PDF/XML;
  - envio de proposta por e-mail: só pelo dono ou admin, 30 por hora por usuário, registrado no histórico da proposta, erro do SMTP só no log;
  - margem padrão: só admin, de 0 a 300%, com auditoria (na tela, o campo fica bloqueado para quem não é admin);
  - senha provisória exigida também pelo servidor (403 `SENHA_PROVISORIA`); trocar ou redefinir a senha derruba os logins antigos (`usuarios.senha_alterada_em`); bcrypt 12, mínimo de 8 caracteres;
  - CSP no helmet (só scripts do próprio sistema; o build não pode ter script inline: `frontend/.env.production`), CORS sem credenciais, JSON até 5 MB;
  - "Abrir pasta" usa o endereço da conexão, não o `X-Forwarded-For`;
  - PDF (Puppeteer): sem JavaScript e com rede bloqueada, exceto as fontes do Google; no máximo 2 PDFs ao mesmo tempo (`PDF_CONCORRENCIA`);
  - Gemini com a chave no cabeçalho (não na URL) e tempo limite de 120 s.
- **Integridade:**
  - **bloqueio otimista** em propostas, análises e laudos (coluna `versao`): se outra pessoa ou outra aba gravou depois que a tela abriu, a gravação é recusada com 409 e aviso, em vez de sobrescrever. Sem `versao` no pedido (MCP), grava como antes;
  - tabela `auditoria`: exclusões de proposta (com cópia completa de seções e itens, para reconstruir), contrato, lançamento financeiro, laudo e análise; desativação de cliente, prestador, material e usuário; margem e senhas;
  - `materiais_precos_historico`: toda mudança de preço (manual, NF, quarentena);
  - índice único de descrição de material ativo; CHECKs de preço, valores de item e papel de usuário; `analises_projeto.proposta_id` com `ON DELETE SET NULL`;
  - leituras automáticas com trava entre processos (`utils/travaJob.js`, advisory lock), para duas cópias do backend não lerem o mesmo e-mail duas vezes;
  - leitura de cotação por OCR ou pelo leitor universal só importa se conferir com o total do documento;
  - fotos de laudo gravadas em transação; arquivo temporário com nome aleatório; proposta vinculada a análise/laudo só é atualizada se estiver "Ativa", com o BDI e os impostos dela; arredondamento igual na tela e no servidor.
- **Disponibilidade e operação:**
  - `iniciar-producao.ps1` virou supervisor: se o node cair, sobe de novo em 10 s; log com rotação (20 MB, guarda 10). `reiniciar-backend.bat` agora chama `backend/scripts/reiniciar.ps1`, que para o supervisor antes do node;
  - erro grave não capturado encerra o processo (o supervisor reinicia); desligamento ordenado; na partida, espera o PostgreSQL por até 2 min; `/health` consulta o banco (versão só para pedidos deste PC);
  - pasta de rede de fornecedores: até 4 tentativas em 1 min antes de desistir;
  - **backup** (`backup-db.ps1`): formato custom do pg_dump, conferido com `pg_restore --list` antes de apagar os antigos, copiado para o servidor junto com "Arquivos do Sistema" (robocopy sem apagar nada no destino). Registro em `backend/logs/backup.log`;
  - **restauração** (`backend/scripts/restaurar-backup.ps1`): por padrão, num banco separado (`hm_orcamentos_restaurado`) para conferir; `-SubstituirProducao` troca o banco em uso, depois de um backup de segurança. Aceita `.dump` e os `.sql.zip` antigos. Testado em 25/10/2026 com os dois formatos;
  - `npm run build` do frontend gera em `build-novo` e só troca no fim (`frontend/scripts/build-seguro.js`); a tela não sai do ar durante o build;
  - dependências atualizadas: nodemailer 10, puppeteer 25, multer, mailparser, imapflow, express, zod e SDK do MCP. `npm audit` do backend com 0 alertas.
- **Requer administrador (o usuário roda):** `configurar-seguranca.bat` na raiz (`backend/scripts/configurar-seguranca.ps1`):
  - sem suspensão na tomada (o PC dormia em 5 h e perdia o backup das 02:00);
  - PostgreSQL só em `localhost`;
  - firewall: 3001 só para a rede local, 5432 bloqueada;
  - tarefa agendada "HM-Engenharia Backend" no lugar do atalho da Inicializar (`-RodarSemLogin`: sobe sem login, mas o "Abrir pasta" não abre janela);
  - backup recupera horário perdido e acorda o PC;
  - permissões restritas no `.env`, nos backups e nos arquivos com senha;
  - usuário de banco `hm_app` sem superusuário (`backend/scripts/criar-usuario-banco.js`, guarda cópia do `.env` em `C:\HM-Engenharia\Backups`);
  - reinicia o backend.
- **Decisões:**
  - o usuário do MCP (id 38) continua admin: como `user`, o `enriquecer_analise_projeto` não gravaria análises criadas por outros na tela, e a credencial fica no mesmo `.env` da senha do banco;
  - react-router 6 mantido: os alertas (open redirect com URL não confiável em `<Link>`, SSR) não se aplicam, e a correção exige a v7. Os demais alertas do frontend são das ferramentas de build (não vão para o navegador).

**Projetos por disciplina: do PDF/DWG ao orçamento, à planilha e ao desenho (25/10/2026, em andamento).** Pedido do usuário: cada área de atuação é uma disciplina separada, com skill própria eficaz para orçar e para gerar projeto (AutoCAD e QElectroTech) a partir da arquitetura recebida.
- **Lista única de disciplinas** (`backend/src/utils/disciplinasProjeto.js`, rota `GET /projetos/disciplinas`, usada pela tela e pelo MCP): 17 disciplinas separadas — elétrica predial, hospitalar, industrial, média tensão, iluminação, solar, carregador, SPDA, cabeamento, rede, telefonia, antena, CFTV, controle de acesso, alarme, incêndio, automação — cada uma com a sua skill (`skill`, ou null = a criar).
- **Leitura do PDF** (`utils/leitoresTabelaProjeto.js`, sem IA): quadro de cargas (circuito, W, FP, FD, VA, V, A, fases, disjuntor, mm² e totais), listas de materiais em 3 formatos (QTD + descrição em várias linhas; TAG/QTD/fabricante/modelo com só a tabela-resumo; ITEM/DESCRIÇÃO/QTD/UN com a disciplina pelo título da seção do memorial), carimbo (escala, revisão, data, RT, CREA, cliente) e disciplina pelo conteúdo (avisa quando a marcada não bate). Testado em 9 projetos reais: quadro 20/20, listas 8/8, 18/18 e 80/80. Também: ambientes com "A = " com espaço e sem lixo de carimbo/revisão, siglas de cabo com dígito (CAT6, RG6), legenda de esquadrias separada (não vira material), aviso de PDF sem texto. Tudo fica em `analises_projeto.dados_extraidos`. Teste: `backend/testes/leitoresProjeto.test.js`.
- **Correções do orçamento da análise:** códigos únicos (não ocorrências) de CAM/R/A, preço 0 do catálogo não sai "confirmado", código do serviço vai para a proposta (análise e laudos), itens com quantidade 0 ficam fora (com aviso), busca de análises salvas (dava erro 500), IA de extração só quando disponível de fato.
- **Ponte PDF → skill** (`utils/ponteAnaliseSkill.js`, botão "Calcular pela norma" na Análise de Projeto, rota `POST /laudos/de-analise`): cria o laudo/projeto da disciplina já preenchido — elétrica com os circuitos do quadro de cargas e o fator de demanda do projeto (sem ele a skill aplicava fatores residenciais: numa escola deu 5,9 kVA contra 17 kW; com ele, 18,45 kVA = projeto), CFTV com as câmeras por ambiente, cabeamento com os pontos reais, incêndio com os ambientes; tudo que é estimado vem como aviso [CONFERIR].
- **Pesquisa de mercado estruturada** (`utils/pesquisaMercadoService.js`): Claude Max (assinatura, busca na web real pela CLI isolada só com WebSearch/WebFetch) → Gemini → API; devolve ofertas (loja, produto, preço, link), média/mín/máx e preço sugerido; botão "Usar R$ X" na Análise (serviço → valor unitário; material → preço adotado, que vai para a proposta). Colunas `ofertas` e `preco_sugerido` em `pesquisas_mercado`.
- **Planilha Excel do cliente** (`utils/planilhaOrcamentoCliente.js`, botão "Planilha Excel" no Orçamento, rota `GET /propostas/:id/planilha`) no modelo da planilha de orçamento de referência da H&M: Instruções, Parâmetros, Orçamento (por sistema, com subtotais e fórmulas), Resumo (mesma regra de BDI/impostos da proposta — o total fecha com o PDF; conferido com motor de fórmulas na P228: R$ 134.574,53), Quantitativos, Pesquisa de Preços (3 fontes com link, critério MÉDIA/MÍNIMO/MANUAL), **Fornecedores** e **Cronograma** (duração por sistema = mão de obra ÷ custo do homem-hora × equipe × 8 h, dias úteis a partir da data de início, Gantt por semana).
- **CAD** (`skills/_comum/cad/`, teste `teste-cad.js` no `npm test` das skills): escrita DXF R2007 em mm (corrige os defeitos da biblioteca: SEQEND por atributo, rotação dos atributos), padrão H&M de layers (`padrao-hm.json`: `<DISC>-<ELEMENTO>`, `G-` folha, `ARQ-BASE` arquitetura; consolidado das pranchas de automação no servidor — não havia carimbo H&M nos DWGs, por isso o bloco `HM-CARIMBO` 180 × 90 mm foi criado com 32 atributos), símbolos por disciplina, leitura de arquitetura e posicionamento pela norma. **Planta automática** na aba Laudos → "Enviar arquitetura (DWG/DXF)" (preenche os ambientes do formulário com área e perímetro reais) e "Baixar planta (DXF)"; pela CLI `node skills/_comum/cli.js <disciplina> ambientes|planta`.
- **Próximos passos concluídos (25/10/2026, noite):**
  - **DWG direto** (`skills/_comum/cad/dwg.js` + `dwg-para-dxf.mjs`): o LibreDWG (WASM, `@mlightcad/libredwg-web` 0.8.2, GPL-3.0 — uso interno, não redistribuir) lê o DWG num processo à parte com tempo limite (arquivo corrompido não derruba o backend) e o DXF é montado a partir do banco lido — a escrita DXF do próprio LibreDWG perdia blocos com POLYLINE2D (as portas "Door (2D)" do Revit sumiam). AutoCAD 2004 a 2018 (DWG 2000 não abre: orientação para salvar como DXF). O DXF convertido fica no banco (a planta não converte de novo) e o DWG original vai para a pasta do laudo.
  - **Leitura de arquitetura refeita** (`arquitetura.js`): explosão de blocos própria (a da biblioteca `dxf` não aplicava posição/escala/rotação/espelho nem a layer original — ambientes e textos dentro de blocos saíam no lugar errado), unidade deduzida pelo raio das portas (achado: plantas que declaram mm e desenham em metro), nomes limpos (sem "ÁREA = …", cotas, códigos de esquadria, GUIDs do Revit), nome pela maior letra. **Ambientes pelas paredes** quando não há polilinha de área (paredes rasterizadas a 5 cm, vão das portas fechado, preenchimento a partir do texto do nome; região que vaza é descartada; polilinha com 3+ portas dentro é moldura, não sala). **Portas**: arco de ~90° + folha → dobradiça, batente da fechadura, largura, simples/dupla, para que ambiente abre e o outro lado. Testado nas arquiteturas reais do servidor (residência: 12 ambientes e 11 portas sem polilinha de área; pavimento hospitalar: 93 portas; prédio comercial: 52 ambientes e 87 portas).
  - **Regras de posição novas** (`planta.js`): `porta` (lado da fechadura/dobradiça/meio do vão, dentro ou fora) e `canto_oposto_porta`; porta principal = a que dá para circulação/hall, depois a externa, depois a mais larga. **Planta de controle de acesso** (leitor do lado de fora junto ao batente, botoeira e acionador de emergência dentro, eletroímã e sensor no vão, controladora junto à 1ª porta que atende, catraca no ambiente); alarme com magnético nas portas, teclado junto à porta principal e IVP no canto oposto; interruptor e acionador manual de incêndio junto às portas. **Plantas de telefonia e antena** (unidade numerada na arquitetura ou planta-tipo desenhada uma vez). Layers novas TEL-*/ANT-* no padrão.
  - **Unifilar da subestação** no QElectroTech (`cad/qet/unifilar-se.mjs`): entrega 13,8 kV (Icc), chave fusível e para-raios, cabo de MT, medição, seccionadora, TC, disjuntor com relé (funções e ajustes) ou fusível HH, transformador (Dyn1, Z %), cabos e disjuntor geral BT, QGBT com as saídas, malha; variantes com fusível e em poste; validado na 0.100 e na 0.200 sem avisos. Botão "Unifilar (QElectroTech)" também na média tensão. `verificar()` agora barra unifilar inválido (antes o retorno era ignorado).
  - **Contagem e metragem no PDF vetorial** (`backend/src/utils/pdfVetorial.js`, teste `testes/pdfVetorial.test.js`): pela geometria da prancha, sem OCR/IA — símbolo da legenda (com a descrição à direita) define a assinatura (cor, tamanho, cheio/traçado, espessura; vale girado 90°) e as ocorrências fora da legenda são contadas; o traço da legenda define o estilo de linha e o comprimento vira metros pela escala do carimbo. Na Análise de Projeto entra como achado "Contagem pelo desenho" e, em arquivo sem lista de materiais, como materiais ("Contado/Medido no desenho", linhas + 10 %). Projeto real de CFTV/alarme/rede de uma clínica: 11 câmeras internas + 2 externas, 40 magnéticos, 5 IVP, 38 pontos baixos de rede, eletrodutos Ø25/Ø32/Ø60 em metros. Limites: precisa de título "LEGENDA"; símbolos iguais para itens diferentes ficam como ambíguos (não viram material); tracejado "explodido" soma só os traços.
  - **Skills novas:** telefonia/interfonia e antena coletiva (abaixo), com 26 códigos de mão de obra novos (`tel_*`, `antena_*`).
- **Referência de mercado na tela Preços de Mão de Obra (25/10/2026):**
  - Cada serviço passa a ter duas referências de mercado, além do valor H&M adotado: **oficial / governo** e **privado / particular**. São colunas `valor_/fonte_/link_/data_/ofertas_publico|privado` em `precos_mao_de_obra_referencia`.
  - **Pesquisa na web** (lupa por serviço ou "Pesquisar referências que faltam" por disciplina, rota `POST /precos-mao-de-obra/:codigo/pesquisar`, admin, limite de 40/h). Usa o mesmo motor da pesquisa de mercado (Claude Max → Gemini → API), com roteiro próprio:
    - oficial: SINAPI da UF (código, mês, desonerado ou não; a parcela de mão de obra é calculada pela composição analítica), ORSE, SICRO, tabelas de órgãos e Painel de Preços;
    - particular: prestadores, sindicatos e tabelas de honorários de engenharia.
  - O valor de cada segmento é a média das referências equivalentes. Cada referência fica com fonte, link e observação para conferência, e os valores podem ser editados à mão. Região: `PESQUISA_UF` / `PESQUISA_REGIAO` no `.env` (padrão DF).
  - **Sugestão nos orçamentos** (Análise de Projeto e laudos): o valor H&M adotado, se preenchido; senão a referência do segmento do cliente. Cliente cadastrado como "Órgão Público", ou com nome de órgão quando não há cadastro, usa a oficial; os demais usam a particular. A Análise mostra as duas com "usar". Teste: `backend/testes/precosReferencia.test.js`.
  - Exemplo real (tomada baixa): SINAPI 91998, mão de obra R$ 19,46; mercado particular R$ 88,75.
- **Quadro de cargas editável na elétrica predial (25/10/2026):**
  - **Planilha Excel com fórmulas vivas da NBR 5410** (`skills/eletrica/scripts/lib/planilhaQuadro.js`): abas Quadro de cargas, Previsão de cargas, Equipamentos (TUE), Demanda e alimentador, Parâmetros, Tabelas NBR 5410 e Materiais. Células amarelas são editáveis (nome de ambiente, áreas, tomadas, potências, comprimentos, método, agrupamento, fases, disjuntor, seção, DR, fatores de demanda, tensões, temperatura, isolação, limites de queda). As brancas recalculam a previsão, Ib, FCT/FCA, a seção que atende (mínima, Iz ≥ In e queda), PE, carga por fase, demanda, alimentador, reserva e DPS. Conferida no Excel (recálculo completo, inclusive após editar comprimento, área e FD) e no teste automático (HyperFormula, dependência de desenvolvimento das skills).
  - **No formulário do sistema:** botão "Trazer os circuitos calculados" (copia a divisão automática para editar só o necessário) e "Trazer os fatores padrão". Também entram, como campos do projetista, potência de TUG adotada por ambiente, fases fixas, método por circuito, disjuntor e seção adotados (conferidos, com aviso se não atendem) e FD fixo. Botão genérico (`preencherDe` no esquema da skill + `resumo.preencher`), disponível para qualquer disciplina.

**Pendências conhecidas:**
- Baixado direto pela API, o nome do PDF sai com os acentos estragados (só estético: a tela e o e-mail usam o nome certo).
- Windows 10 fora do suporte da Microsoft, sistema em HTTP na rede local (sem TLS) e backup só no prédio (PC e servidor): decisões do usuário.

### 1.8.2 e 1.8.3 (25/10/2026): correções em produção
- 1.8.2: `proposta_itens.codigo` passou a VARCHAR(50) — códigos de serviço longos das skills davam erro 500 ao gerar o orçamento do laudo.
- 1.8.3: `gerarPdfDeHtml` devolve `Buffer`. Desde o puppeteer 25 (v1.8.0) o PDF vinha como `Uint8Array`, que o `res.send` do Express 4 transforma em JSON: o PDF baixado (proposta, contrato, projeto, relatório) saía corrompido; a cópia gravada na pasta não era afetada.

### 26/10/2026: versão 2.0.0 (ramo `versao-2.0`)
Plano, modelo e decisões em `docs/ARQUITETURA-2.0.md`; contrato do app de campo em `docs/CAMPO-API.md`. Fora da 2.0, por decisão do usuário: emissão de NF (já existe sistema próprio) e cobranças. Portal do cliente e BIM/IFC ficaram para depois.
- **Fase 1 — arrumação:** menu em 6 grupos (Painel, Obras, Propostas, Base de preços, Financeiro, Cadastros e administração) com as rotas antigas redirecionando; base única de serviços (`GET /servicos`); módulo único de IA (`utils/ia.js`, Claude Max → API → Gemini) e painel Integrações com as rotinas automáticas e o registro das execuções.
- **Fase 2 — Obra e editor único:** entidade Obra (`OB-AAAA-NNN`) ligando análise, laudos, propostas, contratos e financeiro, com orçado × realizado; os dados existentes foram ligados por uma migração única. Análise e laudos geram o rascunho e o orçamento é editado num lugar só (`Orcamento.js`), com origem estruturada (`origem_tipo`/`origem_id`).
- **Fase 3 — recursos de mercado:** curva ABC (tela, anexo do PDF, aba da planilha); BDI pela fórmula do Acórdão 2.622/2013-TCU com faixas por tipo de obra, desonerado/não desonerado, BDI diferenciado de materiais opcional e memória do cálculo no PDF; cronograma físico-financeiro com medições e curva S; composições e kits (10 kits-modelo); aprovação da proposta por link (aceite eletrônico simples, não ICP-Brasil).
- **Fase 4 — campo:** ordens de serviço por obra (`OS-AAAA-NNNN`) com checklist das skills, fotos, assinatura do cliente e PDF; app `/campo` para celular que guarda os dados no aparelho (IndexedDB) e sincroniza sem duplicar quando a rede volta; HTTPS opcional (`HTTPS_PORTA`/`HTTPS_CERTIFICADO`/`HTTPS_CHAVE`) para o app abrir também sem rede.
- **Banco:** só migrações idempotentes em `backend/src/models/migracoes/2.0-01` a `2.0-12` (2.0-12: kits-modelo da pressurização, uma vez só), rodadas no fim de `criarTabelas`. Rotas novas em `backend/src/routes/v2/`.
- **Testes:** `npm test` do backend (inclui regressão de totais das propostas, que só roda no banco de teste) e `CI=true npx react-scripts test --watchAll=false src/pages/campo` no frontend.
- **Para implantar a 2.0 no PC de produção:** backup do banco e do código, mesclar `versao-2.0` em `main`, `npm install` no backend e no frontend, `reiniciar-backend.bat` (roda as migrações), `npm run build`, Ctrl+F5. Para o link de aprovação funcionar fora do escritório, o sistema precisa estar publicado na internet e `URL_PUBLICA` no `.env`.
- **Antes da produção (26/10/2026):** revisão independente de segurança (sem achado crítico) e correções:
  - `obra_id` no corpo de proposta/laudo/análise segue a regra do "ligar à obra" (`conferirObra` com o usuário): ninguém leva o próprio item para a obra de outro;
  - proposta aprovada pelo cliente no link não é mais editável (409; só admin), o normal é duplicar;
  - cronograma com BDI diferenciado reparte o valor por etapa com o BDI de cada parte;
  - obra com medição não é excluída;
  - a página pública, depois da decisão, mostra o CPF/CNPJ mascarado e sem e-mail/IP (LGPD); o registro completo fica para a H&M;
  - PDF do link some com a proposta cancelada/recusada; JSON inválido responde 400; `pedidoLocal` é falso quando há cabeçalho de proxy.
  Também: decisão do cliente e acesso ao link na lista de propostas; filtro `GET /obras?pode_abrir_os=1` no app de campo; kits convertem rolo/caixa com metragem na descrição para preço por metro (migração 2.0-11); nome do arquivo baixado com acento (`utils/nomeArquivoDownload.js`). Suíte Cypress atualizada para a 2.0 (13 specs, 63 testes; rodar com `env -u ELECTRON_RUN_AS_NODE node node_modules/cypress/bin/cypress run --config baseUrl=http://localhost:3002` no Git Bash do VS Code).
- **Ambiente de teste:** `C:\HM-Engenharia\Teste 2.0` (fora dos repositórios) — `iniciar-teste-2.0.bat`, `parar-teste-2.0.bat`, `liberar-porta-teste.bat` (administrador, porta 3002 só na rede local) e `atualizar-banco-teste.ps1` (recria `hm_orcamentos_v2` com cópia atual da produção). A instância de teste tem `AMBIENTE=teste` no `.env` (faixa vermelha "AMBIENTE DE TESTE" e "[TESTE]" no título), e-mails em branco e rotinas desligadas.
- **A conferir:** itens `[CONFERIR]` em `backend/src/utils/bdiTcu.js` (ISS do município, cronograma da CPRB pela Lei 14.973/2024, faixa do TCU no regime desonerado); materiais do catálogo em rolo/caixa ficam "a cotar" nos kits (que contam em metro).

### 27/10/2026: análise ≠ laudo — projeto e laudo separados (ramo `versao-2.0`, depois da 2.1.0)
Pedido do usuário: "nem sempre uma análise de projetos vai ter que gerar um laudo; laudos serão pedidos quando necessário". Detalhes em `docs/ARQUITETURA-2.0.md` (seção "Versão 2.1 — análise ≠ laudo").
- **Hub Obras:** abas **Obras · Análise de projeto · Projetos por disciplina · Laudos**. Links antigos (`/obras?aba=laudos&laudo=ID`, `/analise-projeto?aba=laudos&laudo=ID`) vão para a aba certa pelo tipo do registro.
- **Análise de projeto com finalidade** (escolha obrigatória ao enviar, editável depois): **Orçamento** (itens + "Gerar orçamento e abrir no editor"; o antigo "Calcular pela norma" virou a opção secundária "Dimensionar pela norma (projeto)") ou **Elaboração de projeto** (foco em "Elaborar projeto por disciplina"; itens do PDF recolhidos como referência). Nenhuma das duas cria laudo: `POST /laudos/de-analise` cria sempre um **projeto** (e devolve o existente se a análise já tiver o da disciplina). MCP `analisar_projeto` aceita `finalidade`.
- **Projeto × laudo:** coluna `laudos_projetos.tipo`. Projeto: documentos de projeto, desenhos (planta DXF, unifilar QElectroTech), **entregas** e orçamento de execução; as seções de inspeção do formulário ficam escondidas. Laudo: documentos de laudo (inspeção, checklist, medições), fotos e orçamento de inspeção/correção; nasce só de "Novo laudo". A API recusa (400) documento, desenho, entrega ou orçamento do outro tipo. A classificação de cada documento das 17 skills fica num lugar só: `skills/_comum/tipos-documento.js` (teste `_comum/teste-tipos-documento.js` falha se uma skill nova tiver documento sem classificação).
- **Entregas do projeto** (`POST /laudos/:id/entrega?destino=zip|pasta`): Definições técnicas (memorial e planilhas, Word/Excel), As-built (a mesma documentação com faixa/carimbo "AS BUILT", data e revisão — `skills/_comum/entrega.js`), **DXF (abre no AutoCAD; DWG não é gerado** — o LibreDWG instalado só lê DWG), QElectroTech (.qet, elétrica predial/industrial/MT) e PDF (folha de entrega com a lista dos arquivos e o resumo técnico; o memorial em PDF sai pelo Word, o sistema não converte Word em PDF). "Baixar entrega (ZIP)" e cópia em `<pasta do projeto>\Entrega` (nomes fixos, sobrescritos).
- **Pastas:** projeto novo em `Obras\<obra>\Projetos\<disciplina>` (sem obra: `Projetos\<nome>`), com "Dados do projeto.json"; laudo em `Obras\<obra>\Laudos\<disciplina>`. Coluna `pasta_raiz` grava onde a pasta nasceu; as de antes ficam onde estão.
- **Página da obra:** seções **Análises** (com a finalidade), **Projetos** e **Laudos**, cada uma com o seu botão de criar (`?secao=projeto` e `?secao=disciplinas` antigos continuam valendo).
- **Banco:** migração `2.0-13-finalidade-projeto-laudo.js` — análises existentes → `orcamento`; registros existentes: dado de inspeção preenchido (checklist C/NC/NA, NCs, medições, fotos, nº/data da inspeção) → laudo; criado de análise → projeto; só orçamento de execução ligado → projeto; o resto → laudo. Na produção de 27/10/2026: o SPDA #28 (checklist, 5 NCs, 16 medições) fica laudo.
- **Testes:** `backend/testes/projetoLaudo.test.js`, `skills/_comum/teste-tipos-documento.js` e `teste-entrega.js` (no `npm test` da pasta skills), Cypress `11_laudos.cy.js` (Laudos e Projetos, entregas, link antigo) e `13_versao_2.cy.js` (abas novas, seções da obra, finalidade).
- **Implantar:** `npm install` na pasta `skills` (o `jszip` passou a ser dependência declarada), `reiniciar-backend.bat` (roda a migração 2.0-13), `npm run build` no frontend, Ctrl+F5.

### 28/10/2026: assistente virtual, primeira versão (ramo `versao-2.0`)
Pedido do usuário: "um assistente virtual para nos orientar quando estivermos elaborando projetos e propostas de orçamento, com o qual possamos conversar, que receba arquivos e comece por si a manusear o sistema".
- **Como roda:** botão "Assistente" fixo em todas as telas (`components/assistente/PainelAssistente.js`). Cada mensagem vira um `claude -p` (assinatura Claude Max do PC) em modo restrito (`--restricted --tools "" --strict-mcp-config --permission-mode dontAsk`, ambiente sem os segredos do `.env`), com `--resume` da sessão da conversa e um MCP só do assistente (`backend/src/mcp/assistenteMcp.mjs`, 23 ferramentas) que chama a API do sistema com um **token curto do usuário logado** (escopo `assistente`, 2 h, válido só enquanto a execução está no ar). Resposta em streaming (NDJSON pelo fetch). Fila de 2 execuções, tempo-limite, limite diário e botão parar (`services/assistente/`).
- **Autonomia garantida pelo servidor** (`middleware/escopoAssistente.js`): o token do assistente só passa nas rotas de leitura e de rascunho; altera só o que ele criou NESTA conversa (`assistente_conversa_id` em propostas, análises e projetos); aprovar/mudar status, e-mail, link de aprovação, excluir, alterar o que não é dele e mudar preço do catálogo/base viram **ação pendente** (`propor_acao`) que só o clique do usuário aplica, pela mesma rota da tela e com o login dele (`services/assistente/acoes.js`).
- **Arquivos:** PDF, DWG, DXF, imagens, XLSX, CSV e DOCX (tipo pelo conteúdo, até 25 MB) em `Arquivos do Sistema\Assistente\Conversa <id>`; as ferramentas recebem o ID, nunca caminho. Leitura pelos leitores do sistema (texto/tabelas do PDF, arquitetura do DWG/DXF, OCR, planilha, Word).
- **Banco:** migração `2.0-15-assistente.js` (conversas, mensagens com os passos, arquivos, ações). Guarda de 12 meses opcional (`ASSISTENTE_LIMPEZA=ligada`). Configuração no `.env.example` (`ASSISTENTE_*`).
- **Testes:** `testes/assistente.test.js` (sem banco, Claude Code falso) e `testes/assistenteIntegracao.test.js` (banco de teste, MCP pelo protocolo contra a API real). Nenhum gasta cota.
- **API preparada e desligada:** `ASSISTENTE_PROVEDOR=api` usa a API da Anthropic com as mesmas ferramentas (`services/assistente/provedorApi.js`).

### 28/10/2026: modelo 3D ilustrativo no sistema (ramo `versao-2.0`)
Pedido do usuário: transformar o DWG dos projetos em 3D "só para o cliente ter uma ideia de como vai ficar na prática", junto do orçamento. Base de CAD em `skills/_comum/cad` (`modelo3d.js`, `visualizador3d` com three.js embutido — `npm run build:3d` na pasta skills).
- **Onde aparece:** análise de projeto (cartão "Modelo 3D ilustrativo": envia a arquitetura DWG/DXF; pontos ESTIMADOS das disciplinas da análise), projeto por disciplina (botões ao lado da planta DXF; pontos do formulário real, com volta à estimativa se ele ainda não fecha) e editor da proposta ("Mostrar o modelo 3D ao cliente", só quando a origem da proposta tem arquitetura). Ligado na proposta: botão "Ver como vai ficar (modelo 3D)" na página do link de aprovação e anexo com a imagem no PDF.
- **Como roda:** `services/modelo3d` gera numa thread à parte (worker_threads, tempo-limite de 90 s) e guarda o HTML e a imagem do PDF em `modelos_3d`, com uma chave do que entrou no modelo (não recalcula enquanto nada muda). A imagem é capturada pelo Chromium com WebGL por software (SwiftShader), na mesma fila do PDF. O projeto criado da análise herda a arquitetura dela. Cópia "Modelo 3D - <nome>.html" na pasta do projeto/análise.
- **Segurança:** a página do 3D tem script embutido, que a política do sistema bloqueia; ela é servida com política própria em sandbox sem `allow-same-origin` (não lê o login do navegador, sem rede). A aba interna abre por link curto (10 min, em memória, `/api/modelo-3d/ver/<token>`); a pública só com o "mostrar ao cliente" ligado e proposta não cancelada/recusada.
- **Banco:** migração `2.0-16-modelo-3d.js` (`analises_projeto_arquitetura`, `modelos_3d`, `propostas.modelo_3d_cliente`). Rotas em `routes/v2/modelo3d.js`. Teste: `testes/modelo3d.test.js` (arquitetura sintética, sem banco).
- **Análise de projeto também com DWG/DXF** (pedido do usuário: "o sistema deve ser capaz de analisar não só PDF, mas também DWG/DXF"). O campo da análise aceita PDF, DWG e DXF (até 40 MB). O desenho é lido numa thread à parte (`services/analiseCad/worker.js` → `skills/_comum/cad/projetoDxf.js`) e volta no formato da análise do PDF (`utils/analiseCad.js`): o texto remontado passa pelos leitores do PDF (carimbo, listas, quadro de cargas, códigos CAM/R/A); ambientes com área real; blocos contados (abre blocos aninhados; o que só existe dentro de xref de arquitetura fica de fora) e descritos pela legenda da prancha, atributo, sigla usual (TB/TM/TA, QL, INT…; sigla curta só em nome curto ou layer elétrica) ou nome de família do Revit; climatização/hidráulica separada como "outras áreas"; eletroduto/eletrocalha/fiação medidos pelas layers (+10 %); câmeras/pontos por ambiente pela posição. A contagem preenche a mão de obra (tomada baixa/média/alta/emergência, piso, interruptor, quadro, luminária, ponto de câmera/rede/TV/telefone) e tira da lista o item-modelo zerado que ela cobre. Bloco que não dá para saber o que é vai para os achados, não vira material. A arquitetura do DWG já fica como base do 3D da análise. O assistente (analisar_arquivo) também aceita DWG/DXF. Validado com 7 desenhos reais (só leitura, fora do repositório): DWG que é PDF convertido (só traços) é avisado. Testes: `skills/_comum/cad/teste-projeto-dxf.js` e `backend/testes/analiseCad.test.js` (desenhos sintéticos).
- **Pacote de arquivos e compatibilização por posição** (pedido do usuário: "analisar vários arquivos por pasta — pacote de arquitetos e clientes com elétrica, infraestrutura, redes… — e verificar a compatibilidade entre eles, para não confrontar posicionamentos de componentes como iluminação com detecção de incêndio e infraestruturas de passagem de cabeamento"). Na análise, "Arquivos ou ZIP" e "Pasta inteira": o servidor guarda o pacote numa pasta temporária (`services/pacotesProjeto.js`; upload em disco, ZIP aberto inclusive ZIP dentro de ZIP, limite contra ZIP-bomba, 60 arquivos, vale 3 h e é de quem enviou) e sugere a disciplina de cada arquivo pelo nome (ELE, E.01, ILU, LUM, CFTV, LOG, INC, SPDA, AUT…) ou pelo conteúdo (`utils/classificarArquivoProjeto.js`). Arquitetura, estrutura, hidráulica e climatização entram como **referência**: não são orçadas, mas o DWG delas entra na compatibilização e a arquitetura vira a base do 3D. O usuário confere na tabela e analisa (`POST /projetos/pacotes/:token/analisar`, `routes/v2/pacotesProjeto.js`); leitura com no máximo 2–3 arquivos ao mesmo tempo (DWG e IA). `utils/compatibilidadeEspacial.js`: alinha cada desenho à arquitetura por votação dos ambientes de mesmo nome (corrige desenho com outra origem; outro pavimento fica sem verificação, com aviso) e aponta detector × luminária (0,5 m), detector × saída de ar (1,5 m), IVP × saída de ar (1,0 m), câmera × luminária (0,6 m) — critérios adotados, declarados em cada achado —, componentes de disciplinas diferentes no mesmo ponto (< 20 cm), traçado de energia paralelo ao de telecomunicações a menos de 15 cm e projetos feitos sobre revisões diferentes da arquitetura (só polilinha × polilinha). Na análise: quadro "Compatibilização entre disciplinas" e o **DXF da compatibilização** (arquitetura em cinza + conflitos numerados em vermelho/magenta + lista) em `GET /projetos/analises/:id/compatibilizacao-dxf`. Migração `2.0-17-compatibilizacao.js` (`analises_projeto.conflitos`, `compatibilizacao`). PDF entra pela compatibilização de texto de sempre; a de posição é só entre DWG/DXF. Teste: `backend/testes/compatibilidadeEspacial.test.js` (cenário sintético + pacote ZIP). Validado com pares reais (arquitetura × automação do mesmo pavimento alinhados com 2,4 km de deslocamento corrigido).
- **Revisão de 28/10 (segurança, disponibilidade, integridade, tarefas repetidas)** — três revisões independentes; corrigido: pacote com escolhas repetidas/a mais (400), ZIP-bomba barrada pelo tamanho declarado antes de descompactar (pacote e DOCX/XLSX do assistente), limites e limite de taxa no upload de pacote, limpeza por idade dos temporários, compatibilização sem custo quadrático (traçado > 1 km ignorado com aviso), leitura de CAD/arquitetura/planta/DXF de compatibilização fora da thread principal com fila global de 2 workers (`utils/executarNoWorker.js`, `services/tarefasCad`), fila do PDF com prazo (503 claro) e Chromium morto se travar, capturas do 3D agrupadas, leituras de proposta em REPEATABLE READ (duplicar e PDF), exclusão de laudo/análise em transação com auditoria obrigatória e cópia das fotos antes, gatilho que limpa `modelos_3d` órfãos (migração 2.0-18), gravação da análise em transação, corrida do assistente na mesma conversa, cartões de ação do assistente com o TEXTO do e-mail e antes → depois dos campos, excluir material/cliente só admin. Frontend: download unificado em `utils/download.js` (13 cópias → 1; nome com acento e erro do servidor na tela). Testes: `robustezSeguranca.test.js`.
- **Pasta por cliente, no servidor, monitorada** (pedido do usuário: "pasta individual por cliente com tudo dele — arquivos gerados e os que vierem do cliente — e monitorada para ver atualizações"). Migração 2.0-19; `PASTA_CLIENTES` no .env (servidor); estrutura `Clientes\<cliente>\{Recebidos do cliente, Obras\<obra>\{Recebidos do cliente, Projeto, Projetos, Laudos, Propostas, Contratos}, Projetos, Laudos, Propostas}`; sem cliente: `_Sem cliente`. Trocar o cliente da obra ou renomear o cliente move a pasta (`services/pastasRegistros.js`). Servidor fora do ar: grava em `_Aguardando servidor` e envia quando volta (`utils/pastasSistema.js`). Monitor (`services/monitorPastas.js`): o que o sistema grava fica "conhecido"; varredura a cada 10 min e ao abrir a obra/cliente → novo/alterado/removido; sininho no cabeçalho, aviso no topo da obra com "Analisar" (vira pacote da análise com a disciplina sugerida) e "Marcar como visto"; pasta do cliente em Cadastros › Clientes. Pastas existentes: `node scripts/mudar-pastas-para-clientes.js` (simula; `--aplicar`; `--desfazer`), registrado em `pastas_movidas`. Análise pela pasta da obra e pelas novidades sugerem o nome da obra. Testes: `pastasClientes.test.js`.
- **Pastas de clientes que já existiam no servidor** (pedido do usuário em 28/10/2026: "use `\\MARCIO-SERVER\Arquivos Gerais 2\H&M` — lá já tem a pasta de vários clientes; crie uma pasta geral de clientes e coloque todas nela"). As 40 pastas de clientes foram para `H&M\Clientes` (a contagem de arquivos bateu em todas). Ficaram fora as pastas da empresa (Documentos, Documentação dos Funcionarios, editais, fornecedores, modelos, sistemas, site…) e os arquivos soltos. Log e script para desfazer: `C:\HM-Engenharia\Backups\pastas-servidor`. Na produção: `PASTA_CLIENTES=\\MARCIO-SERVER\Arquivos Gerais 2\H&M\Clientes`.
  - **Adoção pelo nome:** cliente sem pasta cujo nome bate com uma pasta que já existe (sem acento, maiúscula ou pontuação: "clinica gama" = "Clínica Gama") usa essa pasta como está, sem criar "Nome (C12)" (`pastasRegistros.pastaExistenteDoCliente`). Pasta adotada ou ligada à mão (`clientes.pasta_fixa`) não é renomeada quando o cliente muda de nome.
  - **Ligação à mão (admin):** tela Clientes › pasta › "Usar uma pasta que já existe no servidor". Lista A–Z das pastas sem cliente, com as de nome parecido no topo (ex.: ALFA para Alfa Construtora). O que o sistema já tinha gravado vai para dentro dela; arquivo de mesmo nome entra como "… (do sistema)". A ligação fica na auditoria (`PUT /clientes/:id/pasta`, `GET /clientes/:id/pasta/opcoes`).
  - **Retrato inicial:** `clientes.pasta_retrato_em` NULL faz a 1ª varredura registrar o que já estava na pasta como conhecido, sem aviso. Pasta criada vazia pelo sistema já nasce com o retrato.
  - **Varredura em segundo plano só dos clientes em tratamento:** obra não concluída/cancelada, movimento nos últimos 90 dias ou retrato por tirar. Os outros são varridos quando alguém abre o cliente ou a obra, porque as pastas do servidor têm milhares de arquivos.
  - Testes em `testes/pastasClientes.test.js` (12 casos).
- **Arquitetura em PDF para o 3D e a planta** (pedido do usuário em 28/10/2026: "para o 3D, também carregar PDF, transformar em DXF e elaborar o 3D"). Onde se envia DWG/DXF (cartão do 3D da análise, projeto por disciplina) agora também vai PDF.
  - **Conversão** (`utils/pdfParaDxf.js`): o PDF **vetorial** vira DXF em metros.
    - A escala vem da informada, do carimbo ("ESC. 1:50") ou do raio das portas (≈ 0,80 m). Sem nenhuma delas, a tela pergunta e reenvia (`faltaEscala`).
    - Camadas criadas pela aparência do traço: parede = traço bem mais grosso que a mediana ou polígono reto cinza/preto com espessura de parede; tracejado nunca é parede.
    - Os arcos de porta (o PDF parte 90° em até 16 curvas) são juntados num ARC. Os pedaços de texto de uma linha se juntam. Moldura e carimbo saem.
  - **Isolamento:** roda num **processo à parte**, como a conversão do DWG. Em teste, um erro nativo do leitor de PDF ("Segmentation fault") derrubava o processo inteiro quando vários PDFs pesados eram convertidos seguidos numa worker thread.
  - **Limites e avisos:** PDF escaneado é recusado com orientação; acima de 150 mil traços também. O sistema avisa quando a escala foi deduzida pelas portas, quando todas as linhas têm a mesma espessura (móvel pode virar parede) e quando os nomes das salas não estão como texto.
  - **3D:** a região do modelo cresce pelas paredes ligadas às salas com nome (`crescerPelasParedes`). Assim o prédio aparece inteiro mesmo com poucas salas nomeadas.
  - **Código:**
    - envio único na tela (`components/Modelo3d.enviarArquitetura`) e um só filtro de upload da arquitetura (`routes/index.js`);
    - resumo e DXF guardado em `services/tarefasCad` (`resumoDaArquitetura`, `dxfParaGuardar`).
  - **Testes:** `testes/pdfParaDxf.test.js` (8 casos, PDFs sintéticos impressos pelo Chromium). Também testado com plantas reais dos clientes, só localmente.
- **3D melhorado e com o projeto real**: componentes com forma e tamanho reconhecíveis (tomada com furos, quadro com porta, luminária, detector, câmera…) e escala pela distância; paredes com espessura mínima, topo escuro e "Corte" das paredes da frente; duplo clique entra no ambiente na altura dos olhos (olhar em volta, zoom de lente, andar, "Voltar à vista geral"), seletor "Ir para ambiente"; infraestrutura (eletrocalha, eletroduto, leito, perfilado) desenhada perto do forro (`montarCena(..., { trechos })`). Análise feita com DWG/DXF guarda as posições alinhadas (`analises_projeto.espacial`) e o 3D da análise mostra os componentes e traçados como desenhados, sem estimar (`services/modelo3d dispositivosDoEspacial`).
- **Limites:** precisa de DWG/DXF com o nome dos ambientes escrito dentro deles; pavimentos desenhados lado a lado aparecem lado a lado; porta de correr e pele de vidro viram janela; quantidades estimadas podem passar do real (marcadas [CONFERIR]). Só elétrica, iluminação, incêndio, cabeamento/rede, CFTV, alarme e controle de acesso têm pontos no 3D (controle de acesso só pelo formulário do projeto: não há estimativa pela arquitetura); as demais mostram só a arquitetura.

---

## 3. Skills e ferramentas do Claude (servidor MCP `hm-orcamentos`)

- **Arquivo:** `backend/src/mcp/mcpServer.mjs`. A documentação está em `backend/src/mcp/README.md`.
- **Como funciona:** o servidor faz login HTTP como o usuário dedicado (`MCP_LOGIN_EMAIL` / `MCP_LOGIN_SENHA` no `backend/.env`) e chama a mesma API da tela, passando pelas mesmas validações e trilha de auditoria. Fica registrado no Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`) e já aparece conectado nesta máquina.

| Ferramenta | Tipo | Uso |
|---|---|---|
| `buscar_material` | leitura | Busca no catálogo |
| `comparar_com_catalogo` | leitura | Diz se uma descrição livre já existe, com % de confiança |
| `pesquisar_preco_mercado` | leitura (cache 48h) | Pesquisa web pelo motor do sistema (Gemini ou Claude API) |
| `historico_preco` | leitura | Preço no catálogo e pesquisas anteriores |
| `salvar_pesquisa_mercado` | **grava** | **Caminho recomendado:** o Claude pesquisa na web pela própria assinatura e salva o resultado aqui (3 a 6 achados, com produto, preço e link) |
| `analisar_projeto` | **grava** uma análise | Envia um PDF do PC para o analisador; `finalidade` opcional (`orcamento`, padrão, ou `elaboracao`) — nunca gera laudo |
| `enriquecer_analise_projeto` | **grava** | Adiciona o funcionamento e os pontos por disciplina (tipo, modelo e quantidade) lidos visualmente do PDF, **só das disciplinas selecionadas** |
| `listar_propostas` / `buscar_proposta` | leitura | Histórico de orçamentos |
| `criar_rascunho_proposta` | **grava** | Proposta em rascunho, sempre para revisão humana |

**Fluxo-padrão de orçamento a partir de um projeto:**
1. `analisar_projeto` com o PDF.
2. `enriquecer_analise_projeto`, usando o `id` retornado e preenchendo funcionamento e pontos.
3. Para cada item sem preço: pesquisar na web e depois `salvar_pesquisa_mercado`.
4. Na tela: **Gerar orçamento provisório**.
5. Revisão humana e envio.

---

## 3.1 Skills de projeto (Claude Code)

As skills ficam em `skills/<disciplina>/` no repositório e são ligadas em `%USERPROFILE%\.claude\skills\`. O servidor MCP `hm-orcamentos` está registrado para o Claude Code no `.mcp.json` da raiz (as credenciais continuam no `backend/.env`). O material de referência (NBRs, laudos-modelo) está em `\\MARCIO-SERVER\Arquivos Gerais\Pos em Engenharia eletrica\Biblioteca\Engenharia eletrica`. As skills originais foram criadas no Claude Teams e não ficaram em disco: estão sendo reconstruídas a partir dos trabalhos entregues e das normas.

| Skill | Situação | Base |
|---|---|---|
| `spda-nbr5419` | **Pronta (10/10/2026)** — risco NBR 5419-2:2026 (com F × FT), dimensionamento NBR 5419-3, laudo, memorial, relatório de risco, checklist de campo, planilhas e orçamento. Teste de regressão: 38/38 contra o laudo original | Laudo HM do Santa Lúcia (R06) e NBR 5419 partes 1–4 (2026) |
| `eletrica-nbr5410` | **Pronta (10/10/2026)** — previsão de cargas (9.5.2), circuitos, seção por capacidade/proteção/queda (Tabelas 36–39, 40, 42, 46, 47, 58), balanceamento, demanda, alimentador; memorial, quadro de cargas, laudo NBR 5410/NR-10, checklist (37 itens) e orçamento. Teste 37/37 | NBR 5410; fatores de demanda [CONFERIR com a Neoenergia DIS-NOR-030/053] |
| `incendio-nbr17240` | **Pronta (10/10/2026)** — grade de detectores (raio = lado/√2, vigas), acionadores/avisadores, laços, bateria (Anexo B), iluminação de emergência; memorial, planilha, laudo, checklist (32 itens) e orçamento. Teste 17/17 | NBR 17240:2010, NBR 10898:2023 |
| `cabeamento-nbr14565` | **Pronta (10/10/2026)** — tomadas por área de trabalho e AP, Tabela 3 com redução por temperatura, distribuidores de piso, racks, backbone OM3; memorial, planilha, relatório de certificação (18 itens) e orçamento. Teste 13/13 | NBR 14565:2019 |
| `carregador-veicular-nbr17019` | **Pronta (10/10/2026)** — circuito exclusivo (motor da elétrica), tipo de DR, DPS, carga no padrão de entrada; memorial, planilha, laudo (18 itens) e orçamento. Teste 14/14 | NBR 17019:2022, projeto AP-1103 |
| `cftv-iec62676` | **Pronta (10/10/2026)** — densidade de pixels DORI por câmera, armazenamento, NVR, discos, PoE, nobreak, cabo ≤ 90 m, LGPD; memorial, planilha, laudo de vistoria (17 itens) e orçamento. Teste 13/13 | IEC 62676-4, NBR 14565, LGPD; bitrates típicos [CONFERIR] |
| `usina-solar-fotovoltaica` | **Pronta (10/10/2026)** — potência pelo consumo (CRESESB Eq. 6.28), strings por temperatura (Eq. 6.30–6.32), FDI, fusível gPV, cabo CC (NBR 16612 Tab. C.2), DPS, lado CA pela elétrica, potência disponibilizada, geração; memorial no modelo da distribuidora, planilha, relatório de comissionamento NBR 16274 (28 itens) e orçamento. Teste 24/24 | Manual de Engenharia FV CRESESB 2014, NBR 16690/16612/16274, REN 1000, Lei 14.300; HSP do SunData [CONFERIR] |
| `automacao-bms` | **Pronta (10/10/2026)** — lista de pontos BMS (pontos típicos por equipamento, reserva, controladores, segmentos RS-485, licença), descritivo de funcionamento, zonas de climatização com ar externo da NBR 16401-3 e controle por CO₂, classe de eficiência D–A atual × proposta com economia pelos fatores BAC, automação residencial Zigbee/Wi-Fi/KNX; memorial, lista de pontos (Excel), relatório de comissionamento/diagnóstico, checklist (29 itens) e orçamento. Teste 30/30 | ISO 16484, ISO 52120-1/EN 15232 (fatores [CONFERIR]), NBR 16401-3, KNX; orçamentos H&M de automação residencial e HVAC de salas cirúrgicas |

| `controle-acesso` | **Pronta (25/10/2026)** — portas/catracas, leitores, fechaduras pela força, controladoras, fontes e baterias por autonomia, cabos (queda na fechadura), rota de fuga fail-safe e liberação por incêndio (NC automática), LGPD; memorial, planilha, relatório e checklist (24 itens), orçamento (`ace_*`). Teste 35/35 | IEC 60839-11-1/-2, NBR 9077, NBR 9050, NBR 14565, LGPD |
| `alarme-intrusao` (pasta `alarme`) | **Pronta (25/10/2026)** — magnéticos por porta/janela, IVP pela cobertura (pet, dupla tecnologia), barreiras, zonas/partições → central, expansores e receptores, repetidores, bateria por grau (EN 50131-6), comunicação (EN 50136); memorial, planilha, relatório de teste e checklist (26 itens), orçamento (`alarme_*`). Planta automática. Teste 54/54 | IEC 62642 / EN 50131, EN 50136 [CONFERIR autonomias] |
| `iluminacao-nbr8995` (pasta `iluminacao`) | **Pronta (25/10/2026)** — 41 atividades da NBR ISO/CIE 8995-1 (Em, UGR, Ra, Uo), método dos lúmens com FU/FM, grade nx×ny, W/m², sensores, DALI-2/0-10 V/dimmer, circuitos pelo motor da elétrica, medição por malha; memorial, planilha, relatório de medição e checklist, orçamento (`ilum_*`). Planta automática com a grade calculada. Teste 61/61 | NBR ISO/CIE 8995-1:2013, NBR 5410 |
| `eletrica-hospitalar-nbr13534` (pasta `eletrica-hospitalar`) | **Pronta (25/10/2026)** — grupo 0/1/2 e classe por tipo de ambiente da RDC 50, IT médico (transformador de separação, DSI, painel de alarme), circuitos IT × TN-S com DR, BEL (≤ 0,2 Ω), fonte de segurança UPS/gerador por classe; memorial, planilha, laudo e checklist (32 itens), orçamento (`hosp_*`). Planta automática. Teste 77/77 | NBR 13534:2008 [CONFERIR numeração 710.x], RDC 50, NBR 5410 |
| `eletrica-industrial` | **Pronta (25/10/2026)** — In dos motores, circuitos 6.5.1, queda na partida (≤ 10 %), partidas direta/Y-Δ/soft/inversor com dispositivos, alimentador do CCM, demanda e trafo, correção de FP com banco automático, curto-circuito IEC 60909 (Icu/Icw); memorial, planilha, laudo e checklist (29 itens), orçamento (`ind_*`). **Unifilar QGBT + CCMs no QElectroTech** com símbolo de motor. Teste 48/48 | NBR 5410, NBR 17094-1, IEC 60947-4, IEC 61439, REN 1000 |
| `media-tensao-nbr14039` (pasta `media-tensao`) | **Pronta (25/10/2026)** — demanda → transformador comercial, correntes e curto, tipo de SE e proteção (fusível × disjuntor com relé 50/51/50N/51N), cabo de MT pela integral de Joule, para-raios, BT (disjuntor geral, barramento, cabos), malha de aterramento (Sverak/IEEE 80, toque e passo), medição e demanda contratada; memorial para a distribuidora, planilha, laudo de manutenção e checklist (28 itens), orçamento (`mt_*`). **Unifilar da SE no QElectroTech.** Teste 35/35 | NBR 14039:2021, NBR 15751, NBR 5356, REN 1000; regras da Neoenergia [CONFERIR] |
| `telefonia-interfonia` (pasta `telefonia`) | **Pronta (25/10/2026)** — ramais com reserva, central analógica e placas (16/48/112/192), PABX IP/híbrido (licenças, gateways FXS/FXO), prumada CI por pavimento e CCI por ramal, blocos IDC-110 (DG e caixas de andar), switch PoE quando IP (≤ 90 m), nobreak por autonomia, DPS de linha e aterramento; memorial, planilha, relatório ramal a ramal e checklist (20 itens), orçamento (`tel_*`). Planta automática. Teste 53/53 | Práticas Telebrás, NBR 14565, NBR 14306, NBR 5410/5419-4 [CONFERIR vigências] |
| `antena-coletiva` (pasta `antena`) | **Pronta (25/10/2026)** — nível por tomada (link budget) na pior e na melhor frequência, derivador por pavimento (8–24 dB), ganho do headend e amplificador de linha, C/N, satélite com multiswitch (cascata/estrela) a 950–2150 MHz, RG-6/RG-11, DPS coaxial e aterramento do mastro; memorial, planilha de níveis, relatório de medição (nível/MER/BER) e checklist (16 itens), orçamento (`antena_*`). Planta automática. Teste 44/44 | IEC/EN 60728, NBR 15601/15604, NBR 14565, NBR 5419 [CONFERIR faixas e norma ABNT] |
| `pressurizacao-escadas-nbr14880` (pasta `pressurizacao`) | **Pronta (27/10/2026, v2)** — áreas de escape (Tabela A2, série com antecâmara, elevadores, janelas N = 1,6), QFT a 50 Pa, QAT com as PCF abertas da Tabela B1 a 1 m/s, QTS × 1,4/1,5, alívio QD = QTS − QFT(60 Pa) e área do damper, força de abertura, duto/grelhas/tomada de ar, pressão estática estimada (Altshul-Tsal), motor, circuitos pela elétrica e partida pela industrial, gerador/ventilador reserva pelas regras do CBMDF; **automação** (pontos de E/S, PID de ΔP no inversor ou damper, pressostatos com reversão, modos manual/automático/teste, integração com a central NBR 17240, parada só no painel); memorial, planilha, laudo de comissionamento e checklist (31 itens), orçamento (`pres_*`, modos instalação / automação / inspeção), kits `KIT-PRES-01/02` (migração 2.0-12). Teste 52/52 calibrado no Anexo F da NT 13 | NBR 14880:2014 (não lida — [CONFERIR]), CBMDF NT 10/2015 item 4.3.1.10, CBMGO NT 13/2025 (= IT 13 CBPMESP); força 133 N e partida 60 s [CONFERIR]; automação calibrada no serviço H&M de 2026 (painéis de pressurização de hospital) |

Todas as skills usam a base comum `skills/_comum` (documentos Word/Excel no padrão H&M, checklist/não conformidades/parecer, formulário, CLI `node skills/_comum/cli.js <disciplina> calcular|documentos|orcamento|modelo`). `npm test` na pasta `skills` roda os testes de todas as 17 skills e os 13 casos da base de CAD. "Projeto de instalações" está coberto pela elétrica predial; hidráulica/outras instalações ainda não têm skill.

**No sistema:** todas as disciplinas ficam nas abas **Obras → Projetos por disciplina** e **Obras → Laudos** (versão 2.1: projeto e laudo separados — `laudos_projetos.tipo`; o que cada um gera está em `skills/_comum/tipos-documento.js`; ver a entrada de 27/10/2026 na seção 2) (`frontend/src/components/laudos/`). O backend (`controllers/laudosController.js`, rotas `/api/laudos/*`, tabelas `laudos_projetos` e `laudos_projetos_fotos`) usa a skill da disciplina pelo contrato de `skills/<disciplina>/scripts/lib/index.js`, registrada em `backend/src/utils/disciplinasLaudo.js`. O orçamento gerado casa cada material com o catálogo (preço → "confirmado"; material novo entra no catálogo ao salvar a proposta) e põe a mão de obra pelo preço de referência (sempre "a cotar"). Para incluir uma nova disciplina: criar a skill com o mesmo contrato, classificar os documentos e modos de orçamento novos em `skills/_comum/tipos-documento.js` (o teste falha se faltar), registrar a `pasta` em `disciplinasLaudo.js` — a tela é montada sozinha pelo esquema `formulario` da skill (`FormularioGenerico`/`ResultadoGenerico`); só o SPDA tem tela própria em `TELAS_POR_DISCIPLINA` (`LaudosProjetos.js`). Os códigos de mão de obra de cada disciplina ficam em `utils/precosMaoDeObraReferencia.js` (preencher os preços na tela Preços de Mão de Obra). Teste: `cypress/e2e/11_laudos.cy.js` (17 disciplinas; laudos de SPDA, CFTV e automação; projeto da usina solar com entregas; link antigo).

Uso de cada skill: `skills/<disciplina>/SKILL.md`. Formulário da obra (JSON): `skills/spda/exemplos/modelo-vazio.json`, campos em `skills/spda/referencia/esquema-dados.md`.

## 4. Projeto Elétrica Predial: objetivo e próximos passos

**Situação em 10/10/2026:** o cálculo de elétrica predial (NBR 5410) foi implementado como skill (`skills/eletrica`) e já roda na aba Análise de Projeto → Laudos e projetos, com memorial, laudo e orçamento. A proposta abaixo fica como histórico; o que ainda falta é o material do Teams (modelos de laudo e parâmetros de campo) para ajustar os documentos ao padrão antigo.

**Objetivo declarado:** um aplicativo em que só se informam os **dados do cliente** e os **parâmetros de campo**, e o sistema gera o projeto/levantamento elétrico predial **integrado ao Sistema de Orçamentos**.

**O que já existe e pode ser reaproveitado:**
- Disciplinas `eletrica` e `iluminacao` na Análise de Projeto, com itens reais.
- `pontos_por_disciplina` (JSONB), que já guarda tipo, modelo e quantidade.
- Geração de orçamento provisório a partir de uma análise.
- Preço de referência de mão de obra e pesquisa de mercado.

**Informação que ainda NÃO está neste documento:** as conversas do Claude Teams (organização HM Engenharia), onde foram feitos os laudos, as skills e os cálculos do Elétrica Predial, e o conteúdo da pasta `Documents\Elétrica Predial`, que fica em outro computador ou outro caminho e não está no `laboratorio`. Essas conversas não ficam acessíveis a partir da conta Pessoal. **Para completar esta seção, cole as conversas do Teams ou copie a pasta para `C:\HM-Engenharia\Eletrica-Predial`** e acrescente aqui:
- [ ] Modelos de **laudo**: campos, normas citadas e formato do PDF.
- [ ] **Skills/cálculos**: dimensionamento de condutores, queda de tensão, disjuntores, quadro de cargas e DR/DPS, conforme a NBR 5410.
- [ ] **Parâmetros de campo** coletados na visita e as unidades de cada um.
- [ ] **Bibliografia/normas** usadas.

**Proposta de implementação** (a validar quando o material acima chegar):
1. **Banco:** tabelas `projetos_eletricos` (cliente_id, endereço, tipo de edificação, tensão e padrão de entrada) e `projeto_eletrico_circuitos` (ambiente, tipo de carga, potência, comprimento, método de instalação), criadas em `models/schema.js` com `CREATE TABLE IF NOT EXISTS`.
2. **Cálculo:** `backend/src/utils/calculoEletrico.js`, com funções puras e testadas (`npm test`): corrente de projeto, seção por capacidade de condução e por queda de tensão, disjuntor, balanceamento de fases e quadro de cargas.
3. **Laudo:** `backend/src/utils/laudoTemplate.js`, no mesmo padrão de `pdfTemplate.js` (Puppeteer, cabeçalho H&M e `escapeHtml`). Rota `GET /projetos-eletricos/:id/laudo`.
4. **Tela:** `frontend/src/pages/ProjetoEletrico.js`, com um formulário em etapas (cliente → parâmetros de campo → ambientes/circuitos → resultado), usando autosave como na Análise de Projeto.
5. **Integração:** um botão **"Gerar orçamento"** que reutiliza a lógica de `gerar-orcamento` (materiais por categoria + mão de obra de referência).
6. **MCP:** ferramenta `criar_projeto_eletrico`, para o Claude Desktop preencher a partir de fotos ou anotações de campo.
7. **Testes:** um Cypress `11_projeto_eletrico.cy.js`.

---

## 5. Pendências conhecidas

- [x] Sincronizar o GitHub com o PC (feito em 10/10/2026: v1.6.0 e v1.6.1).
- [x] Atualizar as dependências apontadas pelo `npm audit` (feito em 25/10/2026; ver "Auditoria de segurança" na seção 2).
- [ ] Rodar `configurar-seguranca.bat` como administrador e trocar a senha de app do Gmail (auditoria de 25/10/2026).
- [ ] **Antes de publicar o link de aprovação da proposta por túnel ou proxy reverso** (`URL_PUBLICA`), definir `TRUST_PROXY` no `.env` (ver `backend/.env.example`): sem ele o comprovante de aceite grava o IP do túnel e o limite de taxa das páginas públicas trata todos os clientes como um só. O backend avisa no log quando `URL_PUBLICA` está com `https://` e `TRUST_PROXY` vazio.
- [ ] Trazer o material do Teams e da pasta Elétrica Predial (seção 4).
- [ ] O uso por ambiente (`pontosPorAmbiente.js`) é aproximado: mostrar sempre com aviso, como já é feito hoje.
- [x] ~~Novos fornecedores de cotação exigem um parser novo~~ — desde a v1.7.0 o leitor universal + OCR + IA lê qualquer layout (ver seção 2, v1.7.0).
