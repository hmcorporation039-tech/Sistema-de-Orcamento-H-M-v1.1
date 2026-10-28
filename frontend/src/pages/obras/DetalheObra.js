import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Save, Trash2, Unlink, Link2, FileText, ClipboardList, Briefcase, Wallet, FolderOpen, LayoutDashboard, ClipboardCheck, DraftingCompass, FileSearch } from 'lucide-react';
import {
  getObra, atualizarObra, removerObra, vincularItemObra, getPastaObra, abrirPastaObra,
  getClientes, getUsuarios, getAnalisesProjeto, getLaudos, getPropostas, getContratos, getFinanceiroMovimentos,
  getPastaAnalise, abrirPastaAnalise, getPastaLaudo, abrirPastaLaudo, getCronogramaObra, getOrdensServicoObra, getDisciplinasProjeto,
} from '../../services/api';
import CronogramaObra from './CronogramaObra';
import OrdensServicoObra from './OrdensServicoObra';
import { useAuth } from '../../hooks/useAuth';
import Select from '../../components/Select';
import PainelPasta from '../../components/PainelPasta';
import EnviarParaAnalise from '../../components/analise/EnviarParaAnalise';
import { invalidarCacheObras } from '../../components/ObraSelect';
import { formatarData } from '../../utils/format';
import { STATUS_OBRA, SEGMENTO, STATUS_PROPOSTA, BASE_ORCADO, Etiqueta, moeda, pct, corMargem, estilos as E, Campo } from './comum';

// Página da obra (/obras/:id), dentro do hub Obras. Abas em ?secao= (F5 e
// "voltar" mantêm a aba). Itens novos criados daqui nascem ligados à obra:
// as telas de destino recebem ?obra=ID (análise, projeto, laudo, proposta, contrato).
// Versão 2.1: Análises (com a finalidade), Projetos e Laudos em seções
// separadas — análise ≠ laudo. As chaves antigas continuam valendo:
// ?secao=projeto → Análises; ?secao=disciplinas → Projetos.
const SECOES = [
  { chave: 'resumo', rotulo: 'Resumo', icone: LayoutDashboard },
  { chave: 'analises', rotulo: 'Análises', icone: FileSearch },
  { chave: 'projetos', rotulo: 'Projetos', icone: DraftingCompass },
  { chave: 'laudos', rotulo: 'Laudos', icone: FileText },
  { chave: 'propostas', rotulo: 'Propostas', icone: ClipboardList },
  { chave: 'execucao', rotulo: 'Execução', icone: Briefcase },
  { chave: 'campo', rotulo: 'Campo (OS)', icone: ClipboardCheck },
  { chave: 'financeiro', rotulo: 'Financeiro', icone: Wallet },
  { chave: 'arquivos', rotulo: 'Arquivos', icone: FolderOpen },
];
const SECOES_ANTIGAS = { projeto: 'analises', disciplinas: 'projetos' };
const FINALIDADE = { orcamento: 'Orçamento', elaboracao: 'Elaboração de projeto' };

