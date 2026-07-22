import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Trash2, X, FileDown, Copy, Send } from 'lucide-react';
import { getPropostas, getProposta, atualizarStatus, removerProposta, duplicarProposta, enviarPropostaPorEmail } from '../services/api';
import api from '../services/api';
import { formatarMoeda, formatarData, formatarNcm } from '../utils/format';
import Paginacao from '../components/Paginacao';

const STATUS_CORES = {
  Ativa: { bg: '#1a1a0a', cor: '#c9a227', borda: '#4a3d10' },
  Aprovada: { bg: '#0a1a0f', cor: '#3fb95f', borda: '#1a4a26' },
  Recusada: { bg: '#1a0a0a', cor: '#b04040', borda: '#4a1a1a' },
  Cancelada: { bg: '#141414', cor: '#666', borda: '#2a2a2a' },
};

export default function Historico() {
  const [propostas, setPropostas] = useState([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [modalEmail, setModalEmail] = useState(false);
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getPropostas({
        ...(busca ? { busca } : {}),
        ...(statusFiltro ? { status: statusFiltro } : {}),
        pagina,
      });
      setPropostas(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
    } catch {
      toast.error('Erro ao carregar propostas');
    } finally {
      setCarregando(false);
    }
  }, [busca, statusFiltro, pagina]);

  useEffect(() => { setPagina(1); }, [busca, statusFiltro]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  async function abrirDetalhe(id) {
    setCarregandoDetalhe(true);
    setDetalhe({});
    try {
      const res = await getProposta(id);
      setDetalhe(res.data);
    } catch {
      toast.error('Erro ao carregar proposta');
      setDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function mudarStatus(id, status) {
    try {
      await atualizarStatus(id, status);
      toast.success(`Status atualizado para ${status}`);
      carregar();
      if (detalhe?.id === id) setDetalhe(d => ({ ...d, status }));
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir a proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
    try {
      await removerProposta(p.id);
      toast.success('Proposta excluída');
      carregar();
      if (detalhe?.id === p.id) setDetalhe(null);
    } catch {
      toast.error('Erro ao excluir proposta');
    }
  }

  async function duplicar(id) {
    setDuplicando(true);
    try {
      const res = await duplicarProposta(id);
      toast.success(res.data.mensagem);
      setDetalhe(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao duplicar proposta');
    } finally {
      setDuplicando(false);
    }
  }

  function abrirModalEmail() {
    setDestinatarioEmail('');
    setMensagemEmail('');
    setModalEmail(true);
  }

  async function enviarEmail(e) {
    e.preventDefault();
    if (!destinatarioEmail.trim()) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    setEnviandoEmail(true);
    try {
      const res = await enviarPropostaPorEmail(detalhe.id, destinatarioEmail.trim(), mensagemEmail.trim());
      toast.success(res.data.mensagem);
      setModalEmail(false);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar proposta por e-mail');
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function baixarPdf(id, numero) {
    setGerandoPdf(true);
    try {
      const res = await api.get(`/propostas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposta_${numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>📁 Histórico de Propostas</h2>

        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={{ width: 150 }}>
          <option value="">Todos status</option>
          <option value="Ativa">Ativa</option>
          <option value="Aprovada">Aprovada</option>
          <option value="Recusada">Recusada</option>
          <option value="Cancelada">Cancelada</option>
        </select>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número, cliente, local..."
            style={{ paddingLeft: 30 }}
          />
        </div>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Número</th>
              <th style={th}>Data</th>
              <th style={th}>Cliente</th>
              <th style={th}>Local</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && propostas.length === 0 && (
              <tr><td colSpan={7} style={tdVazio}>Nenhuma proposta encontrada</td></tr>
            )}
            {!carregando && propostas.map(p => {
              const cor = STATUS_CORES[p.status] || STATUS_CORES.Ativa;
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={() => abrirDetalhe(p.id)}>
                  <td style={{ ...td, color: '#c9a227', fontWeight: 700 }}>{p.numero}</td>
                  <td style={td}>{formatarData(p.data)}</td>
                  <td style={td}>{p.cliente_nome}</td>
                  <td style={td}>{p.local_obra || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(p.total)}</td>
                  <td style={td}>
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cor.bg, color: cor.cor, border: `1px solid ${cor.borda}` }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => excluir(p)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {detalhe && (
        <div style={overlay} onClick={() => setDetalhe(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            {carregandoDetalhe || !detalhe.id ? (
              <p style={{ color: '#666', textAlign: 'center', padding: 30 }}>Carregando...</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ color: '#c9a227', fontSize: 17, fontWeight: 700, flex: 1 }}>
                    Proposta {detalhe.numero}
                  </h3>
                  <button onClick={() => setDetalhe(null)} style={{ ...btnIcone, background: 'transparent' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, fontSize: 12 }}>
                  <InfoLinha label="Cliente" valor={detalhe.cliente_nome} />
                  <InfoLinha label="Data" valor={formatarData(detalhe.data)} />
                  <InfoLinha label="Local da obra" valor={detalhe.local_obra || '—'} />
                  <InfoLinha label="Validade" valor={`${detalhe.validade} dias`} />
                  <InfoLinha label="Tipo" valor={detalhe.tipo || '—'} />
                  <InfoLinha label="Porte" valor={detalhe.porte || '—'} />
                </div>

                {detalhe.secoes?.map(sec => (
                  <div key={sec.id} style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: 12, color: '#c9a227', fontWeight: 700, marginBottom: 8 }}>{sec.nome}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <tbody>
                        {detalhe.itens?.filter(it => it.secao_id === sec.id).map(it => (
                          <tr key={it.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                            <td style={{ padding: '6px 4px', color: '#ccc' }}>{it.descricao}</td>
                            <td style={{ padding: '6px 4px', color: '#888', width: 80 }}>{formatarNcm(it.ncm) || '—'}</td>
                            <td style={{ padding: '6px 4px', color: '#888', textAlign: 'right', width: 70 }}>{Number(it.quantidade)} {it.unidade}</td>
                            <td style={{ padding: '6px 4px', color: '#888', textAlign: 'right', width: 90 }}>{formatarMoeda(it.valor_unitario)}</td>
                            <td style={{ padding: '6px 4px', color: '#ccc', textAlign: 'right', width: 100, fontWeight: 700 }}>{formatarMoeda(it.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 14, marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 26, fontSize: 12 }}>
                  <span style={{ color: '#888' }}>Materiais: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_materiais)}</b></span>
                  <span style={{ color: '#888' }}>Mão de obra: <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.subtotal_mao_obra)}</b></span>
                  <span style={{ color: '#888' }}>BDI ({detalhe.bdi}%): <b style={{ color: '#ccc' }}>{formatarMoeda(detalhe.valor_bdi)}</b></span>
                  <span style={{ color: '#c9a227', fontSize: 14 }}>Total: <b>{formatarMoeda(detalhe.total)}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#666', marginRight: 4 }}>Status:</span>
                  {['Ativa', 'Aprovada', 'Recusada', 'Cancelada'].map(s => (
                    <button
                      key={s}
                      onClick={() => mudarStatus(detalhe.id, s)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        border: detalhe.status === s ? '1px solid #c9a227' : '1px solid #2a2a2a',
                        background: detalhe.status === s ? '#c9a227' : 'transparent',
                        color: detalhe.status === s ? '#000' : '#999',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => duplicar(detalhe.id)}
                    disabled={duplicando}
                    style={{ ...btnSecundario, marginLeft: 'auto' }}
                  >
                    <Copy size={13} /> {duplicando ? 'Duplicando...' : 'Duplicar'}
                  </button>
                  <button onClick={abrirModalEmail} style={btnSecundario}>
                    <Send size={13} /> Enviar por E-mail
                  </button>
                  <button
                    onClick={() => baixarPdf(detalhe.id, detalhe.numero)}
                    disabled={gerandoPdf}
                    style={btnPrimario}
                  >
                    <FileDown size={13} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalEmail && (
        <div style={overlay} onClick={() => setModalEmail(false)}>
          <div style={{ ...modal, width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                Enviar Proposta {detalhe?.numero} por E-mail
              </h3>
              <button onClick={() => setModalEmail(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={enviarEmail}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  E-mail do cliente *
                </label>
                <input
                  type="email"
                  value={destinatarioEmail}
                  onChange={e => setDestinatarioEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Mensagem (opcional)
                </label>
                <textarea
                  rows={4}
                  value={mensagemEmail}
                  onChange={e => setMensagemEmail(e.target.value)}
                  placeholder="Deixe em branco para usar a mensagem padrão"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalEmail(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={enviandoEmail} style={btnPrimario}>
                  <Send size={13} /> {enviandoEmail ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoLinha({ label, valor }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ color: '#ddd' }}>{valor}</div>
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 };
const td = { padding: '10px 14px', color: '#ccc', verticalAlign: 'middle' };
const tdVazio = { padding: '30px 14px', textAlign: 'center', color: '#555' };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnSecundario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
  color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999', cursor: 'pointer'
};

const overlay = {
  position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20
};

const modal = {
  background: '#131313', border: '1px solid #2a2a2a', borderRadius: 12,
  padding: 28, width: 680, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
