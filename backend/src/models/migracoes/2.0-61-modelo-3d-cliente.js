// 3D para o cliente salvo de dentro do editor (2.43, 14/11/2026): antes o engenheiro editava no 3D (Mapa do CAD ou
// "Editar componentes no 3D") e depois ia ao cartão "Modelo 3D ilustrativo" para gerar de novo e baixar. Agora o
// botão "Aprovar e salvar para o cliente" do próprio 3D grava o arquivo na pasta do cliente e esta linha guarda
// QUEM salvou, QUANDO e a chave do 3D salvo — a tela compara com a chave atual e avisa quando o 3D foi editado
// depois de salvo (controllers/modelo3dController.js salvarParaCliente; services/modelo3d situacao).
// Uma linha por análise; apagar a análise apaga a linha. Idempotente.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS analises_modelo_3d_cliente (
      analise_id INTEGER PRIMARY KEY REFERENCES analises_projeto(id) ON DELETE CASCADE,
      chave TEXT NOT NULL,
      nome_arquivo TEXT,
      inseridos INTEGER NOT NULL DEFAULT 0,
      retirados INTEGER NOT NULL DEFAULT 0,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      salvo_em TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
};