export default function DetalheObra() {
  const { id } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const pedida = SECOES_ANTIGAS[parametros.get('secao')] || parametros.get('secao');
  const secao = SECOES.some(s => s.chave === pedida) ? pedida : 'resumo';
  const [obra, setObra] = useState(null);
  const [erro, setErro] = useState(null);
  const [versaoTela, setVersaoTela] = useState(0);

  const carregar = useCallback(() => {
    getObra(id).then(r => { setObra(r.data); setErro(null); }).catch(e => setErro(e.response?.data?.erro || 'Erro ao carregar a obra'));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar, versaoTela]);
  const recarregar = () => setVersaoTela(v => v + 1);

  const desligar = async (tipo, itemId, rotulo) => {
    if (!window.confirm(`Desligar ${rotulo} desta obra? (o item não é apagado)`)) return;
    try {
      await vincularItemObra(obra.id, tipo, itemId, false);
      toast.success('Item desligado da obra');
      recarregar();
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao desligar o item');
    }
  };
  const ligar = async (tipo, itemId) => {
    try {
      await vincularItemObra(obra.id, tipo, itemId, true);
      toast.success('Item ligado à obra');
      recarregar();
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao ligar o item');
    }
  };

  if (erro) return <div style={E.card}><p style={{ color: '#e08080' }}>{erro}</p><Link to="/obras" style={E.link}>Voltar para a lista</Link></div>;
  if (!obra) return <div className="loading">Carregando...</div>;

  const ctx = { obra, recarregar, ligar, desligar, podeEditar: obra.pode_editar };
  const projetos = obra.laudos.filter(l => l.tipo === 'projeto');
  const laudos = obra.laudos.filter(l => l.tipo !== 'projeto');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Link to="/obras" style={{ ...E.btnSecundario, padding: '6px 10px' }} title="Voltar para a lista de obras"><ArrowLeft size={14} /></Link>
        <span style={{ color: '#c9a227', fontWeight: 700, fontSize: 13 }}>{obra.codigo}</span>
        <h2 style={{ fontSize: 18, color: '#eee', fontWeight: 700, flex: 1, margin: 0 }}>{obra.nome}</h2>
        <Etiqueta info={STATUS_OBRA[obra.status]}>{STATUS_OBRA[obra.status]?.rotulo}</Etiqueta>
      </div>
      <div role="tablist" aria-label="Seções da obra" style={trilho}>
        {SECOES.map(s => {
          const Icone = s.icone;
          const ativa = s.chave === secao;
          const qtd = { analises: obra.analises.length, projetos: projetos.length, laudos: laudos.length, propostas: obra.propostas.length,
            execucao: obra.restrito_financeiro ? null : obra.contratos.length, financeiro: obra.restrito_financeiro ? null : obra.movimentos.length }[s.chave];
          return (
            <button key={s.chave} type="button" role="tab" aria-selected={ativa}
              onClick={() => { const p = new URLSearchParams(parametros); p.set('secao', s.chave); setParametros(p, { replace: true }); }}
              style={{ ...abaEstilo, background: ativa ? '#c9a227' : 'transparent', color: ativa ? '#000' : '#999' }}>
              <Icone size={13} /> {s.rotulo}{qtd != null && qtd > 0 ? ` (${qtd})` : ''}
            </button>
          );
        })}
      </div>
      {secao === 'resumo' && <Resumo {...ctx} />}
      {secao === 'analises' && <Analises {...ctx} />}
      {secao === 'projetos' && <RegistrosDisciplina {...ctx} tipo="projeto" itens={projetos} />}
      {secao === 'laudos' && <RegistrosDisciplina {...ctx} tipo="laudo" itens={laudos} />}
      {secao === 'propostas' && <Propostas {...ctx} />}
      {secao === 'execucao' && <Execucao {...ctx} />}
      {secao === 'campo' && <OrdensServicoObra obra={obra} podeEditar={obra.pode_editar} />}
      {secao === 'financeiro' && <Financeiro {...ctx} />}
      {secao === 'arquivos' && <Arquivos {...ctx} />}
    </div>
  );
}

// ── Resumo ────────────────────────────────────────────────────────────
const dataInput = (v) => (v ? String(v).slice(0, 10) : '');

