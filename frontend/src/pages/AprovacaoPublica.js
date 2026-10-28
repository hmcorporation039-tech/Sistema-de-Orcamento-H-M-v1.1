// Página PÚBLICA de aprovação da proposta (versão 2.0, Fase 3I) — /aprovacao/:token.
//
// Fica FORA do Layout e não exige login (rota em App.js): quem abre é o
// cliente, pelo link que a H&M enviou. Conversa só com /api/publico/aprovacao
// (instância axios própria em services/api.js, sem o token do sistema).
//
// Fluxo: ver a proposta → Aprovar ou Recusar → nome + CPF/CNPJ (+ cargo/e-mail
// opcionais) e, para aprovar, "Li e concordo" → confirmação final → comprovante.
// É aceite eletrônico simples (não ICP-Brasil) — dito na tela e no comprovante.
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, FileDown, Printer, AlertTriangle, ShieldCheck, ArrowLeft, Box } from 'lucide-react';
import { getAprovacaoPublica, enviarDecisaoAprovacao, urlPdfAprovacaoPublica, urlModelo3dAprovacaoPublica } from '../services/api';

const OURO = '#c9a227';
const OURO_ESCURO = '#8a6d12';
const TINTA = '#1d1b16';
const SUAVE = '#6b665a';
const FUNDO = '#f4f1ea';
const BORDA = '#e2dccd';

const moeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qtd = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const pct = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function dataBR(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
function dataHoraBR(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// CPF / CNPJ (inclusive o CNPJ alfanumérico da Receita) — mesma regra do backend
const limparDoc = (v) => String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
function cpfValido(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += Number(b[i]) * (b.length + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  const d1 = dv(c.slice(0, 9));
  return c === c.slice(0, 9) + d1 + dv(c.slice(0, 9) + d1);
}
function cnpjValido(c) {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (b) => {
    const p = b.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = b.split('').reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * p[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(c.slice(0, 12));
  return c === c.slice(0, 12) + d1 + dv(c.slice(0, 12) + d1);
}
const documentoValido = (v) => { const d = limparDoc(v); return d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false; };
function mascaraDoc(v) {
  const d = limparDoc(v).slice(0, 14);
  if (d.length <= 11 && /^\d*$/.test(d)) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d.replace(/^(\w{2})(\w)/, '$1.$2').replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3').replace(/\.(\w{3})(\w)/, '.$1/$2').replace(/(\w{4})(\d{1,2})$/, '$1-$2');
}

function mensagemDeErro(err) {
  const st = err?.response?.status;
  if (st === 429) return err.response.data?.erro || 'Muitos acessos em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (err?.response?.data?.erro) return err.response.data.erro;
  return 'Não foi possível falar com o servidor. Confira sua internet e tente novamente.';
}

export default function AprovacaoPublica() {
  const { token } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null); // { mensagem, invalido }
  const [dados, setDados] = useState(null);
  const [etapa, setEtapa] = useState('ver'); // ver | form | confirmar | enviando | comprovante
  const [decisao, setDecisao] = useState(null); // 'aprovada' | 'recusada'
  const [form, setForm] = useState({ nome: '', documento: '', cargo: '', email: '', observacao: '', aceite: false });
  const [erroForm, setErroForm] = useState('');
  const [comprovante, setComprovante] = useState(null);

  // fundo claro só nesta página (o sistema interno é escuro) e fora de buscadores
  useEffect(() => {
    const antes = { bg: document.body.style.background, cor: document.body.style.color, titulo: document.title };
    document.body.style.background = FUNDO;
    document.body.style.color = TINTA;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.body.style.background = antes.bg;
      document.body.style.color = antes.cor;
      document.title = antes.titulo;
      meta.remove();
    };
  }, []);

  async function carregar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      const res = await getAprovacaoPublica(token);
      setDados(res.data);
      document.title = `Proposta ${res.data.proposta?.numero || ''} — H&M Engenharia`;
      if (res.data.comprovante) { setComprovante(res.data.comprovante); setEtapa('comprovante'); }
    } catch (err) {
      setErroCarga({ mensagem: mensagemDeErro(err), invalido: err?.response?.status === 404 });
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, [token]); // eslint-disable-line

  const p = dados?.proposta;
  const aberta = dados?.situacao === 'aberta';
  // O servidor não entrega o PDF de proposta recusada ou cancelada (404): sem
  // o botão nesses casos (antes ele aparecia e dava "não encontrado")
  const decisaoAtual = comprovante?.decisao || dados?.comprovante?.decisao || null;
  const pdfDisponivel = decisaoAtual !== 'recusada'
    && !(dados?.situacao === 'indisponivel' && dados?.codigo === 'PROPOSTA_INDISPONIVEL' && /recusada|cancelada/i.test(dados?.mensagem || ''));
  // modelo 3D ilustrativo (2.3): o servidor diz se quem orçou ligou para o cliente
  const modelo3d = dados?.modelo_3d === true && pdfDisponivel;

  function escolher(d) {
    setDecisao(d);
    setErroForm('');
    setForm(f => ({ ...f, aceite: false }));
    setEtapa('form');
    setTimeout(() => document.getElementById('decisao')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function revisar(e) {
    e.preventDefault();
    const nome = form.nome.trim().replace(/\s+/g, ' ');
    if (nome.length < 3) return setErroForm('Informe o nome completo.');
    if (!documentoValido(form.documento)) return setErroForm('CPF ou CNPJ inválido. Confira os números digitados.');
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErroForm('E-mail inválido.');
    if (decisao === 'aprovada' && !form.aceite) return setErroForm('Para aprovar, marque "Li e concordo com os termos da proposta".');
    setErroForm('');
    setEtapa('confirmar');
  }

  async function confirmar() {
    setEtapa('enviando');
    try {
      const res = await enviarDecisaoAprovacao(token, {
        decisao,
        nome: form.nome.trim(),
        documento: form.documento,
        cargo: form.cargo.trim() || undefined,
        email: form.email.trim() || undefined,
        observacao: form.observacao.trim() || undefined,
        aceite: decisao === 'aprovada' ? form.aceite === true : false,
        hash_conteudo: dados.hash_conteudo,
      });
      setComprovante(res.data.comprovante);
      setEtapa('comprovante');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const codigo = err?.response?.data?.codigo;
      setErroForm(mensagemDeErro(err));
      setEtapa('form');
      // proposta mudou, já decidida ou indisponível: recarrega para mostrar o estado atual
      if (['PROPOSTA_ALTERADA', 'JA_DECIDIDA', 'PROPOSTA_INDISPONIVEL', 'PROPOSTA_VENCIDA', 'LINK_INVALIDO'].includes(codigo)) {
        const msg = mensagemDeErro(err);
        await carregar();
        setErroForm(msg);
      }
    }
  }

  if (carregando && !dados) return <Moldura><div style={{ padding: 40, textAlign: 'center', color: SUAVE }}>Carregando a proposta…</div></Moldura>;

  if (erroCarga && !dados) {
    return (
      <Moldura>
        <div style={{ ...cartao, textAlign: 'center', padding: '36px 22px' }}>
          <AlertTriangle size={36} color={OURO_ESCURO} />
          <h2 style={{ fontSize: 18, margin: '12px 0 8px' }}>{erroCarga.invalido ? 'Link indisponível' : 'Não foi possível abrir a proposta'}</h2>
          <p style={{ color: SUAVE, fontSize: 15, lineHeight: 1.5 }}>{erroCarga.mensagem}</p>
          {!erroCarga.invalido && <button style={{ ...btnOuro, margin: '18px auto 0' }} onClick={carregar}>Tentar de novo</button>}
          <Contato />
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura>
      {etapa === 'comprovante' && comprovante && <Comprovante c={comprovante} token={token} pdfDisponivel={pdfDisponivel} />}

      {/* ── Cabeçalho da proposta ── */}
      <section style={cartao}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={rotulo}>Proposta comercial</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: OURO_ESCURO, lineHeight: 1.1 }}>{p.numero}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, color: SUAVE, lineHeight: 1.6 }}>
            <div>Emitida em <b style={{ color: TINTA }}>{dataBR(p.data)}</b></div>
            {p.vence_em && <div>Válida até <b style={{ color: TINTA }}>{dataBR(p.vence_em)}</b></div>}
          </div>
        </div>
        <div style={gradeInfo}>
          <Info rotuloTexto="Cliente" valor={p.cliente_nome} />
          <Info rotuloTexto="Local da obra" valor={p.local_obra} />
          {p.tipo && <Info rotuloTexto="Tipo" valor={p.tipo} />}
          {p.responsavel && <Info rotuloTexto="Responsável técnico" valor={p.responsavel} />}
        </div>
        <div style={{ marginTop: 16, padding: '14px 16px', background: '#1d1b16', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: '#d9d2bf', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.6px' }}>Total da proposta</span>
          <span style={{ color: OURO, fontSize: 24, fontWeight: 800 }}>{moeda(p.totais.total)}</span>
        </div>
        {pdfDisponivel && (
          <a href={urlPdfAprovacaoPublica(token)} target="_blank" rel="noopener noreferrer" style={{ ...btnClaro, marginTop: 12 }} data-testid="baixar-pdf">
            <FileDown size={17} /> Baixar a proposta em PDF
          </a>
        )}
        {modelo3d && (
          <a href={urlModelo3dAprovacaoPublica(token)} target="_blank" rel="noopener noreferrer" style={{ ...btnEscuro, marginTop: 10, textDecoration: 'none' }} data-testid="ver-3d-publico">
            <Box size={17} /> Ver como vai ficar (modelo 3D)
          </a>
        )}
        {modelo3d && (
          <div style={{ fontSize: 12, color: SUAVE, marginTop: 6, lineHeight: 1.5 }}>
            Ilustração gerada a partir da arquitetura: gire, aproxime e ligue/desligue as camadas. Não substitui o projeto executivo — valem as quantidades desta proposta.
          </div>
        )}
      </section>

      {dados.situacao === 'indisponivel' && etapa !== 'comprovante' && (
        <div style={{ ...cartao, borderLeft: `4px solid ${OURO}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={22} color={OURO_ESCURO} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>{dados.mensagem}</div>
        </div>
      )}

      {p.escopo && <Bloco titulo="Escopo">{p.escopo}</Bloco>}

      {/* ── Itens ── */}
      <section style={cartao}>
        <h3 style={titulo}>Itens da proposta</h3>
        {p.secoes.map((s, si) => (
          <div key={si} style={{ marginTop: si ? 18 : 6 }}>
            <div style={{ fontWeight: 700, fontSize: 14, padding: '8px 10px', background: '#f1ecdf', borderRadius: 6 }}>{s.nome}</div>
            {s.itens.map((it, ii) => {
              const novoSub = it.subgrupo && it.subgrupo !== s.itens[ii - 1]?.subgrupo;
              return (
                <div key={ii}>
                  {novoSub && <div style={{ fontSize: 11, fontWeight: 700, color: SUAVE, textTransform: 'uppercase', letterSpacing: '.5px', padding: '10px 10px 2px' }}>{it.subgrupo}</div>}
                  <div style={{ display: 'flex', gap: 10, padding: '10px', borderBottom: `1px solid ${BORDA}`, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, lineHeight: 1.35, wordBreak: 'break-word' }}>{it.descricao}</div>
                      <div style={{ fontSize: 12.5, color: SUAVE, marginTop: 3 }}>
                        {qtd(it.quantidade)} {it.unidade || ''} × {moeda(it.valor_unitario)}{it.codigo ? ` · cód. ${it.codigo}` : ''}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap' }}>{moeda(it.valor_total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 380, fontSize: 14 }}>
          <LinhaTotal t="Subtotal materiais" v={p.totais.subtotal_materiais} />
          {p.totais.valor_imposto_venda != null && <LinhaTotal t={`Imposto sobre vendas (${pct(p.totais.imposto_venda_pct)}%)`} v={p.totais.valor_imposto_venda} />}
          <LinhaTotal t="Subtotal mão de obra" v={p.totais.subtotal_mao_obra} />
          {p.totais.valor_imposto_servico != null && <LinhaTotal t={`Imposto sobre serviços (${pct(p.totais.imposto_servico_pct)}%)`} v={p.totais.valor_imposto_servico} />}
          {p.totais.valor_bdi_materiais != null ? (
            <>
              <LinhaTotal t={`BDI materiais (${pct(p.totais.bdi_materiais_pct)}%)`} v={p.totais.valor_bdi_materiais} />
              <LinhaTotal t={`BDI mão de obra (${pct(p.totais.bdi_mao_obra_pct)}%)`} v={p.totais.valor_bdi_mao_obra} />
            </>
          ) : p.totais.valor_bdi != null ? (
            <LinhaTotal t={`BDI (${pct(p.totais.bdi_pct)}%)`} v={p.totais.valor_bdi} />
          ) : null}
          {p.totais.valor_indiretos != null && <LinhaTotal t="Despesas indiretas" v={p.totais.valor_indiretos} />}
          {p.totais.desconto_materiais_pct != null && <div style={notaDesconto}>Desconto de {pct(p.totais.desconto_materiais_pct)}% já aplicado aos valores de materiais</div>}
          {p.totais.desconto_mao_obra_pct != null && <div style={notaDesconto}>Desconto de {pct(p.totais.desconto_mao_obra_pct)}% já aplicado aos valores de mão de obra</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${OURO}`, marginTop: 6, paddingTop: 8, fontSize: 18, fontWeight: 800, color: OURO_ESCURO }}>
            <span>Total geral</span><span>{moeda(p.totais.total)}</span>
          </div>
        </div>
      </section>

      {p.pagamento && <Bloco titulo="Condições de pagamento">{p.pagamento}</Bloco>}
      {p.observacoes && <Bloco titulo="Observações">{p.observacoes}</Bloco>}

      {/* ── Decisão ── */}
      {aberta && etapa !== 'comprovante' && (
        <section id="decisao" style={{ ...cartao, border: `1px solid ${OURO}` }}>
          {etapa === 'ver' && (
            <>
              <h3 style={titulo}>Sua decisão</h3>
              <p style={{ fontSize: 14.5, color: SUAVE, lineHeight: 1.5, marginBottom: 14 }}>
                Depois de conferir a proposta, aprove ou recuse. Vamos pedir seu nome e CPF/CNPJ para registrar a decisão.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={{ ...btnOuro, flex: '1 1 180px' }} onClick={() => escolher('aprovada')}><CheckCircle2 size={19} /> Aprovar proposta</button>
                <button style={{ ...btnClaro, flex: '1 1 180px', marginTop: 0 }} onClick={() => escolher('recusada')}><XCircle size={19} /> Recusar</button>
              </div>
            </>
          )}

          {(etapa === 'form' || etapa === 'confirmar' || etapa === 'enviando') && (
            <form onSubmit={revisar}>
              <h3 style={titulo}>{decisao === 'aprovada' ? 'Aprovar a proposta' : 'Recusar a proposta'}</h3>
              <fieldset disabled={etapa !== 'form'} style={{ border: 'none', padding: 0, margin: 0 }}>
                <Campo rotuloTexto="Nome completo *">
                  <input style={entrada} value={form.nome} autoComplete="name" maxLength={150}
                    onChange={e => setForm({ ...form, nome: e.target.value })} />
                </Campo>
                <Campo rotuloTexto="CPF ou CNPJ *">
                  <input style={entrada} value={form.documento} inputMode="text" autoComplete="off" maxLength={18}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    onChange={e => setForm({ ...form, documento: mascaraDoc(e.target.value) })} />
                </Campo>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <Campo rotuloTexto="Cargo (opcional)">
                      <input style={entrada} value={form.cargo} maxLength={100} placeholder="Ex.: Síndico, Diretor"
                        onChange={e => setForm({ ...form, cargo: e.target.value })} />
                    </Campo>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <Campo rotuloTexto="E-mail (opcional)">
                      <input style={entrada} type="email" value={form.email} maxLength={254} autoComplete="email"
                        onChange={e => setForm({ ...form, email: e.target.value })} />
                    </Campo>
                  </div>
                </div>
                <Campo rotuloTexto={decisao === 'aprovada' ? 'Observação (opcional)' : 'Motivo da recusa (opcional, nos ajuda a melhorar)'}>
                  <textarea style={{ ...entrada, minHeight: 80, resize: 'vertical' }} value={form.observacao} maxLength={2000}
                    onChange={e => setForm({ ...form, observacao: e.target.value })} />
                </Campo>
                {decisao === 'aprovada' && (
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px', background: '#faf6ea', border: `1px solid ${BORDA}`, borderRadius: 8, cursor: 'pointer', marginTop: 4 }}>
                    <input type="checkbox" checked={form.aceite} onChange={e => setForm({ ...form, aceite: e.target.checked })}
                      style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1, accentColor: OURO_ESCURO }} />
                    <span style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                      <b>Li e concordo com os termos da proposta.</b>
                      <span style={{ display: 'block', fontSize: 12.5, color: SUAVE, marginTop: 4 }}>{dados.texto_declaracao_aprovar}</span>
                    </span>
                  </label>
                )}
              </fieldset>

              {erroForm && <div role="alert" style={caixaErro}>{erroForm}</div>}

              {etapa === 'form' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <button type="button" style={{ ...btnClaro, marginTop: 0, flex: '0 1 auto' }} onClick={() => { setEtapa('ver'); setErroForm(''); }}>
                    <ArrowLeft size={17} /> Voltar
                  </button>
                  <button type="submit" style={{ ...(decisao === 'aprovada' ? btnOuro : btnEscuro), flex: '1 1 200px' }}>
                    Continuar
                  </button>
                </div>
              )}

              {(etapa === 'confirmar' || etapa === 'enviando') && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#1d1b16', color: '#f2ecdc' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: OURO, marginBottom: 8 }}>
                    {decisao === 'aprovada' ? 'Confirmar a aprovação?' : 'Confirmar a recusa?'}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    Proposta <b>{p.numero}</b> · {moeda(p.totais.total)}<br />
                    {form.nome.trim()} · {form.documento}
                  </div>
                  <div style={{ fontSize: 12, color: '#b8b09c', marginTop: 8, lineHeight: 1.45 }}>
                    Ao confirmar, ficam registrados data, hora, endereço IP e navegador. Cada link aceita uma única decisão.
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button type="button" disabled={etapa === 'enviando'} style={{ ...btnClaro, marginTop: 0, flex: '0 1 auto' }} onClick={() => setEtapa('form')}>
                      <ArrowLeft size={17} /> Corrigir
                    </button>
                    <button type="button" disabled={etapa === 'enviando'} style={{ ...btnOuro, flex: '1 1 200px', opacity: etapa === 'enviando' ? 0.7 : 1 }} onClick={confirmar}>
                      {etapa === 'enviando' ? 'Registrando…' : decisao === 'aprovada' ? 'Confirmar aprovação' : 'Confirmar recusa'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </section>
      )}

      <AvisoJuridico texto={dados.aviso} />
      <Contato />
    </Moldura>
  );
}

function Comprovante({ c, token, pdfDisponivel }) {
  const aprovada = c.decisao === 'aprovada';
  return (
    <section style={{ ...cartao, border: `2px solid ${aprovada ? OURO : '#b9b2a2'}` }} className="comprovante">
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        {aprovada ? <CheckCircle2 size={44} color={OURO_ESCURO} /> : <XCircle size={44} color={SUAVE} />}
        <h2 style={{ fontSize: 21, margin: '8px 0 4px' }}>{aprovada ? 'Proposta aprovada' : 'Recusa registrada'}</h2>
        <div style={{ fontSize: 14, color: SUAVE }}>{aprovada ? 'Obrigado! A equipe da H&M Engenharia vai entrar em contato para os próximos passos.' : 'Obrigado pelo retorno.'}</div>
      </div>
      <div style={{ ...rotulo, textAlign: 'center' }}>Comprovante</div>
      <div style={{ textAlign: 'center', fontFamily: 'Consolas, monospace', fontSize: 18, fontWeight: 700, letterSpacing: '.5px', marginBottom: 14 }}>{c.codigo}</div>
      <div style={gradeInfo}>
        <Info rotuloTexto="Proposta" valor={c.numero} />
        <Info rotuloTexto="Valor total" valor={moeda(c.total)} />
        <Info rotuloTexto="Data e hora" valor={c.decidido_em_texto || dataHoraBR(c.decidido_em)} />
        <Info rotuloTexto="Decisão" valor={aprovada ? 'Aprovada' : 'Recusada'} />
        <Info rotuloTexto="Nome" valor={c.nome} />
        <Info rotuloTexto={c.tipo_documento} valor={c.documento} />
        {c.cargo && <Info rotuloTexto="Cargo" valor={c.cargo} />}
        {c.email && <Info rotuloTexto="E-mail" valor={c.email} />}
        {c.ip && <Info rotuloTexto="Endereço IP" valor={c.ip} />}
      </div>
      {c.observacao && <div style={{ fontSize: 13.5, marginTop: 10 }}><b>{aprovada ? 'Observação' : 'Motivo'}:</b> {c.observacao}</div>}
      <div style={{ marginTop: 12, fontSize: 12, color: SUAVE, lineHeight: 1.5 }}>
        <b>Declaração:</b> {c.texto_declaracao}
      </div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: SUAVE, wordBreak: 'break-all' }}>
        <b>Código de verificação do conteúdo (SHA-256):</b> {c.hash_conteudo}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }} className="sem-impressao">
        <button style={{ ...btnEscuro, flex: '1 1 180px' }} onClick={() => window.print()}><Printer size={17} /> Imprimir / salvar comprovante</button>
        {pdfDisponivel && <a href={urlPdfAprovacaoPublica(token)} target="_blank" rel="noopener noreferrer" style={{ ...btnClaro, marginTop: 0, flex: '1 1 180px' }}><FileDown size={17} /> PDF da proposta</a>}
      </div>
    </section>
  );
}

function Moldura({ children }) {
  const estiloImpressao = useMemo(() => '@media print { .sem-impressao { display: none !important; } body { background: #fff !important; } }', []);
  return (
    <div style={{ minHeight: '100vh', background: FUNDO, color: TINTA, fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif" }}>
      <style>{estiloImpressao}</style>
      <header style={{ background: '#fff', borderBottom: `3px solid ${OURO}` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="H&M Engenharia e Tecnologia" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: TINTA, lineHeight: 1.15 }}>H&amp;M Engenharia e Tecnologia</div>
            <div style={{ fontSize: 12, color: SUAVE }}>Aprovação de proposta</div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '16px 12px 40px' }}>{children}</main>
    </div>
  );
}

function AvisoJuridico({ texto }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: SUAVE, lineHeight: 1.5, padding: '4px 6px 14px' }}>
      <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{texto || 'Aceite eletrônico simples: não é assinatura digital com certificado ICP-Brasil.'}</span>
    </div>
  );
}

