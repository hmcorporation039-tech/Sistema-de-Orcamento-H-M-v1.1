import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, RefreshCw, CheckCircle2, Pencil } from 'lucide-react';
import { pesquisarMedidasComponentes, getPesquisaMedidas, aprovarComponenteQuadro } from '../../services/api';
import EditorComponente from '../componentesQuadro/EditorComponente';
import { estilos } from '../ui/estilos';
import { rotuloTipo, textoMedidas, linkSeguro } from '../../utils/componentesQuadro';

// Projeto de quadros (2.4), depois do cálculo: componentes que ficaram com
// medida TÍPICA porque o catálogo não tem a medida oficial do fabricante
// escolhido (resumo.componentes_sem_medida, vindo da skill). "Buscar medidas
// oficiais" manda a IA procurar o datasheet de cada um no site do fabricante
// (em segundo plano, até 15 por vez); os achados aparecem com o link para
// conferir e aprovar (administrador) e "Recalcular" refaz o arranjo com eles.

const SITUACAO = {
  pendente: { texto: 'na fila', cor: 'var(--texto-3)' },
  pesquisando: { texto: 'buscando…', cor: '#8ab4f8' },
  encontrado: { texto: 'achado — a conferir', cor: '#3fb95f' },
  ja_no_catalogo: { texto: 'já no catálogo', cor: '#3fb95f' },
  nao_encontrado: { texto: 'não encontrado', cor: '#e0a030' },
  erro: { texto: 'erro', cor: '#e05050' },
  ignorado: { texto: 'sem fabricante', cor: 'var(--texto-3)' },
};
// o servidor devolve o fabricante no nome canônico e não repete especificação igual
const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const chaveSemTag = (i) => `${i.tipo}|${norm(i.fabricante)}|${norm(i.especificacao)}`;
const chaveItem = (i) => `${norm(i.tag)}|${chaveSemTag(i)}`;

