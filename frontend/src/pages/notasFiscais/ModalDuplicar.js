import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Users } from 'lucide-react';
import { duplicarNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { useClientes } from '../../components/ClienteSelect';
import { estilos } from '../../components/ui/estilos';
import { formatarCpfCnpj } from '../../utils/format';
import { opcao, sub } from './comum';

// ── Duplicar ──────────────────────────────────────────────────────────────────

export function ModalDuplicar({ nota, onFechar, onFeito }) {
  const clientes = useClientes();
  const [varios, setVarios] = useState(false);
  const [marcados, setMarcados] = useState(() => new Set(nota.cliente_id ? [nota.cliente_id] : []));
  const [filtro, setFiltro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const visiveis = clientes.filter(c => !filtro || c.nome.toLowerCase().includes(filtro.toLowerCase()) || String(c.documento || '').includes(filtro));

  async function confirmar() {
    if (varios && !marcados.size) { toast.error('Marque pelo menos um cliente'); return; }
    setEnviando(true);
    try {
      const r = await duplicarNotaFiscal(nota.id, varios ? [...marcados] : null);
      toast.success(r.data.mensagem);
      onFeito(r.data.ids);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao duplicar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo={`Duplicar ${nota.numero ? `a nota nº ${nota.numero}` : 'o rascunho'}`} onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>A cópia vira <b>rascunho</b> com o mesmo serviço, descrição, valores e retenções, e a competência de hoje. Depois é só ajustar o que mudou e emitir.</p>
      <label style={opcao}><input type="radio" checked={!varios} onChange={() => setVarios(false)} style={{ width: 'auto' }} />
        Para o mesmo cliente{nota.tomador_nome || nota.tomador?.nome ? ` (${nota.tomador_nome || nota.tomador?.nome})` : ''} — abre a cópia para editar
      </label>
      <label style={opcao}><input type="radio" checked={varios} onChange={() => setVarios(true)} style={{ width: 'auto' }} data-testid="duplicar-varios" />
        <Users size={14} /> Para outros clientes (uma cópia para cada)
      </label>
      {varios && (
        <div style={{ marginTop: 8 }}>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar clientes" />
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8, border: '1px solid var(--borda)', borderRadius: 8 }}>
            {visiveis.map(c => (
              <label key={c.id} style={{ ...opcao, padding: '6px 10px', margin: 0, borderTop: '1px solid var(--borda)' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={marcados.has(c.id)}
                  onChange={(e) => { const s = new Set(marcados); if (e.target.checked) s.add(c.id); else s.delete(c.id); setMarcados(s); }} />
                <span style={{ flex: 1 }}>{c.nome}</span>
                <span style={sub}>{c.documento ? formatarCpfCnpj(c.documento) : ''}</span>
              </label>
            ))}
          </div>
          <p style={{ ...estilos.ajuda, margin: '6px 0 0' }}>{marcados.size} cliente(s) marcado(s).</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
        <button type="button" onClick={confirmar} disabled={enviando} style={estilos.btnPrimario} data-testid="confirmar-duplicar">
          <Copy size={13} /> {enviando ? 'Duplicando…' : 'Duplicar'}
        </button>
      </div>
    </Modal>
  );
}
