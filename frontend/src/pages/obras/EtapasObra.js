import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { STATUS_OBRA, estilos as E } from './comum';

// Etapas da obra e "próximo passo" (revisão da aba Obras, 2.42). A regra do próximo passo é do backend
// (utils/obras.js, proximoPasso) e vem pronta em obra.proximo_passo = { texto, acao } — a tela só mostra.
//   acao.tipo 'secao'  → abre a seção da página da obra (onSecao)
//   acao.tipo 'link'   → vai para outra tela
//   acao.tipo 'status' → muda o status (onStatus; a pessoa confirma)
export const ETAPAS = ['prospeccao', 'orcamento', 'contratada', 'execucao', 'concluida'];

export function LinhaEtapas({ status }) {
  const atual = ETAPAS.indexOf(status);
  const fora = atual < 0; // cancelada
  return (
    <ol aria-label="Etapas da obra" style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: 0, flexWrap: 'wrap', alignItems: 'center' }}>
      {ETAPAS.map((s, i) => {
        const feita = !fora && i < atual;
        const agora = !fora && i === atual;
        const cor = agora ? STATUS_OBRA[s].cor : feita ? '#8a7a3a' : '#444';
        return (
          <li key={s} aria-current={agora ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: agora ? 'var(--texto)' : feita ? 'var(--texto-2)' : 'var(--texto-3)', fontWeight: agora ? 700 : 500 }}>
            {i > 0 && <span aria-hidden="true" style={{ width: 28, height: 2, background: feita || agora ? '#8a7a3a' : '#2a2a2a', margin: '0 6px' }} />}
            <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${cor}`, background: agora ? cor : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {feita && <Check size={11} color="#c9a227" />}
            </span>
            {STATUS_OBRA[s].rotulo}
          </li>
        );
      })}
    </ol>
  );
}

// Botão da ação do próximo passo (ou nada, quando não há ação)
export function BotaoProximoPasso({ acao, onSecao, onStatus, podeEditar = true, compacto = false }) {
  if (!acao) return null;
  const estilo = compacto ? { ...E.btnSecundario, padding: '5px 10px', fontSize: 12 } : E.btnPrimario;
  if (acao.tipo === 'link') return <Link to={acao.para} style={estilo}>{acao.rotulo} <ArrowRight size={13} /></Link>;
  if (acao.tipo === 'secao') return <button type="button" onClick={() => onSecao?.(acao.secao)} style={estilo}>{acao.rotulo} <ArrowRight size={13} /></button>;
  if (acao.tipo === 'status' && podeEditar && onStatus) return <button type="button" onClick={() => onStatus(acao.para)} style={estilo}>{acao.rotulo}</button>;
  return null;
}
