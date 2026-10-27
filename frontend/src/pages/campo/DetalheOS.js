// Detalhe da OS: obra, endereço (mapa), descrição, iniciar, checklist por
// grupo, itens extras, fotos gerais, observação final, assinatura e concluir.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight, Map as IconeMapa, PenLine, Flag, Plus, UploadCloud } from 'lucide-react';
import { useCampo } from './CampoApp';
import {
  agruparChecklist, conferirConclusao, temAvisosConclusao, progresso, ROTULO_STATUS, ROTULO_TIPO_OS,
} from './operacoes';
import { novoUuid } from './uuid';
import { obterPosicao } from './imagem';
import { baixarArquivo } from './apiCampo';
import { COR, COR_STATUS, Botao, Cartao, Selo, BotaoFoto, Miniatura, Modal, formatarData, formatarDataHora } from './componentes';

const OPCOES = [
  ['conforme', 'Conforme', 'verde', CheckCircle2],
  ['nao_conforme', 'Não conforme', 'vermelho', XCircle],
  ['na', 'N/A', 'cinza', MinusCircle],
];
const COR_OPCAO = { conforme: COR.verde, nao_conforme: COR.vermelho, na: COR.cinza };

function useVisao(uuid) {
  const { visoes } = useCampo();
  return useMemo(() => visoes.find(v => v.uuid === uuid) || null, [visoes, uuid]);
}

function ItemChecklist({ item, os, editavel }) {
  const { dados } = useCampo();
  const [obs, setObs] = useState(item.observacao || '');
  const [mostrarObs, setMostrarObs] = useState(!!item.observacao || item.resposta === 'nao_conforme');
  const focado = useRef(false);
  const ref = useRef(null);
  useEffect(() => { if (!focado.current) setObs(item.observacao || ''); }, [item.observacao]);
  const fotos = (os.fotos || []).filter(f => f.item_id === item.id || (item.fotos || []).includes(f.uuid));
  const nc = item.resposta === 'nao_conforme';

  async function responder(resposta) {
    await dados.registrar('responder', os.uuid, { item_id: item.id, resposta, observacao: obs });
    if (resposta === 'nao_conforme') {
      setMostrarObs(true);
      setTimeout(() => ref.current && ref.current.focus(), 50);
    }
  }
  async function salvarObs() {
    focado.current = false;
    // Resposta atual lida do aparelho, não das props: logo depois de tocar em
    // "Não conforme" a tela pode ainda não ter recarregado, e a observação
    // gravaria a resposta antiga por cima.
    const atual = (await dados.visao(os.uuid))?.checklist.find(i => i.id === item.id);
    if (obs === (atual?.observacao || '')) return;
    await dados.registrar('responder', os.uuid, { item_id: item.id, resposta: atual?.resposta ?? null, observacao: obs });
  }
  return (
    <div data-testid="item-checklist" data-item={item.id}
      style={{ borderTop: `1px solid ${COR.borda}`, padding: '12px 0', borderLeft: item.resposta ? `5px solid ${COR_OPCAO[item.resposta]}` : '5px solid transparent', paddingLeft: 10 }}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>
        {item.texto}{item.extra && <Selo style={{ marginLeft: 6, fontSize: 12 }}>extra</Selo>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: 6 }}>
        {OPCOES.map(([valor, rotulo, variante, Icone]) => {
          const ativo = item.resposta === valor;
          return (
            <Botao key={valor} variante={ativo ? variante : 'contorno'} disabled={!editavel} aria-pressed={ativo}
              onClick={() => responder(valor)} data-resposta={valor}
              style={{ padding: '8px 4px', fontSize: 15, minHeight: 56, flexDirection: 'column', gap: 2,
                borderColor: ativo ? undefined : COR_OPCAO[valor], opacity: !editavel && !ativo ? 0.45 : 1 }}>
              <Icone size={22} />{rotulo}
            </Botao>
          );
        })}
      </div>
      {(mostrarObs || nc) ? (
        <div style={{ marginTop: 8 }}>
          <textarea ref={ref} rows={2} value={obs} disabled={!editavel} placeholder={nc ? 'Descreva a não conformidade' : 'Observação'}
            aria-label={`Observação: ${item.texto}`}
            onFocus={() => { focado.current = true; }} onChange={e => setObs(e.target.value)} onBlur={salvarObs}
            style={{ borderColor: nc && !obs.trim() ? COR.vermelho : undefined }} />
          {nc && !obs.trim() && <div style={{ color: '#ff8a8a', fontSize: 15, fontWeight: 700 }}>Não conforme: descreva o problema.</div>}
        </div>
      ) : editavel && (
        <button type="button" onClick={() => setMostrarObs(true)}
          style={{ background: 'none', border: 'none', color: COR.ouroForte, fontSize: 16, padding: '10px 0', fontWeight: 700 }}>
          + Observação
        </button>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        {fotos.map(f => <Miniatura key={f.uuid} foto={f} dados={dados} tamanho={68} />)}
        {editavel && (
          <BotaoFoto rotulo={fotos.length ? 'Mais foto' : 'Foto'} style={{ flex: '1 1 120px' }} testId="foto-item"
            onFoto={img => dados.guardarFoto({ os_uuid: os.uuid, item_id: item.id, legenda: '', ...img })} />
        )}
      </div>
      {nc && fotos.length === 0 && <div style={{ color: COR.aviso, fontSize: 15, marginTop: 4 }}>Tire uma foto da não conformidade.</div>}
    </div>
  );
}

function Grupo({ grupo, os, editavel }) {
  const feitos = grupo.itens.filter(i => i.resposta).length;
  const [aberto, setAberto] = useState(true);
  return (
    <Cartao style={{ padding: 0 }}>
      <button type="button" onClick={() => setAberto(a => !a)} aria-expanded={aberto}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 14, background: 'none', border: 'none', color: COR.texto, textAlign: 'left' }}>
        {aberto ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
        <span style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{grupo.nome}</span>
        <Selo cor={feitos === grupo.itens.length ? COR.verde : COR.superficie2}>{feitos}/{grupo.itens.length}</Selo>
      </button>
      {aberto && (
        <div style={{ padding: '0 12px 4px' }}>
          {grupo.itens.map(item => <ItemChecklist key={item.id} item={item} os={os} editavel={editavel} />)}
        </div>
      )}
    </Cartao>
  );
}

