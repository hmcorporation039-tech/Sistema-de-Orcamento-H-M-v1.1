import { FileDown, Copy, Send, Pencil } from 'lucide-react';
import { formatarMoeda, formatarData, formatarNcm } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import Info from '../../components/ui/Info';
import { ACAO_LABEL, STATUS_DA_PROPOSTA, btnPrimario, btnSecundario } from './apoio';

// Detalhe da proposta (janela): dados gerais, itens por seção, totais, troca de status,
// editar/duplicar/enviar/baixar PDF e o histórico de alterações.
// `detalhe` = {} enquanto carrega (aparece só o "Carregando...", sem cabeçalho).
export default function DetalheProposta({
  detalhe, carregando, onFechar, onMudarStatus, onEditar, onDuplicar, duplicando, onEnviarEmail, onBaixarPdf, gerandoPdf,
}) {
  return (
    // enquanto carrega, só o "Carregando..." (sem cabeçalho), como sempre foi
    <Modal titulo={carregando || !detalhe.id ? null : `Proposta ${detalhe.numero}`} rotulo="Detalhe da proposta"
      onFechar={onFechar} largura={680} espacoTitulo={18} tamanhoTitulo={17} style={{ maxHeight: '88vh' }}>
        {carregando || !detalhe.id ? (
          <p style={{ color: 'var(--texto-3)', textAlign: 'center', padding: 30 }}>Carregando...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: 12 }}>
              <Info rotulo="Cliente" valor={detalhe.cliente_nome} />
              <Info rotulo="Data" valor={formatarData(detalhe.data)} />
              <Info rotulo="Local da obra" valor={detalhe.local_obra || '—'} />
              <Info rotulo="Validade" valor={`${detalhe.validade} dias`} />
              <Info rotulo="Tipo" valor={detalhe.tipo || '—'} />
              <Info rotulo="Porte" valor={detalhe.porte || '—'} />
            </div>

            {detalhe.secoes?.map(sec => (
              <div key={sec.id} style={{ marginBottom: 14 }}>
                <h4 style={{ fontSize: 12, color: '#c9a227', fontWeight: 700, marginBottom: 8 }}>{sec.nome}</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {detalhe.itens?.filter(it => it.secao_id === sec.id).map(it => (
                      <tr key={it.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                        <td style={{ padding: '6px 4px', color: '#ccc' }}>{it.descricao}</td>
                        <td style={{ padding: '6px 4px', color: 'var(--texto-3)', width: 80 }}>{formatarNcm(it.ncm) || '—'}</td>
                        <td style={{ padding: '6px 4px', color: 'var(--texto-3)', textAlign: 'right', width: 70 }}>{Number(it.quantidade)} {it.unidade}</td>
                        <td style={{ padding: '6px 4px', color: 'var(--texto-3)', textAlign: 'right', width: 90 }}>{formatarMoeda(it.valor_unitario)}</td>
                        <td style={{ padding: '6px 4px', color: '#ccc', textAlign: 'right', width: 100, fontWeight: 700 }}>{formatarMoeda(it.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 14, marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 26, fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--texto-3)' }}>Materiais: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_materiais)}</b></span>
              {Number(detalhe.imposto_venda) > 0 && (
                <span style={{ color: 'var(--texto-3)' }}>Imp. Vendas ({detalhe.imposto_venda}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_imposto_venda)}</b></span>
              )}
              <span style={{ color: 'var(--texto-3)' }}>Mão de obra: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_mao_obra)}</b></span>
              {Number(detalhe.imposto_servico) > 0 && (
                <span style={{ color: 'var(--texto-3)' }}>Imp. Serviços ({detalhe.imposto_servico}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_imposto_servico)}</b></span>
              )}
              <span style={{ color: 'var(--texto-3)' }}>BDI ({detalhe.bdi}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_bdi)}</b></span>
              <span style={{ color: '#c9a227', fontSize: 14 }}>Total: <b>{formatarMoeda(detalhe.total)}</b></span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--texto-3)', marginRight: 4 }}>Status:</span>
              {STATUS_DA_PROPOSTA.map(s => (
                <button
                  key={s}
                  onClick={() => onMudarStatus(detalhe.id, s)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: detalhe.status === s ? '1px solid #c9a227' : '1px solid #2a2a2a',
                    background: detalhe.status === s ? '#c9a227' : 'transparent',
                    color: detalhe.status === s ? '#000' : '#999',
                  }}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => onEditar(detalhe.id)}
                style={{ ...btnSecundario, marginLeft: 'auto' }}
              >
                <Pencil size={13} /> Editar
              </button>
              <button
                onClick={() => onDuplicar(detalhe.id)}
                disabled={duplicando}
                style={btnSecundario}
              >
                <Copy size={13} /> {duplicando ? 'Duplicando...' : 'Duplicar'}
              </button>
              <button onClick={onEnviarEmail} style={btnSecundario}>
                <Send size={13} /> Enviar por E-mail
              </button>
              <button
                onClick={() => onBaixarPdf(detalhe.id, detalhe.numero, detalhe.cliente_nome)}
                disabled={gerandoPdf}
                style={btnPrimario}
              >
                <FileDown size={13} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
              </button>
            </div>

            {detalhe.eventos?.length > 0 && (
              <div style={{ marginTop: 22, borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
                <h4 style={{ fontSize: 12, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                  Histórico de alterações
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detalhe.eventos.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--texto-3)', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--texto-3)', whiteSpace: 'nowrap' }}>
                        {new Date(ev.criado_em).toLocaleString('pt-BR')}
                      </span>
                      <span style={{ color: '#c9a227', fontWeight: 700 }}>{ACAO_LABEL[ev.acao] || ev.acao}</span>
                      <span>{ev.detalhes}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--texto-3)' }}>{ev.usuario_nome || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </Modal>
  );
}
