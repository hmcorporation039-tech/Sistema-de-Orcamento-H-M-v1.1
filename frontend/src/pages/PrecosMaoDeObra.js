import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import toast from 'react-hot-toast';
import { Save, Search, ExternalLink, ChevronDown, ChevronRight, Square } from 'lucide-react';
import { getPrecosMaoDeObra, atualizarPrecosMaoDeObra, pesquisarReferenciaMaoDeObra } from '../services/api';

// Mesmos nomes de disciplina usados em Análise de Projeto — só pra exibição
// (agrupa visualmente), a chave que realmente importa é o código de cada item.
const NOMES_DISCIPLINA = {
  eletrica: 'Elétrica (infraestrutura)',
  rede: 'Redes de Computadores (dados)',
  cabeamento: 'Infra. de Cabeamento Estruturado',
  telefonia: 'Telefonia e interfonia',
  cftv: 'CFTV',
  iluminacao: 'Iluminação',
  automacao: 'Automação',
  alarme: 'Alarme',
  antena: 'Antena coletiva / TV',
  spda: 'SPDA (para-raios) — Laudos e projetos',
  carregador: 'Recarga de veículo elétrico — Laudos e projetos',
  incendio: 'Incêndio (detecção, alarme e iluminação de emergência)',
  solar: 'Usina solar fotovoltaica',
  controle_acesso: 'Controle de acesso',
  eletrica_hospitalar: 'Elétrica hospitalar',
  eletrica_industrial: 'Elétrica industrial',
  media_tensao: 'Média tensão / subestação',
};

// Dois segmentos de referência de MERCADO (além do valor adotado pela H&M)
const SEGMENTOS = [
  { chave: 'publico', rotulo: 'Oficial / governo', dica: 'SINAPI, ORSE, SICRO, tabelas de órgãos e preços de licitações — teto para cliente órgão público' },
  { chave: 'privado', rotulo: 'Privado / particular', dica: 'Preço praticado para residências, condomínios e empresas (prestadores, sindicatos, tabelas de honorários)' },
];

const moeda = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const data = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '');

