import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Wallet, Link2, CheckCircle2 } from 'lucide-react';
import { getNotasAReceber, ligarSugeridasNotas, ligarPixNaNota, darBaixaNota } from '../services/api';
import { formatarMoeda } from '../utils/format';
import { estilos } from './ui/estilos';

// Notas emitidas ainda sem pagamento (services/notasAReceber.js). A nota emitida é o valor a receber; o Pix ligado
// a ela é o que a quitou. O sistema sugere o Pix pelo valor e pelo nome do pagador, mas quem confirma é o
// administrador. Notas de antes do primeiro Pix que o sistema leu ficam separadas ("sem histórico") para não
// parecerem atraso: podem ter sido pagas antes, e a baixa manual registra como.
const COR = { atrasada: '#d69a2d', no_prazo: 'var(--texto-3)', mais90: '#e5534b' };
const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

function Linha({ i, ocupado, onLigar, onBaixa }) {
  const [baixando, setBaixando] = useState(false);
  const [obs, setObs] = useState('');
  const s = i.sugestao;
  const cor = i.dias > 90 ? COR.mais90 : i.atrasada ? COR.atrasada : COR.no_prazo;
  return (
    <div style={{ padding: '8px 4px', borderTop: '1px solid var(--borda)', fontSize: 12.5 }} data-testid="areceber-linha">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} aria-hidden />
        <span style={{ flex: '1 1 220px', minWidth: 0 }}>
          <b>Nota {i.numero}</b> · {i.tomador_nome || 'sem tomador'}
          {i.proposta_numero && <span style={{ color: 'var(--texto-3)' }}> · proposta {i.proposta_numero}</span>}
        </span>
        <b>{formatarMoeda(i.saldo)}</b>
        {i.estado === 'parcial' && <span style={{ color: 'var(--texto-3)' }}>de {formatarMoeda(i.valor_liquido)} (parcial)</span>}
        <span style={{ color: cor, fontWeight: 700 }} title={`Emitida em ${dataBr(i.data_emissao)}`}>
          {i.estado === 'sem_historico' ? `emitida há ${plural(i.dias, 'dia', 'dias')}` : `esperando há ${plural(i.dias, 'dia', 'dias')}`}
        </span>
        {s?.movimento && (
          <button type="button" disabled={ocupado} style={estilos.btnSecundario} onClick={() => onLigar(i.id, s.movimento.id)}
            title={`${s.movimento.nome} — ${formatarMoeda(s.movimento.valor)} em ${dataBr(s.movimento.data)}`}>
            <Link2 size={13} /> Ligar Pix{s.confianca === 'media' ? ' (confira o nome)' : ''}
          </button>
        )}
        <button type="button" disabled={ocupado} style={estilos.btnSecundario} onClick={() => setBaixando(!baixando)}>
          <CheckCircle2 size={13} /> Já recebi
        </button>
      </div>
      {s?.movimento && (
        <div style={{ color: 'var(--texto-3)', margin: '3px 0 0 18px' }} data-testid="areceber-sugestao">
          Pix de {s.movimento.nome} em {dataBr(s.movimento.data)} ({formatarMoeda(s.movimento.valor)})
          {s.confianca === 'media' ? ' — o valor bate, mas o nome é diferente' : ''}
        </div>
      )}
      {s && !s.movimento && (
        <div style={{ color: 'var(--texto-3)', margin: '3px 0 0 18px' }}>
          Há Pix com esse valor, mas serve a mais de uma combinação (outro Pix ou outra nota igual). Ligue pelo menu da nota, em Financeiro, escolhendo o Pix certo.
        </div>
      )}
      {baixando && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 2px 18px' }}>
          <input maxLength={300} value={obs} onChange={e => setObs(e.target.value)} style={{ flex: '1 1 260px' }}
            placeholder="Como foi paga? (ex.: TED em 10/2025)" aria-label="Como foi paga" />
          <button type="button" disabled={ocupado || obs.trim().length < 3} style={estilos.btnPrimario}
            onClick={async () => { await onBaixa(i.id, obs); setBaixando(false); setObs(''); }}>Dar baixa</button>
        </div>
      )}
    </div>
  );
}

export default function NotasAReceber() {
  const [dados, setDados] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [antigas, setAntigas] = useState(false);

  const carregar = useCallback(async () => {
    try { setDados((await getNotasAReceber()).data); } catch { setDados(null); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const agir = async (acao, ok) => {
    setOcupado(true);
    try { const r = await acao(); setDados(r.data); toast.success(typeof ok === 'function' ? ok(r.data) : ok); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível concluir.'); }
    finally { setOcupado(false); }
  };
  const ligar = (nota, mov) => agir(() => ligarPixNaNota(nota, mov), 'Pix ligado à nota.');
  const baixa = (nota, obs) => agir(() => darBaixaNota(nota, obs), 'Baixa registrada.');
  const ligarTodas = () => agir(() => ligarSugeridasNotas(), (d) => `${plural(d.ligadas, 'Pix ligado', 'Pix ligados')}.`);

  if (!dados || dados.itens.length === 0) return null;
  const { resumo } = dados;
  const abertas = dados.itens.filter(i => i.estado !== 'sem_historico');
  const semHistorico = dados.itens.filter(i => i.estado === 'sem_historico');

  return (
    <div style={{ ...estilos.card, marginBottom: 18 }} data-testid="notas-a-receber">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <Wallet size={16} color="#c9a227" />
        <h3 style={{ fontSize: 13, color: '#c9a227', fontWeight: 700, margin: 0 }}>Notas a receber</h3>
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }} data-testid="areceber-resumo">
          {plural(resumo.em_aberto, 'nota', 'notas')} · {formatarMoeda(resumo.saldo_total)}
          {resumo.atrasadas > 0 && <b style={{ color: COR.atrasada }}> · {plural(resumo.atrasadas, 'passou', 'passaram')} de {dados.prazo_dias} dias ({formatarMoeda(resumo.saldo_atrasado)})</b>}
        </span>
        <span style={{ flex: 1 }} />
        {resumo.sugestoes_altas > 0 && (
          <button type="button" disabled={ocupado} style={estilos.btnPrimario} onClick={ligarTodas}
            title="Liga só os Pix com valor igual, nome do pagador parecido e que não servem a outra nota">
            <Link2 size={13} /> Ligar {plural(resumo.sugestoes_altas, 'sugerido', 'sugeridos')}
          </button>
        )}
        {semHistorico.length > 0 && (
          <button type="button" style={estilos.btnSecundario} onClick={() => setAntigas(!antigas)}
            title="Emitidas antes do primeiro Pix que o sistema leu: podem ter sido pagas antes">
            {plural(semHistorico.length, 'nota antiga', 'notas antigas')} sem como conferir
          </button>
        )}
      </div>
      {abertas.length === 0 && <p style={{ fontSize: 12, color: 'var(--texto-3)', margin: '6px 0 0' }}>Nenhuma nota recente em aberto.</p>}
      {abertas.map(i => <Linha key={i.id} i={i} ocupado={ocupado} onLigar={ligar} onBaixa={baixa} />)}
      {antigas && (
        <>
          <p style={{ fontSize: 11.5, color: 'var(--texto-3)', margin: '10px 0 2px' }}>
            Estas notas são de antes do primeiro Pix registrado no sistema, então não há como saber se foram pagas. Se foram, use "Já recebi" e diga como, para saírem da lista.
          </p>
          {semHistorico.map(i => <Linha key={i.id} i={i} ocupado={ocupado} onLigar={ligar} onBaixa={baixa} />)}
        </>
      )}
    </div>
  );
}
