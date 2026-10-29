// Vocabulário do catálogo de componentes de quadros (2.4) — o mesmo do
// backend (services/componentesQuadro.js) e do contrato da skill de quadros.
// A tela do catálogo recebe estas listas do servidor; as janelas de cadastro e
// de busca usam as daqui. O formulário do projeto ("2.1 Fabricantes dos
// componentes") vem do esquema da skill de quadros.

export const FABRICANTES = [
  'ABB', 'Altus', 'Cemar', 'Conexel', 'Delta', 'Dutoplast', 'Eaton', 'Finder', 'Hellermann', 'Legrand', 'Mean Well',
  'Phoenix Contact', 'Rittal', 'Schneider Electric', 'Siemens', 'Steck', 'Taunus', 'WEG', 'Weidmüller',
];

export const TIPOS = {
  disjuntor_din: 'Disjuntor DIN (minidisjuntor)',
  dr: 'Interruptor DR',
  ddr: 'Disjuntor DR (DDR)',
  dps: 'DPS',
  disjuntor_caixa_moldada: 'Disjuntor em caixa moldada',
  seccionadora: 'Seccionadora',
  fusivel_base: 'Base de fusível',
  contator: 'Contator',
  disjuntor_motor: 'Disjuntor-motor',
  rele_sobrecarga: 'Relé de sobrecarga',
  soft_starter: 'Soft-starter',
  inversor: 'Inversor de frequência',
  fonte_24v: 'Fonte 24 Vcc',
  clp_cpu: 'CLP (CPU)',
  clp_modulo: 'Módulo de CLP (E/S)',
  rele_interface: 'Relé de interface',
  rele_seguranca: 'Relé de segurança',
  rele_tempo: 'Relé de tempo',
  switch: 'Switch',
  ihm: 'IHM',
  multimedidor: 'Multimedidor',
  borne: 'Borne',
  canaleta: 'Canaleta',
  trilho_din: 'Trilho DIN',
  involucro: 'Invólucro (quadro/caixa)',
  isolador_barramento: 'Isolador de barramento',
  pente: 'Barramento pente',
  ventilador: 'Ventilador',
  termostato: 'Termostato',
  sinaleiro: 'Sinaleiro',
  botao: 'Botão',
  comutador: 'Comutador',
};
export const rotuloTipo = (t) => TIPOS[t] || t || '—';

export const ROTULO_ORIGEM = { catalogo_hm: 'Catálogo H&M (skill)', usuario: 'Cadastrado', pesquisa_ia: 'Pesquisa IA' };
export const MONTAGENS = [
  { valor: 'din', rotulo: 'Trilho DIN' },
  { valor: 'placa', rotulo: 'Placa de montagem' },
  { valor: 'porta', rotulo: 'Porta' },
  { valor: 'piso', rotulo: 'Piso' },
];

const mm = (v) => (v == null || v === '' ? '?' : String(v).replace('.', ','));
export const textoMedidas = (c) => `${mm(c.largura_mm)} × ${mm(c.altura_mm)} × ${mm(c.profundidade_mm)}`;

// link http(s) seguro para abrir (o que vem do banco/IA é dado, não confiável)
export const linkSeguro = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : null);
