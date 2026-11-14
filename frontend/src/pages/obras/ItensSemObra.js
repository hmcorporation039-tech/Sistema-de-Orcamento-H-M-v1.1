import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Link2, Plus, FileSearch, DraftingCompass, FileText, ClipboardList, FileCog } from 'lucide-react';
import { getAnalisesProjeto, getLaudos, getPropostas, getObras, buscarTodasPaginas, vincularItemObra, criarObra } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Select from '../../components/Select';
import { invalidarCacheObras } from '../../components/ObraSelect';
import { rotuloFinalidade } from '../../utils/finalidades';
import { formatarData } from '../../utils/format';
import { normalizarNome } from '../../utils/texto';
import PixSemObra from './PixSemObra';
import { STATUS_OBRA, moeda, estilos as E } from './comum';

// "Itens sem obra" (revisão da aba Obras, 2.42): o que ficou solto — análises, projetos, laudos e propostas
// sem obra — com a obra SUGERIDA pelo cliente (a mesma do cadastro; senão o mesmo nome de cliente) e as
// obras desse cliente no topo da lista. "Ligar" põe na obra escolhida; "Criar obra" cria uma obra com o
// nome e o cliente do item e já liga. Os Pix sem obra (margem real) ficam aqui também (só administrador).
// Também é a porta para começar algo que ainda não tem obra (análise, projeto, laudo, especificação).
const TIPOS = [
  { chave: 'analise', titulo: 'Análises de projeto', Icone: FileSearch, vinculo: 'analise' },
  { chave: 'projeto', titulo: 'Projetos por disciplina', Icone: DraftingCompass, vinculo: 'laudo' },
  { chave: 'laudo', titulo: 'Laudos', Icone: FileText, vinculo: 'laudo' },
  { chave: 'proposta', titulo: 'Propostas', Icone: ClipboardList, vinculo: 'proposta' },
];
const ENCERRADA = new Set(['concluida', 'cancelada']);

// item → { id, nome, cliente_id, cliente_nome, detalhe, link }
function normalizar(tipo, x) {
  if (tipo === 'analise') {
    return { id: x.id, nome: x.nome_projeto || x.cliente_nome || `Análise #${x.id}`, cliente_id: x.cliente_id, cliente_nome: x.cliente_nome,
      detalhe: `#${x.id} · ${rotuloFinalidade(x.finalidade)} · ${formatarData(x.atualizado_em)}`, link: `/obras/analise/${x.id}` };
  }
  if (tipo === 'proposta') {
    return { id: x.id, nome: x.local_obra || x.cliente_nome || x.numero, cliente_id: x.cliente_id, cliente_nome: x.cliente_nome,
      detalhe: `${x.numero} · ${x.status} · ${moeda(x.total)}`, link: `/propostas/editar/${x.id}` };
  }
  return { id: x.id, nome: x.titulo || `${tipo === 'projeto' ? 'Projeto' : 'Laudo'} #${x.id}`, cliente_id: x.cliente_id, cliente_nome: x.cliente_nome,
    detalhe: `#${x.id} · ${String(x.disciplina).toUpperCase()} · ${formatarData(x.atualizado_em)}`, link: `/obras?aba=${tipo === 'projeto' ? 'projetos' : 'laudos'}&laudo=${x.id}` };
}

// obras do mesmo cliente (pelo cadastro; senão pelo nome) — as em andamento primeiro
export function obrasDoCliente(item, obras) {
  const nome = normalizarNome(item.cliente_nome);
  const doCliente = obras.filter(o => (item.cliente_id && o.cliente_id === item.cliente_id) || (nome && normalizarNome(o.cliente_nome) === nome));
  return doCliente.sort((a, b) => Number(ENCERRADA.has(a.status)) - Number(ENCERRADA.has(b.status)) || b.id - a.id);
}
// sugestão só quando é uma obra em andamento só desse cliente (sinal seguro)
export function obraSugerida(item, obras) {
  const andamento = obrasDoCliente(item, obras).filter(o => !ENCERRADA.has(o.status));
  return andamento.length === 1 ? andamento[0] : null;
}

