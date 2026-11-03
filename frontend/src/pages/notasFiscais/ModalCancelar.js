import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban } from 'lucide-react';
import { cancelarNotaFiscal, getConfigCancelamentoNotaFiscal } from '../../services/api';
import Select from '../../components/Select';
import Modal from '../../components/ui/Modal';
import { estilos, Campo } from '../../components/ui/estilos';

// ── Cancelar ──────────────────────────────────────────────────────────────────

export function ModalCancelar({ nota, onFechar, onFeito }) {
  const [motivo, setMotivo] = useState('');
  const [codigo, setCodigo] = useState('1');
  const [via, setVia] = useState('manual');
  const [confirmarNumero, setConfirmarNumero] = useState('');
  const [config, setConfig] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState('');
  const [resultadoTeste, setResultadoTeste] = useState('');

  useEffect(() => {
    getConfigCancelamentoNotaFiscal().then((r) => {
      setConfig(r.data);
      if (r.data.direto && r.data.certificado?.ok) setVia('receita');
    }).catch(() => setConfig({ direto: false }));
  }, []);

  const podeDireto = !!config?.direto && config.certificado?.ok && nota.padrao === 'nacional' && /^\d{50}$/.test(nota.chave_acesso || '');
  const teste = config?.ambiente !== 'producao';
  const direto = podeDireto && via === 'receita';
  const numeroConfere = confirmarNumero.trim() === String(nota.numero);

  async function confirmar(e) {
    e.preventDefault();
    setFalha('');
    setResultadoTeste('');
    setEnviando(true);
    try {
      const r = await cancelarNotaFiscal(nota.id, {
        motivo, codigo_motivo: Number(codigo), direto, ...(direto ? { confirmar_numero: confirmarNumero.trim() } : {}),
      });
      if (r.data.teste) {
        setResultadoTeste(`${r.data.mensagem}${r.data.protocolo ? ` Protocolo: ${r.data.protocolo}.` : ''}`);
        return;
      }
      toast.success(r.data.mensagem);
      onFeito();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao cancelar';
      setFalha(msg);
      toast.error(msg);
    } finally { setEnviando(false); }
  }

  const aviso = { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.6 };

  return (
    <Modal titulo={`Cancelar NFS-e nº ${nota.numero}`} onFechar={onFechar} largura={540}>
      {!config && <p style={{ ...estilos.ajuda, textAlign: 'center' }}>Carregando…</p>}
      {config && !podeDireto && (
        <div style={{ ...aviso, color: 'var(--aviso)', background: 'rgba(224,169,64,.1)', border: '1px solid rgba(224,169,64,.35)' }}>
          Esta nota não pode ser cancelada direto pelo sistema{config.direto ? '' : ' (o cancelamento direto está desligado)'}: cancele primeiro no {nota.padrao === 'abrasf' ? 'ISSnet (ou pelo SYSB1)' : 'Emissor Nacional'} e depois registre aqui.
          Se tiver o XML do evento de cancelamento, pode só importá-lo.
        </div>
      )}
      {podeDireto && teste && (
        <div style={{ ...aviso, color: 'var(--aviso)', background: 'rgba(224,169,64,.1)', border: '1px solid rgba(224,169,64,.35)' }}>
          <b>Ambiente de testes.</b> O pedido vai para a homologação da Receita e a nota continua emitida aqui.
        </div>
      )}
      {direto && !teste && (
        <div style={{ ...aviso, color: 'var(--perigo)', background: 'rgba(224,100,100,.1)', border: '1px solid rgba(224,100,100,.35)' }}>
          <b>Atenção:</b> isto cancela a nota na Receita (ambiente real) e não tem volta. Para corrigir, será preciso emitir outra nota.
        </div>
      )}
      <form onSubmit={confirmar} style={{ display: 'grid', gap: 12 }}>
        {podeDireto && (
          <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" name="via" checked={via === 'receita'} onChange={() => setVia('receita')} /> Cancelar na Receita agora
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" name="via" checked={via === 'manual'} onChange={() => setVia('manual')} /> Já cancelei no portal — só registrar aqui
            </label>
          </div>
        )}
        <Campo label="Motivo *">
          <Select value={codigo} onChange={(e) => setCodigo(e.target.value)}>
            <option value="1">Erro na emissão</option>
            <option value="2">Serviço não prestado</option>
            <option value="9">Outros</option>
          </Select>
        </Campo>
        <Campo label="Descreva o motivo * (mínimo 15 caracteres)">
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255}
            placeholder="Ex.: erro no valor do serviço; nota substituída pela nº …" autoFocus />
        </Campo>
        {direto && (
          <Campo label={`Para confirmar, digite o número da nota (${nota.numero})`}>
            <input value={confirmarNumero} onChange={(e) => setConfirmarNumero(e.target.value)} inputMode="numeric" autoComplete="off" />
          </Campo>
        )}
        {falha && <div style={{ color: 'var(--perigo)', fontSize: 13, lineHeight: 1.5 }}>{falha}</div>}
        {resultadoTeste && <div style={{ color: 'var(--sucesso, #6bbf7a)', fontSize: 13, lineHeight: 1.5 }}>{resultadoTeste}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando || !config || motivo.trim().length < 15 || (direto && !numeroConfere)}
            style={{ ...estilos.btnPrimario, background: 'var(--perigo)', color: '#fff' }}>
            <Ban size={13} /> {enviando ? 'Enviando…' : direto ? (teste ? 'Testar cancelamento' : 'Cancelar na Receita') : 'Registrar cancelamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
