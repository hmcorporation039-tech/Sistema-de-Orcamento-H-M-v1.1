import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send, AlertTriangle, XOctagon, Info, CheckCircle2 } from 'lucide-react';
import { enviarPropostaPorEmail, getRevisaoEnvio } from '../services/api';
import Modal from './ui/Modal';
import { estilos } from './ui/estilos';

export default function ModalEnviarEmail({ aberto, onFechar, proposta, emailInicial, onEnviado }) {
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  // conferência da proposta antes de enviar (services/revisaoPreEnvio.js): null = carregando ou indisponível
  const [revisao, setRevisao] = useState(null);
  const [aceitouBloqueio, setAceitouBloqueio] = useState(false);

  useEffect(() => {
    if (aberto) {
      setDestinatarioEmail(emailInicial || '');
      setMensagemEmail('');
      setAceitouBloqueio(false);
      setRevisao(null);
      if (proposta?.id) getRevisaoEnvio(proposta.id).then(r => setRevisao(r.data)).catch(() => setRevisao(null));
    }
  }, [aberto, emailInicial, proposta?.id]);

  if (!aberto) return null;

  async function enviar(e) {
    e.preventDefault();
    if (!destinatarioEmail.trim()) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    if (revisao?.nivel === 'bloqueio' && !aceitouBloqueio) {
      toast.error('A proposta tem um erro grave na conferência: corrija ou marque que quer enviar mesmo assim');
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
          <RevisaoEnvio revisao={revisao} aceitou={aceitouBloqueio} onAceitar={setAceitouBloqueio} />
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
              <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 5 }}>
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
            <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 5 }}>
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

// Conferência da proposta antes do envio. Só informa: nada aqui impede o envio, exceto marcar que quer enviar
// mesmo assim quando a proposta está errada (total que não bate, sem itens).
const VISUAL = {
  bloqueio: { cor: '#e05252', Icone: XOctagon },
  atencao: { cor: '#c9a227', Icone: AlertTriangle },
  info: { cor: 'var(--texto-3)', Icone: Info },
};

function RevisaoEnvio({ revisao, aceitou, onAceitar }) {
  if (!revisao) return null;
  if (!revisao.achados.length) {
    return (
      <p style={{ fontSize: 12, color: '#3fb95f', margin: '0 0 12px', display: 'flex', gap: 6, alignItems: 'center' }} data-testid="revisao-envio">
        <CheckCircle2 size={14} /> Conferida: {revisao.itens_conferidos} itens, nada a corrigir.
      </p>
    );
  }
  return (
    <div style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.45 }} data-testid="revisao-envio">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Antes de enviar</div>
      {revisao.achados.map((a, i) => {
        const { cor, Icone } = VISUAL[a.nivel] || VISUAL.info;
        return (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '3px 0', color: a.nivel === 'info' ? 'var(--texto-3)' : 'var(--texto-2)' }}>
            <Icone size={14} color={cor} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{a.mensagem}</span>
          </div>
        );
      })}
      {revisao.nivel === 'bloqueio' && (
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, color: '#e05252' }}>
          <input type="checkbox" checked={aceitou} onChange={e => onAceitar(e.target.checked)} /> Quero enviar mesmo assim
        </label>
      )}
    </div>
  );
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário daqui
// é um pouco maior e mais apagado que o do kit — mantido como era.
const { rotulo, btnPrimario } = estilos;
const btnSecundario = { ...estilos.btnSecundario, padding: '9px 16px', color: 'var(--texto-2)' };
