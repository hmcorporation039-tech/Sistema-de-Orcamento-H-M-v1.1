import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Plus, RefreshCw, X } from 'lucide-react';
import { getVencimentos, criarVencimento, renovarVencimento, encerrarVencimento } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { estilos } from './ui/estilos';

// Laudos entregues e documentos da empresa, e quando precisam ser renovados (services/vencimentos.js). Os laudos
// feitos no sistema entram sozinhos; os antigos são cadastrados aqui, com validade editável. Os documentos da
// empresa (certidões, alvará, CREA, seguro) são só do administrador e se cadastram pela data escrita neles; o
// certificado digital A1 entra sozinho, com a data lida do arquivo.
const DISCIPLINAS = [
  ['spda', 'SPDA'], ['incendio', 'Incêndio'], ['eletrica', 'Elétrica'], ['cftv', 'CFTV'],
  ['cabeamento', 'Cabeamento'], ['outro', 'Outro'],
];
const DOCUMENTOS = ['Certidão negativa federal', 'Certidão negativa estadual', 'Certidão negativa municipal', 'Certidão FGTS (CRF)',
  'Certidão trabalhista (CNDT)', 'Alvará de funcionamento', 'Anuidade do CREA', 'Seguro de responsabilidade civil'];
const COR = { vencido: '#e5534b', urgente: '#d69a2d', atencao: '#c9a227', ok: 'var(--texto-3)' };
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dataBr = (iso) => iso.split('-').reverse().join('/');
const FORM_VAZIO = () => ({ tipo: 'laudo', disciplina: 'spda', descricao: '', cliente_nome: '', emitido_em: hojeIso(), validade_meses: 12 });
const FORM_DOCUMENTO = () => ({ tipo: 'empresa', descricao: '', vence_em: '' });