function Linha({ item, tipo, obras, ocupado, onLigar, onCriar }) {
  const sugerida = obraSugerida(item, obras);
  const [obraId, setObraId] = useState(sugerida ? String(sugerida.id) : '');
  const doCliente = obrasDoCliente(item, obras);
  const outras = obras.filter(o => !doCliente.includes(o) && o.status !== 'cancelada');
  const rotulo = (o) => `${o.codigo} — ${o.nome}${ENCERRADA.has(o.status) ? ` (${STATUS_OBRA[o.status]?.rotulo})` : ''}`;
  return (
    <div style={{ ...E.linhaTabela, padding: '10px 0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <Link to={item.link} style={E.link}>{item.nome}</Link>
        <div style={{ color: 'var(--texto-3)', fontSize: 12 }}>{item.detalhe}{item.cliente_nome ? ` · ${item.cliente_nome}` : ' · sem cliente'}</div>
        {sugerida && <div style={{ color: '#3fb95f', fontSize: 11.5 }}>Sugestão: {sugerida.codigo} (única obra em andamento deste cliente)</div>}
      </div>
      <Select value={obraId} onChange={e => setObraId(e.target.value)} style={{ minWidth: 240, flex: '0 1 340px' }} aria-label={`Obra para ${item.nome}`}>
        <option value="">Escolha a obra…</option>
        {doCliente.length > 0 && <optgroup label="Do mesmo cliente">{doCliente.map(o => <option key={o.id} value={o.id}>{rotulo(o)}</option>)}</optgroup>}
        <optgroup label={doCliente.length ? 'Outras obras' : 'Obras'}>{outras.map(o => <option key={o.id} value={o.id}>{rotulo(o)}</option>)}</optgroup>
      </Select>
      <button type="button" disabled={ocupado || !obraId} onClick={() => onLigar(tipo, item, Number(obraId))} style={E.btnPrimario}><Link2 size={13} /> Ligar</button>
      <button type="button" disabled={ocupado} onClick={() => onCriar(tipo, item)} style={E.btnSecundario} title="Cria uma obra com o nome e o cliente deste item e já liga"><Plus size={13} /> Criar obra</button>
    </div>
  );
}

export default function ItensSemObra() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState(null);
  const [obras, setObras] = useState([]);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [an, pj, ld, pr, ob] = await Promise.all([
        getAnalisesProjeto({ obra_id: 'sem', porPagina: 200 }),
        getLaudos({ obra_id: 'sem', tipo: 'projeto' }),
        getLaudos({ obra_id: 'sem', tipo: 'laudo' }),
        getPropostas({ obra_id: 'sem', porPagina: 300 }),
        buscarTodasPaginas(getObras, { campos: 'basico' }),
      ]);
      setDados({
        analise: (an.data.itens || []).map(x => normalizar('analise', x)),
        projeto: (pj.data.itens || []).map(x => normalizar('projeto', x)),
        laudo: (ld.data.itens || []).map(x => normalizar('laudo', x)),
        // proposta recusada/cancelada sem obra não precisa de obra
        proposta: (pr.data.itens || []).filter(p => !['Recusada', 'Cancelada'].includes(p.status)).map(x => normalizar('proposta', x)),
      });
      setObras(ob.data.itens || []);
    } catch {
      toast.error('Erro ao carregar os itens sem obra');
      setDados({ analise: [], projeto: [], laudo: [], proposta: [] });
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const vinculoDe = (tipo) => TIPOS.find(t => t.chave === tipo).vinculo;
  const tirar = (tipo, id) => setDados(d => ({ ...d, [tipo]: d[tipo].filter(x => x.id !== id) }));

  async function ligar(tipo, item, obraId) {
    setOcupado(true);
    try {
      await vincularItemObra(obraId, vinculoDe(tipo), item.id, true);
      const o = obras.find(x => x.id === obraId);
      toast.success(`Ligado à obra ${o?.codigo || ''}`);
      tirar(tipo, item.id);
    } catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível ligar'); } finally { setOcupado(false); }
  }
  async function criar(tipo, item) {
    const nome = window.prompt('Nome da nova obra:', item.nome);
    if (!nome || !nome.trim()) return;
    setOcupado(true);
    try {
      const { data: obra } = await criarObra({ nome: nome.trim(), ...(item.cliente_id ? { cliente_id: item.cliente_id } : { cliente_nome: item.cliente_nome || null }) });
      await vincularItemObra(obra.id, vinculoDe(tipo), item.id, true);
      invalidarCacheObras();
      setObras(os => [...os, obra]);
      toast.success(`Obra ${obra.codigo} criada e ligada`);
      tirar(tipo, item.id);
    } catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível criar a obra'); } finally { setOcupado(false); }
  }

  const total = useMemo(() => (dados ? TIPOS.reduce((s, t) => s + dados[t.chave].length, 0) : 0), [dados]);

  return (
    <div>
      <div style={{ ...E.card, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Começar sem obra</div>
        <p style={{ ...E.ajuda, marginBottom: 10 }}>O caminho normal é abrir a obra e criar tudo dentro dela. Quando a obra ainda não existe, comece aqui e ligue depois.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/obras?aba=analise" style={E.btnSecundario}><FileSearch size={13} /> Analisar projeto recebido</Link>
          <Link to="/obras?aba=projetos" style={E.btnSecundario}><DraftingCompass size={13} /> Novo projeto por disciplina</Link>
          <Link to="/obras?aba=laudos" style={E.btnSecundario}><FileText size={13} /> Novo laudo</Link>
          <Link to="/obras?aba=especificacao" style={E.btnSecundario}><FileCog size={13} /> Projeto pela especificação</Link>
        </div>
      </div>

      {ehAdmin && <PixSemObra />}

      {!dados && <div className="loading">Carregando...</div>}
      {dados && total === 0 && <div style={{ ...E.card, color: 'var(--texto-3)' }}>Nenhuma análise, projeto, laudo ou proposta sem obra. Tudo ligado.</div>}
      {dados && TIPOS.filter(t => dados[t.chave].length).map(({ chave, titulo, Icone }) => (
        <div key={chave} style={E.card} data-testid={`sem-obra-${chave}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icone size={15} color="#c9a227" />
            <b style={{ color: '#c9a227', fontSize: 14 }}>{titulo} sem obra ({dados[chave].length})</b>
          </div>
          {dados[chave].map(item => <Linha key={item.id} item={item} tipo={chave} obras={obras} ocupado={ocupado} onLigar={ligar} onCriar={criar} />)}
        </div>
      ))}
    </div>
  );
}
