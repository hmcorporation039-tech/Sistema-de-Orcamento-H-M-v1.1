import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Upload, FileDown, Printer, Mail, Copy, Ban, Trash2, Pencil, Eye, Send, Search, FileCode, ExternalLink, ScanEye } from 'lucide-react';
import { getNotasFiscais, removerNotaFiscal, baixarPdfNotaFiscal, baixarXmlNotaFiscal } from '../services/api';
import useUltimoPedido from '../hooks/useUltimoPedido';
import Paginacao from '../components/Paginacao';
import { formatarCtribNac } from '../components/fiscal/BuscaCodigo';
import { estilos } from '../components/ui/estilos';
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../utils/format';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { BtnTexto, Indicador, ItemMenu, MenuAcoes, SITUACOES, sub } from './notasFiscais/comum';
import { ModalNota } from './notasFiscais/ModalNota';
import { ModalDuplicar } from './notasFiscais/ModalDuplicar';
import { ModalPrevia } from './notasFiscais/ModalPrevia';
import { ModalEmitir } from './notasFiscais/ModalEmitir';
import { ModalEmail } from './notasFiscais/ModalEmail';
import { ModalDaProposta } from './notasFiscais/ModalDaProposta';
import { ModalRecebimento } from './notasFiscais/ModalRecebimento';
import { ModalAtestado } from './notasFiscais/ModalAtestado';
import { ModalCancelar } from './notasFiscais/ModalCancelar';
import { ModalImportar } from './notasFiscais/ModalImportar';

// Notas fiscais de serviço (versão 2.5) — aba do Financeiro, só administrador.
// Redesign: chips de status, auto-save no rascunho, ações textuais por linha.

const CHIPS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'rascunho',  rotulo: 'Rascunhos'  },
  { valor: 'emitida',   rotulo: 'Emitidas'   },
  { valor: 'cancelada', rotulo: 'Canceladas' },
];

const competencia = (v) => { const s = String(v || '').slice(0, 10); return s ? `${s.slice(5, 7)}/${s.slice(0, 4)}` : '—'; };

async function imprimirPdf(id) {
  const r = await baixarPdfNotaFiscal(id);
  const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
  const quadro = document.createElement('iframe');
  Object.assign(quadro.style, { position: 'fixed', right: 0, bottom: 0, width: 0, height: 0, border: 0 });
  quadro.src = url;
  quadro.onload = () => {
    setTimeout(() => { try { quadro.contentWindow.focus(); quadro.contentWindow.print(); } catch { window.open(url, '_blank'); } }, 300);
    setTimeout(() => { quadro.remove(); URL.revokeObjectURL(url); }, 60000);
  };
  document.body.appendChild(quadro);
}

