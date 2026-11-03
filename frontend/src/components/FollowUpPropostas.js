import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PhoneCall, Clock, XCircle } from 'lucide-react';
import { getFollowUpPropostas, registrarFollowUp, registrarEnvioProposta, atualizarStatus } from '../services/api';
import { estilos } from './ui/estilos';
import { dataBr } from '../utils/format';

// Propostas enviadas por e-mail e ainda sem resposta (services/followUpPropostas.js): quem precisa de um
// contato hoje. "Fiz contato" recomeça a contagem; "Adiar" escolhe a data; depois de 3 contatos sem resposta
// o sistema sugere encerrar. Os prazos (5 dias, depois 10) são sugestão da casa.
const COR = { encerrar: '#e5534b', atrasado: '#d69a2d', hoje: '#c9a227', aguardando: 'var(--texto-3)' };
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const amanhaMais = (dias) => {
  const d = new Date(); d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

function rotulo(i) {
  if (i.nivel === 'encerrar') return `${plural(i.contatos, 'contato', 'contatos')} sem resposta — encerrar?`;
  if (i.nivel === 'atrasado') return `contato atrasado há ${plural(i.dias_de_atraso, 'dia', 'dias')}`;
  if (i.nivel === 'hoje') return 'contato hoje';
  return `próximo contato em ${dataBr(i.proximo_contato)}`;
}

function Linha({ i, ocupado, onRegistrar, onEncerrar }) {
  const [aberto, setAberto] = useState(null);   // 'contato' | 'adiar' | null
  const [nota, setNota] = useState('');
  const [ate, setAte] = useState(amanhaMais(7));
  const enviar = async () => {
    await onRegistrar(i.id, aberto === 'contato' ? { tipo: 'contato', nota } : { tipo: 'adiado', nota, proximo_em: ate });
    setAberto(null); setNota('');
  };
  return (
    <div style={{ padding: '8px 4px', borderTop: '1px solid var(--borda)', fontSize: 12.5 }} data-testid="followup-linha">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COR[i.nivel], flexShrink: 0 }} aria-hidden />
        <span style={{ flex: '1 1 220px', minWidth: 0 }}>
          <b>{i.numero}</b> · {i.cliente_nome}
          {i.responsavel && <span style={{ color: 'var(--texto-3)' }}> · {i.responsavel}</span>}
        </span>
        <b>{moeda(i.total)}</b>
        <span style={{ color: COR[i.nivel], fontWeight: 700 }}>{rotulo(i)}</span>
        <span style={{ color: 'var(--texto-3)' }} title="Dias desde o último e-mail">enviada há {plural(i.dias_desde_envio, 'dia', 'dias')}</span>
        {i.validade_vencida && <span style={{ color: '#e5534b' }} title="A validade da proposta já acabou">validade vencida</span>}
        <button type="button" disabled={ocupado} style={estilos.btnSecundario} onClick={() => setAberto(aberto === 'contato' ? null : 'contato')}><PhoneCall size={13} /> Fiz contato</button>
        <button type="button" disabled={ocupado} style={estilos.btnSecundario} onClick={() => setAberto(aberto === 'adiar' ? null : 'adiar')}><Clock size={13} /> Adiar</button>
        {i.nivel === 'encerrar' && (
          <button type="button" disabled={ocupado} style={estilos.btnSecundario} title="Marca a proposta como Cancelada"
            onClick={() => { if (window.confirm(`Encerrar a proposta ${i.numero} (marcar como Cancelada)?`)) onEncerrar(i); }}><XCircle size={13} /> Encerrar</button>
        )}
      </div>
      {i.ultima_nota && <div style={{ color: 'var(--texto-3)', margin: '3px 0 0 18px' }}>Último contato: {i.ultima_nota}</div>}
      {aberto && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 2px 18px' }}>
          {aberto === 'adiar' && <input type="date" value={ate} min={amanhaMais(1)} onChange={e => setAte(e.target.value)} aria-label="Adiar até" />}
          <input maxLength={500} value={nota} onChange={e => setNota(e.target.value)} style={{ flex: '1 1 240px' }}
            placeholder={aberto === 'contato' ? 'O que o cliente disse? (opcional)' : 'Motivo (opcional)'} aria-label="Anotação" />
          <button type="button" disabled={ocupado || (aberto === 'adiar' && !ate)} style={estilos.btnPrimario} onClick={enviar}>{aberto === 'contato' ? 'Registrar contato' : 'Adiar'}</button>
        </div>
      )}
    </div>
  );
}

