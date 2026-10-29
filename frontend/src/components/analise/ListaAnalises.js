// Lista de análises de projeto — a MESMA na aba "Análise de projeto" (todas,
// com busca e páginas) e na obra (as da obra). Antes eram duas tabelas
// diferentes: a da aba mostrava só as 20 mais recentes, sem busca, sem obra e
// sem nome — uma análise sem obra que saísse das 20 sumia da tela.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getAnalisesProjeto, removerAnaliseProjeto } from '../../services/api';
import { rotuloFinalidade, corFinalidade } from '../../utils/finalidades';
import { formatarData } from '../../utils/format';
import Paginacao from '../Paginacao';
import Select from '../Select';
import BotaoExcluir from '../ui/BotaoExcluir';
import { estilos as E } from '../ui/estilos';

const nomeDa = (a) => a.nome_projeto || a.cliente_nome || 'Sem nome';
const nomesDisciplinas = (a, disciplinas) => (a.disciplinas || [])
  .map(c => (typeof c === 'string' ? c : c?.chave))
  .map(c => disciplinas?.find(d => d.chave === c)?.nome?.split(/ — | \(/)[0] || c)
  .join(', ') || '—';

// linhas: análises; colunas opcionais: obra (fora da obra), acoes(a) (botões extras)
export function TabelaAnalises({ linhas, disciplinas, ativaId = null, mostrarObra = true, acoes = null, depoisDeExcluir, vazio = 'Nenhuma análise.' }) {
  const colunas = ['Análise', 'Finalidade', 'Cliente', ...(mostrarObra ? ['Obra'] : []), 'Disciplinas', 'Proposta', 'Atualizada', ''];
  return (
    <div style={E.caixaTabela}>
      <table style={E.tabela} data-testid="lista-analises">
        <thead><tr style={{ background: '#0f0f0f' }}>{colunas.map((c, i) => <th key={i} style={E.th}>{c}</th>)}</tr></thead>
        <tbody>
          {!linhas.length && <tr><td colSpan={colunas.length} style={E.tdVazio}>{vazio}</td></tr>}
          {linhas.map(a => (
            <tr key={a.id} style={{ ...E.linhaTabela, background: String(ativaId) === String(a.id) ? '#1a1a1a' : 'transparent' }}>
              <td style={E.td}><Link to={`/obras/analise/${a.id}`} style={E.link}>#{a.id} — {nomeDa(a)}</Link></td>
              <td style={{ ...E.td, color: corFinalidade(a.finalidade), whiteSpace: 'nowrap' }}>{rotuloFinalidade(a.finalidade)}</td>
              <td style={E.td}>{a.cliente_nome || '—'}</td>
              {mostrarObra && <td style={E.td}>{a.obra ? <Link to={`/obras/${a.obra.id}`} style={{ color: '#bbb' }}>{a.obra.codigo ? `${a.obra.codigo} — ` : ''}{a.obra.nome}</Link> : <span style={{ color: '#666' }}>sem obra</span>}</td>}
              <td style={{ ...E.td, fontSize: 11, color: '#999' }}>{nomesDisciplinas(a, disciplinas)}</td>
              <td style={E.td}>{a.proposta_id ? <Link to={`/propostas/editar/${a.proposta_id}`} style={E.link}>{a.proposta_numero || `#${a.proposta_id}`}</Link> : '—'}</td>
              <td style={{ ...E.td, whiteSpace: 'nowrap' }}>{formatarData(a.atualizado_em)}</td>
              <td style={{ ...E.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {acoes?.(a)}
                <BotaoExcluir rotulo={`a análise #${a.id} (${nomeDa(a)})`} excluir={() => removerAnaliseProjeto(a.id)} depois={() => depoisDeExcluir?.(a)} titulo="Excluir a análise" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Aba "Análise de projeto": todas as análises, com busca, filtro de obra e páginas.
// `versao`: muda para recarregar (análise criada/excluída fora daqui)
export default function AnalisesSalvas({ disciplinas, ativaId, versao, onExcluida }) {
  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1 });
  const [carregando, setCarregando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await getAnalisesProjeto({ porPagina: 15, pagina, ...(busca.trim() ? { busca: busca.trim() } : {}), ...(filtroObra ? { obra_id: filtroObra } : {}) });
      setDados({ itens: r.data.itens || [], total: r.data.total ?? 0, totalPaginas: r.data.totalPaginas ?? 1 });
    } catch {
      // a lista é conveniência — não bloqueia a tela se falhar
    } finally {
      setCarregando(false);
    }
  }, [pagina, busca, filtroObra]);

  // busca digitada: espera parar de digitar
  useEffect(() => { const t = setTimeout(carregar, busca ? 350 : 0); return () => clearTimeout(t); }, [carregar, busca, versao, recarga]);
  useEffect(() => { setPagina(1); }, [busca, filtroObra]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#666' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, cliente, obra ou nº da análise" style={{ paddingLeft: 30 }} data-testid="busca-analises" />
        </div>
        <Select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} style={{ width: 'auto', minWidth: 170 }}>
          <option value="">Todas (com e sem obra)</option>
          <option value="sem">Só as sem obra</option>
        </Select>
      </div>
      {carregando && !dados.itens.length
        ? <p style={{ fontSize: 12, color: '#666' }}>Carregando...</p>
        : <TabelaAnalises linhas={dados.itens} disciplinas={disciplinas} ativaId={ativaId}
            vazio={busca || filtroObra ? 'Nenhuma análise encontrada.' : 'Nenhuma análise salva ainda.'}
            depoisDeExcluir={(a) => { setRecarga(x => x + 1); onExcluida?.(a); }} />}
      <Paginacao pagina={pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />
    </div>
  );
}
