// Modelo 3D ilustrativo (versão 2.3) — controllers/modelo3dController.js.
//
// Ver/gerar/baixar: qualquer usuário logado (como ver o projeto ou a análise).
// Enviar a arquitetura da análise: dono da análise ou administrador. Mostrar ao
// cliente: dono da proposta ou administrador.
// /modelo-3d/ver/:token é a única sem login: o token curto (10 min, em memória)
// é emitido por /abrir para quem está logado.
const ctrl = require('../../controllers/modelo3dController');

// uploadArquitetura (DWG/DXF/PDF): o mesmo da arquitetura do projeto, em routes/index.js
module.exports = (router, { autenticar, validarId, exigirPosse, uploadArquitetura }) => {
  const posseAnalise = exigirPosse('analises_projeto', {
    naoEncontrado: 'Análise não encontrada.',
    semPermissao: 'Esta análise foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
  });
  const posseProposta = exigirPosse('propostas', {
    naoEncontrado: 'Proposta não encontrada.',
    semPermissao: 'Esta proposta foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
  });

  router.get('/modelo-3d/ver/:token', ctrl.ver);
  router.get('/modelo-3d/:origem/:id', autenticar, validarId, ctrl.situacao);
  router.post('/modelo-3d/:origem/:id/abrir', autenticar, validarId, ctrl.abrir);
  router.get('/modelo-3d/:origem/:id/arquivo', autenticar, validarId, ctrl.arquivo);

  router.post('/projetos/analises/:id/arquitetura', autenticar, validarId, posseAnalise, uploadArquitetura.single('arquivo'), ctrl.enviarArquiteturaAnalise);
  router.get('/projetos/analises/:id/arquitetura', autenticar, validarId, ctrl.verArquiteturaAnalise);

  router.patch('/propostas/:id/modelo-3d-cliente', autenticar, validarId, posseProposta, ctrl.mostrarAoCliente);
};
