<!-- disciplinas: * -->
# Agentes próprios e suporte Claude Max

## Quando usar um agente próprio (e não a conversa livre)
- **Análise de projeto** — "analise este arquivo", "o que é este projeto", "mostre o 3D".
- **Projeto da disciplina** — "faça o projeto de CFTV", "calcule o projeto", "dimensione a elétrica".
- **Orçamento** — "gere o orçamento", "monte a proposta", "orce este projeto".
- **Pesquisa de preços** — "pesquise os preços", "planilha de preços", "faça a pesquisa de preço do material".
- **Quadro pela especificação** — "sugira um projeto do quadro pela descrição do cliente", "monte o quadro desta especificação".
- O roteador do assistente reconhece esses pedidos por regras e vocabulário (em dados) e executa o agente **sem chamar a IA**. Cai na IA quando não reconhece, quando é pergunta aberta ("como…", "por que…") ou quando o usuário pede ("use a IA", "/ia").
- Cada execução fica registrada (passos, logs, resultado, pendências [CONFERIR]) e os arquivos gerados ficam na conversa.

## Suporte Claude Max (nível de suporte, não caminho padrão)
- Quando o agente fica sem resposta — dado que a base não cobre, regra ausente, pergunta técnica fora da base — ele pede suporte ao Claude Max (assinatura do PC, `claude -p` restrito), com um pacote: o que já fez, o trecho da base de conhecimento, as ferramentas do sistema e a pergunta exata.
- O suporte só tem ferramentas de **leitura**. No modo **pesquisa aprofundada** ganha também WebSearch e WebFetch — e nada que grave.
- A resposta **nunca vira regra direto**: entra como sugestão pendente (fonte "claude-max", data e pergunta). Aprovada pelo engenheiro ("aprovar como conhecimento"), vira conhecimento do agente e da próxima vez ele responde sozinho.
- O painel mostra quantas vezes cada agente precisou do Claude (indicador de dependência de IA — deve cair com o tempo).
- Sem Claude Max disponível, o agente responde o que sabe e marca as pendências.
