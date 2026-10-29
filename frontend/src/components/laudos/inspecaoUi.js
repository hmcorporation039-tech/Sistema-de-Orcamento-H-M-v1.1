import { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Nota, btnAdicionar, estiloInput } from './campos';
import Select from '../Select';

// Peças de inspeção compartilhadas por todas as disciplinas: checklist com
// situação/observação/prioridade e registro fotográfico com upload.

const SITUACOES = [['NV', 'NV — não verificado'], ['C', 'C — conforme'], ['NC', 'NC — não conforme'], ['NA', 'NA — não aplicável']];
const PRIORIDADES = [['P1', 'P1 — 48 h'], ['P2', 'P2 — 30 dias'], ['P3', 'P3 — 90 dias'], ['P4', 'P4 — manutenção']];

function corSituacao(s) {
  return { C: '#16301c', NC: '#3a1717', NA: '#222', NV: '#2f2a12' }[s || 'NV'];
}

export function resumoChecklist(lista) {
  const c = { C: 0, NC: 0, NA: 0 };
  (lista || []).forEach(i => { if (c[i.situacao] !== undefined) c[i.situacao]++; });
  return `C ${c.C} · NC ${c.NC} · NA ${c.NA}`;
}

// lista: itens da obra [{ cod, situacao, obs, foto, prioridade }]; onChange(novaLista)
export function ChecklistEditor({ base, lista, onChange }) {
  const secoes = [...new Set((base || []).map(b => b.secao))];
  const setItem = (b, campo, valor) => {
    const atual = [...(lista || [])];
    const idx = atual.findIndex(c => c.cod === b.cod);
    const novo = { cod: b.cod, situacao: 'NV', prioridade: b.prioridade_padrao, ...(idx >= 0 ? atual[idx] : {}), [campo]: valor };
    if (idx >= 0) atual[idx] = novo; else atual.push(novo);
    onChange(atual);
  };
  return (
    <div>
      {secoes.map(secao => (
        <div key={secao} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', margin: '6px 0' }}>{secao}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {(base || []).filter(b => b.secao === secao).map(b => {
                const item = (lista || []).find(c => c.cod === b.cod) || {};
                return (
                  <tr key={b.cod} style={{ borderTop: '1px solid #1c1c1c' }}>
                    <td style={{ padding: '5px 6px 5px 0', width: 44, color: '#c9a227', fontWeight: 700 }}>{b.cod}</td>
                    <td style={{ padding: '5px 6px 5px 0', color: '#ccc' }} title={`${b.requisito}\nOnde: ${b.onde || '—'}\nComo: ${b.como || '—'}`}>{b.item}</td>
                    <td style={{ padding: '5px 6px 5px 0', width: 150 }}>
                      <Select style={{ ...estiloInput, background: corSituacao(item.situacao) }} value={item.situacao || 'NV'} onChange={e => setItem(b, 'situacao', e.target.value)}>
                        {SITUACOES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                      </Select>
                    </td>
                    <td style={{ padding: '5px 6px 5px 0', width: '34%' }}><input style={estiloInput} placeholder="Observação" value={item.obs || ''} onChange={e => setItem(b, 'obs', e.target.value)} /></td>
                    <td style={{ padding: '5px 6px 5px 0', width: 90 }}><input style={estiloInput} placeholder="Fotos" value={item.foto || ''} onChange={e => setItem(b, 'foto', e.target.value)} /></td>
                    <td style={{ padding: '5px 0', width: 120 }}>
                      <Select style={estiloInput} value={item.prioridade || b.prioridade_padrao || 'P3'} onChange={e => setItem(b, 'prioridade', e.target.value)}>
                        {PRIORIDADES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// camposExtras(foto, alterar): campos a mais de uma disciplina, embaixo da
// descrição (o SPDA usa para categoria, ensaio, data/hora e GPS da foto)
export function FotosInspecao({ lista, fotos, urlsFotos, onChange, onEnviarFotos, onRemoverFoto, camposExtras }) {
  const entrada = useRef(null);
  const alterar = (i, campo, valor) => onChange(lista.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const idDaFoto = (f) => /^foto:(\d+)$/.exec(f.arquivo || '')?.[1];
  return (
    <div>
      <Nota>Envie as fotos da visita (JPG ou PNG). Cada foto recebe um código F-01, F-02… que você cita no checklist e nas não conformidades.</Nota>
      <input ref={entrada} type="file" accept="image/jpeg,image/png" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files.length) onEnviarFotos([...e.target.files]); e.target.value = ''; }} />
      <button style={{ ...btnAdicionar, marginBottom: 12 }} onClick={() => entrada.current?.click()}><Upload size={12} style={{ marginRight: 5 }} /> Enviar fotos</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {lista.map((f, i) => {
          const idFoto = idDaFoto(f);
          const existe = idFoto && (fotos || []).some(x => String(x.id) === idFoto);
          return (
            <div key={i} style={{ border: '1px solid #222', borderRadius: 7, padding: 8 }}>
              <div style={{ height: 150, background: '#0c0c0c', borderRadius: 5, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {existe && urlsFotos[idFoto]
                  ? <img src={urlsFotos[idFoto]} alt={f.descricao || f.id} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  : <span style={{ fontSize: 11, color: '#666' }}>{f.arquivo ? 'imagem não carregada' : 'sem arquivo'}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, marginBottom: 6 }}>
                <input style={estiloInput} value={f.id || ''} onChange={e => alterar(i, 'id', e.target.value)} />
                <input style={estiloInput} placeholder="Local" value={f.local || ''} onChange={e => alterar(i, 'local', e.target.value)} />
              </div>
              <input style={{ ...estiloInput, marginBottom: 6 }} placeholder="Subsistema" value={f.subsistema || ''} onChange={e => alterar(i, 'subsistema', e.target.value)} />
              <textarea rows={2} style={{ ...estiloInput, marginBottom: 6, resize: 'vertical' }} placeholder="Descrição" value={f.descricao || ''} onChange={e => alterar(i, 'descricao', e.target.value)} />
              {camposExtras && camposExtras(f, (campo, valor) => alterar(i, campo, valor))}
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={estiloInput} placeholder="Itens/NC relacionados" value={f.ref || ''} onChange={e => alterar(i, 'ref', e.target.value)} />
                <button title="Remover foto" style={{ ...btnAdicionar, color: '#b04040' }}
                  onClick={() => { if (idFoto) onRemoverFoto(Number(idFoto)); onChange(lista.filter((_, j) => j !== i)); }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
