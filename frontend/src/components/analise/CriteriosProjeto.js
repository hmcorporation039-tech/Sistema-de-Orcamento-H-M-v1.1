// Critérios do projeto sugerido pelo sistema (versão 2.46, 18/11/2026) — "deixar o engenheiro definir os critérios antes
// de gerar". O mesmo bloco no envio da análise de ELABORAÇÃO e no cartão do projeto sugerido ("gerar de novo com estes
// critérios"). Nada aqui é número de norma: são escolhas de projeto (a norma fica no projetista —
// skills/_comum/cad/projetista.js, criteriosDe). Vazio/padrão = o que o sistema já fazia.
import Select from '../Select';

export const CRITERIOS_PADRAO = { densidadeCftv: 'padrao', cftvExterno: true, ptz: true, incendio: 'total', redePor10m2: 2, classeSpda: 'III', peDireito: '', excluir: [] };

// o que vai para o backend (só o que difere do padrão não precisa ir, mas mandar tudo é inofensivo)
export function criteriosParaEnvio(c = {}) {
  const v = { ...CRITERIOS_PADRAO, ...c };
  const pd = Number(String(v.peDireito ?? '').replace(',', '.'));
  return {
    densidadeCftv: v.densidadeCftv, cftvExterno: !!v.cftvExterno, ptz: !!v.ptz, incendio: v.incendio,
    redePor10m2: Number(v.redePor10m2) || 2, classeSpda: v.classeSpda,
    ...(pd > 0 ? { peDireito: pd } : {}),
    excluir: (Array.isArray(v.excluir) ? v.excluir : String(v.excluir || '').split(/[\n;]+/)).map(s => String(s).trim()).filter(Boolean),
  };
}

// criteriosUsados que voltam da análise (excluir já é lista; peDireito null) → estado do formulário
export function criteriosDoProjeto(usados) {
  if (!usados) return { ...CRITERIOS_PADRAO };
  return { ...CRITERIOS_PADRAO, ...usados, peDireito: usados.peDireito ? String(usados.peDireito).replace('.', ',') : '', excluir: usados.excluir || [] };
}

const rotulo = { fontSize: 12, color: 'var(--texto-3)', display: 'block', marginBottom: 3 };
const campo = { display: 'flex', flexDirection: 'column', minWidth: 0 };

// valor/onChange: o objeto de critérios; disciplinas: as marcadas (mostra só o que importa a elas; vazio = tudo);
// ambientes: nomes para a lista "fora do projeto" (sugestões)
export default function CriteriosProjeto({ valor, onChange, disciplinas = [], ambientes = [] }) {
  const c = { ...CRITERIOS_PADRAO, ...(valor || {}) };
  const muda = (k, v) => onChange({ ...c, [k]: v });
  const tem = (...ds) => !disciplinas.length || ds.some(d => disciplinas.includes(d));
  const excluirTexto = Array.isArray(c.excluir) ? c.excluir.join('\n') : String(c.excluir || '');
  return (
    <div data-testid="criterios-projeto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, alignItems: 'start' }}>
      {tem('cftv') && (
        <div style={campo}>
          <label style={rotulo} htmlFor="crit-densidade">Câmeras (CFTV)</label>
          <Select id="crit-densidade" value={c.densidadeCftv} onChange={e => muda('densidadeCftv', e.target.value)}>
            <option value="economica">Econômica (≈ 60 % do padrão)</option>
            <option value="padrao">Padrão</option>
            <option value="reforcada">Reforçada (≈ 150 % do padrão)</option>
          </Select>
          <label style={{ fontSize: 12, marginTop: 6 }}><input type="checkbox" checked={!!c.cftvExterno} onChange={e => muda('cftvExterno', e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />Câmeras nas áreas externas</label>
          <label style={{ fontSize: 12 }}><input type="checkbox" checked={!!c.ptz} onChange={e => muda('ptz', e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />PTZ nos espaços grandes</label>
        </div>
      )}
      {tem('incendio') && (
        <div style={campo}>
          <label style={rotulo} htmlFor="crit-incendio">Detecção de incêndio</label>
          <Select id="crit-incendio" value={c.incendio} onChange={e => muda('incendio', e.target.value)}>
            <option value="total">Cobertura total (todo ambiente fechado)</option>
            <option value="rotas">Só rotas de fuga e áreas de risco</option>
          </Select>
          {c.incendio === 'rotas' && <span style={{ ...rotulo, color: '#e0a030', marginTop: 4 }}>Confira na IT do Corpo de Bombeiros onde a detecção é exigida.</span>}
        </div>
      )}
      {tem('rede', 'cabeamento') && (
        <div style={campo}>
          <label style={rotulo} htmlFor="crit-rede">Tomadas de rede por área de trabalho (10 m²)</label>
          <Select id="crit-rede" value={String(c.redePor10m2)} onChange={e => muda('redePor10m2', Number(e.target.value))}>
            <option value="2">2 tomadas (mínimo da NBR 14565)</option>
            <option value="3">3 tomadas</option>
            <option value="4">4 tomadas</option>
          </Select>
        </div>
      )}
      {tem('spda') && (
        <div style={campo}>
          <label style={rotulo} htmlFor="crit-spda">SPDA — nível de proteção</label>
          <Select id="crit-spda" value={c.classeSpda} onChange={e => muda('classeSpda', e.target.value)}>
            <option value="I">Nível I (malha 5 m, descidas a cada 10 m)</option>
            <option value="II">Nível II (malha 10 m, descidas a cada 10 m)</option>
            <option value="III">Nível III (malha 15 m, descidas a cada 15 m)</option>
            <option value="IV">Nível IV (malha 20 m, descidas a cada 20 m)</option>
          </Select>
          <span style={{ ...rotulo, marginTop: 4 }}>Quem define é a análise de risco (NBR 5419-2).</span>
        </div>
      )}
      <div style={campo}>
        <label style={rotulo} htmlFor="crit-pd">Pé-direito (m)</label>
        <input id="crit-pd" inputMode="decimal" value={c.peDireito ?? ''} onChange={e => muda('peDireito', e.target.value)} placeholder="vazio: lido das cotas de cada pavimento" />
      </div>
      <div style={{ ...campo, gridColumn: '1 / -1' }}>
        <label style={rotulo} htmlFor="crit-excluir">Ambientes fora do projeto (um por linha — ex.: "CASA PAROQUIAL" ou "SALA - 02 (Térreo)")</label>
        <textarea id="crit-excluir" rows={2} value={excluirTexto} onChange={e => muda('excluir', e.target.value.split('\n'))} style={{ resize: 'vertical' }} />
        {ambientes.length > 0 && (
          <span style={{ ...rotulo, marginTop: 4 }}>
            Ambientes lidos: {ambientes.slice(0, 40).join(' · ')}{ambientes.length > 40 ? ' …' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
