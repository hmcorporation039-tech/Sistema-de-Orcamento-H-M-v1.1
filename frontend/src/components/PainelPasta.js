import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FolderOpen, Copy, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

// Pasta do projeto/laudo em "Arquivos do Sistema" (no PC onde o sistema roda):
// caminho, lista de arquivos e botão para abrir no Explorer. Os arquivos têm
// nome fixo e cada nova versão substitui a anterior.
const fmtTamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function PainelPasta({ carregar, abrir, atualizarQuando }) {
  const [info, setInfo] = useState(null);
  const [aberto, setAberto] = useState(false);

  const recarregar = useCallback(() => {
    carregar().then(r => setInfo(r.data)).catch(() => setInfo(null));
  }, [carregar]);

  useEffect(() => { recarregar(); }, [recarregar, atualizarQuando]);

  if (!info?.caminho) return null;

  const copiar = () => {
    navigator.clipboard?.writeText(info.caminho).then(() => toast.success('Caminho copiado')).catch(() => toast(info.caminho));
  };
  const abrirPasta = () => abrir().then(() => toast.success('Pasta aberta no Explorer')).catch(e => toast.error(e.response?.data?.erro || 'Não foi possível abrir a pasta'));

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', margin: '8px 0', background: '#151515', fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setAberto(a => !a)} style={{ background: 'none', border: 'none', color: '#d4a017', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FolderOpen size={14} style={{ margin: '0 6px' }} /> Pasta dos arquivos
        </button>
        <code style={{ color: '#bbb', wordBreak: 'break-all', flex: 1, minWidth: 200 }}>{info.caminho}</code>
        <span style={{ color: '#777' }}>{info.arquivos.length} arquivo(s)</span>
        <button type="button" onClick={copiar} title="Copiar o caminho da pasta" style={botao}><Copy size={12} /> Copiar caminho</button>
        {info.podeAbrir && <button type="button" onClick={abrirPasta} title="Abrir no Explorer deste PC" style={botao}><FolderOpen size={12} /> Abrir pasta</button>}
        <button type="button" onClick={recarregar} title="Atualizar a lista" style={botao}><RefreshCw size={12} /></button>
      </div>
      {aberto && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 22, color: '#aaa', lineHeight: 1.7 }}>
          {info.arquivos.length === 0 && <li style={{ color: '#666' }}>Nenhum arquivo ainda.</li>}
          {info.arquivos.map(a => (
            <li key={a.arquivo}>{a.arquivo} <span style={{ color: '#666' }}>· {fmtTamanho(a.tamanho)} · {new Date(a.alterado_em).toLocaleString('pt-BR')}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

const botao = { background: '#222', border: '1px solid #333', color: '#ccc', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 };
