// Compatibilização por posição entre os DWG/DXF da análise (versão 2.3):
// componentes próximos demais entre disciplinas, no mesmo ponto, e traçados de
// energia × telecomunicações no mesmo caminho — com o DXF para conferir no AutoCAD.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Layers } from 'lucide-react';
import { baixarCompatibilizacaoDxf } from '../../services/api';

const br = (v, c = 2) => Number(v).toFixed(c).replace('.', ',');
const NOME_DISC = { eletrica: 'Elétrica', iluminacao: 'Iluminação', incendio: 'Incêndio', cftv: 'CFTV', cabeamento: 'Cabeamento', rede: 'Rede', alarme: 'Alarme', telefonia: 'Telefonia', antena: 'Antena', controle_acesso: 'Controle de acesso', automacao: 'Automação' };
const lado = (l) => `${String(l.descricao || '').replace(/ — bloco .*/, '')} · ${l.disciplina ? (NOME_DISC[l.disciplina] || l.disciplina) : 'climatização/hidráulica'}`;

export default function ConflitosCompatibilizacao({ analise, estiloCartao, estiloTitulo }) {
  const [baixando, setBaixando] = useState(false);
  const [todos, setTodos] = useState(false);
  const conflitos = analise.conflitos || [];
  const comp = analise.compatibilizacao;
  if (!comp && !conflitos.length) return null;

  const porTema = conflitos.reduce((m, c) => { m[c.tema] = (m[c.tema] || 0) + 1; return m; }, {});
  const visiveis = todos ? conflitos : conflitos.slice(0, 40);
  const alinhados = (comp?.grupos || []).flatMap(g => g.membros).length;

  async function baixarDxf() {
    setBaixando(true);
    try {
      const r = await baixarCompatibilizacaoDxf(analise.id);
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(r.headers['x-nome-arquivo'] || 'Compatibilização.dxf');
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Erro ao gerar o DXF da compatibilização';
      try { msg = JSON.parse(await err.response.data.text()).erro || msg; } catch { /* sem corpo JSON */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div style={estiloCartao} data-testid="cartao-conflitos">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, flex: 1 }}>
          <Layers size={16} /> Compatibilização entre disciplinas (posição nos DWG/DXF)
        </h3>
        {comp?.referencia && (
          <button type="button" onClick={baixarDxf} disabled={baixando} style={btn} title="Arquitetura de referência em cinza e cada conflito marcado em vermelho (traçados em magenta), com a lista numerada — mesmas coordenadas da referência">
            <FileDown size={13} style={{ marginRight: 5 }} /> {baixando ? 'Gerando…' : 'Baixar DXF da compatibilização'}
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', lineHeight: 1.6 }}>
        {comp?.referencia ? <>Referência: <b style={{ color: '#ccc' }}>{comp.referencia}</b> — {alinhados} desenho(s) alinhado(s) pelos ambientes de mesmo nome. </> : null}
        As distâncias são critérios adotados pela H&M (cada achado diz qual) — confira na norma e no manual do equipamento.
      </p>
      {!conflitos.length ? (
        <p style={{ fontSize: 13, color: '#3fb95f', margin: 0 }}>Nenhum conflito de posição encontrado entre os desenhos.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {Object.entries(porTema).map(([t, n]) => <span key={t} style={selo}>{t}: <b>{n}</b></span>)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid #222' }}>
                  <th style={th}>#</th><th style={th}>Conflito</th><th style={th}>Ambiente</th><th style={th}>Componente / traçado</th><th style={th}>Com</th><th style={{ ...th, textAlign: 'right' }}>Distância</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }} title={c.criterio}>
                    <td style={{ ...td, color: '#e05555', fontWeight: 700 }}>{i + 1}</td>
                    <td style={td}>{c.tema}</td>
                    <td style={td}>{c.ambiente || '—'}</td>
                    <td style={td}>{lado(c.a)}<div style={{ color: '#666', fontSize: 11 }}>{c.a.arquivo}</div></td>
                    <td style={td}>{lado(c.b)}<div style={{ color: '#666', fontSize: 11 }}>{c.b.arquivo}</div></td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{c.distancia != null ? `${br(c.distancia)} m (mín. ${br(c.minimo)})` : c.metros != null ? `${br(c.metros, 1)} m juntos` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {conflitos.length > 40 && (
            <button type="button" style={{ ...btn, marginTop: 8 }} onClick={() => setTodos(v => !v)}>{todos ? 'Mostrar menos' : `Mostrar todos (${conflitos.length})`}</button>
          )}
        </>
      )}
    </div>
  );
}

const btn = { display: 'flex', alignItems: 'center', padding: '7px 12px', background: 'transparent', border: '1px solid #5a2a2a', borderRadius: 6, color: '#f19999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
const th = { padding: '6px 8px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px' };
const td = { padding: '6px 8px', verticalAlign: 'top', color: '#ccc' };
const selo = { fontSize: 12, color: '#ddd', background: '#2a1717', border: '1px solid #5a2a2a', borderRadius: 12, padding: '3px 10px' };
