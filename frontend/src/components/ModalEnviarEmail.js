import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { enviarPropostaPorEmail } from '../services/api';
import Modal from './ui/Modal';
import { estilos } from './ui/estilos';

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
    <Modal titulo={`Enviar Proposta ${proposta?.numero} por E-mail`} onFechar={onFechar} largura={420} espacoTitulo={18} style={{ maxHeight: '88vh' }}>
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
            <p style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
              A assinatura padrão da empresa (contatos, endereço) é adicionada automaticamente
              no final — não precisa (nem deve) digitar de novo aqui.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onFechar} style={btnSecundario}>Cancelar</button>
            <button type="submit" disabled={enviando} style={btnPrimario}>
              <Send size={13} /> {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
    </Modal>
  );
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário daqui
// é um pouco maior e mais apagado que o do kit — mantido como era.
const { rotulo, btnPrimario } = estilos;
const btnSecundario = { ...estilos.btnSecundario, padding: '9px 16px', color: '#999' };
