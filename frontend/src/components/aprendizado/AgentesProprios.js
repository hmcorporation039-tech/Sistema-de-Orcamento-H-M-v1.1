import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Check, X } from 'lucide-react';
import { listarSugestoesAgentes, decidirSugestaoAgentes, indicadoresAgentes } from '../../services/assistente';
import { estilos } from '../ui/estilos';

// Agentes próprios (09/11/2026) na tela "O que o sistema sabe":
//   - dependência de IA por agente: quantas execuções e quantas vezes pediram o suporte Claude Max (deve cair);
//   - o roteador do assistente: pedidos que saíram sem IA × os que foram para a IA, e quantos o usuário aprovou;
//   - sugestões PENDENTES (regras do roteador e conhecimento vindo do Claude Max): nada vale sem aprovação.
//     Regra do roteador só o administrador aprova; conhecimento, o administrador ou quem fez o pedido.
const NOMES = {
  analise_projeto: 'Análise de projeto', projeto_disciplina: 'Projeto da disciplina', orcamento: 'Orçamento',
  pesquisa_precos: 'Pesquisa de preços', quadro_especificacao: 'Quadro pela especificação', consultor: 'Pesquisa aprofundada (usuário)',
};
const DECISAO = { agente: 'agente próprio (sem IA)', resposta: 'resposta sem IA', suporte: 'suporte Claude Max', ia: 'conversa com a IA' };

export function TabelaDependencia({ porAgente }) {
  const linhas = Object.entries(porAgente || {});
  if (!linhas.length) return <p style={estilos.ajuda}>Nenhuma execução de agente no período.</p>;
  return (
    <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
      <thead><tr style={{ color: 'var(--texto-3)', textAlign: 'left' }}><th>Agente</th><th>Execuções</th><th>Pediu o Claude</th><th>Dependência de IA</th></tr></thead>
      <tbody>
        {linhas.map(([ag, v]) => (
          <tr key={ag} data-agente={ag}>
            <td>{NOMES[ag] || ag}</td>
            <td>{v.execucoes}</td>
            <td>{v.suporte}{v.suporte ? ` (${v.suporte_ok} respondido${v.suporte_ok === 1 ? '' : 's'})` : ''}</td>
            <td>{v.dependencia_pct == null ? '—' : `${String(v.dependencia_pct).replace('.', ',')} %`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AgentesProprios({ ehAdmin }) {
  const [ind, setInd] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const carregar = useCallback(async () => {
    try {
      const [i, s] = await Promise.all([indicadoresAgentes(6), listarSugestoesAgentes({ situacao: 'pendente' })]);
      setInd(i.data); setSugestoes(s.data);
    } catch { /* tabela ainda não migrada: a seção fica vazia */ }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(s, situacao) {
    try {
      await decidirSugestaoAgentes(s.id, { situacao });
      toast.success(situacao === 'aprovada' ? 'Aprovada: o agente passa a usar sem IA.' : 'Recusada.');
      setSugestoes(l => l.filter(x => x.id !== s.id));
    } catch (e) { toast.error(e?.response?.data?.erro || 'Não foi possível decidir.'); }
  }

  return (
    <div style={estilos.card} data-testid="agentes-proprios">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', fontSize: 15, color: 'var(--texto)' }}><Bot size={17} color="var(--ouro)" />Agentes próprios e dependência de IA (últimos 6 meses)</h3>
      <TabelaDependencia porAgente={ind?.porAgente} />
      {ind?.roteador?.length > 0 && (
        <p style={{ ...estilos.ajuda, marginTop: 10 }}>
          Roteador do assistente: {ind.roteador.map(r => `${r.n} ${DECISAO[r.decisao] || r.decisao}${r.aceitos || r.recusados ? ` (${r.aceitos} serviram, ${r.recusados} não)` : ''}`).join(' · ')}.
        </p>
      )}
      <h4 style={{ margin: '16px 0 6px', fontSize: 13.5 }}>Sugestões esperando aprovação ({sugestoes.length})</h4>
      {!sugestoes.length && <p style={estilos.ajuda}>Nada pendente. As regras do roteador e as respostas do suporte Claude Max aparecem aqui antes de valer.</p>}
      {sugestoes.map(s => (
        <div key={s.id} data-sugestao={s.id} style={{ borderTop: '1px solid var(--borda)', padding: '8px 0', fontSize: 12.5 }}>
          <div style={{ color: 'var(--texto-3)', fontSize: 11.5 }}>
            {s.tipo === 'vocabulario' ? 'Regra do roteador' : 'Conhecimento'} · fonte {s.fonte}{s.modo ? ` (${s.modo})` : ''}{s.agente ? ` · ${NOMES[s.agente] || s.agente}` : ''} · {new Date(s.criado_em).toLocaleDateString('pt-BR')}{s.vezes > 1 ? ` · ${s.vezes}×` : ''}
          </div>
          <div style={{ fontWeight: 600, margin: '2px 0' }}>{s.pergunta.slice(0, 240)}</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--texto-2)', maxHeight: 160, overflowY: 'auto' }}>{s.resposta.slice(0, 2000)}</div>
          {(s.tipo !== 'vocabulario' || ehAdmin) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button style={estilos.btnPrimario} onClick={() => decidir(s, 'aprovada')}><Check size={13} /> Aprovar</button>
              <button style={estilos.btnSecundario} onClick={() => decidir(s, 'recusada')}><X size={13} /> Recusar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