export default function NotasFiscais() {
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1, totais: null });
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [editando, setEditando] = useState(null);
  const [emailPara, setEmailPara] = useState(null);
  const [atestando, setAtestando] = useState(null);
  const [conciliando, setConciliando] = useState(null);
  const [daProposta, setDaProposta] = useState(false);
  const [cancelando, setCancelando] = useState(null);
  const [duplicando, setDuplicando] = useState(null);
  const [emitindo, setEmitindo] = useState(null);
  const [previsualizando, setPrevisualizando] = useState(null);
  const [importando, setImportando] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const novoPedido = useUltimoPedido();

  const carregar = useCallback(async () => {
    const vale = novoPedido();
    setCarregando(true);
    try {
      const params = { pagina };
      if (busca.trim()) params.busca = busca.trim();
      if (situacao) params.situacao = situacao;
      if (de) params.de = de;
      if (ate) params.ate = ate;
      const r = await getNotasFiscais(params);
      if (vale()) setDados(r.data);
    } catch (err) {
      if (vale()) toast.error(err.response?.data?.erro || 'Erro ao carregar as notas');
    } finally {
      if (vale()) setCarregando(false);
    }
  }, [pagina, busca, situacao, de, ate, novoPedido]);

  useEffect(() => { const t = setTimeout(carregar, busca ? 300 : 0); return () => clearTimeout(t); }, [carregar, busca]);
  useEffect(() => { setPagina(1); }, [busca, situacao, de, ate]);

  async function acao(chave, fn) { setOcupado(chave); try { await fn(); } finally { setOcupado(null); } }
  const pdf = (n) => acao(`pdf${n.id}`, async () => {
    try { await baixarArquivo(baixarPdfNotaFiscal(n.id), `NFS-e_${n.numero || 'rascunho'}.pdf`); } catch (err) { toast.error(await mensagemDeErro(err, 'Erro ao gerar o PDF')); }
  });
  const imprimir = (n) => acao(`imp${n.id}`, async () => {
    try { await imprimirPdf(n.id); } catch (err) { toast.error(await mensagemDeErro(err, 'Erro ao gerar o PDF')); }
  });
  const xml = (n) => acao(`xml${n.id}`, async () => {
    try { await baixarArquivo(baixarXmlNotaFiscal(n.id), `NFS-e_${n.numero}.xml`); } catch (err) { toast.error(await mensagemDeErro(err, 'Erro ao baixar o XML')); }
  });
  async function apagar(n) {
    if (!window.confirm('Apagar este rascunho?')) return;
    try { await removerNotaFiscal(n.id); toast.success('Rascunho apagado'); carregar(); } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao apagar'); }
  }

  const t = dados.totais;

  // contagens por situação para os chips
  const chipContagem = { rascunho: t?.rascunhos, emitida: t?.emitidas };

  return (
    <div>
      {/* ── cabeçalho ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: 'var(--ouro)', fontWeight: 700, margin: 0, flex: 1 }}>Notas Fiscais de Serviço (NFS-e)</h2>
        <button type="button" onClick={() => setImportando(true)} style={estilos.btnSecundario} data-testid="importar-notas">
          <Upload size={14} /> Importar XML
        </button>
        <button type="button" onClick={() => setDaProposta(true)} style={estilos.btnSecundario} data-testid="nota-da-proposta" title="Cria um rascunho com o cliente e o valor de uma proposta">
          <FileDown size={14} /> Nota da proposta
        </button>
        <button type="button" onClick={() => setEditando({})} style={estilos.btnPrimario} data-testid="nova-nota">
          <Plus size={14} /> Nova NFS-e
        </button>
      </div>

      {/* ── indicadores resumo ── */}
      {t && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
          <Indicador rotulo="Notas emitidas" valor={t.emitidas} />
          <Indicador rotulo="Valor emitido" valor={formatarMoeda(t.valor_emitido)} destaque />
          <Indicador rotulo="Líquido a receber" valor={formatarMoeda(t.liquido_emitido)} />
          <Indicador rotulo="Rascunhos" valor={t.rascunhos} />
        </div>
      )}

      {/* ── filtros: chips de status + período + busca ── */}
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
        {/* linha 1: chips de status */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CHIPS.map(c => {
            const ativo = situacao === c.valor;
            const contagem = chipContagem[c.valor];
            return (
              <button key={c.valor} type="button" onClick={() => setSituacao(c.valor)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: ativo ? 600 : 500,
                  background: ativo ? 'var(--ouro-fundo)' : 'transparent',
                  border: `1px solid ${ativo ? 'var(--ouro-escuro)' : 'var(--borda)'}`,
                  color: ativo ? 'var(--ouro-claro)' : 'var(--texto-2)',
                  cursor: 'pointer', transition: 'all .12s',
                }}>
                {c.rotulo}
                {contagem != null && <span style={{ fontSize: 11, opacity: .7, background: ativo ? 'rgba(212,168,42,.25)' : 'var(--superficie-2)', padding: '1px 6px', borderRadius: 10 }}>{contagem}</span>}
              </button>
            );
          })}
        </div>

        {/* linha 2: período + busca */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 8, alignItems: 'center' }}>
          <div>
            <label style={{ ...estilos.rotulo, marginBottom: 4 }}>De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} title="Competência a partir de" />
          </div>
          <div>
            <label style={{ ...estilos.rotulo, marginBottom: 4 }}>Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} title="Competência até" />
          </div>
          <div>
            <label style={{ ...estilos.rotulo, marginBottom: 4 }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--texto-3)', pointerEvents: 'none' }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Cliente, CNPJ, número da nota ou descrição do serviço…"
                style={{ paddingLeft: 32 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── tabela ── */}
      <div style={estilos.caixaTabela}>
        <table style={{ ...estilos.tabela, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...estilos.th, width: 80 }}>Nº</th>
              <th style={{ ...estilos.th, width: 110 }}>Competência</th>
              <th style={estilos.th}>Tomador</th>
              <th style={estilos.th}>Serviço / discriminação</th>
              <th style={{ ...estilos.th, textAlign: 'right', width: 120 }}>Valor</th>
              <th style={{ ...estilos.th, width: 110 }}>Situação</th>
              <th style={{ ...estilos.th, width: 260 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} style={{ ...estilos.tdVazio, color: 'var(--texto-3)' }}>Carregando…</td></tr>
            )}
            {!carregando && dados.itens.length === 0 && (
              <tr><td colSpan={7} style={estilos.tdVazio}>
                {busca || situacao || de || ate
                  ? 'Nenhuma nota com esse filtro.'
                  : 'Nenhuma nota. Crie uma nova ou importe os XML das notas já emitidas.'}
              </td></tr>
            )}
            {dados.itens.map(n => {
              const s = SITUACOES[n.situacao];
              const rascunho = n.situacao === 'rascunho';
              const emitida  = n.situacao === 'emitida';
              return (
                <tr key={n.id} style={estilos.linhaTabela} data-testid={`nota-${n.id}`}>
                  <td style={{ ...estilos.td, fontWeight: 700, fontFamily: 'monospace' }}>
                    {n.numero || <span style={{ color: 'var(--texto-3)' }}>—</span>}
                    {n.proposta_numero && <div style={{ ...sub, fontFamily: 'inherit', fontWeight: 400 }} title="Proposta ligada a esta nota">Proposta {n.proposta_numero}</div>}
                  </td>
                  <td style={estilos.td}>
                    <div>{competencia(n.competencia)}</div>
                    {!rascunho && <div style={sub}>{formatarData(n.data_emissao)}</div>}
                  </td>
                  <td style={estilos.td}>
                    <div>{n.tomador_nome || <em style={{ color: 'var(--texto-3)' }}>sem cliente</em>}</div>
                    {n.tomador_documento && <div style={sub}>{formatarCpfCnpj(n.tomador_documento)}</div>}
                  </td>
                  <td style={estilos.td}>
                    <div style={{ fontSize: 11.5, color: 'var(--texto-3)', fontFamily: 'monospace', marginBottom: 2 }}>
                      {n.ctrib_nac ? formatarCtribNac(n.ctrib_nac) : (n.item_lista || '—')}
                    </div>
                    <div style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={n.discriminacao}>{n.discriminacao || <em style={{ color: 'var(--texto-3)' }}>sem descrição</em>}</div>
                  </td>
                  <td style={{ ...estilos.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700 }}>{formatarMoeda(n.valor_servicos)}</div>
                    {Number(n.valor_liquido) !== Number(n.valor_servicos) && (
                      <div style={sub}>líq. {formatarMoeda(n.valor_liquido)}</div>
                    )}
                  </td>
                  <td style={estilos.td}>
                    <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 20, color: s.cor, background: s.fundo, border: `1px solid ${s.cor}` }}>
                      {s.rotulo}
                    </span>
                    {n.ultimo_envio_em && (
                      <div style={{ ...sub, marginTop: 3 }} title={n.ultimo_envio_para}>
                        ✉ enviado {formatarData(n.ultimo_envio_em)}
                      </div>
                    )}
                    {n.atestado_enviado_em && (
                      <div style={{ ...sub, marginTop: 3 }} title={`Atestado enviado para ${n.atestado_enviado_para}`}>
                        📄 atestado enviado {formatarData(n.atestado_enviado_em)}
                      </div>
                    )}
                    {Number(n.recebido_valor) > 0 && (
                      <div style={{ ...sub, marginTop: 3, color: 'var(--sucesso)' }} title="Pix ligado a esta nota (Financeiro)">
                        ✔ recebido {formatarMoeda(n.recebido_valor)}{n.recebido_em ? ` em ${formatarData(n.recebido_em)}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={estilos.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* ação principal */}
                      <BtnTexto onClick={() => setEditando({ id: n.id })} icone={rascunho ? <Pencil size={12} /> : <Eye size={12} />}>
                        {rascunho ? 'Editar' : 'Ver'}
                      </BtnTexto>

                      <BtnTexto onClick={() => setPrevisualizando(n)} icone={<ScanEye size={12} />}>
                        Prévia
                      </BtnTexto>

                      {rascunho && (
                        <BtnTexto onClick={() => setEmitindo(n)} icone={<Send size={12} />} destaque>
                          Emitir
                        </BtnTexto>
                      )}

                      {!rascunho && (
                        <BtnTexto onClick={() => imprimir(n)} icone={<Printer size={12} />} ocupado={ocupado === `imp${n.id}`}>
                          Imprimir
                        </BtnTexto>
                      )}

                      {emitida && (
                        <BtnTexto onClick={() => setEmailPara(n)} icone={<Mail size={12} />}>
                          E-mail
                        </BtnTexto>
                      )}

                      {/* ações secundárias */}
                      <MenuAcoes>
                        <ItemMenu onClick={() => pdf(n)} icone={<FileDown size={12} />} ocupado={ocupado === `pdf${n.id}`}>Baixar PDF</ItemMenu>
                        {n.tem_xml && <ItemMenu onClick={() => xml(n)} icone={<FileCode size={12} />} ocupado={ocupado === `xml${n.id}`}>Baixar XML</ItemMenu>}
                        <ItemMenu onClick={() => setDuplicando(n)} icone={<Copy size={12} />} testid={`duplicar-${n.id}`}>Duplicar</ItemMenu>
                        {emitida && <ItemMenu onClick={() => setAtestando(n)} icone={<FileDown size={12} />}>Atestado de capacidade técnica</ItemMenu>}
                        {emitida && <ItemMenu onClick={() => setConciliando(n)} icone={<ExternalLink size={12} />} testid={`conciliar-${n.id}`}>Ligar recebimento (Pix)</ItemMenu>}
                        {emitida && <ItemMenu onClick={() => setCancelando(n)} icone={<Ban size={12} />} perigo>Cancelar nota</ItemMenu>}
                        {rascunho && <ItemMenu onClick={() => apagar(n)} icone={<Trash2 size={12} />} perigo>Apagar rascunho</ItemMenu>}
                      </MenuAcoes>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />

      {/* modais */}
      {editando && (
        <ModalNota abrir={editando} onFechar={() => setEditando(null)} onSalvo={carregar}
          acoes={{ pdf, imprimir, xml, email: setEmailPara, duplicar: setDuplicando, cancelar: setCancelando, emitir: setEmitindo, previa: setPrevisualizando }} />
      )}
      {emailPara && <ModalEmail nota={emailPara} onFechar={() => setEmailPara(null)} onEnviado={carregar} />}
      {atestando && <ModalAtestado nota={atestando} onFechar={() => setAtestando(null)} onVinculado={carregar} />}
      {conciliando && <ModalRecebimento nota={conciliando} onFechar={() => setConciliando(null)} onMudou={carregar} />}
      {daProposta && <ModalDaProposta onFechar={() => setDaProposta(false)} onFeito={(id) => { setDaProposta(false); carregar(); setEditando({ id }); }} />}
      {cancelando && <ModalCancelar nota={cancelando} onFechar={() => setCancelando(null)} onFeito={() => { setCancelando(null); setEditando(null); carregar(); }} />}
      {emitindo && <ModalEmitir nota={emitindo} onFechar={() => setEmitindo(null)} onImportar={() => { setEmitindo(null); setImportando(true); }} />}
      {previsualizando && <ModalPrevia nota={previsualizando} onFechar={() => setPrevisualizando(null)} />}
      {duplicando && (
        <ModalDuplicar nota={duplicando} onFechar={() => setDuplicando(null)}
          onFeito={(ids) => { setDuplicando(null); carregar(); if (ids.length === 1) setEditando({ id: ids[0] }); }} />
      )}
      {importando && <ModalImportar onFechar={() => setImportando(false)} onFeito={carregar} />}
    </div>
  );
}
