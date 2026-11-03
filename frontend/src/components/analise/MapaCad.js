// Mapa do CAD (item 3 do plano): o que o sistema entendeu de cada layer do DWG/DXF com símbolos desenhados
// (QiBuilder/AltoQi, PDF convertido). O engenheiro confere o tipo e a altura; cada confirmação fica na
// análise, vira aprendizado (o próximo desenho do escritório já vem certo) e, ao reprocessar, entra no orçamento.
// Até conferir, esses pontos NÃO entram no orçamento.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCheck, Download, RefreshCw, Undo2, Upload } from 'lucide-react';
import { getMapaCad, salvarMapaCad, reprocessarMapaCad, exportarBibliotecaBlocos, importarBibliotecaBlocos } from '../../services/api';
import { mensagemDeErro } from '../../utils/download';

const ORIGEM = {
  legenda: ['da legenda do desenho', '#4a9'],
  aprendido: ['aprendido de outro projeto', '#8ab4f8'],
  regra: ['pela regra da layer', '#c9a227'],
  nao_reconhecido: ['não reconhecido', '#c06060'],
  confirmado: ['conferido', '#5fbf7a'],
};
const NOME_DISC = {
  eletrica: 'Elétrica', iluminacao: 'Iluminação', 'iluminacao-externa': 'Iluminação externa', incendio: 'Incêndio', cftv: 'CFTV', rede: 'Rede',
  alarme: 'Alarme', telefonia: 'Telefonia', antena: 'Antena', 'controle-acesso': 'Controle de acesso', automacao: 'Automação', spda: 'SPDA',
  solar: 'Solar', veicular: 'Veicular', eletrica_hospitalar: 'Elétrica hospitalar',
};
// de onde veio a altura sugerida (quando não é da legenda do desenho nem conferida)
const ALTURA_DE = { nota: 'sugerida pela nota do desenho', nota_aprendida: 'costume deste escritório (notas anteriores)' };
const LIMITE_LINHAS = 60;
// circuito e retorno escritos junto dos símbolos da linha ("3", "a" — fase 1 do roteiro): sugestão; ao conferir
// a linha, o circuito de cada ponto vai para o 3D
function textoCircuitos(c) {
  const lista = (o) => Object.entries(o || {}).sort((x, y) => y[1] - x[1]);
  const circ = lista(c.circuitos), ret = lista(c.retornos);
  const partes = [];
  if (circ.length) partes.push(`circ. ${circ.slice(0, 6).map(([k, n]) => `${k} (${n})`).join(', ')}${circ.length > 6 ? '…' : ''}`);
  if (ret.length) partes.push(`retornos ${ret.slice(0, 6).map(([k]) => k).join(', ')}${ret.length > 6 ? '…' : ''}`);
  return partes.join(' · ');
}
const campo = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '5px 7px', boxSizing: 'border-box', fontFamily: 'inherit' };
const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #2f2f2f', background: '#1a1a1a', color: '#ddd', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };

