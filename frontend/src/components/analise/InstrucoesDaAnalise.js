import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Wand2, Undo2, Sparkles, Check, X } from 'lucide-react';
import {
  listarInstrucoes, interpretarInstrucao, interpretarInstrucaoIa, aplicarInstrucao, desfazerInstrucao,
} from '../../services/api';
import { card, btnPrimario, btnSecundario } from '../../pages/analise/estilos';
import { ehForaDaNorma } from './ProjetoSugerido';

// (2.50) depois de aplicar: o que ficou fora da norma ou num local inadequado (ex.: rack único com cabo > 90 m)
const foraDaNorma = (a) => [...new Set((a?.dadosExtraidos || []).flatMap(e => e?.projeto_sugerido?.avisos || []).filter(ehForaDaNorma))];

// CAMPO DE INSTRUÇÕES da análise (2.47, 20/11/2026 — pedido do usuário: "tem que haver um campo do qual se possa inserir
// instruções para alterar a análise, como por exemplo mude a estrutura para determinado lugar, acrescente um componente,
// retire um componente, isso de forma mais fácil"). O engenheiro escreve; o sistema mostra o que entendeu (sem IA), ele
// desmarca o que não quer e aplica: a MESMA análise é recalculada (orçamento, cabos, 3D, prancha). Desfazer volta a
// última. Quando as regras não entendem, a IA pode ajudar — ela só reescreve a frase; as palavras novas vão para
// aprovação do administrador e, aprovadas, passam a ser entendidas sem IA.
// Backend: controllers/projetos/instrucoes.js.

const caixa = { width: '100%', boxSizing: 'border-box', background: 'var(--fundo-2, #0f0f0f)', border: '1px solid var(--borda, #2a2a2a)', borderRadius: 6, color: 'var(--texto, #ddd)', fontSize: 14, padding: '10px 12px', fontFamily: 'inherit', resize: 'vertical', minHeight: 46 };
const chip = { background: 'transparent', border: '1px dashed var(--borda, #3a3a3a)', borderRadius: 14, color: 'var(--texto-3, #999)', fontSize: 12, padding: '3px 10px', cursor: 'pointer' };
const linhaOp = { display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left', gap: 8, fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--borda, #222)', cursor: 'pointer' };
const marca = { width: 16, height: 16, minWidth: 16, flex: '0 0 16px', margin: '2px 0 0', padding: 0 };
const aviso = { color: '#e0b04a', fontSize: 12.5, margin: '6px 0 0', lineHeight: 1.5 };

const tecnica = (n) => /CPD|T[ÉE]CNIC|DEP[ÓO]SITO|ALMOX|SERVIDOR|RACK/i.test(n);

// exemplos com os ambientes DESTA análise (o engenheiro vê como escrever)
function exemplos(analise) {
  const nomes = [...new Set((analise.ambientes || []).filter(a => a?.nome && !a.semNome).map(a => a.nome))];
  if (!nomes.length) return [];
  const disc = new Set(analise.disciplinas || []);
  const sala = nomes.find(n => !tecnica(n) && !/BANHEIRO|SANIT|WC/i.test(n)) || nomes[0];
  const outra = nomes.find(n => n !== sala && !tecnica(n)) || nomes[0];
  const tec = nomes.find(tecnica);
  const lista = [];
  if (disc.has('cftv')) lista.push(`acrescente 2 câmeras na ${sala.toLowerCase()}`);
  else if (disc.has('rede')) lista.push(`acrescente 2 pontos de rede na ${sala.toLowerCase()}`);
  else lista.push(`acrescente 1 tomada na ${sala.toLowerCase()}`);
  if (disc.has('incendio')) lista.push(`retire o detector do ${outra.toLowerCase()}`);
  else lista.push(`retire uma câmera do ${outra.toLowerCase()}`);
  if (analise.finalidade === 'elaboracao' && tec && (disc.has('cftv') || disc.has('rede'))) lista.push(`leve o rack para o ${tec.toLowerCase()}`);
  return lista.slice(0, 3);
}

