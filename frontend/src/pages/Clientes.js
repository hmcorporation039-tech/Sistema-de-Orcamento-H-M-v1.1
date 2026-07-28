import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { getClientes, criarCliente, atualizarCliente, removerCliente } from '../services/api';
import Paginacao from '../components/Paginacao';
import { formatarTelefone } from '../utils/format';

const VAZIO = { nome: '', documento: '', tipo: 'Empresa', responsavel: '', telefone: '', email: '', endereco: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getClientes({ ...(busca ? { busca } : {}), pagina });
      setClientes(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(cliente) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome || '', documento: cliente.documento || '', tipo: cliente.tipo || 'Empresa',
      responsavel: cliente.responsavel || '', telefone: cliente.telefone || '',
      email: cliente.email || '', endereco: cliente.endereco || ''
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    setSalvando(true);
    try {
      if (editandoId) {
        await atualizarCliente(editandoId, form);
        toast.success('Cliente atualizado');
      } else {
        await criarCliente(form);
        toast.success('Cliente cadastrado');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cliente) {
    if (!window.confirm(`Remover o cliente "${cliente.nome}"?`)) return;
    try {
      await removerCliente(cliente.id);
      toast.success('Cliente removido');
      carregar();
    } catch {
      toast.error('Erro ao remover cliente');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Clientes</h2>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, documento ou e-mail..."
            style={{ paddingLeft: 30 }}
          />
        </div>

        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Nome</th>
              <th style={th}>Tipo</th>
              <th style={th}>Documento</th>
              <th style={th}>Responsável</th>
              <th style={th}>Telefone</th>
              <th style={th}>E-mail</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && clientes.length === 0 && (
              <tr><td colSpan={7} style={tdVazio}>Nenhum cliente encontrado</td></tr>
            )}
            {!carregando && clientes.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{c.nome}</td>
                <td style={td}>{c.tipo}</td>
                <td style={td}>{c.documento || '—'}</td>
                <td style={td}>{c.responsavel || '—'}</td>
                <td style={td}>{formatarTelefone(c.telefone) || '—'}</td>
                <td style={td}>{c.email || '—'}</td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEdicao(c)} style={btnIcone} title="Editar">
                    <Pencil size={13} />
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
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {editandoId ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Nome / Razão Social *">
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
                </Campo>
                <Campo label="Tipo">
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option>Empresa</option>
                    <option>Pessoa Física</option>
                    <option>Órgão Público</option>
                  </select>
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Documento (CNPJ/CPF)">
                  <input value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
                </Campo>
                <Campo label="Responsável">
                  <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </Campo>
                <Campo label="E-mail">
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </Campo>
              </div>

              <Campo label="Endereço">
                <textarea rows={2} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
              </Campo>

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
  padding: 28, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
