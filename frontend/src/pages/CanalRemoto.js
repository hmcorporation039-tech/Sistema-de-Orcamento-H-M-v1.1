import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Send, MessageCircle, Smartphone, Mic, ShieldCheck, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { estilos } from '../components/ui/estilos';
import { dataHoraBr } from '../utils/format';

// Canal remoto (Fase 6): falar com o sistema pelo Telegram ou WhatsApp. Só o administrador vê.
// Mostra se cada canal está ligado e configurado (sem segredos), as últimas mensagens da fila, as
// ações pendentes pedidas pelo canal e um SIMULADOR que manda a mensagem pelo mesmo fluxo, sem
// provedor — para experimentar antes de ligar. Pendurado em /cadastros?aba=canal.

const ESTADOS = {
  recebida: { rotulo: 'Na fila', cor: '#6fa8dc' },
  processando: { rotulo: 'Processando', cor: '#6fa8dc' },
  respondida: { rotulo: 'Respondida', cor: '#3fb95f' },
  ignorada: { rotulo: 'Ignorada', cor: '#999' },
  erro: { rotulo: 'Erro', cor: '#e08080' },
};
const STATUS_ACAO = {
  pendente: { rotulo: 'Esperando "SIM"', cor: '#d9a53a' },
  aplicada: { rotulo: 'Executada', cor: '#3fb95f' },
  descartada: { rotulo: 'Cancelada', cor: '#999' },
  falhou: { rotulo: 'Falhou', cor: '#e08080' },
};
const CANAL = { telegram: 'Telegram', whatsapp: 'WhatsApp', simulador: 'Simulador' };
const VIA = { interpretador: 'comando', assistente: 'assistente', acao: 'confirmação', vinculo: 'vínculo', voz: 'voz', outro: '—', ignorada: '—' };
const corta = (t, n = 140) => { const s = String(t || ''); return s.length > n ? `${s.slice(0, n)}…` : s; };

function Selo({ cor, children }) {
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, color: cor, border: `1px solid ${cor}55`, whiteSpace: 'nowrap' }}>{children}</span>;
}

