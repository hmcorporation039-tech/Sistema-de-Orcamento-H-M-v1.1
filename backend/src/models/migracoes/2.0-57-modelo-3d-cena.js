// Modelo 3D guardado como CENA, não como página (versão 2.37, revisão geral de 14/11/2026).
// Antes cada linha de modelos_3d guardava o HTML inteiro — ~0,9 MB do visualizador (three.js) em CADA modelo — e,
// como o visualizador entrava na chave do cache, qualquer ajuste nele refazia TODOS os 3D. Agora:
//   cena                 — as cenas das plantas em JSON comprimido (gzip); a página é montada ao servir, com o
//                          visualizador do disco (services/modelo3d/index.js, paginaDoModelo);
//   imagem_visualizador  — a versão do visualizador com que a imagem do PDF da proposta foi capturada (o visual
//                          muda com ele: imagem de outra versão é capturada de novo);
//   html                 — fica (dado antigo; migração não apaga coluna), sem NOT NULL; as linhas novas não o usam.
module.exports = async (client) => {
  await client.query('ALTER TABLE modelos_3d ADD COLUMN IF NOT EXISTS cena BYTEA');
  await client.query('ALTER TABLE modelos_3d ADD COLUMN IF NOT EXISTS imagem_visualizador VARCHAR(64)');
  // só quando ainda é NOT NULL: ALTER COLUMN pega trava exclusiva — não roda em toda partida
  await client.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'modelos_3d' AND column_name = 'html' AND is_nullable = 'NO') THEN
        ALTER TABLE modelos_3d ALTER COLUMN html DROP NOT NULL;
      END IF;
    END $$`);
};
