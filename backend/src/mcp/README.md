# Servidor MCP — H&M Engenharia

Permite conversar com o Claude Desktop e pedir pra ele consultar o catálogo,
pesquisar preço de mercado, ler um PDF de projeto, consultar propostas ou
até criar um rascunho de proposta — sem abrir o sistema.

Este servidor **não acessa o banco direto**: ele faz login como um usuário
comum do sistema e chama os mesmos endpoints da API que a tela usa. Isso
significa que toda ferramenta aqui passa pela mesma validação, recálculo de
totais e trilha de auditoria que já protegem o resto do sistema.

## 1. Criar o usuário dedicado

Pela tela **Usuários** (só admin acessa):
1. Crie um usuário novo, ex.: `mcp@hmengenharia.com`, papel **usuário comum
   (não administrador)**.
2. Defina uma senha forte.
3. Faça login uma vez com esse usuário (só pra confirmar que a senha está
   certa) e troque a senha provisória se o sistema pedir.

> **Não use administrador** (revisão de 27/10/2026). O Claude lê textos de
> fora (PDFs, páginas, e-mails) e um texto malicioso pode tentar mandá-lo usar
> as ferramentas. Como usuário comum, o MCP continua consultando o catálogo e
> as propostas e criando os próprios rascunhos e análises, mas **não altera o
> que outra pessoa criou**: `enriquecer_analise_projeto` só mexe nas análises
> que o próprio usuário do MCP criou (regra de posse, `middleware/posse.js`),
> e nada administrativo (usuários, configurações, integrações) fica ao alcance.
> Se o usuário já existe como admin, troque o papel dele na tela Usuários.

## 2. Configurar o `.env`

No `backend/.env` (nunca no `claude_desktop_config.json` — a senha não deve
aparecer lá):

```
MCP_API_URL=http://localhost:3001
MCP_LOGIN_EMAIL=mcp@hmengenharia.com
MCP_LOGIN_SENHA=a-senha-que-voce-definiu
# opcional: pastas de onde o analisar_projeto pode ler PDF (separadas por ;)
MCP_PASTAS_PDF=C:\HM-Engenharia\hm-eng\Projetos recebidos clientes;C:\Users\<usuário>\Downloads
```

Sem `MCP_PASTAS_PDF`, valem: `projetos-recebidos` e `Projetos recebidos
clientes` (na pasta do sistema), a pasta de arquivos do sistema
(`PASTA_ARQUIVOS_SISTEMA`) e a pasta Downloads do usuário do Windows. PDF fora
delas é recusado — copie o arquivo para uma delas antes de pedir a análise.

## 3. Instalar dependências

```
cd backend
npm install
```
(Traz `@modelcontextprotocol/sdk` e `zod`, usados só pelo servidor MCP.)

## 4. Registrar no Claude Desktop

Edite `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hm-orcamentos": {
      "command": "node",
      "args": ["C:\\HM-Engenharia\\hm-eng\\backend\\src\\mcp\\mcpServer.mjs"]
    }
  }
}
```

Feche e reabra o Claude Desktop. O ícone de ferramentas (🔨) na conversa
confirma que conectou.

**Importante:** o backend precisa estar rodando (`http://localhost:3001`)
antes de usar as ferramentas — o servidor MCP só existe pra falar com ele.

## 5. Ferramentas disponíveis

| Ferramenta | Método | O que faz |
|---|---|---|
| `buscar_material` | leitura | Busca no catálogo por descrição/código/marca |
| `comparar_com_catalogo` | leitura | Confere se uma descrição livre já existe no catálogo, com % de confiança |
| `pesquisar_preco_mercado` | leitura (cache 48h) | Pesquisa real na web pelo motor da tela: Claude Max (assinatura) → Claude pela API → Gemini |
| `historico_preco` | leitura | Preço no catálogo + pesquisas de mercado já feitas (o histórico de preços do catálogo por nota fiscal/cotação existe no banco, mas esta ferramenta ainda não o mostra) |
| `salvar_pesquisa_mercado` | **grava** | Grava a pesquisa que o próprio Claude fez na web. Fica no histórico **marcada "não verificada"** e **fora do cache** de 48h da pesquisa automática |
| `analisar_projeto` | **cria uma análise salva** | Envia um PDF de uma das pastas permitidas pro mesmo analisador da tela — fica em "Análises salvas". `finalidade` opcional: `orcamento` (padrão) ou `elaboracao` (versão 2.1; a análise nunca gera laudo) |
| `enriquecer_analise_projeto` | **grava** | Acrescenta funcionamento e pontos por disciplina a uma análise criada pelo próprio MCP |
| `listar_propostas` / `buscar_proposta` | leitura | Consulta o histórico de orçamentos |
| `criar_rascunho_proposta` | **cria uma proposta** | Monta uma proposta rascunho, pelo mesmo caminho da tela de Orçamento |

As marcadas em negrito **gravam algo no sistema** — sempre como
rascunho/análise/pesquisa pra revisão humana depois, nunca finalizando ou
enviando nada ao cliente sozinhas.

## 6. Testando

Com o backend rodando e o `.env` configurado, dá pra testar sem o Claude
Desktop, direto no terminal:

```
cd backend
node src/mcp/mcpServer.mjs
```

O processo fica esperando mensagens no stdio (é assim que o protocolo
funciona) — `Ctrl+C` pra sair. Pra um teste mais completo (listar e chamar
ferramentas), use um cliente MCP de linha de comando, ou simplesmente
registre no Claude Desktop e converse.

## Segurança

- Roda só nesta máquina — não abre porta de rede.
- Pra cortar o acesso do Claude Desktop ao sistema, desative o usuário
  `mcp@hmengenharia.com` na tela **Usuários** (efeito quase imediato — ver
  `middleware/auth.js`).
- Usuário dedicado **não administrador** (seção 1): o MCP não altera registro
  de outra pessoa nem nada administrativo.
- `analisar_projeto` só lê PDF das pastas permitidas (`MCP_PASTAS_PDF`),
  conferindo o caminho real (atalhos e `..` não escapam da pasta).
- Pesquisa gravada por `salvar_pesquisa_mercado` é marcada "não verificada" e
  não vira o resultado do botão de pesquisa da tela (fica fora do cache).
- Toda ação de escrita (`analisar_projeto`, `enriquecer_analise_projeto`,
  `salvar_pesquisa_mercado`, `criar_rascunho_proposta`) fica registrada com o
  `usuario_id` desse usuário dedicado (a pesquisa, com a fonte
  `claude_desktop`), então dá pra distinguir o que foi feito via Claude Desktop.
- As chamadas passam pelos mesmos limites de uso da API (`routes/index.js`)
  — ex.: rate limit de pesquisa de mercado e de análise de projeto.

## MCP do assistente virtual (`assistenteMcp.mjs`)

Outro servidor, separado deste: NÃO é registrado no Claude Desktop. O backend o
inicia a cada mensagem do painel "Assistente" (via `--mcp-config` temporário do
`claude -p`), com o token curto do usuário logado (escopo `assistente`) — sem
usuário dedicado e sem senha no `.env`. As ferramentas ficam em
`assistenteFerramentas.mjs`; o que elas podem fazer é decidido pelo servidor em
`middleware/escopoAssistente.js` (ver `docs/RESUMO-MELHORIAS-E-IMPLANTACAO.md`,
entrada de 28/10/2026).
