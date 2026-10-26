// Botão "Link de aprovação" da proposta (versão 2.0, Fase 3I).
//
// INTERFACE
//   <BotaoLinkAprovacao propostaId={id} numero="P300" status="Ativa" />
//   props:
//     propostaId  number   obrigatório; sem id (proposta ainda não salva) o botão fica desabilitado
//     numero      string   número da proposta, só para os títulos
//     status      string   'Ativa' | 'Aprovada' | 'Recusada' | 'Cancelada' — só 'Ativa' gera link
//     onAlterado  function opcional; chamada depois de gerar/revogar um link e quando a lista
//                          mostra uma decisão do cliente (o pai pode recarregar a proposta
//                          para ver o status novo)
//     estiloBotao object   opcional; mescla no estilo do botão (para encaixar na barra do editor)
//     aberto      boolean  opcional — modo CONTROLADO (lista de propostas): o pai decide quando o
//                          modal está aberto e o componente não desenha o próprio botão
//     onFechar    function com `aberto`: chamada quando o usuário fecha o modal
//   O componente é autocontido: abre o próprio modal, chama a API (services/api.js:
//   gerarLinkAprovacao, getLinksAprovacao, revogarLinkAprovacao, getDecisoesAprovacao)
//   e mostra os toasts. Não mexe no estado do editor.
//
// O que faz: gera o link (o endereço completo aparece UMA vez — no banco fica só
// o hash), monta o texto pronto para o cliente (copiar / WhatsApp / colar no
// "Enviar por e-mail"), lista os links (estado, acessos, revogar) e as decisões
// registradas (quem, documento, quando, IP, código do comprovante, hash).
// Aceite eletrônico simples — não é assinatura ICP-Brasil.
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Link2, Copy, MessageCircle, RefreshCw, Ban, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { gerarLinkAprovacao, getLinksAprovacao, revogarLinkAprovacao, getDecisoesAprovacao } from '../services/api';

const moeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const data = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

const ESTADOS = {
  ativo: { rotulo: 'Ativo', cor: '#7fc77f' },
  usado: { rotulo: 'Usado', cor: '#c9a227' },
  expirado: { rotulo: 'Expirado', cor: '#888' },
  revogado: { rotulo: 'Revogado', cor: '#e08080' },
};

// endereço que o cliente de fora não consegue abrir (rede local / este PC)
const ehEnderecoLocal = (base) => /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i.test(base || '');

// Clipboard API só existe em HTTPS/localhost; na rede local (http://192.168…) usa o fallback
async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch { /* cai no fallback */ }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

function montarMensagem({ cliente, numero, total, url, expira }) {
  const ola = cliente ? `Olá, ${cliente}!` : 'Olá!';
  return `${ola} Segue o link para ver e aprovar a proposta ${numero} da H&M Engenharia e Tecnologia (valor total ${moeda(total)}):

${url}

Pelo link você confere os itens, baixa o PDF e aprova ou recusa informando nome e CPF/CNPJ. O link vale até ${data(expira)}.

Qualquer dúvida, estamos à disposição.
H&M Engenharia e Tecnologia — WhatsApp (61) 99185-9745`;
}

