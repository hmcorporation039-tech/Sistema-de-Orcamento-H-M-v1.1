import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Trash2, ArrowLeft, Scale } from 'lucide-react';
import {
  getConcorrencia, getComparacaoConcorrente, importarOrcamentoConcorrente, removerConcorrente,
  vincularItemConcorrente, atualizarConcorrente, getPropostas,
} from '../services/api';
import { formatarMoeda, dataBr } from '../utils/format';
import Select from '../components/Select';
import { estilos, Campo } from '../components/ui/estilos';

// Comparador de orçamentos da concorrência (06/11/2026): o orçamento do concorrente (PDF ou Excel) para o mesmo
// projeto, item a item contra a nossa proposta — preço (o nosso já com BDI e impostos), quantidade e o que só um dos
// dois incluiu — e o que fazer para oferecer o melhor ao cliente. A leitura é sem IA; "Ler com IA" só quando a
// leitura normal não achar os itens (PDF escaneado).
const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${String(v).replace('.', ',')} %`);
const corDif = (v) => (v == null ? 'var(--texto-3)' : v < -15 ? '#e57373' : v > 0 ? '#81c784' : 'var(--texto-2)');
const ROTULO_TIPO = { material: 'Material', servico: 'Serviço' };

function Importar({ propostaInicial, onImportado }) {
  const [busca, setBusca] = useState('');
  const [propostas, setPropostas] = useState([]);
  const [propostaId, setPropostaId] = useState(propostaInicial || '');
  const [concorrente, setConcorrente] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [usarIA, setUsarIA] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const t = setTimeout(() => {
      getPropostas({ busca: busca || undefined, porPagina: 30 })
        .then(r => { if (ativo) setPropostas(r.data?.dados || r.data?.itens || r.data || []); })
        .catch(() => {});
    }, 300);
    return () => { ativo = false; clearTimeout(t); };
  }, [busca]);

  async function enviar(e) {
    e.preventDefault();
    if (!arquivo) { toast.error('Escolha o arquivo do orçamento do concorrente.'); return; }
    setEnviando(true);
    try {
      const r = await importarOrcamentoConcorrente(arquivo, { propostaId, concorrente, usarIA });
      toast.success(`${r.data.itens} item(ns) lidos (${r.data.metodo}).`);
      (r.data.avisos || []).forEach(a => toast(a, { duration: 9000 }));
      setArquivo(null);
      onImportado(r.data.id);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível ler o arquivo.', { duration: 10000 });
    } finally {
      setEnviando(false);
    }
  }

  const listaPropostas = Array.isArray(propostas) ? propostas : [];
  return (
    <form onSubmit={enviar} style={estilos.card}>
      <h3 style={{ margin: '0 0 6px', fontSize: 15 }}><Scale size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Comparar com um concorrente</h3>
      <p style={estilos.ajuda}>Envie o orçamento do concorrente (PDF com texto ou planilha Excel) para o mesmo projeto e escolha a nossa proposta. O sistema casa os itens, compara preço e quantidade e mostra o que só um dos dois incluiu.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
        <Campo label="Procurar a nossa proposta">
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número ou cliente" aria-label="Procurar a nossa proposta" />
        </Campo>
        <Campo label="Nossa proposta">
          <Select value={propostaId} onChange={e => setPropostaId(e.target.value)} aria-label="Nossa proposta">
            <option value="">Sem proposta (só ler o arquivo)</option>
            {listaPropostas.map(p => <option key={p.id} value={p.id}>{`${p.numero} — ${p.cliente_nome || ''}`}</option>)}
          </Select>
        </Campo>
        <Campo label="Concorrente">
          <input value={concorrente} maxLength={200} onChange={e => setConcorrente(e.target.value)} placeholder="Nome (lido do arquivo se vazio)" aria-label="Nome do concorrente" />
        </Campo>
        <Campo label="Arquivo (PDF, XLSX ou XLS)">
          <input type="file" accept=".pdf,.xlsx,.xlsm,.xls" onChange={e => setArquivo(e.target.files?.[0] || null)} aria-label="Arquivo do concorrente" />
        </Campo>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5, color: 'var(--texto-2)' }}>
          <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={usarIA} onChange={e => setUsarIA(e.target.checked)} />
          Ler com IA se a leitura normal não achar os itens (PDF escaneado)
        </label>
        <button type="submit" disabled={enviando} style={estilos.btnPrimario}><Upload size={14} /> {enviando ? 'Lendo…' : 'Importar e comparar'}</button>
      </div>
    </form>
  );
}

function Resumo({ r }) {
  const caixa = (rotulo, valor, cor) => (
    <div style={{ background: 'var(--superficie-2)', borderRadius: 10, padding: '12px 14px', minWidth: 160 }}>
      <div style={{ fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: cor || 'var(--texto)' }}>{valor}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
      {caixa('Nosso total', formatarMoeda(r.total_nosso))}
      {caixa('Concorrente', formatarMoeda(r.total_deles))}
      {caixa('Diferença', `${formatarMoeda(r.diferenca)} (${pct(r.diferenca_pct)})`, r.diferenca > 0 ? '#e57373' : '#81c784')}
      {caixa('Dá para reduzir igualando preços', formatarMoeda(r.potencial_reducao))}
      {caixa('Só no concorrente', `${r.so_deles} · ${formatarMoeda(r.valor_so_deles)}`)}
      {caixa('Só no nosso', `${r.so_nossos} · ${formatarMoeda(r.valor_so_nossos)}`)}
    </div>
  );
}

function Comparacao({ id, onVoltar, onRemovido }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const r = await getComparacaoConcorrente(id);
      setDados(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível abrir a comparação.');
    } finally {
      setCarregando(false);
    }
  }, [id]);
  useEffect(() => { setCarregando(true); setDados(null); carregar(); }, [carregar]);

  async function vincular(itemId, corpo) {
    try { await vincularItemConcorrente(id, itemId, corpo); await carregar(); }
    catch (err) { toast.error(err.response?.data?.erro || 'Não foi possível alterar o vínculo.'); }
  }
  async function remover() {
    if (!window.confirm('Remover este orçamento do concorrente?')) return;
    try { await removerConcorrente(id); toast.success('Removido.'); onRemovido(); }
    catch (err) { toast.error(err.response?.data?.erro || 'Não foi possível remover.'); }
  }
  async function renomear() {
    const nome = window.prompt('Nome do concorrente', dados.concorrente);
    if (!nome) return;
    try { await atualizarConcorrente(id, { concorrente: nome }); await carregar(); }
    catch (err) { toast.error(err.response?.data?.erro || 'Não foi possível renomear.'); }
  }

  if (carregando) return <div style={estilos.card}>Carregando…</div>;
  if (!dados) return null;
  const c = dados.comparacao;
  const nossosOrdenados = [...(dados.itensNossos || [])];
  const seletorPar = (linhaDeles, atual) => (
    <Select value={atual || ''} aria-label={`Item nosso equivalente a ${linhaDeles.descricao}`} style={{ maxWidth: 260 }}
      onChange={e => vincular(linhaDeles.id, e.target.value === '' ? { par_item_id: null, sem_par: false } : e.target.value === 'sem' ? { sem_par: true } : { par_item_id: Number(e.target.value) })}>
      <option value="">Automático</option>
      <option value="sem">— Não temos equivalente —</option>
      {nossosOrdenados.map(n => <option key={n.id} value={n.id}>{n.descricao.slice(0, 90)}</option>)}
    </Select>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onVoltar} style={estilos.btnSecundario}><ArrowLeft size={14} /> Voltar</button>
        <h3 style={{ margin: 0, fontSize: 16 }}>
          <button type="button" onClick={renomear} style={estilos.botaoTexto} title="Corrigir o nome">{dados.concorrente}</button>
          {dados.proposta_numero && <> × <Link to={`/propostas/editar/${dados.proposta_id}`} style={estilos.link}>{dados.proposta_numero}</Link> ({dados.cliente_nome})</>}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>{dados.arquivo_nome} · {dados.metodo}</span>
        <button type="button" onClick={remover} style={{ ...estilos.btnSecundario, marginLeft: 'auto' }}><Trash2 size={14} /> Remover</button>
      </div>
      {(dados.avisos || []).length > 0 && (
        <div style={{ ...estilos.card, borderColor: '#a08a3a' }}>{dados.avisos.map((a, i) => <div key={i} style={{ fontSize: 12.5, color: '#d4b85a' }}>{a}</div>)}</div>
      )}
      {!c && <div style={estilos.card}>Este orçamento não está ligado a uma proposta nossa: {dados.itensConcorrente.length} item(ns) lidos. Ligue a uma proposta para comparar.</div>}
      {c && (
        <>
          <Resumo r={c.resumo} />
          <div style={estilos.card}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>O que fazer para oferecer o melhor ao cliente</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>{c.recomendacoes.map((t, i) => <li key={i}>{t}</li>)}</ul>
            <p style={{ ...estilos.ajuda, margin: '8px 0 0' }}>O nosso preço é comparado já com BDI e impostos da proposta (fator {String(c.resumo.fator_venda).replace('.', ',')}).</p>
          </div>
          <h4 style={{ fontSize: 14, margin: '6px 0 8px' }}>Itens equivalentes ({c.linhas.length})</h4>
          <div style={estilos.caixaTabela}>
            <table style={estilos.tabela}>
              <thead><tr>
                <th style={estilos.th}>Nosso item</th><th style={estilos.th}>Qtd</th><th style={estilos.th}>Unit. (venda)</th>
                <th style={estilos.th}>Concorrente</th><th style={estilos.th}>Qtd</th><th style={estilos.th}>Unit.</th>
                <th style={estilos.th}>Preço</th><th style={estilos.th}>Atenção</th><th style={estilos.th}>Vínculo</th>
              </tr></thead>
              <tbody>
                {c.linhas.length === 0 && <tr><td colSpan={9} style={estilos.tdVazio}>Nenhum item casou.</td></tr>}
                {c.linhas.map(l => (
                  <tr key={`${l.nosso.id}-${l.deles.id}`} style={estilos.linhaTabela}>
                    <td style={estilos.td}>{l.nosso.descricao}<div style={{ fontSize: 11, color: 'var(--texto-3)' }}>{ROTULO_TIPO[l.nosso.tipo]} · semelhança {l.semelhanca} %{l.manual ? ' · vínculo manual' : ''}</div></td>
                    <td style={estilos.td}>{l.nosso.quantidade} {l.nosso.unidade}</td>
                    <td style={estilos.td}>{formatarMoeda(l.nosso.venda_unitario)}</td>
                    <td style={estilos.td}>{l.deles.descricao}</td>
                    <td style={estilos.td}>{l.deles.quantidade} {l.deles.unidade}</td>
                    <td style={estilos.td}>{formatarMoeda(l.deles.valor_unitario)}</td>
                    <td style={{ ...estilos.td, color: corDif(l.dif_preco_pct), fontWeight: 600 }} title="Preço do concorrente em relação ao nosso">{pct(l.dif_preco_pct)}</td>
                    <td style={{ ...estilos.td, fontSize: 12 }}>{l.alertas.join('; ') || '—'}</td>
                    <td style={estilos.td}>{seletorPar(l.deles, l.manual ? l.nosso.id : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 style={{ fontSize: 14, margin: '16px 0 8px' }}>Só no orçamento do concorrente ({c.soDeles.length})</h4>
          <div style={estilos.caixaTabela}>
            <table style={estilos.tabela}>
              <thead><tr><th style={estilos.th}>Item</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Qtd</th><th style={estilos.th}>Unit.</th><th style={estilos.th}>Total</th><th style={estilos.th}>É o nosso item…</th></tr></thead>
              <tbody>
                {c.soDeles.length === 0 && <tr><td colSpan={6} style={estilos.tdVazio}>Nada.</td></tr>}
                {c.soDeles.map(d => (
                  <tr key={d.id} style={estilos.linhaTabela}>
                    <td style={estilos.td}>{d.descricao}</td><td style={estilos.td}>{ROTULO_TIPO[d.tipo] || '—'}</td>
                    <td style={estilos.td}>{d.quantidade} {d.unidade}</td><td style={estilos.td}>{formatarMoeda(d.valor_unitario)}</td>
                    <td style={estilos.td}>{formatarMoeda(d.total)}</td>
                    <td style={estilos.td}>{seletorPar(d, dados.itensConcorrente.find(x => x.id === d.id)?.sem_par ? 'sem' : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 style={{ fontSize: 14, margin: '16px 0 8px' }}>Só no nosso orçamento ({c.soNossos.length})</h4>
          <div style={estilos.caixaTabela}>
            <table style={estilos.tabela}>
              <thead><tr><th style={estilos.th}>Item</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Qtd</th><th style={estilos.th}>Total (venda)</th></tr></thead>
              <tbody>
                {c.soNossos.length === 0 && <tr><td colSpan={4} style={estilos.tdVazio}>Nada.</td></tr>}
                {c.soNossos.map(n => (
                  <tr key={n.id} style={estilos.linhaTabela}>
                    <td style={estilos.td}>{n.descricao}</td><td style={estilos.td}>{ROTULO_TIPO[n.tipo]}</td>
                    <td style={estilos.td}>{n.quantidade} {n.unidade}</td><td style={estilos.td}>{formatarMoeda(n.venda_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function Concorrencia() {
  const [busca, setBusca] = useSearchParams();
  const propostaUrl = busca.get('proposta') || '';
  const aberto = busca.get('comparacao');
  const [lista, setLista] = useState([]);

  const carregar = useCallback(async () => {
    try { const r = await getConcorrencia(propostaUrl ? { proposta_id: propostaUrl } : {}); setLista(r.data || []); }
    catch { setLista([]); }
  }, [propostaUrl]);
  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (id) => { const p = new URLSearchParams(busca); p.set('aba', 'concorrencia'); if (id) p.set('comparacao', id); else p.delete('comparacao'); setBusca(p); };

  if (aberto) return <Comparacao id={aberto} onVoltar={() => { abrir(null); carregar(); }} onRemovido={() => { abrir(null); carregar(); }} />;
  return (
    <div>
      <Importar propostaInicial={propostaUrl} onImportado={(id) => { carregar(); abrir(id); }} />
      <div style={estilos.caixaTabela}>
        <table style={estilos.tabela}>
          <thead><tr>
            <th style={estilos.th}>Concorrente</th><th style={estilos.th}>Nossa proposta</th><th style={estilos.th}>Itens</th>
            <th style={estilos.th}>Total do concorrente</th><th style={estilos.th}>Importado em</th><th style={estilos.th}>Por</th>
          </tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={6} style={estilos.tdVazio}>Nenhum orçamento de concorrente importado ainda.</td></tr>}
            {lista.map(o => (
              <tr key={o.id} style={estilos.linhaTabela}>
                <td style={estilos.td}><button type="button" style={{ ...estilos.botaoTexto, ...estilos.link }} onClick={() => abrir(o.id)}>{o.concorrente}</button><div style={{ fontSize: 11, color: 'var(--texto-3)' }}>{o.arquivo_nome}</div></td>
                <td style={estilos.td}>{o.proposta_numero ? `${o.proposta_numero} — ${o.cliente_nome || ''}` : '—'}</td>
                <td style={estilos.td}>{o.itens}</td>
                <td style={estilos.td}>{formatarMoeda(o.total_documento || o.soma_itens)}</td>
                <td style={estilos.td}>{dataBr(o.criado_em)}</td>
                <td style={estilos.td}>{o.usuario_nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