function ItemExtra({ os }) {
  const { dados } = useCampo();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [grupo, setGrupo] = useState('Extras');
  async function adicionar() {
    if (!texto.trim()) return;
    await dados.registrar('item_extra', os.uuid, { item_id: `x-${novoUuid()}`, grupo: grupo.trim() || 'Extras', texto: texto.trim() });
    setTexto('');
    setAberto(false);
  }
  if (!aberto) {
    return <Botao variante="contorno" onClick={() => setAberto(true)} style={{ width: '100%', marginBottom: 12 }}><Plus size={20} />Item extra no checklist</Botao>;
  }
  return (
    <Cartao>
      <label htmlFor="extra-texto">Item a verificar</label>
      <input id="extra-texto" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ex.: Caixa de passagem sem tampa" />
      <label htmlFor="extra-grupo">Grupo</label>
      <input id="extra-grupo" value={grupo} onChange={e => setGrupo(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Botao variante="contorno" onClick={() => setAberto(false)} style={{ flex: 1 }}>Cancelar</Botao>
        <Botao onClick={adicionar} disabled={!texto.trim()} style={{ flex: 1 }}>Adicionar</Botao>
      </div>
    </Cartao>
  );
}

function FotosGerais({ os, editavel }) {
  const { dados } = useCampo();
  const [legenda, setLegenda] = useState('');
  const gerais = (os.fotos || []).filter(f => !f.item_id);
  return (
    <Cartao>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Fotos gerais ({gerais.length})</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {gerais.map(f => (
          <div key={f.uuid} style={{ width: 96 }}>
            <Miniatura foto={f} dados={dados} tamanho={96} />
            <div style={{ fontSize: 13, color: COR.texto2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.legenda || '—'}</div>
          </div>
        ))}
      </div>
      {editavel && (
        <>
          <label htmlFor="legenda-foto">Legenda da próxima foto</label>
          <input id="legenda-foto" value={legenda} onChange={e => setLegenda(e.target.value)} placeholder="Ex.: Fachada / quadro geral" />
          <BotaoFoto grande variante="ouro" rotulo="Tirar foto geral" style={{ width: '100%', marginTop: 10 }} testId="foto-geral"
            onFoto={async img => { await dados.guardarFoto({ os_uuid: os.uuid, item_id: null, legenda: legenda.trim(), ...img }); setLegenda(''); }} />
        </>
      )}
    </Cartao>
  );
}

function ObservacaoFinal({ os, editavel }) {
  const { dados } = useCampo();
  const [texto, setTexto] = useState(os.observacao_final || '');
  const focado = useRef(false);
  useEffect(() => { if (!focado.current) setTexto(os.observacao_final || ''); }, [os.observacao_final]);
  async function salvar() {
    focado.current = false;
    if (texto === (os.observacao_final || '')) return;
    await dados.registrar('observacao', os.uuid, { texto });
  }
  return (
    <Cartao>
      <label htmlFor="obs-final" style={{ marginTop: 0, fontSize: 18, color: COR.texto }}>Observação final</label>
      <textarea id="obs-final" rows={4} value={texto} disabled={!editavel} onFocus={() => { focado.current = true; }}
        onChange={e => setTexto(e.target.value)} onBlur={salvar} placeholder="Resumo do serviço, recomendações ao cliente…" />
    </Cartao>
  );
}

export function ImagemAssinatura({ assinatura }) {
  const [url, setUrl] = useState(assinatura?.png_local || null);
  useEffect(() => {
    if (assinatura?.png_local) { setUrl(assinatura.png_local); return undefined; }
    let vivo = true;
    let criada = null;
    if (assinatura?.url && navigator.onLine) {
      baixarArquivo(assinatura.url).then(b => { if (vivo) { criada = URL.createObjectURL(b); setUrl(criada); } }).catch(() => {});
    }
    return () => { vivo = false; if (criada) URL.revokeObjectURL(criada); };
  }, [assinatura?.png_local, assinatura?.url]);
  if (!url) return <div style={{ color: COR.texto3 }}>Assinatura guardada no servidor.</div>;
  return <img src={url} alt="Assinatura do cliente" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', background: '#fff', borderRadius: 8 }} />;
}

function ListaAvisos({ titulo, itens }) {
  if (!itens.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 800, color: COR.aviso }}>{titulo} ({itens.length})</div>
      <ul style={{ paddingLeft: 20, color: COR.texto2, fontSize: 15 }}>
        {itens.slice(0, 8).map(i => <li key={i.id}>{i.texto}</li>)}
        {itens.length > 8 && <li>…e mais {itens.length - 8}</li>}
      </ul>
    </div>
  );
}

export default function DetalheOS() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { dados } = useCampo();
  const os = useVisao(uuid);
  const [confirmar, setConfirmar] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  if (!os) {
    return (
      <div style={{ paddingTop: 16 }}>
        <Botao variante="contorno" onClick={() => navigate('/campo/')}><ArrowLeft size={20} />Minhas OS</Botao>
        <Cartao style={{ marginTop: 12 }}>OS não encontrada neste aparelho. Sincronize com rede.</Cartao>
      </div>
    );
  }
  const editavel = os.status === 'em_execucao';
  const grupos = agruparChecklist(os.checklist);
  const p = progresso(os);
  const [fundo, corTexto] = COR_STATUS[os.status] || COR_STATUS.aberta;
  const endereco = os.obra?.endereco || os.obra?.local || '';
  const pend = os.pendencias?.total || 0;

  async function iniciar() {
    setOcupado(true);
    try {
      const pos = await obterPosicao();
      await dados.registrar('iniciar', os.uuid, pos);
    } finally { setOcupado(false); }
  }
  function pedirConclusao() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // grava a observação em edição
    setConfirmar(conferirConclusao(os));
  }
  async function concluir() {
    setOcupado(true);
    try {
      const pos = await obterPosicao();
      await dados.registrar('concluir', os.uuid, pos);
      setConfirmar(null);
    } finally { setOcupado(false); }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <Botao variante="contorno" onClick={() => navigate('/campo/')} style={{ marginBottom: 12 }}><ArrowLeft size={20} />Minhas OS</Botao>

      <Cartao>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: COR.texto3, fontWeight: 700, fontSize: 15 }}>{os.numero || 'OS nova (ainda não enviada)'}</span>
          <Selo cor={fundo} texto={corTexto}>{ROTULO_STATUS[os.status] || os.status}</Selo>
        </div>
        <h1 style={{ fontSize: 23, margin: '6px 0', lineHeight: 1.25 }}>{os.titulo}</h1>
        <div style={{ color: COR.texto2, fontSize: 16 }}>
          {ROTULO_TIPO_OS[os.tipo] || os.tipo}{os.disciplina ? ` · ${os.disciplina}` : ''} · {formatarData(os.agendada_para)}
        </div>
        {pend > 0 && (
          <div style={{ marginTop: 8 }}>
            <Selo cor={COR.aviso} texto="#000" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><UploadCloud size={15} />{pend} a enviar</Selo>
          </div>
        )}
      </Cartao>

      {os.obra && (
        <Cartao>
          <div style={{ fontSize: 14, color: COR.texto3, fontWeight: 700 }}>{os.obra.codigo || 'Obra'}</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{os.obra.nome}</div>
          {os.obra.cliente_nome && <div style={{ color: COR.texto2 }}>{os.obra.cliente_nome}</div>}
          {endereco && (
            <>
              <div style={{ marginTop: 6 }}>{endereco}</div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontWeight: 800, fontSize: 17, minHeight: 44 }}>
                <IconeMapa size={20} />Abrir no mapa
              </a>
            </>
          )}
        </Cartao>
      )}

      {os.descricao && <Cartao><div style={{ whiteSpace: 'pre-wrap' }}>{os.descricao}</div></Cartao>}

      {os.status === 'aberta' && (
        <Botao grande onClick={iniciar} disabled={ocupado} style={{ width: '100%', marginBottom: 12 }} data-testid="iniciar">
          <Play size={22} />Iniciar
        </Botao>
      )}

      {grupos.length > 0 && (
        <h2 style={{ fontSize: 20, margin: '8px 0' }}>Checklist {p.feitos}/{p.total}{os.status === 'aberta' ? ' (toque em Iniciar para responder)' : ''}</h2>
      )}
      {grupos.map(g => <Grupo key={g.nome} grupo={g} os={os} editavel={editavel} />)}
      {editavel && <ItemExtra os={os} />}

      {os.status !== 'aberta' && <FotosGerais os={os} editavel={editavel} />}
      {os.status !== 'aberta' && <ObservacaoFinal os={os} editavel={editavel} />}

      {os.status !== 'aberta' && os.status !== 'cancelada' && (
        <Cartao>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Assinatura do cliente</h3>
          {os.assinatura ? (
            <>
              <ImagemAssinatura assinatura={os.assinatura} />
              <div style={{ marginTop: 6 }}>{os.assinatura.nome}{os.assinatura.documento ? ` · ${os.assinatura.documento}` : ''}</div>
              <div style={{ color: COR.texto3, fontSize: 14 }}>{formatarDataHora(os.assinatura.assinada_em)}</div>
            </>
          ) : (
            <Botao grande variante="contorno" onClick={() => navigate(`/campo/os/${os.uuid}/assinatura`)} style={{ width: '100%' }} data-testid="coletar-assinatura">
              <PenLine size={22} />Coletar assinatura
            </Botao>
          )}
        </Cartao>
      )}

      {editavel && (
        <Botao grande variante="verde" onClick={pedirConclusao} disabled={ocupado} style={{ width: '100%', marginTop: 4 }} data-testid="concluir">
          <Flag size={22} />Concluir OS
        </Botao>
      )}
      {os.status === 'concluida' && (
        <Cartao style={{ borderColor: COR.verde }}>Concluída em {formatarDataHora(os.concluida_em)}.</Cartao>
      )}

      {confirmar && (
        <Modal titulo={temAvisosConclusao(confirmar) ? 'Antes de concluir' : 'Concluir a OS?'} onFechar={() => setConfirmar(null)}>
          <ListaAvisos titulo="Itens sem resposta" itens={confirmar.semResposta} />
          <ListaAvisos titulo="Não conformes sem observação" itens={confirmar.ncSemObservacao} />
          <ListaAvisos titulo="Não conformes sem foto" itens={confirmar.ncSemFoto} />
          {confirmar.semAssinatura && <div style={{ fontWeight: 800, color: COR.aviso, marginBottom: 10 }}>Sem assinatura do cliente.</div>}
          {!temAvisosConclusao(confirmar) && <p style={{ marginBottom: 12 }}>Tudo respondido. Depois de concluída, a OS não pode mais ser alterada no campo.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            <Botao grande variante="verde" onClick={concluir} disabled={ocupado} data-testid="confirmar-conclusao">
              {temAvisosConclusao(confirmar) ? 'Concluir mesmo assim' : 'Concluir'}
            </Botao>
            <Botao grande variante="contorno" onClick={() => setConfirmar(null)}>Voltar e corrigir</Botao>
          </div>
        </Modal>
      )}
    </div>
  );
}
