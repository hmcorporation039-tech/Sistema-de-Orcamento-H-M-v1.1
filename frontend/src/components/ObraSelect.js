import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import Select, { comparador } from './Select';
import { getObras, criarObra, buscarTodasPaginas, getTodosClientes } from '../services/api';

// Seleção de OBRA (versão 2.0, Fase 2D) — usada em Contratos, Financeiro e,
// pela Fase 2E, na Análise de Projeto, nos Laudos e no editor de Propostas.
//
// Interface:
//   <ObraSelect
//     value={obraId}                 // número, string numérica, '' ou null (= sem obra)
//     onChange={(id, obra) => ...}   // id: número ou null; obra: { id, codigo, nome,
//                                    //   cliente_id, cliente_nome, status, segmento } ou null
//     clienteId={...} clienteNome="..."  // opcionais: preenchem o cliente da "Nova obra…"
//     permitirNova={true}            // mostra a opção "Nova obra…" (cria na hora com nome + cliente)
//     rotuloVazio="Sem obra"         // texto da opção vazia (ex.: "Todas" num filtro)
//     disabled={false}
//     style={{...}}                  // estilo do <select>
//   />
// A lista vem de GET /obras?campos=basico&porPagina=1000, em ordem A–Z pelo
// nome (components/Select.js — regra do usuário para toda lista suspensa). A
// busca filtra as opções pelo código, nome, cliente ou local. "Nova obra…"
// chama POST /obras { nome, cliente_id, cliente_nome } e já seleciona a nova.
//
// Parâmetros que acompanham (para quem abre telas a partir da obra):
//   ?obra=ID na URL das abas analise/laudos (/obras?aba=analise&obra=ID) e do
//   editor (/propostas?aba=editar&obra=ID) → a tela pré-seleciona a obra e
//   envia obra_id ao criar (POST /projetos/analisar campo multipart obra_id;
//   POST /laudos e /laudos/de-analise { obra_id }; POST/PUT /propostas { obra_id }).

const NOVA = '__nova__';
let cache = null; // { quando, itens } — várias telas abrem o seletor ao mesmo tempo
const VALIDADE_CACHE = 30 * 1000;

export function invalidarCacheObras() { cache = null; }

async function carregarObras(forcar = false) {
  if (!forcar && cache && Date.now() - cache.quando < VALIDADE_CACHE) return cache.itens;
  // todas as páginas (o servidor devolve até 1000 por vez; acima disso a lista vinha cortada — `incompleto`)
  const res = await buscarTodasPaginas(getObras, { campos: 'basico' });
  const itens = res.data.itens || [];
  cache = { quando: Date.now(), itens };
  return itens;
}

const rotuloObra = (o) => `${o.nome}${o.cliente_nome ? ` · ${o.cliente_nome}` : ''} (${o.codigo})`;
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ObraSelect({
  value, onChange, clienteId = null, clienteNome = '', permitirNova = true,
  rotuloVazio = 'Sem obra', disabled = false, style,
}) {
  const [obras, setObras] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({ nome: '', cliente_id: '', cliente_nome: '' });
  const [clientes, setClientes] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback((forcar) => carregarObras(forcar).then(setObras).catch(() => setObras([])), []);
  useEffect(() => { recarregar(false); }, [recarregar]);

  const atual = value == null || value === '' ? '' : String(value);
  const visiveis = useMemo(() => {
    const f = semAcento(filtro.trim());
    const lista = f ? obras.filter(o => semAcento(`${o.codigo} ${o.nome} ${o.cliente_nome || ''} ${o.local || ''}`).includes(f)) : obras;
    // a obra selecionada continua na lista mesmo fora do filtro
    const sel = atual && !lista.some(o => String(o.id) === atual) ? obras.find(o => String(o.id) === atual) : null;
    return sel ? [sel, ...lista] : lista;
  }, [obras, filtro, atual]);

  function escolher(e) {
    const v = e.target.value;
    if (v === NOVA) { abrirNova(); return; }
    const obra = obras.find(o => String(o.id) === v) || null;
    onChange?.(obra ? obra.id : null, obra);
  }

  function abrirNova() {
    setNovo({ nome: filtro.trim(), cliente_id: clienteId ? String(clienteId) : '', cliente_nome: clienteNome || '' });
    setCriando(true);
    if (!clientes) getTodosClientes().then(r => setClientes(r.data.itens || [])).catch(() => setClientes([]));
  }

  async function salvarNova() {
    const nome = novo.nome.trim();
    if (!nome) { toast.error('Informe o nome da obra'); return; }
    setSalvando(true);
    try {
      const cli = (clientes || []).find(c => String(c.id) === String(novo.cliente_id));
      const { data } = await criarObra({
        nome,
        cliente_id: novo.cliente_id ? Number(novo.cliente_id) : null,
        cliente_nome: cli?.nome || novo.cliente_nome.trim() || null,
      });
      invalidarCacheObras();
      await recarregar(true);
      setCriando(false);
      setFiltro('');
      toast.success(`Obra ${data.codigo} criada`);
      onChange?.(data.id, data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao criar a obra');
    } finally {
      setSalvando(false);
    }
  }

  const clientesOrdenados = useMemo(() => [...(clientes || [])].filter(c => c.ativo !== false)
    .sort((a, b) => comparador.compare(a.nome, b.nome)), [clientes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar obra..."
          disabled={disabled}
          style={{ flex: '0 0 38%', minWidth: 0 }}
          aria-label="Buscar obra"
        />
        <Select value={atual} onChange={escolher} disabled={disabled} style={{ flex: 1, minWidth: 0, ...style }} aria-label="Obra">
          <option value="">{rotuloVazio}</option>
          {visiveis.map(o => <option key={o.id} value={String(o.id)}>{rotuloObra(o)}</option>)}
          {permitirNova && (
            <optgroup label="──────────">
              <option value={NOVA}>+ Nova obra…</option>
            </optgroup>
          )}
        </Select>
      </div>
      {criando && (
        <div style={caixaNova}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <strong style={{ flex: 1, fontSize: 12, color: '#c9a227' }}>Nova obra</strong>
            <button type="button" onClick={() => setCriando(false)} style={btnFechar} title="Cancelar"><X size={14} /></button>
          </div>
          <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome da obra *" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarNova(); } }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <Select value={novo.cliente_id} onChange={e => setNovo({ ...novo, cliente_id: e.target.value })} style={{ flex: 1, minWidth: 0 }} aria-label="Cliente da obra">
              <option value="">{clientes ? 'Cliente (opcional)' : 'Carregando clientes...'}</option>
              {clientesOrdenados.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
            </Select>
            {!novo.cliente_id && (
              <input value={novo.cliente_nome} onChange={e => setNovo({ ...novo, cliente_nome: e.target.value })} placeholder="ou nome do cliente" style={{ flex: 1, minWidth: 0 }} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={salvarNova} disabled={salvando} style={btnCriar}>
              <Plus size={13} /> {salvando ? 'Criando...' : 'Criar obra'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const caixaNova = { border: '1px solid #2a2a2a', borderRadius: 8, padding: 10, background: '#151515' };
const btnFechar = { background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' };
const btnCriar = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#c9a227', border: 'none',
  borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};