export default function MedidasComponentesQuadro({ itens, ehAdmin, ocupado, onRecalcular }) {
  const [tarefa, setTarefa] = useState(null);
  const [editando, setEditando] = useState(null);
  const [aprovados, setAprovados] = useState({}); // id → true
  const espera = useRef(null);
  const lista = Array.isArray(itens) ? itens : [];

  // acompanha a busca em segundo plano até terminar
  useEffect(() => {
    if (!tarefa || !['na_fila', 'rodando'].includes(tarefa.situacao)) return undefined;
    espera.current = setTimeout(async () => {
      try {
        const r = await getPesquisaMedidas(tarefa.id);
        setTarefa(r.data);
        if (r.data.situacao === 'concluida') {
          const achados = r.data.itens.filter(i => i.situacao === 'encontrado').length;
          toast.success(achados ? `${achados} medida(s) oficial(is) encontrada(s) — confira e clique em "Recalcular"` : 'Busca concluída — nenhuma medida oficial nova', { duration: 8000 });
        }
      } catch (err) {
        setTarefa(t => ({ ...t, situacao: 'concluida', erro: err.response?.data?.erro || 'A busca foi interrompida' }));
      }
    }, 2500);
    return () => clearTimeout(espera.current);
  }, [tarefa]);

  if (!lista.length && !tarefa) return null;

  async function buscar() {
    try {
      const r = await pesquisarMedidasComponentes(lista);
      setTarefa(r.data);
      if (r.data.ignorados) toast(`Serão buscados ${r.data.itens.filter(i => i.situacao === 'pendente').length} agora; ${r.data.ignorados} ficam para a próxima busca (limite por vez).`, { duration: 9000 });
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao iniciar a busca das medidas', { duration: 9000 });
    }
  }

  async function aprovar(reg) {
    try {
      await aprovarComponenteQuadro(reg.id);
      setAprovados(a => ({ ...a, [reg.id]: true }));
      toast.success(`${reg.fabricante} ${reg.referencia}: verificado`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao aprovar', { duration: 9000 });
    }
  }

  const rodando = tarefa && ['na_fila', 'rodando'].includes(tarefa.situacao);
  const porChave = Object.fromEntries((tarefa?.itens || []).map(i => [chaveItem(i), i]));
  const porSpec = Object.fromEntries((tarefa?.itens || []).map(i => [chaveSemTag(i), i]));
  const linhas = lista.length ? lista.map(i => ({ ...i, busca: porChave[chaveItem(i)] || porSpec[chaveSemTag(i)] })) : (tarefa?.itens || []).map(i => ({ ...i, busca: i }));
  const achados = (tarefa?.itens || []).filter(i => i.registro && i.situacao === 'encontrado');

  return (
    <div style={{ border: '1px solid #5a4a12', borderRadius: 10, padding: 14, marginBottom: 14, background: '#1a1608' }} data-testid="componentes-sem-medida">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 240, fontSize: 13.5, fontWeight: 700, color: '#e0b050' }}>
          {lista.length ? `${lista.length} componente(s) com medida típica (sem a medida oficial do fabricante)` : 'Busca de medidas oficiais'}
        </div>
        {lista.length > 0 && (
          <button style={estilos.btnSecundario} disabled={!!rodando || !!ocupado} onClick={buscar}
            title="A IA procura o datasheet de cada componente no site do fabricante (até 15 por vez)">
            <Search size={14} /> {rodando ? `Buscando… ${tarefa.feitos} de ${tarefa.total}` : 'Buscar medidas oficiais'}
          </button>
        )}
        <button style={estilos.btnPrimario} disabled={!!rodando || !!ocupado} onClick={onRecalcular} title="Refaz o cálculo e o arranjo com as medidas do catálogo">
          <RefreshCw size={14} /> Recalcular
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.6, margin: '0 0 10px' }}>
        Estes componentes foram posicionados com medida típica, marcada [CONFERIR] no memorial. A busca procura o datasheet no site de cada
        fabricante (cerca de 1 minuto por componente); o que for achado entra no{' '}
        <Link to="/base-precos?aba=componentes-quadro" style={{ color: '#8ab4f8' }}>catálogo de componentes de quadros</Link> como “A conferir”.
        {ehAdmin ? ' Abra o datasheet, confira as medidas e aprove.' : ' Um administrador confere e aprova.'} Depois clique em “Recalcular”.
      </p>
      {tarefa?.erro && <p style={{ fontSize: 12, color: '#e05050', margin: '0 0 8px' }}>{tarefa.erro}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--texto-3)', fontSize: 11.5, textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={th}>Tag</th><th style={th}>Tipo</th><th style={th}>Fabricante</th><th style={th}>Especificação</th>
              {tarefa && <th style={th}>Busca</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const s = l.busca ? SITUACAO[l.busca.situacao] || { texto: l.busca.situacao, cor: 'var(--texto-3)' } : null;
              return (
                <tr key={i} style={{ borderTop: '1px solid #2a2410' }}>
                  <td style={td}>{l.tag || '—'}</td>
                  <td style={td}>{rotuloTipo(l.tipo)}</td>
                  <td style={td}>{l.fabricante || <span style={{ color: '#e0a030' }}>não informado</span>}</td>
                  <td style={td}>{l.especificacao || '—'}</td>
                  {tarefa && (
                    <td style={td}>
                      {s ? <span style={{ color: s.cor }} title={l.busca.motivo || ''}>{s.texto}</span> : <span style={{ color: 'var(--texto-3)' }}>—</span>}
                      {l.busca?.motivo && l.busca.situacao !== 'encontrado' && <div style={{ fontSize: 11, color: 'var(--texto-3)', maxWidth: 320 }}>{l.busca.motivo}</div>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {achados.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3fb95f', marginBottom: 6 }}>Medidas achadas no site do fabricante — confira no datasheet</div>
          {achados.map((a, i) => {
            const reg = a.registro;
            const link = linkSeguro(reg.fonte_url);
            const ok = aprovados[reg.id] || reg.verificado;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '7px 0', borderTop: '1px solid #2a2410', fontSize: 12.5 }}>
                <div style={{ flex: 1, minWidth: 260, color: 'var(--texto-2)' }}>
                  <b style={{ color: 'var(--texto)' }}>{reg.fabricante} {reg.referencia}</b>{reg.descricao ? ` — ${reg.descricao}` : ''}
                  <div style={{ fontSize: 12 }}>{textoMedidas(reg)} mm{reg.modulos_din ? ` · ${String(reg.modulos_din).replace('.', ',')} módulo(s) DIN` : ''}{a.tag ? ` · para ${a.tag}` : ''}</div>
                </div>
                {link && <a href={link} target="_blank" rel="noopener noreferrer" style={estilos.link}>Abrir datasheet</a>}
                {ok ? <span style={{ color: '#3fb95f', fontWeight: 700 }}>Verificado</span> : <span style={{ color: '#e0b050' }}>A conferir</span>}
                {ehAdmin && !ok && (
                  <>
                    <button style={{ ...estilos.btnSecundario, padding: '5px 10px' }} onClick={() => aprovar(reg)} title="Conferi no datasheet: marcar como verificado"><CheckCircle2 size={13} /> Aprovar</button>
                    <button style={{ ...estilos.btnSecundario, padding: '5px 10px' }} onClick={() => setEditando(reg)} title="Corrigir os dados antes de aprovar"><Pencil size={13} /> Editar</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editando && (
        <EditorComponente componente={editando} onFechar={() => setEditando(null)}
          onSalvo={(r) => {
            setEditando(null);
            setTarefa(t => (t ? { ...t, itens: t.itens.map(i => (i.registro?.id === r.id ? { ...i, registro: r } : i)) } : t));
          }} />
      )}
    </div>
  );
}

const th = { padding: '4px 8px 6px 0' };
const td = { padding: '5px 8px 5px 0', color: 'var(--texto-2)', verticalAlign: 'top' };
