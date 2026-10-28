// Peças visuais do app de campo: celular (390 px), botões grandes, fundo preto
// e dourado #c9a227 do sistema, contraste alto para ler no sol.
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { reduzirImagem, obterPosicao } from './imagem';
import { baixarArquivo } from './apiCampo';
import { criarCacheBlob } from './cacheBlob';

export const COR = {
  fundo: '#000000',
  superficie: '#141414',
  superficie2: '#1e1e1e',
  borda: '#3a3a3a',
  texto: '#ffffff',
  texto2: '#d9d2c0',
  texto3: '#a8a294',
  ouro: '#c9a227',
  ouroForte: '#e0b62e',
  verde: '#15803d',
  vermelho: '#b91c1c',
  cinza: '#52525b',
  aviso: '#f5c518',
};

export const CSS_CAMPO = `
  .campo-app { background: ${COR.fundo}; color: ${COR.texto}; min-height: 100vh; font-size: 17px; line-height: 1.4;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-tap-highlight-color: transparent;
    overflow-wrap: anywhere; word-break: break-word; } /* textos longos dos checklists (a/b/c sem espaço) não alargam a tela */
  .campo-app .campo-coluna { max-width: 520px; margin: 0 auto; padding: 0 12px 120px; }
  .campo-app input, .campo-app select, .campo-app textarea { font-size: 17px; padding: 12px; border-radius: 8px;
    background: #0d0d0d; border: 2px solid ${COR.borda}; color: ${COR.texto}; width: 100%; }
  .campo-app input:focus, .campo-app select:focus, .campo-app textarea:focus { border-color: ${COR.ouro}; outline: none; }
  .campo-app button { font-family: inherit; }
  .campo-app button:focus-visible, .campo-app a:focus-visible { outline: 3px solid ${COR.ouroForte}; outline-offset: 2px; }
  .campo-app label { display: block; font-size: 15px; color: ${COR.texto2}; margin: 12px 0 6px; font-weight: 600; }
  .campo-app a { color: ${COR.ouroForte}; }
  @keyframes campo-gira { to { transform: rotate(360deg); } }
  .campo-gira { animation: campo-gira 1s linear infinite; }
`;

const VARIANTES = {
  ouro: { background: COR.ouro, color: '#000', border: `2px solid ${COR.ouro}` },
  contorno: { background: 'transparent', color: COR.texto, border: `2px solid ${COR.borda}` },
  verde: { background: COR.verde, color: '#fff', border: `2px solid ${COR.verde}` },
  vermelho: { background: COR.vermelho, color: '#fff', border: `2px solid ${COR.vermelho}` },
  cinza: { background: COR.cinza, color: '#fff', border: `2px solid ${COR.cinza}` },
};

