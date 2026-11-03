import { useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { enviarNotaFiscalPorEmail } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos, Campo } from '../../components/ui/estilos';

// ── E-mail ────────────────────────────────────────────────────────────────────

export function ModalEmail({ nota, onFechar, onEnviado }) {
  const [para, setPara] = useState(nota.tomador_email || nota.tomador?.email || '');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await enviarNotaFiscalPorEmail(nota.id, para, mensagem);
      toast.success(r.data.mensagem);
      onFechar();
      onEnviado?.();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo={`Enviar NFS-e nº ${nota.numero} por e-mail`} onFechar={onFechar} largura={500}>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 14 }}>
        <Campo label="Para (até 5, separados por vírgula) *">
          <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="financeiro@cliente.com.br" autoFocus data-testid="email-para" />
        </Campo>
        <Campo label="Mensagem (opcional)">
          <textarea rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            placeholder="Em branco: mensagem padrão com número e valor da nota" />
        </Campo>
        <p style={{ ...estilos.ajuda, margin: 0 }}>
          Vão anexados o PDF da nota{nota.tem_xml ? ' e o XML' : ''}. A assinatura da empresa entra no final.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando} style={estilos.btnPrimario}>
            <Send size={13} /> {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
