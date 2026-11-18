// Projeto sugerido pelo sistema (versão 2.45, 18/11/2026; 2.46: pé-direito/níveis por pavimento, prancha por pavimento,
// disciplinas novas e critérios do engenheiro) e os pavimentos lidos na arquitetura.
//
// Pedido do usuário: "quando for pedido para elaborar um projeto, não quero que o sistema apenas suponha a quantidade;
// preciso que seja tudo sugerido dentro do arquivo carregado — cada ponto, infraestrutura, cabeamento" e "o sistema não
// enxerga os pavimentos, vê tudo como um só". Aqui a tela mostra, POR PAVIMENTO, o que o projetista do sistema
// (skills/_comum/cad/projetista.js) pôs em cada ambiente e por quê, a infraestrutura e os cabos medidos, os critérios
// adotados e só os avisos que pedem ação ([CONFERIR]). A posição de cada componente está no 3D (Editar no 3D) e na
// prancha DXF/PDF de cada pavimento.
// Fonte: dadosExtraidos[i].projeto_sugerido e analise.ambientes[].pavimento (services/analiseCad). Os pontos vêm
// agrupados (n = quantidade) desde a 2.46; os da 2.45 (sem n) contam 1 cada.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Layers, RefreshCw, Wand2 } from 'lucide-react';
import CriteriosProjeto, { criteriosDoProjeto, criteriosParaEnvio } from './CriteriosProjeto';
import { baixarPranchaSugerida } from '../../services/api';
import { baixarArquivo, mensagemDeErro } from '../../utils/download';

const NOME_DISC = {
  cftv: 'CFTV', rede: 'Cabeamento estruturado', incendio: 'Detecção e alarme de incêndio', alarme: 'Alarme de intrusão',
  eletrica: 'Elétrica predial', iluminacao: 'Iluminação', controle_acesso: 'Controle de acesso', telefonia: 'Telefonia / interfonia',
  antena: 'Antena coletiva / TV', spda: 'SPDA',
};
const pequeno = { fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6 };
const conferir = { color: '#e0a030' };
const br = (v, c = 1) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const ordemDoTexto = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
const qtd = (p) => Number(p.n) || 1;
const botaoLink = { background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 };

function marcarConferir(texto) {
  const partes = String(texto).split(/(\[CONFERIR[^\]]*\])/);
  return partes.map((p, i) => (/^\[CONFERIR/.test(p) ? <b key={i} style={conferir}>{p}</b> : <span key={i}>{p}</span>));
}

const sinal = (v) => (v > 0 ? `+${br(v, 2)}` : br(v, 2));