export function Botao({ variante = 'ouro', grande, children, style, ...props }) {
  return (
    <button
      type="button"
      {...props}
      style={{
        ...VARIANTES[variante],
        minHeight: grande ? 60 : 50, padding: grande ? '14px 18px' : '10px 14px',
        borderRadius: 10, fontSize: grande ? 19 : 17, fontWeight: 700, cursor: props.disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: props.disabled ? 0.55 : 1, touchAction: 'manipulation', ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Cartao({ children, style, ...props }) {
  return (
    <div {...props} style={{
      background: COR.superficie, border: `1px solid ${COR.borda}`, borderRadius: 12,
      padding: 14, marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

export function Selo({ cor = COR.cinza, texto = '#fff', children, style }) {
  return (
    <span style={{
      display: 'inline-block', background: cor, color: texto, borderRadius: 999,
      padding: '3px 10px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

export const COR_STATUS = {
  aberta: [COR.superficie2, COR.texto], em_execucao: [COR.ouro, '#000'],
  concluida: [COR.verde, '#fff'], cancelada: [COR.cinza, '#fff'],
};

export function formatarData(dia) {
  if (!dia) return 'Sem data';
  const [a, m, d] = String(dia).slice(0, 10).split('-');
  return d && m ? `${d}/${m}/${a}` : String(dia);
}

export function formatarDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Botão que abre a câmera (input file com capture — funciona em HTTP), reduz a
// foto no aparelho e entrega { bytes, tipo_mime, lat, lon } a onFoto.
export function BotaoFoto({ onFoto, rotulo = 'Tirar foto', variante = 'contorno', grande, style, testId }) {
  const ref = useRef(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  async function aoEscolher(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = ''; // permite escolher a mesma foto de novo
    if (!arquivo) return;
    setProcessando(true);
    setErro('');
    try {
      const [img, pos] = await Promise.all([reduzirImagem(arquivo), obterPosicao()]);
      await onFoto({ ...img, ...pos });
    } catch (err) {
      setErro(err.message || 'Não foi possível guardar a foto.');
    } finally {
      setProcessando(false);
    }
  }
  return (
    <span style={{ display: 'inline-block', ...style }}>
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={aoEscolher}
        style={{ display: 'none' }} data-testid={testId} />
      <Botao variante={variante} grande={grande} disabled={processando} onClick={() => ref.current && ref.current.click()}
        style={{ width: '100%' }}>
        {processando ? <Loader2 size={20} className="campo-gira" /> : <Camera size={20} />}
        {processando ? 'Guardando…' : rotulo}
      </Botao>
      {erro && <div role="alert" style={{ color: '#ff8a8a', fontSize: 15, marginTop: 6 }}>{erro}</div>}
    </span>
  );
}

// Miniatura: bytes do aparelho quando a foto está aqui; senão baixa do
// servidor com o token (rota autenticada), se houver rede. Os endereços blob:
// ficam em cacheMiniaturas (com contagem de uso e revogação — cacheBlob.js).
export const cacheMiniaturas = criarCacheBlob();

// Endereço blob: de uma foto enquanto o componente estiver montado.
export function useUrlFoto(foto, dados) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let vivo = true;
    let pego = false;
    const chave = foto.uuid;
    const existente = cacheMiniaturas.pegar(chave);
    if (existente) { pego = true; setUrl(existente); }
    else {
      setUrl(null);
      (async () => {
        try {
          let blob = null;
          const arq = await dados.lerArquivo(chave);
          if (arq?.bytes) blob = new Blob([arq.bytes], { type: arq.tipo_mime || 'image/jpeg' });
          else if (foto.url && navigator.onLine) blob = await baixarArquivo(foto.url);
          if (!blob) return;
          const criada = URL.createObjectURL(blob);
          if (!vivo) { URL.revokeObjectURL(criada); return; }
          pego = true;
          setUrl(cacheMiniaturas.guardar(chave, criada));
        } catch { /* sem miniatura */ }
      })();
    }
    return () => { vivo = false; if (pego) cacheMiniaturas.soltar(chave); };
  }, [foto.uuid, foto.url, dados]);
  return url;
}

export function Miniatura({ foto, dados, tamanho = 84, onClick }) {
  const url = useUrlFoto(foto, dados);
  const pendente = foto.estado_local === 'pendente';
  const recusada = foto.estado_local === 'recusada';
  return (
    <button type="button" onClick={onClick} title={foto.legenda || 'Foto'}
      style={{
        width: tamanho, height: tamanho, borderRadius: 8, overflow: 'hidden', padding: 0, position: 'relative',
        border: `2px solid ${recusada ? COR.vermelho : pendente ? COR.aviso : COR.borda}`, background: COR.superficie2,
        color: COR.texto3, fontSize: 12, flex: '0 0 auto',
      }}>
      {url ? <img src={url} alt={foto.legenda || 'Foto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{navigator.onLine ? 'carregando' : 'no servidor'}</span>}
      <span style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 11, fontWeight: 700, padding: '1px 3px',
        background: recusada ? COR.vermelho : pendente ? COR.aviso : 'rgba(0,0,0,.7)', color: pendente ? '#000' : '#fff',
      }}>{recusada ? 'recusada' : pendente ? 'a enviar' : 'enviada'}</span>
    </button>
  );
}

// Foto em tamanho grande (toque na miniatura). Só a foto que ainda não foi
// enviada pode ser excluída aqui — o contrato não tem exclusão de foto já no
// servidor (o escritório cuida dessas).
export function VisorFoto({ foto, dados, onFechar, onExcluir, podeExcluir }) {
  const url = useUrlFoto(foto, dados);
  const estado = foto.estado_local === 'pendente' ? 'Ainda não enviada (guardada no aparelho)'
    : foto.estado_local === 'recusada' ? `Recusada pelo servidor${foto.erro_local ? `: ${foto.erro_local}` : ''}`
      : 'Enviada';
  return (
    <Modal titulo="Foto" onFechar={onFechar}>
      <div style={{ background: COR.superficie2, borderRadius: 8, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? <img src={url} alt={foto.legenda || 'Foto'} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }} />
          : <span style={{ color: COR.texto3 }}>{navigator.onLine ? 'Carregando…' : 'Foto no servidor (sem rede agora)'}</span>}
      </div>
      {foto.legenda && <div style={{ marginTop: 8, fontWeight: 700 }}>{foto.legenda}</div>}
      <div style={{ color: COR.texto3, fontSize: 15, marginTop: 4 }}>
        {formatarDataHora(foto.tirada_em)}{foto.tirada_em ? ' · ' : ''}{estado}
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {podeExcluir && (
          <Botao variante="vermelho" data-testid="excluir-foto"
            onClick={() => { if (window.confirm('Excluir esta foto do aparelho? Ela ainda não foi enviada e não volta.')) onExcluir(foto); }}>
            Excluir foto
          </Botao>
        )}
        <Botao variante="contorno" onClick={onFechar}>Fechar</Botao>
      </div>
    </Modal>
  );
}

export function Modal({ titulo, children, onFechar }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: COR.superficie, borderTop: `3px solid ${COR.ouro}`, width: '100%', maxWidth: 520,
        borderRadius: '16px 16px 0 0', padding: 16, maxHeight: '88vh', overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 21, marginBottom: 12, color: COR.ouroForte }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
