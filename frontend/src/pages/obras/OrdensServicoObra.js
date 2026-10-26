import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Download, Pencil, Eye, X, Ban, Trash2, Save, RefreshCw, Camera, PenLine, History } from 'lucide-react';
import {
  getOrdensServicoObra, getOrdemServico, getModelosChecklist, criarOrdemServico, atualizarOrdemServico,
  removerOrdemServico, baixarPdfOrdemServico, getArquivoCampo, getUsuarios,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Select from '../../components/Select';
import { Etiqueta, estilos as E, Campo } from './comum';

// Aba "Campo (OS)" da obra (versão 2.0, Fase 4J): ordens de serviço que o
// técnico executa no app de campo (/campo, celular, sem rede). Aqui o
// escritório cria/edita, acompanha o checklist, fotos e assinatura e baixa o
// PDF. Contrato da API: docs/CAMPO-API.md. A OS aberta fica em ?os=ID (F5
// mantém). Editar: dono da obra ou admin; cancelar/excluir: admin.

export const STATUS_OS = {
  aberta: { rotulo: 'Aberta', cor: '#c9a227', bg: '#1a1a0a', borda: '#4a3d10' },
  em_execucao: { rotulo: 'Em execução', cor: '#5fc9c0', bg: '#0a1a19', borda: '#1a4a46' },
  concluida: { rotulo: 'Concluída', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' },
  cancelada: { rotulo: 'Cancelada', cor: '#b04040', bg: '#1a0a0a', borda: '#4a1a1a' },
};
const TIPOS_OS = { instalacao: 'Instalação', manutencao: 'Manutenção', vistoria: 'Vistoria (laudo)', visita: 'Visita técnica', outro: 'Outro' };
const RESPOSTA = {
  conforme: { rotulo: 'Conforme', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' },
  nao_conforme: { rotulo: 'Não conforme', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a' },
  na: { rotulo: 'Não se aplica', cor: '#999', bg: '#151515', borda: '#2f2f2f' },
};
const FILTROS = { ativas: 'Abertas e em execução', todas: 'Todas', concluida: 'Concluídas', cancelada: 'Canceladas' };

const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const dataCurta = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
const coord = (p) => (p ? `${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)}` : '');
const nomeDisciplina = (modelos, chave) => {
  const m = modelos.find(x => x.disciplina === chave);
  return m ? m.rotulo.replace(/^Inspeção — /, '') : (chave || '—');
};

function baixarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

async function erroDoBlob(e, padrao) {
  try { return JSON.parse(await e.response.data.text()).erro || padrao; } catch { return padrao; }
}

export default function OrdensServicoObra({ obra, podeEditar }) {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [parametros, setParametros] = useSearchParams();
  const vendo = parametros.get('os');
  const [lista, setLista] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [filtro, setFiltro] = useState('ativas');
  const [form, setForm] = useState(null); // { os? } — null = fechado
  const [versaoLista, setVersaoLista] = useState(0);

  const recarregar = useCallback(() => setVersaoLista(v => v + 1), []);
  useEffect(() => {
    getOrdensServicoObra(obra.id).then(r => setLista(r.data.itens || [])).catch(e => { setLista([]); toast.error(e.response?.data?.erro || 'Erro ao carregar as OS'); });
  }, [obra.id, versaoLista]);
  useEffect(() => { getModelosChecklist().then(r => setModelos(r.data.itens || [])).catch(() => {}); }, []);

  const abrir = (id) => { const p = new URLSearchParams(parametros); if (id) p.set('os', String(id)); else p.delete('os'); setParametros(p, { replace: true }); };
  const filtradas = useMemo(() => (lista || []).filter(o => (filtro === 'todas' ? true
    : filtro === 'ativas' ? ['aberta', 'em_execucao'].includes(o.status) : o.status === filtro)), [lista, filtro]);

  if (vendo) {
    return <VerOS id={vendo} modelos={modelos} ehAdmin={ehAdmin} onFechar={() => abrir(null)}
      onEditar={(os) => { abrir(null); setForm({ os }); }} onMudou={recarregar} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h3 style={{ color: '#c9a227', fontSize: 14, fontWeight: 700, flex: 1, margin: 0 }}>Ordens de serviço de campo</h3>
        <Select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ width: 210 }} aria-label="Filtrar OS">
          {Object.entries(FILTROS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button type="button" onClick={recarregar} style={E.btnSecundario} title="Atualizar a lista"><RefreshCw size={13} /></button>
        {podeEditar && obra.status !== 'cancelada' && !form && (
          <button type="button" onClick={() => setForm({})} style={E.btnPrimario}><Plus size={13} /> Nova OS</button>
        )}
      </div>
      <p style={{ color: '#777', fontSize: 12, margin: '0 0 10px' }}>
        O técnico responsável vê a OS no app de campo (<code>/campo</code> no celular), responde o checklist, tira fotos e colhe a assinatura do cliente — mesmo sem rede.
        Fotos e assinatura ficam na pasta da obra, em <code>Campo\&lt;número da OS&gt;</code>.
      </p>

      {form && (
        <FormOS obra={obra} os={form.os} modelos={modelos} ehAdmin={ehAdmin} usuario={usuario}
          onCancelar={() => setForm(null)}
          onSalvo={(os) => { setForm(null); recarregar(); abrir(os.id); }} />
      )}

      <div style={E.caixaTabela}>
        <table style={E.tabela}>
          <thead>
            <tr style={{ background: '#0f0f0f' }}>
              {['Número', 'Título', 'Tipo', 'Responsável', 'Agendada', 'Status', 'Checklist', 'Fotos', ''].map((c, i) => (
                <th key={i} style={{ ...E.th, ...(i >= 6 && i < 8 ? { textAlign: 'center' } : {}) }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista === null && <tr><td colSpan={9} style={E.tdVazio}>Carregando...</td></tr>}
            {lista !== null && filtradas.length === 0 && (
              <tr><td colSpan={9} style={E.tdVazio}>{lista.length ? 'Nenhuma OS neste filtro.' : 'Nenhuma ordem de serviço nesta obra ainda.'}</td></tr>
            )}
            {filtradas.map(o => (
              <tr key={o.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={{ ...E.td, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => abrir(o.id)} style={botaoLink}>{o.numero}</button>
                </td>
                <td style={E.td}>{o.titulo}{o.disciplina && <span style={{ color: '#777', fontSize: 10 }}> · {nomeDisciplina(modelos, o.disciplina)}</span>}</td>
                <td style={{ ...E.td, fontSize: 11, color: '#999' }}>{TIPOS_OS[o.tipo] || o.tipo}</td>
                <td style={E.td}>{o.responsavel_nome || <span style={{ color: '#777' }}>sem responsável</span>}</td>
                <td style={{ ...E.td, whiteSpace: 'nowrap' }}>{dataCurta(o.agendada_para)}</td>
                <td style={E.td}><Etiqueta info={STATUS_OS[o.status]}>{STATUS_OS[o.status]?.rotulo || o.status}</Etiqueta></td>
                <td style={{ ...E.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {o.resumo.total ? `${o.resumo.respondidos}/${o.resumo.total}` : '—'}
                  {o.resumo.nao_conforme > 0 && <span style={{ color: '#e08080', fontWeight: 700 }} title="não conformidades"> · {o.resumo.nao_conforme} NC</span>}
                </td>
                <td style={{ ...E.td, textAlign: 'center' }}>{o.fotos.length || '—'}{o.assinatura && <PenLine size={11} style={{ marginLeft: 5, color: '#3fb95f' }} aria-label="assinada" />}</td>
                <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => abrir(o.id)} style={E.btnIcone} title="Ver a OS"><Eye size={12} /></button>{' '}
                  <BotaoPdf os={o} icone />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BotaoPdf({ os, icone = false }) {
  const [gerando, setGerando] = useState(false);
  async function baixar() {
    setGerando(true);
    try {
      const r = await baixarPdfOrdemServico(os.id);
      baixarBlob(new Blob([r.data], { type: 'application/pdf' }), `${os.numero}.pdf`);
    } catch (e) {
      toast.error(await erroDoBlob(e, 'Erro ao gerar o PDF da OS'));
    } finally {
      setGerando(false);
    }
  }
  if (icone) return <button type="button" onClick={baixar} disabled={gerando} style={E.btnIcone} title="Baixar o PDF"><Download size={12} /></button>;
  return <button type="button" onClick={baixar} disabled={gerando} style={E.btnPrimario}><Download size={13} /> {gerando ? 'Gerando...' : 'Baixar PDF'}</button>;
}

// ── criar / editar ────────────────────────────────────────────────────
function FormOS({ obra, os, modelos, ehAdmin, usuario, onCancelar, onSalvo }) {
  const editando = !!os;
  const [dados, setDados] = useState(() => ({
    titulo: os?.titulo || '', descricao: os?.descricao || '', tipo: os?.tipo || 'instalacao',
    disciplina: os?.disciplina || '', modelo_checklist: os ? (os.modelo_checklist ?? '') : 'generico',
    responsavel_id: os?.responsavel_id ? String(os.responsavel_id) : '', agendada_para: os?.agendada_para || '',
  }));
  const [usuarios, setUsuarios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const checklistEmUso = editando && (os.status !== 'aberta' || os.checklist.some(i => i.respondido_em || i.extra || i.observacao));

  useEffect(() => {
    // a lista de usuários é só de admin; para os demais, "eu" e o responsável atual
    if (ehAdmin) getUsuarios().then(r => setUsuarios((r.data.itens || r.data || []).filter(u => u.ativo !== false))).catch(() => {});
    else {
      const l = [{ id: usuario?.id, nome: usuario?.nome }];
      if (os?.responsavel_id && os.responsavel_id !== usuario?.id) l.push({ id: os.responsavel_id, nome: os.responsavel_nome });
      setUsuarios(l);
    }
  }, [ehAdmin, usuario, os]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setDados(d => {
      const n = { ...d, [k]: v };
      // disciplina nova puxa o checklist dela (se o usuário ainda não escolheu outro)
      if (k === 'disciplina' && !checklistEmUso) {
        const anteriorAuto = d.modelo_checklist === 'generico' || d.modelo_checklist === d.disciplina;
        if (anteriorAuto) n.modelo_checklist = v && modelos.some(m => m.chave === v) ? v : 'generico';
      }
      return n;
    });
  };

  async function salvar(e) {
    e.preventDefault();
    if (!dados.titulo.trim()) { toast.error('Informe o título da OS'); return; }
    setSalvando(true);
    const corpo = {
      titulo: dados.titulo, descricao: dados.descricao, tipo: dados.tipo, disciplina: dados.disciplina || null,
      responsavel_id: dados.responsavel_id ? Number(dados.responsavel_id) : null, agendada_para: dados.agendada_para || null,
    };
    if (!editando || (dados.modelo_checklist || null) !== (os.modelo_checklist ?? null)) corpo.modelo_checklist = dados.modelo_checklist;
    try {
      const r = editando ? await atualizarOrdemServico(os.id, { ...corpo, versao: os.versao }) : await criarOrdemServico(obra.id, corpo);
      toast.success(editando ? `OS ${r.data.numero} salva` : `OS ${r.data.numero} criada`);
      onSalvo(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar a OS', { duration: 7000 });
    } finally {
      setSalvando(false);
    }
  }

  const disciplinas = modelos.filter(m => m.disciplina);
  const qtdItens = (modelos.find(m => m.chave === dados.modelo_checklist)?.itens || []).length;
  return (
    <form style={{ ...E.card, borderColor: '#4a3d10' }} onSubmit={salvar}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ color: '#eee', fontSize: 13, margin: 0, flex: 1 }}>{editando ? `Editar ${os.numero}` : 'Nova ordem de serviço'}</h4>
        <button type="button" onClick={onCancelar} style={E.btnIcone} title="Fechar"><X size={13} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Campo label="Título *" style={{ gridColumn: 'span 2' }}>
          <input value={dados.titulo} onChange={set('titulo')} maxLength={200} placeholder="Ex.: Instalação dos pontos de CFTV do bloco A" autoFocus />
        </Campo>
        <Campo label="Tipo">
          <Select value={dados.tipo} onChange={set('tipo')}>
            {Object.entries(TIPOS_OS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Campo>
        <Campo label="Disciplina">
          <Select value={dados.disciplina} onChange={set('disciplina')}>
            <option value="">Nenhuma (geral)</option>
            {disciplinas.map(m => <option key={m.disciplina} value={m.disciplina}>{m.rotulo.replace(/^Inspeção — /, '')}</option>)}
          </Select>
        </Campo>
        <Campo label="Responsável (técnico)">
          <Select value={dados.responsavel_id} onChange={set('responsavel_id')}>
            <option value="">Sem responsável</option>
            {usuarios.filter(u => u.id).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}
          </Select>
        </Campo>
        <Campo label="Agendada para">
          <input type="date" value={dados.agendada_para} onChange={set('agendada_para')} />
        </Campo>
        <Campo label={`Modelo de checklist${qtdItens ? ` (${qtdItens} itens)` : ''}`} style={{ gridColumn: 'span 2' }}>
          <Select value={dados.modelo_checklist} onChange={set('modelo_checklist')} disabled={checklistEmUso}
            title={checklistEmUso ? 'O checklist já tem respostas — o modelo não pode mais ser trocado' : undefined}>
            <option value="">Sem checklist</option>
            {modelos.map(m => <option key={m.chave} value={m.chave}>{m.rotulo}</option>)}
          </Select>
        </Campo>
        <Campo label="Descrição / escopo" style={{ gridColumn: '1 / -1' }}>
          <textarea rows={3} value={dados.descricao} onChange={set('descricao')} maxLength={5000} />
        </Campo>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end', alignItems: 'center' }}>
        {checklistEmUso && <span style={{ color: '#777', fontSize: 11, flex: 1 }}>O checklist já está em uso no campo: o modelo fica como está.</span>}
        <button type="button" onClick={onCancelar} style={E.btnSecundario}>Cancelar</button>
        <button type="submit" disabled={salvando} style={E.btnPrimario}><Save size={13} /> {salvando ? 'Salvando...' : (editando ? 'Salvar' : 'Criar OS')}</button>
      </div>
    </form>
  );
}

// ── ver a OS ──────────────────────────────────────────────────────────
function VerOS({ id, modelos, ehAdmin, onFechar, onEditar, onMudou }) {
  const [os, setOs] = useState(null);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    getOrdemServico(id).then(r => { setOs(r.data); setErro(null); }).catch(e => setErro(e.response?.data?.erro || 'Erro ao carregar a OS'));
  }, [id, versao]);
  const recarregar = () => { setVersao(v => v + 1); onMudou(); };

  if (erro) return <div style={E.card}><p style={{ color: '#e08080' }}>{erro}</p><button type="button" onClick={onFechar} style={E.btnSecundario}>Voltar para a lista</button></div>;
  if (!os) return <div className="loading">Carregando...</div>;

  const ativa = ['aberta', 'em_execucao'].includes(os.status);
  async function cancelar() {
    if (!window.confirm(`Cancelar a OS ${os.numero}? O técnico não poderá mais registrar nada nela.`)) return;
    try {
      await atualizarOrdemServico(os.id, { status: 'cancelada', versao: os.versao });
      toast.success(`OS ${os.numero} cancelada`);
      recarregar();
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao cancelar a OS', { duration: 7000 });
    }
  }
  async function excluir() {
    if (!window.confirm(`Excluir a OS ${os.numero}? Se ela já tiver fotos ou assinatura, será cancelada em vez de excluída.`)) return;
    try {
      const r = await removerOrdemServico(os.id);
      toast.success(r.data.mensagem, { duration: 6000 });
      if (r.data.cancelada) recarregar(); else { onMudou(); onFechar(); }
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao excluir a OS', { duration: 7000 });
    }
  }

  const grupos = [];
  for (const item of os.checklist) {
    let g = grupos.find(x => x.nome === item.grupo);
    if (!g) { g = { nome: item.grupo, itens: [] }; grupos.push(g); }
    g.itens.push(item);
  }
  const fotoPorUuid = new Map(os.fotos.map((f, i) => [f.uuid, { ...f, n: i + 1 }]));
  const r = os.resumo;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onFechar} style={{ ...E.btnSecundario, padding: '6px 10px' }} title="Voltar para a lista de OS"><X size={14} /></button>
        <span style={{ color: '#c9a227', fontWeight: 700, fontSize: 13 }}>{os.numero}</span>
        <h3 style={{ fontSize: 15, color: '#eee', margin: 0, flex: 1 }}>{os.titulo}</h3>
        <Etiqueta info={STATUS_OS[os.status]}>{STATUS_OS[os.status]?.rotulo}</Etiqueta>
        <BotaoPdf os={os} />
        {os.pode_editar && <button type="button" onClick={() => onEditar(os)} style={E.btnSecundario}><Pencil size={13} /> Editar</button>}
        {ehAdmin && ativa && <button type="button" onClick={cancelar} style={{ ...E.btnSecundario, color: '#e0a040' }}><Ban size={13} /> Cancelar OS</button>}
        {os.pode_excluir && <button type="button" onClick={excluir} style={{ ...E.btnSecundario, color: '#b04040' }}><Trash2 size={13} /> Excluir</button>}
      </div>

      <div style={E.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px 16px' }}>
          <Info rotulo="Tipo" valor={TIPOS_OS[os.tipo] || os.tipo} />
          <Info rotulo="Disciplina" valor={os.disciplina ? nomeDisciplina(modelos, os.disciplina) : '—'} />
          <Info rotulo="Responsável" valor={os.responsavel_nome || 'sem responsável'} />
          <Info rotulo="Agendada para" valor={dataCurta(os.agendada_para)} />
          <Info rotulo="Iniciada" valor={dataHora(os.iniciada_em)} nota={coord(os.inicio)} />
          <Info rotulo="Concluída" valor={dataHora(os.concluida_em)} nota={coord(os.conclusao)} />
          {os.cancelada_em && <Info rotulo="Cancelada" valor={dataHora(os.cancelada_em)} />}
          <Info rotulo="Criada" valor={dataHora(os.criado_em)} nota={os.criado_por_nome ? `por ${os.criado_por_nome}` : ''} />
        </div>
        {os.descricao && <p style={{ color: '#bbb', fontSize: 12, whiteSpace: 'pre-wrap', margin: '14px 0 0' }}>{os.descricao}</p>}
      </div>

      {os.checklist.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Numero rotulo="Respondidos" valor={`${r.respondidos} de ${r.total}`} cor="#c9a227" />
          <Numero rotulo="Conformes" valor={r.conforme} cor="#3fb95f" />
          <Numero rotulo="Não conformes" valor={r.nao_conforme} cor={r.nao_conforme ? '#e08080' : '#777'} />
          <Numero rotulo="Não se aplica" valor={r.na} cor="#999" />
        </div>
      )}

      {os.checklist.length > 0 ? (
        <div style={{ ...E.caixaTabela, marginBottom: 16 }}>
          <table style={E.tabela}>
            <tbody>
              {grupos.map(g => [
                <tr key={`g-${g.nome}`} style={{ background: '#0f0f0f' }}><td colSpan={3} style={{ ...E.th, color: '#c9a227' }}>{g.nome}</td></tr>,
                ...g.itens.map(i => (
                  <tr key={i.id} style={{ borderTop: '1px solid #1e1e1e', background: i.resposta === 'nao_conforme' ? '#170c0c' : undefined }}>
                    <td style={{ ...E.td, width: 70, color: '#777', fontSize: 11, whiteSpace: 'nowrap' }}>{i.id}</td>
                    <td style={E.td}>
                      {i.texto}{i.extra && <span style={{ color: '#777', fontSize: 10 }}> (item extra do campo)</span>}
                      {i.observacao && <div style={{ color: '#999', fontSize: 11, fontStyle: 'italic', marginTop: 3, whiteSpace: 'pre-wrap' }}>{i.observacao}</div>}
                      {i.fotos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {i.fotos.map(u => fotoPorUuid.get(u) && <FotoCampo key={u} foto={fotoPorUuid.get(u)} tamanho={56} />)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...E.td, width: 130, textAlign: 'right' }}>
                      {i.resposta ? <Etiqueta info={RESPOSTA[i.resposta]}>{RESPOSTA[i.resposta].rotulo}</Etiqueta> : <span style={{ color: '#555', fontSize: 11 }}>sem resposta</span>}
                      {i.respondido_em && <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{dataHora(i.respondido_em)}</div>}
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      ) : <div style={E.card}><p style={{ color: '#777', margin: 0, fontSize: 12 }}>Esta OS não tem checklist.</p></div>}

      {os.observacao_final && (
        <div style={E.card}>
          <div style={E.rotulo}>Observação final do técnico</div>
          <p style={{ color: '#ccc', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>{os.observacao_final}</p>
        </div>
      )}

      <div style={E.card}>
        <div style={{ ...E.rotulo, display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={12} /> Fotos ({os.fotos.length})</div>
        {os.fotos.length === 0 ? <p style={{ color: '#666', fontSize: 12, margin: 0 }}>Nenhuma foto enviada ainda.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            {os.fotos.map((f, idx) => (
              <div key={f.uuid} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 6 }}>
                <FotoCampo foto={{ ...f, n: idx + 1 }} tamanho="100%" />
                <div style={{ color: '#ccc', fontSize: 11, fontWeight: 700, marginTop: 5 }}>Foto {idx + 1}{f.item_id ? ` · item ${f.item_id}` : ''}</div>
                {f.legenda && <div style={{ color: '#999', fontSize: 11 }}>{f.legenda}</div>}
                <div style={{ color: '#666', fontSize: 10 }}>{dataHora(f.tirada_em)}{f.lat != null ? ` · ${coord(f)}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={E.card}>
        <div style={{ ...E.rotulo, display: 'flex', alignItems: 'center', gap: 6 }}><PenLine size={12} /> Assinatura do cliente</div>
        {os.assinatura ? (
          <div>
            <ImagemCampo url={os.assinatura.url} alt={`Assinatura de ${os.assinatura.nome}`}
              style={{ background: '#fff', borderRadius: 6, maxWidth: 360, maxHeight: 140, display: 'block', padding: 4 }} />
            <div style={{ color: '#ddd', fontSize: 12, fontWeight: 700, marginTop: 6 }}>{os.assinatura.nome}{os.assinatura.documento ? ` — ${os.assinatura.documento}` : ''}</div>
            <div style={{ color: '#666', fontSize: 10 }}>assinada no aparelho em {dataHora(os.assinatura.assinada_em)}</div>
          </div>
        ) : <p style={{ color: '#666', fontSize: 12, margin: 0 }}>Ainda sem assinatura.</p>}
      </div>

      {(os.historico || []).length > 0 && (
        <div style={E.card}>
          <div style={{ ...E.rotulo, display: 'flex', alignItems: 'center', gap: 6 }}><History size={12} /> Histórico de respostas substituídas ({os.historico.length})</div>
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 8px' }}>Quando dois aparelhos (ou duas visitas) respondem o mesmo item, vale a resposta mais recente; a outra fica guardada aqui.</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#aaa', fontSize: 11, lineHeight: 1.7 }}>
            {[...os.historico].reverse().map((h, i) => <li key={i}>{descreverHistorico(h)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function descreverHistorico(h) {
  const quando = dataHora(h.respondido_em || h.feita_em || h.assinada_em);
  const motivo = h.motivo === 'mais_antiga' ? 'chegou depois, mas era mais antiga' : 'substituída por uma mais nova';
  if (h.tipo === 'resposta_substituida') {
    return `Item ${h.item_id}: ${h.resposta ? RESPOSTA[h.resposta]?.rotulo || h.resposta : 'sem resposta'}${h.observacao ? ` — "${h.observacao}"` : ''} (${quando}; ${motivo})`;
  }
  if (h.tipo === 'observacao_substituida') return `Observação final: "${h.texto}" (${quando}; ${motivo})`;
  if (h.tipo === 'assinatura_substituida') return `Assinatura de ${h.nome}${h.documento ? ` (${h.documento})` : ''} (${quando}; ${motivo})`;
  return `${h.tipo} (${quando})`;
}

function Info({ rotulo, valor, nota }) {
  return (
    <div>
      <div style={E.rotulo}>{rotulo}</div>
      <div style={{ color: '#ddd', fontSize: 12, fontWeight: 700 }}>{valor}</div>
      {nota && <div style={{ color: '#666', fontSize: 10 }}>{nota}</div>}
    </div>
  );
}

function Numero({ rotulo, valor, cor }) {
  return (
    <div style={{ ...E.card, marginBottom: 0, padding: 12 }}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  );
}

// Foto/assinatura pedem login: baixa como blob e mostra por URL local
function ImagemCampo({ url, alt, style, onClick }) {
  const [src, setSrc] = useState(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let vivo = true;
    let local = null;
    getArquivoCampo(url).then(r => {
      local = window.URL.createObjectURL(r.data);
      if (vivo) setSrc(local); else window.URL.revokeObjectURL(local);
    }).catch(() => vivo && setFalhou(true));
    return () => { vivo = false; if (local) window.URL.revokeObjectURL(local); };
  }, [url]);
  if (falhou) return <div style={{ ...style, color: '#777', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#151515' }}>sem imagem</div>;
  if (!src) return <div style={{ ...style, background: '#151515' }} />;
  return <img src={src} alt={alt} style={style} onClick={onClick ? () => onClick(src) : undefined} />;
}

function FotoCampo({ foto, tamanho }) {
  const quadrada = typeof tamanho === 'number';
  const style = quadrada
    ? { width: tamanho, height: tamanho, objectFit: 'cover', borderRadius: 4, cursor: 'zoom-in', border: '1px solid #2a2a2a' }
    : { width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 5, cursor: 'zoom-in', display: 'block' };
  return <ImagemCampo url={foto.url} alt={foto.legenda || `Foto ${foto.n}`} style={style} onClick={(src) => window.open(src, '_blank', 'noopener')} />;
}

const botaoLink = { background: 'none', border: 'none', padding: 0, color: '#c9a227', fontWeight: 700, cursor: 'pointer', fontSize: 12 };
