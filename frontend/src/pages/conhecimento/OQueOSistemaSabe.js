import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Brain, Check, X, RefreshCw, Eye, PenTool, MessageSquare, Wallet, ChevronDown } from 'lucide-react';
import { getAprendizado, getAprendizadoOrcamento } from '../../services/api';
import { listarSugestoesAgentes, decidirSugestaoAgentes, conhecimentoDisciplinas } from '../../services/assistente';
import { useAuth } from '../../hooks/useAuth';
import { estilos } from '../../components/ui/estilos';
import { formatarMoeda } from '../../utils/format';
import { mensagemDeErro } from '../../utils/download';
import Aprendizado from '../Aprendizado';

// "O QUE O SISTEMA SABE" POR DISCIPLINA (versão 2.49, 20/11/2026). Pedido do usuário: simplificar e "diminuir a
// quantidade de telas", mantendo o fundamento de um agente por disciplina que continua aprendendo. Antes eram duas
// telas — "O que o sistema sabe" (Cadastros: leitura dos desenhos) e "O que já sabe orçar" (Propostas: preços) — e a
// fila de aprovação ficava no fim de uma delas. Agora uma tela só:
//   1. o que espera aprovação (regras do projetista, frases do campo de instruções, regras do roteador, conhecimento);
//   2. a disciplina escolhida, em 4 quadros: o que LÊ nos desenhos, o que PROJETA sozinho (as regras de sempre + as
//      aprendidas das instruções), as FRASES que entende e os PREÇOS que já sabe;
//   3. os detalhes (acerto da leitura, fila do que conferir, treino com as obras, uso de IA) recolhidos.
// Backend: /aprendizado (leitura), /orcamentos/aprendizado (preços), /agentes/conhecimento-disciplinas (regras e frases).

// a mesma chave para as três fontes (services/mapaCad.chaveDoProjeto no backend: rede → cabeamento)
const APELIDO = { rede: 'cabeamento', 'controle-acesso': 'controle_acesso' };
const chave = (d) => APELIDO[d] || d || '';
const curto = (nome) => String(nome || '').replace(/\s*\(.*\)\s*$/, '');
const n = (v) => Number(v || 0).toLocaleString('pt-BR');
const TIPO_SUGESTAO = { regra_projetista: 'Regra do projetista', instrucao: 'Frase do campo de instruções', vocabulario: 'Regra do roteador', conhecimento: 'Conhecimento' };
const SO_ADMIN = new Set(['regra_projetista', 'instrucao', 'vocabulario']);
const AUTONOMIA = { boa: ['Orça sozinho', '#81c784'], aprendendo: ['Aprendendo', '#d4b85a'], pouca: ['Pouca base', 'var(--texto-3)'] };

