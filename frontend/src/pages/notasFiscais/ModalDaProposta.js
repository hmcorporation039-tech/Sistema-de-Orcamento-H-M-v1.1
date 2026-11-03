import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { criarNotaFiscalDeProposta, getPropostas } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos } from '../../components/ui/estilos';
import { formatarMoeda } from '../../utils/format';
import { sub } from './comum';

// Rascunho de nota a partir de uma proposta (cliente, valor e local vêm dela; o serviço fiscal é o da última nota do cliente)
export function ModalDaProposta({ onFechar, onFeito }) {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState([]);
  const [criando, setCriando] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // { id, aviso }

  useEffect(() => {
    const t = setTimeout(() => {
      getPropostas({ busca, status: 'Aprovada', porPagina: 30 })
        .then(r => setLista(r.data.itens || r.data.dados || (Array.isArray(r.data) ? r.data : [])))
        .catch(() => setLista([]));
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  async function criar(p, comConfirmacao = false) {
    setCriando(p.id);
    try {
      const r = await criarNotaFiscalDeProposta(p.id, comConfirmacao);
      toast.success(r.data.mensagem);
      onFeito(r.data.id);
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.ja_tem_nota) setConfirmar({ p, aviso: err.response.data.erro });
      else toast.error(err.response?.data?.erro || 'Erro ao criar o rascunho');
    } finally { setCriando(null); }
  }

  return (
    <Modal titulo="Nota fiscal a partir de uma proposta" onFechar={onFechar} largura={640}>
      <p style={estilos.ajuda}>Escolha uma proposta aprovada. O sistema cria um <b>rascunho</b> com o cliente, o valor total e o local; o serviço fiscal e a alíquota vêm da última nota do cliente. Nada é emitido: você confere e emite como sempre.</p>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número, cliente ou local…" data-testid="proposta-busca" />
      <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8, border: '1px solid var(--borda)', borderRadius: 8 }}>
        {lista.length === 0 && <div style={{ padding: 12, color: 'var(--texto-3)' }}>Nenhuma proposta aprovada encontrada.</div>}
        {lista.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderTop: '1px solid var(--borda)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div><b>{p.numero}</b> · {p.cliente_nome_cadastro || p.cliente_nome}</div>
              <div style={sub}>{formatarMoeda(p.total)}{p.local_obra ? ` · ${p.local_obra}` : ''}</div>
            </div>
            <button type="button" style={estilos.btnSecundario} disabled={criando === p.id} onClick={() => criar(p)} data-testid={`criar-de-${p.id}`}>
              {criando === p.id ? 'Criando…' : 'Criar rascunho'}
            </button>
          </div>
        ))}
      </div>
      {confirmar && (
        <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--aviso)', borderRadius: 8 }}>
          <p style={{ margin: '0 0 8px' }}>{confirmar.aviso}</p>
          <button type="button" style={estilos.btnPrimario} onClick={() => criar(confirmar.p, true)}>Criar mesmo assim</button>
        </div>
      )}
    </Modal>
  );
}