// Um arquivo: os pavimentos em abas; em cada um, o quanto de cada componente e, ambiente a ambiente, o porquê
function Sugerido({ arquivo, s, analiseId, onRegerar }) {
  const pavimentos = s.pavimentos || [];
  const [pav, setPav] = useState(pavimentos[0] || null);
  const [aberto, setAberto] = useState({ ambientes: true, criterios: false, regerar: false });
  const [criterios, setCriterios] = useState(() => criteriosDoProjeto(s.criteriosUsados));
  const [ocupado, setOcupado] = useState('');
  const pontos = (s.pontos || []).filter(p => !pav || p.pavimento === pav);
  // componente × quantidade no pavimento (pelo rótulo: "Câmera dome", "Detector de fumaça"…)
  const porTipo = new Map();
  for (const p of pontos) { const k = `${p.disciplina}|${p.rotulo}`; porTipo.set(k, (porTipo.get(k) || 0) + qtd(p)); }
  // ambiente → componentes e motivos
  const porAmb = new Map();
  for (const p of pontos) {
    const a = porAmb.get(p.ambiente) || porAmb.set(p.ambiente, { itens: new Map(), motivos: new Set() }).get(p.ambiente);
    a.itens.set(p.rotulo, (a.itens.get(p.rotulo) || 0) + qtd(p));
    if (p.motivo) a.motivos.add(p.motivo);
  }
  const ambsDoPav = (s.ambientes || []).filter(a => !pav || a.pavimento === pav);
  const semNada = ambsDoPav.filter(a => !porAmb.has(a.nome));
  const info = (s.pavimentosInfo || []).find(p => p.nome === pav);
  const total = (s.pontos || []).reduce((t, p) => t + qtd(p), 0);
  const botao = (k, texto) => (
    <button type="button" onClick={() => setAberto(x => ({ ...x, [k]: !x[k] }))} style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '8px 0 4px' }}>
      {aberto[k] ? '▾' : '▸'} {texto}
    </button>
  );
  async function prancha(formato) {
    if (!analiseId) return;
    setOcupado(formato);
    try {
      await baixarArquivo(baixarPranchaSugerida(analiseId, pav || '', formato), `Projeto sugerido - ${pav || 'planta'}.${formato}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui gerar a prancha'), { duration: 9000 });
    } finally { setOcupado(''); }
  }
  async function regerar() {
    setOcupado('regerar');
    try { await onRegerar(criteriosParaEnvio(criterios)); } finally { setOcupado(''); }
  }
  if (s.erro) return <div style={{ ...pequeno, ...conferir }}>{arquivo}: {s.erro}</div>;
  return (
    <div style={{ marginBottom: 16 }} data-testid="projeto-sugerido-arquivo">
      <div style={pequeno}>
        <b style={{ color: 'var(--texto-1)' }}>{br(s.componentes ?? total, 0)}</b> componente(s) de {(s.disciplinas || []).map(d => NOME_DISC[d] || d).join(', ')} em {pavimentos.length} pavimento(s)
        {s.retirados > 0 && <> · {s.retirados} retirado(s) por você</>} — <span style={{ color: 'var(--texto-3)' }}>{arquivo}</span>
      </div>
      {pavimentos.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }} role="tablist">
          {pavimentos.map(p => (
            <button key={p} type="button" role="tab" aria-selected={p === pav} onClick={() => setPav(p)} data-testid="aba-pavimento"
              style={{ background: p === pav ? '#c9a227' : '#161616', color: p === pav ? '#111' : 'var(--texto-2)', border: '1px solid #2a2a2a', borderRadius: 6, padding: '5px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              {p} <span style={{ fontWeight: 400 }}>({br((s.pontos || []).filter(q => q.pavimento === p).reduce((t, q) => t + qtd(q), 0), 0)})</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0' }}>
        <span style={pequeno} data-testid="info-pavimento">
          {info ? (
            <>
              {info.nivel_m != null && <>Nível do piso {sinal(info.nivel_m)} · </>}
              Pé-direito {br(info.pe_direito_m, 2)} m {info.pe_direito_lido ? '(pelas cotas lidas)' : '(adotado)'}
              {info.metodo && info.metodo !== 'referência' && <> · alinhado ao prédio {marcarConferir(info.metodo)}</>}
            </>
          ) : null}
        </span>
        {analiseId && (
          <span style={{ display: 'inline-flex', gap: 12 }}>
            <button type="button" style={botaoLink} disabled={!!ocupado} onClick={() => prancha('dxf')} data-testid="prancha-dxf"><Download size={12} /> {ocupado === 'dxf' ? 'Gerando…' : `Prancha DXF${pav ? ` — ${pav}` : ''}`}</button>
            <button type="button" style={botaoLink} disabled={!!ocupado} onClick={() => prancha('pdf')} data-testid="prancha-pdf"><Download size={12} /> {ocupado === 'pdf' ? 'Gerando…' : 'PDF'}</button>
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 4 }}>
        <thead><tr style={{ color: 'var(--texto-3)', textAlign: 'left' }}><th style={{ padding: '4px 0' }}>Componente{pav ? ` — ${pav}` : ''}</th><th style={{ textAlign: 'right' }}>Qtd</th></tr></thead>
        <tbody>
          {[...porTipo].sort((a, b) => ordemDoTexto(a[0], b[0])).map(([k, n]) => {
            const [d, rotulo] = k.split('|');
            return <tr key={k} style={{ borderTop: '1px solid #1e1e1e' }}><td style={{ padding: '5px 0' }}>{rotulo} <span style={pequeno}>· {NOME_DISC[d] || d}</span></td><td style={{ textAlign: 'right', fontWeight: 700 }}>{n}</td></tr>;
          })}
        </tbody>
      </table>

      {botao('ambientes', `Ambiente a ambiente (${porAmb.size} com componentes${semNada.length ? `, ${semNada.length} sem` : ''})`)}
      {aberto.ambientes && (
        <div>
          {[...porAmb].sort((a, b) => ordemDoTexto(a[0], b[0])).map(([amb, a]) => (
            <div key={amb} style={{ padding: '6px 0', borderTop: '1px solid #1e1e1e', fontSize: 13 }}>
              <b>{amb}</b>: {[...a.itens].map(([r, n]) => `${n} × ${r}`).join(' · ')}
              <div style={pequeno}>{[...a.motivos].slice(0, 3).map((m, i) => <div key={i}>— {marcarConferir(m)}</div>)}</div>
            </div>
          ))}
          {semNada.length > 0 && (
            <div style={{ ...pequeno, paddingTop: 6 }}>
              Sem componente: {semNada.map(a => `${a.nome} (${a.rotuloTipo || a.tipo}${a.residencial ? ', residência' : ''})`).sort(ordemDoTexto).join(' · ')}
            </div>
          )}
        </div>
      )}

      {(s.metragens || []).length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 12 }}>Infraestrutura e cabos (todos os pavimentos, medidos pelo traçado)</div>
          {(s.metragens || []).map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '1px solid #1e1e1e' }}>
              <span>{m.descricao} <span style={pequeno}>· {NOME_DISC[m.disciplina] || m.disciplina}</span></span><b>{br(m.metros)} m</b>
            </div>
          ))}
          {s.cabo_max_m != null && <div style={pequeno}>Maior cabo: {br(s.cabo_max_m)} m.</div>}
        </>
      )}

      {(s.avisos || []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          {(s.avisos || []).map((a, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--texto-2)', padding: '3px 0' }}>⚠ {marcarConferir(a)}</div>)}
        </div>
      )}
      {botao('criterios', 'Critérios adotados')}
      {aberto.criterios && (s.criterios || []).map((c, i) => <div key={i} style={pequeno}>• {marcarConferir(c)}</div>)}
      {onRegerar && (
        <div>
          {botao('regerar', 'Mudar os critérios e gerar de novo')}
          {aberto.regerar && (
            <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, marginTop: 4 }} data-testid="regerar-projeto">
              <CriteriosProjeto valor={criterios} onChange={setCriterios} disciplinas={s.disciplinas || []}
                ambientes={[...new Set((s.ambientes || []).map(a => ((s.pavimentos || []).length > 1 ? `${a.nome} (${a.pavimento})` : a.nome)))].sort(ordemDoTexto)} />
              <button type="button" onClick={regerar} disabled={!!ocupado} data-testid="gerar-de-novo"
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#c9a227', color: '#111', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                <RefreshCw size={13} /> {ocupado === 'regerar' ? 'Gerando o projeto…' : 'Gerar de novo com estes critérios'}
              </button>
              <span style={{ ...pequeno, marginLeft: 8 }}>Cria uma análise nova; esta continua salva.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjetoSugerido({ analise, estiloCartao, estiloTitulo, onVer3d, onRegerar }) {
  const lista = (analise?.dadosExtraidos || []).filter(e => e && e.projeto_sugerido);
  if (!lista.length) return null;
  return (
    <div style={estiloCartao} data-testid="projeto-sugerido">
      <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 6 }}><Wand2 size={15} /> Projeto sugerido pelo sistema</h3>
      <div style={{ ...pequeno, marginBottom: 10 }}>
        Cada componente foi posto no ambiente da planta, pavimento por pavimento, pelo uso da sala e pela norma; a infraestrutura foi
        roteada pelas salas e portas e cada cabo medido pelo caminho. Confira e ajuste no 3D: <b>Editar no 3D</b> insere e retira componentes.
        {onVer3d && <> <button type="button" onClick={onVer3d} style={{ ...botaoLink, fontSize: 12 }}>Ver no 3D ↓</button></>}
      </div>
      {lista.map((e, i) => <Sugerido key={i} arquivo={e.arquivo} s={e.projeto_sugerido} analiseId={analise?.id} onRegerar={onRegerar} />)}
    </div>
  );
}

// Pavimentos e ambientes lidos da arquitetura (as duas finalidades): antes era uma lista só, como se fosse um pavimento
export function PavimentosDaAnalise({ analise, estiloCartao, estiloTitulo }) {
  const ambs = (analise?.ambientes || []).filter(a => a && a.pavimento);
  const [aberto, setAberto] = useState(null);
  if (!ambs.length) return null;
  const ordem = [];
  const dados = new Map();
  for (const e of analise.dadosExtraidos || []) for (const p of e?.pavimentos || []) { if (!ordem.includes(p.nome)) ordem.push(p.nome); if (!dados.has(p.nome)) dados.set(p.nome, p); }
  const nomes = [...new Set(ambs.map(a => a.pavimento))].sort((a, b) => (ordem.indexOf(a) === -1 ? 99 : ordem.indexOf(a)) - (ordem.indexOf(b) === -1 ? 99 : ordem.indexOf(b)));
  if (nomes.length < 2 && !ambs.some(a => a.area_divergente)) return null;
  return (
    <div style={estiloCartao} data-testid="pavimentos-analise">
      <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={15} /> Pavimentos e ambientes</h3>
      {nomes.map(n => {
        const lista = ambs.filter(a => a.pavimento === n).sort((a, b) => ordemDoTexto(a.nome, b.nome));
        const area = lista.reduce((s, a) => s + (Number(a.area_projeto_m2) || Number(a.area_m2) || 0), 0);
        const divergentes = lista.filter(a => a.area_divergente).length;
        const d = dados.get(n);
        return (
          <div key={n} style={{ borderTop: '1px solid #1e1e1e', padding: '6px 0' }}>
            <button type="button" onClick={() => setAberto(aberto === n ? null : n)} style={{ background: 'none', border: 'none', color: 'var(--texto-1)', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
              {aberto === n ? '▾' : '▸'} {n}
            </button>
            <span style={pequeno}> — {lista.length} ambiente(s), {br(area, 0)} m²
              {d?.nivel_m != null && <> · nível {sinal(d.nivel_m)}</>}{d?.pe_direito_m != null && <> · pé-direito {br(d.pe_direito_m, 2)} m</>}
              {divergentes ? <> · <span style={conferir}>{divergentes} com a área lida diferente da escrita [CONFERIR]</span></> : null}</span>
            {aberto === n && (
              <div style={{ ...pequeno, paddingLeft: 14 }}>
                {lista.map((a, i) => (
                  <div key={i}>{a.nome} — {br(a.area_projeto_m2 || a.area_m2, 2)} m²{a.area_divergente && <span style={conferir}> (lida pelas paredes: {br(a.area_m2, 2)} m²)</span>}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ProjetoSugerido;
