import { useState } from 'react';
import toast from 'react-hot-toast';
import { Cpu, Sparkles, LifeBuoy, ThumbsUp, ThumbsDown, BookCheck, Download, Loader2 } from 'lucide-react';
import { avaliarPedido, aprovarComoConhecimento, baixarArquivoConversa } from '../../services/assistente';
import { baixarArquivo, mensagemDeErro } from '../../utils/download';

// De onde veio cada resposta do assistente (pedido de 09/11/2026: "depender cada vez menos de IA"):
//   agente  → agente próprio do sistema, SEM IA (roteador de intenção → services/agentes)
//   suporte → suporte Claude Max (o agente pediu ajuda, ou pesquisa aprofundada) — vira conhecimento só se aprovado
//   ia      → conversa livre com o Claude (assinatura Max)
// e as ações da resposta: "serviu?" (aprendizado do roteador), "aprovar como conhecimento" (a próxima vez sai sem IA)
// e baixar os arquivos que o agente gerou.

export function origemDaMensagem(m, vivo) {
  const o = vivo?.origem || (m.provedor === 'agente' ? 'agente' : m.provedor === 'suporte_claude' ? 'suporte' : m.provedor ? 'ia' : null);
  // agente que precisou do suporte durante a execução
  if (o === 'agente' && m.sugestao_id) return 'agente_suporte';
  return o;
}

const SELOS = {
  agente: { Icone: Cpu, texto: 'Agente próprio · sem IA', cor: '#5fae6b', borda: '#2f5a35' },
  agente_suporte: { Icone: LifeBuoy, texto: 'Agente próprio + suporte Claude Max', cor: '#6aa8d8', borda: '#2b4b66' },
  suporte: { Icone: LifeBuoy, texto: 'Suporte Claude Max', cor: '#6aa8d8', borda: '#2b4b66' },
  ia: { Icone: Sparkles, texto: 'IA · Claude Max', cor: '#c9a227', borda: '#4a3d10' },
};

export function SeloOrigem({ origem }) {
  const s = SELOS[origem];
  if (!s) return null;
  const { Icone } = s;
  return (
    <span data-origem={origem} title={origem === 'agente' ? 'Resposta montada pelos motores do sistema, sem chamar a IA' : origem === 'ia' ? 'Resposta da conversa livre com a IA' : 'O agente pediu ajuda ao Claude Max (só leitura); a resposta só vira regra depois de aprovada'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: s.cor, border: `1px solid ${s.borda}`, borderRadius: 10, padding: '1px 7px' }}>
      <Icone size={11} /> {s.texto}
    </span>
  );
}

const botao = (extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: '1px solid #2a2a2a', background: 'transparent', color: '#e8e0cc', ...extra,
});

export function ArquivosGerados({ criados }) {
  const arquivos = (criados || []).filter(c => c.tipo === 'arquivo' && c.id);
  const [baixando, setBaixando] = useState(null);
  if (!arquivos.length) return null;
  async function baixar(a) {
    setBaixando(a.id);
    try { await baixarArquivo(baixarArquivoConversa(a.id), a.rotulo || 'arquivo'); } catch (e) { toast.error(await mensagemDeErro(e, 'Não foi possível baixar o arquivo.')); } finally { setBaixando(null); }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {arquivos.map(a => (
        <button key={`arq-${a.id}`} type="button" onClick={() => baixar(a)} disabled={baixando === a.id} style={botao({ color: '#5fae6b', borderColor: '#2f5a35' })}>
          {baixando === a.id ? <Loader2 size={12} style={{ animation: 'hm-girar 1s linear infinite' }} /> : <Download size={12} />} {a.rotulo}
        </button>
      ))}
    </div>
  );
}

// "Serviu?" (agente) e "Aprovar como conhecimento" (IA/suporte). Só na resposta concluída.
export function AcoesDaResposta({ m, aoMudar = () => {} }) {
  const [ocupado, setOcupado] = useState(false);
  if (m.papel !== 'assistente' || m.status !== 'concluida') return null;
  const origem = origemDaMensagem(m);
  const podeAvaliar = m.agente_pedido_id && (origem === 'agente' || origem === 'agente_suporte') && m.pedido_aceito == null;
  const podeAprovar = (origem === 'ia' || origem === 'suporte' || origem === 'agente_suporte') && !!String(m.texto || '').trim() && m.sugestao_situacao !== 'aprovada';
  if (!podeAvaliar && !podeAprovar && m.pedido_aceito == null && m.sugestao_situacao !== 'aprovada') return null;
  async function avaliar(aceito) {
    setOcupado(true);
    try { await avaliarPedido(m.agente_pedido_id, aceito); aoMudar({ ...m, pedido_aceito: aceito }); toast.success(aceito ? 'Obrigado: o sistema aprende com isso.' : 'Anotado: vamos revisar esse caminho.'); } catch (e) { toast.error(e?.response?.data?.erro || 'Não foi possível registrar.'); } finally { setOcupado(false); }
  }
  async function aprovar() {
    if (!window.confirm('Aprovar esta resposta como conhecimento do sistema?\n\nDa próxima vez a mesma pergunta será respondida pela base de conhecimento, sem IA. Confira o conteúdo antes.')) return;
    setOcupado(true);
    try { await aprovarComoConhecimento(m.id); aoMudar({ ...m, sugestao_situacao: 'aprovada' }); toast.success('Aprovado como conhecimento.'); } catch (e) { toast.error(e?.response?.data?.erro || 'Não foi possível aprovar.'); } finally { setOcupado(false); }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#8a8270' }}>
      {podeAvaliar && (
        <>
          <span>O resultado serviu?</span>
          <button type="button" disabled={ocupado} onClick={() => avaliar(true)} style={botao()} aria-label="Serviu"><ThumbsUp size={12} /> Sim</button>
          <button type="button" disabled={ocupado} onClick={() => avaliar(false)} style={botao()} aria-label="Não serviu"><ThumbsDown size={12} /> Não</button>
        </>
      )}
      {m.pedido_aceito != null && <span>{m.pedido_aceito ? 'Você marcou que serviu.' : 'Você marcou que não serviu.'}</span>}
      {podeAprovar && (
        <button type="button" disabled={ocupado} onClick={aprovar} style={botao({ color: '#6aa8d8', borderColor: '#2b4b66' })}>
          <BookCheck size={12} /> Aprovar como conhecimento
        </button>
      )}
      {m.sugestao_situacao === 'aprovada' && <span style={{ color: '#5fae6b' }}>Aprovada como conhecimento — da próxima vez sai sem IA.</span>}
    </div>
  );
}