// Planta do mapa: contorno dos ambientes e os pontos lidos; os da linha escolhida (passe o mouse na tabela) em destaque.
// Coordenadas no sistema do desenho; o eixo Y é invertido para a planta ficar na posição de leitura.
function PlantaDoMapa({ planta, simbolos, ativa }) {
  const [x0, y0, x1, y1] = planta.caixa;
  const larg = Math.max(x1 - x0, 1), alt = Math.max(y1 - y0, 1);
  const folga = Math.max(larg, alt) * 0.03;
  const raio = Math.max(larg, alt) / 260;
  const confirmadas = new Set(simbolos.filter(q => q.confirmado).map(q => q.idx));
  const ponto = (p, i, cor, r) => <circle key={i} cx={p[1]} cy={p[2]} r={r} fill={cor} />;
  const outros = planta.pontos.filter(p => p[0] !== ativa);
  const daLinha = planta.pontos.filter(p => p[0] === ativa);
  return (
    <svg viewBox={`${x0 - folga} ${-(y1 + folga)} ${larg + 2 * folga} ${alt + 2 * folga}`} role="img" aria-label="Planta com os pontos lidos do desenho"
      style={{ width: '100%', maxHeight: 340, background: '#0d0d0d', border: '1px solid #222', borderRadius: 6, display: 'block' }} data-testid="planta-mapa-cad">
      <g transform="scale(1,-1)">
        {planta.salas.map((sala, i) => (
          <polygon key={i} points={sala.poligono.map(p => p.join(',')).join(' ')} fill="none" stroke="#3a3a3a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {outros.map((p, i) => ponto(p, i, confirmadas.has(p[0]) ? '#3f8f58' : '#6b6b6b', raio))}
        {daLinha.map((p, i) => ponto(p, `a${i}`, '#f0c63c', raio * 1.9))}
      </g>
    </svg>
  );
}

const br = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const paraNumero = (t) => { const n = Number(String(t).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
const cm = (medida) => (medida || []).map(m => Math.round(m * 100)).join(' × ');

// por que a linha do mapa não entra no orçamento (backend: services/analiseCad, CAD-12 — decidido por layer)
const MOTIVO_FORA = {
  layer_com_bloco: 'Não entra no orçamento: esta layer tem blocos nomeados, e o orçamento conta pelos blocos',
  referencia: 'Não entra no orçamento: layer de referência de outra disciplina (REF-…)',
  repete_bloco: 'Não entra no orçamento: repete um bloco da mesma família no mesmo lugar',
};

export default function MapaCad({ analiseId, estiloCartao, estiloTitulo }) {
  const navigate = useNavigate();
  const [mapa, setMapa] = useState(null); // { disponivel, arquivos, tipos }
  const [edicao, setEdicao] = useState({}); // `${arquivo}|${idx}` → { simbolo, altura }
  const [ocupado, setOcupado] = useState(false);
  const [mostrarTodas, setMostrarTodas] = useState({});
  const [ativa, setAtiva] = useState({}); // arquivo → linha do mapa em destaque na planta
  const [incluirDisciplinas, setIncluirDisciplinas] = useState(true);

  useEffect(() => {
    let vivo = true;
    getMapaCad(analiseId).then(r => { if (vivo) setMapa(r.data); }).catch(() => { if (vivo) setMapa({ disponivel: false, arquivos: [], tipos: [] }); });
    return () => { vivo = false; };
  }, [analiseId]);

  const grupos = useMemo(() => {
    const por = new Map();
    for (const t of mapa?.tipos || []) {
      if (!por.has(t.disciplina)) por.set(t.disciplina, []);
      por.get(t.disciplina).push(t);
    }
    return [...por.entries()];
  }, [mapa]);

  // análise com DWG feita antes do mapa existir: sem ele os pontos do desenho não têm onde ser conferidos
  if (!mapa?.disponivel && !mapa?.semMapa) return null;
  const totalConferidas = mapa.arquivos.reduce((t, a) => t + a.resumo.conferidas, 0);
  const totalPontosPendentes = mapa.arquivos.reduce((t, a) => t + a.resumo.pontosPendentes, 0);
  const disciplinasFaltando = mapa.arquivos.flatMap(a => (a.disciplinasAIncluir || []).map(d => ({ ...d, arquivo: a.arquivo })));

  const valorDe = (arquivo, s) => edicao[`${arquivo}|${s.idx}`] || { simbolo: s.simbolo, altura: br(s.altura_m) };
  const mudar = (arquivo, s, parte) => setEdicao(e => ({ ...e, [`${arquivo}|${s.idx}`]: { ...valorDe(arquivo, s), ...parte } }));

  async function enviar(arquivo, linhas, mensagem) {
    setOcupado(true);
    try {
      const r = await salvarMapaCad(analiseId, arquivo, linhas);
      setMapa(m => ({ ...m, ...r.data }));
      setEdicao(e => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`${arquivo}|`))));
      if (mensagem) toast.success(mensagem(r.data));
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui salvar o mapa'), { duration: 8000 });
    } finally { setOcupado(false); }
  }

  const confirmar = (arquivo, s) => {
    const v = valorDe(arquivo, s);
    return enviar(arquivo, [{ idx: s.idx, simbolo: v.simbolo, altura_m: paraNumero(v.altura), confirmado: true }],
      (d) => (d.aprendidas ? 'Conferido — o sistema aprendeu esse tipo para os próximos desenhos' : 'Conferido'));
  };
  const desfazer = (arquivo, s) => enviar(arquivo, [{ idx: s.idx, confirmado: false }], () => 'Confirmação desfeita');
  const confirmarReconhecidas = (a) => {
    const linhas = a.simbolos.filter(s => !s.confirmado && s.simbolo !== '?' && s.quantidade > 0)
      .map(s => ({ idx: s.idx, simbolo: valorDe(a.arquivo, s).simbolo, altura_m: paraNumero(valorDe(a.arquivo, s).altura), confirmado: true }));
    if (!linhas.length) return toast('Nenhuma linha reconhecida para confirmar.');
    return enviar(a.arquivo, linhas, () => `${linhas.length} linha(s) conferida(s)`);
  };

  async function reprocessar() {
    setOcupado(true);
    try {
      const r = await reprocessarMapaCad(analiseId, { incluirDisciplinas });
      const h = r.data.edicoesHerdadas;
      const copiadas = h?.copiadas ? h.alterados + h.removidos + h.acrescentados : 0;
      toast.success(`${mapa.disponivel ? 'Nova análise gravada com o mapa conferido.' : 'Nova análise gravada com o mapa do CAD — confira as layers nela.'} A anterior continua salva.${copiadas ? ` ${copiadas} edição(ões) sua(s) foram copiadas.` : ''}`);
      if (h && !h.copiadas) toast(h.motivo, { duration: 10000, icon: 'ℹ️' });
      if (h?.recalculados?.length) toast(`${h.recalculados.length} item(ns) que você tinha ajustado na quantidade foram recalculados pelo mapa conferido — vale a do mapa; revise: ${h.recalculados.slice(0, 4).join('; ')}${h.recalculados.length > 4 ? '…' : ''}`, { duration: 14000, icon: '⚠️' });
      navigate(`/obras/analise/${r.data.id}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui reprocessar a análise'), { duration: 10000 });
    } finally { setOcupado(false); }
  }

  async function exportarBiblioteca() {
    try {
      const r = await exportarBibliotecaBlocos();
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `biblioteca-blocos-hm-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${r.data.linhas.length} linha(s) da biblioteca exportada(s)`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui exportar a biblioteca de blocos'), { duration: 8000 });
    }
  }

  async function importarBiblioteca(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setOcupado(true);
    try {
      const json = JSON.parse(await arquivo.text());
      const r = await importarBibliotecaBlocos(json);
      toast.success(`Biblioteca importada: ${r.data.gravadas} linha(s) gravada(s), ${r.data.mantidas} mantida(s) (já conferidas aqui)${r.data.recusadas ? `, ${r.data.recusadas} recusada(s)` : ''}.`, { duration: 9000 });
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : await mensagemDeErro(err, 'Não consegui importar a biblioteca (só administrador)'), { duration: 9000 });
    } finally { setOcupado(false); }
  }

  if (!mapa.disponivel) {
    return (
      <div style={estiloCartao} data-testid="cartao-mapa-cad-ausente">
        <h3 style={estiloTitulo}>Mapa do CAD — esta análise ainda não tem</h3>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
          Ela foi feita antes do mapa do CAD: os pontos dos símbolos desenhados no DWG/DXF (tomadas, luminárias, quadros) foram lidos,
          mas <b>não entram no orçamento</b> sem conferência. Ler o desenho de novo grava uma análise nova com o mapa para conferir
          (a atual continua salva e o que você editou nela é copiado).
        </p>
        <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={reprocessar} disabled={ocupado} data-testid="gerar-mapa">
          <RefreshCw size={13} /> {ocupado ? 'Lendo o desenho…' : 'Ler o DWG de novo e gerar o mapa'}
        </button>
      </div>
    );
  }

  return (
    <div style={estiloCartao} data-testid="cartao-mapa-cad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ ...estiloTitulo, flex: 1, marginBottom: 0 }}>Mapa do CAD — confira o que o sistema entendeu do desenho</h3>
        {totalConferidas > 0 && (
          <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={reprocessar} disabled={ocupado} data-testid="reprocessar-mapa">
            <RefreshCw size={13} /> Reprocessar com o mapa conferido
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
        Cada linha é uma layer × forma de símbolo do desenho. Confira o <b>tipo</b> e a <b>altura</b>: o que for conferido vira aprendizado do sistema
        (o próximo desenho do escritório já vem certo) e, ao reprocessar, entra no orçamento. Pontos ainda não conferidos <b>não entram no orçamento</b>
        {totalPontosPendentes > 0 ? ` — hoje são ${totalPontosPendentes} ponto(s) fora.` : '.'} "Não é ponto" tira a layer da contagem.
      </p>
      {totalConferidas > 0 && (
        <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 10 }}>
          Depois de conferir, use "Reprocessar com o mapa conferido": ele grava uma análise nova com esses pontos já no orçamento (a atual continua salva).
        </div>
      )}
      {totalConferidas > 0 && (
        <div style={{ fontSize: 12, color: 'var(--texto-2)', marginBottom: 10, lineHeight: 1.6 }}>
          Ao reprocessar, o que você editou nesta análise (quantidades, valores, itens retirados ou acrescentados) é copiado para a nova.
          {disciplinasFaltando.length > 0 && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, color: '#c9a227', cursor: 'pointer' }}>
              <input type="checkbox" checked={incluirDisciplinas} onChange={(e) => setIncluirDisciplinas(e.target.checked)} style={{ marginTop: 3 }} data-testid="incluir-disciplinas" />
              <span>
                Incluir na análise nova as disciplinas dos pontos conferidos que não foram marcadas no envio:{' '}
                {disciplinasFaltando.map(d => `${d.nome} (${d.pontos} ponto(s))`).join('; ')}. Sem elas, esses pontos ficariam fora do orçamento.
              </span>
            </label>
          )}
        </div>
      )}
      {mapa.arquivos.map(a => {
        const aberta = mostrarTodas[a.arquivo];
        const linhas = aberta ? a.simbolos : a.simbolos.slice(0, LIMITE_LINHAS);
        return (
          <div key={a.arquivo} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd', flex: 1 }}>{a.arquivo}
                <span style={{ fontWeight: 400, color: 'var(--texto-3)', marginLeft: 8 }}>
                  {a.resumo.conferidas} de {a.resumo.linhas} linha(s) conferida(s){a.resumo.naoReconhecidas ? ` · ${a.resumo.naoReconhecidas} não reconhecida(s)` : ''}
                </span>
              </div>
              <button type="button" style={botao} onClick={() => confirmarReconhecidas(a)} disabled={ocupado} title="Confirma como estão as linhas que o sistema reconheceu">
                <CheckCheck size={13} /> Confirmar as reconhecidas
              </button>
            </div>
            {!a.valeParaOrcamento && (
              <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 6 }}>
                Este desenho tem blocos nomeados: o orçamento conta pelos blocos. O mapa abaixo vale para o 3D e para o aprendizado.
              </div>
            )}
            {a.valeParaOrcamento && a.layersComBloco?.length > 0 && (
              <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 6 }}>
                Desenho misto: nas layers com blocos nomeados ({a.layersComBloco.slice(0, 6).join(', ')}{a.layersComBloco.length > 6 ? '…' : ''}) o orçamento conta pelos blocos; nas outras, pelos símbolos conferidos aqui.
              </div>
            )}
            {a.planta && <div style={{ marginBottom: 8 }}><PlantaDoMapa planta={a.planta} simbolos={a.simbolos} ativa={ativa[a.arquivo]} /></div>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--texto-3)' }}>
                    {['Layer', 'Símbolo (cm)', 'Qtd', 'Tipo do ponto', 'Altura (m)', 'Origem', ''].map(h => <th key={h} style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(s => {
                    const v = valorDe(a.arquivo, s);
                    const [rotuloOrigem, corOrigem] = ORIGEM[s.origem] || ORIGEM.regra;
                    const mudou = v.simbolo !== s.simbolo || v.altura !== br(s.altura_m);
                    return (
                      <tr key={s.idx} style={{ borderTop: '1px solid #1e1e1e', ...(ativa[a.arquivo] === s.idx ? { background: '#1b1a12' } : {}) }} data-testid={`linha-mapa-${s.idx}`}
                        onMouseEnter={() => a.planta && setAtiva(m => (m[a.arquivo] === s.idx ? m : { ...m, [a.arquivo]: s.idx }))}>
                        <td style={{ padding: '6px 8px', color: '#ddd', whiteSpace: 'nowrap' }}>{s.layer}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }}>{cm(s.medida)}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }} title={MOTIVO_FORA[s.foraDoOrcamento] || 'pontos que entram na contagem / símbolos desta forma no desenho'}>
                          {s.contados}{s.contados !== s.quantidade ? ` / ${s.quantidade}` : ''}
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 190 }}>
                          <select value={v.simbolo} onChange={(e) => mudar(a.arquivo, s, { simbolo: e.target.value })} style={{ ...campo, width: '100%' }} disabled={ocupado || s.confirmado}>
                            <option value="?">{s.origem === 'nao_reconhecido' && !s.confirmado ? '— escolha o tipo ou "não é ponto" —' : 'Não é ponto'}</option>
                            {grupos.map(([disc, tipos]) => (
                              <optgroup key={disc} label={NOME_DISC[disc] || disc}>
                                {tipos.map(t => <option key={t.simbolo} value={t.simbolo}>{t.nome}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', width: 80 }}>
                          <input value={v.altura} onChange={(e) => mudar(a.arquivo, s, { altura: e.target.value })} placeholder="padrão" inputMode="decimal" style={{ ...campo, width: 70 }} disabled={ocupado || s.confirmado} />
                          {!s.confirmado && ALTURA_DE[s.alturaDe] && <div style={{ fontSize: 10, color: '#8ab4f8', marginTop: 2, maxWidth: 130, lineHeight: 1.3 }} title={s.alturaTexto || ''}>{ALTURA_DE[s.alturaDe]}</div>}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: corOrigem }}>{rotuloOrigem}</span>
                          {s.corrigido && <span style={{ color: 'var(--texto-3)' }} title={`o sistema tinha proposto: ${s.proposto?.simbolo}`}> · corrigido</span>}
                          {s.circuitos_lidos && (
                            <div style={{ fontSize: 10, color: '#8ab4f8', marginTop: 2, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.3 }}
                              title={`Texto escrito junto do símbolo: ${s.circuitos_lidos.com_circuito} de ${s.circuitos_lidos.pontos} ponto(s) com circuito lido${s.circuitos_lidos.conflitos ? `, ${s.circuitos_lidos.conflitos} com dois circuitos (ficam sem)` : ''}. ${s.confirmado ? 'Linha conferida: o circuito vai para o 3D.' : 'Sugestão: entra no 3D quando a linha for conferida.'}`}>
                              {textoCircuitos(s.circuitos_lidos)}{s.confirmado ? '' : ' — a conferir'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          {s.confirmado
                            ? <button type="button" style={botao} onClick={() => desfazer(a.arquivo, s)} disabled={ocupado}><Undo2 size={12} /> Desfazer</button>
                            : <button type="button" style={{ ...botao, ...(mudou || s.simbolo !== '?' ? { borderColor: '#5fbf7a', color: '#5fbf7a' } : {}) }} onClick={() => confirmar(a.arquivo, s)} disabled={ocupado}>Confirmar</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {a.simbolos.length > LIMITE_LINHAS && !aberta && (
              <button type="button" style={{ ...botao, marginTop: 8 }} onClick={() => setMostrarTodas(m => ({ ...m, [a.arquivo]: true }))}>Mostrar as {a.simbolos.length} linhas</button>
            )}
            {a.trechos?.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 8 }}>
                Traçados medidos: {a.trechos.map(t => `${t.layer} (${t.tipo}, ${String(t.comprimento_m).replace('.', ',')} m)`).join(' · ')}
              </div>
            )}
          </div>
        );
      })}
      {/* biblioteca de blocos (fase 3, CAD-08): as confirmações por medida real e escritório, para levar a outra instalação */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--texto-3)' }}>
        <span style={{ flex: 1, minWidth: 220 }}>Biblioteca de blocos: o que o sistema aprendeu das confirmações (pela medida real e pelo escritório do carimbo).</span>
        <button type="button" style={botao} onClick={exportarBiblioteca} disabled={ocupado} data-testid="exportar-biblioteca">
          <Download size={13} /> Exportar JSON
        </button>
        <label style={{ ...botao, cursor: ocupado ? 'default' : 'pointer' }} title="Só administrador. O que já foi conferido nesta instalação não é trocado">
          <Upload size={13} /> Importar JSON
          <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importarBiblioteca} disabled={ocupado} data-testid="importar-biblioteca" />
        </label>
      </div>
    </div>
  );
}