export default function InstrucoesDaAnalise({ analise, onAtualizada }) {
  const [texto, setTexto] = useState('');
  const [leitura, setLeitura] = useState(null); // { operacoes, duvidas, iaDisponivel, origem, termos }
  const [marcadas, setMarcadas] = useState([]);
  const [ocupado, setOcupado] = useState(''); // 'interpretar' | 'ia' | 'aplicar' | 'desfazer'
  const [historico, setHistorico] = useState([]);
  const id = analise.id;

  const carregarHistorico = useCallback(() => {
    listarInstrucoes(id).then(r => setHistorico(r.data || [])).catch(() => setHistorico([]));
  }, [id]);
  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);
  const sugestoes = useMemo(() => exemplos(analise), [analise]);

  function mostrar(dados, origem) {
    setLeitura({ ...dados, origem });
    setMarcadas((dados.operacoes || []).map(() => true));
  }

  async function interpretar() {
    const t = texto.trim();
    if (!t) { toast('Escreva o que mudar — por exemplo: "acrescente 2 câmeras na capela".', { icon: '✏️' }); return; }
    setOcupado('interpretar');
    try {
      const r = await interpretarInstrucao(id, t);
      mostrar(r.data, 'regras');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não consegui ler a instrução');
    } finally { setOcupado(''); }
  }

  async function pedirIa() {
    setOcupado('ia');
    try {
      const r = await interpretarInstrucaoIa(id, texto.trim());
      mostrar(r.data, 'ia');
      if (!r.data.operacoes?.length) toast('A IA também não entendeu: reescreva com o nome do componente e do ambiente.', { icon: '🤔', duration: 7000 });
    } catch (err) {
      toast.error(err.response?.data?.erro || 'A IA não respondeu', { duration: 8000 });
    } finally { setOcupado(''); }
  }

  async function aplicar() {
    const operacoes = (leitura?.operacoes || []).filter((_, i) => marcadas[i]);
    if (!operacoes.length) return;
    setOcupado('aplicar');
    try {
      const r = await aplicarInstrucao(id, { texto: texto.trim(), operacoes, origem: leitura.origem, termos: leitura.origem === 'ia' ? leitura.termos : undefined });
      onAtualizada?.(r.data);
      toast.success(`Instrução aplicada — análise recalculada (${operacoes.length} ${operacoes.length === 1 ? 'mudança' : 'mudanças'}).`, { duration: 6000 });
      foraDaNorma(r.data).slice(0, 3).forEach(aviso => toast(aviso, { icon: '⛔', duration: 20000 }));
      if (leitura.origem === 'ia' && leitura.termos?.length) toast('As palavras novas foram para aprovação: depois de aprovadas, o sistema entende sem IA.', { icon: '📚', duration: 8000 });
      // (2.49) a correção repetida virou sugestão de regra do projetista (o administrador aprova em "O que o sistema sabe")
      const regras = r.data?.instrucao?.regrasSugeridas || [];
      if (regras.length) toast(`Você já fez essa correção antes — virou sugestão de regra do projetista: ${regras.map(x => x.texto.replace(/^Projetista de [^:]+:\s*/, '')).join('; ')}. Aprovada em "O que o sistema sabe", o projetista faz sozinho nas próximas elaborações.`, { icon: '🧠', duration: 12000 });
      setTexto(''); setLeitura(null);
      carregarHistorico();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não consegui aplicar a instrução', { duration: 10000 });
    } finally { setOcupado(''); }
  }

  async function desfazer(i) {
    if (!window.confirm(`Desfazer "${i.texto}"?\n\nA análise volta a como estava antes desta instrução e é recalculada.`)) return;
    setOcupado('desfazer');
    try {
      const r = await desfazerInstrucao(id, i.id);
      onAtualizada?.(r.data);
      toast.success('Instrução desfeita — análise recalculada.');
      carregarHistorico();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não consegui desfazer', { duration: 10000 });
    } finally { setOcupado(''); }
  }

  const nMarcadas = marcadas.filter(Boolean).length;
  const ativas = historico.filter(h => !h.desfeita_em).length;
  return (
    <div style={{ ...card, padding: '14px 18px' }} data-testid="instrucoes-analise">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Wand2 size={16} color="#c9a227" />
        <strong style={{ color: '#c9a227', fontSize: 14.5 }}>Diga o que mudar</strong>
        <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>— acrescentar, retirar, mover, trocar ou deixar N componentes; a análise é recalculada</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={texto} rows={1} style={caixa} disabled={!!ocupado} data-testid="instrucao-texto"
          placeholder={sugestoes[0] ? `Ex.: ${sugestoes.join('; ')}` : 'Ex.: acrescente 2 câmeras na capela; retire o detector do banheiro'}
          onChange={e => { setTexto(e.target.value); if (leitura) setLeitura(null); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); interpretar(); } }}
          aria-label="Instrução para alterar a análise"
        />
        <button type="button" onClick={interpretar} disabled={!!ocupado} style={{ ...btnPrimario, whiteSpace: 'nowrap' }} data-testid="instrucao-interpretar">
          {ocupado === 'interpretar' ? 'Lendo…' : 'Interpretar'}
        </button>
      </div>
      {!texto && !leitura && sugestoes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {sugestoes.map(s => <button key={s} type="button" style={chip} onClick={() => setTexto(s)}>{s}</button>)}
        </div>
      )}

      {leitura && (
        <div style={{ marginTop: 10 }} data-testid="instrucao-leitura">
          {leitura.operacoes?.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 2 }}>
                Entendi{leitura.origem === 'ia' ? ' (com ajuda da IA)' : ''} — desmarque o que não quiser:
              </div>
              {leitura.operacoes.map((o, i) => (
                <label key={i} style={linhaOp} data-testid="instrucao-operacao">
                  <input type="checkbox" style={marca} checked={!!marcadas[i]} onChange={e => setMarcadas(m => m.map((v, j) => (j === i ? e.target.checked : v)))} disabled={!!ocupado} />
                  <span style={{ flex: 1 }}>{o.descricao}</span>
                </label>
              ))}
            </>
          )}
          {leitura.duvidas?.map((d, i) => <p key={i} style={aviso} data-testid="instrucao-duvida">⚠ {d}</p>)}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {leitura.operacoes?.length > 0 && (
              <button type="button" onClick={aplicar} disabled={!!ocupado || !nMarcadas} style={btnPrimario} data-testid="instrucao-aplicar">
                <Check size={14} style={{ marginRight: 5 }} />{ocupado === 'aplicar' ? 'Aplicando e recalculando…' : `Aplicar (${nMarcadas})`}
              </button>
            )}
            {leitura.origem !== 'ia' && leitura.iaDisponivel && leitura.duvidas?.length > 0 && (
              <button type="button" onClick={pedirIa} disabled={!!ocupado} style={btnSecundario} data-testid="instrucao-ia" title="A IA reescreve a frase no formato que o sistema entende; as palavras novas vão para aprovação">
                <Sparkles size={13} style={{ marginRight: 5 }} />{ocupado === 'ia' ? 'Perguntando à IA…' : 'Pedir ajuda à IA'}
              </button>
            )}
            <button type="button" onClick={() => setLeitura(null)} disabled={!!ocupado} style={btnSecundario}><X size={13} style={{ marginRight: 4 }} />Cancelar</button>
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <details style={{ marginTop: 10 }} data-testid="instrucoes-historico">
          <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--texto-3)' }}>Instruções aplicadas ({ativas}{historico.length > ativas ? `, ${historico.length - ativas} desfeita(s)` : ''})</summary>
          {historico.map(h => (
            <div key={h.id} style={{ ...linhaOp, opacity: h.desfeita_em ? 0.5 : 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ textDecoration: h.desfeita_em ? 'line-through' : 'none' }}>"{h.texto}"{h.origem === 'ia' ? ' · com IA' : ''}</div>
                <div style={{ color: 'var(--texto-3)', fontSize: 11.5 }}>
                  {h.operacoes.join(' · ')} — {h.usuario_nome || 'usuário'}, {new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{h.desfeita_em ? ' · desfeita' : ''}
                </div>
              </div>
              {h.podeDesfazer && (
                <button type="button" onClick={() => desfazer(h)} disabled={!!ocupado} style={{ ...btnSecundario, whiteSpace: 'nowrap' }} data-testid="instrucao-desfazer">
                  <Undo2 size={13} style={{ marginRight: 4 }} />{ocupado === 'desfazer' ? 'Desfazendo…' : 'Desfazer'}
                </button>
              )}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
