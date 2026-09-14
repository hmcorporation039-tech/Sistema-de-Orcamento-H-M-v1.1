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
1. Crie um usuário novo, ex.: `mcp@hmengenharia.com`, papel **admin**.
2. Defina uma senha forte.
3. Faça login uma vez com esse usuário (só pra confirmar que a senha está
   certa) e troque a senha provisória se o sistema pedir.

> Por que admin? Pra esse usuário conseguir listar/criar propostas de
> qualquer pessoa da equipe, não só as próprias. Se um dia quiser restringir,
> dá pra criar como usuário comum — só que aí `listar_propostas` e
> `criar_rascunho_proposta` ficam limitados às propostas desse próprio
> usuário, dependendo das regras de posse (`middleware/posse.js`).

## 2. Configurar o `.env`

No `backend/.env` (nunca no `claude_desktop_config.json` — a senha não deve
aparecer lá):

```
MCP_API_URL=http://localhost:3001
MCP_LOGIN_EMAIL=mcp@hmengenharia.com
MCP_LOGIN_SENHA=a-senha-que-voce-definiu
```

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
| `pesquisar_preco_mercado` | leitura (cache 48h) | Pesquisa real na web — mesmo motor da tela |
| `historico_preco` | leitura | Preço no catálogo + pesquisas de mercado já feitas |
| `analisar_projeto` | **cria uma análise salva** | Envia um PDF do PC pro mesmo analisador da tela — fica em "Análises salvas" |
| `listar_propostas` / `buscar_proposta` | leitura | Consulta o histórico de orçamentos |
| `criar_rascunho_proposta` | **cria uma proposta** | Monta uma proposta rascunho, pelo mesmo caminho da tela de Orçamento |

As duas marcadas em negrito **gravam algo no sistema** — sempre como
rascunho/análise pra revisão humana depois, nunca finalizando ou enviando
nada ao cliente sozinhas.

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
- Toda ação de escrita (`analisar_projeto`, `criar_rascunho_proposta`) fica
  registrada com o `usuario_id` desse usuário dedicado, então dá pra
  distinguir no Histórico/análises o que foi feito via Claude Desktop.
- As chamadas passam pelos mesmos limites de uso da API (`routes/index.js`)
  — ex.: rate limit de pesquisa de mercado e de análise de projeto.
