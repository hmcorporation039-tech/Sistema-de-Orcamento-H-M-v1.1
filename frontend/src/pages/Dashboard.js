import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Package } from 'lucide-react';
import {
  getDashboardResumo, getDashboardPorMes, getDashboardTopClientes,
  getDashboardTopMateriais, getDashboardUltimas
} from '../services/api';
import { formatarMoeda, formatarData } from '../utils/format';

const STATUS_CORES = {
  Ativa: { cor: '#c9a227', bg: '#c9a22733' },
  Aprovada: { cor: '#3fb95f', bg: '#3fb95f33' },
  Recusada: { cor: '#b04040', bg: '#b0404033' },
  Cancelada: { cor: '#666', bg: '#66666633' },
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarMesLabel(mes) {
  const [ano, m] = mes.split('-');
  return `${MESES_ABREV[Number(m) - 1]}/${ano.slice(2)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [janela, setJanela] = useState(12);
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [serie, setSerie] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [ultimas, setUltimas] = useState([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [rResumo, rSerie, rClientes, rMateriais, rUltimas] = await Promise.all([
        getDashboardResumo({ meses: janela }),
        getDashboardPorMes({ meses: janela }),
        getDashboardTopClientes({ meses: janela, limite: 5 }),
        getDashboardTopMateriais({ meses: janela, limite: 8 }),
        getDashboardUltimas({ limite: 6 }),
      ]);
      setResumo(rResumo.data);
      setSerie(rSerie.data);
      setClientes(rClientes.data);
      setMateriais(rMateriais.data);
      setUltimas(rUltimas.data);
    } catch {
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setCarregando(false);
    }
  }, [janela]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando && !resumo) {
    return <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>Carregando dashboard...</p>;
  }

  const maxValorMes = Math.max(...serie.map(s => s.valor), 1);
  const maxValorMaterial = Math.max(...materiais.map(m => m.valor), 1);
  const totalPropostasStatus = resumo ? Object.values(resumo.status).reduce((s, v) => s + v.qtd, 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 12 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>📊 Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {[3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setJanela(m)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: janela === m ? '1px solid #c9a227' : '1px solid #2a2a2a',
                background: janela === m ? '#c9a227' : 'transparent',
                color: janela === m ? '#000' : '#999',
              }}
            >
              {m} meses
            </button>
          ))}
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
        <CardResumo label="Propostas emitidas" valor={resumo.propostas} sub={formatarMoeda(resumo.valorTotal)} />
        <CardResumo label="Valor aprovado" valor={formatarMoeda(resumo.valorAprovado)} destaque />
        <CardResumo label="Taxa de aprovação" valor={`${resumo.taxaAprovacao.toFixed(1)}%`} />
        <CardResumo label="Ticket médio" valor={formatarMoeda(resumo.ticketMedio)} />
        <CardResumo
          label="Cadastros"
          valor={
            <span style={{ display: 'flex', gap: 14, fontSize: 15 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} />{resumo.clientes}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Package size={14} />{resumo.materiais}</span>
            </span>
          }
        />
      </div>

      {/* Gráfico mensal */}
      <div style={card}>
        <h3 style={tituloCard}>Propostas por mês</h3>
        {serie.length === 0 ? (
          <p style={vazio}>Nenhum dado no período.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, padding: '10px 4px 0' }}>
            {serie.map(s => {
              const alturaTotal = Math.max((s.valor / maxValorMes) * 140, s.valor > 0 ? 3 : 0);
              const alturaAprovada = Math.max((s.valorAprovado / maxValorMes) * 140, s.valorAprovado > 0 ? 3 : 0);
              return (
                <div key={s.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div
                    title={`${formatarMesLabel(s.mes)} · ${s.propostas} propostas · ${formatarMoeda(s.valor)}`}
                    style={{ width: '100%', maxWidth: 40, height: 140, display: 'flex', alignItems: 'flex-end', position: 'relative' }}
                  >
                    <div style={{ width: '100%', height: alturaTotal, background: '#2a2a2a', borderRadius: '3px 3px 0 0', position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: alturaAprovada, background: '#c9a227', borderRadius: '3px 3px 0 0' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: '#777' }}>{formatarMesLabel(s.mes)}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: '#888' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#2a2a2a', borderRadius: 2, display: 'inline-block' }} /> Total emitido
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: '#c9a227', borderRadius: 2, display: 'inline-block' }} /> Aprovado
          </span>
        </div>
      </div>

      {/* Status + Top clientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <h3 style={tituloCard}>Propostas por status</h3>
          {totalPropostasStatus === 0 ? (
            <p style={vazio}>Nenhuma proposta no período.</p>
          ) : (
            Object.entries(resumo.status).map(([status, dados]) => {
              const cor = STATUS_CORES[status];
              const pct = totalPropostasStatus > 0 ? (dados.qtd / totalPropostasStatus) * 100 : 0;
              return (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#ccc' }}>{status}</span>
                    <span style={{ color: '#888' }}>{dados.qtd} · {formatarMoeda(dados.valor)}</span>
                  </div>
                  <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: cor.cor, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={card}>
          <h3 style={tituloCard}>Top 5 clientes</h3>
          {clientes.length === 0 ? (
            <p style={vazio}>Nenhum cliente com propostas no período.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={thLeve}>Cliente</th>
                  <th style={{ ...thLeve, textAlign: 'right' }}>Propostas</th>
                  <th style={{ ...thLeve, textAlign: 'right' }}>Aprovado</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.nome} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={tdLeve}>{c.nome}</td>
                    <td style={{ ...tdLeve, textAlign: 'right' }}>{c.propostas}</td>
                    <td style={{ ...tdLeve, textAlign: 'right', color: '#c9a227', fontWeight: 700 }}>{formatarMoeda(c.valorAprovado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Top materiais + Últimas propostas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={tituloCard}>Itens mais orçados</h3>
          {materiais.length === 0 ? (
            <p style={vazio}>Nenhum item de material no período.</p>
          ) : (
            materiais.map(m => (
              <div key={m.descricao} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{m.descricao}</span>
                  <span style={{ color: '#888', whiteSpace: 'nowrap' }}>{formatarMoeda(m.valor)}</span>
                </div>
                <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(m.valor / maxValorMaterial) * 100}%`, height: '100%', background: '#c9a227', borderRadius: 3 }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h3 style={tituloCard}>Últimas propostas</h3>
          {ultimas.length === 0 ? (
            <p style={vazio}>Nenhuma proposta cadastrada ainda.</p>
          ) : (
            ultimas.map(p => {
              const cor = STATUS_CORES[p.status] || STATUS_CORES.Ativa;
              return (
                <div
                  key={p.id}
                  onClick={() => navigate('/historico')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
                    borderTop: '1px solid #1e1e1e', cursor: 'pointer', fontSize: 12
                  }}
                >
                  <span style={{ color: '#c9a227', fontWeight: 700, width: 46 }}>{p.numero}</span>
                  <span style={{ flex: 1, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente_nome}</span>
                  <span style={{ color: '#888', fontSize: 11 }}>{formatarData(p.data)}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: cor.cor, background: cor.bg }}>
                    {p.status}
                  </span>
                  <span style={{ color: '#ccc', fontWeight: 700, width: 90, textAlign: 'right' }}>{formatarMoeda(p.total)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function CardResumo({ label, valor, sub, destaque }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: destaque ? '#c9a227' : '#e8e0cc' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 18, marginBottom: 0
};

const tituloCard = { fontSize: 13, color: '#c9a227', fontWeight: 700, marginBottom: 14 };
const vazio = { fontSize: 12, color: '#555', textAlign: 'center', padding: '20px 0' };
const thLeve = { padding: '6px 4px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 };
const tdLeve = { padding: '8px 4px', color: '#ccc' };
