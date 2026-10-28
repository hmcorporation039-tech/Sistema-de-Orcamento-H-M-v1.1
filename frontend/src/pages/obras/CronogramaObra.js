import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarRange, Download, FileText, Pencil, Plus, Save, Trash2, X, ArrowUp, ArrowDown, RefreshCw, Ruler } from 'lucide-react';
import {
  getCronogramaObra, gerarCronogramaObra, salvarCronogramaObra, registrarMedicaoObra,
  baixarPlanilhaCronogramaObra, baixarBoletimMedicaoObra,
} from '../../services/api';
import Select from '../../components/Select';
import { formatarData } from '../../utils/format';
import { baixarArquivo, mensagemDeErro } from '../../utils/download';
import { moeda, estilos as E, Campo, Etiqueta } from './comum';
import CurvaS from './CurvaS';

// Cronograma físico-financeiro e medições da obra (versão 2.0, Fase 3G), na aba
// Execução. Regras e cálculos no backend (utils/cronograma.js); a tela só
// mostra, edita e registra. Duração gerada pela mesma regra da planilha do
// cliente (mão de obra ÷ homem-hora × equipe × 8 h, em dias úteis).

const SITUACAO = {
  adiantado: { rotulo: 'Adiantado', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' },
  atrasado: { rotulo: 'Atrasado', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a' },
  em_dia: { rotulo: 'Em dia', cor: '#c9a227', bg: '#1a1a0a', borda: '#4a3d10' },
  nao_iniciado: { rotulo: 'Não iniciado', cor: '#999', bg: '#151515', borda: '#2f2f2f' },
  concluida: { rotulo: 'Concluída', cor: '#5fc9c0', bg: '#0a1a19', borda: '#1a4a46' },
};

const pc = (v, casas = 1) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const numeroBR = (v) => {
  const s = v == null ? '' : String(v).trim();
  if (s === '') return null;
  // "1.234,56" (BR) ou "1234.56"
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : NaN;
};
// início do período (mesma regra do backend): 1º dia do mês ou segunda-feira
function inicioPeriodo(iso, periodicidade) {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (periodicidade === 'semanal') {
    const dt = new Date(Date.UTC(a, m - 1, d));
    const dow = dt.getUTCDay();
    dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    return dt.toISOString().slice(0, 10);
  }
  return `${a}-${String(m).padStart(2, '0')}-01`;
}
const diasEntre = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export default function CronogramaObra({ obra }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(false);
  const [gerarAberto, setGerarAberto] = useState(false);
  const [baixando, setBaixando] = useState('');

  const carregar = useCallback(() => getCronogramaObra(obra.id)
    .then(r => { setDados(r.data); setErro(null); })
    .catch(e => setErro(e.response?.data?.erro || 'Erro ao carregar o cronograma')), [obra.id]);
  useEffect(() => { carregar(); }, [carregar]);
  const aplicar = (r) => setDados(d => ({ ...d, ...r.data }));

  if (erro) return <div style={E.card}><p style={{ color: '#e08080', margin: 0 }}>{erro}</p></div>;
  if (!dados) return <div style={E.card}><p style={{ color: '#777', margin: 0 }}>Carregando cronograma...</p></div>;

  const pode = dados.pode_editar;
  const temCronograma = dados.etapas.length > 0;
  const calc = dados.calculo;

  async function baixarExcel() {
    setBaixando('excel');
    try {
      await baixarArquivo(baixarPlanilhaCronogramaObra(obra.id), `${obra.codigo}_cronograma.xlsx`);
    } catch (e) {
      toast.error(await mensagemDeErro(e, 'Erro ao gerar a planilha'));
    } finally { setBaixando(''); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px', flexWrap: 'wrap' }}>
        <h3 style={{ color: '#c9a227', fontSize: 14, fontWeight: 700, flex: 1, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarRange size={15} /> Cronograma físico-financeiro
          {dados.cronograma?.proposta_numero && <span style={{ color: '#777', fontSize: 11, fontWeight: 400 }}>· base: proposta {dados.cronograma.proposta_numero} · períodos {dados.cronograma.periodicidade === 'semanal' ? 'semanais' : 'mensais'}</span>}
        </h3>
        {pode && !editando && (
          <button type="button" onClick={() => setGerarAberto(a => !a)} style={E.btnSecundario}>
            <RefreshCw size={13} /> {temCronograma ? 'Regerar da proposta' : 'Gerar da proposta'}
          </button>
        )}
        {pode && temCronograma && !editando && <button type="button" onClick={() => { setEditando(true); setGerarAberto(false); }} style={E.btnSecundario}><Pencil size={13} /> Editar</button>}
        {pode && !temCronograma && !editando && <button type="button" onClick={() => setEditando(true)} style={E.btnSecundario}><Plus size={13} /> Montar manualmente</button>}
        {temCronograma && <button type="button" onClick={baixarExcel} disabled={baixando === 'excel'} style={E.btnPrimario}><Download size={13} /> {baixando === 'excel' ? 'Gerando...' : 'Planilha Excel'}</button>}
      </div>

      {gerarAberto && <PainelGerar dados={dados} obra={obra} onGerado={(r) => { aplicar(r); setGerarAberto(false); }} onFechar={() => setGerarAberto(false)} />}

      {!temCronograma && !editando && !gerarAberto && (
        <div style={{ ...E.card, borderStyle: 'dashed' }}>
          <p style={{ color: '#999', fontSize: 12, margin: 0 }}>
            Esta obra ainda não tem cronograma. {pode
              ? 'Gere a partir da proposta aprovada (uma etapa por sistema, valor com BDI e impostos, duração pela mão de obra) ou monte manualmente.'
              : 'Só o dono da obra ou um administrador monta o cronograma.'}
          </p>
        </div>
      )}

      {editando && <EditorCronograma dados={dados} onSalvo={(r) => { aplicar(r); setEditando(false); }} onCancelar={() => setEditando(false)}
        onRecarregar={() => { setEditando(false); carregar(); }} />}

      {temCronograma && !editando && (
        <>
          <Indicadores resumo={calc.resumo} />
          {calc.avisos?.length > 0 && <div style={{ ...E.card, borderColor: '#4a3d10', color: '#c9a227', fontSize: 12, padding: 12 }}>{calc.avisos.map((a, i) => <div key={i}>⚠ {a}</div>)}</div>}
          <TabelaCronograma calc={calc} etapas={dados.etapas} />
          <div style={{ ...E.card, marginTop: 16 }}>
            <h4 style={{ color: '#ccc', fontSize: 13, margin: '0 0 10px' }}>Curva S — % físico acumulado</h4>
            <CurvaS curva={calc.curva} periodoReferencia={calc.resumo.periodo_referencia} />
          </div>
          <Medicoes obra={obra} dados={dados} pode={pode} onRegistrado={aplicar} />
        </>
      )}
    </div>
  );
}

// ── indicadores ───────────────────────────────────────────────────────
function Indicadores({ resumo: r }) {
  const s = SITUACAO[r.situacao] || SITUACAO.nao_iniciado;
  const itens = [
    { rotulo: 'Físico previsto', valor: pc(r.fisico_previsto), nota: `até ${formatarData(r.data_referencia)}`, cor: '#c9a227' },
    { rotulo: 'Físico realizado', valor: pc(r.fisico_realizado), nota: r.ultimo_periodo_medido ? `última medição: ${formatarData(r.ultimo_periodo_medido)}` : 'sem medição', cor: '#3fb95f' },
    { rotulo: 'Desvio físico', valor: `${r.desvio_fisico > 0 ? '+' : ''}${pc(r.desvio_fisico)}`, nota: <Etiqueta info={s}>{s.rotulo}</Etiqueta>, cor: s.cor },
    { rotulo: 'Financeiro medido', valor: pc(r.financeiro_realizado), nota: `${moeda(r.valor_medido_acum)} de ${moeda(r.valor_total)}`, cor: '#5fc9c0' },
    { rotulo: 'A medir no período', valor: moeda(r.valor_a_medir_periodo), nota: r.valor_medido_periodo ? 'medido no período atual' : `previsto no período (${moeda(r.valor_previsto_periodo)})`, cor: '#ddd' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
      {itens.map(i => (
        <div key={i.rotulo} style={{ ...E.card, marginBottom: 0, padding: 14 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{i.rotulo}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: i.cor }}>{i.valor}</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{i.nota}</div>
        </div>
      ))}
    </div>
  );
}

// ── tabela etapas × períodos com Gantt ───────────────────────────────
function BarraGantt({ inicio, fim, min, span, realizado, hoje }) {
  if (!inicio || !fim || !span) return <span style={{ color: '#555' }}>—</span>;
  const esq = (diasEntre(min, inicio) / span) * 100;
  const larg = Math.max(1.5, ((diasEntre(inicio, fim) + 1) / span) * 100);
  const posHoje = hoje != null ? (diasEntre(min, hoje) / span) * 100 : null;
  return (
    <div style={{ position: 'relative', height: 14, background: '#0d0d0d', borderRadius: 3, minWidth: 220 }} title={`${formatarData(inicio)} a ${formatarData(fim)} · realizado ${pc(realizado)}`}>
      <div style={{ position: 'absolute', left: `${esq}%`, width: `${larg}%`, top: 2, bottom: 2, background: '#4a3d10', border: '1px solid #c9a227', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, realizado || 0)}%`, height: '100%', background: '#3fb95f' }} />
      </div>
      {posHoje != null && posHoje >= 0 && posHoje <= 100 && <div style={{ position: 'absolute', left: `${posHoje}%`, top: -2, bottom: -2, width: 1, background: '#5fc9c0' }} />}
    </div>
  );
}

function TabelaCronograma({ calc, etapas }) {
  const min = calc.resumo.inicio;
  const span = min && calc.resumo.fim ? diasEntre(min, calc.resumo.fim) + 1 : 0;
  const hoje = calc.resumo.data_referencia;
  const ultMed = calc.curva.reduce((u, c, k) => (c.tem_medicao ? k : u), -1);
  const th = { ...E.th, padding: '8px 10px', whiteSpace: 'nowrap' };
  const td = { ...E.td, padding: '7px 10px' };
  const rodape = (rotulo, f, cor) => (
    <tr style={{ borderTop: '1px solid #262626', background: '#101010' }}>
      <td colSpan={7} style={{ ...td, textAlign: 'right', color: '#999', fontWeight: 700, fontSize: 11 }}>{rotulo}</td>
      {calc.curva.map((c, k) => <td key={c.periodo} style={{ ...td, textAlign: 'right', color: cor, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{f(c, k)}</td>)}
    </tr>
  );
  return (
    <div style={E.caixaTabela}>
      <table style={E.tabela}>
        <thead>
          <tr style={{ background: '#0f0f0f' }}>
            <th style={th}>#</th><th style={th}>Etapa</th><th style={{ ...th, textAlign: 'right' }}>Valor</th><th style={{ ...th, textAlign: 'right' }}>Peso</th>
            <th style={th}>Prazo</th><th style={th}>Linha do tempo</th><th style={{ ...th, textAlign: 'right' }}>Físico</th>
            {calc.rotulos.map((r, k) => <th key={calc.periodos[k]} style={{ ...th, textAlign: 'center', color: calc.periodos[k] === calc.resumo.periodo_referencia ? '#5fc9c0' : th.color }}>{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {calc.etapas.map((e, i) => {
            const s = SITUACAO[e.situacao] || SITUACAO.nao_iniciado;
            const db = etapas.find(x => x.id === e.id);
            const real = e.serie.length ? e.serie[e.serie.length - 1].realizado_acum_pct : 0;
            return (
              <tr key={e.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={{ ...td, color: '#666' }}>{i + 1}</td>
                <td style={{ ...td, minWidth: 200 }}>
                  <div style={{ color: '#ddd', fontWeight: 600 }}>{e.nome}</div>
                  {e.origem && e.origem !== e.nome && <div style={{ color: '#666', fontSize: 10 }}>{e.origem}</div>}
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{moeda(e.valor)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#999' }}>{pc(e.peso)}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 11 }}>
                  {e.inicio ? `${formatarData(e.inicio)} a ${formatarData(e.fim)}` : '—'}
                  {db?.dias_uteis ? <div style={{ color: '#666', fontSize: 10 }}>{db.dias_uteis} dia(s) útil(eis)</div> : null}
                </td>
                <td style={td}><BarraGantt inicio={e.inicio} fim={e.fim} min={min} span={span} realizado={real} hoje={hoje} /></td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: s.cor }}>{pc(real)}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{s.rotulo}</div>
                </td>
                {e.serie.map((x) => (
                  <td key={x.periodo} style={{ ...td, textAlign: 'center', padding: '4px 6px' }}>
                    {x.previsto_pct > 0
                      ? <div title={`previsto ${pc(x.previsto_pct, 2)} = ${moeda(x.previsto_valor)}`} style={{ background: `rgba(201,162,39,${0.25 + 0.6 * Math.min(1, x.previsto_pct / 100)})`, color: '#111', borderRadius: 3, fontWeight: 700, fontSize: 11, padding: '3px 4px' }}>{pc(x.previsto_pct, 0)}</div>
                      : <div style={{ color: '#333' }}>·</div>}
                    {x.medido && <div title="% físico acumulado medido no período" style={{ color: '#3fb95f', fontSize: 10, marginTop: 2 }}>✓ {pc(x.realizado_acum_pct, 0)}</div>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {rodape('Previsto no período', (c) => moeda(c.previsto_valor), '#c9a227')}
          {rodape('Físico previsto acumulado', (c) => pc(c.previsto_fisico_acum), '#c9a227')}
          {rodape('Medido no período', (c, k) => (k <= ultMed ? moeda(c.realizado_valor) : ''), '#3fb95f')}
          {rodape('Físico realizado acumulado', (c, k) => (k <= ultMed ? pc(c.realizado_fisico_acum) : ''), '#3fb95f')}
        </tfoot>
      </table>
    </div>
  );
}

// ── gerar da proposta ─────────────────────────────────────────────────
function PainelGerar({ dados, obra, onGerado, onFechar }) {
  const cfg = dados.cronograma;
  const [form, setForm] = useState({
    proposta_id: String(cfg?.proposta_id || dados.proposta_sugerida || ''),
    data_inicio: cfg?.data_inicio || obra.inicio_previsto?.slice?.(0, 10) || hojeIso(),
    periodicidade: cfg?.periodicidade || 'mensal',
    custo_hh: String(cfg?.custo_hh ?? dados.padroes.custo_hh).replace('.', ','),
    equipe: String(cfg?.equipe ?? dados.padroes.equipe),
    incluir_etapas_fixas: true,
  });
  const [gerando, setGerando] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  async function gerar() {
    if (dados.etapas.length && !window.confirm('Regerar o cronograma a partir da proposta? As etapas da proposta são recalculadas (valor, datas e distribuição); as medições continuam; etapas com medição que não estiverem mais na proposta são mantidas.')) return;
    setGerando(true);
    try {
      const r = await gerarCronogramaObra(obra.id, {
        proposta_id: form.proposta_id ? Number(form.proposta_id) : null,
        data_inicio: form.data_inicio, periodicidade: form.periodicidade,
        custo_hh: numeroBR(form.custo_hh), equipe: numeroBR(form.equipe), incluir_etapas_fixas: form.incluir_etapas_fixas,
      });
      (r.data.avisos || []).forEach(a => toast(a, { icon: '⚠', duration: 8000 }));
      toast.success(`Cronograma gerado: ${r.data.etapas.length} etapas, ${moeda(r.data.total_proposta)}`);
      onGerado(r);
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao gerar o cronograma', { duration: 7000 });
    } finally { setGerando(false); }
  }
  return (
    <div style={{ ...E.card, borderColor: '#4a3d10' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
        <Campo label="Proposta de base" style={{ gridColumn: 'span 2' }}>
          <Select value={form.proposta_id} onChange={set('proposta_id')}>
            <option value="">{dados.proposta_sugerida ? 'Aprovada da obra' : 'Escolha a proposta...'}</option>
            {dados.propostas.map(p => <option key={p.id} value={String(p.id)}>{`${p.numero} — ${p.status} — ${moeda(p.total)}`}</option>)}
          </Select>
        </Campo>
        <Campo label="Início da obra"><input type="date" value={form.data_inicio} onChange={set('data_inicio')} /></Campo>
        <Campo label="Períodos">
          <Select value={form.periodicidade} onChange={set('periodicidade')}>
            <option value="mensal">Mensais</option>
            <option value="semanal">Semanais</option>
          </Select>
        </Campo>
        <Campo label="Homem-hora (R$)"><input value={form.custo_hh} onChange={set('custo_hh')} inputMode="decimal" /></Campo>
        <Campo label="Equipe (pessoas)"><input value={form.equipe} onChange={set('equipe')} inputMode="numeric" /></Campo>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <label style={{ color: '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={form.incluir_etapas_fixas} onChange={set('incluir_etapas_fixas')} style={{ width: 'auto' }} />
          Incluir mobilização (1 dia) e testes/entrega (2 dias)
        </label>
        <span style={{ color: '#666', fontSize: 11, flex: 1 }}>Uma etapa por sistema da proposta; valor com BDI e impostos; duração = mão de obra ÷ (homem-hora × equipe × 8 h), em dias úteis, em sequência — a mesma regra da planilha do cliente.</span>
        <button type="button" onClick={onFechar} style={E.btnSecundario}>Cancelar</button>
        <button type="button" onClick={gerar} disabled={gerando} style={E.btnPrimario}><RefreshCw size={13} /> {gerando ? 'Gerando...' : 'Gerar cronograma'}</button>
      </div>
    </div>
  );
}

// ── editor ────────────────────────────────────────────────────────────
const inp = { padding: '5px 7px', fontSize: 12, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, color: '#ddd' };
let seqNova = 0;

function EditorCronograma({ dados, onSalvo, onCancelar, onRecarregar }) {
  const calc = dados.calculo;
  const cfg = dados.cronograma;
  const [periodicidade, setPeriodicidade] = useState(cfg?.periodicidade || 'mensal');
  const [criterio, setCriterio] = useState(cfg?.criterio_peso || 'valor');
  const [linhas, setLinhas] = useState(() => dados.etapas.map(e => ({
    chave: `e${e.id}`, id: e.id, nome: e.nome, origem: e.origem, valor: e.valor == null ? '' : String(e.valor).replace('.', ','),
    peso: e.peso == null ? '' : String(e.peso).replace('.', ','), inicio: e.inicio || '', fim: e.fim || '',
    dist: Object.fromEntries((calc.etapas.find(x => x.id === e.id)?.serie || []).filter(x => x.previsto_pct > 0).map(x => [x.periodo, String(x.previsto_pct).replace('.', ',')])),
    distAlterada: false, datasOriginais: `${e.inicio}|${e.fim}`,
  })));
  const [salvando, setSalvando] = useState(false);
  // 409 CONFLITO_VERSAO: outra pessoa salvou o cronograma depois que este editor abriu
  const [conflito, setConflito] = useState(null);
  const mudouPeriodicidade = periodicidade !== (cfg?.periodicidade || 'mensal');
  const periodos = calc.periodos;

  const alterar = (i, k, v) => setLinhas(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const alterarDist = (i, p, v) => setLinhas(ls => ls.map((l, j) => (j === i ? { ...l, dist: { ...l.dist, [p]: v }, distAlterada: true } : l)));
  const mover = (i, d) => setLinhas(ls => { const n = [...ls]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n; });
  const remover = (i) => setLinhas(ls => ls.filter((_, j) => j !== i));
  const adicionar = () => setLinhas(ls => [...ls, { chave: `n${++seqNova}`, id: null, nome: '', origem: null, valor: '', peso: '', inicio: '', fim: '', dist: {}, distAlterada: false, datasOriginais: '' }]);

  async function salvar() {
    const etapas = [];
    for (const [i, l] of linhas.entries()) {
      if (!l.nome.trim()) { toast.error(`Informe o nome da etapa ${i + 1}`); return; }
      const valor = numeroBR(l.valor);
      const peso = numeroBR(l.peso);
      if (Number.isNaN(valor) || Number.isNaN(peso)) { toast.error(`Número inválido na etapa "${l.nome}"`); return; }
      const e = { id: l.id, nome: l.nome.trim(), origem: l.origem, valor, peso, inicio: l.inicio || null, fim: l.fim || null };
      const datasMudaram = `${l.inicio}|${l.fim}` !== l.datasOriginais;
      if (l.distAlterada && !mudouPeriodicidade && !datasMudaram) {
        const dist = Object.entries(l.dist).map(([periodo, v]) => ({ periodo, percentual: numeroBR(v) })).filter(d => d.percentual != null);
        if (dist.some(d => Number.isNaN(d.percentual))) { toast.error(`% inválido na etapa "${l.nome}"`); return; }
        e.distribuicao = dist;
      }
      etapas.push(e);
    }
    setSalvando(true);
    try {
      const r = await salvarCronogramaObra(dados.obra.id, { versao: cfg?.versao, periodicidade, criterio_peso: criterio, data_inicio: cfg?.data_inicio || null, etapas });
      toast.success('Cronograma salvo');
      onSalvo(r);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.codigo === 'CONFLITO_VERSAO') {
        setConflito(e.response.data.erro || 'Outra pessoa salvou este cronograma depois que você começou a editar.');
      } else toast.error(e.response?.data?.erro || 'Erro ao salvar o cronograma', { duration: 8000 });
    } finally { setSalvando(false); }
  }

  const th = { ...E.th, padding: '8px 8px', whiteSpace: 'nowrap' };
  const td = { ...E.td, padding: '5px 6px' };
  return (
    <div style={{ ...E.card, padding: 14 }}>
      {conflito && (
        <div data-testid="aviso-conflito" style={{ border: '1px solid #6a2a2a', background: '#1a0d0d', borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 240, color: '#ddd', fontSize: 12.5 }}><b style={{ color: '#e08080' }}>Não foi salvo:</b> {conflito} Nada foi sobrescrito.</span>
          <button type="button" style={E.btnPrimario} onClick={() => { if (window.confirm('Descartar as edições deste editor e carregar o cronograma salvo agora?')) onRecarregar(); }}>Recarregar do servidor</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 12 }}>
        <Campo label="Períodos">
          <Select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)} style={{ minWidth: 140 }}>
            <option value="mensal">Mensais</option>
            <option value="semanal">Semanais</option>
          </Select>
        </Campo>
        <Campo label="Peso físico da etapa">
          <Select value={criterio} onChange={e => setCriterio(e.target.value)} style={{ minWidth: 200 }}>
            <option value="valor">Pelo valor (R$)</option>
            <option value="manual">Informado (%)</option>
          </Select>
        </Campo>
        <span style={{ color: '#777', fontSize: 11, flex: 1 }}>
          % por período = parcela prevista da etapa (cada linha deve somar 100%). Mudou datas ou periodicidade? Ao salvar, a etapa é redistribuída de forma linear pelos dias úteis.
        </span>
        <button type="button" onClick={adicionar} style={E.btnSecundario}><Plus size={13} /> Etapa</button>
        <button type="button" onClick={onCancelar} style={E.btnSecundario}><X size={13} /> Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando} style={E.btnPrimario}><Save size={13} /> {salvando ? 'Salvando...' : 'Salvar cronograma'}</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={E.tabela}>
          <thead>
            <tr style={{ background: '#0f0f0f' }}>
              <th style={th} /><th style={th}>Etapa</th><th style={th}>Valor (R$)</th>{criterio === 'manual' && <th style={th}>Peso (%)</th>}
              <th style={th}>Início</th><th style={th}>Término</th>
              {!mudouPeriodicidade && calc.rotulos.map((r, k) => <th key={periodos[k]} style={{ ...th, textAlign: 'center' }}>{r}</th>)}
              {!mudouPeriodicidade && <th style={th}>Soma</th>}
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const soma = Object.values(l.dist).reduce((s, v) => s + (numeroBR(v) || 0), 0);
              const datasMudaram = `${l.inicio}|${l.fim}` !== l.datasOriginais;
              return (
                <tr key={l.chave} style={{ borderTop: '1px solid #1e1e1e' }}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} style={{ ...E.btnIcone, width: 22, height: 22, opacity: i === 0 ? 0.3 : 1 }} title="Subir"><ArrowUp size={11} /></button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === linhas.length - 1} style={{ ...E.btnIcone, width: 22, height: 22, marginLeft: 3, opacity: i === linhas.length - 1 ? 0.3 : 1 }} title="Descer"><ArrowDown size={11} /></button>
                  </td>
                  <td style={td}><input value={l.nome} onChange={e => alterar(i, 'nome', e.target.value)} style={{ ...inp, width: 230 }} aria-label={`Nome da etapa ${i + 1}`} /></td>
                  <td style={td}><input value={l.valor} onChange={e => alterar(i, 'valor', e.target.value)} inputMode="decimal" style={{ ...inp, width: 100, textAlign: 'right' }} aria-label="Valor da etapa" /></td>
                  {criterio === 'manual' && <td style={td}><input value={l.peso} onChange={e => alterar(i, 'peso', e.target.value)} inputMode="decimal" style={{ ...inp, width: 60, textAlign: 'right' }} aria-label="Peso da etapa" /></td>}
                  <td style={td}><input type="date" value={l.inicio} onChange={e => alterar(i, 'inicio', e.target.value)} style={{ ...inp, width: 130 }} aria-label="Início" /></td>
                  <td style={td}><input type="date" value={l.fim} onChange={e => alterar(i, 'fim', e.target.value)} style={{ ...inp, width: 130 }} aria-label="Término" /></td>
                  {!mudouPeriodicidade && periodos.map(p => (
                    <td key={p} style={{ ...td, textAlign: 'center' }}>
                      <input value={l.dist[p] ?? ''} disabled={datasMudaram || !l.id} onChange={e => alterarDist(i, p, e.target.value)} inputMode="decimal"
                        style={{ ...inp, width: 54, textAlign: 'right', background: numeroBR(l.dist[p]) > 0 ? '#2a230b' : inp.background, opacity: datasMudaram || !l.id ? 0.4 : 1 }}
                        title={datasMudaram || !l.id ? 'Datas novas: a distribuição é refeita ao salvar' : '% previsto da etapa neste período'} aria-label={`% previsto em ${p}`} />
                    </td>
                  ))}
                  {!mudouPeriodicidade && <td style={{ ...td, color: Math.abs(soma - 100) > 0.05 && l.id && !datasMudaram ? '#e08080' : '#777', fontSize: 11, whiteSpace: 'nowrap' }}>{l.id && !datasMudaram ? pc(soma) : 'linear'}</td>}
                  <td style={td}><button type="button" onClick={() => remover(i)} style={{ ...E.btnIcone, color: '#b04040' }} title="Remover etapa (só sem medição)"><Trash2 size={12} /></button></td>
                </tr>
              );
            })}
            {!linhas.length && <tr><td colSpan={8} style={E.tdVazio}>Nenhuma etapa — use “+ Etapa”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── medições ──────────────────────────────────────────────────────────
function Medicoes({ obra, dados, pode, onRegistrado }) {
  const calc = dados.calculo;
  const per = calc.periodicidade;
  const [dataMed, setDataMed] = useState(hojeIso());
  const [periodoManual, setPeriodoManual] = useState('');
  const [obs, setObs] = useState('');
  const [valores, setValores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState('');
  const [verTudo, setVerTudo] = useState(false);
  const periodo = inicioPeriodo(periodoManual || dataMed, per);
  const k = calc.periodos.indexOf(periodo);
  const rotuloPeriodo = k >= 0 ? calc.rotulos[k] : (periodo ? formatarData(periodo) : '—');

  const linhas = useMemo(() => calc.etapas.map(e => {
    const anteriores = e.serie.filter(x => x.periodo < periodo);
    const ant = anteriores.length ? anteriores[anteriores.length - 1] : null;
    const atual = e.serie.find(x => x.periodo === periodo);
    return {
      id: e.id, nome: e.nome, valor: e.valor,
      anterior: ant ? ant.realizado_acum_pct : 0,
      previsto: atual ? atual.previsto_acum_pct : (ant ? ant.previsto_acum_pct : 0),
      vigenteNoPeriodo: atual?.medido ? atual.realizado_acum_pct : null,
    };
  }), [calc.etapas, periodo]);

  const set = (id, campo) => (e) => setValores(v => ({ ...v, [id]: { ...v[id], [campo]: e.target.value } }));

  async function registrar(ev) {
    ev.preventDefault();
    const itens = [];
    for (const l of linhas) {
      const v = valores[l.id] || {};
      const pct = numeroBR(v.pct);
      const val = numeroBR(v.valor);
      if (Number.isNaN(pct) || Number.isNaN(val)) { toast.error(`Número inválido em "${l.nome}"`); return; }
      if (pct == null && val == null) continue;
      itens.push({ etapa_id: l.id, percentual_acumulado: pct, valor_medido: val, observacao: v.obs || null });
    }
    if (!itens.length) { toast.error('Informe o % acumulado ou o valor medido de ao menos uma etapa'); return; }
    setEnviando(true);
    try {
      const r = await registrarMedicaoObra(obra.id, { data_medicao: dataMed, periodo: periodoManual || null, observacao: obs || null, itens });
      toast.success(`Medição registrada (${r.data.criadas.length} etapa(s))`);
      setValores({}); setObs('');
      onRegistrado(r);
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao registrar a medição', { duration: 8000 });
    } finally { setEnviando(false); }
  }

  async function boletim(p, numero) {
    setBaixando(p);
    try {
      await baixarArquivo(baixarBoletimMedicaoObra(obra.id, p), `${obra.codigo}_boletim_${String(numero).padStart(2, '0')}.pdf`);
    } catch (e) {
      toast.error(await mensagemDeErro(e, 'Erro ao gerar o boletim'));
    } finally { setBaixando(''); }
  }

  const boletins = calc.curva.filter(c => c.tem_medicao).map((c, i) => ({ ...c, numero: i + 1 }));
  const historico = [...dados.medicoes].reverse();
  const th = { ...E.th, padding: '8px 10px' };
  const td = { ...E.td, padding: '6px 10px' };
  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={{ color: '#c9a227', fontSize: 14, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Ruler size={15} /> Medições</h3>
      {pode ? (
        <form onSubmit={registrar} style={{ ...E.card, padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 10 }}>
            <Campo label="Data da medição"><input type="date" value={dataMed} onChange={e => setDataMed(e.target.value)} required /></Campo>
            <Campo label="Período (opcional)"><input type="date" value={periodoManual} onChange={e => setPeriodoManual(e.target.value)} title="Qualquer dia do período; vazio = período da data da medição" /></Campo>
            <div style={{ color: '#ccc', fontSize: 12, paddingBottom: 8 }}>Período medido: <b style={{ color: '#c9a227' }}>{rotuloPeriodo}</b>{k < 0 && <span style={{ color: '#e08080' }}> (fora do cronograma)</span>}</div>
            <Campo label="Observação geral" style={{ flex: 1, minWidth: 220 }}><input value={obs} onChange={e => setObs(e.target.value)} maxLength={2000} /></Campo>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={E.tabela}>
              <thead><tr style={{ background: '#0f0f0f' }}>
                <th style={th}>Etapa</th><th style={{ ...th, textAlign: 'right' }}>Valor</th><th style={{ ...th, textAlign: 'right' }}>Previsto acum.</th>
                <th style={{ ...th, textAlign: 'right' }}>Medido até o período anterior</th><th style={th}>% físico acumulado</th><th style={th}>ou valor medido no período (R$)</th><th style={th}>Observação</th>
              </tr></thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={td}>{l.nome}{l.vigenteNoPeriodo != null && <div style={{ color: '#c9a227', fontSize: 10 }}>já medida neste período ({pc(l.vigenteNoPeriodo)}) — a nova corrige, a anterior fica no histórico</div>}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{moeda(l.valor)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#c9a227' }}>{pc(l.previsto)}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#3fb95f' }}>{pc(l.anterior)}</td>
                    <td style={td}><input value={valores[l.id]?.pct ?? ''} onChange={set(l.id, 'pct')} inputMode="decimal" placeholder="0 a 100" style={{ ...inp, width: 90, textAlign: 'right' }} aria-label={`% físico acumulado de ${l.nome}`} /></td>
                    <td style={td}><input value={valores[l.id]?.valor ?? ''} onChange={set(l.id, 'valor')} inputMode="decimal" placeholder="opcional" style={{ ...inp, width: 120, textAlign: 'right' }} aria-label={`Valor medido de ${l.nome}`} /></td>
                    <td style={td}><input value={valores[l.id]?.obs ?? ''} onChange={set(l.id, 'obs')} maxLength={2000} style={{ ...inp, width: 200 }} aria-label={`Observação de ${l.nome}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <span style={{ color: '#666', fontSize: 11, flex: 1 }}>Só o % acumulado: o valor do período sai do avanço × valor da etapa. Só o valor: o % acumulado sai do valor ÷ valor da etapa. Etapas em branco não entram.</span>
            <button type="submit" disabled={enviando} style={E.btnPrimario}><Save size={13} /> {enviando ? 'Registrando...' : 'Registrar medição'}</button>
          </div>
        </form>
      ) : <p style={{ color: '#777', fontSize: 12 }}>Só o dono da obra ou um administrador registra medições.</p>}

      {boletins.length > 0 && (
        <div style={{ ...E.card, padding: 14 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Boletins de medição</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {boletins.map(b => (
              <button key={b.periodo} type="button" onClick={() => boletim(b.periodo, b.numero)} disabled={baixando === b.periodo} style={E.btnSecundario} title="Baixar o boletim em PDF">
                <FileText size={13} /> Nº {String(b.numero).padStart(2, '0')} · {b.rotulo} · {moeda(b.realizado_valor)}{baixando === b.periodo ? ' ...' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={E.caixaTabela}>
        <table style={E.tabela}>
          <thead><tr style={{ background: '#0f0f0f' }}>
            <th style={th}>Data</th><th style={th}>Período</th><th style={th}>Etapa</th><th style={{ ...th, textAlign: 'right' }}>% acumulado</th>
            <th style={{ ...th, textAlign: 'right' }}>Valor medido</th><th style={th}>Situação</th><th style={th}>Observação</th><th style={th}>Registrada por</th>
          </tr></thead>
          <tbody>
            {historico.length === 0 && <tr><td colSpan={8} style={E.tdVazio}>Nenhuma medição registrada.</td></tr>}
            {(verTudo ? historico : historico.slice(0, 30)).map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid #1e1e1e', opacity: m.vigente ? 1 : 0.55 }}>
                <td style={td}>{formatarData(m.data_medicao)}</td>
                <td style={td}>{m.periodo_rotulo || formatarData(m.periodo)}</td>
                <td style={td}>{m.etapa_nome_atual || m.etapa_nome || '(etapa removida)'}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.percentual_acumulado != null ? pc(m.percentual_acumulado, 2) : '—'}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{m.valor_medido != null ? moeda(m.valor_medido) : '—'}</td>
                <td style={td}>{m.vigente ? <Etiqueta info={SITUACAO.adiantado}>Vigente</Etiqueta> : <Etiqueta info={SITUACAO.nao_iniciado}>Corrigida</Etiqueta>}</td>
                <td style={{ ...td, fontSize: 11, color: '#999' }}>{m.observacao || '—'}</td>
                <td style={{ ...td, fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>{m.usuario_nome || '—'}<div style={{ fontSize: 10, color: '#666' }}>{m.criado_em ? new Date(m.criado_em).toLocaleString('pt-BR') : ''}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {historico.length > 30 && !verTudo && <button type="button" onClick={() => setVerTudo(true)} style={{ ...E.btnSecundario, marginTop: 8 }}>Ver todas ({historico.length})</button>}
    </div>
  );
}
