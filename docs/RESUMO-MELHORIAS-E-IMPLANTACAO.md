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
  - Gemini (`utils/geminiClient.js`), com troca para um modelo alternativo quando a cota estoura.
  - Claude via API (`utils/claudeClient.js`), usado como fallback.
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

**Pendências conhecidas da auditoria (decisão do usuário):**
- Dependências com alertas no `npm audit`. No backend, a crítica (`proxy-addr`) não se aplica, porque `TRUST_PROXY` não está definida. Há alertas altos em multer, nodemailer, mailparser, imapflow e puppeteer. No frontend, os alertas são quase todos de ferramentas de build; no navegador, só axios e react-router. Atualizar em uma etapa separada, com testes.
- A senha provisória só é exigida pela tela, não pelo servidor (risco baixo).
- Baixado direto pela API, o nome do PDF sai com os acentos estragados (só estético: a tela e o e-mail usam o nome certo).

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
| `analisar_projeto` | **grava** uma análise | Envia um PDF do PC para o analisador |
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

## 4. Projeto Elétrica Predial: objetivo e próximos passos

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
- [ ] Atualizar as dependências apontadas pelo `npm audit` (ver o fim da seção 2).
- [ ] Trazer o material do Teams e da pasta Elétrica Predial (seção 4).
- [ ] O uso por ambiente (`pontosPorAmbiente.js`) é aproximado: mostrar sempre com aviso, como já é feito hoje.
- [ ] Novos fornecedores de cotação exigem um parser novo em `cotacaoFornecedorParser.js`, seguindo o padrão SOL / Dispel / BAND.
