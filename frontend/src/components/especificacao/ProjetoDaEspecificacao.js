import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileText, Play, Download, BookOpen, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import Select from '../Select';
import { estilos, Campo } from '../ui/estilos';
import { baixarDocumentoLaudo } from '../../services/api';
import {
  getPerfisEspecificacao, lerEspecificacao, gerarProjetoEspecificacao, atualizarProjetoEspecificacao,
  simularProjetoEspecificacao, precosProjetoEspecificacao, aprovarProjetoEspecificacao,
} from '../../services/apiEspecificacao';

// Projeto pela ESPECIFICAÇÃO do cliente (09/11/2026): envia a especificação (PDF, DOCX, XLSX ou TXT), vê os
// requisitos lidos com a frase de origem, corrige e ensina o que não foi lido, gera o projeto do quadro/painel
// (folhas FL01–FL07, pesquisa de preços, ficha técnica, texto de entrega e os documentos de sempre da skill),
// responde aos pontos a levantar, aprova preços e simula o comando. Tudo sem IA; a pesquisa na web só quando
// pedida, e volta como sugestão.
const DOCS = [
  ['folhas', 'Anteprojeto FL01–FL07 (PDF)', 'pdf'], ['pesquisa_precos', 'Pesquisa de preços (Excel)', 'xlsx'], ['ficha', 'Ficha técnica (PDF)', 'pdf'],
  ['entrega', 'Texto de entrega (Markdown)', 'md'], ['caderno', 'Caderno de fabricação (PDF)', 'pdf'], ['memorial', 'Memorial (Word)', 'docx'], ['desenho', 'Desenho (DXF)', 'dxf'], ['modelo3d', 'Modelo 3D (HTML)', 'html'],
];
const moeda = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const valorTexto = (v) => (v === true ? 'sim' : v === false ? 'NÃO' : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(' · ') : String(v ?? ''));
const etiqueta = (cor, texto) => <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: cor, color: '#111', fontWeight: 600 }}>{texto}</span>;

function Tabela({ cab, linhas }) {
  return (
    <div style={estilos.caixaTabela}>
      <table style={estilos.tabela}>
        <thead><tr>{cab.map(c => <th key={c} style={estilos.th}>{c}</th>)}</tr></thead>
        <tbody>{linhas.length ? linhas : <tr><td colSpan={cab.length} style={estilos.tdVazio}>Nada</td></tr>}</tbody>
      </table>
    </div>
  );
}