// Proposta Ativa que o sistema não viu sair: a pessoa diz quando mandou (WhatsApp, e-mail comum, em mãos).
function LinhaSemEnvio({ p, ocupado, onEnviei }) {
  const [dia, setDia] = useState(amanhaMais(0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 4px', borderTop: '1px solid var(--borda)', fontSize: 12.5 }} data-testid="followup-sem-envio">
      <span style={{ flex: '1 1 220px', minWidth: 0 }}><b>{p.numero}</b> · {p.cliente_nome}</span>
      <b>{moeda(p.total)}</b>
      <span style={{ color: 'var(--texto-3)' }}>proposta de {dataBr(p.data)}</span>
      <input type="date" value={dia} min={p.data} max={amanhaMais(0)} onChange={e => setDia(e.target.value)} aria-label={`Enviada em (${p.numero})`} />
      <button type="button" disabled={ocupado || !dia} style={estilos.btnSecundario} onClick={() => onEnviei(p.id, { data: dia })}>Já enviei</button>
    </div>
  );
}

export default function FollowUpPropostas() {
  const [dados, setDados] = useState(null);
  const [todos, setTodos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [semEnvio, setSemEnvio] = useState(false);

  const carregar = useCallback(async () => {
    try { setDados((await getFollowUpPropostas()).data); } catch { setDados(null); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const registrar = async (id, corpo) => {
    setOcupado(true);
    try { setDados((await registrarFollowUp(id, corpo)).data); toast.success(corpo.tipo === 'contato' ? 'Contato registrado.' : 'Adiado.'); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível registrar.'); }
    finally { setOcupado(false); }
  };
  const registrarEnvio = async (id, corpo) => {
    setOcupado(true);
    try { setDados((await registrarEnvioProposta(id, corpo)).data); toast.success('Envio registrado: a proposta entrou no acompanhamento.'); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível registrar.'); }
    finally { setOcupado(false); }
  };
  const encerrar = async (i) => {
    setOcupado(true);
    try { await atualizarStatus(i.id, 'Cancelada'); await carregar(); toast.success(`Proposta ${i.numero} encerrada.`); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível encerrar.'); }
    finally { setOcupado(false); }
  };

  if (!dados || (dados.itens.length === 0 && !dados.sem_envio?.length)) return null;
  const { resumo, itens } = dados;
  const naoEnviadas = dados.sem_envio || [];
  const urgentes = itens.filter(i => i.nivel !== 'aguardando');
  const mostrados = todos ? itens : urgentes.concat(itens.filter(i => i.nivel === 'aguardando').slice(0, 3));
  const resp = resumo.resposta_aprovada;

  return (
    <div style={{ ...estilos.card, marginBottom: 18 }} data-testid="followup-propostas">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <PhoneCall size={16} color="#c9a227" />
        <h3 style={{ fontSize: 13, color: '#c9a227', fontWeight: 700, margin: 0 }}>Propostas sem resposta</h3>
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
          {plural(resumo.aguardando, 'enviada', 'enviadas')} · {moeda(resumo.valor_aguardando)}
          {resumo.atrasados > 0 && <b style={{ color: COR.atrasado }}> · {plural(resumo.atrasados, 'atrasada', 'atrasadas')} ({moeda(resumo.valor_atrasado)})</b>}
          {resumo.para_hoje > 0 && <b style={{ color: COR.hoje }}> · {resumo.para_hoje} para hoje</b>}
        </span>
        <span style={{ flex: 1 }} />
        {naoEnviadas.length > 0 && (
          <button type="button" style={estilos.btnSecundario} onClick={() => setSemEnvio(!semEnvio)} title="Propostas Ativas que o sistema não viu sair por e-mail">
            {plural(resumo.sem_envio ?? naoEnviadas.length, 'ativa sem envio registrado', 'ativas sem envio registrado')}
          </button>
        )}
        {itens.length > mostrados.length && <button type="button" style={estilos.btnSecundario} onClick={() => setTodos(true)}>Ver todas ({itens.length})</button>}
      </div>
      {resp && resp.mediana != null && (
        <p style={{ fontSize: 11.5, color: 'var(--texto-3)', margin: '0 0 6px' }} data-testid="followup-mediana">
          As propostas aprovadas costumam responder em cerca de {plural(resp.mediana, 'dia', 'dias')} (de {resp.n} aprovadas).
        </p>
      )}
      {semEnvio && naoEnviadas.map(p => <LinhaSemEnvio key={p.id} p={p} ocupado={ocupado} onEnviei={registrarEnvio} />)}
      {itens.length === 0 && <p style={{ fontSize: 12, color: 'var(--texto-3)', margin: '6px 0 0' }}>Nenhuma proposta em acompanhamento ainda. Para as que você já mandou por fora, use "ativas sem envio registrado" e diga quando foram enviadas.</p>}
      {mostrados.map(i => <Linha key={i.id} i={i} ocupado={ocupado} onRegistrar={registrar} onEncerrar={encerrar} />)}
    </div>
  );
}
