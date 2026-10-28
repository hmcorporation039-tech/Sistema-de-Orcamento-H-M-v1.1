// Novidades das pastas dos clientes (versão 2.3 — backend/src/services/monitorPastas.js):
// arquivo NOVO, ALTERADO ou REMOVIDO que apareceu na pasta do cliente/obra sem
// ter sido o sistema que gravou (o projeto revisado que o arquiteto mandou).
//   AvisoNovidades — no topo da obra e na pasta do cliente: lista, "Analisar"
//     (arquivos de projeto) e "Marcar como visto"; varre a pasta ao abrir;
//   IndicadorNovidades — no cabeçalho: quantas novidades há, por cliente.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, FileSearch, RefreshCw, WifiOff } from 'lucide-react';
import { getNovidadesPastas, marcarNovidadesVistas, pacoteDasNovidades, getResumoNovidades } from '../services/api';
import { mensagemDeErro } from '../utils/download';

const SITUACAO = {
  novo: { rotulo: 'Novo', cor: '#3fb95f', fundo: '#112a17' },
  alterado: { rotulo: 'Alterado', cor: '#e0a030', fundo: '#2a2111' },
  removido: { rotulo: 'Removido', cor: '#e05555', fundo: '#2a1414' },
};
const quando = (d) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

// clienteId OU obraId; onAnalisar(pacote) recebe o pacote pronto (mesmo formato do envio da análise)
export function AvisoNovidades({ clienteId = null, obraId = null, onAnalisar = null, sempre = false }) {
  const [dados, setDados] = useState(null);
  const [marcados, setMarcados] = useState([]);
  const [ocupado, setOcupado] = useState('');

  const carregar = useCallback(async (atualizar = true) => {
    setOcupado('varrer');
    try {
      const r = await getNovidadesPastas({ ...(clienteId ? { cliente_id: clienteId } : {}), ...(obraId ? { obra_id: obraId } : {}), ...(atualizar ? { atualizar: '1' } : {}) });
      setDados(r.data);
      setMarcados(r.data.itens.filter(i => i.situacao !== 'removido').map(i => i.id));
    } catch { setDados(null); } finally { setOcupado(''); }
  }, [clienteId, obraId]);
  useEffect(() => { carregar(true); }, [carregar]);

  if (!dados) return null;
  const itens = dados.itens;
  if (!itens.length && dados.disponivel && !sempre) return null;
  const alternar = (id) => setMarcados(m => (m.includes(id) ? m.filter(x => x !== id) : [...m, id]));
  const analisaveis = itens.filter(i => i.analisavel && marcados.includes(i.id));

  async function visto(ids) {
    setOcupado('visto');
    try { await marcarNovidadesVistas(ids); toast.success('Marcado como visto'); await carregar(false); } catch (e) { toast.error(await mensagemDeErro(e, 'Erro ao marcar')); } finally { setOcupado(''); }
  }
  async function analisar() {
    setOcupado('analisar');
    try {
      const r = await pacoteDasNovidades(analisaveis.map(i => i.id));
      onAnalisar?.(r.data);
    } catch (e) { toast.error(await mensagemDeErro(e, 'Erro ao preparar a análise'), { duration: 8000 }); } finally { setOcupado(''); }
  }

  return (
    <div data-testid="aviso-novidades" style={{ border: '1px solid #3a3215', background: '#16140c', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: itens.length ? 10 : 0 }}>
        <Bell size={15} style={{ color: '#e2c35a' }} />
        <b style={{ color: '#e2c35a', fontSize: 13, flex: 1 }}>
          {itens.length ? `${itens.length} novidade(s) na pasta do cliente` : 'Nenhuma novidade na pasta do cliente'}
        </b>
        {!dados.disponivel && <span style={{ color: '#e05555', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><WifiOff size={13} /> servidor das pastas fora do ar — mostrando o último retrato</span>}
        <button type="button" onClick={() => carregar(true)} disabled={!!ocupado} style={btn} title="Procurar arquivos novos agora"><RefreshCw size={12} /> {ocupado === 'varrer' ? 'Procurando…' : 'Procurar agora'}</button>
        {onAnalisar && analisaveis.length > 0 && (
          <button type="button" onClick={analisar} disabled={!!ocupado} style={{ ...btn, borderColor: '#5a4a12', color: '#e2c35a' }} data-testid="analisar-novidades"
            title="Leva os PDF/DWG/DXF/ZIP marcados para o envio da análise, com a disciplina sugerida de cada um">
            <FileSearch size={12} /> {ocupado === 'analisar' ? 'Preparando…' : `Analisar ${analisaveis.length} arquivo(s)`}
          </button>
        )}
        {itens.length > 0 && <button type="button" onClick={() => visto(marcados.length ? marcados : itens.map(i => i.id))} disabled={!!ocupado} style={btn} data-testid="marcar-visto"><CheckCheck size={12} /> Marcar como visto</button>}
      </div>
      {itens.length > 0 && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {itens.map(i => {
            const s = SITUACAO[i.situacao] || SITUACAO.novo;
            return (
              <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: '#ccc', cursor: 'pointer', borderTop: '1px solid #221f12' }}>
                <input type="checkbox" checked={marcados.includes(i.id)} onChange={() => alternar(i.id)} style={{ width: 'auto', flex: 'none', margin: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: s.cor, background: s.fundo, borderRadius: 4, padding: '1px 6px', minWidth: 58, textAlign: 'center' }}>{s.rotulo}</span>
                <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{i.nome}<span style={{ color: '#666' }}> — {i.caminho.split('/').slice(1, -1).join(' › ') || 'pasta do cliente'}</span></span>
                {i.obra_codigo && !obraId && <span style={{ color: '#888' }}>{i.obra_codigo}</span>}
                <span style={{ color: '#666', whiteSpace: 'nowrap' }}>{quando(i.detectado_em)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cabeçalho: total de novidades (consulta leve a cada 2 min) e lista por cliente/obra
export function IndicadorNovidades() {
  const [resumo, setResumo] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const caixa = useRef(null);

  useEffect(() => {
    let vivo = true;
    const ler = () => getResumoNovidades().then(r => vivo && setResumo(r.data)).catch(() => {});
    ler();
    const t = setInterval(ler, 120000);
    return () => { vivo = false; clearInterval(t); };
  }, []);
  useEffect(() => {
    if (!aberto) return undefined;
    getNovidadesPastas({}).then(r => setItens(r.data.itens)).catch(() => setItens([]));
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  if (!resumo || (!resumo.total && resumo.disponivel)) return null;
  // agrupa por obra (ou cliente, quando não é de obra)
  const grupos = itens.reduce((m, i) => {
    const k = i.obra_id ? `o${i.obra_id}` : `c${i.cliente_id || 0}`;
    (m[k] = m[k] || { ...i, total: 0 }).total++;
    return m;
  }, {});
  return (
    <div ref={caixa} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(a => !a)} data-testid="indicador-novidades"
        title={resumo.disponivel ? 'Arquivos novos ou alterados nas pastas dos clientes' : 'Servidor das pastas dos clientes fora do ar'}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent',
          border: `1px solid ${resumo.disponivel ? '#5a4a12' : '#5a2a2a'}`, color: resumo.disponivel ? '#e2c35a' : '#e05555' }}>
        {resumo.disponivel ? <Bell size={13} /> : <WifiOff size={13} />} {resumo.total || ''}
      </button>
      {aberto && (
        <div style={{ position: 'absolute', right: 0, top: 34, width: 360, maxHeight: 380, overflowY: 'auto', background: '#151515', border: '1px solid #2a2a2a', borderRadius: 8, padding: 10, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Novidades nas pastas dos clientes</div>
          {!resumo.disponivel && <div style={{ color: '#e05555', fontSize: 12, marginBottom: 6 }}>O servidor das pastas está fora do ar: o sistema guarda os arquivos aqui e envia quando ele voltar.</div>}
          {Object.values(grupos).map(g => (
            <Link key={`${g.obra_id}-${g.cliente_id}`} to={g.obra_id ? `/obras/${g.obra_id}?secao=arquivos` : `/cadastros?aba=clientes&pasta=${g.cliente_id || ''}`} onClick={() => setAberto(false)}
              style={{ display: 'block', padding: '7px 8px', borderRadius: 6, color: '#ddd', textDecoration: 'none', fontSize: 12, borderTop: '1px solid #1f1f1f' }}>
              <b style={{ color: '#e2c35a' }}>{g.total}</b> · {g.cliente_nome || 'Sem cliente'}{g.obra_codigo ? <span style={{ color: '#888' }}> — {g.obra_codigo} {g.obra_nome}</span> : null}
            </Link>
          ))}
          {!itens.length && resumo.disponivel && <div style={{ color: '#777', fontSize: 12 }}>Nada pendente.</div>}
        </div>
      )}
    </div>
  );
}

const btn = { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#bbb', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' };
