// Perfis de acesso (Fase 6, 02/11/2026) — os mesmos de backend/src/middleware/auth.js (PAPEIS).
// 'financeiro' e 'tecnico' ainda não mudam o que cada um vê: as telas que já existiam continuam
// separadas só entre administrador e os demais. O servidor usa exigePapel nas rotas novas.
export const PAPEIS = [
  { valor: 'admin', rotulo: 'Administrador' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
  { valor: 'tecnico', rotulo: 'Técnico de campo' },
  { valor: 'user', rotulo: 'Usuário' },
];

export const rotuloPapel = (valor) => PAPEIS.find(p => p.valor === valor)?.rotulo || 'Usuário';

export const CANAIS = [
  { valor: 'telegram', rotulo: 'Telegram' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
];
export const rotuloCanal = (valor) => CANAIS.find(c => c.valor === valor)?.rotulo || valor;
