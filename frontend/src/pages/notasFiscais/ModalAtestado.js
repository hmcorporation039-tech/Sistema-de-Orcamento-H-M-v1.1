import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, FileDown, Mail, Copy } from 'lucide-react';
import { previaAtestadoNotaFiscal, baixarAtestadoNotaFiscal, getPropostasCandidatasNotaFiscal, vincularPropostaNotaFiscal, enviarAtestadoNotaFiscal, getNotasCandidatasNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos, Campo } from '../../components/ui/estilos';
import { formatarMoeda, formatarData } from '../../utils/format';
import { baixarArquivo, mensagemDeErro } from '../../utils/download';
import { avisarObra, sub } from './comum';

// ── Atestado de capacidade técnica ────────────────────────────────────────────
// No modelo formal da H&M: só o corpo, sem timbre (o papel é do cliente). As atividades saem do texto
// da nota e a planilha dos itens da proposta ligada (ou das quantidades escritas na nota); o
// engenheiro confere e ajusta antes de copiar ou baixar. O sistema propõe; quem atesta é o cliente.

const OPCOES_VAZIAS = {
  mostrar_valor: false, contrato: '', local: '', inicio: '', fim: '', vigencia_inicio: '', vigencia_fim: '', area: '', cidade: '', setor: '',
  responsaveis: [], signatarios: [], atividades: null, planilha: null, notas_ids: [],
};

