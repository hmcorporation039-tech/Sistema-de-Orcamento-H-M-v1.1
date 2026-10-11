// Densidade de descargas NG por município — NBR 5419-2:2026, Tabela F.1.
// F.1.1 da norma: NG deve vir EXCLUSIVAMENTE desta tabela (não usar outras
// fontes). O arquivo dados/ng_municipios.json foi extraído da própria norma.

// Caminho estático para o empacotador (esbuild) embutir a tabela no pacote.
const tabela = require('../../dados/ng_municipios.json');
const carregar = () => tabela;

const normalizar = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function buscarNg(municipio, uf) {
  const alvo = normalizar(municipio);
  const ufAlvo = String(uf || '').toUpperCase();
  return carregar().find(m => normalizar(m.municipio) === alvo && (!ufAlvo || m.uf === ufAlvo)) || null;
}

// Para quando o nome não bate exatamente: devolve os mais parecidos.
function sugerirMunicipios(texto, uf, limite = 8) {
  const alvo = normalizar(texto);
  const ufAlvo = String(uf || '').toUpperCase();
  return carregar()
    .filter(m => (!ufAlvo || m.uf === ufAlvo) && normalizar(m.municipio).includes(alvo))
    .slice(0, limite);
}

module.exports = { buscarNg, sugerirMunicipios };
