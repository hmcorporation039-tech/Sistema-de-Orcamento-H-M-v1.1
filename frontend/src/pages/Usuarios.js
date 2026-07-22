import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, KeyRound, X } from 'lucide-react';
import { getUsuarios, criarUsuario, atualizarUsuario, redefinirSenhaUsuario } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatarData } from '../utils/format';

const VAZIO = { nome: '', email: '', senha: '', role: 'user' };

export default function Usuarios() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalSenha, setModalSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getUsuarios();
      setUsuarios(res.data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(u) {
    setEditandoId(u.id);
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    setSalvando(true);
    try {
      if (editandoId) {
        await atualizarUsuario(editandoId, { nome: form.nome, email: form.email, role: form.role, ativo: true });
        toast.success('Usuário atualizado');
      } else {
        if (!form.senha || form.senha.length < 6) {
          toast.error('Defina uma senha inicial com ao menos 6 caracteres');
          setSalvando(false);
          return;
        }
        await criarUsuario(form);
        toast.success('Usuário cadastrado');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    if (u.id === usuarioLogado.id) {
      toast.error('Você não pode desativar seu próprio usuário');
      return;
    }
    try {
      await atualizarUsuario(u.id, { nome: u.nome, email: u.email, role: u.role, ativo: !u.ativo });
      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar usuário');
    }
  }

  async function confirmarRedefinirSenha(e) {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      toast.error('A nova senha deve ter ao menos 6 caracteres');
      return;
    }
    try {
      await redefinirSenhaUsuario(modalSenha.id, novaSenha);
      toast.success(`Senha de ${modalSenha.nome} redefinida`);
      setModalSenha(null);
      setNovaSenha('');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao redefinir senha');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>🔑 Usuários</h2>
        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Usuário
        </button>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Nome</th>
              <th style={th}>E-mail</th>
              <th style={th}>Perfil</th>
              <th style={th}>Status</th>
              <th style={th}>Último acesso</th>
              <th style={{ ...th, width: 110 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={6} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && usuarios.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{u.nome}{u.id === usuarioLogado.id && <span style={{ color: '#666', fontSize: 10 }}> (você)</span>}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.role === 'admin' ? 'Administrador' : 'Usuário'}</td>
                <td style={td}>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: u.ativo ? '#0a1a0f' : '#1a0a0a', color: u.ativo ? '#3fb95f' : '#b04040',
                    border: `1px solid ${u.ativo ? '#1a4a26' : '#4a1a1a'}`
                  }}>
                    {u.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </td>
                <td style={td}>{u.ultimo_acesso ? formatarData(u.ultimo_acesso) : 'nunca'}</td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEdicao(u)} style={btnIcone} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setModalSenha(u)} style={btnIcone} title="Redefinir senha">
                    <KeyRound size={13} />
                  </button>
                  <button
                    onClick={() => alternarAtivo(u)}
                    style={{ ...btnSecundario, padding: '4px 8px', fontSize: 10 }}
                    disabled={u.id === usuarioLogado.id}
                  >
                    {u.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div style={overlay} onClick={() => setModalAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {editandoId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ marginBottom: 12 }}>
                <Campo label="Nome *">
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
                </Campo>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Campo label="E-mail *">
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </Campo>
              </div>

              {!editandoId && (
                <div style={{ marginBottom: 12 }}>
                  <Campo label="Senha inicial *">
                    <input type="text" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 6 caracteres" />
                  </Campo>
                </div>
              )}

              <Campo label="Perfil">
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
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

      {modalSenha && (
        <div style={overlay} onClick={() => setModalSenha(null)}>
          <div style={{ ...modal, width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                Redefinir senha de {modalSenha.nome}
              </h3>
              <button onClick={() => setModalSenha(null)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={confirmarRedefinirSenha}>
              <Campo label="Nova senha *">
                <input type="text" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoFocus />
              </Campo>
              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalSenha(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" style={btnPrimario}>Redefinir</button>
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