export function ModalAtestado({ nota, onFechar, onVinculado }) {
  const [op, setOp] = useState(OPCOES_VAZIAS);
  const [previa, setPrevia] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const [candidatas, setCandidatas] = useState([]);
  const [propostaId, setPropostaId] = useState(nota.proposta_id || '');
  const [outrasNotas, setOutrasNotas] = useState([]);
  const [para, setPara] = useState(nota.tomador_email || nota.tomador?.email || '');
  const [enviando, setEnviando] = useState(false);
  const [enviadoEm, setEnviadoEm] = useState(nota.atestado_enviado_em ? { em: nota.atestado_enviado_em, para: nota.atestado_enviado_para } : null);
  const localPreenchido = useRef(false);
  const mudar = (campo) => (e) => setOp(o => ({ ...o, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const mudarLinha = (lista, i, campo, valor) => setOp(o => ({ ...o, [lista]: o[lista].map((x, j) => (j === i ? { ...x, [campo]: valor } : x)) }));

  useEffect(() => { getPropostasCandidatasNotaFiscal(nota.id).then(r => setCandidatas(r.data)).catch(() => {}); }, [nota.id]);
  useEffect(() => { getNotasCandidatasNotaFiscal(nota.id).then(r => setOutrasNotas(r.data)).catch(() => {}); }, [nota.id]);

  // juntar (ou tirar) outra nota do mesmo contrato: as atividades e a planilha são refeitas com o texto de todas
  function alternarNota(id, marcada) {
    setOp(o => ({
      ...o, atividades: null, planilha: null,
      notas_ids: marcada ? [...o.notas_ids, id].slice(0, 10) : o.notas_ids.filter(x => x !== id),
    }));
  }

  async function enviarPorEmail() {
    setEnviando(true);
    try {
      const r = await enviarAtestadoNotaFiscal(nota.id, op, para, '');
      toast.success(r.data.mensagem);
      setEnviadoEm({ em: r.data.atestado_enviado_em, para: r.data.atestado_enviado_para });
      onVinculado?.();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar o atestado');
    } finally { setEnviando(false); }
  }

  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      previaAtestadoNotaFiscal(nota.id, op)
        .then(r => {
          if (!vivo) return;
          setPrevia(r.data);
          const sug = r.data.sugestao || {};
          // primeira vez (ou depois de trocar a proposta): preenche com o que a nota/proposta sugere
          setOp(o => {
            const prox = { ...o };
            if (o.atividades === null) prox.atividades = sug.atividades || '';
            if (o.planilha === null) prox.planilha = sug.planilha || '';
            if (!localPreenchido.current) { localPreenchido.current = true; if (!o.local && sug.local) prox.local = sug.local; }
            return (prox.atividades !== o.atividades || prox.planilha !== o.planilha || prox.local !== o.local) ? prox : o;
          });
        })
        .catch(err => { if (vivo) toast.error(err.response?.data?.erro || 'Erro ao montar o atestado'); });
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [nota.id, op]);

  async function trocarProposta(valor) {
    try {
      const { data: r } = await vincularPropostaNotaFiscal(nota.id, valor || null);
      setPropostaId(valor);
      localPreenchido.current = false;
      setOp(o => ({ ...o, atividades: null, planilha: null, local: '' })); // refaz a partir da nova proposta
      onVinculado?.();
      // os Pix já ligados à nota e sem obra vão para a obra da proposta (o backend nunca troca obra existente)
      const n = r.obras_preenchidas || 0;
      const levados = n === 0 ? '' : n === 1 ? '; 1 Pix da nota foi para a obra da proposta' : `; ${n} Pix da nota foram para a obra da proposta`;
      toast.success(valor ? `Nota ligada à proposta${levados}` : 'Vínculo com a proposta removido');
      avisarObra(r.avisos || []);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao ligar a proposta');
    }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(previa.texto); toast.success('Texto copiado — cole no papel timbrado do cliente'); }
    catch { toast.error('Não deu para copiar; selecione o texto e use Ctrl+C'); }
  }
  async function baixar() {
    setBaixando(true);
    try { await baixarArquivo(baixarAtestadoNotaFiscal(nota.id, op), `Atestado_NFS-e_${nota.numero || nota.id}.docx`); }
    catch (err) { toast.error(await mensagemDeErro(err, 'Erro ao gerar o Word')); }
    finally { setBaixando(false); }
  }

  const linha = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' };
  const mini = { flex: '1 1 140px', minWidth: 0 };
  const refazer = (campo) => () => setOp(o => ({ ...o, [campo]: null }));

  return (
    <Modal titulo={`Atestado de capacidade técnica — NFS-e nº ${nota.numero}`} onFechar={onFechar} largura={1000}>
      <p style={{ ...estilos.ajuda, marginTop: 0 }}>
        Segue o modelo da H&amp;M, só o corpo (sem timbre): o cliente cola no papel dele, confere e assina. O número da nota entra sozinho; as atividades vêm do texto da nota
        e a planilha, dos itens da proposta ligada. Preencha só o que for real: o que ficar em branco não entra no texto.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start', minWidth: 0 }}>
          <Campo label="Proposta desta nota">
            <select value={propostaId} onChange={(e) => trocarProposta(e.target.value)} data-testid="atestado-proposta">
              <option value="">{nota.cliente_id ? 'Sem proposta ligada' : 'Nota sem cliente cadastrado'}</option>
              {candidatas.map(p => <option key={p.id} value={p.id}>{p.numero} · {formatarMoeda(p.total)}{p.local_obra ? ` · ${p.local_obra}` : ''}{p.status !== 'Aprovada' ? ` (${p.status})` : ''}</option>)}
            </select>
          </Campo>

          {outrasNotas.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              <strong style={{ fontSize: 12 }}>Juntar outras notas do mesmo contrato (um atestado só)</strong>
              <div style={{ maxHeight: 110, overflowY: 'auto', border: '1px solid var(--borda)', borderRadius: 8 }}>
                {outrasNotas.map(o => (
                  <label key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 10px', fontSize: 12.5 }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={op.notas_ids.includes(o.id)} onChange={(e) => alternarNota(o.id, e.target.checked)} data-testid={`atestado-nota-${o.id}`} />
                    <span>NFS-e {o.numero} · {formatarData(o.data_emissao)} · {formatarMoeda(o.valor_servicos)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={linha}>
            <Campo label="Contrato / instrumento"><input value={op.contrato} onChange={mudar('contrato')} /></Campo>
            <Campo label="Área / quantitativo"><input value={op.area} onChange={mudar('area')} placeholder="Ex.: m² 320,00" /></Campo>
          </div>
          <Campo label="Endereço do serviço"><input value={op.local} onChange={mudar('local')} /></Campo>
          <div style={linha}>
            <Campo label="Início da execução"><input type="date" value={op.inicio} onChange={mudar('inicio')} /></Campo>
            <Campo label="Conclusão"><input type="date" value={op.fim} onChange={mudar('fim')} /></Campo>
          </div>
          <div style={linha}>
            <Campo label="Vigência: início"><input type="date" value={op.vigencia_inicio} onChange={mudar('vigencia_inicio')} /></Campo>
            <Campo label="Vigência: fim"><input type="date" value={op.vigencia_fim} onChange={mudar('vigencia_fim')} /></Campo>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 12 }}>Responsável técnico (CREA/ART)</strong>
            {op.responsaveis.map((r, i) => (
              <div key={i} style={linha}>
                <input style={mini} placeholder="Nome" value={r.nome} onChange={e => mudarLinha('responsaveis', i, 'nome', e.target.value)} />
                <input style={mini} placeholder="Título (Engenheiro Eletricista)" value={r.titulo} onChange={e => mudarLinha('responsaveis', i, 'titulo', e.target.value)} />
                <input style={{ ...mini, flexBasis: 90 }} placeholder="CREA/CAU" value={r.crea} onChange={e => mudarLinha('responsaveis', i, 'crea', e.target.value)} />
                <input style={{ ...mini, flexBasis: 90 }} placeholder="ART/RRT" value={r.art} onChange={e => mudarLinha('responsaveis', i, 'art', e.target.value)} />
                <button type="button" onClick={() => setOp(o => ({ ...o, responsaveis: o.responsaveis.filter((_, j) => j !== i) }))} style={estilos.btnSecundario} aria-label="Remover responsável">×</button>
              </div>
            ))}
            {op.responsaveis.length < 5 && (
              <button type="button" style={{ ...estilos.btnSecundario, justifySelf: 'start' }}
                onClick={() => setOp(o => ({ ...o, responsaveis: [...o.responsaveis, { nome: '', titulo: '', crea: '', art: '' }] }))}><Plus size={12} /> Adicionar responsável</button>
            )}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <strong style={{ fontSize: 12 }}>Assinatura do cliente</strong>
            <div style={linha}>
              <Campo label="Cidade"><input value={op.cidade} onChange={mudar('cidade')} placeholder="Da data: padrão é a do cliente" /></Campo>
              <Campo label="Setor / gerência"><input value={op.setor} onChange={mudar('setor')} /></Campo>
            </div>
            {op.signatarios.map((s, i) => (
              <div key={i} style={linha}>
                <input style={mini} placeholder="Nome do signatário" value={s.nome} onChange={e => mudarLinha('signatarios', i, 'nome', e.target.value)} />
                <input style={mini} placeholder="Cargo / função" value={s.cargo} onChange={e => mudarLinha('signatarios', i, 'cargo', e.target.value)} />
                <button type="button" onClick={() => setOp(o => ({ ...o, signatarios: o.signatarios.filter((_, j) => j !== i) }))} style={estilos.btnSecundario} aria-label="Remover signatário">×</button>
              </div>
            ))}
            {op.signatarios.length < 4 && (
              <button type="button" style={{ ...estilos.btnSecundario, justifySelf: 'start' }}
                onClick={() => setOp(o => ({ ...o, signatarios: [...o.signatarios, { nome: '', cargo: '' }] }))}><Plus size={12} /> Adicionar signatário</button>
            )}
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={op.mostrar_valor} onChange={mudar('mostrar_valor')} /> Citar o valor da nota ({formatarMoeda(nota.valor_servicos)})
          </label>

          <Campo label={<>Atividades (um grupo por “Título:” e uma atividade por linha) <button type="button" onClick={refazer('atividades')} style={{ ...estilos.btnSecundario, padding: '1px 8px', fontSize: 11 }}>Refazer pela nota</button></>}>
            <textarea rows={8} value={op.atividades ?? ''} onChange={mudar('atividades')} data-testid="atestado-atividades" />
          </Campo>
          <Campo label={<>Planilha de serviços (“descrição | un 4”; apague tudo para omitir) <button type="button" onClick={refazer('planilha')} style={{ ...estilos.btnSecundario, padding: '1px 8px', fontSize: 11 }}>Refazer</button></>}>
            <textarea rows={8} value={op.planilha ?? ''} onChange={mudar('planilha')} data-testid="atestado-planilha" />
          </Campo>
        </div>

        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 12 }}>Prévia do texto</strong>
          <textarea readOnly value={previa?.texto || 'Montando…'} rows={30} style={{ width: '100%', fontFamily: 'inherit', lineHeight: 1.45, marginTop: 4 }} data-testid="atestado-texto" />
          {previa?.avisos?.map(a => <p key={a} style={{ ...estilos.ajuda, margin: '6px 0 0' }}>• {a}</p>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--borda)' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <Campo label="Enviar o Word ao cliente por e-mail (até 5, separados por vírgula)">
            <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="juridico@cliente.com.br" data-testid="atestado-email-para" />
          </Campo>
        </div>
        <button type="button" onClick={enviarPorEmail} disabled={!previa || enviando || !para.trim()} style={estilos.btnSecundario} data-testid="atestado-enviar">
          <Mail size={13} /> {enviando ? 'Enviando…' : 'Enviar por e-mail'}
        </button>
        {enviadoEm && <span style={{ ...sub, flexBasis: '100%' }}>Já enviado em {formatarData(enviadoEm.em)} para {enviadoEm.para}.</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Fechar</button>
        <button type="button" onClick={copiar} disabled={!previa} style={estilos.btnSecundario}><Copy size={13} /> Copiar texto</button>
        <button type="button" onClick={baixar} disabled={!previa || baixando} style={estilos.btnPrimario}><FileDown size={13} /> {baixando ? 'Gerando…' : 'Baixar Word (.docx)'}</button>
      </div>
    </Modal>
  );
}
