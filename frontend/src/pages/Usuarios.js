import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, KeyRound, Trash2, LogOut, ShieldOff } from 'lucide-react';
import {
  getUsuarios, criarUsuario, atualizarUsuario, removerUsuario, redefinirSenhaUsuario,
  encerrarSessoesDoUsuario, desativarTotpDoUsuario,
} from '../services/api';
import { PAPEIS, rotuloPapel } from '../utils/papeis';
import { useAuth } from '../hooks/useAuth';
import { formatarData } from '../utils/format';
import Select from '../components/Select';
import Modal from '../components/ui/Modal';
import { estilos, Campo } from '../components/ui/estilos';

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
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role, roleOriginal: u.role });
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
        // sem `ativo` (editar não reativa um usuário desativado) e `role` só se mudou —
        // o servidor mantém o que não vem no corpo
        await atualizarUsuario(editandoId, {
          nome: form.nome, email: form.email, ...(form.role !== form.roleOriginal ? { role: form.role } : {}),
        });
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
      await atualizarUsuario(u.id, { nome: u.nome, email: u.email, ativo: !u.ativo });
      toast.success(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar usuário');
    }
  }

  async function excluir(u) {
    if (u.id === usuarioLogado.id) {
      toast.error('Você não pode excluir seu próprio usuário');
      return;
    }
    if (!window.confirm(`Excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await removerUsuario(u.id);
      toast.success('Usuário excluído');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir usuário');
    }
  }

  // Fase 6: derrubar todas as sessões de alguém (aparelho perdido, saída da empresa) e desligar a
  // verificação em duas etapas de quem perdeu o celular sem os códigos de recuperação
  async function encerrarSessoes(u) {
    if (!window.confirm(`Encerrar todas as sessões de "${u.nome}"? Os aparelhos dele vão pedir login de novo.`)) return;
    try {
      const { data } = await encerrarSessoesDoUsuario(u.id);
      toast.success(data.encerradas ? `${data.encerradas} sessão(ões) encerrada(s)` : 'Não havia sessões abertas');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao encerrar as sessões');
    }
  }

  async function desligarDuasEtapas(u) {
    if (!window.confirm(`Desligar a verificação em duas etapas de "${u.nome}"? Use só se a pessoa perdeu o celular e os códigos de recuperação. Ela poderá ativar de novo em Minha conta.`)) return;
    try {
      await desativarTotpDoUsuario(u.id);
      toast.success('Verificação em duas etapas desligada');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao desligar a verificação');
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
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Usuários</h2>
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
              <th style={th}>Duas etapas</th>
              <th style={th}>Status</th>
              <th style={th}>Último acesso</th>
              <th style={{ ...th, width: 220 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && usuarios.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{u.nome}{u.id === usuarioLogado.id && <span style={{ color: 'var(--texto-3)', fontSize: 11.5 }}> (você)</span>}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{rotuloPapel(u.role)}</td>
                <td style={{ ...td, color: u.totp_ativo ? '#3fb95f' : 'var(--texto-3)' }}>{u.totp_ativo ? 'Ativa' : '—'}</td>
                <td style={td}>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
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
                  <button onClick={() => encerrarSessoes(u)} style={btnIcone} title="Encerrar todas as sessões" aria-label="Encerrar todas as sessões">
                    <LogOut size={13} />
                  </button>
                  {u.totp_ativo && (
                    <button onClick={() => desligarDuasEtapas(u)} style={btnIcone} title="Desligar a verificação em duas etapas" aria-label="Desligar a verificação em duas etapas">
                      <ShieldOff size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => alternarAtivo(u)}
                    style={{ ...btnSecundario, padding: '4px 8px', fontSize: 11.5 }}
                    disabled={u.id === usuarioLogado.id}
                  >
                    {u.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                  <button
                    onClick={() => excluir(u)}
                    style={{ ...btnIcone, color: '#b04040' }}
                    title="Excluir"
                    disabled={u.id === usuarioLogado.id}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <Modal titulo={editandoId ? 'Editar Usuário' : 'Novo Usuário'} onFechar={() => setModalAberto(false)} largura={460}>
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
                <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {PAPEIS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                </Select>
                <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 6, lineHeight: 1.5 }}>
                  Financeiro e Técnico de campo, por enquanto, enxergam o mesmo que Usuário; servem para as
                  áreas novas que forem limitadas por perfil. Só o Administrador vê o Financeiro e a administração.
                </p>
              </Campo>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {modalSenha && (
        <Modal titulo={`Redefinir senha de ${modalSenha.nome}`} onFechar={() => setModalSenha(null)} largura={380}>
            <form onSubmit={confirmarRedefinirSenha}>
              <Campo label="Nova senha *">
                <input type="text" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoFocus />
              </Campo>
              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalSenha(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" style={btnPrimario}>Redefinir</button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário desta
// tela é um pouco maior e mais apagado que o do kit — mantido como era.
const { th, td, tdVazio, btnPrimario, btnIcone } = estilos;

const btnSecundario = {
  padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
  borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer'
};