export default function PrecosMaoDeObra() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterados, setAlterados] = useState({}); // codigo → { campo: valor }
  const [pesquisando, setPesquisando] = useState({}); // `${codigo}|${seg}` → true
  const [abertos, setAbertos] = useState(new Set());
  const [lote, setLote] = useState(null); // { disciplina, feitos, total }
  const pararLote = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getPrecosMaoDeObra();
      setItens(res.data);
      setAlterados({});
    } catch {
      toast.error('Erro ao carregar preços de referência');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function alterar(codigo, campo, valor) {
    setItens(lista => lista.map(it => (it.codigo === codigo ? { ...it, [campo]: valor } : it)));
    setAlterados(a => ({ ...a, [codigo]: { ...(a[codigo] || {}), [campo]: valor === '' ? null : valor } }));
  }

  async function salvar() {
    const lista = Object.entries(alterados).map(([codigo, campos]) => ({ codigo, ...campos }));
    if (!lista.length) { toast.error('Nenhuma alteração para salvar'); return; }
    setSalvando(true);
    try {
      await atualizarPrecosMaoDeObra(lista);
      toast.success('Preços de referência salvos');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  // pesquisa um serviço num segmento; devolve false se a pesquisa falhou
  async function pesquisar(it, seg, { silencioso = false } = {}) {
    const chave = `${it.codigo}|${seg}`;
    setPesquisando(p => ({ ...p, [chave]: true }));
    try {
      const r = await pesquisarReferenciaMaoDeObra(it.codigo, seg);
      setItens(lista => lista.map(x => (x.codigo === it.codigo ? { ...x, ...r.data.item } : x)));
      setAlterados(a => {
        const resto = { ...(a[it.codigo] || {}) };
        delete resto[`valor_${seg}`]; delete resto[`fonte_${seg}`];
        return { ...a, [it.codigo]: resto };
      });
      if (!silencioso) {
        if (r.data.encontrado) toast.success(`${SEGMENTOS.find(s => s.chave === seg).rotulo}: ${moeda(r.data.item[`valor_${seg}`])}${r.data.deCache ? ' (pesquisa recente)' : ''}`);
        else toast('Nenhuma referência equivalente encontrada — veja as fontes consultadas ou digite o valor.', { icon: 'ℹ️', duration: 6000 });
      }
      return true;
    } catch (err) {
      if (!silencioso || err.response?.status === 429) toast.error(err.response?.data?.erro || 'Erro na pesquisa', { duration: 8000 });
      return err.response?.status === 429 ? 'limite' : false;
    } finally {
      setPesquisando(p => { const n = { ...p }; delete n[chave]; return n; });
    }
  }

  // pesquisa, uma a uma, as referências que faltam numa disciplina (pode parar)
  async function pesquisarDisciplina(disciplina, lista) {
    const fila = lista.flatMap(it => SEGMENTOS.filter(s => it[`valor_${s.chave}`] == null).map(s => [it, s.chave]));
    if (!fila.length) { toast.success('Esta disciplina já tem as duas referências em todos os serviços'); return; }
    if (!window.confirm(`Pesquisar ${fila.length} referência(s) de mercado na web? Cada uma leva de 30 s a 1 min (limite de 40 pesquisas por hora).`)) return;
    pararLote.current = false;
    setLote({ disciplina, feitos: 0, total: fila.length });
    let falhas = 0;
    for (let i = 0; i < fila.length; i++) {
      if (pararLote.current) break;
      const r = await pesquisar(fila[i][0], fila[i][1], { silencioso: true });
      if (r === 'limite') break;
      if (!r) falhas++;
      setLote(l => l && { ...l, feitos: i + 1 });
    }
    setLote(null);
    toast.success(`Pesquisa da disciplina concluída${falhas ? ` (${falhas} sem resposta)` : ''}`);
  }

  const porDisciplina = {};
  for (const it of itens) {
    const chave = it.disciplina || 'outros';
    (porDisciplina[chave] = porDisciplina[chave] || []).push(it);
  }
  const nAlterados = Object.values(alterados).filter(c => Object.keys(c).length).length;
  const comReferencia = itens.filter(it => it.valor_publico != null || it.valor_privado != null).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18, gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, color: '#c9a227', fontWeight: 700, marginBottom: 4 }}>Preços de Mão de Obra (Referência)</h2>
          <p style={{ fontSize: 13, color: '#777', maxWidth: 860, lineHeight: 1.6 }}>
            Para cada serviço, duas referências de <b>preço de mercado</b> — <b>oficial / governo</b> (SINAPI, ORSE, SICRO, tabelas de
            órgãos e preços de licitações) e <b>privado / particular</b> — pesquisadas na web com fonte e link, ou digitadas. O
            orçamento usa como <b>sugestão</b> (nunca preço fechado): o <b>valor H&M adotado</b>, se preenchido; senão a referência do
            segmento do cliente (cadastro "Órgão Público" → oficial; demais → particular). {comReferencia} de {itens.length} serviços com referência de mercado.
          </p>
        </div>
        <button onClick={salvar} disabled={salvando || nAlterados === 0} style={btnPrimario}>
          <Save size={13} style={{ marginRight: 6 }} /> {salvando ? 'Salvando...' : `Salvar Alterações${nAlterados ? ` (${nAlterados})` : ''}`}
        </button>
      </div>

      {lote && (
        <div style={{ ...card, padding: 12, display: 'flex', alignItems: 'center', gap: 12, borderColor: '#2f4f6f' }}>
          <span style={{ fontSize: 13, color: '#8ab4f8' }}>
            Pesquisando {NOMES_DISCIPLINA[lote.disciplina] || lote.disciplina}: {lote.feitos} de {lote.total}…
          </span>
          <button onClick={() => { pararLote.current = true; }} style={btnSecundario}><Square size={11} style={{ marginRight: 4 }} /> Parar</button>
        </div>
      )}

      {carregando ? (
        <div style={card}><p style={{ fontSize: 13, color: '#777' }}>Carregando...</p></div>
      ) : (
        Object.entries(porDisciplina).map(([disciplina, lista]) => (
          <div key={disciplina} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ ...tituloSecao, marginBottom: 0, flex: 1 }}>{NOMES_DISCIPLINA[disciplina] || disciplina}</h3>
              <button onClick={() => pesquisarDisciplina(disciplina, lista)} disabled={!!lote} style={btnSecundario}
                title="Pesquisa na web as referências oficial e particular que ainda faltam nesta disciplina">
                <Search size={11} style={{ marginRight: 4 }} /> Pesquisar referências que faltam
              </button>
            </div>
            <div style={{ ...grade, fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              <span />
              <span>Descrição</span><span>Un.</span>
              {SEGMENTOS.map(s => <span key={s.chave} title={s.dica}>{s.rotulo} (R$)</span>)}
              <span title="Preço que a H&M pratica — tem prioridade sobre as referências de mercado">Valor H&M adotado (R$)</span>
            </div>
            {lista.map(it => {
              const aberto = abertos.has(it.codigo);
              const ofertas = SEGMENTOS.flatMap(s => (it[`ofertas_${s.chave}`] || []).map(o => ({ ...o, segmento: s.rotulo })));
              return (
                <Fragment key={it.codigo}>
                  <div style={{ ...grade, marginBottom: 8, alignItems: 'start', fontSize: 13 }}>
                    <button onClick={() => setAbertos(a => { const n = new Set(a); n.has(it.codigo) ? n.delete(it.codigo) : n.add(it.codigo); return n; })}
                      title={ofertas.length ? 'Ver as referências consultadas' : 'Sem referências pesquisadas'} style={{ ...btnIcone, opacity: ofertas.length ? 1 : 0.35 }}>
                      {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                    <span style={{ color: '#ccc', paddingTop: 6 }}>{it.descricao}</span>
                    <span style={{ color: '#777', paddingTop: 6 }}>{it.unidade}</span>
                    {SEGMENTOS.map(s => {
                      const k = `${it.codigo}|${s.chave}`;
                      const mudou = alterados[it.codigo] && `valor_${s.chave}` in alterados[it.codigo];
                      return (
                        <div key={s.chave}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input type="number" step="0.01" min="0" placeholder="Sem referência" value={it[`valor_${s.chave}`] ?? ''}
                              onChange={e => alterar(it.codigo, `valor_${s.chave}`, e.target.value)}
                              style={{ fontSize: 13, flex: 1, minWidth: 0, borderColor: mudou ? '#c9a227' : undefined }} />
                            <button onClick={() => pesquisar(it, s.chave)} disabled={!!pesquisando[k] || !!lote} title={`Pesquisar referência ${s.rotulo.toLowerCase()} na web`} style={btnIcone}>
                              <Search size={12} />
                            </button>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#777', marginTop: 3, lineHeight: 1.35 }}>
                            {pesquisando[k] ? 'Pesquisando na web…' : (
                              <>
                                {it[`fonte_${s.chave}`] && <span title={it[`fonte_${s.chave}`]}>{String(it[`fonte_${s.chave}`]).slice(0, 70)}{String(it[`fonte_${s.chave}`]).length > 70 ? '…' : ''} </span>}
                                {it[`link_${s.chave}`] && <a href={it[`link_${s.chave}`]} target="_blank" rel="noopener noreferrer" style={{ color: '#8ab4f8' }}><ExternalLink size={10} /></a>}
                                {it[`data_${s.chave}`] && <span> · {data(it[`data_${s.chave}`])}</span>}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <input type="number" step="0.01" min="0" placeholder="Usar referência" value={it.valor_referencia ?? ''}
                      onChange={e => alterar(it.codigo, 'valor_referencia', e.target.value)}
                      style={{ fontSize: 13, borderColor: alterados[it.codigo] && 'valor_referencia' in alterados[it.codigo] ? '#c9a227' : undefined }} />
                  </div>
                  {aberto && (
                    <div style={{ margin: '0 0 12px 34px', padding: 10, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 6, fontSize: 12 }}>
                      {ofertas.length ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#777', textAlign: 'left' }}>
                              <th style={th}>Segmento</th><th style={th}>Fonte</th><th style={th}>Item / composição</th><th style={th}>Preço</th><th style={th}>Obs.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ofertas.map((o, i) => (
                              <tr key={i} style={{ color: o.mesmo_item ? '#ccc' : '#777' }}>
                                <td style={td}>{o.segmento}</td>
                                <td style={td}>{o.link ? <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ color: '#8ab4f8' }}>{o.fonte}</a> : o.fonte}</td>
                                <td style={td}>{o.produto}</td>
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>{moeda(o.preco)}</td>
                                <td style={td}>{o.mesmo_item ? '' : 'não equivalente (fora da média). '}{o.observacao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <span style={{ color: '#777' }}>Nenhuma referência pesquisada ainda — use a lupa de cada segmento.</span>}
                      <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>Valor do segmento = média das referências equivalentes. Confira a unidade e o escopo (só mão de obra) antes de adotar.</p>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

const grade = { display: 'grid', gridTemplateColumns: '24px 2.6fr 0.45fr 1.25fr 1.25fr 0.9fr', gap: 10 };

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 22, marginBottom: 16
};

const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 14 };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'transparent', border: '1px solid #2f4f6f',
  borderRadius: 6, color: '#8ab4f8', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 30, background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: 6, color: '#c9a227', cursor: 'pointer', padding: 0, flexShrink: 0,
};

const th = { padding: '4px 8px 4px 0', fontWeight: 600, fontSize: 11 };
const td = { padding: '4px 8px 4px 0', verticalAlign: 'top' };