function Quadro({ Icone, titulo, children, testid }) {
  return (
    <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px 14px', minWidth: 0 }} data-testid={testid}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, marginBottom: 8 }}><Icone size={15} color="var(--ouro)" />{titulo}</div>
      <div style={{ fontSize: 12.5, color: 'var(--texto-2)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
const vazio = (texto) => <span style={{ color: 'var(--texto-3)' }}>{texto}</span>;

export default function OQueOSistemaSabe() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [busca, setBusca] = useSearchParams();
  const [leitura, setLeitura] = useState(null);
  const [orcamento, setOrcamento] = useState([]);
  const [conhecimento, setConhecimento] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // cada fonte vale sozinha: uma que falhe não esconde as outras
    const [l, o, c, p] = await Promise.allSettled([getAprendizado(), getAprendizadoOrcamento(), conhecimentoDisciplinas(), listarSugestoesAgentes({ situacao: 'pendente' })]);
    if (l.status === 'fulfilled') setLeitura(l.value.data); else toast.error(await mensagemDeErro(l.reason, 'Não consegui carregar a leitura dos desenhos'));
    setOrcamento(o.status === 'fulfilled' ? o.value.data || [] : []);
    setConhecimento(c.status === 'fulfilled' ? c.value.data : { nomes: {}, embutidas: {}, regras: [], frases: [] });
    setPendentes(p.status === 'fulfilled' ? p.value.data || [] : []);
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // as disciplinas com algo a mostrar, em ordem alfabética
  const disciplinas = useMemo(() => {
    if (!conhecimento) return [];
    const por = new Map();
    const pegar = (k, nome) => {
      const c = chave(k);
      if (!c) return null;
      if (!por.has(c)) por.set(c, { chave: c, nome: curto(conhecimento.nomes?.[c] || nome || c), leitura: null, orcamento: null, regras: [], frases: [], embutidas: conhecimento.embutidas?.[c] || [], pendentes: 0 });
      return por.get(c);
    };
    for (const k of Object.keys(conhecimento.embutidas || {})) pegar(k);
    for (const d of leitura?.porDisciplinaDetalhe || []) if (d.chave !== 'sem_disciplina') { const x = pegar(d.chave, d.nome); if (x) x.leitura = d; }
    for (const d of orcamento) { const x = pegar(d.disciplina, d.nome); if (x) x.orcamento = d; }
    for (const r of conhecimento.regras || []) pegar(r.chave)?.regras.push(r);
    for (const f of conhecimento.frases || []) pegar(f.chave)?.frases.push(f);
    for (const s of pendentes) { const x = s.disciplina && por.get(chave(s.disciplina)); if (x) x.pendentes++; }
    return [...por.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [conhecimento, leitura, orcamento, pendentes]);

  const pedida = busca.get('disciplina');
  const atual = disciplinas.find(d => d.chave === pedida)
    || disciplinas.slice().sort((a, b) => (b.leitura?.total || 0) + (b.orcamento?.propostas || 0) * 10 - (a.leitura?.total || 0) - (a.orcamento?.propostas || 0) * 10)[0];
  const escolher = (c) => setBusca(p => { const q = new URLSearchParams(p); q.set('disciplina', c); return q; }, { replace: true });
  const filtroPendentes = busca.get('pendentes') === 'disciplina' && atual;
  const pendentesVisiveis = filtroPendentes ? pendentes.filter(s => chave(s.disciplina) === atual.chave) : pendentes;

  async function decidir(s, situacao, { regra = false } = {}) {
    try {
      await decidirSugestaoAgentes(s.id, { situacao });
      toast.success(situacao === 'aprovada'
        ? (s.tipo === 'regra_projetista' ? 'Regra aprovada: o projetista faz sozinho nas próximas elaborações.' : 'Aprovada: passa a valer sem IA.')
        : regra ? 'Regra desativada: o projetista deixa de usar nas próximas elaborações.' : 'Recusada.');
      carregar();
    } catch (e) { toast.error(await mensagemDeErro(e, 'Não foi possível decidir')); }
  }

  if (carregando && !conhecimento) return <div style={estilos.card}>Carregando…</div>;

  const L = atual?.leitura, O = atual?.orcamento;
  const regrasAprovadas = (atual?.regras || []).filter(r => r.situacao === 'aprovada');
  const regrasDesativadas = (atual?.regras || []).filter(r => r.situacao === 'recusada');
  const frasesAprovadas = (atual?.frases || []).filter(f => f.situacao === 'aprovada');

  return (
    <div data-testid="o-que-o-sistema-sabe">
      <div style={{ ...estilos.card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Brain size={22} color="var(--ouro)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ ...estilos.ajuda, margin: 0, flex: 1 }}>
          Cada disciplina tem o seu agente: o que ele <b>lê</b> nos desenhos, o que <b>projeta</b> sozinho, as <b>frases</b> que entende no campo de
          instruções e os <b>preços</b> que já sabe. O que ele aprende com o seu trabalho fica <b>esperando aprovação</b> antes de valer — quanto mais
          aprovado, menos o sistema depende de IA.
        </p>
        <button style={estilos.btnSecundario} onClick={carregar} disabled={carregando}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {pendentes.length > 0 && (
        <div style={estilos.card} data-testid="aprovacao">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Esperando aprovação ({pendentesVisiveis.length})</h3>
            {atual && (
              <button type="button" style={{ ...estilos.btnTracejado, padding: '3px 10px' }} data-testid="filtro-pendentes"
                onClick={() => setBusca(p => { const q = new URLSearchParams(p); if (filtroPendentes) q.delete('pendentes'); else q.set('pendentes', 'disciplina'); return q; }, { replace: true })}>
                {filtroPendentes ? 'Mostrar de todas as disciplinas' : `Só de ${atual.nome}`}
              </button>
            )}
          </div>
          {!pendentesVisiveis.length && <p style={estilos.ajuda}>Nada pendente nesta disciplina.</p>}
          {pendentesVisiveis.map(s => (
            <div key={s.id} data-sugestao={s.id} style={{ borderTop: '1px solid var(--borda)', padding: '8px 0', fontSize: 12.5, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 380px', minWidth: 0 }}>
                <div style={{ color: 'var(--texto-3)', fontSize: 11.5 }}>
                  {TIPO_SUGESTAO[s.tipo] || s.tipo}{s.disciplina ? ` · ${curto(conhecimento?.nomes?.[chave(s.disciplina)] || s.disciplina)}` : ''}{s.vezes > 1 ? ` · ${s.vezes}×` : ''} · {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                </div>
                <div style={{ fontWeight: 600, margin: '2px 0' }}>{String(s.pergunta).slice(0, 240)}</div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--texto-2)', maxHeight: 120, overflowY: 'auto' }}>{String(s.resposta).slice(0, 1200)}</div>
              </div>
              {(!SO_ADMIN.has(s.tipo) || ehAdmin) ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={estilos.btnPrimario} onClick={() => decidir(s, 'aprovada')} data-testid="aprovar"><Check size={13} /> Aprovar</button>
                  <button style={estilos.btnSecundario} onClick={() => decidir(s, 'recusada')}><X size={13} /> Recusar</button>
                </div>
              ) : <span style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>o administrador aprova</span>}
            </div>
          ))}
        </div>
      )}

      <div style={estilos.card}>
        <div role="tablist" aria-label="Disciplinas" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {disciplinas.map(d => {
            const sel = d.chave === atual?.chave;
            return (
              <button key={d.chave} type="button" role="tab" aria-selected={sel} onClick={() => escolher(d.chave)} data-testid={`disciplina-${d.chave}`}
                style={{ padding: '5px 12px', borderRadius: 16, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${sel ? 'var(--ouro)' : 'var(--borda)'}`,
                  background: sel ? 'var(--ouro)' : 'var(--superficie-2)', color: sel ? '#111' : 'var(--texto)', fontWeight: sel ? 700 : 500 }}>
                {d.nome}{d.pendentes ? <span style={{ marginLeft: 6, color: sel ? '#111' : '#e0a030', fontWeight: 700 }}>●{d.pendentes}</span> : null}
              </button>
            );
          })}
        </div>

        {atual ? (
          <div data-testid={`sabe-${atual.chave}`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 12 }}>
              <Quadro Icone={Eye} titulo="Lê nos desenhos" testid="quadro-leitura">
                {L?.total ? (
                  <>
                    {[['símbolo(s) de DWG explodido', L.simbolos], ['nome(s) de bloco', L.blocos], ['linha(s) de legenda de PDF', L.legendasPdf], ['altura(s) de instalação', L.alturas], ['"não é ponto"', L.naoPonto]]
                      .filter(([, v]) => v).map(([t, v]) => <div key={t}><b style={{ color: 'var(--texto)' }}>{n(v)}</b> {t}</div>)}
                    <div style={{ marginTop: 6 }}><span style={{ color: '#3fb95f', fontWeight: 600 }}>{n(L.confirmados)} confirmado(s)</span> pelo engenheiro · <span style={{ color: '#d9a53a' }}>{n(L.sugeridos)} sugerido(s)</span> pelo sistema</div>
                  </>
                ) : vazio('Ainda não aprendeu símbolos desta disciplina. Cada linha conferida no Mapa do CAD e cada legenda lida ensinam.')}
              </Quadro>

              <Quadro Icone={PenTool} titulo="Projeta sozinho" testid="quadro-projeta">
                {atual.embutidas.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{atual.embutidas.map(t => <li key={t}>{t}</li>)}</ul> : vazio('O projetista ainda não projeta esta disciplina.')}
                {regrasAprovadas.length > 0 && (
                  <div style={{ marginTop: 8 }} data-testid="regras-aprendidas">
                    <div style={{ fontSize: 11.5, color: 'var(--texto-3)', marginBottom: 2 }}>Aprendido com as suas instruções:</div>
                    {regrasAprovadas.map(r => (
                      <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0' }} title={r.detalhe}>
                        <span style={{ flex: 1, color: 'var(--texto)' }}>✓ {r.texto} <span style={{ color: 'var(--texto-3)' }}>({r.vezes}×)</span></span>
                        {ehAdmin && <button type="button" style={{ ...estilos.btnTracejado, padding: '2px 8px', fontSize: 11 }} onClick={() => decidir(r, 'recusada', { regra: true })} data-testid="desativar-regra">Desativar</button>}
                      </div>
                    ))}
                  </div>
                )}
                {regrasDesativadas.length > 0 && <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--texto-3)' }}>{regrasDesativadas.length} regra(s) recusada(s) ou desativada(s).</div>}
                {!regrasAprovadas.length && atual.embutidas.length > 0 && <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--texto-3)' }}>A correção que você repetir pelo campo de instruções (em 2 análises ou 3 ambientes do mesmo tipo) vira sugestão de regra aqui.</div>}
              </Quadro>

              <Quadro Icone={MessageSquare} titulo="Frases que entende" testid="quadro-frases">
                {frasesAprovadas.length ? (
                  frasesAprovadas.slice(0, 30).map(f => <div key={f.id}>“{f.frase}” → <b style={{ color: 'var(--texto)' }}>{f.componente}</b></div>)
                ) : vazio('Além do vocabulário de fábrica (câmera, detector, tomada, rack…), nenhuma frase aprendida ainda. Quando a IA ajuda a entender uma instrução, a frase nova aparece para aprovação.')}
              </Quadro>

              <Quadro Icone={Wallet} titulo="Orçamento" testid="quadro-orcamento">
                {O ? (
                  <>
                    <div><span style={{ fontWeight: 700, color: AUTONOMIA[O.autonomia]?.[1] }}>{AUTONOMIA[O.autonomia]?.[0] || O.autonomia}</span> — {n(O.propostas)} proposta(s) aprovada(s)</div>
                    <div>{n(O.itensConhecidos)} itens conhecidos · {n(O.servicosComPreco)} serviços e {n(O.materiaisComPreco)} materiais com preço · {n(O.precosQueConfirmam)} preço(s) que confirmam sozinhos</div>
                    {O.itensQueAcompanham?.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--texto)' }}>{O.itensQueAcompanham.length} item(ns) que sempre acompanham</summary>
                        <table style={{ ...estilos.tabela, fontSize: 12, marginTop: 6 }}>
                          <tbody>
                            {O.itensQueAcompanham.map((it, i) => (
                              <tr key={i} style={{ borderTop: '1px solid var(--borda)' }}>
                                <td style={{ padding: '4px 6px' }}>{it.descricao}</td>
                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: 'var(--texto-3)' }}>{it.ocorrencias} de {O.propostas}</td>
                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{it.porPonto != null ? `${String(it.porPonto).replace('.', ',')} ${it.unidade || ''}/ponto` : '—'}</td>
                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{formatarMoeda(it.preco, { vazio: '—' })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    )}
                  </>
                ) : vazio('Nenhuma proposta aprovada com itens desta disciplina. Aprove propostas geradas pela análise para o sistema aprender os preços praticados.')}
              </Quadro>
            </div>
          </div>
        ) : <p style={estilos.ajuda}>Nada aprendido ainda.</p>}
      </div>

      {leitura && (
        <details style={{ ...estilos.card, padding: '12px 18px' }} data-testid="detalhes-aprendizado">
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--texto-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronDown size={14} /> Detalhes: acerto da leitura, o que falta conferir, treino com as obras e uso de IA
          </summary>
          <div style={{ marginTop: 12 }}><Aprendizado dadosIniciais={leitura} embutido /></div>
        </details>
      )}
    </div>
  );
}
