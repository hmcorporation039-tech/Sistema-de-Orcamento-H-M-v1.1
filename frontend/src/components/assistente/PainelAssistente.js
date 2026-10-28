import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles, X, Plus, Paperclip, Send, Square, Loader2, Archive, ArchiveRestore, Pencil, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, AlertTriangle, FileText, History, ArrowLeft, Link2,
} from 'lucide-react';
import MarkdownSeguro from './MarkdownSeguro';
import {
  statusAssistente, contextoAssistente, listarConversas, criarConversa, verConversa, alterarConversa, cancelarExecucao,
  aplicarAcao, descartarAcao, enviarArquivos, enviarMensagemStream, acompanharStream,
} from '../../services/assistente';

// Painel do assistente virtual (pedido do usuário, 27/10/2026): conversa em
// tempo real, passos das ferramentas, links do que foi criado, anexos
// (arrastar e soltar), cartões de ação pendente (Aplicar / Descartar) e o
// contexto da tela aberta. Botão fixo em todas as telas (Layout).
//
// O que o assistente pode fazer sozinho é decidido no SERVIDOR; "Aplicar" chama
// a rota da tela com o login de quem clicou.

const OURO = '#c9a227';
const FUNDO = '#101010';
const BORDA = '#2a2a2a';
const TEXTO = '#e8e0cc';
const APAGADO = '#8a8270';

const CONSULTA_CELULAR = '(max-width: 640px)';
function useCelular() {
  const [celular, setCelular] = useState(() => window.matchMedia(CONSULTA_CELULAR).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_CELULAR);
    const f = (e) => setCelular(e.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return celular;
}

// Área VISÍVEL da tela (visualViewport). No celular, uma tela com tabela mais
// larga que o aparelho alarga a área do "position: fixed" (o layout viewport
// passa de 390 para 558 px ou mais) e um botão com `right`/`bottom` ficava fora
// da tela (visto no teste a 390 px). Com a área visível, botão e painel ficam
// sempre onde a pessoa está olhando, com ou sem zoom.
function useAreaVisivel(ativo) {
  const ler = () => {
    const vv = window.visualViewport;
    return vv ? { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height } : { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  };
  const [area, setArea] = useState(ler);
  useEffect(() => {
    if (!ativo) return undefined;
    const vv = window.visualViewport;
    const f = () => setArea(ler());
    f();
    vv?.addEventListener('resize', f);
    vv?.addEventListener('scroll', f);
    window.addEventListener('resize', f);
    return () => { vv?.removeEventListener('resize', f); vv?.removeEventListener('scroll', f); window.removeEventListener('resize', f); };
  }, [ativo]);
  return area;
}

// Contexto da tela aberta, pela rota (ids inteiros; o servidor confere e descreve)
export function contextoDaRota(pathname, search) {
  const q = new URLSearchParams(search);
  const ctx = { rota: `${pathname}${search || ''}`.slice(0, 200) };
  let m = pathname.match(/^\/obras\/analise\/(\d+)/);
  if (m) ctx.analise_id = Number(m[1]);
  else if ((m = pathname.match(/^\/obras\/(\d+)/))) ctx.obra_id = Number(m[1]);
  if ((m = pathname.match(/^\/propostas\/editar\/(\d+)/))) ctx.proposta_id = Number(m[1]);
  const laudo = q.get('laudo');
  if (laudo && /^\d+$/.test(laudo)) ctx.projeto_id = Number(laudo);
  return ctx;
}

const chaveUltima = (usuarioId) => `hm_assistente_conversa_${usuarioId || ''}`;
const lerLocal = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

const botao = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', border: `1px solid ${BORDA}`, background: 'transparent', color: TEXTO, ...extra,
});

