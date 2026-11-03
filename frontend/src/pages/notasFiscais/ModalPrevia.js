import { useEffect, useState } from 'react';
import { previewHtmlNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos } from '../../components/ui/estilos';

// ── Pré-visualização HTML (sem Puppeteer) ─────────────────────────────────────

export function ModalPrevia({ nota, onFechar }) {
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    let url;
    previewHtmlNotaFiscal(nota.id)
      .then(r => { url = URL.createObjectURL(new Blob([r.data], { type: 'text/html' })); setHtmlUrl(url); })
      .catch(() => setErro('Erro ao carregar a prévia da nota.'));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [nota.id]);

  return (
    <Modal titulo={`Pré-visualização · ${nota.numero ? `NFS-e nº ${nota.numero}` : 'Rascunho'}`} onFechar={onFechar} largura={900}>
      {erro && <p style={{ ...estilos.ajuda, color: 'var(--perigo)' }}>{erro}</p>}
      {!erro && !htmlUrl && <p style={{ ...estilos.ajuda, textAlign: 'center', padding: '24px 0' }}>Carregando prévia…</p>}
      {htmlUrl && (
        <iframe
          src={htmlUrl}
          title="Pré-visualização da nota"
          style={{ width: '100%', height: '75vh', border: '1px solid var(--borda)', borderRadius: 6 }}
          sandbox="allow-same-origin"
        />
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" onClick={onFechar} style={estilos.btnPrimario}>Fechar</button>
      </div>
    </Modal>
  );
}
