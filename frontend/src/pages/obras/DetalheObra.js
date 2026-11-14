import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Save, Trash2, Unlink, Link2, FileText, ClipboardList, Briefcase, Wallet, FolderOpen, LayoutDashboard,
  DraftingCompass, FileSearch, FileCog, Pencil, Merge, Info as InfoIcone,
} from 'lucide-react';
import {
  getObra, atualizarObra, removerObra, vincularItemObra, getPastaObra, abrirPastaObra,
  getUsuarios, getAnalisesProjeto, getLaudos, getPropostas, getContratos, getFinanceiroMovimentos,
  getPastaAnalise, abrirPastaAnalise, getPastaLaudo, abrirPastaLaudo, getCronogramaObra, getOrdensServicoObra, getDisciplinasProjeto,
  removerLaudo, getObrasParecidas, juntarObra, getObras, buscarTodasPaginas, getPixSemObra, atribuirPixObra,
} from '../../services/api';
import CronogramaObra from './CronogramaObra';
import OrdensServicoObra from './OrdensServicoObra';
import { useAuth } from '../../hooks/useAuth';
import Select from '../../components/Select';
import ClienteSelect, { useClientes } from '../../components/ClienteSelect';
import PainelPasta from '../../components/PainelPasta';
import EnviarParaAnalise from '../../components/analise/EnviarParaAnalise';
import { TabelaAnalises } from '../../components/analise/ListaAnalises';
import BotaoExcluir from '../../components/ui/BotaoExcluir';
import Modal from '../../components/ui/Modal';
import { rotuloFinalidade } from '../../utils/finalidades';
import { AvisoNovidades } from '../../components/NovidadesPastas';
import { invalidarCacheObras } from '../../components/ObraSelect';
import { formatarData, hojeBrasilia, paraIso } from '../../utils/format';
import { normalizarNome } from '../../utils/texto';
import { STATUS_OBRA, SEGMENTO, STATUS_PROPOSTA, BASE_ORCADO, Etiqueta, moeda, pct, corMargem, estilos as E, Campo, orcadoTexto } from './comum';
import { LinhaEtapas, BotaoProximoPasso } from './EtapasObra';
import Indicador from '../../components/ui/Indicador';

// Página da obra (/obras/:id), dentro do hub Obras. Seção em ?secao= (F5 e "voltar" mantêm a seção).
// Itens novos criados daqui nascem ligados à obra: as telas de destino recebem ?obra=ID.
// Revisão de 14/11/2026 (2.42): as 9 abas viraram 6, na ordem do trabalho — Visão geral, Projeto (análises,
// projetos por disciplina e laudos), Proposta, Execução (contratos, cronograma e OS de campo), Financeiro e
// Arquivos. No topo, a linha de etapas e o PRÓXIMO PASSO (regra do backend: utils/obras.js proximoPasso).
// As chaves antigas continuam valendo: ?secao=analises|projetos|laudos|disciplinas → Projeto; ?secao=campo → Execução.
const SECOES = [
  { chave: 'resumo', rotulo: 'Visão geral', icone: LayoutDashboard },
  { chave: 'projeto', rotulo: 'Projeto', icone: DraftingCompass },
  { chave: 'propostas', rotulo: 'Proposta', icone: ClipboardList },
  { chave: 'execucao', rotulo: 'Execução', icone: Briefcase },
  { chave: 'financeiro', rotulo: 'Financeiro', icone: Wallet },
  { chave: 'arquivos', rotulo: 'Arquivos', icone: FolderOpen },
];
const SECOES_ANTIGAS = { analises: 'projeto', projetos: 'projeto', laudos: 'projeto', disciplinas: 'projeto', campo: 'execucao' };

