import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Send } from 'lucide-react';
import { enviarPropostaPorEmail } from '../services/api';

export default function ModalEnviarEmail({ aberto, onFechar, proposta, emailInicial, onEnviado }) {
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setDestinatarioEmail(emailInicial || '');
      setMensagemEmail('');
    }
  }, [aberto, emailInicial]);

  if (!aberto) return null;

  async function enviar(e) {
    e.preventDefault();
    if (!destinatarioEmail.trim()) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    setEnviando(true);
    try {
      const res = await enviarPropostaPorEmail(proposta.id, destinatarioEmail.trim(), mensagemEmail.trim());
      toast.success(res.data.mensagem);
      onFechar();
      onEnviado?.();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar proposta por e-mail');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={overlay} onClick={onFechar}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
            Enviar Proposta {proposta?.numero} por E-mail
          </h3>
          <button onClick={onFechar} style={{ ...btnIcone, background: 'transparent' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={enviar}>
          <div style={{ marginBottom: 12 }}>
            <label style={rotulo}>E-mail do cliente *</label>
            <input
              type="email"
              value={destinatarioEmail}
              onChange={e => setDestinatarioEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              autoFocus
            />
            {!emailInicial && (
              <p style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
                Esse cliente não tem e-mail cadastrado — dá pra editar isso na tela de Clientes pra preencher sozinho da próxima vez.
              </p>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={rotulo}>Mensagem (opcional)</label>
            <textarea
              rows={4}
              value={mensagemEmail}
              onChange={e => setMensagemEmail(e.target.value)}
              placeholder="Deixe em branco para usar a mensagem padrão"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onFechar} style={btnSecundario}>Cancelar</button>
            <button type="submit" disabled={enviando} style={btnPrimario}>
              <Send size={13} /> {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const rotulo = { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
  color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
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
  padding: 28, width: 420, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
