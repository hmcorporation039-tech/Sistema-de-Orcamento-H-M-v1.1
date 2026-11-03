import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getRecebimentosNotaFiscal, ligarRecebimentoNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { estilos } from '../../components/ui/estilos';
import { formatarMoeda, formatarData } from '../../utils/format';
import { avisarObra, sub } from './comum';

// Liga um Pix recebido (Financeiro) à nota que ele quitou. Só sugere o que bate no valor; quem confirma é o administrador.
export function ModalRecebimento({ nota, onFechar, onMudou }) {
  const [dados, setDados] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const carregar = useCallback(() => getRecebimentosNotaFiscal(nota.id).then(r => setDados(r.data)).catch(() => toast.error('Erro ao buscar os recebimentos')), [nota.id]);
  useEffect(() => { carregar(); }, [carregar]);

  // ligado, o Pix sem obra leva a obra da proposta da nota; o que já tinha obra (ou a mantém ao desligar) vem com aviso
  async function mudar(m, ligar) {
    setOcupado(m.id);
    try {
      const { data: r } = await ligarRecebimentoNotaFiscal(nota.id, m.id, ligar);
      await carregar(); onMudou?.();
      toast.success(!ligar ? 'Pix desligado da nota' : r.obra_preenchida ? 'Pix ligado à nota e à obra da proposta' : 'Pix ligado à nota');
      avisarObra([r.aviso]);
    }
    catch (err) { toast.error(err.response?.data?.erro || 'Erro ao ligar o recebimento'); }
    finally { setOcupado(null); }
  }
  const linhaMov = (m, ligado) => (
    <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 10px', borderTop: '1px solid var(--borda)' }}>
      <div style={{ flex: 1, minWidth: 0 }}><div>{m.nome || 'Pix'}</div><div style={sub}>{formatarData(m.data_hora)}</div></div>
      <b>{formatarMoeda(m.valor)}</b>
      <button type="button" style={estilos.btnSecundario} disabled={ocupado === m.id} onClick={() => mudar(m, !ligado)} data-testid={`${ligado ? 'desligar' : 'ligar'}-mov-${m.id}`}>
        {ligado ? 'Desligar' : 'Ligar'}
      </button>
    </div>
  );

  return (
    <Modal titulo={`Recebimento da NFS-e nº ${nota.numero}`} onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>Pix recebidos com o mesmo valor da nota ({dados ? `${formatarMoeda(dados.valor_liquido)} líquido ou ${formatarMoeda(dados.valor_servicos)} bruto` : '…'}), a partir da emissão. Ligar não altera nada fiscal.</p>
      {dados?.ligados.length > 0 && <><strong style={{ fontSize: 12 }}>Já ligados</strong><div style={{ border: '1px solid var(--borda)', borderRadius: 8, marginBottom: 10 }}>{dados.ligados.map(m => linhaMov(m, true))}</div></>}
      <strong style={{ fontSize: 12 }}>Possíveis</strong>
      <div style={{ border: '1px solid var(--borda)', borderRadius: 8 }}>
        {dados && dados.candidatos.length === 0 && <div style={{ padding: 12, color: 'var(--texto-3)' }}>Nenhum Pix livre com esse valor.</div>}
        {dados?.candidatos.map(m => linhaMov(m, false))}
      </div>
    </Modal>
  );
}