function Resumo({ obra, recarregar, podeEditar }) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const inicial = useMemo(() => ({
    nome: obra.nome || '', cliente_id: obra.cliente_id ? String(obra.cliente_id) : '', cliente_nome: obra.cliente_nome || '',
    local: obra.local || '', segmento: obra.segmento, status: obra.status,
    inicio_previsto: dataInput(obra.inicio_previsto), fim_previsto: dataInput(obra.fim_previsto),
    responsavel_id: obra.responsavel_id ? String(obra.responsavel_id) : '', observacoes: obra.observacoes || '',
  }), [obra]);
  const [form, setForm] = useState(inicial);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setForm(inicial), [inicial]);
  useEffect(() => { getClientes({ porPagina: 1000 }).then(r => setClientes(r.data.itens || [])).catch(() => {}); }, []);
  // % físico executado (cronograma da aba Execução, Fase 3G)
  const [fisico, setFisico] = useState(null);
  useEffect(() => { getCronogramaObra(obra.id).then(r => setFisico(r.data.etapas.length ? r.data.calculo.resumo : false)).catch(() => setFisico(false)); }, [obra.id]);
  // OS de campo abertas (aba Campo (OS), Fase 4J)
  const [osCampo, setOsCampo] = useState(null);
  useEffect(() => {
    getOrdensServicoObra(obra.id).then(r => {
      const itens = r.data.itens || [];
      setOsCampo({ abertas: itens.filter(o => o.status === 'aberta').length, execucao: itens.filter(o => o.status === 'em_execucao').length });
    }).catch(() => setOsCampo(false));
  }, [obra.id]);
  useEffect(() => {
    // a lista de usuários é só de admin; para os demais, o atual responsável e "eu"
    if (ehAdmin) getUsuarios().then(r => setUsuarios((r.data.itens || r.data || []).filter(u => u.ativo !== false))).catch(() => {});
    else {
      const lista = [{ id: usuario?.id, nome: usuario?.nome }];
      if (obra.responsavel_id && obra.responsavel_id !== usuario?.id) lista.push({ id: obra.responsavel_id, nome: obra.responsavel_nome });
      setUsuarios(lista);
    }
  }, [ehAdmin, usuario, obra.responsavel_id, obra.responsavel_nome]);

  const alterado = JSON.stringify(form) !== JSON.stringify(inicial);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cli = clientes.find(c => String(c.id) === form.cliente_id);
      await atualizarObra(obra.id, {
        ...form,
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        cliente_nome: cli ? cli.nome : (form.cliente_nome || null),
        responsavel_id: form.responsavel_id ? Number(form.responsavel_id) : null,
        versao: obra.versao,
      });
      invalidarCacheObras();
      toast.success('Obra salva');
      recarregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar a obra');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir a obra ${obra.codigo}? Só é possível quando não há nada ligado a ela.`)) return;
    try {
      await removerObra(obra.id);
      invalidarCacheObras();
      toast.success('Obra excluída');
      navigate('/obras');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir a obra', { duration: 8000 });
    }
  }

  const r = obra.resumo;
  const restrito = obra.restrito_financeiro;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <Cartao rotulo="Orçado" valor={moeda(r.orcado)} cor="#c9a227" nota={BASE_ORCADO[r.orcado_base]} />
        <Cartao rotulo="Realizado (despesas)" valor={restrito ? '—' : moeda(r.realizado)} cor="#e08080"
          nota={restrito ? 'só administradores' : (r.contratado ? `contratado com prestadores: ${moeda(r.contratado)}` : 'movimentos de saída ligados')} />
        <Cartao rotulo="Recebido" valor={restrito ? '—' : moeda(r.recebido)} cor="#3fb95f" nota={restrito ? 'só administradores' : `a receber: ${moeda(r.a_receber)}`} />
        <Cartao rotulo="Margem" valor={restrito ? '—' : moeda(r.margem)} cor={corMargem(restrito ? null : r.margem)}
          nota={restrito ? 'só administradores' : (r.margem_pct != null ? `${pct(r.margem_pct)} do orçado (orçado − realizado)` : 'orçado − realizado')} />
        <Cartao rotulo="% físico executado" valor={fisico ? pct(fisico.fisico_realizado.toFixed(1)) : '—'} cor="#5fc9c0"
          nota={fisico ? `previsto até hoje: ${pct(fisico.fisico_previsto.toFixed(1))}` : (fisico === false ? 'sem cronograma (aba Execução)' : '...')} />
        <Cartao rotulo="OS abertas" valor={osCampo ? osCampo.abertas + osCampo.execucao : '—'} cor="#8aa4c8"
          nota={osCampo ? `${osCampo.execucao} em execução no campo · aba Campo (OS)` : (osCampo === false ? 'não foi possível carregar' : '...')} />
      </div>

      <form style={E.card} onSubmit={salvar}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Campo label="Nome da obra *" style={{ gridColumn: 'span 2' }}>
            <input value={form.nome} onChange={set('nome')} disabled={!podeEditar} />
          </Campo>
          <Campo label="Cliente">
            <Select value={form.cliente_id} onChange={set('cliente_id')} disabled={!podeEditar}>
              <option value="">{form.cliente_nome && !form.cliente_id ? `${form.cliente_nome} (sem cadastro)` : 'Sem cliente cadastrado'}</option>
              {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo label="Local" style={{ gridColumn: 'span 2' }}>
            <input value={form.local} onChange={set('local')} disabled={!podeEditar} />
          </Campo>
          <Campo label="Segmento">
            <Select value={form.segmento} onChange={set('segmento')} disabled={!podeEditar}>
              {Object.entries(SEGMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Campo>
          <Campo label="Status">
            <Select value={form.status} onChange={set('status')} disabled={!podeEditar}>
              {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </Select>
          </Campo>
          <Campo label="Início previsto"><input type="date" value={form.inicio_previsto} onChange={set('inicio_previsto')} disabled={!podeEditar} /></Campo>
          <Campo label="Fim previsto"><input type="date" value={form.fim_previsto} onChange={set('fim_previsto')} disabled={!podeEditar} /></Campo>
          <Campo label="Responsável">
            <Select value={form.responsavel_id} onChange={set('responsavel_id')} disabled={!podeEditar}>
              <option value="">Sem responsável</option>
              {usuarios.filter(u => u.id).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}
            </Select>
          </Campo>
          <Campo label="Observações" style={{ gridColumn: '1 / -1' }}>
            <textarea rows={3} value={form.observacoes} onChange={set('observacoes')} disabled={!podeEditar} />
          </Campo>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666', fontSize: 11, flex: 1 }}>
            Criada em {formatarData(obra.criado_em)}{obra.usuario_nome ? ` por ${obra.usuario_nome}` : ''}
            {obra.origem_migracao ? ` · gerada a partir dos dados antigos (${obra.origem_migracao})` : ''}
            {!podeEditar && ' · só o dono da obra ou um administrador altera'}
          </span>
          {obra.pode_excluir && <button type="button" onClick={excluir} style={{ ...E.btnSecundario, color: '#b04040' }}><Trash2 size={13} /> Excluir obra</button>}
          {podeEditar && <button type="submit" disabled={!alterado || salvando} style={{ ...E.btnPrimario, opacity: alterado ? 1 : 0.5 }}><Save size={13} /> {salvando ? 'Salvando...' : 'Salvar'}</button>}
        </div>
      </form>
    </div>
  );
}

function Cartao({ rotulo, valor, cor, nota }) {
  return (
    <div style={{ ...E.card, marginBottom: 0 }}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{valor}</div>
      {nota && <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{nota}</div>}
    </div>
  );
}

// ── peças das listas ──────────────────────────────────────────────────
function Cabecalho({ titulo, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
      <h3 style={{ color: '#c9a227', fontSize: 14, fontWeight: 700, flex: 1, margin: 0 }}>{titulo}</h3>
      {children}
    </div>
  );
}

// "Ligar existente": carrega os itens sem obra e liga o escolhido.
function LigarExistente({ rotulo, carregar, onLigar }) {
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState(null);
  const [escolhido, setEscolhido] = useState('');
  useEffect(() => {
    if (!aberto || opcoes) return;
    carregar().then(setOpcoes).catch(() => { setOpcoes([]); toast.error('Erro ao carregar a lista'); });
  }, [aberto, opcoes, carregar]);
  if (!aberto) return <button type="button" onClick={() => setAberto(true)} style={E.btnSecundario}><Link2 size={13} /> {rotulo}</button>;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Select value={escolhido} onChange={e => setEscolhido(e.target.value)} style={{ minWidth: 280, maxWidth: 420 }}>
        <option value="">{opcoes ? (opcoes.length ? 'Escolha um item sem obra...' : 'Nenhum item sem obra') : 'Carregando...'}</option>
        {(opcoes || []).map(o => <option key={o.id} value={String(o.id)}>{o.rotulo}</option>)}
      </Select>
      <button type="button" disabled={!escolhido} onClick={() => { onLigar(Number(escolhido)); setAberto(false); setOpcoes(null); setEscolhido(''); }} style={E.btnPrimario}>Ligar</button>
      <button type="button" onClick={() => setAberto(false)} style={E.btnSecundario}>Cancelar</button>
    </div>
  );
}

function BotaoDesligar({ onClick }) {
  return <button type="button" onClick={onClick} style={E.btnIcone} title="Desligar da obra (não apaga o item)"><Unlink size={12} /></button>;
}

function Tabela({ colunas, vazio, children }) {
  return (
    <div style={E.caixaTabela}>
      <table style={E.tabela}>
        <thead><tr style={{ background: '#0f0f0f' }}>{colunas.map((c, i) => <th key={i} style={{ ...E.th, ...(c.direita ? { textAlign: 'right' } : {}) }}>{c.rotulo}</th>)}</tr></thead>
        <tbody>
          {(!children || (Array.isArray(children) && children.length === 0))
            ? <tr><td colSpan={colunas.length} style={E.tdVazio}>{vazio}</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

const tr = { borderTop: '1px solid #1e1e1e' };

const textoAjuda = { color: '#777', fontSize: 12, margin: '0 0 10px', lineHeight: 1.6 };

// ── Análises de projeto (arquivos recebidos), com a finalidade ────────
// 2.3: o envio dos arquivos fica AQUI, na obra (arquivos, pasta, ZIP ou os que
// já estão na pasta da obra) — o mesmo bloco da aba Análise de projeto
function Analises({ obra, ligar, desligar, podeEditar }) {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const daPasta = parametros.get('usarPasta') === '1';
  const [enviando, setEnviando] = useState(daPasta || obra.analises.length === 0);
  const [disciplinas, setDisciplinas] = useState([]);
  useEffect(() => { getDisciplinasProjeto().then(r => setDisciplinas(r.data)).catch(() => {}); }, []);
  const carregar = useCallback(() => getAnalisesProjeto({ obra_id: 'sem', porPagina: 200 })
    .then(r => (r.data.itens || []).map(a => ({ id: a.id, rotulo: `#${a.id} — ${a.nome_projeto || a.cliente_nome || 'Sem nome'} — ${FINALIDADE[a.finalidade] || 'Orçamento'} (${formatarData(a.atualizado_em)})` }))), []);
  return (
    <div>
      <Cabecalho titulo="Análises de projeto (arquivos recebidos)">
        {podeEditar && <LigarExistente rotulo="Ligar análise existente" carregar={carregar} onLigar={(id) => ligar('analise', id)} />}
        {!enviando && <button type="button" onClick={() => setEnviando(true)} style={E.btnPrimario} data-testid="nova-analise-obra"><Plus size={13} /> Enviar projeto para análise</button>}
      </Cabecalho>
      <p style={textoAjuda}>Leitura do projeto recebido do cliente ou do arquiteto (PDF, DWG, DXF, pasta ou ZIP), para <b>orçar</b> ou para a H&amp;M <b>elaborar o projeto</b>. Análise não gera laudo nem define disciplina sozinha.</p>
      {enviando && (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 16, background: '#121212' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <b style={{ color: '#c9a227', fontSize: 14, flex: 1 }}>Enviar o projeto para análise — {obra.nome}</b>
            {obra.analises.length > 0 && <button type="button" onClick={() => setEnviando(false)} style={{ background: 'none', border: 0, color: '#888', cursor: 'pointer', fontSize: 12 }}>Fechar</button>}
          </div>
          <EnviarParaAnalise obraFixa={obra.id} disciplinas={disciplinas} iniciarComPasta={daPasta}
            onCriada={(a) => navigate(`/obras/analise/${a.id}`)} />
        </div>
      )}
      <Tabela colunas={[{ rotulo: 'Análise' }, { rotulo: 'Finalidade' }, { rotulo: 'Cliente' }, { rotulo: 'Disciplinas' }, { rotulo: 'Proposta' }, { rotulo: 'Atualizada' }, { rotulo: '' }]} vazio="Nenhuma análise ligada a esta obra.">
        {obra.analises.map(a => (
          <tr key={a.id} style={tr}>
            <td style={E.td}><Link to={`/obras/analise/${a.id}`} style={E.link}>#{a.id} — {a.nome_projeto || a.cliente_nome || 'Sem nome'}</Link></td>
            <td style={{ ...E.td, color: a.finalidade === 'elaboracao' ? '#8ab4f8' : '#c9a227', whiteSpace: 'nowrap' }}>{FINALIDADE[a.finalidade] || 'Orçamento'}</td>
            <td style={E.td}>{a.cliente_nome || '—'}</td>
            <td style={{ ...E.td, fontSize: 11, color: '#999' }}>{(a.disciplinas || []).join(', ') || '—'}</td>
            <td style={E.td}>{a.proposta_id ? <Link to={`/propostas/editar/${a.proposta_id}`} style={E.link}>{a.proposta_numero}</Link> : '—'}</td>
            <td style={E.td}>{formatarData(a.atualizado_em)}</td>
            <td style={{ ...E.td, textAlign: 'right' }}>{podeEditar && <BotaoDesligar onClick={() => desligar('analise', a.id, `a análise #${a.id}`)} />}</td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}

// ── Projetos e Laudos por disciplina (versão 2.1: seções separadas) ──
const REGISTRO = {
  projeto: {
    titulo: 'Projetos por disciplina', aba: 'projetos', item: 'projeto', novo: 'Novo projeto nesta obra', ligar: 'Ligar projeto existente',
    vazio: 'Nenhum projeto ligado a esta obra.', semOrcamento: 'sem orçamento',
    ajuda: 'Projeto que a H&M elabora e entrega (memorial, desenhos, as-built, DXF, QElectroTech, PDF). Nasce aqui ou da análise com finalidade "Elaboração de projeto".',
  },
  laudo: {
    titulo: 'Laudos', aba: 'laudos', item: 'laudo', novo: 'Novo laudo nesta obra', ligar: 'Ligar laudo existente',
    vazio: 'Nenhum laudo ligado a esta obra — crie só quando a inspeção for pedida.', semOrcamento: 'só laudo',
    ajuda: 'Laudo de inspeção/vistoria pedido quando necessário (checklist, fotos, medições). Não nasce da análise de projeto.',
  },
};

function RegistrosDisciplina({ obra, ligar, desligar, podeEditar, tipo, itens }) {
  const R = REGISTRO[tipo];
  const carregar = useCallback(() => getLaudos({ obra_id: 'sem', tipo })
    .then(r => (r.data || []).map(l => ({ id: l.id, rotulo: `#${l.id} — ${String(l.disciplina).toUpperCase()} — ${l.titulo || 'Sem título'}` }))), [tipo]);
  return (
    <div>
      <Cabecalho titulo={R.titulo}>
        {podeEditar && <LigarExistente rotulo={R.ligar} carregar={carregar} onLigar={(id) => ligar('laudo', id)} />}
        <Link to={`/obras?aba=${R.aba}&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> {R.novo}</Link>
      </Cabecalho>
      <p style={textoAjuda}>{R.ajuda}</p>
      <Tabela colunas={[{ rotulo: 'Disciplina' }, { rotulo: 'Título' }, { rotulo: 'Revisão' }, { rotulo: 'Propostas' }, { rotulo: 'Atualizado' }, { rotulo: '' }]} vazio={R.vazio}>
        {itens.map(l => (
          <tr key={l.id} style={tr}>
            <td style={{ ...E.td, fontWeight: 700 }}>{String(l.disciplina).toUpperCase()}</td>
            <td style={E.td}>
              <Link to={`/obras?aba=${R.aba}&laudo=${l.id}`} style={E.link}>{l.titulo || `${tipo === 'projeto' ? 'Projeto' : 'Laudo'} #${l.id}`}</Link>
              {l.gerar_orcamento === false && <span style={{ color: '#777', fontSize: 10 }}> · {R.semOrcamento}</span>}
              {l.analise_id && <span style={{ color: '#777', fontSize: 10 }}> · da <Link to={`/obras/analise/${l.analise_id}`} style={E.link}>análise #{l.analise_id}</Link></span>}
            </td>
            <td style={E.td}>{l.revisao || '—'}</td>
            <td style={{ ...E.td, fontSize: 11 }}>
              {Object.entries(l.propostas || {}).map(([modo, pid]) => <Link key={modo} to={`/propostas/editar/${pid}`} style={{ ...E.link, marginRight: 8 }}>{modo}</Link>)}
              {!Object.keys(l.propostas || {}).length && '—'}
            </td>
            <td style={E.td}>{formatarData(l.atualizado_em)}</td>
            <td style={{ ...E.td, textAlign: 'right' }}>{podeEditar && <BotaoDesligar onClick={() => desligar('laudo', l.id, `o ${R.item} #${l.id}`)} />}</td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}

// ── Propostas ─────────────────────────────────────────────────────────
function Propostas({ obra, ligar, desligar, podeEditar }) {
  const carregar = useCallback(() => getPropostas({ obra_id: 'sem', porPagina: 300 })
    .then(r => (r.data.itens || []).map(p => ({ id: p.id, rotulo: `${p.numero} — ${p.cliente_nome || 'Sem cliente'}${p.local_obra ? ` — ${p.local_obra}` : ''} (${p.status})` }))), []);
  const r = obra.resumo;
  return (
    <div>
      <Cabecalho titulo="Propostas da obra">
        {podeEditar && <LigarExistente rotulo="Ligar proposta existente" carregar={carregar} onLigar={(id) => ligar('proposta', id)} />}
        <Link to={`/propostas?aba=editar&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> Nova proposta nesta obra</Link>
      </Cabecalho>
      <Tabela colunas={[{ rotulo: 'Número' }, { rotulo: 'Data' }, { rotulo: 'Cliente' }, { rotulo: 'Local' }, { rotulo: 'Status' }, { rotulo: 'Total', direita: true }, { rotulo: '' }]} vazio="Nenhuma proposta ligada a esta obra.">
        {obra.propostas.map(p => (
          <tr key={p.id} style={tr}>
            <td style={E.td}><Link to={`/propostas/editar/${p.id}`} style={E.link}>{p.numero}</Link>{(r.orcado_propostas || []).includes(p.id) && <span title="entra no orçado da obra" style={{ color: '#c9a227', marginLeft: 6 }}>●</span>}</td>
            <td style={E.td}>{formatarData(p.data)}</td>
            <td style={E.td}>{p.cliente_nome || '—'}</td>
            <td style={{ ...E.td, fontSize: 11, color: '#999' }}>{p.local_obra || '—'}</td>
            <td style={E.td}><Etiqueta info={STATUS_PROPOSTA[p.status]}>{p.status}</Etiqueta></td>
            <td style={{ ...E.td, textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>{moeda(p.total)}</td>
            <td style={{ ...E.td, textAlign: 'right' }}>{podeEditar && <BotaoDesligar onClick={() => desligar('proposta', p.id, `a proposta ${p.numero}`)} />}</td>
          </tr>
        ))}
      </Tabela>
      <p style={{ color: '#666', fontSize: 11, marginTop: 8 }}>● entra no orçado: {BASE_ORCADO[r.orcado_base]}.</p>
    </div>
  );
}

// ── Execução (contratos; cronograma físico-financeiro e medições — Fase 3G, CronogramaObra.js) ──
function Execucao({ obra, ligar, desligar }) {
  const carregar = useCallback(() => getContratos({ obra_id: 'sem', porPagina: 300 })
    .then(r => (r.data.itens || []).map(c => ({ id: c.id, rotulo: `${c.codigo_registro} — ${c.prestador_nome}${c.local_obra ? ` — ${c.local_obra}` : ''}` }))), []);
  return (
    <div>
      <Cabecalho titulo="Contratos de prestadores">
        {!obra.restrito_financeiro && <LigarExistente rotulo="Ligar contrato existente" carregar={carregar} onLigar={(id) => ligar('contrato', id)} />}
        {!obra.restrito_financeiro && <Link to={`/financeiro?aba=contratos&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> Novo contrato nesta obra</Link>}
      </Cabecalho>
      {obra.restrito_financeiro
        ? <div style={E.card}><p style={{ color: '#777', margin: 0 }}>Contratos de prestadores são vistos só por administradores.</p></div>
        : (
          <Tabela colunas={[{ rotulo: 'Código' }, { rotulo: 'Prestador' }, { rotulo: 'Objeto' }, { rotulo: 'Período' }, { rotulo: 'Valor', direita: true }, { rotulo: '' }]} vazio="Nenhum contrato ligado a esta obra.">
            {obra.contratos.map(c => (
              <tr key={c.id} style={tr}>
                <td style={{ ...E.td, fontWeight: 700, color: '#c9a227' }}>{c.codigo_registro}</td>
                <td style={E.td}>{c.prestador_nome}</td>
                <td style={{ ...E.td, fontSize: 11, color: '#999' }}>{c.objeto || c.local_obra || '—'}</td>
                <td style={E.td}>{formatarData(c.periodo_inicio)} a {formatarData(c.periodo_fim)}</td>
                <td style={{ ...E.td, textAlign: 'right', fontWeight: 700 }}>{moeda(c.valor)}</td>
                <td style={{ ...E.td, textAlign: 'right' }}><BotaoDesligar onClick={() => desligar('contrato', c.id, `o contrato ${c.codigo_registro}`)} /></td>
              </tr>
            ))}
          </Tabela>
        )}
      <CronogramaObra obra={obra} />
    </div>
  );
}

// ── Financeiro (movimentos ligados) ───────────────────────────────────
function Financeiro({ obra, ligar, desligar }) {
  const carregar = useCallback(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1).toISOString().slice(0, 10);
    return getFinanceiroMovimentos({ obraId: 'sem', dataInicio: inicio, dataFim: hoje.toISOString().slice(0, 10) })
      .then(r => (r.data.movimentos || []).map(m => ({
        id: m.id,
        rotulo: `${new Date(m.data_hora).toLocaleDateString('pt-BR')} — ${m.tipo === 'realizado' ? 'saída' : 'entrada'} ${moeda(m.valor)} — ${m.nome || 'sem nome'}`,
      })));
  }, []);
  if (obra.restrito_financeiro) return <div style={E.card}><p style={{ color: '#777', margin: 0 }}>O financeiro da obra é visto só por administradores.</p></div>;
  const r = obra.resumo;
  return (
    <div>
      <Cabecalho titulo="Movimentos do financeiro ligados">
        <span style={{ color: '#888', fontSize: 11 }}>últimos 6 meses sem obra:</span>
        <LigarExistente rotulo="Ligar movimento existente" carregar={carregar} onLigar={(id) => ligar('movimento', id)} />
      </Cabecalho>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12 }}>
        <span>Recebido: <b style={{ color: '#3fb95f' }}>{moeda(r.recebido)}</b></span>
        <span>Realizado: <b style={{ color: '#e08080' }}>{moeda(r.realizado)}</b></span>
        <span>Margem: <b style={{ color: corMargem(r.margem) }}>{moeda(r.margem)}</b></span>
      </div>
      <Tabela colunas={[{ rotulo: 'Data' }, { rotulo: 'Tipo' }, { rotulo: 'Nome' }, { rotulo: 'Prestador' }, { rotulo: 'Valor', direita: true }, { rotulo: '' }]} vazio="Nenhum movimento ligado. Use “Ligar movimento existente” ou o campo Obra em Financeiro › Movimentos.">
        {obra.movimentos.map(m => (
          <tr key={m.id} style={tr}>
            <td style={E.td}>{new Date(m.data_hora).toLocaleString('pt-BR')}</td>
            <td style={E.td}>{m.tipo === 'realizado' ? 'Realizado' : 'Recebido'}</td>
            <td style={E.td}>{m.nome || '—'}</td>
            <td style={E.td}>{m.prestador_nome || '—'}</td>
            <td style={{ ...E.td, textAlign: 'right', fontWeight: 700, color: m.tipo === 'realizado' ? '#e08080' : '#3fb95f' }}>{m.tipo === 'realizado' ? '- ' : '+ '}{moeda(m.valor)}</td>
            <td style={{ ...E.td, textAlign: 'right' }}><BotaoDesligar onClick={() => desligar('movimento', m.id, 'o movimento')} /></td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}

// ── Arquivos ──────────────────────────────────────────────────────────
function Arquivos({ obra }) {
  const [outras, setOutras] = useState([]);
  const carregar = useCallback(() => getPastaObra(obra.id).then(r => { setOutras(r.data.outras || []); return r; }), [obra.id]);
  const abrir = useCallback(() => abrirPastaObra(obra.id), [obra.id]);
  return (
    <div>
      <Cabecalho titulo="Pasta da obra" />
      <p style={{ color: '#777', fontSize: 12, margin: '0 0 6px' }}>
        Itens novos desta obra gravam aqui: <code>Projeto</code> (análise), <code>Projetos\&lt;disciplina&gt;</code> (com a <code>Entrega</code>), <code>Laudos\&lt;disciplina&gt;</code>, <code>Propostas</code> e <code>Contratos</code>.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 10px', padding: '10px 12px', border: '1px solid #3a3215', borderRadius: 8, background: '#16140c' }}>
        <span style={{ color: '#bbb', fontSize: 12, flex: '1 1 320px', lineHeight: 1.5 }}>
          Recebeu o projeto do cliente por e-mail? Salve os arquivos (PDF, DWG, DXF ou ZIP) nesta pasta — ou envie direto pela aba <b>Análises</b> — e analise:
        </span>
        <Link to={`/obras/${obra.id}?secao=analises&usarPasta=1`} style={E.btnPrimario} data-testid="analisar-pasta-obra"><FileSearch size={13} /> Analisar os arquivos desta pasta</Link>
      </div>
      <PainelPasta carregar={carregar} abrir={abrir} />
      {outras.length > 0 && (
        <>
          <Cabecalho titulo="Pastas anteriores dos itens ligados" />
          <p style={{ color: '#777', fontSize: 12, margin: '0 0 6px' }}>Análises e laudos de antes da obra continuam nas pastas de sempre (nada foi movido).</p>
          {outras.map(o => <PastaItem key={`${o.tipo}-${o.id}`} item={o} />)}
        </>
      )}
    </div>
  );
}

function PastaItem({ item }) {
  const carregar = useCallback(() => (item.tipo === 'analise' ? getPastaAnalise(item.id) : getPastaLaudo(item.id)), [item]);
  const abrir = useCallback(() => (item.tipo === 'analise' ? abrirPastaAnalise(item.id) : abrirPastaLaudo(item.id)), [item]);
  return (
    <div>
      <div style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>{item.tipo === 'analise' ? 'Análise' : item.tipo_registro === 'projeto' ? 'Projeto' : 'Laudo'} #{item.id} — {item.rotulo}</div>
      <PainelPasta carregar={carregar} abrir={abrir} />
    </div>
  );
}

const trilho = { display: 'flex', gap: 4, flexWrap: 'wrap', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content', maxWidth: '100%' };
const abaEstilo = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' };
