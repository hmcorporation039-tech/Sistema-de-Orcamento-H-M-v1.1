import { useState, useEffect, useMemo } from 'react';
import { X, Calculator, RotateCcw } from 'lucide-react';
import Select from './Select';
import {
  TIPOS_OBRA_TCU, FORNECIMENTO_TCU, REGIMES_BDI, PARCELAS_BDI, FONTE_BDI_TCU,
  aliquotaCprb, referenciaTcu, tributosBdi, calcularBdiTcu, sugestaoBdi, avaliarBdi, normalizarMemoriaBdi,
} from '../utils/bdiTcu';

// Calculador de BDI pela fórmula do TCU (Acórdão 2.622/2013-Plenário) — versão
// 2.0, Fase 3F. Abre com a memória gravada na proposta ou, sem ela, com os
// valores MÉDIOS da tabela do tipo de obra. "Aplicar" devolve o BDI (2 casas,
// coluna DECIMAL(5,2)), o BDI diferenciado de materiais (se marcado) e a
// memória do cálculo, que o PDF imprime como "Composição do BDI".
// A conta é a de utils/bdiTcu.js — o mesmo núcleo que o servidor usa.

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
const arred2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export default function CalculadoraBdi({ aberto, onFechar, memoria, publico, impostoVenda, impostoServico, onAplicar }) {
  const anoAtual = new Date().getFullYear();
  const [tipo, setTipo] = useState('edificios');
  const [regime, setRegime] = useState('nao_desonerado');
  const [ano, setAno] = useState(anoAtual);
  const [parcelas, setParcelas] = useState(() => sugestaoBdi('edificios', 'nao_desonerado', anoAtual));
  const [usarMateriais, setUsarMateriais] = useState(false);
  const [parcelasMat, setParcelasMat] = useState(() => sugestaoBdi('fornecimento', 'nao_desonerado', anoAtual));
  const [zerarImpostos, setZerarImpostos] = useState(true);

  // ao abrir: memória gravada (se houver) ou a sugestão da tabela
  useEffect(() => {
    if (!aberto) return;
    const m = normalizarMemoriaBdi(memoria);
    const a = m?.ano_cprb || anoAtual;
    setAno(a);
    if (m) {
      setTipo(m.tipo_obra);
      setRegime(m.regime);
      setParcelas({ ...m.parcelas });
      setUsarMateriais(!!m.materiais);
      setParcelasMat(m.materiais ? { ...m.materiais.parcelas } : sugestaoBdi('fornecimento', m.regime, a));
    } else {
      setTipo('edificios');
      setRegime('nao_desonerado');
      setParcelas(sugestaoBdi('edificios', 'nao_desonerado', a));
      setUsarMateriais(false);
      setParcelasMat(sugestaoBdi('fornecimento', 'nao_desonerado', a));
    }
    setZerarImpostos(true);
  }, [aberto, memoria, anoAtual]);

  const bdi = useMemo(() => calcularBdiTcu(parcelas, regime), [parcelas, regime]);
  const bdiMat = useMemo(() => (usarMateriais ? calcularBdiTcu(parcelasMat, regime) : null), [usarMateriais, parcelasMat, regime]);
  const avisos = useMemo(() => avaliarBdi(parcelas, regime, tipo), [parcelas, regime, tipo]);
  const avisosMat = useMemo(() => (usarMateriais ? avaliarBdi(parcelasMat, regime, FORNECIMENTO_TCU.id) : []), [usarMateriais, parcelasMat, regime]);

  if (!aberto) return null;

  // trocar o tipo de obra recarrega as parcelas com o médio do novo tipo (tributos ficam)
  function trocarTipo(novo) {
    setTipo(novo);
    const s = sugestaoBdi(novo, regime, ano);
    setParcelas(p => ({ ...p, ac: s.ac, sg: s.sg, r: s.r, df: s.df, l: s.l }));
  }
  function trocarRegime(novo) {
    setRegime(novo);
    const cprb = novo === 'desonerado' ? aliquotaCprb(ano) : 0;
    setParcelas(p => ({ ...p, cprb }));
    setParcelasMat(p => ({ ...p, cprb }));
  }
  function trocarAno(novo) {
    const a = Number(novo) || anoAtual;
    setAno(a);
    if (regime === 'desonerado') {
      setParcelas(p => ({ ...p, cprb: aliquotaCprb(a) }));
      setParcelasMat(p => ({ ...p, cprb: aliquotaCprb(a) }));
    }
  }
  function restaurar() {
    setParcelas(sugestaoBdi(tipo, regime, ano));
    setParcelasMat(sugestaoBdi('fornecimento', regime, ano));
  }

  const tributosNoBdi = tributosBdi(parcelas, regime) > 0 || (usarMateriais && tributosBdi(parcelasMat, regime) > 0);
  const temImpostosPorFora = (Number(impostoVenda) || 0) > 0 || (Number(impostoServico) || 0) > 0;
  const podeAplicar = bdi != null && bdi >= 0 && bdi <= 999.99 && (!usarMateriais || (bdiMat != null && bdiMat >= 0));

  function aplicar() {
    const memoriaNova = normalizarMemoriaBdi({
      tipo_obra: tipo, regime, ano_cprb: regime === 'desonerado' ? ano : null, parcelas,
      materiais: usarMateriais ? { parcelas: parcelasMat } : null,
      calculado_em: new Date().toISOString(),
    });
    if (!memoriaNova) return;
    onAplicar({
      bdi: memoriaNova.bdi,
      bdi_materiais: memoriaNova.materiais ? memoriaNova.materiais.bdi : null,
      memoria: memoriaNova,
      zerarImpostos: tributosNoBdi && temImpostosPorFora && zerarImpostos,
    });
  }

  const ref = referenciaTcu(tipo);

  return (
    <div style={overlay} onClick={onFechar}>
      <div style={modal} onClick={e => e.stopPropagation()} role="dialog" aria-label="Calculador de BDI">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calculator size={16} /> BDI pela fórmula do TCU
          </h3>
          <button onClick={onFechar} style={{ ...btnIcone, background: 'transparent' }} title="Fechar"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>
          BDI = [ (1 + AC + S + R + G) × (1 + DF) × (1 + L) / (1 − I) ] − 1 — {FONTE_BDI_TCU}. Parcelas pré-preenchidas com o valor
          médio da tabela; o aviso aparece fora do 1º–3º quartil.
          {publico && <span style={{ color: '#c9a227' }}> Cliente órgão público: a composição do BDI vai no PDF (anexo).</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 0.6fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={rotulo}>Tipo de obra</label>
            <Select value={tipo} onChange={e => trocarTipo(e.target.value)}>
              {TIPOS_OBRA_TCU.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
          </div>
          <div>
            <label style={rotulo}>Regime</label>
            <Select value={regime} onChange={e => trocarRegime(e.target.value)}>
              {Object.entries(REGIMES_BDI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div>
            <label style={rotulo} title="Ano da alíquota da CPRB (reoneração gradual da Lei 14.973/2024)">Ano CPRB</label>
            <input type="number" min="2013" max="2035" value={ano} onChange={e => trocarAno(e.target.value)} disabled={regime !== 'desonerado'} />
          </div>
        </div>

        <TabelaParcelas titulo={usarMateriais ? 'BDI dos serviços (mão de obra e execução)' : 'BDI da proposta'}
          parcelas={parcelas} setParcelas={setParcelas} regime={regime} ref_={ref} bdi={bdi} avisos={avisos} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#bbb', margin: '12px 0 8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={usarMateriais} onChange={e => setUsarMateriais(e.target.checked)} style={{ width: 'auto' }} />
          BDI diferenciado para os materiais (mero fornecimento de materiais e equipamentos — Súmula TCU 253)
        </label>
        {usarMateriais && (
          <TabelaParcelas titulo="BDI diferenciado — fornecimento de materiais e equipamentos"
            parcelas={parcelasMat} setParcelas={setParcelasMat} regime={regime} ref_={FORNECIMENTO_TCU} bdi={bdiMat} avisos={avisosMat} />
        )}

        {tributosNoBdi && temImpostosPorFora && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: '#e0b050', marginTop: 10, cursor: 'pointer', lineHeight: 1.45 }}>
            <input type="checkbox" checked={zerarImpostos} onChange={e => setZerarImpostos(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} />
            Os tributos (PIS, COFINS, ISS{regime === 'desonerado' ? ', CPRB' : ''}) já estão dentro deste BDI. Zerar "Imp. Vendas" ({fmt(impostoVenda)} %)
            e "Imp. Serviços" ({fmt(impostoServico)} %) da proposta — senão o imposto entra duas vezes no total.
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          <button type="button" onClick={restaurar} style={btnSecundario} title="Volta as parcelas para os valores médios da tabela do TCU">
            <RotateCcw size={12} style={{ marginRight: 4 }} /> Valores médios
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onFechar} style={btnSecundario}>Cancelar</button>
          <button type="button" onClick={aplicar} disabled={!podeAplicar} style={btnPrimario}
            title="Grava o BDI na proposta e guarda a memória do cálculo (salve a proposta depois)">
            Aplicar BDI {bdi != null ? `${fmt(arred2(bdi))} %` : ''}{usarMateriais && bdiMat != null ? ` / materiais ${fmt(arred2(bdiMat))} %` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabelaParcelas({ titulo, parcelas, setParcelas, regime, ref_, bdi, avisos }) {
  const fora = new Set(avisos.map(a => a.parcela));
  const campo = (k, extra = {}) => (
    <input type="number" step="0.01" min="0" max="100" value={parcelas[k] ?? ''} onChange={e => setParcelas(p => ({ ...p, [k]: e.target.value }))}
      style={{ width: 80, textAlign: 'right', borderColor: fora.has(k) ? '#8a5a12' : undefined }} {...extra} />
  );
  return (
    <div style={{ border: '1px solid #222', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.8fr 0.8fr 0.8fr', gap: '6px 10px', alignItems: 'center', fontSize: 12 }}>
        <span style={cab}>Parcela (%)</span><span style={cab}>Adotado</span><span style={cab}>1º quartil</span><span style={cab}>Médio</span><span style={cab}>3º quartil</span>
        {PARCELAS_BDI.map(([k, nome]) => (
          <Linha key={k} nome={nome} input={campo(k)} faixa={ref_?.[k]} fora={fora.has(k)} />
        ))}
        <span style={{ ...cab, gridColumn: '1 / -1', marginTop: 6 }}>Tributos sobre o preço — I (%)</span>
        <Linha nome="PIS" input={campo('pis')} />
        <Linha nome="COFINS" input={campo('cofins')} />
        <Linha nome={<>ISS <span style={{ color: '#666' }}>(alíquota do município)</span></>} input={campo('iss')} />
        <Linha nome={<>Base do ISS <span style={{ color: '#666' }}>(% do preço; 100 = sem dedução)</span></>} input={campo('iss_base')} />
        <Linha nome="CPRB (só no desonerado)" input={campo('cprb', { disabled: regime !== 'desonerado' })} />
        <span style={{ color: '#999' }}>Total de tributos (I)</span>
        <span style={{ textAlign: 'right', paddingRight: 6, color: '#ccc' }}>{fmt(tributosBdi(parcelas, regime))}</span>
        <span /><span /><span />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 10, paddingTop: 8, borderTop: '1px solid #222' }}>
        <span style={{ fontSize: 12, color: '#999' }}>BDI resultante</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#c9a227' }}>{bdi != null ? `${fmt(arred2(bdi))} %` : '—'}</span>
        {ref_ && <span style={{ fontSize: 11, color: '#777' }}>faixa TCU: {fmt(ref_.bdi[0])} % a {fmt(ref_.bdi[2])} % (médio {fmt(ref_.bdi[1])} %){regime === 'desonerado' ? ' — comparada sem a CPRB' : ''}</span>}
      </div>
      {avisos.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: '#e0b050', lineHeight: 1.5 }}>
          {avisos.map(a => <div key={a.parcela}>⚠ {a.texto} — justifique na proposta ou revise.</div>)}
        </div>
      )}
    </div>
  );
}

function Linha({ nome, input, faixa, fora }) {
  return (
    <>
      <span style={{ color: fora ? '#e0b050' : '#bbb' }}>{nome}</span>
      <span style={{ textAlign: 'right' }}>{input}</span>
      <span style={num}>{faixa ? fmt(faixa[0]) : ''}</span>
      <span style={num}>{faixa ? fmt(faixa[1]) : ''}</span>
      <span style={num}>{faixa ? fmt(faixa[2]) : ''}</span>
    </>
  );
}

const cab = { fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' };
const num = { textAlign: 'right', color: '#777', fontSize: 11.5 };
const rotulo = { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' };
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '30px 12px' };
const modal = { background: '#131313', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, width: 'min(760px, 100%)' };
const btnIcone = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '1px solid #2a2a2a', borderRadius: 5, color: '#999', cursor: 'pointer' };
const btnSecundario = { display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent', border: '1px dashed #333', borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' };
const btnPrimario = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
