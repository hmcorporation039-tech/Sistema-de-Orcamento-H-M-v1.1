// Mapa do CAD (item 3 do plano): o que o sistema entendeu de cada layer do DWG/DXF com símbolos desenhados
// (QiBuilder/AltoQi, PDF convertido). O engenheiro confere o tipo e a altura; cada confirmação fica na
// análise, vira aprendizado (o próximo desenho do escritório já vem certo) e, ao reprocessar, entra no orçamento.
// Até conferir, esses pontos NÃO entram no orçamento.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCheck, RefreshCw, Undo2 } from 'lucide-react';
import { getMapaCad, salvarMapaCad, reprocessarMapaCad } from '../../services/api';
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
const LIMITE_LINHAS = 60;
const campo = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '5px 7px', boxSizing: 'border-box', fontFamily: 'inherit' };
const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #2f2f2f', background: '#1a1a1a', color: '#ddd', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };

const br = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const paraNumero = (t) => { const n = Number(String(t).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
const cm = (medida) => (medida || []).map(m => Math.round(m * 100)).join(' × ');

export default function MapaCad({ analiseId, estiloCartao, estiloTitulo }) {
  const navigate = useNavigate();
  const [mapa, setMapa] = useState(null); // { disponivel, arquivos, tipos }
  const [edicao, setEdicao] = useState({}); // `${arquivo}|${idx}` → { simbolo, altura }
  const [ocupado, setOcupado] = useState(false);
  const [mostrarTodas, setMostrarTodas] = useState({});

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

  if (!mapa?.disponivel) return null;
  const totalConferidas = mapa.arquivos.reduce((t, a) => t + a.resumo.conferidas, 0);
  const totalPontosPendentes = mapa.arquivos.reduce((t, a) => t + a.resumo.pontosPendentes, 0);

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
      const r = await reprocessarMapaCad(analiseId);
      toast.success('Nova análise gravada com o mapa conferido. A anterior continua salva.');
      navigate(`/obras/analise/${r.data.id}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui reprocessar a análise'), { duration: 10000 });
    } finally { setOcupado(false); }
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
                      <tr key={s.idx} style={{ borderTop: '1px solid #1e1e1e' }} data-testid={`linha-mapa-${s.idx}`}>
                        <td style={{ padding: '6px 8px', color: '#ddd', whiteSpace: 'nowrap' }}>{s.layer}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }}>{cm(s.medida)}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }} title="pontos que entram na contagem / símbolos desta forma no desenho">
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
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: corOrigem }}>{rotuloOrigem}</span>
                          {s.corrigido && <span style={{ color: 'var(--texto-3)' }} title={`o sistema tinha proposto: ${s.proposto?.simbolo}`}> · corrigido</span>}
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
    </div>
  );
}
