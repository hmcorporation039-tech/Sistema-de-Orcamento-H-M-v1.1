import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { getPrestadores, criarPrestador, atualizarPrestador, removerPrestador } from '../services/api';
import Paginacao from '../components/Paginacao';
import { formatarTelefone, formatarCpfCnpj, validarCpf, formatarMoeda } from '../utils/format';

const VAZIO = { nome: '', email: '', telefone: '', cpf: '', chavePix: '', categoria: '' };

const CATEGORIA_INFO = {
  mao_de_obra: { label: 'Mão de obra', cor: '#c9a227', bg: '#1a1710', borda: '#4a3f1a' },
  material: { label: 'Material', cor: '#5b9bd5', bg: '#0a141f', borda: '#1a3a52' },
  despesa: { label: 'Despesa diária', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a' },
};

export default function Prestadores() {
  const [prestadores, setPrestadores] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
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
      const params = { pagina };
      if (busca) params.busca = busca;
      if (categoriaFiltro) params.categoria = categoriaFiltro;
      const res = await getPrestadores(params);
      setPrestadores(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
    } catch {
      toast.error('Erro ao carregar prestadores');
    } finally {
      setCarregando(false);
    }
  }, [busca, categoriaFiltro, pagina]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca, categoriaFiltro]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(p) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome || '', email: p.email || '', telefone: p.telefone || '',
      cpf: p.cpf || '', chavePix: p.chave_pix || '', categoria: p.categoria || '',
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome do prestador');
      return;
    }
    if (form.cpf.trim()) {
      const digitos = form.cpf.replace(/\D/g, '');
      if (digitos.length !== 11 || !validarCpf(digitos)) {
        toast.error('CPF inválido');
        return;
      }
    }
    setSalvando(true);
    try {
      if (editandoId) {
        await atualizarPrestador(editandoId, form);
        toast.success('Prestador atualizado');
      } else {
        await criarPrestador(form);
        toast.success('Prestador cadastrado');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar prestador');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p) {
    if (!window.confirm(`Remover o prestador "${p.nome}"?`)) return;
    try {
      await removerPrestador(p.id);
      toast.success('Prestador removido');
      carregar();
    } catch {
      toast.error('Erro ao remover prestador');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Prestadores de Serviços</h2>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail..."
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} style={{ width: 170 }}>
          <option value="">Todas as categorias</option>
          <option value="mao_de_obra">Mão de obra</option>
          <option value="material">Material</option>
          <option value="despesa">Despesa diária</option>
        </select>

        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Prestador
        </button>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Nome</th>
              <th style={th}>Categoria</th>
              <th style={th}>CPF</th>
              <th style={th}>Telefone</th>
              <th style={th}>E-mail</th>
              <th style={th}>Chave Pix</th>
              <th style={{ ...th, textAlign: 'right' }}>Pagamentos</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={8} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && prestadores.length === 0 && (
              <tr><td colSpan={8} style={tdVazio}>Nenhum prestador encontrado</td></tr>
            )}
            {!carregando && prestadores.map(p => {
              const info = CATEGORIA_INFO[p.categoria];
              return (
              <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{p.nome}</td>
                <td style={td}>
                  {info ? (
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: info.bg, color: info.cor, border: `1px solid ${info.borda}` }}>
                      {info.label}
                    </span>
                  ) : '—'}
                </td>
                <td style={td}>{formatarCpfCnpj(p.cpf) || '—'}</td>
                <td style={td}>{formatarTelefone(p.telefone) || '—'}</td>
                <td style={td}>{p.email || '—'}</td>
                <td style={td}>{p.chave_pix || '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                    {Number(p.total_mao_de_obra) > 0 && (
                      <span style={{ fontSize: 10, color: CATEGORIA_INFO.mao_de_obra.cor }}>
                        Mão de obra: {formatarMoeda(p.total_mao_de_obra)}
                      </span>
                    )}
                    {Number(p.total_material) > 0 && (
                      <span style={{ fontSize: 10, color: CATEGORIA_INFO.material.cor }}>
                        Material: {formatarMoeda(p.total_material)}
                      </span>
                    )}
                    {Number(p.total_despesa) > 0 && (
                      <span style={{ fontSize: 10, color: CATEGORIA_INFO.despesa.cor }}>
                        Despesa diária: {formatarMoeda(p.total_despesa)}
                      </span>
                    )}
                    {Number(p.total_sem_categoria) > 0 && (
                      <span style={{ fontSize: 10, color: '#666' }}>
                        Sem categoria: {formatarMoeda(p.total_sem_categoria)}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, color: '#c9a227' }}>{formatarMoeda(p.total_pago)}</span>
                  </div>
                </td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEdicao(p)} style={btnIcone} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => excluir(p)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {modalAberto && (
        <div style={overlay} onClick={() => setModalAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {editandoId ? 'Editar Prestador' : 'Novo Prestador'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Nome *">
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
                </Campo>
                <Campo label="Categoria">
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    <option value="">Nenhuma</option>
                    <option value="mao_de_obra">Mão de obra</option>
                    <option value="material">Material</option>
                    <option value="despesa">Despesa diária</option>
                  </select>
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="CPF">
                  <input
                    value={form.cpf}
                    onChange={e => setForm({ ...form, cpf: formatarCpfCnpj(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </Campo>
                <Campo label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </Campo>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Campo label="E-mail">
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </Campo>
              </div>

              <Campo label="Chave Pix">
                <input
                  value={form.chavePix}
                  onChange={e => setForm({ ...form, chavePix: e.target.value })}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                />
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
  padding: 28, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