// ── Passo de ferramenta (recolhível) ─────────────────────────────────────
function Passo({ parte }) {
  const [aberto, setAberto] = useState(false);
  const icone = parte.ok == null
    ? <Loader2 size={13} style={{ color: OURO, animation: 'hm-girar 1s linear infinite' }} />
    : parte.ok ? <CheckCircle2 size={13} style={{ color: '#5fae6b' }} /> : <XCircle size={13} style={{ color: '#d06060' }} />;
  return (
    <div style={{ margin: '4px 0', border: `1px solid ${BORDA}`, borderRadius: 6, background: '#0c0c0c' }}>
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        style={{ ...botao({ border: 'none', width: '100%', justifyContent: 'flex-start', fontWeight: 600, color: APAGADO, padding: '5px 8px' }) }}>
        {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {icone}
        <span style={{ color: parte.ok === false ? '#d06060' : APAGADO }}>{parte.rotulo}{parte.ok == null ? '…' : ''}</span>
      </button>
      {aberto && (
        <div style={{ padding: '0 8px 8px', fontSize: 11, color: APAGADO }}>
          {parte.entrada && Object.keys(parte.entrada).length > 0 && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '4px 0', color: '#a99f86' }}>{JSON.stringify(parte.entrada, null, 1)}</pre>
          )}
          {parte.resumo && <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: 220, overflowY: 'auto', color: '#bdb39a' }}>{parte.resumo}</pre>}
        </div>
      )}
    </div>
  );
}

// ── Cartão de ação pendente ──────────────────────────────────────────────
function CartaoAcao({ acao, aoMudar }) {
  const [ocupado, setOcupado] = useState(false);
  const [resumo, motivo] = String(acao.descricao || '').split('\n\nMotivo informado pelo assistente: ');
  async function decidir(aplicar) {
    if (aplicar && /^EXCLUIR/.test(resumo) && !window.confirm(`Confirma?\n\n${resumo}`)) return;
    setOcupado(true);
    try {
      const { data } = aplicar ? await aplicarAcao(acao.id) : await descartarAcao(acao.id);
      aoMudar(data);
      toast.success(aplicar ? 'Ação aplicada.' : 'Ação descartada.');
    } catch (e) {
      toast.error(e?.response?.data?.erro || 'Não foi possível concluir a ação.');
    } finally {
      setOcupado(false);
    }
  }
  const pendente = acao.status === 'pendente';
  const cor = pendente ? OURO : acao.status === 'aplicada' ? '#5fae6b' : APAGADO;
  return (
    <div style={{ border: `1px solid ${cor}`, borderRadius: 8, padding: 10, margin: '8px 0', background: pendente ? '#17140a' : '#0e0e0e' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: cor, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {pendente ? <AlertTriangle size={13} /> : acao.status === 'aplicada' ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {pendente ? 'Precisa da sua confirmação' : acao.status === 'aplicada' ? 'Aplicada' : acao.status === 'descartada' ? 'Descartada' : acao.status}
      </div>
      <div style={{ fontSize: 13, color: TEXTO, margin: '6px 0', lineHeight: 1.45 }}>{resumo}</div>
      {motivo && <div style={{ fontSize: 12, color: APAGADO, marginBottom: 6 }}>Motivo: {motivo}</div>}
      {acao.resultado?.erro && pendente && <div style={{ fontSize: 12, color: '#d06060', marginBottom: 6 }}>Última tentativa: {acao.resultado.erro}</div>}
      {pendente ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={ocupado} onClick={() => decidir(true)} style={botao({ background: OURO, color: '#000', border: `1px solid ${OURO}` })}>
            {ocupado ? <Loader2 size={13} style={{ animation: 'hm-girar 1s linear infinite' }} /> : <CheckCircle2 size={13} />} Aplicar
          </button>
          <button type="button" disabled={ocupado} onClick={() => decidir(false)} style={botao()}>
            <XCircle size={13} /> Descartar
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: APAGADO }}>
          {acao.decidido_por_nome ? `por ${acao.decidido_por_nome} · ` : ''}{acao.decidido_em ? new Date(acao.decidido_em).toLocaleString('pt-BR') : ''}
          {acao.resultado?.mensagem ? ` · ${acao.resultado.mensagem}` : ''}
        </div>
      )}
    </div>
  );
}