export default function DetalheObra() {
  const { id } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const pedida = SECOES_ANTIGAS[parametros.get('secao')] || parametros.get('secao');
  const secao = SECOES.some(s => s.chave === pedida) ? pedida : 'resumo';
  const [obra, setObra] = useState(null);
  const [erro, setErro] = useState(null);
  const [versaoTela, setVersaoTela] = useState(0);
  const [pacoteNovidades, setPacoteNovidades] = useState(null);

  const carregar = useCallback(() => {
    getObra(id).then(r => { setObra(r.data); setErro(null); }).catch(e => setErro(e.response?.data?.erro || 'Erro ao carregar a obra'));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar, versaoTela]);
  const recarregar = () => setVersaoTela(v => v + 1);
  const irPara = (s) => { const p = new URLSearchParams(parametros); p.set('secao', s); p.delete('usarPasta'); setParametros(p, { replace: true }); window.scrollTo?.(0, 0); };

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
  const mudarStatus = async (para) => {
    if (!window.confirm(`Passar a obra ${obra.codigo} para "${STATUS_OBRA[para]?.rotulo}"?`)) return;
    try {
      await atualizarObra(obra.id, { status: para, versao: obra.versao });
      invalidarCacheObras();
      toast.success(`Obra em "${STATUS_OBRA[para]?.rotulo}"`);
      recarregar();
    } catch (e) { toast.error(e.response?.data?.erro || 'Erro ao mudar o status'); }
  };

  if (erro) return <div style={E.card}><p style={{ color: '#e08080' }}>{erro}</p><Link to="/obras" style={E.link}>Voltar para a lista</Link></div>;
  if (!obra) return <div className="loading">Carregando...</div>;

  const ctx = { obra, recarregar, ligar, desligar, podeEditar: obra.pode_editar, pacoteNovidades, setPacoteNovidades, irPara };
  const projetos = obra.laudos.filter(l => l.tipo === 'projeto');
  const laudos = obra.laudos.filter(l => l.tipo !== 'projeto');
  const passo = obra.proximo_passo;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Link to="/obras" style={{ ...E.btnSecundario, padding: '6px 10px' }} title="Voltar para a lista de obras" aria-label="Voltar para a lista de obras"><ArrowLeft size={14} /></Link>
        <span style={{ color: '#c9a227', fontWeight: 700, fontSize: 13 }}>{obra.codigo}</span>
        <h2 style={{ fontSize: 18, color: 'var(--texto)', fontWeight: 700, flex: 1, margin: 0 }}>{obra.nome}</h2>
        <span style={{ color: 'var(--texto-3)', fontSize: 12.5 }}>{obra.cliente_nome || 'sem cliente'}</span>
        <Etiqueta info={STATUS_OBRA[obra.status]}>{STATUS_OBRA[obra.status]?.rotulo}</Etiqueta>
      </div>

      {obra.juntada && (
        <div style={{ ...E.card, padding: '10px 14px', borderColor: '#4a3d10', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }} data-testid="obra-juntada">
          <Merge size={15} color="#c9a227" />
          <span style={{ flex: 1, fontSize: 13 }}>Esta obra foi <b>juntada</b> à <b>{obra.juntada.codigo}</b> — {obra.juntada.nome}. Tudo o que estava ligado aqui foi para lá.</span>
          <Link to={`/obras/${obra.juntada.id}`} style={E.btnPrimario}>Abrir {obra.juntada.codigo}</Link>
        </div>
      )}

      {!obra.juntada && (
        <div style={{ ...E.card, padding: '14px 16px' }} data-testid="etapas-obra">
          <LinhaEtapas status={obra.status} />
          {passo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--borda)' }}>
              <span style={{ color: 'var(--texto-3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>Próximo passo</span>
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--texto)' }} data-testid="proximo-passo">{passo.texto}</span>
              <BotaoProximoPasso acao={passo.acao} onSecao={irPara} onStatus={mudarStatus} podeEditar={obra.pode_editar} />
            </div>
          )}
        </div>
      )}

      <div role="tablist" aria-label="Seções da obra" style={trilho}>
        {SECOES.map(s => {
          const Icone = s.icone;
          const ativa = s.chave === secao;
          const qtd = {
            projeto: obra.analises.length + obra.laudos.length, propostas: obra.propostas.length,
            execucao: obra.restrito_financeiro ? null : obra.contratos.length, financeiro: obra.restrito_financeiro ? null : obra.movimentos.length,
          }[s.chave];
          return (
            <button key={s.chave} type="button" role="tab" aria-selected={ativa} onClick={() => irPara(s.chave)}
              style={{ ...abaEstilo, background: ativa ? '#c9a227' : 'transparent', color: ativa ? '#000' : '#999' }}>
              <Icone size={13} /> {s.rotulo}{qtd != null && qtd > 0 ? ` (${qtd})` : ''}
            </button>
          );
        })}
      </div>
      {/* arquivo novo/alterado na pasta do cliente/obra: uma linha só, na Visão geral, no Projeto e nos Arquivos */}
      {['resumo', 'projeto', 'arquivos'].includes(secao) && (
        <AvisoNovidades compacto obraId={obra.id} onAnalisar={(p) => { setPacoteNovidades(p); irPara('projeto'); }} />
      )}
      {secao === 'resumo' && <Resumo {...ctx} />}
      {secao === 'projeto' && (
        <>
          <Analises {...ctx} />
          <Separador />
          <RegistrosDisciplina {...ctx} tipo="projeto" itens={projetos} />
          <Separador />
          <RegistrosDisciplina {...ctx} tipo="laudo" itens={laudos} />
        </>
      )}
      {secao === 'propostas' && <Propostas {...ctx} />}
      {secao === 'execucao' && <Execucao {...ctx} />}
      {secao === 'financeiro' && <Financeiro {...ctx} />}
      {secao === 'arquivos' && <Arquivos {...ctx} />}
    </div>
  );
}

const Separador = () => <div style={{ height: 1, background: 'var(--borda)', margin: '22px 0 18px' }} />;

// ── Visão geral ───────────────────────────────────────────────────────
const dataInput = (v) => (v ? String(v).slice(0, 10) : '');

function Grupo({ titulo, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: 'var(--texto-3)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>{children}</div>
    </div>
  );
}

