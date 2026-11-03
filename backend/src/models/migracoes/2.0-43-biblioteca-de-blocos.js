// Biblioteca de blocos por escritório e medida real (fase 3 do roteiro, CAD-08, 02/11/2026).
//
// A chave do aprendizado de símbolos (2.0-23) era só layer + proporção + preenchimento. Dois
// quadrados de tamanhos diferentes na mesma layer (tomada de 20 cm e quadro de 40 cm) caíam na
// mesma linha, e a confirmação mais recente apagava a outra. E valia para todo escritório.
// Agora a confirmação do Mapa do CAD (DWG/DXF, que está em tamanho real) grava:
//   escritorio: responsável técnico do carimbo (utils/escritorioDoProjeto.js), '' = não diz
//   por_medida: a forma é casada pela MEDIDA (±2 cm), não só pela proporção
// A chave nova (services/simbolosAprendidos.js, chaveComMedida) leva a medida e o escritório e
// passa de 160 caracteres: a coluna cresce para 400.
// A legenda lida do desenho continua pela proporção (a amostra da legenda pode estar noutra escala).
// As confirmações antigas (origem 'usuario') tinham a medida da planta: passam a valer pela medida
// (uma vez só — umaVez), sem mudar a chave; a próxima confirmação da mesma forma grava a chave
// nova e apaga a antiga (services/mapaCad.js).
const { umaVez } = require('../apoioMigracoes');

module.exports = async (client) => {
  await client.query(`ALTER TABLE cad_simbolos_aprendidos ADD COLUMN IF NOT EXISTS escritorio VARCHAR(120) NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE cad_simbolos_aprendidos ADD COLUMN IF NOT EXISTS por_medida BOOLEAN NOT NULL DEFAULT FALSE`);
  await client.query(`
    DO $$
    BEGIN
      IF (SELECT character_maximum_length FROM information_schema.columns
           WHERE table_name = 'cad_simbolos_aprendidos' AND column_name = 'chave') < 400 THEN
        ALTER TABLE cad_simbolos_aprendidos ALTER COLUMN chave TYPE VARCHAR(400);
      END IF;
    END $$;
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_cad_simbolos_aprendidos_escritorio ON cad_simbolos_aprendidos(escritorio)');
  await umaVez(client, 'migracao_2.0-43_confirmacoes_por_medida', async () => {
    const r = await client.query(`UPDATE cad_simbolos_aprendidos SET por_medida = TRUE WHERE origem = 'usuario' AND por_medida = FALSE`);
    return { confirmacoes: r.rowCount };
  });
};