// ── Mensagem ─────────────────────────────────────────────────────────────
function Mensagem({ m, acoes, aoMudarAcao, aoNavegar, aoVivo }) {
  if (m.papel === 'usuario') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
        <div style={{ maxWidth: '88%', background: '#1b1708', border: `1px solid #4a3d10`, borderRadius: '10px 10px 2px 10px', padding: '8px 10px', fontSize: 13, color: TEXTO, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {m.texto}
          {(m.arquivos || []).length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {m.arquivos.map(a => <span key={a.id} style={{ fontSize: 11, color: APAGADO, display: 'inline-flex', alignItems: 'center', gap: 3 }}><FileText size={11} />{a.nome}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }
  const vivo = aoVivo && aoVivo.mensagemId === m.id ? aoVivo : null;
  const partes = vivo ? vivo.partes : (m.passos || []);
  const criados = vivo ? vivo.criados : (m.criados || []);
  const status = vivo ? vivo.status : m.status;
  const semNada = !partes.length;
  return (
    <div style={{ margin: '10px 0', maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: OURO, fontWeight: 700, marginBottom: 4 }}>
        <Sparkles size={12} /> Assistente
        {m.tempo_ms != null && !vivo && <span style={{ color: APAGADO, fontWeight: 400 }}>· {Math.round(m.tempo_ms / 1000)} s</span>}
      </div>
      {partes.map((p, i) => (p.tipo === 'texto'
        ? <MarkdownSeguro key={i} texto={p.texto} aoNavegar={aoNavegar} />
        : <Passo key={p.id || i} parte={p} />))}
      {vivo && status === 'fila' && (
        <div style={{ fontSize: 12, color: APAGADO, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={13} style={{ animation: 'hm-girar 1s linear infinite' }} /> Na fila{vivo.posicao ? ` (posição ${vivo.posicao})` : ''} — outras pessoas estão usando o assistente.
        </div>
      )}
      {vivo && status !== 'fila' && semNada && (
        <div style={{ fontSize: 12, color: APAGADO, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={13} style={{ animation: 'hm-girar 1s linear infinite' }} /> Pensando…
        </div>
      )}
      {criados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {criados.map(c => (
            <Link key={`${c.tipo}-${c.id}`} to={c.link} onClick={aoNavegar}
              style={{ ...botao({ fontSize: 11, color: OURO, borderColor: '#4a3d10', textDecoration: 'none' }) }}>
              <Link2 size={12} /> {c.rotulo}
            </Link>
          ))}
        </div>
      )}
      {acoes.map(a => <CartaoAcao key={a.id} acao={a} aoMudar={aoMudarAcao} />)}
      {!vivo && m.erro && (
        <div style={{ fontSize: 12, color: status === 'cancelada' ? APAGADO : '#d06060', marginTop: 6, display: 'flex', gap: 6 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {m.erro}
        </div>
      )}
    </div>
  );
}

// ── Painel ───────────────────────────────────────────────────────────────
export default function PainelAssistente({ usuario }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState(null);
  const [verLista, setVerLista] = useState(false);
  const [arquivadas, setArquivadas] = useState(false);
  const [conversas, setConversas] = useState([]);
  const [conversa, setConversa] = useState(null);
  const [aoVivo, setAoVivo] = useState(null); // { mensagemId, partes, criados, status, posicao }
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [contextoTexto, setContextoTexto] = useState(null);
  const [renomeando, setRenomeando] = useState(false);
  const celular = useCelular();
  const area = useAreaVisivel(true);
  const location = useLocation();
  const fimRef = useRef(null);
  const leituraRef = useRef(null);
  const arquivoRef = useRef(null);
  const contexto = useMemo(() => contextoDaRota(location.pathname, location.search), [location.pathname, location.search]);
  const ocupado = !!aoVivo;

  // indicador "contexto: Obra … · Proposta …"
  useEffect(() => {
    if (!aberto) return;
    const { rota, ...ids } = contexto;
    if (!Object.keys(ids).length) { setContextoTexto(null); return; }
    let vivo = true;
    contextoAssistente(ids).then(({ data }) => { if (vivo) setContextoTexto(data.texto); }).catch(() => {});
    return () => { vivo = false; };
  }, [aberto, contexto]);

  const carregarStatus = useCallback(() => statusAssistente().then(({ data }) => setStatus(data)).catch(() => setStatus({ disponivel: false, motivo: 'Não foi possível consultar o assistente.' })), []);
  const carregarLista = useCallback((arq = arquivadas) => listarConversas(arq).then(({ data }) => setConversas(data)).catch(() => {}), [arquivadas]);

  // eventos do streaming → estado da resposta ao vivo
  const tratarEvento = useCallback((ev) => {
    if (ev.tipo === 'mensagens') {
      setConversa(c => (c ? { ...c, titulo: ev.titulo || c.titulo, mensagens: [...c.mensagens.filter(m => m.id !== ev.usuario.id && m.id !== ev.assistente.id), ev.usuario, ev.assistente] } : c));
      setAoVivo({ mensagemId: ev.assistente.id, partes: [], criados: [], status: 'fila', posicao: null });
      return;
    }
    if (ev.tipo === 'estado') {
      setAoVivo({ mensagemId: ev.mensagemId, partes: ev.partes || [], criados: ev.criados || [], status: ev.status, posicao: ev.posicao });
      if (ev.acoes?.length) setConversa(c => (c ? { ...c, acoes: [...c.acoes.filter(a => !ev.acoes.some(n => n.id === a.id)), ...ev.acoes] } : c));
      return;
    }
    if (ev.tipo === 'acao') {
      setConversa(c => (c ? { ...c, acoes: [...c.acoes.filter(a => a.id !== ev.acao.id), ev.acao] } : c));
      return;
    }
    if (ev.tipo === 'fim') {
      const final = ev.mensagem;
      setConversa(c => (c ? {
        ...c,
        mensagens: c.mensagens.map(m => (m.id === final.id ? { ...m, ...final } : m)),
        acoes: [...c.acoes.filter(a => !(final.acoes || []).some(n => n.id === a.id)), ...(final.acoes || [])],
      } : c));
      setAoVivo(null);
      return;
    }
    setAoVivo(v => {
      if (!v) return v;
      const partes = v.partes.slice();
      if (ev.tipo === 'fila') return { ...v, status: 'fila', posicao: ev.posicao };
      if (ev.tipo === 'executando') return { ...v, status: 'executando', posicao: null };
      if (ev.tipo === 'texto') {
        const ultima = partes[partes.length - 1];
        if (ultima && ultima.tipo === 'texto') partes[partes.length - 1] = { ...ultima, texto: ultima.texto + ev.delta };
        else partes.push({ tipo: 'texto', texto: ev.delta });
        return { ...v, partes };
      }
      if (ev.tipo === 'ferramenta_inicio') return partes.some(p => p.id === ev.id) ? v : { ...v, partes: [...partes, { tipo: 'ferramenta', id: ev.id, nome: ev.nome, rotulo: ev.rotulo, ok: null }] };
      if (ev.tipo === 'ferramenta_entrada') return { ...v, partes: partes.map(p => (p.id === ev.id ? { ...p, entrada: ev.entrada } : p)) };
      if (ev.tipo === 'ferramenta_fim') return { ...v, partes: partes.map(p => (p.id === ev.id ? { ...p, ok: ev.ok, resumo: ev.resumo } : p)) };
      if (ev.tipo === 'criado') return v.criados.some(c => c.tipo === ev.item.tipo && c.id === ev.item.id) ? v : { ...v, criados: [...v.criados, ev.item] };
      return v;
    });
  }, []);

  const pararLeitura = () => { if (leituraRef.current) { leituraRef.current.abort(); leituraRef.current = null; } };

  const abrirConversa = useCallback(async (id) => {
    pararLeitura();
    setAoVivo(null);
    try {
      const { data } = await verConversa(id);
      setConversa(data);
      setVerLista(false);
      setAnexos([]);
      gravarLocal(chaveUltima(usuario?.id), String(id));
      if (data.em_andamento) {
        const ctrl = new AbortController();
        leituraRef.current = ctrl;
        acompanharStream(id, tratarEvento, ctrl.signal).catch(() => {}).finally(() => { if (leituraRef.current === ctrl) leituraRef.current = null; });
      }
    } catch (e) {
      if (e?.response?.status === 404) { gravarLocal(chaveUltima(usuario?.id), null); setConversa(null); setVerLista(true); carregarLista(); }
      else toast.error(e?.response?.data?.erro || 'Erro ao abrir a conversa.');
    }
  }, [tratarEvento, usuario?.id, carregarLista]);

  // ao abrir o painel: status, lista e a última conversa
  useEffect(() => {
    if (!aberto) return;
    carregarStatus();
    carregarLista(false);
    if (!conversa) {
      const ultima = lerLocal(chaveUltima(usuario?.id));
      if (ultima && /^\d+$/.test(ultima)) abrirConversa(Number(ultima));
      else setVerLista(true);
    }
  }, [aberto]); // de propósito só ao abrir/fechar o painel

  useEffect(() => () => pararLeitura(), []);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [conversa?.mensagens?.length, aoVivo]);

  async function novaConversa() {
    pararLeitura();
    setAoVivo(null);
    try {
      const { data } = await criarConversa(contexto);
      setConversa({ ...data, mensagens: [], acoes: [], arquivos: [] });
      setVerLista(false);
      setAnexos([]);
      gravarLocal(chaveUltima(usuario?.id), String(data.id));
      return data;
    } catch (e) {
      toast.error(e?.response?.data?.erro || 'Erro ao criar a conversa.');
      return null;
    }
  }

  async function anexar(lista) {
    const arquivos = Array.from(lista || []);
    if (!arquivos.length) return;
    const limite = (status?.uploadMb || 25) * 1048576;
    const grandes = arquivos.filter(f => f.size > limite);
    if (grandes.length) { toast.error(`Acima de ${status?.uploadMb || 25} MB: ${grandes.map(f => f.name).join(', ')}`); return; }
    const alvo = conversa?.id ? conversa : await novaConversa();
    if (!alvo) return;
    setEnviandoArquivo(true);
    try {
      const { data } = await enviarArquivos(alvo.id, arquivos);
      setAnexos(a => [...a, ...data]);
    } catch (e) {
      toast.error(e?.response?.data?.erro || 'Erro ao enviar o arquivo.');
    } finally {
      setEnviandoArquivo(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  }

  async function enviar() {
    const msg = texto.trim();
    if (!msg || ocupado) return;
    const alvo = conversa?.id ? conversa : await novaConversa();
    if (!alvo) return;
    const ids = anexos.map(a => a.id);
    setTexto('');
    setAnexos([]);
    const ctrl = new AbortController();
    leituraRef.current = ctrl;
    setAoVivo({ mensagemId: null, partes: [], criados: [], status: 'fila', posicao: null });
    try {
      await enviarMensagemStream(alvo.id, { texto: msg, contexto, arquivos: ids }, tratarEvento, ctrl.signal);
    } catch (e) {
      if (e.name !== 'AbortError') {
        toast.error(e.message || 'Erro ao falar com o assistente.');
        setTexto(msg);
        setAnexos(a => (a.length ? a : anexos));
      }
      setAoVivo(null);
    } finally {
      if (leituraRef.current === ctrl) leituraRef.current = null;
      carregarStatus();
    }
  }

  async function parar() {
    if (!conversa?.id) return;
    try { await cancelarExecucao(conversa.id); } catch { toast.error('Não foi possível parar.'); }
  }

  async function arquivar(c, arquivar = true) {
    try {
      await alterarConversa(c.id, { arquivada: arquivar });
      if (conversa?.id === c.id && arquivar) { setConversa(null); gravarLocal(chaveUltima(usuario?.id), null); }
      carregarLista();
    } catch (e) { toast.error(e?.response?.data?.erro || 'Erro ao arquivar.'); }
  }

  async function renomear(novo) {
    setRenomeando(false);
    const t = String(novo || '').trim();
    if (!t || !conversa || t === conversa.titulo) return;
    try {
      const { data } = await alterarConversa(conversa.id, { titulo: t });
      setConversa(c => ({ ...c, titulo: data.titulo }));
    } catch (e) { toast.error(e?.response?.data?.erro || 'Erro ao renomear.'); }
  }

  const aoMudarAcao = (nova) => setConversa(c => (c ? { ...c, acoes: c.acoes.map(a => (a.id === nova.id ? { ...a, ...nova } : a)) } : c));
  const aoNavegar = () => { if (celular) setAberto(false); };
  const acoesDa = (m) => (conversa?.acoes || []).filter(a => a.mensagem_id === m.id);

  // ── botão fixo ─────────────────────────────────────────────────────────
  // posição pela área visível (useAreaVisivel): canto inferior direito do que se vê
  const botaoFixo = !aberto && (
    <button type="button" onClick={() => setAberto(true)} aria-label="Abrir o assistente"
      style={{
        position: 'fixed', left: area.x + area.w - 18, top: area.y + area.h - 18, transform: 'translate(-100%, -100%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 24, border: `1px solid ${OURO}`, background: '#141006', color: OURO,
        fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,0,0,.6)',
      }}>
      <Sparkles size={16} /> Assistente
    </button>
  );
  if (!aberto) return botaoFixo;

  const largura = celular ? area.w : Math.min(560, area.w);
  const pendentes = (conversa?.acoes || []).filter(a => a.status === 'pendente').length;

  return (
    <aside aria-label="Assistente virtual"
      onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setArrastando(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setArrastando(false); }}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); anexar(e.dataTransfer.files); }}
      style={{
        position: 'fixed', top: area.y, height: area.h, left: area.x + area.w - largura, width: largura, zIndex: 70, background: FUNDO,
        borderLeft: celular ? 'none' : `2px solid ${OURO}`, display: 'flex', flexDirection: 'column', color: TEXTO,
        boxShadow: '-8px 0 30px rgba(0,0,0,.55)',
      }}>
      <style>{'@keyframes hm-girar { to { transform: rotate(360deg); } }'}</style>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${BORDA}`, background: '#0b0b0b' }}>
        {verLista && conversa
          ? <button type="button" onClick={() => setVerLista(false)} style={botao({ padding: 5 })} aria-label="Voltar à conversa"><ArrowLeft size={15} /></button>
          : <Sparkles size={18} style={{ color: OURO, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renomeando && conversa ? (
            <input autoFocus defaultValue={conversa.titulo} maxLength={200}
              onBlur={(e) => renomear(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenomeando(false); }}
              style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${OURO}`, color: TEXTO, borderRadius: 4, padding: '3px 6px', fontSize: 13 }} />
          ) : (
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: OURO, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {verLista || !conversa ? 'Assistente H&M' : conversa.titulo}
            </div>
          )}
          <div style={{ fontSize: 10, color: status?.disponivel ? '#5fae6b' : '#d08a40', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: status?.disponivel ? '#5fae6b' : '#d08a40', display: 'inline-block' }} />
            {status == null ? 'verificando…' : status.disponivel
              ? `${status.provedor === 'api' ? 'API Anthropic' : 'Claude Max'} · ${status.modelo}${status.fila?.esperando ? ` · fila ${status.fila.esperando}` : ''} · hoje ${status.usadasHoje}${status.limiteDiario ? `/${status.limiteDiario}` : ''}`
              : 'indisponível'}
          </div>
        </div>
        {!verLista && conversa && !renomeando && (
          <button type="button" onClick={() => setRenomeando(true)} style={botao({ padding: 5 })} title="Renomear" aria-label="Renomear a conversa"><Pencil size={14} /></button>
        )}
        <button type="button" onClick={() => { setVerLista(!verLista); carregarLista(); }} style={botao({ padding: 5 })} title="Conversas" aria-label="Lista de conversas"><History size={15} /></button>
        <button type="button" onClick={novaConversa} disabled={ocupado} style={botao({ padding: 5 })} title="Nova conversa" aria-label="Nova conversa"><Plus size={15} /></button>
        <button type="button" onClick={() => setAberto(false)} style={botao({ padding: 5 })} title="Fechar" aria-label="Fechar o assistente"><X size={15} /></button>
      </div>

      {/* Avisos de disponibilidade e contexto */}
      {status && !status.disponivel && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: '#d08a40', borderBottom: `1px solid ${BORDA}`, background: '#140e05' }}>
          <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {status.motivo || 'O assistente não está disponível agora.'}
        </div>
      )}
      <div style={{ padding: '6px 12px', fontSize: 11, color: APAGADO, borderBottom: `1px solid ${BORDA}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={contextoTexto || ''}>
        Contexto: <span style={{ color: contextoTexto ? TEXTO : APAGADO }}>{contextoTexto || 'nenhuma obra, proposta ou projeto aberto'}</span>
        {status?.usoAssinatura && <span> · assinatura: 5 h {pct(status.usoAssinatura.cincoHoras)}, semana {pct(status.usoAssinatura.semana)}</span>}
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 12px', position: 'relative' }}>
        {verLista ? (
          <div>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
              <button type="button" onClick={() => { setArquivadas(false); carregarLista(false); }} style={botao(!arquivadas ? { background: OURO, color: '#000', borderColor: OURO } : {})}>Ativas</button>
              <button type="button" onClick={() => { setArquivadas(true); carregarLista(true); }} style={botao(arquivadas ? { background: OURO, color: '#000', borderColor: OURO } : {})}>Arquivadas</button>
            </div>
            {!conversas.length && <div style={{ fontSize: 12, color: APAGADO, padding: '20px 0', textAlign: 'center' }}>Nenhuma conversa {arquivadas ? 'arquivada' : 'ainda'}.</div>}
            {conversas.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 6px', borderBottom: `1px solid ${BORDA}`, cursor: 'pointer', background: conversa?.id === c.id ? '#17140a' : 'transparent' }}
                onClick={() => abrirConversa(c.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.titulo}</div>
                  <div style={{ fontSize: 10, color: APAGADO }}>
                    {new Date(c.atualizado_em).toLocaleString('pt-BR')}
                    {c.em_andamento && <span style={{ color: OURO }}> · respondendo…</span>}
                    {c.acoes_pendentes > 0 && <span style={{ color: OURO }}> · {c.acoes_pendentes} ação(ões) pendente(s)</span>}
                  </div>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); arquivar(c, !arquivadas); }} style={botao({ padding: 5 })}
                  title={arquivadas ? 'Desarquivar' : 'Arquivar'} aria-label={arquivadas ? 'Desarquivar' : 'Arquivar'}>
                  {arquivadas ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
              </div>
            ))}
          </div>
        ) : !conversa ? (
          <BoasVindas />
        ) : (
          <div>
            {!conversa.mensagens.length && <BoasVindas />}
            {conversa.mensagens.map(m => (
              <Mensagem key={m.id} m={m} acoes={acoesDa(m)} aoMudarAcao={aoMudarAcao} aoNavegar={aoNavegar} aoVivo={aoVivo} />
            ))}
            {/* resposta ainda sem id (antes do servidor confirmar) */}
            {aoVivo && !aoVivo.mensagemId && (
              <div style={{ fontSize: 12, color: APAGADO, display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0' }}>
                <Loader2 size={13} style={{ animation: 'hm-girar 1s linear infinite' }} /> Enviando…
              </div>
            )}
            <div ref={fimRef} />
          </div>
        )}
        {arrastando && (
          <div style={{ position: 'absolute', inset: 8, border: `2px dashed ${OURO}`, borderRadius: 10, background: 'rgba(20,16,6,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: OURO, fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>
            Solte os arquivos para anexar
          </div>
        )}
      </div>

      {/* Ações pendentes (atalho) */}
      {pendentes > 0 && !verLista && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: OURO, borderTop: `1px solid ${BORDA}` }}>
          {pendentes} ação(ões) esperando sua confirmação nesta conversa.
        </div>
      )}

      {/* Composição */}
      {!verLista && (
        <div style={{ borderTop: `1px solid ${BORDA}`, padding: 10, background: '#0b0b0b' }}>
          {anexos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {anexos.map(a => (
                <span key={a.id} style={{ ...botao({ fontSize: 11, fontWeight: 600, cursor: 'default', padding: '3px 8px' }) }}>
                  <FileText size={12} style={{ color: OURO }} /> {a.nome} <span style={{ color: APAGADO }}>{tamanho(a.tamanho)}</span>
                  <button type="button" onClick={() => setAnexos(l => l.filter(x => x.id !== a.id))} aria-label={`Tirar ${a.nome}`}
                    style={{ background: 'none', border: 'none', color: APAGADO, cursor: 'pointer', padding: 0, display: 'inline-flex' }}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <input ref={arquivoRef} type="file" multiple hidden onChange={(e) => anexar(e.target.files)}
              accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.webp,.xlsx,.csv,.docx" />
            <button type="button" onClick={() => arquivoRef.current?.click()} disabled={enviandoArquivo} style={botao({ padding: 8 })}
              title={`Anexar (${status?.tiposArquivo || 'PDF, DWG, DXF, imagens, XLSX, CSV, DOCX'}; até ${status?.uploadMb || 25} MB)`} aria-label="Anexar arquivo">
              {enviandoArquivo ? <Loader2 size={16} style={{ animation: 'hm-girar 1s linear infinite' }} /> : <Paperclip size={16} />}
            </button>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={Math.min(6, Math.max(2, texto.split('\n').length))}
              maxLength={12000} placeholder={ocupado ? 'O assistente está respondendo…' : 'Pergunte ou peça algo (Enter envia, Shift+Enter quebra a linha). Arraste arquivos aqui.'}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              style={{ flex: 1, resize: 'none', background: '#161616', border: `1px solid ${BORDA}`, borderRadius: 8, color: TEXTO, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }} />
            {ocupado ? (
              <button type="button" onClick={parar} style={botao({ padding: 8, borderColor: '#7a2a2a', color: '#e07070' })} title="Parar" aria-label="Parar a resposta">
                <Square size={16} />
              </button>
            ) : (
              <button type="button" onClick={enviar} disabled={!texto.trim() || (status && !status.disponivel)}
                style={botao({ padding: 8, background: texto.trim() ? OURO : 'transparent', color: texto.trim() ? '#000' : APAGADO, borderColor: OURO })}
                title="Enviar" aria-label="Enviar">
                <Send size={16} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#5f5848', marginTop: 5 }}>
            O assistente cria só rascunhos; aprovar, enviar, excluir e mudar preço pedem sua confirmação. Confira sempre os valores [CONFERIR].
          </div>
        </div>
      )}
    </aside>
  );
}

function BoasVindas() {
  return (
    <div style={{ padding: '18px 4px', fontSize: 13, color: APAGADO, lineHeight: 1.55 }}>
      <div style={{ color: OURO, fontWeight: 700, marginBottom: 6 }}>Como posso ajudar?</div>
      Exemplos:
      <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
        <li>"O que temos em obras em orçamento?"</li>
        <li>Anexe o PDF do projeto e peça "analise para orçamento de CFTV e monte o rascunho".</li>
        <li>"Dimensione a elétrica desta obra pela NBR 5410."</li>
        <li>"Quanto cobramos por ponto de rede da última vez?"</li>
      </ul>
      O assistente lê os arquivos, usa as skills e o catálogo do sistema e cria rascunhos. O que muda algo importante aparece como um cartão para você aplicar.
    </div>
  );
}
