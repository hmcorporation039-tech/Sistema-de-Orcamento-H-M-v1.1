import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileDown, FileSpreadsheet, Search } from 'lucide-react';
import { getRelatorioPropostas } from '../services/api';
import api from '../services/api';
import { formatarMoeda, formatarData } from '../utils/format';

const STATUS_CORES = {
  Ativa: { bg: '#1a1a0a', cor: '#c9a227', borda: '#4a3d10' },
  Aprovada: { bg: '#0a1a0f', cor: '#3fb95f', borda: '#1a4a26' },
  Recusada: { bg: '#1a0a0a', cor: '#b04040', borda: '#4a1a1a' },
  Cancelada: { bg: '#141414', cor: '#666', borda: '#2a2a2a' },
};

export default function Relatorios() {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [propostas, setPropostas] = useState([]);
  const [totais, setTotais] = useState({ propostas: 0, valorTotal: 0, valorAprovado: 0 });
  const [exportando, setExportando] = useState(null);
  const [inicializado, setInicializado] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (status) params.status = status;
      if (busca) params.busca = busca;

      const res = await getRelatorioPropostas(params);
      setPropostas(res.data.propostas);
      setTotais(res.data.totais);
      if (!inicializado) {
        setDataInicio(res.data.dataInicio);
        setDataFim(res.data.dataFim);
        setInicializado(true);
      }
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim, status, busca, inicializado]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  async function exportar(tipo) {
    if (!dataInicio || !dataFim) return;
    setExportando(tipo);
    try {
      const params = { dataInicio, dataFim };
      if (status) params.status = status;
      if (busca) params.busca = busca;

      const res = await api.get(`/relatorios/propostas/${tipo}`, { params, responseType: 'blob' });
      const mime = tipo === 'csv' ? 'text/csv' : 'application/pdf';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_Propostas_${dataInicio}_a_${dataFim}.${tipo}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Erro ao exportar ${tipo.toUpperCase()}`);
    } finally {
      setExportando(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>📈 Relatórios</h2>
      </div>

      {/* Filtros */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto auto', gap: 12, alignItems: 'end' }}>
          <Campo label="Data início">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </Campo>
          <Campo label="Data fim">
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </Campo>
          <Campo label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="Ativa">Ativa</option>
              <option value="Aprovada">Aprovada</option>
              <option value="Recusada">Recusada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </Campo>
          <Campo label="Buscar">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Número, cliente ou local..."
                style={{ paddingLeft: 30 }}
              />
            </div>
          </Campo>
          <button
            onClick={() => exportar('csv')}
            disabled={!!exportando || propostas.length === 0}
            style={btnSecundario}
          >
            <FileSpreadsheet size={13} style={{ marginRight: 4 }} /> {exportando === 'csv' ? 'Gerando...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => exportar('pdf')}
            disabled={!!exportando || propostas.length === 0}
            style={btnPrimario}
          >
            <FileDown size={13} style={{ marginRight: 4 }} /> {exportando === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <CardResumo label="Propostas no período" valor={totais.propostas} />
        <CardResumo label="Valor total" valor={formatarMoeda(totais.valorTotal)} />
        <CardResumo label="Valor aprovado" valor={formatarMoeda(totais.valorAprovado)} destaque />
      </div>

      {/* Tabela */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Número</th>
              <th style={th}>Data</th>
              <th style={th}>Cliente</th>
              <th style={th}>Local</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={6} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && propostas.length === 0 && (
              <tr><td colSpan={6} style={tdVazio}>Nenhuma proposta encontrada no período.</td></tr>
            )}
            {!carregando && propostas.map(p => {
              const cor = STATUS_CORES[p.status] || STATUS_CORES.Ativa;
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={() => navigate('/historico')}>
                  <td style={{ ...td, color: '#c9a227', fontWeight: 700 }}>{p.numero}</td>
                  <td style={td}>{formatarData(p.data)}</td>
                  <td style={td}>{p.cliente_nome}</td>
                  <td style={td}>{p.local_obra || '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cor.bg, color: cor.cor, border: `1px solid ${cor.borda}` }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(p.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardResumo({ label, valor, destaque }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: destaque ? '#c9a227' : '#e8e0cc' }}>{valor}</div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={rotulo}>{label}</label>
      {children}
    </div>
  );
}

const rotulo = { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' };

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 18, marginBottom: 16
};

const th = { padding: '10px 14px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 };
const td = { padding: '10px 14px', color: '#ccc', verticalAlign: 'middle' };
const tdVazio = { padding: '30px 14px', textAlign: 'center', color: '#555' };

const btnPrimario = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 16px',
  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
  color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};
