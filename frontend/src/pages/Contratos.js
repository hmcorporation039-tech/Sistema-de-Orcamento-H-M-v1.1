import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, FileDown, Trash2, X } from 'lucide-react';
import { getContratos, criarContrato, removerContrato, getPrestadores } from '../services/api';
import api from '../services/api';
import Paginacao from '../components/Paginacao';
import { formatarMoeda, formatarData } from '../utils/format';

const VAZIO = { prestadorId: '', objeto: '', localObra: '', periodoInicio: '', periodoFim: '', valor: '' };

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [baixandoId, setBaixandoId] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina };
      if (busca) params.busca = busca;
      const res = await getContratos(params);
      setContratos(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
    } catch {
      toast.error('Erro ao carregar contratos');
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca]);

  useEffect(() => {
    getPrestadores({ porPagina: 1000 }).then(res => setPrestadores(res.data.itens)).catch(() => {});
  }, []);

  function abrirNovo() {
    setForm(VAZIO);
    setModalAberto(true);
  }

  async function baixarPdf(id) {
    setBaixandoId(id);
    try {
      const res = await api.get(`/contratos/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contrato_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar PDF do contrato');
    } finally {
      setBaixandoId(null);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.prestadorId) {
      toast.error('Selecione o prestador');
      return;
    }
    if (!form.periodoInicio || !form.periodoFim) {
      toast.error('Informe o período do contrato');
      return;
    }
    if (form.periodoFim < form.periodoInicio) {
      toast.error('A data final não pode ser anterior à inicial');
      return;
    }
    if (!(Number(form.valor) > 0)) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    setSalvando(true);
    try {
      const res = await criarContrato(form);
      toast.success('Contrato gerado');
      setModalAberto(false);
      carregar();
      await baixarPdf(res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar contrato');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c) {
    if (!window.confirm(`Remover o contrato de "${c.prestador_nome}"?`)) return;
    try {
      await removerContrato(c.id);
      toast.success('Contrato removido');
      carregar();
    } catch {
      toast.error('Erro ao remover contrato');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Contratos de Prestação de Serviço</h2>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome do prestador..."
            style={{ paddingLeft: 30 }}
          />
        </div>

        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Contrato
        </button>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Nº</th>
              <th style={th}>Prestador</th>
              <th style={th}>Tipo</th>
              <th style={th}>Local da Obra</th>
              <th style={th}>Período</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && contratos.length === 0 && (
              <tr><td colSpan={7} style={tdVazio}>Nenhum contrato encontrado</td></tr>
            )}
            {!carregando && contratos.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{String(c.id).padStart(4, '0')}</td>
                <td style={td}>{c.prestador_nome}</td>
                <td style={td}>{c.prestador_tipo === 'Pessoa Jurídica' ? 'PJ' : 'PF'}</td>
                <td style={td}>{c.local_obra || '—'}</td>
                <td style={td}>{formatarData(c.periodo_inicio)} a {formatarData(c.periodo_fim)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>
                  {formatarMoeda(c.valor)}
                </td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => baixarPdf(c.id)} disabled={baixandoId === c.id} style={btnIcone} title="Baixar PDF">
                    <FileDown size={13} />
                  </button>
                  <button onClick={() => excluir(c)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {modalAberto && (
        <div style={overlay} onClick={() => setModalAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Novo Contrato</h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ marginBottom: 12 }}>
                <Campo label="Prestador *">
                  <select value={form.prestadorId} onChange={e => setForm({ ...form, prestadorId: e.target.value })} autoFocus>
                    <option value="">Selecione...</option>
                    {prestadores.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.tipo === 'Pessoa Jurídica' ? 'PJ' : 'PF'})
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Campo label="Objeto do contrato">
                  <textarea
                    rows={2}
                    value={form.objeto}
                    onChange={e => setForm({ ...form, objeto: e.target.value })}
                    placeholder="Ex: prestação de serviços de instalação elétrica e automação"
                  />
                </Campo>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Campo label="Local da obra">
                  <input value={form.localObra} onChange={e => setForm({ ...form, localObra: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Início *">
                  <input type="date" value={form.periodoInicio} onChange={e => setForm({ ...form, periodoInicio: e.target.value })} />
                </Campo>
                <Campo label="Término *">
                  <input type="date" value={form.periodoFim} onChange={e => setForm({ ...form, periodoFim: e.target.value })} />
                </Campo>
                <Campo label="Valor (R$) *">
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                  />
                </Campo>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Gerando...' : 'Gerar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 };
const td = { padding: '10px 14px', color: '#ccc', verticalAlign: 'middle' };
const tdVazio = { padding: '30px 14px', textAlign: 'center', color: '#555' };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
  borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};

const overlay = {
  position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20
};

const modal = {
  background: '#131313', border: '1px solid #2a2a2a', borderRadius: 12,
  padding: 28, width: 500, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
