// "O que é o projeto" (09/11/2026): o que a leitura do DWG/DXF entendeu de cada arquivo — disciplina e tipo
// (ex.: subestação abrigada de 150 kVA), as vistas da folha que valeram (principal) e as que ficaram de fora
// (situação de outro projeto, cortes, detalhes), as legendas lidas (relação de materiais, legenda numerada, de
// símbolos, de detalhe) e os componentes com a fonte de cada um. Tudo que ficou [CONFERIR] aparece marcado.
// Fonte: dadosExtraidos[i].objetivo (services/analiseCad → skills/_comum/cad/objetivoDoProjeto.js).
import { useState } from 'react';
import { Target } from 'lucide-react';

const br = (v, c = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(c).replace('.', ','));
const PAPEL = { principal: 'Principal (vale para o projeto)', contexto: 'Contexto (base de outro projeto — ignorada)', apoio: 'Apoio (cortes, detalhes, legendas)' };
const FONTE = {
  relacao_materiais: 'relação de materiais', legenda: 'legenda', legenda_detalhe: 'legenda de detalhe', legenda_simbolos: 'legenda de símbolos',
  bloco: 'bloco', layer: 'layer', texto: 'texto do desenho', diagrama: 'diagrama',
};
const CONFIANCA = (c) => (typeof c === 'number' ? (c >= 0.75 ? 'alta' : c >= 0.5 ? 'média' : 'baixa') : c || '—');
const conferir = { color: '#e0a030', fontWeight: 700 };
const pequeno = { fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6 };
const linha = { padding: '6px 0', borderTop: '1px solid #1e1e1e', fontSize: 13, color: 'var(--texto-2)' };

