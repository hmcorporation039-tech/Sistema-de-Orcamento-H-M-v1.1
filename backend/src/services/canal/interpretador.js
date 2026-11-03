// Interpretador LOCAL do canal (Fase 6, "menos IA"): os pedidos frequentes são reconhecidos aqui, sem
// gastar cota, com tolerância a acento, caixa e pontuação. O que não casar vai para o assistente.
//
//   ajuda | /start | menu                        → lista de comandos
//   /vincular 123456                             → liga este chat ao usuário (código da tela "Minha conta")
//   SIM 4821 | NÃO                               → confirma / cancela a ação pendente
//   1, 2, 3…                                     → escolhe na lista "qual delas?"
//   custos <obra> [este mês]                     → custos da obra por categoria (financeiro)
//   margem <obra>                                → orçado × realizado (financeiro)
//   notas abertas | notas a receber              → notas emitidas esperando pagamento (financeiro)
//   pix sem obra                                 → lançamentos sem obra (financeiro)
//   vencimentos                                  → laudos (e documentos da empresa) vencendo
//   novidades                                    → arquivos novos nas pastas dos clientes
//   cotações                                     → oportunidades de preço das cotações
//   proposta <nº>                                → resumo da proposta e a conferência de envio
//   enviar <proposta> para <cliente ou e-mail>   → ação pendente (SIM 4821)
//   enviar projeto <nome> para <cliente ou e-mail> → ação pendente (SIM 4821)
const { semAcento } = require('../../utils/texto');

const EMAIL = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[A-Za-z]{2,}/;

const normalizar = (texto) => semAcento(String(texto || ''))
  .toLowerCase()
  .replace(/[‘’“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/[\s?!.;:]+$/g, '');

const MES = /\b(?:(?:n?este|n?esse|deste|desse|do|no|neste|nesse)\s+mes(?:\s+atual)?|mes\s+atual|no\s+mes|mensal)\b/;

function interpretar(textoOriginal) {
  const original = String(textoOriginal || '').trim();
  const t = normalizar(original);
  if (!t) return null;

  if (/^\/?(start|ajuda|help|menu|comandos|\?|oi|ola)$/.test(t)) return { comando: 'ajuda' };

  let m = t.match(/^\/?vincular\s*:?\s*(\S+)$/);
  if (m) return { comando: 'vincular', codigo: m[1] };
  if (/^\/?vincular$/.test(t)) return { comando: 'vincular', codigo: null };

  m = t.match(/^(?:sim|confirmo|confirmar|confirma)\b[\s,.:;-]*(\d{4,6})?$/);
  if (m) return { comando: 'confirmar', codigo: m[1] || null };
  if (/^(?:nao|cancelar|cancela|cancele|desistir|desisto)$/.test(t)) return { comando: 'cancelar' };

  if (/^\d{1,2}$/.test(t)) return { comando: 'escolha', indice: Number(t) };

  m = t.match(/^(?:custos?|gastos?|despesas?)\s+(.+)$/);
  if (m) {
    const mes = MES.test(m[1]);
    const obra = m[1].replace(MES, ' ').replace(/^(?:d[aoe]s?|na|no)\s+/, '').replace(/^obra\s+/, '').replace(/\s+/g, ' ').trim();
    if (obra) return { comando: 'custos', obra, mes };
  }
  m = t.match(/^margem\s+(?:d[aoe]s?\s+)?(?:obra\s+)?(.+)$/);
  if (m) return { comando: 'margem', obra: m[1] };

  if (/^(?:notas?(?: fiscais)?\s+(?:em\s+)?(?:abertas?|aberto|pendentes?)|notas?(?: fiscais)?\s+a\s+receber|a\s+receber|o que falta receber)$/.test(t)) return { comando: 'notas_a_receber' };
  if (/^(?:pix|lancamentos?|movimentos?)\s+sem\s+obra$/.test(t)) return { comando: 'pix_sem_obra' };
  if (/^(?:vencimentos?|vencendo|o que (?:esta )?vence(?:ndo)?|laudos? (?:a )?vencer|laudos? vencendo)$/.test(t)) return { comando: 'vencimentos' };
  if (/^(?:novidades?|novidades? (?:das|nas) pastas?|arquivos? novos?)$/.test(t)) return { comando: 'novidades' };
  if (/^(?:cotacoes|cotacao|cotacoes de fornecedores?|oportunidades)$/.test(t)) return { comando: 'cotacoes' };

  m = t.match(/^(?:proposta|prop|orcamento)\s+(?:n(?:o|º|°|r)?\.?\s*)?(.+)$/);
  if (m && !/\s(?:para|pra)\s/.test(m[1])) return { comando: 'proposta', termo: m[1] };

  m = t.match(/^(?:enviar|envie|envia|manda|mande|mandar)\s+(?:o\s+|a\s+)?(.+?)\s+(?:para|pra|p\/)\s+(.+)$/);
  if (m) {
    const email = original.match(EMAIL)?.[0] || null;
    const destino = email || m[2].replace(/^(?:o|a)\s+/, '').trim();
    let alvo = m[1].trim();
    if (/^projeto\b/.test(alvo)) {
      alvo = alvo.replace(/^projeto\s+/, '').replace(/^(?:d[aoe]s?)\s+/, '').trim();
      if (alvo) return { comando: 'enviar_projeto', termo: alvo, destino, email };
    }
    alvo = alvo.replace(/^(?:proposta|orcamento)\s+/, '').replace(/^(?:d[aoe]s?)\s+/, '').trim();
    if (alvo) return { comando: 'enviar_proposta', termo: alvo, destino, email };
  }
  return null;
}

const AJUDA = [
  'Comandos (sem acento e sem maiúscula também valem):',
  '• custos <obra> — gastos da obra por categoria (acrescente "este mês" para só o mês)',
  '• margem <obra> — orçado × realizado',
  '• notas abertas — notas emitidas esperando pagamento',
  '• pix sem obra — lançamentos ainda sem obra',
  '• vencimentos — laudos e documentos vencendo',
  '• novidades — arquivos novos nas pastas dos clientes',
  '• cotações — oportunidades de preço dos fornecedores',
  '• proposta <nº> — resumo da proposta (ex.: proposta 254)',
  '• enviar <proposta> para <cliente ou e-mail> — pede confirmação "SIM 1234"',
  '• enviar projeto <nome> para <cliente ou e-mail> — pede confirmação "SIM 1234"',
  'O resto vai para o assistente.',
].join('\n');

module.exports = { interpretar, normalizar, AJUDA, EMAIL };