export default function VencimentosLaudos() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null);   // null = fechado
  const [salvando, setSalvando] = useState(false);
  const [todos, setTodos] = useState(false);
  const [renovando, setRenovando] = useState(null);   // { id, vence_em } enquanto o documento pede a data nova

  const carregar = useCallback(async () => {
    try { setDados((await getVencimentos()).data); setErro(''); }
    catch { setErro('Não foi possível carregar os vencimentos.'); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const agir = async (fn, ok) => {
    try { setDados((await fn()).data); toast.success(ok); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível concluir.'); }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const corpo = form.tipo === 'empresa' ? form : { ...form, validade_meses: Number(form.validade_meses) };
      setDados((await criarVencimento(corpo)).data);
      setForm(null);
      toast.success(form.tipo === 'empresa' ? 'Documento cadastrado.' : 'Laudo cadastrado.');
    } catch (err) { toast.error(err.response?.data?.erro || 'Não foi possível cadastrar.'); }
    finally { setSalvando(false); }
  };

  const itens = dados?.itens || [];
  const mostrados = todos ? itens : itens.filter(i => i.nivel !== 'ok').concat(itens.filter(i => i.nivel === 'ok').slice(0, 3));
  const r = dados?.resumo;

  return (
    <div style={{ ...estilos.card, marginBottom: 18 }} data-testid="vencimentos-laudos">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <CalendarClock size={16} color="#c9a227" />
        <h3 style={{ fontSize: 13, color: '#c9a227', fontWeight: 700, margin: 0 }}>{ehAdmin ? 'Vencimentos' : 'Laudos a vencer'}</h3>
        {r && r.total > 0 && (
          <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
            {r.vencidos > 0 && <b style={{ color: COR.vencido }}>{r.vencidos} vencido{r.vencidos > 1 ? 's' : ''} </b>}
            {r.urgentes > 0 && <b style={{ color: COR.urgente }}>{r.urgentes} em até 30 dias </b>}
            {r.atencao > 0 && <b style={{ color: COR.atencao }}>{r.atencao} em até 60 dias</b>}
            {r.vencidos + r.urgentes + r.atencao === 0 && `${r.total} em dia`}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {itens.length > mostrados.length && <button type="button" style={estilos.btnSecundario} onClick={() => setTodos(true)}>Ver todos ({itens.length})</button>}
        <button type="button" style={estilos.btnSecundario} onClick={() => setForm(FORM_VAZIO())}><Plus size={14} /> Cadastrar laudo</button>
        {ehAdmin && <button type="button" style={estilos.btnSecundario} onClick={() => setForm(FORM_DOCUMENTO())}><Plus size={14} /> Documento da empresa</button>}
      </div>

      {erro && <p style={{ fontSize: 12, color: COR.vencido, margin: 0 }}>{erro}</p>}

      {form?.tipo === 'empresa' && (
        <form onSubmit={salvar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14, padding: 12, border: '1px solid var(--borda)', borderRadius: 8 }}>
          <label style={{ gridColumn: 'span 2' }}><span style={estilos.rotulo}>Documento</span>
            <input required maxLength={200} list="documentos-empresa" placeholder="Ex.: Certidão negativa federal" value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })} style={{ width: '100%' }} />
            <datalist id="documentos-empresa">{DOCUMENTOS.map(d => <option key={d} value={d} />)}</datalist></label>
          <label><span style={estilos.rotulo}>Vence em</span>
            <input required type="date" aria-label="Vence em" value={form.vence_em} onChange={e => setForm({ ...form, vence_em: e.target.value })} style={{ width: '100%' }}
              title="A data de validade que está escrita no documento." /></label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button type="submit" disabled={salvando} style={estilos.btnPrimario}>{salvando ? 'Salvando…' : 'Cadastrar'}</button>
            <button type="button" style={estilos.btnSecundario} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {form?.tipo === 'laudo' && (
        <form onSubmit={salvar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14, padding: 12, border: '1px solid var(--borda)', borderRadius: 8 }}>
          <label><span style={estilos.rotulo}>Disciplina</span>
            <select value={form.disciplina} onChange={e => setForm({ ...form, disciplina: e.target.value })} style={{ width: '100%' }}>
              {DISCIPLINAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select></label>
          <label style={{ gridColumn: 'span 2' }}><span style={estilos.rotulo}>Laudo</span>
            <input required maxLength={200} placeholder="Ex.: SPDA — Edifício Aurora" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={{ width: '100%' }} /></label>
          <label><span style={estilos.rotulo}>Cliente</span>
            <input maxLength={200} value={form.cliente_nome} onChange={e => setForm({ ...form, cliente_nome: e.target.value })} style={{ width: '100%' }} /></label>
          <label><span style={estilos.rotulo}>Emitido em</span>
            <input required type="date" value={form.emitido_em} onChange={e => setForm({ ...form, emitido_em: e.target.value })} style={{ width: '100%' }} /></label>
          <label><span style={estilos.rotulo}>Validade (meses)</span>
            <input required type="number" min={1} max={120} value={form.validade_meses} onChange={e => setForm({ ...form, validade_meses: e.target.value })} style={{ width: '100%' }}
              title="12 é só uma sugestão: confira a exigência do local (bombeiros, distribuidora, seguradora, NR-10)." /></label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button type="submit" disabled={salvando} style={estilos.btnPrimario}>{salvando ? 'Salvando…' : 'Cadastrar'}</button>
            <button type="button" style={estilos.btnSecundario} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {dados && itens.length === 0 && !form && (
        <p style={{ fontSize: 12, color: 'var(--texto-3)', margin: 0 }}>
          Nenhum vencimento acompanhado ainda. Os laudos feitos no sistema entram aqui sozinhos; os já entregues, use "Cadastrar laudo".
        </p>
      )}

      {mostrados.map(i => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: '1px solid var(--borda)', fontSize: 12.5, flexWrap: 'wrap' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COR[i.nivel], flexShrink: 0 }} aria-hidden />
          <span style={{ flex: '1 1 220px', minWidth: 0, color: 'var(--texto)' }}>
            {i.descricao}
            {i.cliente_nome && <span style={{ color: 'var(--texto-3)' }}> · {i.cliente_nome}</span>}
            {i.tipo === 'empresa' && <span style={{ color: 'var(--texto-3)' }}> · empresa</span>}
          </span>
          <span style={{ color: COR[i.nivel], fontWeight: 700 }}>{i.rotulo}</span>
          <span style={{ color: 'var(--texto-3)' }}>{dataBr(i.vence_em)}</span>
          {i.origem ? (
            <span style={{ color: 'var(--texto-3)', fontSize: 11.5 }} title="A data vem do arquivo do certificado: ao trocar o arquivo, ela se atualiza sozinha.">lida do certificado</span>
          ) : i.tipo === 'empresa' ? (
            <button type="button" style={estilos.btnSecundario} title="Renovei o documento: informe a nova data de vencimento"
              onClick={() => setRenovando({ id: i.id, vence_em: '' })}><RefreshCw size={13} /> Renovei</button>
          ) : (
            <button type="button" style={estilos.btnSecundario} title="Emiti o laudo de novo: conta mais uma validade a partir de hoje"
              onClick={() => agir(() => renovarVencimento(i.id, {}), 'Renovado a partir de hoje.')}><RefreshCw size={13} /> Renovei</button>
          )}
          {ehAdmin && (
            <button type="button" style={estilos.btnIcone} title="Parar de acompanhar este vencimento"
              onClick={() => { if (window.confirm('Parar de acompanhar este vencimento?')) agir(() => encerrarVencimento(i.id), 'Retirado da lista.'); }}><X size={14} /></button>
          )}
          {renovando?.id === i.id && (
            <div style={{ flexBasis: '100%', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 18 }}>
              <input type="date" aria-label="Nova data de vencimento" value={renovando.vence_em} onChange={e => setRenovando({ ...renovando, vence_em: e.target.value })} />
              <button type="button" style={estilos.btnPrimario} disabled={!renovando.vence_em}
                onClick={async () => { await agir(() => renovarVencimento(i.id, { vence_em: renovando.vence_em }), 'Documento renovado.'); setRenovando(null); }}>Salvar nova data</button>
              <button type="button" style={estilos.btnSecundario} onClick={() => setRenovando(null)}>Cancelar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