export default function ProjetoDaEspecificacao() {
  const [perfis, setPerfis] = useState([]);
  const [perfil, setPerfil] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [pedido, setPedido] = useState('');
  const [cliente, setCliente] = useState('');
  const [obra, setObra] = useState('');
  const [lida, setLida] = useState(null);
  const [ignorados, setIgnorados] = useState(new Set());
  const [ensinar, setEnsinar] = useState({}); // bloco → id do requisito
  const [projeto, setProjeto] = useState(null); // { id, resumo }
  const [respostas, setRespostas] = useState({});
  const [precos, setPrecos] = useState({}); // chave → preço digitado
  const [extras, setExtras] = useState({}); // chave → { altRef, altPreco, equivale }
  const [simEntradas, setSimEntradas] = useState({});
  const [simSaidas, setSimSaidas] = useState(null);
  const [ocupado, setOcupado] = useState('');

  useEffect(() => { getPerfisEspecificacao().then(r => setPerfis(r.data.perfis || [])).catch(() => {}); }, []);

  const tentar = async (rotulo, fn) => {
    setOcupado(rotulo);
    try { await fn(); } catch (e) { toast.error(e.response?.data?.erro || e.message || 'Falhou.', { duration: 9000 }); } finally { setOcupado(''); }
  };

  const ler = () => tentar('ler', async () => {
    if (!arquivo) { toast.error('Escolha o arquivo da especificação.'); return; }
    const r = await lerEspecificacao(arquivo, perfil);
    setLida(r.data); setIgnorados(new Set()); setEnsinar({}); setProjeto(null);
    toast.success(`${r.data.lidos.requisitos.length} requisito(s) lidos (${r.data.lidos.estatistica.cobertura} % do texto)${r.data.aprendidos ? ` · ${r.data.aprendidos} padrão(ões) aprendido(s)` : ''}.`);
    (r.data.avisos || []).forEach(a => toast(a, { duration: 9000 }));
  });

  const lidosParaEnviar = () => ({ ...lida.lidos, requisitos: lida.lidos.requisitos.filter((_, i) => !ignorados.has(i)) });

  const gerar = () => tentar('gerar', async () => {
    const r = await gerarProjetoEspecificacao({ perfil: lida.perfil, lidos: lidosParaEnviar(), pedido, cliente, obra });
    setProjeto(r.data); setRespostas({}); setPrecos({}); setExtras({}); setSimSaidas(null);
    toast.success(`Projeto #${r.data.id} gerado — ${r.data.resumo.funcional.filter(f => f.ok).length}/${r.data.resumo.funcional.length} cenários do comando atendidos.`);
  });

  const atualizar = (corpo) => tentar('atualizar', async () => {
    const r = await atualizarProjetoEspecificacao(projeto.id, corpo);
    setProjeto(p => ({ ...p, resumo: r.data.resumo }));
  });

  const responder = (ponto, acao) => {
    const nova = { ...respostas, [ponto.id]: acao === 'sugestao' ? { acao, decisao: ponto.sugestao.decisao, valor: ponto.sugestao.valor } : { acao } };
    setRespostas(nova);
    const decisoes = Object.values(nova).filter(x => x.acao === 'sugestao').reduce((s, x) => ({ ...s, [x.decisao]: x.valor }), {});
    const resp = Object.entries(nova).filter(([, x]) => x.acao === 'manter').reduce((s, [k]) => ({ ...s, [k]: 'manter' }), {});
    atualizar({ decisoes, respostas: resp });
  };

  const buscarPrecos = (web) => tentar(web ? 'web' : 'precos', async () => {
    const r = await precosProjetoEspecificacao(projeto.id, web);
    setProjeto(p => ({ ...p, resumo: r.data.resumo }));
    const sug = r.data.sugestoes || [];
    if (sug.length) setPrecos(p => ({ ...p, ...Object.fromEntries(sug.map(s => [s.chave, s.preco])) }));
    toast.success(`${r.data.referencias} referência(s) da H&M${web ? ` · ${sug.length} sugestão(ões) da web (confira antes de aprovar)` : ''}.`);
  });

  const aprovar = () => tentar('aprovar', async () => {
    const itens = projeto.resumo.materiais;
    // preço digitado e/ou alternativa econômica e equivalência (que valem para o próximo projeto)
    const chaves = [...new Set([...Object.keys(precos), ...Object.keys(extras)])];
    const precosAprovados = chaves.map((chave) => {
      const m = itens.find(i => i.chave === chave) || {};
      const preco = Number(precos[chave] ?? m.preco);
      const x = extras[chave] || {};
      if (!(preco > 0)) return null;
      return {
        chave, descricao: m.descricao, referencia: m.referenciaPesquisada || m.referencia, preco, unidade: m.unidade, fonte: precos[chave] != null ? 'aprovado pelo engenheiro' : (m.fonte || 'aprovado pelo engenheiro'),
        origem: m.origem === 'Estimativa H&M' && precos[chave] == null ? 'estimativa' : 'pesquisado',
        ...(x.altRef && Number(x.altPreco) > 0 ? { alternativa: { referencia: x.altRef, preco: Number(x.altPreco), ressalva: 'linha econômica: menor robustez' } } : {}),
        ...(x.equivale ? { equivale: x.equivale } : {}),
      };
    }).filter(Boolean);
    const correcoes = Object.entries(ensinar).filter(([, id]) => id).map(([bloco, id]) => {
      const b = lida.lidos.naoLidos.find(x => x.bloco === bloco);
      const eq = lida.vocabulario.equipamentos.find(x => `equipamento:${x.id}` === id);
      return eq ? { frase: b.texto, alvo: 'equipamento', id: eq.id } : { frase: b.texto, alvo: 'requisito', id };
    });
    const r = await aprovarProjetoEspecificacao(projeto.id, { correcoes, respostas, precos: precosAprovados });
    if (precosAprovados.length) await atualizarProjetoEspecificacao(projeto.id, { precosAprovados }).then(x => setProjeto(p => ({ ...p, resumo: x.data.resumo })));
    toast.success(`${r.data.aprendidos} item(ns) aprendido(s): o próximo projeto já sai com eles, sem IA.`);
  });

  const simular = (id, valor) => tentar('', async () => {
    const entradas = { ...simEntradas, [id]: valor };
    setSimEntradas(entradas);
    const r = await simularProjetoEspecificacao(projeto.id, entradas);
    setSimSaidas(r.data);
  });

  const baixar = (tipo, ext) => tentar('', async () => {
    const r = await baixarDocumentoLaudo(projeto.id, tipo);
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `${projeto.resumo.meta.tag}_${tipo}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  const R = projeto?.resumo;
  return (
    <div>
      <div style={estilos.card}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15 }}><FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Projeto pela especificação do cliente</h3>
        <p style={estilos.ajuda}>Envie a especificação (PDF com texto, DOCX, XLSX ou TXT). O sistema lê os requisitos, mostra de que frase veio cada um e gera o projeto do quadro/painel pelo perfil da disciplina, sem IA. O que não estiver na especificação fica como pendência [CONFERIR].</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <Campo label="Arquivo da especificação"><input type="file" accept=".pdf,.docx,.xlsx,.xlsm,.txt,.md" onChange={e => setArquivo(e.target.files[0] || null)} /></Campo>
          <Campo label="Perfil">
            <Select value={perfil} onChange={e => setPerfil(e.target.value)} className="input">
              <option value="">Automático (pelo texto)</option>
              {perfis.map(p => <option key={p.chave} value={p.chave}>{p.nome}</option>)}
            </Select>
          </Campo>
          <Campo label="Cliente"><input className="input" value={cliente} onChange={e => setCliente(e.target.value)} /></Campo>
          <Campo label="Obra"><input className="input" value={obra} onChange={e => setObra(e.target.value)} /></Campo>
          <Campo label="Pedido (o que gerar)"><input className="input" value={pedido} onChange={e => setPedido(e.target.value)} placeholder="ex.: unifilar, comando e layout" /></Campo>
          <button type="button" style={estilos.btnPrimario} onClick={ler} disabled={!!ocupado}><Upload size={14} />{ocupado === 'ler' ? 'Lendo…' : 'Ler especificação'}</button>
        </div>
      </div>

      {lida && (
        <div style={estilos.card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Requisitos lidos — perfil {lida.perfil} · {lida.lidos.estatistica.cobertura} % do texto interpretado</h3>
          <p style={estilos.ajuda}>Desmarque o que foi lido errado. Os trechos não lidos podem ser ensinados: na próxima especificação a mesma frase já é reconhecida.</p>
          <Tabela cab={['Usar', 'Grupo', 'Requisito', 'Valor', 'Frase de origem', 'Fonte']} linhas={lida.lidos.requisitos.map((q, i) => (
            <tr key={`${q.id}-${i}`} style={estilos.linhaTabela}>
              <td style={estilos.td}><input type="checkbox" checked={!ignorados.has(i)} onChange={() => setIgnorados(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} /></td>
              <td style={estilos.td}>{q.grupo}</td><td style={estilos.td}>{q.rotulo}</td><td style={estilos.td}>{valorTexto(q.valor)}</td>
              <td style={{ ...estilos.td, fontSize: 12, color: 'var(--texto-2)' }}>p. {q.origem.pagina} · {q.origem.frase}</td>
              <td style={estilos.td}>{q.fonte === 'aprendido' ? etiqueta('#9fd8a8', 'aprendido') : etiqueta('#d7dde8', 'lido')}</td>
            </tr>))} />
          <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}>Equipamentos</h3>
          <Tabela cab={['Tipo', 'Qtd', 'Dados de placa']} linhas={lida.lidos.equipamentos.map(e => (
            <tr key={e.tipo} style={estilos.linhaTabela}><td style={estilos.td}>{e.rotulo}</td><td style={estilos.td}>{e.quantidade?.valor ?? '—'}</td>
              <td style={estilos.td}>{Object.entries(e.atributos).map(([k, v]) => `${k}: ${valorTexto(v.valor)}`).join(' · ')}</td></tr>))} />
          {lida.lidos.naoLidos.length > 0 && (<>
            <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}><BookOpen size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Trechos não interpretados (ensinar)</h3>
            <Tabela cab={['Trecho', 'É o requisito / equipamento']} linhas={lida.lidos.naoLidos.map(b => (
              <tr key={b.bloco} style={estilos.linhaTabela}><td style={{ ...estilos.td, fontSize: 12 }}>{b.texto}</td>
                <td style={estilos.td}><Select className="input" value={ensinar[b.bloco] || ''} onChange={e => setEnsinar(s => ({ ...s, [b.bloco]: e.target.value }))}>
                  <option value="">Não ensinar</option>
                  <optgroup label="Requisitos">{lida.vocabulario.requisitos.map(r => <option key={r.id} value={r.id}>{r.rotulo}</option>)}</optgroup>
                  <optgroup label="Equipamentos">{lida.vocabulario.equipamentos.map(x => <option key={x.id} value={`equipamento:${x.id}`}>{x.rotulo}</option>)}</optgroup>
                </Select></td></tr>))} />
          </>)}
          <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}>Pendências da leitura</h3>
          <ul style={{ margin: 0, fontSize: 13 }}>{lida.lidos.pendencias.map((p, i) => <li key={i}>{p.texto}</li>)}</ul>
          <div style={{ marginTop: 14 }}><button type="button" style={estilos.btnPrimario} onClick={gerar} disabled={!!ocupado}><Play size={14} />{ocupado === 'gerar' ? 'Gerando…' : 'Gerar projeto'}</button></div>
        </div>
      )}

      {R && (
        <div style={estilos.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>{R.meta.titulo} — projeto #{projeto.id}</h3>
          <p style={estilos.ajuda}>Geral {R.geral.texto} · demanda {Math.round(R.demanda.iProj)} A ({R.demanda.faseMax}) · {R.comando.reles.length} relés/temporizadores · fonte {R.comando.fonte.A} A · {R.funcional.filter(f => f.ok).length}/{R.funcional.length} cenários do comando atendidos · também em Obras → Projetos por disciplina.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {DOCS.map(([t, rot, ext]) => <button key={t} type="button" style={estilos.btnSecundario} onClick={() => baixar(t, ext)}><Download size={13} />{rot}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            <div>
              <h4 style={{ margin: '4px 0 6px' }}>Principais decisões</h4>
              <ul style={{ margin: 0, fontSize: 13 }}>{R.decisoes.map((d, i) => <li key={i}><b>{d.titulo}:</b> {d.texto}</li>)}</ul>
              <h4 style={{ margin: '12px 0 6px' }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Pontos a levantar com o cliente</h4>
              {R.pontos.length ? R.pontos.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--borda)', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
                  <div>{p.texto}</div>
                  {p.sugestao && <div style={{ color: 'var(--texto-2)', marginTop: 4 }}>Sugestão: {p.sugestao.texto}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {p.sugestao && <button type="button" style={estilos.btnSecundario} onClick={() => responder(p, 'sugestao')}>Adotar a sugestão</button>}
                    <button type="button" style={estilos.btnSecundario} onClick={() => responder(p, 'manter')}>Manter como pedido (declarar exceção)</button>
                  </div>
                </div>)) : <p style={estilos.ajuda}>Nenhum ponto em aberto.</p>}
              <h4 style={{ margin: '12px 0 6px' }}>Falta confirmar</h4>
              <ol style={{ margin: 0, fontSize: 13 }}>{R.pendencias.map(p => <li key={p.n}>{p.texto}</li>)}</ol>
              <h4 style={{ margin: '12px 0 6px' }}>Exceções a declarar</h4>
              <ul style={{ margin: 0, fontSize: 13 }}>{R.excecoes.map(x => <li key={x.letra}>{x.letra}) {x.texto}</li>)}</ul>
            </div>
            <div>
              <h4 style={{ margin: '4px 0 6px' }}>Simulação do comando (o mesmo modelo do 3D)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {R.interacao.controles.map(c => (
                  <Campo key={c.id} label={c.rotulo}>
                    {c.tipo === 'seletora'
                      ? <Select className="input" value={simEntradas[c.id] ?? c.inicial} onChange={e => simular(c.id, e.target.value)}>{c.estados.map(s => <option key={s} value={s}>{s}</option>)}</Select>
                      : (() => {
                        const invertido = ['supervisor', 'fusivel', 'energia'].includes(c.tipo); // normal = true; marcar = simular a falta
                        const atual = simEntradas[c.id] ?? invertido;
                        return <label style={{ fontSize: 13 }}><input type="checkbox" checked={invertido ? !atual : !!atual} onChange={e => simular(c.id, invertido ? !e.target.checked : e.target.checked)} /> {c.tipo === 'externo' ? 'ativo' : c.tipo === 'emergencia' ? 'acionado' : `simular ${c.estados[1]}`}</label>;
                      })()}
                  </Campo>))}
              </div>
              {simSaidas && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(simSaidas.saidas).filter(([k]) => /^(K|H|YV|U\d|CH|CENTRAL|X3)/.test(k) && !k.endsWith('.bobina')).map(([k, v]) => (
                    <span key={k} title={simSaidas.rotulos[k] || k} style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 10, background: v ? '#9fd8a8' : 'var(--superficie-2)', border: '1px solid var(--borda)' }}>{k}{v ? ' ●' : ''}</span>))}
                  {!simSaidas.estavel && etiqueta('#f2b0a8', 'oscilação')}
                </div>)}
              <h4 style={{ margin: '14px 0 6px' }}>Material — {moeda(R.precos.subtotal)} ({moeda(R.precos.total)} com contingência) · {R.precos.aCotar} a cotar</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <button type="button" style={estilos.btnSecundario} onClick={() => buscarPrecos(false)} disabled={!!ocupado}><Search size={13} />Referências da H&M (sem IA)</button>
                <button type="button" style={estilos.btnSecundario} onClick={() => buscarPrecos(true)} disabled={!!ocupado}><Search size={13} />Pesquisar na web os itens a cotar (IA, sugestão)</button>
              </div>
              <Tabela cab={['Tag', 'Descrição', 'Qtd', 'Preço', 'Origem', 'Alternativa econômica (ref. e R$)', 'Equivalência adotada']} linhas={R.materiais.map(m => {
                const x = extras[m.chave] || {};
                const mudar = (campo, v) => setExtras(s => ({ ...s, [m.chave]: { ...(s[m.chave] || {}), [campo]: v } }));
                return (
                <tr key={m.item} style={estilos.linhaTabela}>
                  <td style={estilos.td}>{m.tag}</td><td style={{ ...estilos.td, fontSize: 12 }}>{m.descricao}{m.obs ? <div style={{ fontSize: 11, color: 'var(--texto-3)' }}>{m.obs}</div> : null}</td><td style={estilos.td}>{m.quantidade} {m.unidade}</td>
                  <td style={estilos.td}>{m.cliente ? '—' : <input className="input" style={{ width: 96 }} type="number" min="0" step="0.01" value={precos[m.chave] ?? (m.preco ?? '')} onChange={e => setPrecos(p => ({ ...p, [m.chave]: e.target.value }))} />}</td>
                  <td style={estilos.td}>{m.origem === 'A cotar' ? etiqueta('#fff4d6', 'a cotar') : m.origem === 'Estimativa H&M' ? etiqueta('#fff4d6', 'estimativa') : m.origem === 'Cliente' ? etiqueta('#d7dde8', 'cliente') : etiqueta('#9fd8a8', 'pesquisado')}</td>
                  <td style={estilos.td}>{m.cliente ? '—' : (<div style={{ display: 'flex', gap: 4 }}>
                    <input className="input" aria-label="Alternativa econômica" placeholder={m.alternativa?.referencia || 'ex.: linha econômica'} style={{ width: 130 }} value={x.altRef ?? ''} onChange={e => mudar('altRef', e.target.value)} />
                    <input className="input" aria-label="Preço da alternativa" type="number" min="0" step="0.01" placeholder={m.alternativa?.preco ?? 'R$'} style={{ width: 80 }} value={x.altPreco ?? ''} onChange={e => mudar('altPreco', e.target.value)} />
                  </div>)}</td>
                  <td style={estilos.td}>{m.cliente ? '—' : <input className="input" aria-label="Equivalência" placeholder={m.equivale || 'ex.: marca A → marca B (equivalente)'} style={{ width: 180 }} value={x.equivale ?? ''} onChange={e => mudar('equivale', e.target.value)} />}</td>
                </tr>);
              })} />
              <div style={{ marginTop: 12 }}>
                <button type="button" style={estilos.btnPrimario} onClick={aprovar} disabled={!!ocupado}><CheckCircle2 size={14} />{ocupado === 'aprovar' ? 'Aprovando…' : 'Aprovar e ensinar (vocabulário, respostas e preços)'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