function CartaoCanal({ titulo, Icone, ativo, configurado, faltando, extra }) {
  const ok = ativo && configurado;
  return (
    <div style={{ ...estilos.card, marginBottom: 0, flex: '1 1 220px', minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icone size={16} color="var(--ouro-claro)" />
        <strong style={{ fontSize: 14 }}>{titulo}</strong>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {ativo !== undefined && <Selo cor={ativo ? '#3fb95f' : '#999'}>{ativo ? 'Ligado' : 'Desligado'}</Selo>}
        <Selo cor={configurado ? '#3fb95f' : '#d9a53a'}>{configurado ? 'Configurado' : 'Não configurado'}</Selo>
      </div>
      {!!faltando?.length && <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>Falta no .env: {faltando.join(', ')}</div>}
      {extra && <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>{extra}</div>}
      {ativo && !ok && <div style={{ fontSize: 12, color: '#e08080', marginTop: 4 }}>Ligado sem configuração: o webhook recusa tudo.</div>}
    </div>
  );
}

export default function CanalRemoto() {
  const [estado, setEstado] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [acoes, setAcoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [semVinculo, setSemVinculo] = useState(false);
  const [conversa, setConversa] = useState([]); // [{ id, texto, resposta, estado }]
  const [enviando, setEnviando] = useState(false);
  const montado = useRef(true);

  const carregar = useCallback(async () => {
    try {
      const [e, m, a] = await Promise.all([api.get('/canal/estado'), api.get('/canal/mensagens?limite=30'), api.get('/canal/acoes')]);
      if (!montado.current) return;
      setEstado(e.data); setMensagens(m.data); setAcoes(a.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível carregar o canal.');
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, []);

  useEffect(() => { montado.current = true; carregar(); return () => { montado.current = false; }; }, [carregar]);

  async function esperarResposta(id) {
    for (let i = 0; i < 240 && montado.current; i++) {
      const { data } = await api.get(`/canal/mensagens/${id}`);
      if (['respondida', 'erro', 'ignorada'].includes(data.estado)) return data;
      await new Promise(r => setTimeout(r, i < 20 ? 500 : 2000));
    }
    return null;
  }

  async function simular(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      const { data } = await api.post('/canal/simular', { texto: t, sem_vinculo: semVinculo });
      setConversa(c => [...c, { id: data.id, texto: t, resposta: null, estado: 'recebida', semVinculo }]);
      setTexto('');
      const final = await esperarResposta(data.id);
      if (!montado.current) return;
      setConversa(c => c.map(x => (x.id === data.id ? { ...x, resposta: final?.resposta || (final ? `(${ESTADOS[final.estado]?.rotulo || final.estado})` : '(sem resposta ainda — veja a fila abaixo)'), estado: final?.estado || 'processando' } : x)));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível enviar a mensagem de teste.');
    } finally {
      if (montado.current) setEnviando(false);
    }
  }

  if (carregando) return <div style={{ padding: 24, color: 'var(--texto-3)' }}><Loader2 size={16} className="girando" /> Carregando…</div>;

  return (
    <div>
      <p style={estilos.ajuda}>
        Falar com o sistema pelo celular. Os dois canais ficam <strong>desligados</strong> até o administrador ligar no .env
        (CANAL_TELEGRAM_ATIVO / CANAL_WHATSAPP_ATIVO). Só responde a quem ligou o chat em <em>Minha conta</em> com o código de uso único;
        o que é irreversível pede "SIM" com código e prazo de {estado?.acaoPrazoMin || 10} min.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <CartaoCanal titulo="Telegram" Icone={MessageCircle} {...estado.telegram} />
        <CartaoCanal titulo="WhatsApp" Icone={Smartphone} {...estado.whatsapp} />
        <CartaoCanal titulo="Voz (whisper.cpp local)" Icone={Mic} configurado={estado.voz.disponivel} faltando={estado.voz.faltando}
          extra={estado.voz.disponivel ? 'Áudio vira texto neste PC.' : 'Sem voz: o canal responde que ainda não está ativada.'} />
        <CartaoCanal titulo="Vínculo e auditoria" Icone={ShieldCheck} configurado={estado.seguranca}
          extra={`Fila: ${estado.fila.recebidas} na fila, ${estado.fila.processando} processando, ${estado.fila.ultimas_24h} nas últimas 24 h${estado.fila.erros_7d ? `, ${estado.fila.erros_7d} erro(s) em 7 dias` : ''}.`} />
      </div>

      <div style={estilos.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Simulador</strong>
          <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>mesmo fluxo do Telegram/WhatsApp, sem provedor, como você ({'"'}ajuda{'"'} lista os comandos)</span>
        </div>
        <p style={{ ...estilos.ajuda, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <AlertTriangle size={14} color="#d9a53a" style={{ flexShrink: 0, marginTop: 3 }} />
          O que você confirmar aqui com "SIM &lt;código&gt;" é executado de verdade (por exemplo, o e-mail sai para o cliente).
        </p>
        <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {!conversa.length && <div style={{ color: 'var(--texto-3)', fontSize: 13 }}>Experimente: "ajuda", "vencimentos", "custos &lt;obra&gt; este mês", "proposta 254".</div>}
          {conversa.map(c => (
            <div key={c.id}>
              <div style={{ alignSelf: 'flex-end', marginLeft: 'auto', maxWidth: '80%', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '7px 11px', fontSize: 13, whiteSpace: 'pre-wrap', width: 'fit-content' }}>
                {c.texto}{c.semVinculo ? <span style={{ color: 'var(--texto-3)', fontSize: 11 }}> (sem vínculo)</span> : null}
              </div>
              <div style={{ maxWidth: '85%', marginTop: 6, background: 'var(--superficie)', border: '1px solid var(--borda-forte)', borderRadius: 10, padding: '7px 11px', fontSize: 13, whiteSpace: 'pre-wrap', width: 'fit-content' }}>
                {c.resposta ?? <span style={{ color: 'var(--texto-3)' }}><Loader2 size={12} /> processando…</span>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={simular} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={4000} placeholder="Escreva como no celular…" aria-label="Mensagem de teste"
            style={{ flex: '1 1 260px', padding: '9px 12px', background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)', borderRadius: 8, color: 'var(--texto)', fontSize: 13 }} />
          <label style={{ fontSize: 12, color: 'var(--texto-2)', display: 'flex', gap: 5, alignItems: 'center' }}>
            <input type="checkbox" checked={semVinculo} onChange={e => setSemVinculo(e.target.checked)} /> como quem não tem vínculo
          </label>
          <button type="submit" style={estilos.btnPrimario} disabled={enviando || !texto.trim()}>
            {enviando ? <Loader2 size={14} /> : <Send size={14} />} Enviar
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
        <strong>Ações pedidas pelo canal</strong>
        <button type="button" style={estilos.btnSecundario} onClick={carregar}><RefreshCw size={14} /> Atualizar</button>
      </div>
      <div style={{ ...estilos.caixaTabela, marginBottom: 16 }}>
        <table style={estilos.tabela}>
          <thead><tr><th style={estilos.th}>Quando</th><th style={estilos.th}>Quem</th><th style={estilos.th}>Ação</th><th style={estilos.th}>Situação</th></tr></thead>
          <tbody>
            {!acoes.length && <tr><td colSpan={4} style={estilos.tdVazio}>Nenhuma ação pedida pelo canal.</td></tr>}
            {acoes.map(a => {
              const s = a.expirada ? { rotulo: 'Prazo esgotado', cor: '#999' } : (STATUS_ACAO[a.status] || { rotulo: a.status, cor: '#999' });
              return (
                <tr key={a.id} style={estilos.linhaTabela}>
                  <td style={estilos.td}>{dataHoraBr(a.criado_em)}</td>
                  <td style={estilos.td}>{a.usuario_nome || '—'}<div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{CANAL[a.canal] || a.canal} {a.canal_id_externo}</div></td>
                  <td style={{ ...estilos.td, whiteSpace: 'pre-wrap', maxWidth: 520 }}>{corta(a.descricao, 300)}</td>
                  <td style={estilos.td}>
                    <Selo cor={s.cor}>{s.rotulo}</Selo>
                    {a.status === 'pendente' && !a.expirada && a.expira_em && <div style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 3 }}>até {dataHoraBr(a.expira_em)}</div>}
                    {a.resultado?.erro && <div style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 3 }}>{corta(a.resultado.erro, 160)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <strong style={{ display: 'block', margin: '4px 0 8px' }}>Últimas mensagens</strong>
      <div style={estilos.caixaTabela}>
        <table style={estilos.tabela}>
          <thead><tr><th style={estilos.th}>Recebida</th><th style={estilos.th}>De</th><th style={estilos.th}>Mensagem</th><th style={estilos.th}>Resposta</th><th style={estilos.th}>Situação</th></tr></thead>
          <tbody>
            {!mensagens.length && <tr><td colSpan={5} style={estilos.tdVazio}>Nenhuma mensagem ainda.</td></tr>}
            {mensagens.map(m => {
              const s = ESTADOS[m.estado] || { rotulo: m.estado, cor: '#999' };
              return (
                <tr key={m.id} style={estilos.linhaTabela}>
                  <td style={estilos.td}>{dataHoraBr(m.recebida_em)}</td>
                  <td style={estilos.td}>{m.usuario_nome || m.nome_remetente || 'sem vínculo'}<div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{CANAL[m.canal] || m.canal} {m.canal === 'simulador' ? '' : m.remetente}</div></td>
                  <td style={{ ...estilos.td, maxWidth: 280 }}>{m.tipo === 'audio' ? '(áudio)' : corta(m.texto)}</td>
                  <td style={{ ...estilos.td, maxWidth: 360, whiteSpace: 'pre-wrap' }}>{corta(m.resposta, 220) || '—'}</td>
                  <td style={estilos.td}>
                    <Selo cor={s.cor}>{m.estado === 'respondida' ? <CheckCircle2 size={11} /> : m.estado === 'erro' ? <XCircle size={11} /> : null} {s.rotulo}</Selo>
                    <div style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 3 }}>
                      {VIA[m.via] || m.via || ''}{m.canal !== 'simulador' && m.estado === 'respondida' && !m.enviada ? ' · não saiu (sem token: só no log)' : ''}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
