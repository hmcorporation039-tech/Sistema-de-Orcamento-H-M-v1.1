import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import { getPixSemObra, atribuirPixObra } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { moeda, estilos as E } from './comum';
import { dataBr } from '../../utils/format';

// A margem de cada obra só conta os Pix LIGADOS a ela. Este aviso (só administrador) mostra quanto ainda
// está solto e abre a lista por nome do pagador/favorecido: escolha a obra (já vem a sugerida, quando o
// sinal é seguro), o período se precisar, e "lembrar" para os próximos Pix desse nome (services/atribuicaoObras.js).

// Quanto confiar na sugestão (services/atribuicaoObras.js): 'alta' vem da nota fiscal ligada ao Pix (nota →
// proposta → obra); 'media' vem do cadastro (contrato do prestador ou cliente da obra) e pede conferência.
const CONFIANCA = {
  alta: { rotulo: 'confiança alta', cor: '#3fb95f', fundo: '#0a1a0f', borda: '#1a4a26', dica: 'O Pix está ligado a uma nota fiscal cuja proposta é desta obra.' },
  media: { rotulo: 'confira', cor: '#c9a227', fundo: '#1a1a0a', borda: '#4a3d10', dica: 'Sugestão pelo cadastro (contrato do prestador ou cliente da obra): confira antes de ligar.' },
};

function SeloConfianca({ confianca }) {
  const c = CONFIANCA[confianca];
  if (!c) return null;
  return (
    <span title={c.dica} data-testid={`confianca-${confianca}`} style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, marginRight: 6,
      whiteSpace: 'nowrap', color: c.cor, background: c.fundo, border: `1px solid ${c.borda}` }}>{c.rotulo}</span>
  );
}

function Linha({ grupo, obras, ocupado, onAtribuir }) {
  const sug = grupo.sugestao;
  const [obraId, setObraId] = useState(sug?.obra_id ? String(sug.obra_id) : '');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [periodo, setPeriodo] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--borda)', padding: '10px 0', fontSize: 12.5 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <b style={{ flex: '1 1 220px', minWidth: 0 }}>{grupo.nome}</b>
        <span style={{ color: 'var(--texto-3)' }}>{grupo.n} lançamento{grupo.n > 1 ? 's' : ''} · {dataBr(grupo.de)}{grupo.ate !== grupo.de ? ` a ${dataBr(grupo.ate)}` : ''}</span>
        <b style={{ color: grupo.tipo === 'recebido' ? '#3fb95f' : '#e08080' }}>{moeda(grupo.total)}</b>
      </div>
      {sug && <div style={{ color: sug.obra_id && sug.confianca === 'alta' ? 'var(--texto-2)' : 'var(--texto-3)', fontSize: 11.5, margin: '3px 0' }}>
        {sug.obra_id && <SeloConfianca confianca={sug.confianca} />}
        {sug.obra_id ? `Sugestão: ${sug.obra?.codigo} — ${sug.motivo}.` : `${sug.motivo}: ${(sug.candidatas || []).map(c => c.codigo).join(', ')}. Escolha a obra (ou use o período).`}
      </div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
        <select value={obraId} onChange={e => setObraId(e.target.value)} style={{ minWidth: 220, flex: '1 1 220px' }} aria-label={`Obra de ${grupo.nome}`}>
          <option value="">Escolha a obra…</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
        </select>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--texto-2)' }}>
          <input type="checkbox" checked={periodo} onChange={e => setPeriodo(e.target.checked)} /> só um período
        </label>
        {periodo && <>
          <input type="date" value={de} onChange={e => setDe(e.target.value)} aria-label="De" />
          <input type="date" value={ate} onChange={e => setAte(e.target.value)} aria-label="Até" />
        </>}
        <label style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--texto-2)' }} title="Os próximos Pix desse nome entram ligados a esta obra">
          <input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)} /> lembrar
        </label>
        <button type="button" disabled={ocupado || !obraId} style={E.btnPrimario}
          onClick={() => onAtribuir({ tipo: grupo.tipo, chave: grupo.chave, obra_id: Number(obraId), lembrar, ...(periodo ? { de: de || null, ate: ate || null } : {}) })}>Ligar</button>
        <button type="button" disabled={ocupado} style={E.btnSecundario} title="Despesa ou receita da empresa que não é de obra nenhuma: sai desta lista"
          onClick={() => { if (window.confirm(`Marcar "${grupo.nome}" como geral (não é de obra)? Os próximos também.`)) onAtribuir({ tipo: grupo.tipo, chave: grupo.chave, geral: true }); }}>Não é de obra</button>
      </div>
    </div>
  );
}

export default function PixSemObra({ aoMudar }) {
  const [dados, setDados] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState('recebido');

  const carregar = useCallback(async () => {
    try { setDados((await getPixSemObra()).data); } catch { setDados(null); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const atribuir = async (corpo) => {
    setOcupado(true);
    try {
      const r = (await atribuirPixObra(corpo)).data;
      setDados(r);
      toast.success(corpo.geral ? 'Marcado como geral.' : `${r.mudou} lançamento${r.mudou === 1 ? '' : 's'} ligado${r.mudou === 1 ? '' : 's'} à obra.`);
      if (aoMudar) aoMudar();
    } catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível ligar.'); }
    finally { setOcupado(false); }
  };

  if (!dados) return null;
  const { recebido, realizado } = dados.resumo;
  if (recebido.n + realizado.n === 0) return null;
  const grupos = dados.grupos.filter(g => g.tipo === aba);

  return (
    <>
      <div style={{ ...E.card, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderColor: '#c9a22788' }} data-testid="pix-sem-obra">
        <Link2 size={16} color="#c9a227" />
        <span style={{ flex: '1 1 300px', fontSize: 13 }}>
          <b>A margem das obras está incompleta:</b> {moeda(recebido.valor)} recebidos ({recebido.n}) e {moeda(realizado.valor)} pagos ({realizado.n}) do financeiro ainda não estão ligados a nenhuma obra.
        </span>
        <button type="button" style={E.btnPrimario} onClick={() => setAberto(true)}>Ligar às obras</button>
      </div>
      {aberto && (
        <Modal titulo="Pix sem obra" onFechar={() => setAberto(false)} largura={860}>
          <p style={{ fontSize: 12.5, color: 'var(--texto-2)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Os lançamentos estão agrupados pelo nome. Escolha a obra e clique em Ligar; "lembrar" faz os próximos Pix desse nome já entrarem ligados.
            Se o mesmo nome tem mais de uma obra, ligue por período ou ajuste um a um no Financeiro.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            {[['recebido', `Recebidos (${recebido.n})`], ['realizado', `Pagos (${realizado.n})`]].map(([k, r]) => (
              <button key={k} type="button" onClick={() => setAba(k)} style={aba === k ? E.btnPrimario : E.btnSecundario}>{r}</button>
            ))}
          </div>
          {grupos.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--texto-3)' }}>Nada pendente nesta aba.</p>}
          {grupos.map(g => <Linha key={`${g.tipo}|${g.chave}`} grupo={g} obras={dados.obras} ocupado={ocupado} onAtribuir={atribuir} />)}
        </Modal>
      )}
    </>
  );
}