function Contato() {
  return (
    <div style={{ textAlign: 'center', fontSize: 12.5, color: SUAVE, lineHeight: 1.6, marginTop: 18 }}>
      Dúvidas? Fale com a H&amp;M Engenharia e Tecnologia LTDA<br />
      WhatsApp (61) 99185-9745 · hemengetecnologia@gmail.com
    </div>
  );
}

const Info = ({ rotuloTexto, valor }) => (
  <div style={{ minWidth: 0 }}>
    <div style={rotulo}>{rotuloTexto}</div>
    <div style={{ fontSize: 14.5, wordBreak: 'break-word' }}>{valor || '—'}</div>
  </div>
);
const Bloco = ({ titulo: t, children }) => (
  <section style={{ ...cartao, borderLeft: `4px solid ${OURO}` }}>
    <h3 style={titulo}>{t}</h3>
    <div style={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{children}</div>
  </section>
);
const Campo = ({ rotuloTexto, children }) => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <span style={{ ...rotulo, display: 'block', marginBottom: 5 }}>{rotuloTexto}</span>
    {children}
  </label>
);
const LinhaTotal = ({ t, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}>
    <span style={{ color: SUAVE }}>{t}</span><span>{moeda(v)}</span>
  </div>
);

const cartao = { background: '#fff', border: `1px solid ${BORDA}`, borderRadius: 12, padding: '18px 16px', marginBottom: 14, boxShadow: '0 1px 3px rgba(60,50,20,.06)' };
const rotulo = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: SUAVE, fontWeight: 600 };
const titulo = { fontSize: 13, textTransform: 'uppercase', letterSpacing: '.6px', color: OURO_ESCURO, fontWeight: 800, marginBottom: 8 };
const gradeInfo = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px 18px', marginTop: 14 };
const notaDesconto = { fontStyle: 'italic', color: SUAVE, fontSize: 12, padding: '2px 0' };
// 16 px: no iPhone, campo com fonte menor dá zoom automático ao tocar
const entrada = { background: '#fff', color: TINTA, border: `1px solid #cfc7b3`, borderRadius: 8, fontSize: 16, padding: '11px 12px', width: '100%' };
const botaoBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 18px', borderRadius: 10, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', textDecoration: 'none', minHeight: 48 };
const btnOuro = { ...botaoBase, background: OURO, color: '#000', border: `1px solid ${OURO}` };
const btnEscuro = { ...botaoBase, background: TINTA, color: '#fff', border: `1px solid ${TINTA}` };
const btnClaro = { ...botaoBase, background: '#fff', color: TINTA, border: `1px solid #cfc7b3`, width: 'auto', marginTop: 0 };
const caixaErro = { marginTop: 12, padding: '11px 13px', borderRadius: 8, background: '#fdecea', border: '1px solid #f1b8b0', color: '#8a1f12', fontSize: 14, lineHeight: 1.45 };
