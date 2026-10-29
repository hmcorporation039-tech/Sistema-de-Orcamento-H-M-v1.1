// Versão 2.0 — kits-modelo da disciplina Pressurização de escadas (skills/pressurizacao).
//
// O seed dos kits-modelo (2.0-08) roda UMA vez (marca 'composicoes_kits_modelo'); no
// banco em que ele já rodou, os kits novos de KITS_MODELO não entram sozinhos. Esta
// migração cria SÓ os kits da disciplina 'pressurizacao' (KIT-PRES-01 e KIT-PRES-02),
// uma vez (marca 'composicoes_kits_pressurizacao'), com as mesmas regras do 2.0-08:
// código fixo com ON CONFLICT DO NOTHING (não recria kit apagado/editado nem duplica),
// materiais casados ao catálogo pela descrição (o que não casa fica "a cotar") e
// serviços pela base padrão (os códigos pres_* já foram semeados em models/schema.js,
// que roda antes das migrações). Nenhum preço é gravado. Numa instalação nova o
// 2.0-08 já cria estes kits e aqui nada muda além da marca.
const { KITS_MODELO } = require('../../utils/composicoes');
const { umaVez, inserirKits } = require('../apoioMigracoes');

const MARCA = 'composicoes_kits_pressurizacao';
const DISCIPLINA = 'pressurizacao';

module.exports = async (client) => {
  // uma vez só, com a mesma criação de kits do 2.0-08 (models/apoioMigracoes.js)
  const r = await umaVez(client, MARCA, () => inserirKits(client, KITS_MODELO.filter(k => k.disciplina === DISCIPLINA), { prefixoServico: 'pres\\_%' }));
  if (r?.kits) console.log(`Composições: ${r.kits} kit(s)-modelo de pressurização criados (${r.materiais_no_catalogo} material(is) casados com o catálogo, ${r.materiais_sem_catalogo} a cotar)`);
};
