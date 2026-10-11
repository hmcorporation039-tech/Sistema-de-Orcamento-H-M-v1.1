// Painel de resultado do cálculo de SPDA (resumo devolvido por /laudos/:id/calcular)

const exp = (v) => (v == null ? '—' : v === 0 ? '0' : v.toExponential(2).replace('.', ',').replace(/e([+-])(\d)$/, 'e$10$2'));
const num = (v, c = 1) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

function Indicador({ rotulo, valor, ok, detalhe }) {
  const cor = ok === undefined ? '#c9a227' : ok ? '#3fb95f' : '#e05050';
  return (
    <div style={{ background: '#0f0f0f', border: `1px solid ${ok === undefined ? '#222' : cor}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor }}>{valor}</div>
      {detalhe && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{detalhe}</div>}
    </div>
  );
}

export default function ResultadoSpda({ resumo }) {
  if (!resumo) return null;
  const { risco: r, dimensionamento: d, inspecao: i } = resumo;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 14 }}>
        {r && <Indicador rotulo="Risco R1 (tolerável 1e-05)" valor={exp(r.R1)} ok={r.atendeR1} detalhe={r.atendeR1 ? 'atende' : 'não atende'} />}
        {r?.piorF && <Indicador rotulo={`Frequência de danos F (FT ${num(r.piorF.FT)})`} valor={exp(r.piorF.F)} ok={r.atendeF} detalhe={r.piorF.zona.slice(0, 40)} />}
        {r && <Indicador rotulo="NG (Tabela F.1)" valor={num(r.ng)} detalhe={`ND ${exp(r.ND)} · NM ${exp(r.NM)}`} />}
        {d && <Indicador rotulo={`Descidas (NP ${d.np})`} valor={d.descidas.quantidade} detalhe={`espaçamento médio ${num(d.descidas.espacamento)} m`} />}
        {d && <Indicador rotulo="Malha de captação" valor={`${num(d.malha.comprimento, 0)} m`} detalhe={`${d.malha.divisoes.join(' × ')} módulos de ${d.malha.modulo.map(m => num(m, 2)).join(' × ')} m`} />}
        {d && <Indicador rotulo="Anel de aterramento" valor={`${num(d.aterramento.anel, 0)} m`} ok={d.aterramento.atende === null ? undefined : d.aterramento.atende} detalhe={`re ${num(d.aterramento.re)} m · l1 ${d.aterramento.l1 ?? '? (resistividade)'} m`} />}
        {i && <Indicador rotulo="Parecer" valor={rotuloParecer(i.parecer.situacao)} ok={i.parecer.situacao === 'CONFORME' ? true : i.parecer.situacao === 'INCONCLUSIVO' ? undefined : false} detalhe={`C ${i.parecer.cont.C} · NC ${i.parecer.cont.NC} · NA ${i.parecer.cont.NA} · NV ${i.parecer.cont.NV}`} />}
      </div>

      {r && (
        <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.7, marginBottom: 12 }}>
          {r.atendeR1 && r.atendeF
            ? <span style={{ color: '#3fb95f' }}>Com as medidas consideradas, o risco e a frequência de danos atendem à NBR 5419-2:2026.</span>
            : r.menorQueAtende
              ? <span><b style={{ color: '#e0a030' }}>Menor solução que atende:</b> {r.menorQueAtende.rotulo} (R1 = {exp(r.menorQueAtende.R1)}). {r.cenariosQueAtendem} combinação(ões) da varredura atendem.</span>
              : <span style={{ color: '#e05050' }}>Nenhuma combinação atende: informar o proprietário e adotar o NP mais alto (NBR 5419-2, 5.4.6).</span>}
          <span style={{ color: '#777' }}> · Sem qualquer proteção: R1 = {exp(r.semProtecao)}</span>
        </div>
      )}

      {r && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
          <thead>
            <tr style={{ color: '#777', fontSize: 10, textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '4px 6px 6px 0' }}>Zona</th>
              {['RA', 'RB', 'RC', 'RM', 'RU', 'RV', 'RW', 'RZ'].map(k => <th key={k} style={{ padding: '4px 6px 6px 0' }}>{k}</th>)}
              <th style={{ padding: '4px 6px 6px 0' }}>R1 zona</th><th style={{ padding: '4px 0 6px' }}>F</th>
            </tr>
          </thead>
          <tbody>
            {r.zonas.map(z => (
              <tr key={z.nome} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={{ padding: '5px 6px 5px 0', color: '#ccc' }}>{z.nome}</td>
                {['RA', 'RB', 'RC', 'RM', 'RU', 'RV', 'RW', 'RZ'].map(k => <td key={k} style={{ padding: '5px 6px 5px 0', color: '#999' }}>{exp(z.comp[k])}</td>)}
                <td style={{ padding: '5px 6px 5px 0', color: '#c9a227', fontWeight: 700 }}>{exp(z.R1)}</td>
                <td style={{ padding: '5px 0', color: '#999' }}>{z.F == null ? '—' : exp(z.F)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {i?.ncs?.length > 0 && (
        <div style={{ fontSize: 12, color: '#bbb', marginBottom: 6 }}>
          <b style={{ color: '#c9a227' }}>Não conformidades consolidadas:</b>{' '}
          {i.ncs.map(n => `${n.id} (${n.item}, ${n.prioridade})`).join(' · ')}
        </div>
      )}
      {i && <div style={{ fontSize: 12, color: '#888' }}>{i.parecer.texto}. Próxima inspeção periódica: a cada {i.intervaloAnos} ano(s).</div>}
    </div>
  );
}

function rotuloParecer(s) {
  return { CONFORME: 'Conforme', NAO_CONFORME: 'Não conforme', NAO_CONFORME_PRELIMINAR: 'Não conforme (prelim.)', INCONCLUSIVO: 'Inconclusivo' }[s] || s;
}
