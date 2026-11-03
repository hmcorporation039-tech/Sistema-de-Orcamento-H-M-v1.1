import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import { iniciarTotp, confirmarTotp, desativarTotp, novosCodigosRecuperacao } from '../../services/api';
import { formatarData } from '../../utils/format';
import { estilos, Campo } from '../../components/ui/estilos';

// Verificação em duas etapas (TOTP) da própria conta (Fase 6, 02/11/2026). Usada na tela Minha conta
// e na tela obrigatória (TOTP_OBRIGATORIO_ADMIN). `situacao` vem de GET /conta (totp).
//   ativar:    senha → QR/chave → primeiro código do aplicativo → códigos de recuperação (uma vez só)
//   desligar e gerar códigos novos: senha + um código (do aplicativo ou de recuperação)
export default function VerificacaoDuasEtapas({ situacao, aoMudar }) {
  const [etapa, setEtapa] = useState(null);          // null | 'senha' | 'qr' | 'desligar' | 'novos'
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [qr, setQr] = useState(null);                // { segredo, url, qr, prazoMinutos }
  const [codigosNovos, setCodigosNovos] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const limpar = () => { setEtapa(null); setSenha(''); setCodigo(''); setQr(null); };
  const erro = (err, padrao) => toast.error(err.response?.data?.erro || padrao);

  async function comecar(e) {
    e.preventDefault();
    if (!senha) { toast.error('Digite a sua senha'); return; }
    setOcupado(true);
    try {
      const { data } = await iniciarTotp(senha);
      setQr(data);
      setSenha('');
      setEtapa('qr');
    } catch (err) { erro(err, 'Não foi possível começar a ativação'); } finally { setOcupado(false); }
  }

  async function confirmar(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo.trim())) { toast.error('Digite os 6 dígitos que aparecem no aplicativo'); return; }
    setOcupado(true);
    try {
      const { data } = await confirmarTotp(codigo.trim());
      setCodigosNovos(data.codigosRecuperacao);
      limpar();
      toast.success('Verificação em duas etapas ativada');
      aoMudar?.({ ativado: true });
    } catch (err) { erro(err, 'Código não confere'); } finally { setOcupado(false); }
  }

  async function senhaECodigo(e, acao) {
    e.preventDefault();
    if (!senha || !codigo.trim()) { toast.error('Digite a senha e um código'); return; }
    setOcupado(true);
    try {
      if (acao === 'desligar') {
        await desativarTotp(senha, codigo.trim());
        toast.success('Verificação em duas etapas desligada');
        setCodigosNovos(null);
      } else {
        const { data } = await novosCodigosRecuperacao(senha, codigo.trim());
        setCodigosNovos(data.codigosRecuperacao);
        toast.success('Códigos novos gerados; os antigos deixaram de valer');
      }
      limpar();
      aoMudar?.({});
    } catch (err) { erro(err, 'Não foi possível concluir'); } finally { setOcupado(false); }
  }

  function copiarCodigos() {
    const texto = (codigosNovos || []).join('\n');
    navigator.clipboard?.writeText(texto).then(() => toast.success('Códigos copiados'), () => toast.error('Não foi possível copiar; anote os códigos'));
  }

  if (situacao && !situacao.configurado && !situacao.ativo) {
    return (
      <p style={estilos.ajuda}>
        A verificação em duas etapas ainda não está configurada neste servidor (falta a chave
        TOTP_CHAVE_CIFRA no backend/.env). Fale com o administrador do sistema.
      </p>
    );
  }

  return (
    <div>
      {codigosNovos && (
        <div style={{ ...caixaAviso, marginBottom: 14 }}>
          <b style={{ color: 'var(--ouro-claro)' }}>Códigos de recuperação — guarde agora, eles não aparecem de novo.</b>
          <p style={{ ...estilos.ajuda, margin: '6px 0 10px' }}>
            Cada um serve uma vez, no lugar do código do aplicativo (se perder o celular, por exemplo).
            Guarde num lugar seguro, fora deste computador.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6, fontFamily: 'monospace', fontSize: 14 }}>
            {codigosNovos.map(c => <span key={c}>{c}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" style={estilos.btnSecundario} onClick={copiarCodigos}><Copy size={14} /> Copiar</button>
            <button type="button" style={estilos.btnSecundario} onClick={() => setCodigosNovos(null)}>Já guardei</button>
          </div>
        </div>
      )}

      {situacao?.ativo ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#3fb95f', fontSize: 13 }}>
          <ShieldCheck size={18} /> Ativa{situacao.ativado_em ? ` desde ${formatarData(situacao.ativado_em)}` : ''} ·
          <span style={{ color: situacao.codigos_restantes <= 2 ? '#e0a040' : 'var(--texto-2)' }}>
            {situacao.codigos_restantes} código(s) de recuperação restante(s)
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--texto-2)', fontSize: 13 }}>
          <ShieldOff size={18} /> Desligada. Com ela ligada, além da senha o login pede o código de 6 dígitos de um
          aplicativo autenticador no celular (Google Authenticator, Microsoft Authenticator, 2FAS…).
        </div>
      )}

      {!etapa && !situacao?.ativo && (
        <button type="button" style={estilos.btnPrimario} onClick={() => setEtapa('senha')}>Ativar verificação em duas etapas</button>
      )}
      {!etapa && situacao?.ativo && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={estilos.btnSecundario} onClick={() => setEtapa('novos')}>Gerar novos códigos de recuperação</button>
          <button type="button" style={{ ...estilos.btnSecundario, color: '#e08080' }} onClick={() => setEtapa('desligar')}>Desligar</button>
        </div>
      )}

      {etapa === 'senha' && (
        <form onSubmit={comecar} style={formulario}>
          <Campo label="Confirme a sua senha">
            <input type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} autoFocus />
          </Campo>
          <div style={botoes}>
            <button type="submit" disabled={ocupado} style={estilos.btnPrimario}>{ocupado ? 'Aguarde…' : 'Continuar'}</button>
            <button type="button" onClick={limpar} style={estilos.btnSecundario}>Cancelar</button>
          </div>
        </form>
      )}

      {etapa === 'qr' && qr && (
        <form onSubmit={confirmar} style={formulario}>
          <p style={estilos.ajuda}>
            1. No aplicativo autenticador, escolha <b>adicionar conta</b> e leia o QR abaixo (ou digite a chave).
            <br />2. Digite aqui o código de 6 dígitos que aparecer. Prazo: {qr.prazoMinutos || 15} minutos.
          </p>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
            {qr.qr && <img src={qr.qr} alt="QR da verificação em duas etapas" width={180} height={180} style={{ background: '#fff', borderRadius: 8 }} />}
            <div style={{ flex: 1, minWidth: 220 }}>
              <Campo label="Chave (para digitar no aplicativo)">
                <input readOnly value={qr.segredo} onFocus={e => e.target.select()} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
              </Campo>
              <div style={{ height: 10 }} />
              <Campo label="Endereço otpauth (opcional)">
                <input readOnly value={qr.url} onFocus={e => e.target.select()} style={{ fontFamily: 'monospace', fontSize: 11 }} />
              </Campo>
              <p style={{ ...estilos.ajuda, marginTop: 8 }}>Tipo: baseado em tempo · 6 dígitos · 30 segundos.</p>
            </div>
          </div>
          <Campo label="Código do aplicativo">
            <input inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="123456" style={{ maxWidth: 180, letterSpacing: 3 }} />
          </Campo>
          <div style={botoes}>
            <button type="submit" disabled={ocupado} style={estilos.btnPrimario}>{ocupado ? 'Conferindo…' : 'Ativar'}</button>
            <button type="button" onClick={limpar} style={estilos.btnSecundario}>Cancelar</button>
          </div>
        </form>
      )}

      {(etapa === 'desligar' || etapa === 'novos') && (
        <form onSubmit={(e) => senhaECodigo(e, etapa)} style={formulario}>
          <p style={estilos.ajuda}>
            {etapa === 'desligar'
              ? 'Para desligar, confirme a senha e um código do aplicativo (ou de recuperação).'
              : 'Os códigos de recuperação antigos deixam de valer. Confirme a senha e um código do aplicativo.'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Campo label="Senha" style={{ flex: 1, minWidth: 180 }}>
              <input type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} autoFocus />
            </Campo>
            <Campo label="Código" style={{ flex: 1, minWidth: 140 }}>
              <input autoComplete="one-time-code" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="123456" />
            </Campo>
          </div>
          <div style={botoes}>
            <button type="submit" disabled={ocupado} style={estilos.btnPrimario}>
              {ocupado ? 'Aguarde…' : etapa === 'desligar' ? 'Desligar' : 'Gerar códigos novos'}
            </button>
            <button type="button" onClick={limpar} style={estilos.btnSecundario}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

const formulario = { marginTop: 12, padding: 14, border: '1px solid var(--borda)', borderRadius: 10, background: 'var(--superficie-2)' };
const botoes = { display: 'flex', gap: 8, marginTop: 14 };
const caixaAviso = { padding: 14, border: '1px solid #5a4a16', borderRadius: 10, background: '#1a1608' };