export default function BotaoLinkAprovacao({ propostaId, numero, status, onAlterado, estiloBotao, aberto: abertoPai, onFechar }) {
  const controlado = abertoPai !== undefined;
  const [abertoInterno, setAberto] = useState(false);
  const aberto = controlado ? !!abertoPai : abertoInterno;
  const fechar = () => (controlado ? onFechar?.() : setAberto(false));
  const [carregando, setCarregando] = useState(false);
  const [links, setLinks] = useState([]);
  const [decisoes, setDecisoes] = useState([]);
  const [urlBase, setUrlBase] = useState(null);
  const [dias, setDias] = useState('');
  const [gerando, setGerando] = useState(false);
  const [novo, setNovo] = useState(null); // { url, mensagem, expira_em, id }
  const qtdDecisoes = useRef(null);
  // em ref: uma função nova do pai a cada render não pode recarregar a lista (nem apagar o link recém-gerado)
  const avisarPai = useRef(onAlterado);
  avisarPai.current = onAlterado;

  const carregar = useCallback(async () => {
    if (!propostaId) return;
    setCarregando(true);
    try {
      const [l, d] = await Promise.all([getLinksAprovacao(propostaId), getDecisoesAprovacao(propostaId)]);
      setLinks(l.data.links || []);
      setUrlBase(l.data.url_publica_base || null);
      setDecisoes(d.data || []);
      // decisão nova do cliente desde a última leitura: avisa o pai
      if (qtdDecisoes.current !== null && (d.data || []).length > qtdDecisoes.current) avisarPai.current?.();
      qtdDecisoes.current = (d.data || []).length;
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar os links de aprovação');
    } finally {
      setCarregando(false);
    }
  }, [propostaId]);

  useEffect(() => {
    if (aberto) { setNovo(null); carregar(); }
  }, [aberto, carregar]); // carregar só muda com propostaId

  async function gerar() {
    setGerando(true);
    try {
      const res = await gerarLinkAprovacao(propostaId, dias || undefined);
      const r = res.data;
      const base = r.url_publica_base || window.location.origin;
      const url = `${base}${r.caminho}`;
      setNovo({ id: r.id, url, expira_em: r.expira_em, mensagem: montarMensagem({ cliente: r.cliente_nome, numero: r.numero, total: r.total, url, expira: r.expira_em }) });
      toast.success('Link gerado. Copie agora: o endereço completo não aparece de novo.');
      avisarPai.current?.();
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar o link');
    } finally {
      setGerando(false);
    }
  }

  async function revogar(link) {
    if (!window.confirm(`Revogar o link #${link.id}? Quem tiver o endereço não consegue mais abrir a proposta.`)) return;
    try {
      const res = await revogarLinkAprovacao(propostaId, link.id);
      toast.success(res.data.mensagem || 'Link revogado');
      if (novo?.id === link.id) setNovo(null);
      avisarPai.current?.();
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao revogar o link');
    }
  }

  async function copiar(texto, oque) {
    if (await copiarTexto(texto)) toast.success(`${oque} copiado`);
    else toast.error('Não foi possível copiar. Selecione o texto e copie com Ctrl+C.');
  }

  const podeGerar = status === 'Ativa';
  const baseMostrada = urlBase || window.location.origin;

  return (
    <>
      {!controlado && <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={!propostaId}
        title={propostaId ? 'Gerar link para o cliente aprovar ou recusar a proposta' : 'Salve a proposta antes de gerar o link'}
        style={{ ...btnSecundario, opacity: propostaId ? 1 : 0.5, cursor: propostaId ? 'pointer' : 'not-allowed', ...estiloBotao }}
      >
        <Link2 size={13} /> Link de aprovação
      </button>}

      {aberto && (
        <div style={overlay} onClick={fechar}>
          <div style={modal} onClick={e => e.stopPropagation()} role="dialog" aria-label="Link de aprovação">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Link de aprovação {numero ? `— ${numero}` : ''}</h3>
              <button onClick={carregar} title="Atualizar" style={{ ...btnIcone, marginRight: 6 }}><RefreshCw size={14} /></button>
              <button onClick={fechar} title="Fechar" style={{ ...btnIcone, background: 'transparent' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#999', lineHeight: 1.5, background: '#0e0e0e', border: '1px solid #222', borderRadius: 6, padding: '9px 11px', marginBottom: 14 }}>
              <ShieldCheck size={16} color="#c9a227" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                O cliente abre o link sem login, vê a proposta e aprova ou recusa informando nome e CPF/CNPJ. Ficam registrados
                data, hora, IP, navegador e o conteúdo aprovado. É um <b style={{ color: '#ccc' }}>aceite eletrônico simples</b> —
                não é assinatura digital ICP-Brasil. Aprovação pelo link muda a proposta para Aprovada (e a obra para contratada).
              </span>
            </div>

            {/* ── gerar ── */}
            <div style={secao}>
              <div style={tituloSecao}>Gerar novo link</div>
              {podeGerar ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ width: 200 }}>
                    <label style={rotulo}>Validade do link (dias)</label>
                    <input type="number" min={1} max={90} value={dias} onChange={e => setDias(e.target.value)} placeholder="validade da proposta" />
                  </div>
                  <button type="button" onClick={gerar} disabled={gerando} style={btnPrimario}>
                    <Link2 size={13} /> {gerando ? 'Gerando...' : 'Gerar link'}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: '#888' }}>Só proposta <b>Ativa</b> recebe link de aprovação (esta está {status || '—'}).</p>
              )}

              {novo && (
                <div style={{ marginTop: 12, border: '1px solid #c9a22755', borderRadius: 8, padding: 12, background: '#16130a' }}>
                  <label style={rotulo}>Endereço para o cliente (válido até {dataHora(novo.expira_em)})</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input readOnly value={novo.url} onFocus={e => e.target.select()} style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }} />
                    <button type="button" onClick={() => copiar(novo.url, 'Link')} style={btnPrimario}><Copy size={13} /> Copiar</button>
                  </div>
                  <p style={{ fontSize: 10, color: '#c9a227', marginTop: 6 }}>
                    Copie agora: o endereço completo não aparece de novo (o sistema guarda só uma impressão digital dele). Perdeu? Gere outro e revogue este.
                  </p>
                  {ehEnderecoLocal(baseMostrada) && (
                    <p style={{ fontSize: 10, color: '#e0a060', marginTop: 6 }}>
                      Atenção: {baseMostrada} só abre na rede da H&amp;M. Para o cliente abrir de fora, o sistema precisa estar publicado na
                      internet e o endereço configurado em URL_PUBLICA no .env do backend.
                    </p>
                  )}
                  <label style={{ ...rotulo, marginTop: 10 }}>Mensagem pronta</label>
                  <textarea readOnly rows={8} value={novo.mensagem} onFocus={e => e.target.select()} style={{ fontSize: 11.5 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => copiar(novo.mensagem, 'Texto')} style={btnSecundario}><Copy size={13} /> Copiar texto</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(novo.mensagem)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSecundario, textDecoration: 'none' }}>
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  </div>
                  <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>Por e-mail: cole o texto no campo Mensagem do "Enviar por e-mail" da proposta.</p>
                </div>
              )}
            </div>

            {/* ── decisões ── */}
            <div style={secao}>
              <div style={tituloSecao}>Decisões do cliente {decisoes.length ? `(${decisoes.length})` : ''}</div>
              {decisoes.length === 0 && <p style={{ fontSize: 11, color: '#666' }}>{carregando ? 'Carregando…' : 'Nenhuma decisão registrada ainda.'}</p>}
              {decisoes.map(d => (
                <div key={d.id} style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 11.5, lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: d.decisao === 'aprovada' ? '#7fc77f' : '#e08080' }}>
                    {d.decisao === 'aprovada' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {d.decisao === 'aprovada' ? 'Aprovada' : 'Recusada'} em {dataHora(d.decidido_em)}
                    <span style={{ marginLeft: 'auto', color: '#c9a227', fontFamily: 'Consolas, monospace' }}>{d.codigo}</span>
                  </div>
                  <div style={{ color: '#ccc' }}>
                    {d.nome} · {d.tipo_documento} {d.documento}{d.cargo ? ` · ${d.cargo}` : ''}{d.email ? ` · ${d.email}` : ''}
                  </div>
                  <div style={{ color: '#888' }}>Link #{d.link_id ?? '—'} · IP {d.ip || '—'} · valor {moeda(d.total)}</div>
                  {d.observacao && <div style={{ color: '#bbb' }}>{d.decisao === 'aprovada' ? 'Observação' : 'Motivo'}: {d.observacao}</div>}
                  <div style={{ color: '#666', fontSize: 10, wordBreak: 'break-all' }} title={d.user_agent || ''}>Hash do conteúdo: {d.hash_conteudo}</div>
                </div>
              ))}
            </div>

            {/* ── links ── */}
            <div style={{ ...secao, borderBottom: 'none', marginBottom: 0 }}>
              <div style={tituloSecao}>Links gerados {links.length ? `(${links.length})` : ''}</div>
              {links.length === 0 && <p style={{ fontSize: 11, color: '#666' }}>{carregando ? 'Carregando…' : 'Nenhum link gerado para esta proposta.'}</p>}
              {links.map(l => {
                const e = ESTADOS[l.estado] || ESTADOS.expirado;
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e1e1e', padding: '7px 0', fontSize: 11 }}>
                    <div style={{ flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                      <div style={{ color: '#ccc' }}>
                        <b>#{l.id}</b> · gerado {dataHora(l.criado_em)}{l.criado_por_nome ? ` por ${l.criado_por_nome}` : ''}
                      </div>
                      <div style={{ color: '#777' }}>
                        válido até {dataHora(l.expira_em)} · {l.acessos} acesso{l.acessos === 1 ? '' : 's'}
                        {l.ultimo_acesso_em ? ` (último ${dataHora(l.ultimo_acesso_em)})` : ''}
                        {l.revogado_em ? ` · revogado ${dataHora(l.revogado_em)}${l.revogado_por_nome ? ` por ${l.revogado_por_nome}` : ''}` : ''}
                      </div>
                    </div>
                    <span style={{ color: e.cor, border: `1px solid ${e.cor}55`, borderRadius: 10, padding: '1px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.rotulo}</span>
                    {l.estado === 'ativo' && (
                      <button type="button" onClick={() => revogar(l)} style={{ ...btnSecundario, padding: '5px 9px', color: '#e08080', borderColor: '#4a1a1a' }}>
                        <Ban size={12} /> Revogar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const rotulo = { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' };
const tituloSecao = { fontSize: 11, color: '#c9a227', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 };
const secao = { borderBottom: '1px solid #222', paddingBottom: 14, marginBottom: 14 };

const btnPrimario = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnSecundario = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
  color: '#bbb', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer',
};
const overlay = {
  position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
};
const modal = {
  background: '#131313', border: '1px solid #2a2a2a', borderRadius: 12,
  padding: 24, width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa', color: '#e8e0cc',
};
