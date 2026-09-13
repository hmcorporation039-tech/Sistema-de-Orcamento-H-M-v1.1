import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { alterarSenha } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Tela de troca obrigatória de senha, exibida logo após o login quando a senha
// atual é provisória (conta recém-criada ou senha redefinida por um
// administrador). Enquanto a pessoa não definir a própria senha, o sistema não
// abre — é o que garante que uma senha entregue por terceiro não continue em
// uso, como acontecia com a senha de fábrica.
export default function DefinirSenha() {
  const { usuario, sair, senhaDefinida } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();

    if (!senhaAtual || !novaSenha || !confirmacao) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (novaSenha.length < 8) {
      toast.error('A nova senha deve ter ao menos 8 caracteres');
      return;
    }
    if (novaSenha !== confirmacao) {
      toast.error('A confirmação não confere com a nova senha');
      return;
    }
    if (novaSenha === senhaAtual) {
      toast.error('A nova senha precisa ser diferente da provisória');
      return;
    }

    setSalvando(true);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      senhaDefinida();
      toast.success('Senha definida! Bem-vindo ao sistema.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível alterar a senha');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <form onSubmit={salvar} style={{
        background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12,
        padding: 34, width: '100%', maxWidth: 440,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={20} color="#c9a227" />
          <h1 style={{ fontSize: 19, color: '#c9a227', fontWeight: 700 }}>Defina sua senha</h1>
        </div>

        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, marginBottom: 22 }}>
          Olá, {usuario?.nome?.split(' ')[0] || 'usuário'}. Você entrou com uma senha
          provisória. Escolha agora uma senha só sua para continuar — ela não ficará
          registrada em nenhum outro lugar.
        </p>

        <Campo label="Senha provisória (a que você acabou de usar)">
          <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
            autoFocus autoComplete="current-password" />
        </Campo>

        <Campo label="Nova senha (mínimo 8 caracteres)">
          <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
            autoComplete="new-password" />
        </Campo>

        <Campo label="Repita a nova senha">
          <input type="password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)}
            autoComplete="new-password" />
        </Campo>

        <button type="submit" disabled={salvando} style={{
          width: '100%', padding: '12px 16px', background: '#c9a227', border: 'none',
          borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 14,
          cursor: salvando ? 'default' : 'pointer', marginTop: 6, opacity: salvando ? 0.7 : 1,
        }}>
          {salvando ? 'Salvando...' : 'Salvar e entrar'}
        </button>

        <button type="button" onClick={sair} style={{
          width: '100%', padding: '10px 16px', background: 'transparent',
          border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', marginTop: 10,
        }}>
          Sair e entrar com outra conta
        </button>
      </form>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, color: '#777', textTransform: 'uppercase',
        letterSpacing: '.5px', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
