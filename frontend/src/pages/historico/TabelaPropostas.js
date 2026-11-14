import { Trash2, Pencil, Link2, CheckCircle2, XCircle } from 'lucide-react';
import { formatarMoeda, formatarData, dataHoraBr } from '../../utils/format';
import { estilos } from '../../components/ui/estilos';
import Etiqueta from '../../components/ui/Etiqueta';
import { STATUS_PROPOSTA as STATUS_CORES } from '../../utils/statusProposta';
import { diasParaVencer, th, td, tdVazio, btnIcone } from './apoio';

// Decisão do cliente pelo link de aprovação (decisao_cliente da listagem:
// { decisao, nome, data } da última decisão). Selo pequeno ao lado do status;
// o nome e a hora ficam na dica (title) para não alargar a tabela.
export function SeloDecisaoCliente({ decisao }) {
  if (!decisao?.decisao) return null;
  const aprovou = decisao.decisao === 'aprovada';
  const quando = decisao.data ? new Date(decisao.data) : null;
  const dica = `${aprovou ? 'Aprovada' : 'Recusada'} pelo cliente pelo link de aprovação`
    + (decisao.nome ? ` — ${decisao.nome}` : '')
    + (quando ? `, ${dataHoraBr(quando)}` : '');
  const Icone = aprovou ? CheckCircle2 : XCircle;
  return (
    <Etiqueta titulo={dica} aria-label={dica} data-testid="selo-decisao-cliente"
      bg={aprovou ? '#0a1a0f' : '#1a0a0a'} cor={aprovou ? '#3fb95f' : '#d06060'}
      style={{
        marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', verticalAlign: 'middle',
        whiteSpace: 'normal', border: `1px dashed ${aprovou ? '#1a4a26' : '#4a1a1a'}`,
      }}>
      <Icone size={11} /> {aprovou ? 'Cliente aprovou' : 'Cliente recusou'}
      {quando ? ` ${quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
    </Etiqueta>
  );
}

// Tabela da lista de propostas: status, aviso de vencimento, decisão do cliente e as ações
// (editar, link de aprovação, excluir). A linha inteira abre o detalhe.
export default function TabelaPropostas({ linhas, carregando, temPeriodo, onAbrir, onEditar, onLinkAprovacao, onExcluir }) {
  return (
    <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
            <th style={th}>Número</th>
            <th style={th}>Data</th>
            <th style={th}>Cliente</th>
            <th style={th}>Local</th>
            <th style={{ ...th, textAlign: 'right' }}>Total</th>
            <th style={th}>Status</th>
            <th style={{ ...th, width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {carregando && (
            <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
          )}
          {!carregando && linhas.length === 0 && (
            <tr><td colSpan={7} style={tdVazio}>{temPeriodo ? 'Nenhuma proposta encontrada no período.' : 'Nenhuma proposta encontrada'}</td></tr>
          )}
          {!carregando && linhas.map(p => {
            const cor = STATUS_CORES[p.status] || STATUS_CORES.Ativa;
            const dias = diasParaVencer(p);
            return (
              <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={() => onAbrir(p.id)}>
                <td style={{ ...td, color: '#c9a227', fontWeight: 700 }}>
                  {/* botão para abrir pelo teclado também (Tab + Enter); o clique na linha continua valendo */}
                  <button type="button" style={estilos.botaoTexto} aria-label={`Abrir a proposta ${p.numero}`}
                    onClick={(e) => { e.stopPropagation(); onAbrir(p.id); }}>{p.numero}</button>
                </td>
                <td style={td}>{formatarData(p.data)}</td>
                <td style={td}>{p.cliente_nome}</td>
                <td style={td}>{p.local_obra || '—'}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(p.total)}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: cor.bg, color: cor.cor, border: `1px solid ${cor.borda}` }}>
                    {p.status}
                  </span>
                  {dias !== null && dias < 0 && (
                    <span style={{ marginLeft: 6, padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: '#1a0a0a', color: '#b04040', border: '1px solid #4a1a1a' }}>
                      Vencida
                    </span>
                  )}
                  {dias !== null && dias >= 0 && dias <= 3 && (
                    <span style={{ marginLeft: 6, padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: '#1a1408', color: '#d69a2d', border: '1px solid #4a3a10' }}>
                      {dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`}
                    </span>
                  )}
                  <SeloDecisaoCliente decisao={p.decisao_cliente} />
                </td>
                <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onEditar(p.id)} style={btnIcone} title="Editar">
                      <Pencil size={13} />
                    </button>
                    {p.status === 'Ativa' && (
                      <button onClick={() => onLinkAprovacao({ id: p.id, numero: p.numero, status: p.status })}
                        style={btnIcone} title="Link de aprovação para o cliente"
                        aria-label={`Link de aprovação da proposta ${p.numero}`} data-testid="abrir-link-aprovacao">
                        <Link2 size={13} />
                      </button>
                    )}
                    {/* mantém o "excluir" alinhado nas linhas sem o ícone do link */}
                    {p.status !== 'Ativa' && <span aria-hidden="true" style={{ width: 26, flex: '0 0 26px' }} />}
                    <button onClick={() => onExcluir(p)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
