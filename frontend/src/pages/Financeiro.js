import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileSpreadsheet, RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import {
  getFinanceiroMovimentos, verificarPixAgora, getPrestadores,
  criarFinanceiroMovimento, atualizarFinanceiroMovimento, categorizarFinanceiroMovimento, removerFinanceiroMovimento,
} from '../services/api';
import api from '../services/api';
import { formatarMoeda } from '../utils/format';

const TIPO_INFO = {
  recebido: { label: 'Recebido', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' },
  realizado: { label: 'Realizado', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a' },
};

const CATEGORIA_INFO = {
  mao_de_obra: 'Mão de obra',
  material: 'Material',
  despesa: 'Despesa diária',
};

const VAZIO = { tipo: 'recebido', nome: '', valor: '', dataHora: '', idTransacao: '' };
const VAZIO_VINCULO = { prestadorId: '', categoria: '' };

function paraDatetimeLocal(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Financeiro() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [prestadorId, setPrestadorId] = useState('');
  const [prestadores, setPrestadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [movimentos, setMovimentos] = useState([]);
  const [totais, setTotais] = useState({ recebido: 0, realizado: 0, saldo: 0 });
  const [inicializado, setInicializado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [vinculoAberto, setVinculoAberto] = useState(false);
  const [vinculandoId, setVinculandoId] = useState(null);
  const [formVinculo, setFormVinculo] = useState(VAZIO_VINCULO);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (tipo) params.tipo = tipo;
      if (busca) params.busca = busca;
      if (categoria) params.categoria = categoria;
      if (prestadorId) params.prestadorId = prestadorId;

      const res = await getFinanceiroMovimentos(params);
      setMovimentos(res.data.movimentos);
      setTotais(res.data.totais);
      if (!inicializado) {
        setDataInicio(res.data.dataInicio);
        setDataFim(res.data.dataFim);
        setInicializado(true);
      }
    } catch {
      toast.error('Erro ao carregar movimentos financeiros');
    } finally {
      setCarregando(false);
    }
  }, [dataInicio, dataFim, tipo, busca, categoria, prestadorId, inicializado]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    getPrestadores({ porPagina: 1000 }).then(res => setPrestadores(res.data.itens)).catch(() => {});
  }, []);

  async function verificarAgora() {
    setVerificando(true);
    try {
      const res = await verificarPixAgora();
      toast.success(`${res.data.movimentosImportados}/${res.data.emailsEncontrados} movimentos importados`);
      res.data.avisos?.forEach(a => toast(a));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao verificar e-mails de Pix');
    } finally {
      setVerificando(false);
    }
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...VAZIO, dataHora: paraDatetimeLocal() });
    setModalAberto(true);
  }

  function abrirEdicao(m) {
    setEditandoId(m.id);
    setForm({
      tipo: m.tipo, nome: m.nome || '', valor: String(m.valor),
      dataHora: paraDatetimeLocal(m.data_hora), idTransacao: m.id_transacao || '',
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!(Number(form.valor) > 0)) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    if (!form.dataHora) {
      toast.error('Informe a data/hora');
      return;
    }
    setSalvando(true);
    try {
      const dados = { ...form, dataHora: new Date(form.dataHora).toISOString() };
      if (editandoId) {
        await atualizarFinanceiroMovimento(editandoId, dados);
        toast.success('Lançamento atualizado');
      } else {
        await criarFinanceiroMovimento(dados);
        toast.success('Lançamento cadastrado');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar lançamento');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(m) {
    if (!window.confirm(`Remover o lançamento de ${m.nome || 'valor'} ${formatarMoeda(m.valor)}?`)) return;
    try {
      await removerFinanceiroMovimento(m.id);
      toast.success('Lançamento removido');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover lançamento');
    }
  }

  function abrirVinculo(m) {
    setVinculandoId(m.id);
    setFormVinculo({ prestadorId: m.prestador_id || '', categoria: m.categoria || '' });
    setVinculoAberto(true);
  }

  async function salvarVinculo(e) {
    e.preventDefault();
    setSalvandoVinculo(true);
    try {
      await categorizarFinanceiroMovimento(vinculandoId, {
        prestadorId: formVinculo.prestadorId || null,
        categoria: formVinculo.categoria || null,
      });
      toast.success('Vínculo salvo');
      setVinculoAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar vínculo');
    } finally {
      setSalvandoVinculo(false);
    }
  }

  async function exportarCsv() {
    if (!dataInicio || !dataFim) return;
    setExportando(true);
    try {
      const params = { dataInicio, dataFim };
      if (tipo) params.tipo = tipo;
      if (busca) params.busca = busca;
      if (categoria) params.categoria = categoria;
      if (prestadorId) params.prestadorId = prestadorId;

      const res = await api.get('/financeiro/movimentos/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Financeiro_Pix_${dataInicio}_a_${dataFim}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 12 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Financeiro</h2>
        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={13} style={{ marginRight: 4 }} /> Novo lançamento
        </button>
        <button onClick={verificarAgora} disabled={verificando} style={btnSecundario}>
          <RefreshCw size={13} style={{ marginRight: 5 }} /> {verificando ? 'Verificando...' : 'Verificar agora'}
        </button>
      </div>

      {/* Filtros */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: 12, alignItems: 'end', marginBottom: 12 }}>
          <Campo label="Data início">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </Campo>
          <Campo label="Data fim">
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </Campo>
          <Campo label="Tipo">
            <select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="recebido">Recebido</option>
              <option value="realizado">Realizado</option>
            </select>
          </Campo>
          <Campo label="Buscar">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Nome do favorecido ou pagador..."
                style={{ paddingLeft: 30 }}
              />
            </div>
          </Campo>
          <button onClick={exportarCsv} disabled={exportando || movimentos.length === 0} style={btnPrimario}>
            <FileSpreadsheet size={13} style={{ marginRight: 4 }} /> {exportando ? 'Gerando...' : 'Exportar CSV'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Categoria">
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              <option value="mao_de_obra">Mão de obra</option>
              <option value="material">Material</option>
              <option value="despesa">Despesa diária</option>
            </select>
          </Campo>
          <Campo label="Prestador">
            <select value={prestadorId} onChange={e => setPrestadorId(e.target.value)}>
              <option value="">Todos</option>
              {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <CardResumo label="Total recebido" valor={formatarMoeda(totais.recebido)} cor="#3fb95f" icone={<ArrowDownCircle size={16} />} />
        <CardResumo label="Total realizado" valor={formatarMoeda(totais.realizado)} cor="#e08080" icone={<ArrowUpCircle size={16} />} />
        <CardResumo label="Saldo do período" valor={formatarMoeda(totais.saldo)} cor="#c9a227" destaque />
      </div>

      {/* Tabela */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Data</th>
              <th style={th}>Tipo</th>
              <th style={th}>Nome</th>
              <th style={th}>Prestador</th>
              <th style={th}>Categoria</th>
              <th style={{ ...th, textAlign: 'right' }}>Valor</th>
              <th style={{ ...th, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && movimentos.length === 0 && (
              <tr><td colSpan={7} style={tdVazio}>Nenhum movimento encontrado no período.</td></tr>
            )}
            {!carregando && movimentos.map(m => {
              const info = TIPO_INFO[m.tipo] || TIPO_INFO.recebido;
              return (
                <tr key={m.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                  <td style={td}>{new Date(m.data_hora).toLocaleString('pt-BR')}</td>
                  <td style={td}>
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: info.bg, color: info.cor, border: `1px solid ${info.borda}` }}>
                      {info.label}
                    </span>
                  </td>
                  <td style={td}>{m.nome || '—'}</td>
                  <td style={td}>{m.prestador_nome || '—'}</td>
                  <td style={td}>{CATEGORIA_INFO[m.categoria] || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: info.cor }}>
                    {m.tipo === 'realizado' ? '- ' : '+ '}{formatarMoeda(m.valor)}
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => abrirVinculo(m)} style={btnIcone} title="Vincular prestador/categoria">
                      <Tag size={12} />
                    </button>
                    {m.origem === 'manual' && (
                      <>
                        <button onClick={() => abrirEdicao(m)} style={btnIcone} title="Editar">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => excluir(m)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={overlay} onClick={() => setModalAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {editandoId ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Tipo">
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="recebido">Recebido</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </Campo>
                <Campo label="Valor (R$) *">
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                  />
                </Campo>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Campo label="Nome do favorecido/pagador">
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Data/Hora *">
                  <input
                    type="datetime-local"
                    value={form.dataHora}
                    onChange={e => setForm({ ...form, dataHora: e.target.value })}
                  />
                </Campo>
                <Campo label="ID Transação">
                  <input value={form.idTransacao} onChange={e => setForm({ ...form, idTransacao: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {vinculoAberto && (
        <div style={overlay} onClick={() => setVinculoAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Vincular Prestador</h3>
              <button onClick={() => setVinculoAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvarVinculo}>
              <div style={{ marginBottom: 12 }}>
                <Campo label="Prestador">
                  <select
                    value={formVinculo.prestadorId}
                    onChange={e => setFormVinculo({ ...formVinculo, prestadorId: e.target.value })}
                    autoFocus
                  >
                    <option value="">Nenhum</option>
                    {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </Campo>
              </div>

              <Campo label="Categoria">
                <select
                  value={formVinculo.categoria}
                  onChange={e => setFormVinculo({ ...formVinculo, categoria: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  <option value="mao_de_obra">Mão de obra</option>
                  <option value="material">Material</option>
                  <option value="despesa">Despesa diária</option>
                </select>
              </Campo>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setVinculoAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvandoVinculo} style={btnPrimario}>
                  {salvandoVinculo ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CardResumo({ label, valor, cor, destaque, icone }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
        {icone} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: destaque ? '#c9a227' : cor }}>{valor}</div>
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
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent',
  border: '1px solid #2a2a2a', borderRadius: 6, color: '#999', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};

const overlay = {
  position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20
};

const modal = {
  background: '#131313', border: '1px solid #2a2a2a', borderRadius: 12,
  padding: 28, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
