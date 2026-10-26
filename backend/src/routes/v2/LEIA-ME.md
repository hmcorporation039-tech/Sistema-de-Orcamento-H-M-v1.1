# Rotas da versão 2.0

Um arquivo por tema, carregado em ordem alfabética por routes/index.js:

```js
module.exports = (router, { autenticar, admin, validarId, exigirPosse, limitePesquisaMercado }) => {
  router.get('/obras', autenticar, ctrl.listar);
};
```

Toda rota passa por `autenticar` (e `admin`/posse quando for o caso); HTML de PDF usa `escapeHtml`.
