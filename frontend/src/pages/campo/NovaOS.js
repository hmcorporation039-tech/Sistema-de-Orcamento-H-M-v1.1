// OS nova criada no campo (visita) para uma obra. A lista de obras e os
// modelos de checklist vêm do servidor quando há rede e ficam guardados para
// usar sem rede. A OS nasce com UUID do aparelho e vai na fila (criar_os).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Search } from 'lucide-react';
import { useCampo } from './CampoApp';
import { ROTULO_TIPO_OS } from './operacoes';
import { COR, Botao, Cartao } from './componentes';

const ordemAZ = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });

export default function NovaOS() {
  const navigate = useNavigate();
  const { dados, online, sincronizarAgora, estadoSync } = useCampo();
  const [obras, setObras] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [busca, setBusca] = useState('');
  const [obraId, setObraId] = useState(null);
  const [titulo, setTitulo] = useState('Visita técnica');
  const [tipo, setTipo] = useState('visita');
  const [modelo, setModelo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [o, m] = [await dados.lista('obras'), await dados.lista('modelos')];
      if (!vivo) return;
      setObras(o);
      setModelos(m);
      setModelo(atual => atual || (m.find(x => x.chave === 'generico') || m[0])?.chave || '');
    })();
    return () => { vivo = false; };
  }, [dados, estadoSync?.ultimaSincronizacao]);

  const obrasFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return obras
      .filter(o => !['concluida', 'cancelada'].includes(o.status))
      .filter(o => !t || [o.nome, o.codigo, o.cliente_nome, o.local].some(x => String(x || '').toLowerCase().includes(t)))
      .sort((a, b) => ordemAZ(a.nome, b.nome));
  }, [obras, busca]);
  const modelosAZ = useMemo(() => [...modelos].sort((a, b) => ordemAZ(a.rotulo, b.rotulo)), [modelos]);
  const tiposAZ = useMemo(() => Object.entries(ROTULO_TIPO_OS).sort((a, b) => ordemAZ(a[1], b[1])), []);
  const obraSel = obras.find(o => o.id === obraId);

  async function criar() {
    if (!obraSel || !titulo.trim()) return;
    setSalvando(true);
    const m = modelos.find(x => x.chave === modelo);
    const u = await dados.criarOS({
      obra_id: obraSel.id, titulo: titulo.trim(), tipo,
      disciplina: m?.disciplina ?? null, modelo_checklist: modelo || 'generico',
    });
    navigate(`/campo/os/${u}`, { replace: true });
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <Botao variante="contorno" onClick={() => navigate('/campo/')} style={{ marginBottom: 12 }}><ArrowLeft size={20} />Minhas OS</Botao>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Nova OS (visita)</h1>

      <Cartao>
        <label htmlFor="busca-obra" style={{ marginTop: 0 }}>Obra</label>
        {obras.length === 0 ? (
          <div style={{ color: COR.texto2 }}>
            {online ? 'Baixando a lista de obras…' : 'Sem lista de obras neste aparelho. Abra o app com rede uma vez para baixá-la.'}
            {online && <div style={{ marginTop: 8 }}><Botao variante="contorno" onClick={sincronizarAgora}>Baixar agora</Botao></div>}
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 15, color: COR.texto3 }} />
              <input id="busca-obra" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, código ou cliente"
                style={{ paddingLeft: 38 }} />
            </div>
            <div role="listbox" aria-label="Obras" style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
              {obrasFiltradas.map(o => (
                <button key={o.id} type="button" role="option" aria-selected={o.id === obraId} onClick={() => setObraId(o.id)}
                  data-testid="opcao-obra"
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 10px', marginBottom: 6, borderRadius: 8, minHeight: 56,
                    background: o.id === obraId ? COR.ouro : COR.superficie2, color: o.id === obraId ? '#000' : COR.texto,
                    border: `2px solid ${o.id === obraId ? COR.ouro : COR.borda}`, fontSize: 16,
                  }}>
                  <div style={{ fontWeight: 800 }}>{o.nome}</div>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>{[o.codigo, o.cliente_nome].filter(Boolean).join(' · ')}</div>
                </button>
              ))}
              {obrasFiltradas.length === 0 && <div style={{ color: COR.texto2 }}>Nenhuma obra encontrada.</div>}
            </div>
          </>
        )}
      </Cartao>

      <Cartao>
        <label htmlFor="nova-titulo" style={{ marginTop: 0 }}>Título</label>
        <input id="nova-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} />
        <label htmlFor="nova-tipo">Tipo</label>
        <select id="nova-tipo" value={tipo} onChange={e => setTipo(e.target.value)}>
          {tiposAZ.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <label htmlFor="nova-modelo">Checklist</label>
        <select id="nova-modelo" value={modelo} onChange={e => setModelo(e.target.value)}>
          {modelosAZ.length === 0 && <option value="">Sem checklist (só itens extras)</option>}
          {modelosAZ.map(m => <option key={m.chave} value={m.chave}>{m.rotulo}</option>)}
        </select>
      </Cartao>

      <Botao grande onClick={criar} disabled={!obraSel || !titulo.trim() || salvando} style={{ width: '100%' }} data-testid="criar-os">
        <Check size={22} />Criar OS{obraSel ? ` em ${obraSel.nome}` : ''}
      </Botao>
    </div>
  );
}