function Objetivo({ arquivo, o }) {
  const [aberto, setAberto] = useState({ vistas: false, legendas: false, componentes: true, avisos: false });
  const alternar = (k) => setAberto(a => ({ ...a, [k]: !a[k] }));
  const vistas = o.vistas || [];
  const porPapel = ['principal', 'contexto', 'apoio'].map(p => [p, vistas.filter(v => v.papel === p)]).filter(([, l]) => l.length);
  const legendas = (o.legendas || []).filter(l => !l.contexto);
  const comps = o.componentes || [];
  const nConferir = comps.filter(c => c.conferir).length;
  const d = o.dados || {};
  const destaques = [
    d.potencia_kva != null && `${br(d.potencia_kva, 0)} kVA`,
    d.tensao_primaria_kv != null && `${br(d.tensao_primaria_kv, 1)} kV`,
    d.tensao_secundaria_v != null && `${d.tensao_secundaria_v}${d.tensao_secundaria_fn_v ? `/${d.tensao_secundaria_fn_v}` : ''} V`,
    d.demanda_kva != null && `demanda ${br(d.demanda_kva)} kVA`,
    o.abrigo?.largura_m != null && `abrigo ${br(o.abrigo.largura_m)} × ${br(o.abrigo.comprimento_m)} m`,
  ].filter(Boolean);
  const botao = (k, texto) => (
    <button type="button" onClick={() => alternar(k)} style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '8px 0 4px' }}>
      {aberto[k] ? '▾' : '▸'} {texto}
    </button>
  );
  return (
    <div style={{ marginBottom: 14 }} data-testid="objetivo-arquivo">
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto-1)' }}>
        {o.titulo || o.tipoRotulo || o.tipo || 'Projeto'}
        <span style={{ fontWeight: 400, color: 'var(--texto-3)', fontSize: 12 }}> — {arquivo}</span>
      </div>
      <div style={pequeno}>
        Disciplina: <b>{o.disciplina || '—'}</b> · tipo: <b>{o.tipoRotulo || o.tipo || '—'}</b> · confiança {CONFIANCA(o.confianca)}
        {destaques.length > 0 && <> · {destaques.join(' · ')}</>}
        {o.camadasDeContexto > 0 && <> · {o.camadasDeContexto} camada(s) de base de outro projeto ignoradas</>}
      </div>
      {(o.evidencias || []).length > 0 && <div style={pequeno}>Por quê: {o.evidencias.slice(0, 4).join('; ')}</div>}

      {botao('componentes', `Componentes do projeto (${comps.length}${nConferir ? `, ${nConferir} a conferir` : ''})`)}
      {aberto.componentes && comps.map((c, i) => (
        <div key={c.id || i} style={linha}>
          <div>
            {c.item != null && <b style={{ color: '#c9a227' }}>{String(c.item).replace(/^RELA[ÇC][ÃA]O DE MATERIAIS\s*/i, '')} · </b>}
            {c.descricao}
          </div>
          <div style={pequeno}>
            {c.quantidade != null ? `${br(c.quantidade, Number.isInteger(Number(c.quantidade)) ? 0 : 2)} ${c.unidade || ''}` : <span style={conferir}>quantidade não escrita [CONFERIR]</span>}
            {' · '}fonte: {FONTE[c.fonte] || c.fonte}
            {c.conferir && c.quantidade != null && <span style={conferir}> · [CONFERIR]</span>}
            {c.motivo && <> · {c.motivo}</>}
          </div>
        </div>
      ))}

      {botao('vistas', `Vistas da folha (${vistas.length})`)}
      {aberto.vistas && porPapel.map(([papel, lista]) => (
        <div key={papel} style={{ ...linha, borderTop: 'none' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{PAPEL[papel]} — {lista.length}</div>
          <div style={pequeno}>
            {lista.slice(0, 25).map(v => `${v.titulo || v.tipo || v.id}${v.escala ? ` (escala pelas cotas: 1 un. = ${br(v.escala.fator)} m)` : ''}`).join(' · ')}
            {lista.length > 25 ? ` · e mais ${lista.length - 25}` : ''}
          </div>
        </div>
      ))}

      {legendas.length > 0 && botao('legendas', `Legendas lidas (${legendas.length})`)}
      {aberto.legendas && legendas.map((l, i) => (
        <div key={i} style={linha}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{l.titulo || 'lista sem título'} <span style={pequeno}>({l.itens.length} itens{l.doObjetivo ? '' : ', fora do objetivo'})</span></div>
          {(l.faltando || []).length > 0 && <div style={conferir}>Itens que não estão no desenho: {l.faltando.join(', ')} [CONFERIR]</div>}
          <div style={pequeno}>{l.itens.slice(0, 40).map(it => `${it.numero != null ? `${it.numero} ` : ''}${it.descricao}`).join(' · ')}</div>
        </div>
      ))}

      {(o.avisos || []).length > 0 && botao('avisos', `Avisos da leitura (${o.avisos.length})`)}
      {aberto.avisos && o.avisos.map((a, i) => <div key={i} style={{ ...linha, ...(/\[CONFERIR\]/.test(a) ? { color: '#e0a030' } : {}) }}>{a}</div>)}
    </div>
  );
}

export default function ObjetivoDoProjeto({ analise, estiloCartao, estiloTitulo }) {
  const lista = (analise?.dadosExtraidos || []).filter(e => e && e.objetivo);
  if (!lista.length) return null;
  return (
    <div style={estiloCartao} data-testid="cartao-objetivo">
      <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} /> O que é o projeto</h3>
      <p style={{ ...pequeno, marginBottom: 10 }}>
        O que a leitura do desenho entendeu: a disciplina e o tipo do projeto, as vistas que valem (as de outro projeto colado na folha ficam de fora),
        e os componentes com o nome e as características tirados da relação de materiais e das legendas. O que o projeto não escreve fica
        marcado [CONFERIR] — nada é inventado.
      </p>
      {lista.map((e, i) => <Objetivo key={i} arquivo={e.arquivo} o={e.objetivo} />)}
    </div>
  );
}