function Resumo({ obra, recarregar, podeEditar, irPara }) {
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
  const [editando, setEditando] = useState(false);
  const [juntando, setJuntando] = useState(false);
  const clientes = useClientes(); // todas as páginas, só ativos (antes: cortava em 1000)
  const [usuarios, setUsuarios] = useState([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setForm(inicial), [inicial]);
  // previsto até hoje (cronograma da aba Execução); o realizado vem pronto em obra.fisico_realizado
  const [fisico, setFisico] = useState(null);
  useEffect(() => { getCronogramaObra(obra.id).then(r => setFisico(r.data.etapas.length ? r.data.calculo.resumo : false)).catch(() => setFisico(false)); }, [obra.id]);
  // OS de campo abertas (seção Execução)
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
      setEditando(false);
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
  const fisicoReal = obra.fisico_realizado;
  const ficha = [
    ['Cliente', obra.cliente_nome || <span style={{ color: '#d69a2d' }}>sem cliente — clique em Editar e escolha</span>],
    ['Local', obra.local || '—'],
    ['Segmento', SEGMENTO[obra.segmento] || '—'],
    ['Responsável', obra.responsavel_nome || '—'],
    ['Prazo previsto', obra.inicio_previsto || obra.fim_previsto ? `${obra.inicio_previsto ? formatarData(obra.inicio_previsto) : '?'} a ${obra.fim_previsto ? formatarData(obra.fim_previsto) : '?'}` : '—'],
  ];
  return (
    <div>
      <Grupo titulo="Comercial">
        <Indicador rotulo="Orçado" valor={orcadoTexto(r)} cor="#c9a227" sub={BASE_ORCADO[r.orcado_base]} />
        <Indicador rotulo="Propostas" valor={obra.propostas.length || '—'} sub={obra.propostas.length ? obra.propostas.map(p => `${p.numero} (${p.status})`).join(' · ') : 'nenhuma proposta ligada'} />
      </Grupo>
      {!restrito && (
        <Grupo titulo="Financeiro">
          <Indicador rotulo="Realizado (despesas)" valor={r.sem_custos ? '—' : moeda(r.realizado)} cor="#e08080"
            sub={r.contratado ? `contratado com prestadores: ${moeda(r.contratado)}` : 'pagamentos ligados à obra'} />
          <Indicador rotulo="Recebido" valor={moeda(r.recebido)} cor="#3fb95f" sub={`a receber: ${moeda(r.a_receber)}`} />
          {/* notas fiscais emitidas das propostas da obra; a receber = líquido − recebido − baixas manuais */}
          <Indicador rotulo="Faturado (notas)" valor={moeda(r.faturado)} cor="#9fb3ff"
            sub={r.qtd_notas ? `a receber do faturado: ${moeda(r.a_receber_faturado)}` : 'nenhuma nota emitida nas propostas'} />
          <Indicador rotulo="Margem" valor={r.sem_custos ? '—' : moeda(r.margem)} cor={corMargem(r.sem_custos ? null : r.margem)}
            sub={r.sem_custos ? 'sem pagamentos ligados — ligue os pagamentos (Financeiro)' : (r.margem_pct != null ? `${pct(r.margem_pct)} do orçado (orçado − realizado)` : 'orçado − realizado')} />
        </Grupo>
      )}
      <Grupo titulo="Execução">
        <Indicador rotulo="% físico executado" valor={fisicoReal != null ? pct(fisicoReal.toFixed(1)) : '—'} cor="#5fc9c0"
          sub={fisico ? `previsto até hoje: ${pct(fisico.fisico_previsto.toFixed(1))}` : (fisico === false ? 'sem cronograma (seção Execução)' : '...')} />
        <Indicador rotulo="OS abertas" valor={osCampo ? osCampo.abertas + osCampo.execucao : '—'} cor="#8aa4c8"
          sub={osCampo ? `${osCampo.execucao} em execução no campo` : (osCampo === false ? 'não foi possível carregar' : '...')} />
      </Grupo>

      {!editando && (
        <div style={E.card} data-testid="ficha-obra">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <b style={{ flex: 1, fontSize: 14 }}>Dados da obra</b>
            {podeEditar && <button type="button" onClick={() => setEditando(true)} style={E.btnSecundario} data-testid="editar-obra"><Pencil size={13} /> Editar</button>}
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 18px', margin: 0 }}>
            {ficha.map(([k, v]) => (
              <div key={k}><dt style={{ color: 'var(--texto-3)', fontSize: 12 }}>{k}</dt><dd style={{ margin: '2px 0 0', fontSize: 13.5 }}>{v}</dd></div>
            ))}
          </dl>
          {obra.observacoes && <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--texto-2)', whiteSpace: 'pre-wrap' }}>{obra.observacoes}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
            <span style={{ color: 'var(--texto-3)', fontSize: 12, flex: 1 }}>
              Criada em {formatarData(obra.criado_em)}{obra.usuario_nome ? ` por ${obra.usuario_nome}` : ''}
              {obra.origem_migracao ? ` · gerada a partir dos dados antigos (${obra.origem_migracao})` : ''}
              {!podeEditar && ' · só o dono da obra ou um administrador altera'}
            </span>
            {ehAdmin && !obra.juntada && <button type="button" onClick={() => setJuntando(true)} style={E.btnSecundario} title="Esta obra está repetida? Traga a outra para cá" data-testid="juntar-obras"><Merge size={13} /> Juntar com outra obra…</button>}
            {obra.pode_excluir && <button type="button" onClick={excluir} style={{ ...E.btnSecundario, color: '#b04040' }}><Trash2 size={13} /> Excluir obra</button>}
          </div>
        </div>
      )}

      {editando && (
        <form style={E.card} onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Campo label="Nome da obra *" style={{ gridColumn: 'span 2' }}>
              <input value={form.nome} onChange={set('nome')} />
            </Campo>
            <Campo label="Cliente">
              <ClienteSelect value={form.cliente_id} onChange={set('cliente_id')}
                rotuloVazio={form.cliente_nome && !form.cliente_id ? `${form.cliente_nome} (sem cadastro)` : 'Sem cliente cadastrado'} />
            </Campo>
            <Campo label="Local" style={{ gridColumn: 'span 2' }}>
              <input value={form.local} onChange={set('local')} />
            </Campo>
            <Campo label="Segmento">
              <Select value={form.segmento} onChange={set('segmento')}>
                {Object.entries(SEGMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Campo>
            <Campo label="Status">
              <Select value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
              </Select>
            </Campo>
            <Campo label="Início previsto"><input type="date" value={form.inicio_previsto} onChange={set('inicio_previsto')} /></Campo>
            <Campo label="Fim previsto"><input type="date" value={form.fim_previsto} onChange={set('fim_previsto')} /></Campo>
            <Campo label="Responsável">
              <Select value={form.responsavel_id} onChange={set('responsavel_id')}>
                <option value="">Sem responsável</option>
                {usuarios.filter(u => u.id).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}
              </Select>
            </Campo>
            <Campo label="Observações" style={{ gridColumn: '1 / -1' }}>
              <textarea rows={3} value={form.observacoes} onChange={set('observacoes')} />
            </Campo>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setForm(inicial); setEditando(false); }} style={E.btnSecundario}>Cancelar</button>
            <button type="submit" disabled={!alterado || salvando} style={{ ...E.btnPrimario, opacity: alterado ? 1 : 0.5 }}><Save size={13} /> {salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
      {juntando && <JuntarObras obra={obra} onFechar={() => setJuntando(false)} onJuntou={() => { setJuntando(false); invalidarCacheObras(); recarregar(); irPara('resumo'); }} />}
    </div>
  );
}

// "Juntar com outra obra…" (admin): traz a obra repetida para esta. As parecidas (mesmo nome, local ou
// cliente) vêm primeiro; a outra fica cancelada apontando para esta, e nada é apagado.
function JuntarObras({ obra, onFechar, onJuntou }) {
  const [parecidas, setParecidas] = useState(null);
  const [todas, setTodas] = useState([]);
  const [origem, setOrigem] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    getObrasParecidas({ nome: obra.nome, local: obra.local || '', ...(obra.cliente_id ? { cliente_id: obra.cliente_id } : {}), excluir: obra.id })
      .then(r => { setParecidas(r.data.itens || []); if (r.data.itens?.[0]) setOrigem(String(r.data.itens[0].id)); }).catch(() => setParecidas([]));
    buscarTodasPaginas(getObras, { campos: 'basico' }).then(r => setTodas((r.data.itens || []).filter(o => o.id !== obra.id && o.status !== 'cancelada'))).catch(() => {});
  }, [obra]);
  const escolhida = todas.find(o => String(o.id) === origem) || (parecidas || []).find(o => String(o.id) === origem);
  const idsParecidas = new Set((parecidas || []).map(o => o.id));
  async function confirmar() {
    if (!escolhida) return;
    if (!window.confirm(`Juntar ${escolhida.codigo} em ${obra.codigo}?\n\nTudo o que está ligado à ${escolhida.codigo} (propostas, análises, projetos, laudos, contratos, pagamentos, OS) passa para ${obra.codigo}. A ${escolhida.codigo} fica cancelada, com o aviso de que foi juntada. Nada é apagado.`)) return;
    setOcupado(true);
    try {
      const r = await juntarObra(obra.id, escolhida.id);
      toast.success(r.data.mensagem, { duration: 7000 });
      onJuntou();
    } catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível juntar', { duration: 8000 }); } finally { setOcupado(false); }
  }
  return (
    <Modal titulo={`Juntar outra obra em ${obra.codigo}`} onFechar={onFechar} largura={620}>
      <p style={{ ...E.ajuda, fontSize: 12.5 }}>Use quando a mesma obra foi cadastrada duas vezes. Escolha a <b>repetida</b>: o que está ligado a ela vem para <b>{obra.codigo} — {obra.nome}</b>, e ela fica cancelada com o aviso de que foi juntada. A pasta dela continua onde está (aparece em Arquivos › Pastas anteriores).</p>
      {parecidas && parecidas.length > 0 && <p style={{ fontSize: 12.5, color: '#e2c35a', margin: '0 0 6px' }}>Parecidas com esta: {parecidas.map(o => o.codigo).join(', ')}</p>}
      {parecidas && parecidas.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--texto-3)', margin: '0 0 6px' }}>Nenhuma obra parecida encontrada — escolha na lista.</p>}
      <Select value={origem} onChange={e => setOrigem(e.target.value)} style={{ width: '100%' }} aria-label="Obra repetida">
        <option value="">Escolha a obra repetida…</option>
        {parecidas?.length > 0 && <optgroup label="Parecidas">{parecidas.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}</optgroup>}
        <optgroup label="Todas as obras">{todas.filter(o => !idsParecidas.has(o.id)).map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}</optgroup>
      </Select>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onFechar} style={E.btnSecundario}>Cancelar</button>
        <button type="button" onClick={confirmar} disabled={!escolhida || ocupado} style={E.btnPrimario}><Merge size={13} /> {ocupado ? 'Juntando…' : 'Juntar nesta obra'}</button>
      </div>
    </Modal>
  );
}

// ── peças das listas ──────────────────────────────────────────────────
function Cabecalho({ titulo, children, Icone }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
      <h3 style={{ color: '#c9a227', fontSize: 14, fontWeight: 700, flex: 1, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>{Icone && <Icone size={15} />}{titulo}</h3>
      {children}
    </div>
  );
}

// "Ligar existente": carrega os itens sem obra e liga o escolhido. Itens do MESMO cliente da obra vêm
// primeiro, num grupo à parte (2.42 — antes era uma lista só, de até 300 itens).
function LigarExistente({ rotulo, carregar, onLigar, obra }) {
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState(null);
  const [escolhido, setEscolhido] = useState('');
  useEffect(() => {
    if (!aberto || opcoes) return;
    carregar().then(setOpcoes).catch(() => { setOpcoes([]); toast.error('Erro ao carregar a lista'); });
  }, [aberto, opcoes, carregar]);
  if (!aberto) return <button type="button" onClick={() => setAberto(true)} style={E.btnSecundario}><Link2 size={13} /> {rotulo}</button>;
  const nomeCli = normalizarNome(obra?.cliente_nome);
  const doCliente = (o) => (obra?.cliente_id && o.cliente_id === obra.cliente_id) || (nomeCli && normalizarNome(o.cliente_nome) === nomeCli);
  const mesmos = (opcoes || []).filter(doCliente);
  const outros = (opcoes || []).filter(o => !doCliente(o));
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <Select value={escolhido} onChange={e => setEscolhido(e.target.value)} style={{ minWidth: 280, maxWidth: 460 }} aria-label={rotulo}>
        <option value="">{opcoes ? (opcoes.length ? 'Escolha um item sem obra...' : 'Nenhum item sem obra') : 'Carregando...'}</option>
        {mesmos.length > 0 && <optgroup label={`Do mesmo cliente (${mesmos.length})`}>{mesmos.map(o => <option key={o.id} value={String(o.id)}>{o.rotulo}</option>)}</optgroup>}
        {outros.length > 0 && <optgroup label={mesmos.length ? 'Outros' : 'Itens sem obra'}>{outros.map(o => <option key={o.id} value={String(o.id)}>{o.rotulo}</option>)}</optgroup>}
      </Select>
      <button type="button" disabled={!escolhido} onClick={() => { onLigar(Number(escolhido)); setAberto(false); setOpcoes(null); setEscolhido(''); }} style={E.btnPrimario}>Ligar</button>
      <button type="button" onClick={() => setAberto(false)} style={E.btnSecundario}>Cancelar</button>
    </div>
  );
}

function BotaoDesligar({ onClick }) {
  return <button type="button" onClick={onClick} style={E.btnIcone} title="Desligar da obra (não apaga o item)" aria-label="Desligar da obra"><Unlink size={12} /></button>;
}

function Tabela({ colunas, vazio, children }) {
  return (
    <div style={E.caixaTabela}>
      <table style={E.tabela}>
        <thead><tr>{colunas.map((c, i) => <th key={i} style={{ ...E.th, ...(c.direita ? { textAlign: 'right' } : {}) }}>{c.rotulo}</th>)}</tr></thead>
        <tbody>
          {(!children || (Array.isArray(children) && children.length === 0))
            ? <tr><td colSpan={colunas.length} style={E.tdVazio}>{vazio}</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

const tr = E.linhaTabela;
const textoAjuda = { color: 'var(--texto-3)', fontSize: 12, margin: '0 0 10px', lineHeight: 1.6 };

// ── Projeto: análises (arquivos recebidos), com a finalidade ──────────
// o envio dos arquivos fica AQUI, na obra (arquivos, pasta, ZIP ou os que já estão na pasta da obra)
function Analises({ obra, ligar, desligar, podeEditar, recarregar, pacoteNovidades, setPacoteNovidades }) {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const daPasta = parametros.get('usarPasta') === '1';
  // obra sem nada do projeto ainda: o envio já abre (é o próximo passo)
  const [enviando, setEnviando] = useState(daPasta || !!pacoteNovidades || (obra.analises.length === 0 && obra.laudos.length === 0));
  useEffect(() => { if (pacoteNovidades) setEnviando(true); }, [pacoteNovidades]);
  const [disciplinas, setDisciplinas] = useState([]);
  useEffect(() => { getDisciplinasProjeto().then(r => setDisciplinas(r.data)).catch(() => {}); }, []);
  const carregar = useCallback(() => getAnalisesProjeto({ obra_id: 'sem', porPagina: 200 })
    .then(r => (r.data.itens || []).map(a => ({ id: a.id, cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, rotulo: `#${a.id} — ${a.nome_projeto || a.cliente_nome || 'Sem nome'} — ${rotuloFinalidade(a.finalidade)} (${formatarData(a.atualizado_em)})` }))), []);
  return (
    <div>
      <Cabecalho titulo="Análises do projeto recebido" Icone={FileSearch}>
        {podeEditar && <LigarExistente rotulo="Ligar análise existente" carregar={carregar} obra={obra} onLigar={(id) => ligar('analise', id)} />}
        {!enviando && <button type="button" onClick={() => setEnviando(true)} style={E.btnPrimario} data-testid="nova-analise-obra"><Plus size={13} /> Enviar projeto para análise</button>}
      </Cabecalho>
      <p style={textoAjuda}>Leitura do projeto recebido do cliente ou do arquiteto (PDF, DWG, DXF, pasta ou ZIP), para <b>orçar</b> ou para a H&amp;M <b>elaborar o projeto</b>. Análise não gera laudo nem define disciplina sozinha.</p>
      {enviando && (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 16, background: '#121212' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <b style={{ color: '#c9a227', fontSize: 14, flex: 1 }}>Enviar o projeto para análise — {obra.nome}</b>
            <button type="button" onClick={() => setEnviando(false)} style={{ background: 'none', border: 0, color: 'var(--texto-3)', cursor: 'pointer', fontSize: 12 }}>Fechar</button>
          </div>
          <EnviarParaAnalise obraFixa={obra.id} disciplinas={disciplinas} iniciarComPasta={daPasta} pacoteInicial={pacoteNovidades}
            onCriada={(a) => { setPacoteNovidades(null); navigate(`/obras/analise/${a.id}`); }} />
        </div>
      )}
      {/* a mesma tabela da aba Análise de projeto (components/analise/ListaAnalises.js) */}
      <TabelaAnalises linhas={obra.analises} disciplinas={disciplinas} mostrarObra={false} vazio="Nenhuma análise nesta obra. Recebeu o projeto? Clique em “Enviar projeto para análise”."
        acoes={(a) => podeEditar && <BotaoDesligar onClick={() => desligar('analise', a.id, `a análise #${a.id}`)} />}
        depoisDeExcluir={recarregar} />
    </div>
  );
}

// ── Projeto: projetos e laudos por disciplina ─────────────────────────
const REGISTRO = {
  projeto: {
    titulo: 'Projetos por disciplina', Icone: DraftingCompass, aba: 'projetos', item: 'projeto', novo: 'Novo projeto', ligar: 'Ligar projeto existente',
    vazio: 'Nenhum projeto nesta obra.', semOrcamento: 'sem orçamento',
    ajuda: 'Projeto que a H&M elabora e entrega (memorial, desenhos, as-built, DXF, QElectroTech, PDF). Nasce aqui, da análise com finalidade "Elaboração de projeto" ou da especificação do cliente.',
  },
  laudo: {
    titulo: 'Laudos', Icone: FileText, aba: 'laudos', item: 'laudo', novo: 'Novo laudo', ligar: 'Ligar laudo existente',
    vazio: 'Nenhum laudo nesta obra — crie só quando a inspeção for pedida.', semOrcamento: 'só laudo',
    ajuda: 'Laudo de inspeção/vistoria pedido quando necessário (checklist, fotos, medições). Não nasce da análise de projeto.',
  },
};

function RegistrosDisciplina({ obra, ligar, desligar, podeEditar, tipo, itens, recarregar }) {
  const R = REGISTRO[tipo];
  const carregar = useCallback(() => getLaudos({ obra_id: 'sem', tipo })
    .then(r => (r.data.itens || []).map(l => ({ id: l.id, cliente_id: l.cliente_id, cliente_nome: l.cliente_nome, rotulo: `#${l.id} — ${String(l.disciplina).toUpperCase()} — ${l.titulo || 'Sem título'}` }))), [tipo]);
  return (
    <div>
      <Cabecalho titulo={R.titulo} Icone={R.Icone}>
        {podeEditar && <LigarExistente rotulo={R.ligar} carregar={carregar} obra={obra} onLigar={(id) => ligar('laudo', id)} />}
        {tipo === 'projeto' && <Link to={`/obras?aba=especificacao&obra=${obra.id}`} style={E.btnSecundario} title="Gera o projeto do quadro/painel a partir da especificação do cliente (PDF, DOCX, XLSX)"><FileCog size={13} /> Pela especificação</Link>}
        <Link to={`/obras?aba=${R.aba}&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> {R.novo}</Link>
      </Cabecalho>
      <p style={textoAjuda}>{R.ajuda}</p>
      <Tabela colunas={[{ rotulo: 'Disciplina' }, { rotulo: 'Título' }, { rotulo: 'Revisão' }, { rotulo: 'Propostas' }, { rotulo: 'Atualizado' }, { rotulo: '' }]} vazio={R.vazio}>
        {itens.map(l => (
          <tr key={l.id} style={tr}>
            <td style={{ ...E.td, fontWeight: 700 }}>{String(l.disciplina).toUpperCase()}</td>
            <td style={E.td}>
              <Link to={`/obras?aba=${R.aba}&laudo=${l.id}`} style={E.link}>{l.titulo || `${tipo === 'projeto' ? 'Projeto' : 'Laudo'} #${l.id}`}</Link>
              {l.gerar_orcamento === false && <span style={{ color: 'var(--texto-3)', fontSize: 11.5 }}> · {R.semOrcamento}</span>}
              {l.analise_id && <span style={{ color: 'var(--texto-3)', fontSize: 11.5 }}> · da <Link to={`/obras/analise/${l.analise_id}`} style={E.link}>análise #{l.analise_id}</Link></span>}
            </td>
            <td style={E.td}>{l.revisao || '—'}</td>
            <td style={{ ...E.td, fontSize: 12 }}>
              {Object.entries(l.propostas || {}).map(([modo, pid]) => <Link key={modo} to={`/propostas/editar/${pid}`} style={{ ...E.link, marginRight: 8 }}>{modo}</Link>)}
              {!Object.keys(l.propostas || {}).length && '—'}
            </td>
            <td style={E.td}>{formatarData(l.atualizado_em)}</td>
            <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {podeEditar && <BotaoDesligar onClick={() => desligar('laudo', l.id, `o ${R.item} #${l.id}`)} />}
              <BotaoExcluir rotulo={`o ${R.item} #${l.id} (${String(l.disciplina).toUpperCase()} — ${l.titulo || 'sem título'})`} excluir={() => removerLaudo(l.id)} depois={recarregar} />
            </td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}

// ── Proposta ──────────────────────────────────────────────────────────
function Propostas({ obra, ligar, desligar, podeEditar }) {
  const carregar = useCallback(() => getPropostas({ obra_id: 'sem', porPagina: 300 })
    .then(r => (r.data.itens || []).map(p => ({ id: p.id, cliente_id: p.cliente_id, cliente_nome: p.cliente_nome, rotulo: `${p.numero} — ${p.cliente_nome || 'Sem cliente'}${p.local_obra ? ` — ${p.local_obra}` : ''} (${p.status})` }))), []);
  const r = obra.resumo;
  return (
    <div>
      <Cabecalho titulo="Propostas da obra" Icone={ClipboardList}>
        {podeEditar && <LigarExistente rotulo="Ligar proposta existente" carregar={carregar} obra={obra} onLigar={(id) => ligar('proposta', id)} />}
        <Link to={`/propostas?aba=editar&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> Nova proposta nesta obra</Link>
      </Cabecalho>
      <p style={textoAjuda}>Quando a proposta é aprovada, a obra passa sozinha para <b>Contratada</b>.</p>
      <Tabela colunas={[{ rotulo: 'Número' }, { rotulo: 'Data' }, { rotulo: 'Cliente' }, { rotulo: 'Local' }, { rotulo: 'Status' }, { rotulo: 'Total', direita: true }, { rotulo: '' }]} vazio="Nenhuma proposta nesta obra.">
        {obra.propostas.map(p => (
          <tr key={p.id} style={tr}>
            <td style={E.td}><Link to={`/propostas/editar/${p.id}`} style={E.link}>{p.numero}</Link>{(r.orcado_propostas || []).includes(p.id) && <span title="entra no orçado da obra" style={{ color: '#c9a227', marginLeft: 6 }}>●</span>}</td>
            <td style={E.td}>{formatarData(p.data)}</td>
            <td style={E.td}>{p.cliente_nome || '—'}</td>
            <td style={{ ...E.td, fontSize: 12, color: 'var(--texto-2)' }}>{p.local_obra || '—'}</td>
            <td style={E.td}><Etiqueta info={STATUS_PROPOSTA[p.status]}>{p.status}</Etiqueta></td>
            <td style={{ ...E.td, textAlign: 'right', fontWeight: 700, color: '#c9a227' }}>{moeda(p.total)}</td>
            <td style={{ ...E.td, textAlign: 'right' }}>{podeEditar && <BotaoDesligar onClick={() => desligar('proposta', p.id, `a proposta ${p.numero}`)} />}</td>
          </tr>
        ))}
      </Tabela>
      <p style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 8 }}>● entra no orçado: {BASE_ORCADO[r.orcado_base]}.</p>
    </div>
  );
}

// ── Execução: contratos, cronograma físico-financeiro e medições, OS de campo ──
function Execucao({ obra, ligar, desligar }) {
  const carregar = useCallback(() => getContratos({ obra_id: 'sem', porPagina: 300 })
    .then(r => (r.data.itens || []).map(c => ({ id: c.id, rotulo: `${c.codigo_registro} — ${c.prestador_nome}${c.local_obra ? ` — ${c.local_obra}` : ''}` }))), []);
  return (
    <div>
      <p style={textoAjuda}>A primeira medição ou a primeira OS de uma obra contratada põe a obra <b>Em execução</b> sozinha.</p>
      <CronogramaObra obra={obra} />
      <Separador />
      <OrdensServicoObra obra={obra} podeEditar={obra.pode_editar} />
      <Separador />
      <Cabecalho titulo="Contratos de prestadores" Icone={Briefcase}>
        {!obra.restrito_financeiro && <LigarExistente rotulo="Ligar contrato existente" carregar={carregar} onLigar={(id) => ligar('contrato', id)} />}
        {!obra.restrito_financeiro && <Link to={`/financeiro?aba=contratos&obra=${obra.id}`} style={E.btnPrimario}><Plus size={13} /> Novo contrato nesta obra</Link>}
      </Cabecalho>
      {obra.restrito_financeiro
        ? <div style={E.card}><p style={{ color: 'var(--texto-3)', margin: 0 }}>Contratos de prestadores são vistos só por administradores.</p></div>
        : (
          <Tabela colunas={[{ rotulo: 'Código' }, { rotulo: 'Prestador' }, { rotulo: 'Objeto' }, { rotulo: 'Período' }, { rotulo: 'Valor', direita: true }, { rotulo: '' }]} vazio="Nenhum contrato ligado a esta obra.">
            {obra.contratos.map(c => (
              <tr key={c.id} style={tr}>
                <td style={{ ...E.td, fontWeight: 700, color: '#c9a227' }}>{c.codigo_registro}</td>
                <td style={E.td}>{c.prestador_nome}</td>
                <td style={{ ...E.td, fontSize: 12, color: 'var(--texto-2)' }}>{c.objeto || c.local_obra || '—'}</td>
                <td style={E.td}>{formatarData(c.periodo_inicio)} a {formatarData(c.periodo_fim)}</td>
                <td style={{ ...E.td, textAlign: 'right', fontWeight: 700 }}>{moeda(c.valor)}</td>
                <td style={{ ...E.td, textAlign: 'right' }}><BotaoDesligar onClick={() => desligar('contrato', c.id, `o contrato ${c.codigo_registro}`)} /></td>
              </tr>
            ))}
          </Tabela>
        )}
    </div>
  );
}

// ── Financeiro (movimentos ligados, Pix sugeridos e notas) ────────────
function Financeiro({ obra, ligar, desligar, recarregar }) {
  const carregar = useCallback(() => {
    // período no dia de Brasília (em UTC, depois das 21h terminava amanhã): do 1º dia de 6 meses atrás até hoje
    const hoje = hojeBrasilia();
    const [ano, mes] = hoje.split('-').map(Number);
    const inicio = paraIso(new Date(ano, mes - 1 - 6, 1));
    return getFinanceiroMovimentos({ obraId: 'sem', dataInicio: inicio, dataFim: hoje })
      .then(r => (r.data.movimentos || []).map(m => ({
        id: m.id,
        rotulo: `${new Date(m.data_hora).toLocaleDateString('pt-BR')} — ${m.tipo === 'realizado' ? 'saída' : 'entrada'} ${moeda(m.valor)} — ${m.nome || 'sem nome'}`,
      })));
  }, []);
  if (obra.restrito_financeiro) return <div style={E.card}><p style={{ color: 'var(--texto-3)', margin: 0 }}>O financeiro da obra é visto só por administradores.</p></div>;
  const r = obra.resumo;
  return (
    <div>
      <PixSugeridos obra={obra} aoLigar={recarregar} />
      <Cabecalho titulo="Pagamentos e recebimentos ligados" Icone={Wallet}>
        <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>últimos 6 meses sem obra:</span>
        <LigarExistente rotulo="Ligar movimento existente" carregar={carregar} onLigar={(id) => ligar('movimento', id)} />
      </Cabecalho>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12, flexWrap: 'wrap' }}>
        <span>Recebido: <b style={{ color: '#3fb95f' }}>{moeda(r.recebido)}</b></span>
        <span>Realizado: <b style={{ color: '#e08080' }}>{moeda(r.realizado)}</b></span>
        <span>Margem: {r.sem_custos ? <b style={{ color: 'var(--texto-3)' }}>sem pagamentos ligados</b> : <b style={{ color: corMargem(r.margem) }}>{moeda(r.margem)}</b>}</span>
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
      <NotasDaObra obra={obra} />
    </div>
  );
}

// Pix sem obra cuja obra SUGERIDA é esta (services/atribuicaoObras.js: nota → proposta → obra, contrato do
// prestador ou cliente da obra): liga daqui, sem abrir a lista geral. "lembrar" fica ligado (próximos Pix
// desse nome já entram nesta obra).
function PixSugeridos({ obra, aoLigar }) {
  const [grupos, setGrupos] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const carregar = useCallback(() => getPixSemObra().then(r => setGrupos((r.data.grupos || []).filter(g => g.sugestao?.obra_id === obra.id))).catch(() => setGrupos([])), [obra.id]);
  useEffect(() => { carregar(); }, [carregar]);
  if (!grupos.length) return null;
  async function ligarGrupo(g) {
    setOcupado(true);
    try {
      const r = await atribuirPixObra({ tipo: g.tipo, chave: g.chave, obra_id: obra.id, lembrar: true });
      toast.success(`${r.data.mudou} lançamento${r.data.mudou === 1 ? '' : 's'} ligado${r.data.mudou === 1 ? '' : 's'} à obra`);
      await carregar();
      aoLigar?.();
    } catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível ligar'); } finally { setOcupado(false); }
  }
  return (
    <div style={{ ...E.card, borderColor: '#c9a22788', padding: 14 }} data-testid="pix-sugeridos">
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><InfoIcone size={14} color="#c9a227" /> Pix sem obra que parecem desta obra</div>
      {grupos.map(g => (
        <div key={`${g.tipo}|${g.chave}`} style={{ ...E.linhaTabela, display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', fontSize: 12.5, flexWrap: 'wrap' }}>
          <b style={{ flex: '1 1 200px' }}>{g.nome}</b>
          <span style={{ color: 'var(--texto-3)' }}>{g.n} lançamento{g.n > 1 ? 's' : ''} · {g.sugestao.motivo}</span>
          <b style={{ color: g.tipo === 'recebido' ? '#3fb95f' : '#e08080' }}>{g.tipo === 'recebido' ? '+ ' : '- '}{moeda(g.total)}</b>
          <button type="button" disabled={ocupado} onClick={() => ligarGrupo(g)} style={{ ...E.btnPrimario, padding: '5px 12px' }}>Ligar a esta obra</button>
        </div>
      ))}
    </div>
  );
}

// Notas fiscais emitidas das propostas da obra (o faturado). Só administrador: a seção Financeiro já não abre
// para os outros, e o backend nem manda as notas. "Recebido (Pix)" = Pix ligados à nota; o Pix ligado à nota
// já leva a obra dela, então entra também no recebido da obra.
function NotasDaObra({ obra }) {
  const r = obra.resumo;
  const notas = obra.notas || [];
  const situacao = (n) => {
    if (n.baixa_manual_em) return 'baixa manual';
    const liq = Number(n.valor_liquido) || 0;
    const rec = Number(n.recebido) || 0;
    if (rec >= liq - 0.01) return 'recebida';
    return rec > 0 ? 'parcial' : 'em aberto';
  };
  return (
    <div style={{ marginTop: 18 }} data-testid="obra-notas">
      <Cabecalho titulo="Notas fiscais emitidas (faturado)" Icone={FileText}>
        <Link to="/financeiro?aba=notas" style={E.btnSecundario}><FileText size={13} /> Notas fiscais</Link>
      </Cabecalho>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12, flexWrap: 'wrap' }} data-testid="obra-faturado">
        <span>Faturado: <b style={{ color: '#9fb3ff' }}>{moeda(r.faturado)}</b>{r.faturado_liquido !== r.faturado ? ` (líquido ${moeda(r.faturado_liquido)})` : ''}</span>
        <span>Recebido: <b style={{ color: '#3fb95f' }}>{moeda(r.recebido)}</b></span>
        {r.baixado_manual > 0 && <span>Baixa manual: <b>{moeda(r.baixado_manual)}</b></span>}
        <span>A receber do faturado: <b style={{ color: r.a_receber_faturado > 0 ? '#d69a2d' : '#3fb95f' }}>{moeda(r.a_receber_faturado)}</b></span>
      </div>
      <Tabela colunas={[{ rotulo: 'Nota' }, { rotulo: 'Emissão' }, { rotulo: 'Proposta' }, { rotulo: 'Tomador' }, { rotulo: 'Valor', direita: true }, { rotulo: 'Líquido', direita: true }, { rotulo: 'Recebido (Pix)', direita: true }, { rotulo: 'Situação' }]}
        vazio="Nenhuma nota emitida nas propostas desta obra. A nota entra aqui quando é ligada a uma proposta da obra (Financeiro › Notas fiscais).">
        {notas.map(n => (
          <tr key={n.id} style={tr}>
            <td style={E.td}>{n.numero || '—'}</td>
            <td style={E.td}>{n.data_emissao ? formatarData(n.data_emissao) : '—'}</td>
            <td style={E.td}>{n.proposta_numero || '—'}</td>
            <td style={E.td}>{n.tomador_nome || '—'}</td>
            <td style={{ ...E.td, textAlign: 'right' }}>{moeda(n.valor_servicos)}</td>
            <td style={{ ...E.td, textAlign: 'right', fontWeight: 700 }}>{moeda(n.valor_liquido)}</td>
            <td style={{ ...E.td, textAlign: 'right', color: '#3fb95f' }}>{moeda(n.recebido)}</td>
            <td style={E.td}>{situacao(n)}</td>
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
      <Cabecalho titulo="Pasta da obra" Icone={FolderOpen} />
      <p style={{ color: 'var(--texto-3)', fontSize: 12, margin: '0 0 6px' }}>
        A pasta da obra fica dentro da <b>pasta do cliente</b> (servidor); o que o cliente mandar vai em <code>Recebidos do cliente</code> e o sistema avisa arquivo novo ou alterado. Itens desta obra gravam aqui: <code>Projeto</code> (análise), <code>Projetos\&lt;disciplina&gt;</code> (com a <code>Entrega</code>), <code>Laudos\&lt;disciplina&gt;</code>, <code>Propostas</code> e <code>Contratos</code>.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 10px', padding: '10px 12px', border: '1px solid #3a3215', borderRadius: 8, background: '#16140c' }}>
        <span style={{ color: 'var(--texto-2)', fontSize: 12, flex: '1 1 320px', lineHeight: 1.5 }}>
          Recebeu o projeto do cliente por e-mail? Salve os arquivos (PDF, DWG, DXF ou ZIP) nesta pasta — ou envie direto pela seção <b>Projeto</b> — e analise:
        </span>
        <Link to={`/obras/${obra.id}?secao=projeto&usarPasta=1`} style={E.btnPrimario} data-testid="analisar-pasta-obra"><FileSearch size={13} /> Analisar os arquivos desta pasta</Link>
      </div>
      <PainelPasta carregar={carregar} abrir={abrir} />
      {outras.length > 0 && (
        <>
          <Cabecalho titulo="Pastas anteriores dos itens ligados" />
          <p style={{ color: 'var(--texto-3)', fontSize: 12, margin: '0 0 6px' }}>Análises e laudos de antes da obra (ou de uma obra juntada a esta) continuam nas pastas de sempre (nada foi movido).</p>
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
      <div style={{ color: 'var(--texto-2)', fontSize: 12, marginTop: 8 }}>{item.tipo === 'analise' ? 'Análise' : item.tipo_registro === 'projeto' ? 'Projeto' : 'Laudo'} #{item.id} — {item.rotulo}</div>
      <PainelPasta carregar={carregar} abrir={abrir} />
    </div>
  );
}

const trilho = { display: 'flex', gap: 4, flexWrap: 'wrap', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content', maxWidth: '100%' };
const abaEstilo = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' };
