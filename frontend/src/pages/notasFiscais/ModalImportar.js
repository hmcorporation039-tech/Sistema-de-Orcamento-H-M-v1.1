import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { importarXmlNotasFiscais } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos } from '../../components/ui/estilos';

// ── Importar XML ──────────────────────────────────────────────────────────────

export function ModalImportar({ onFechar, onFeito }) {
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState(null);

  async function enviar() {
    if (!arquivos.length) { toast.error('Escolha os arquivos XML (ou um .zip)'); return; }
    setEnviando(true);
    try {
      const r = await importarXmlNotasFiscais(arquivos);
      setResumo(r.data);
      onFeito();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao importar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo="Importar notas já emitidas" onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>
        Aceita o XML das notas do <b>SYSB1/ISSnet</b> e do <b>Emissor Nacional</b> (inclusive o XML do evento de cancelamento),
        um por arquivo, vários de uma vez ou num .zip. Importar de novo a mesma nota só atualiza. Cliente ainda não cadastrado é criado com os dados da nota.
      </p>
      {!resumo && (
        <>
          <input type="file" multiple accept=".xml,.zip,text/xml,application/xml,application/zip"
            onChange={(e) => setArquivos([...e.target.files])} data-testid="arquivos-xml" />
          <p style={{ ...estilos.ajuda, margin: '6px 0 0' }}>{arquivos.length} arquivo(s) escolhido(s).</p>
        </>
      )}
      {resumo && (
        <div style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.7 }} data-testid="resumo-importacao">
          <div>
            <b>{resumo.importadas}</b> nota(s) nova(s) · <b>{resumo.atualizadas}</b> atualizada(s)
            {resumo.rascunhos_emitidos ? <> · <b>{resumo.rascunhos_emitidos}</b> rascunho(s) viraram nota emitida</> : null}
            {resumo.canceladas ? <> · <b>{resumo.canceladas}</b> cancelamento(s)</> : null}
          </div>
          {resumo.clientes_criados.length > 0 && <div>Clientes criados: {resumo.clientes_criados.join('; ')}</div>}
          {resumo.erros.length > 0 && (
            <div style={{ color: 'var(--aviso)', marginTop: 6 }}>
              {resumo.erros.length} aviso(s):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, maxHeight: 180, overflowY: 'auto' }}>
                {resumo.erros.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>{resumo ? 'Fechar' : 'Voltar'}</button>
        {!resumo && (
          <button type="button" onClick={enviar} disabled={enviando} style={estilos.btnPrimario} data-testid="enviar-xml">
            <Upload size={13} /> {enviando ? 'Importando…' : 'Importar'}
          </button>
        )}
      </div>
    </Modal>
  );
}
