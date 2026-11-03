# Rotas da versão 2.0

Um arquivo por tema, carregado em ordem alfabética por routes/index.js:

```js
module.exports = (router, { autenticar, admin, validarId, exigirPosse, limitePesquisaMercado }) => {
  router.get('/obras', autenticar, ctrl.listar);
};
```

Toda rota passa por `autenticar` (e `admin`/posse quando for o caso); HTML de PDF usa `escapeHtml`.

Perfis (Fase 6, 02/11/2026): `exigePapel` (de `middleware/auth.js`, também recebido aqui) limita uma
rota a perfis: `router.get('/x', autenticar, exigePapel('financeiro'), ctrl.x)` ou
`exigePapel('tecnico', 'financeiro')`. Vem DEPOIS do `autenticar`; o administrador passa sempre e um
papel escrito errado quebra na partida. Papéis: `admin`, `financeiro`, `tecnico`, `user`. As rotas que
já existiam continuam só com `autenticar`/`admin`.
