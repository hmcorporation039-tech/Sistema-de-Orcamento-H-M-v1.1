import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Upload, FileDown, Printer, Mail, Copy, Ban, Trash2, Pencil, Eye, Send, Search, FileCode, ExternalLink, Users, ChevronDown,
} from 'lucide-react';
import {
  getNotasFiscais, getNotaFiscal, criarNotaFiscal, atualizarNotaFiscal, removerNotaFiscal, duplicarNotaFiscal,
  cancelarNotaFiscal, enviarNotaFiscalPorEmail, baixarPdfNotaFiscal, baixarXmlNotaFiscal, importarXmlNotasFiscais,
  getEmpresaFiscal, buscarMunicipios,
} from '../services/api';
import useUltimoPedido from '../hooks/useUltimoPedido';
import Paginacao from '../components/Paginacao';
import Select from '../components/Select';
import Modal from '../components/ui/Modal';
import CampoMoeda from '../components/CampoMoeda';
import ClienteSelect, { useClientes } from '../components/ClienteSelect';
import BuscaCodigo, { formatarCtribNac } from '../components/fiscal/BuscaCodigo';
import { estilos, Campo } from '../components/ui/estilos';
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../utils/format';
import { baixarArquivo, mensagemDeErro } from '../utils/download';

// Notas fiscais de serviço (versão 2.5) — aba do Financeiro, só administrador.
// Redesign: chips de status, auto-save no rascunho, ações textuais por linha.

const SITUACOES = {
  rascunho:   { rotulo: 'Rascunho',   cor: 'var(--aviso)',  fundo: 'rgba(224,169,64,.14)' },
  emitida:    { rotulo: 'Emitida',    cor: 'var(--sucesso)', fundo: 'rgba(79,191,122,.14)' },
  cancelada:  { rotulo: 'Cancelada',  cor: 'var(--perigo)', fundo: 'rgba(224,100,100,.14)' },
  substituida:{ rotulo: 'Substituída',cor: 'var(--texto-3)', fundo: 'rgba(143,137,124,.10)' },
};

const CHIPS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'rascunho',  rotulo: 'Rascunhos'  },
  { valor: 'emitida',   rotulo: 'Emitidas'   },
  { valor: 'cancelada', rotulo: 'Canceladas' },
];

const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');
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
  const [cancelando, setCancelando] = useState(null);
  const [duplicando, setDuplicando] = useState(null);
  const [emitindo, setEmitindo] = useState(null);
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
                  </td>
                  <td style={estilos.td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* ação principal */}
                      <BtnTexto onClick={() => setEditando({ id: n.id })} icone={rascunho ? <Pencil size={12} /> : <Eye size={12} />}>
                        {rascunho ? 'Editar' : 'Ver'}
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
          acoes={{ pdf, imprimir, xml, email: setEmailPara, duplicar: setDuplicando, cancelar: setCancelando, emitir: setEmitindo }} />
      )}
      {emailPara && <ModalEmail nota={emailPara} onFechar={() => setEmailPara(null)} onEnviado={carregar} />}
      {cancelando && <ModalCancelar nota={cancelando} onFechar={() => setCancelando(null)} onFeito={() => { setCancelando(null); setEditando(null); carregar(); }} />}
      {emitindo && <ModalEmitir nota={emitindo} onFechar={() => setEmitindo(null)} onImportar={() => { setEmitindo(null); setImportando(true); }} />}
      {duplicando && (
        <ModalDuplicar nota={duplicando} onFechar={() => setDuplicando(null)}
          onFeito={(ids) => { setDuplicando(null); carregar(); if (ids.length === 1) setEditando({ id: ids[0] }); }} />
      )}
      {importando && <ModalImportar onFechar={() => setImportando(false)} onFeito={carregar} />}
    </div>
  );
}

// ── componentes de UI locais ──────────────────────────────────────────────────

function Indicador({ rotulo, valor, destaque }) {
  return (
    <div style={{ ...estilos.card, padding: '12px 14px', marginBottom: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: destaque ? 'var(--ouro)' : 'var(--texto)', marginTop: 4 }}>{valor ?? '—'}</div>
    </div>
  );
}

function BtnTexto({ onClick, children, icone, destaque, ocupado }) {
  return (
    <button type="button" onClick={onClick} disabled={ocupado}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
        background: destaque ? 'var(--ouro-fundo)' : 'var(--superficie-2)',
        border: `1px solid ${destaque ? 'var(--ouro-escuro)' : 'var(--borda-forte)'}`,
        color: destaque ? 'var(--ouro-claro)' : 'var(--texto-2)',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}>
      {icone}{children}
    </button>
  );
}

function MenuAcoes({ children }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [aberto]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(!aberto)} title="Mais ações"
        style={{ ...estilos.btnIcone, width: 28, height: 28 }}>
        <ChevronDown size={12} />
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
          borderRadius: 8, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,.5)', overflow: 'hidden',
        }}
          onClick={() => setAberto(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function ItemMenu({ onClick, children, icone, perigo, ocupado, testid }) {
  return (
    <button type="button" onClick={onClick} disabled={ocupado} data-testid={testid}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px',
        background: 'transparent', border: 'none', fontSize: 12.5,
        color: perigo ? 'var(--perigo)' : 'var(--texto-2)',
        cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? .5 : 1,
        borderBottom: '1px solid var(--borda)',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!ocupado) e.currentTarget.style.background = 'var(--superficie-3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {icone}{children}
    </button>
  );
}

// ── Modal de edição / visualização da nota ────────────────────────────────────

const RETENCOES = [['valor_pis', 'PIS'], ['valor_cofins', 'COFINS'], ['valor_inss', 'INSS'], ['valor_ir', 'IR'], ['valor_csll', 'CSLL'], ['outras_retencoes', 'Outras']];

function calcR(base, pct) {
  return Math.round(Math.max(0, base) * (Number(String(pct).replace(',', '.')) || 0)) / 100;
}

function montarCorpo(f) {
  return {
    ...Object.fromEntries([
      'cliente_id', 'servico_id', 'competencia', 'discriminacao', 'valor_servicos', 'valor_deducoes',
      'desconto_incondicionado', 'desconto_condicionado', 'aliquota_iss', 'iss_retido', 'observacoes',
      ...RETENCOES.map(([c]) => c),
    ].map(c => [c, f[c]])),
    codigo_municipio_prestacao: f.local?.codigo || null,
  };
}

function ModalNota({ abrir, onFechar, onSalvo, acoes }) {
  const [nota, setNota] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [f, setF] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [autoSalvoEm, setAutoSalvoEm] = useState(null);
  const [autoSalvando, setAutoSalvando] = useState(false);
  const clientes = useClientes();
  const descricaoMexida = useRef(false);
  const snapSalvo = useRef(null); // JSON do último f efetivamente salvo

  useEffect(() => {
    let vivo = true;
    Promise.all([getEmpresaFiscal(), abrir.id ? getNotaFiscal(abrir.id) : Promise.resolve(null)])
      .then(([e, n]) => {
        if (!vivo) return;
        setEmpresa(e.data);
        const padrao = e.data.servicos.find(s => s.padrao) || e.data.servicos[0];
        const nn = n?.data || { situacao: 'rascunho' };
        setNota(nn);
        descricaoMexida.current = !!nn.discriminacao;
        const novoF = {
          cliente_id: nn.cliente_id ? String(nn.cliente_id) : '',
          servico_id: nn.servico_id ? String(nn.servico_id) : (padrao ? String(padrao.id) : ''),
          competencia: String(nn.competencia || hoje()).slice(0, 10),
          local: nn.codigo_municipio_prestacao
            ? { codigo: nn.codigo_municipio_prestacao, descricao: nn.local_prestacao || nn.codigo_municipio_prestacao }
            : { codigo: e.data.codigo_municipio, descricao: `${e.data.municipio}-${e.data.uf}` },
          discriminacao: nn.discriminacao || (n ? '' : padrao?.descricao_padrao || ''),
          valor_servicos: Number(nn.valor_servicos || 0),
          valor_deducoes: Number(nn.valor_deducoes || 0),
          desconto_incondicionado: Number(nn.desconto_incondicionado || 0),
          desconto_condicionado: Number(nn.desconto_condicionado || 0),
          aliquota_iss: nn.aliquota_iss != null ? String(nn.aliquota_iss).replace('.', ',') : (padrao?.aliquota_iss != null && !n ? String(padrao.aliquota_iss).replace('.', ',') : ''),
          iss_retido: !!nn.iss_retido,
          ...Object.fromEntries(RETENCOES.map(([c]) => [c, Number(nn[c] || 0)])),
          // Notas novas: pré-calcula PIS 0,65% e COFINS 3% (Simples Nacional).
          ...(!n ? {
            valor_pis: calcR(Number(nn.valor_servicos || 0), 0.65),
            valor_cofins: calcR(Number(nn.valor_servicos || 0), 3),
          } : {}),
          aliq_pis: !n ? '0,65' : '0,00', aliq_cofins: !n ? '3,00' : '0,00',
          aliq_inss: '0,00', aliq_ir: '0,00', aliq_csll: '0,00',
          observacoes: nn.observacoes || '',
        };
        setF(novoF);
        snapSalvo.current = JSON.stringify(novoF);
      })
      .catch(err => { toast.error(err.response?.data?.erro || 'Erro ao abrir a nota'); onFechar(); });
    return () => { vivo = false; };
  }, [abrir.id]); // eslint-disable-line

  // ── auto-save: 3 s de inatividade ──
  const editavel = nota?.situacao === 'rascunho';
  useEffect(() => {
    if (!editavel || !nota?.id || !f) return;
    if (JSON.stringify(f) === snapSalvo.current) return; // sem mudança real
    const timer = setTimeout(async () => {
      setAutoSalvando(true);
      try {
        await atualizarNotaFiscal(nota.id, montarCorpo(f));
        snapSalvo.current = JSON.stringify(f);
        setAutoSalvoEm(new Date());
        onSalvo();
      } catch { /* falha silenciosa; o salvar manual mostra o erro */ }
      finally { setAutoSalvando(false); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [f]); // eslint-disable-line

  // ── recalcula retenções federais quando valor dos serviços muda ──
  useEffect(() => {
    if (!f || !editavel) return;
    const base = f.valor_servicos;
    const pares = [['aliq_pis','valor_pis'],['aliq_cofins','valor_cofins'],['aliq_inss','valor_inss'],['aliq_ir','valor_ir'],['aliq_csll','valor_csll']];
    const up = {};
    let ok = false;
    for (const [ak, vk] of pares) {
      const a = Number(String(f[ak] || '').replace(',', '.')) || 0;
      if (a > 0) { const n = calcR(base, f[ak]); if (n !== f[vk]) { up[vk] = n; ok = true; } }
    }
    if (ok) setF(prev => ({ ...prev, ...up }));
  }, [f?.valor_servicos]); // eslint-disable-line

  // ── fechar: se houver mudança não salva, auto-salva imediatamente ──
  async function tentarFechar() {
    if (editavel && nota?.id && f && JSON.stringify(f) !== snapSalvo.current) {
      try { await atualizarNotaFiscal(nota.id, montarCorpo(f)); onSalvo(); } catch { /* ignora */ }
    }
    onFechar();
  }

  const servicos = empresa?.servicos || [];
  const servico = servicos.find(s => String(s.id) === f?.servico_id);
  const totais = useMemo(() => {
    if (!f) return null;
    const aliq = Number(String(f.aliquota_iss || '').replace(',', '.')) || 0;
    const base = f.valor_servicos - f.valor_deducoes - f.desconto_incondicionado;
    const iss = Math.round(Math.max(0, base) * aliq) / 100;
    const ret = RETENCOES.reduce((s, [c]) => s + Number(f[c] || 0), 0);
    return { base, iss, ret, liquido: f.valor_servicos - f.desconto_incondicionado - f.desconto_condicionado - ret - (f.iss_retido ? iss : 0) };
  }, [f]);

  if (!f || !nota) {
    return (
      <Modal titulo="Nota fiscal" onFechar={onFechar} largura={760}>
        <p style={{ ...estilos.ajuda, textAlign: 'center', padding: '24px 0' }}>Carregando…</p>
      </Modal>
    );
  }

  const s = SITUACOES[nota.situacao];
  const clienteSelecionado = clientes.find(x => String(x.id) === String(f.cliente_id));
  const titulo = nota.id
    ? <span>{nota.numero ? `NFS-e nº ${nota.numero}` : 'Rascunho'} <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: s.cor, background: s.fundo, border: `1px solid ${s.cor}`, marginLeft: 8 }}>{s.rotulo}</span></span>
    : 'Nova nota fiscal';

  const muda = (c) => (e) => setF({ ...f, [c]: e.target.value });

  function escolherServico(id) {
    const sv = servicos.find(x => String(x.id) === id);
    const novo = { ...f, servico_id: id };
    if (sv && !descricaoMexida.current) novo.discriminacao = sv.descricao_padrao || '';
    if (sv?.aliquota_iss != null) novo.aliquota_iss = String(sv.aliquota_iss).replace('.', ',');
    setF(novo);
  }
  function escolherCliente(id) {
    const c = clientes.find(x => String(x.id) === id);
    setF({ ...f, cliente_id: id, iss_retido: c ? !!c.retem_iss : f.iss_retido });
  }

  function aplicarAliquotasPadrao() {
    const base = f.valor_servicos;
    // Simples Nacional: IR e CSLL isentos de retenção na fonte (incluídos no DAS).
    // INSS: 11% apenas em cessão de mão de obra. Ajuste conforme o tomador.
    const a = { aliq_pis: '0,65', aliq_cofins: '3,00', aliq_inss: '0,00', aliq_ir: '0,00', aliq_csll: '0,00' };
    setF({ ...f, ...a,
      valor_pis: calcR(base, a.aliq_pis),
      valor_cofins: calcR(base, a.aliq_cofins),
      valor_inss: 0,
      valor_ir: 0,
      valor_csll: 0,
    });
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = nota.id ? await atualizarNotaFiscal(nota.id, montarCorpo(f)) : await criarNotaFiscal(montarCorpo(f));
      toast.success(nota.id ? 'Rascunho salvo' : 'Rascunho criado');
      setNota(r.data);
      snapSalvo.current = JSON.stringify(f);
      setAutoSalvoEm(null);
      onSalvo();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={titulo} onFechar={tentarFechar} largura={840} testid="modal-nota">
      {/* informações da nota emitida/cancelada */}
      {!editavel && (
        <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          {nota.padrao === 'nacional' && nota.chave_acesso && <div><span style={{ color: 'var(--texto-3)' }}>Chave de acesso:</span> <code>{nota.chave_acesso}</code></div>}
          {nota.codigo_verificacao && <div><span style={{ color: 'var(--texto-3)' }}>Código de verificação:</span> <code>{nota.codigo_verificacao}</code></div>}
          <div>Emitida em {dataHora(nota.data_emissao)}{nota.origem === 'importada' ? ` · importada (${nota.padrao === 'abrasf' ? 'ISSnet/SYSB1' : 'Emissor Nacional'})` : ''}</div>
          {nota.situacao === 'cancelada' && <div style={{ color: 'var(--perigo)', marginTop: 4, fontWeight: 500 }}>Cancelada em {dataHora(nota.cancelada_em)}: {nota.motivo_cancelamento}</div>}
          <div style={{ color: 'var(--texto-3)', marginTop: 4 }}>Nota emitida não pode ser editada — use <b>Duplicar</b> para refazer com outro valor ou data.</div>
        </div>
      )}
      {nota.origem_numero && <p style={{ ...estilos.ajuda, marginBottom: 10 }}>Cópia da nota nº {nota.origem_numero}.</p>}

      {/* ações rápidas para nota emitida (no topo, proeminentes) */}
      {!editavel && nota.id && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--texto-3)', alignSelf: 'center', marginRight: 4 }}>Ações:</span>
          <button type="button" onClick={() => acoes.imprimir(nota)} style={estilos.btnSecundario}><Printer size={13} /> Imprimir</button>
          <button type="button" onClick={() => acoes.email(nota)} style={estilos.btnSecundario}><Mail size={13} /> Enviar por e-mail</button>
          <button type="button" onClick={() => acoes.pdf(nota)} style={estilos.btnSecundario}><FileDown size={13} /> Baixar PDF</button>
          {nota.tem_xml && <button type="button" onClick={() => acoes.xml(nota)} style={estilos.btnSecundario}><FileCode size={13} /> Baixar XML</button>}
          <button type="button" onClick={() => acoes.duplicar(nota)} style={estilos.btnSecundario}><Copy size={13} /> Duplicar</button>
          {nota.situacao === 'emitida' && (
            <button type="button" onClick={() => acoes.cancelar(nota)} style={{ ...estilos.btnSecundario, color: 'var(--perigo)' }}><Ban size={13} /> Cancelar</button>
          )}
        </div>
      )}

      <form onSubmit={salvar}>
        <fieldset disabled={!editavel} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Campo label="Cliente (tomador) *">
              {editavel
                ? <ClienteSelect value={f.cliente_id} onChange={(e) => escolherCliente(e.target.value)} rotuloVazio="Escolha o cliente" data-testid="nota-cliente" />
                : <input value={`${nota.tomador?.nome || '—'}${nota.tomador?.documento ? ` · ${formatarCpfCnpj(nota.tomador.documento)}` : ''}`} readOnly />}
            </Campo>
            <Campo label="Competência *">
              <input type="date" value={f.competencia} onChange={muda('competencia')} data-testid="nota-competencia" />
            </Campo>
          </div>
          {clienteSelecionado?.endereco && (
            <p style={{ ...estilos.ajuda, margin: '-8px 0 0', fontSize: 11.5 }}>
              Endereço do tomador: {clienteSelecionado.endereco}
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Campo label="Serviço (código de tributação) *">
              {editavel || nota.servico_id
                ? (
                  <Select value={f.servico_id} onChange={(e) => escolherServico(e.target.value)} data-testid="nota-servico">
                    <option value="">Escolha o serviço</option>
                    {servicos.map(x => <option key={x.id} value={String(x.id)}>{`${formatarCtribNac(x.ctrib_nac)} – ${x.nome}`}</option>)}
                  </Select>
                )
                : <input value={nota.item_lista ? `Item ${nota.item_lista} (LC 116)${nota.ctrib_mun ? ` · cód. municipal ${nota.ctrib_mun}` : ''}` : '—'} readOnly />}
            </Campo>
            <Campo label="Local da prestação">
              <BuscaCodigo buscar={(t) => buscarMunicipios(t)} valor={f.local} onEscolher={(m) => setF({ ...f, local: m })} placeholder="Município" desabilitado={!editavel} />
            </Campo>
          </div>
          {servico && editavel && <p style={{ ...estilos.ajuda, margin: '-8px 0 0' }}>{servico.ctrib_nac_descricao}</p>}
          <Campo label="Discriminação do serviço *">
            <textarea rows={5} value={f.discriminacao} maxLength={2000} data-testid="nota-discriminacao"
              onChange={(e) => { descricaoMexida.current = true; setF({ ...f, discriminacao: e.target.value }); }}
              placeholder="O que foi feito, onde, período, nº do contrato/proposta…" />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Campo label="Valor dos serviços *"><CampoMoeda value={f.valor_servicos} onChange={(v) => setF({ ...f, valor_servicos: v })} data-testid="nota-valor" /></Campo>
            <Campo label="Deduções"><CampoMoeda value={f.valor_deducoes} onChange={(v) => setF({ ...f, valor_deducoes: v })} /></Campo>
            <Campo label="Desconto incondicionado"><CampoMoeda value={f.desconto_incondicionado} onChange={(v) => setF({ ...f, desconto_incondicionado: v })} /></Campo>
            <Campo label="Desconto condicionado"><CampoMoeda value={f.desconto_condicionado} onChange={(v) => setF({ ...f, desconto_condicionado: v })} /></Campo>
            <Campo label="Alíquota ISS (%)"><input value={f.aliquota_iss} onChange={muda('aliquota_iss')} inputMode="decimal" placeholder="ex.: 2,00" /></Campo>
            <Campo label="ISS retido">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)', height: 38 }}>
                <input type="checkbox" checked={f.iss_retido} onChange={(e) => setF({ ...f, iss_retido: e.target.checked })} style={{ width: 'auto' }} />
                Retido pelo tomador
              </label>
            </Campo>
          </div>
          <details open={RETENCOES.some(([c]) => Number(f[c]) > 0) || Number(String(f.aliq_pis || '').replace(',', '.')) > 0}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--texto-2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>▼ Retenções federais (órgão público, hospitais e grandes empresas)</span>
              {editavel && (
                <button type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); aplicarAliquotasPadrao(); }}
                  style={{ ...estilos.btnSecundario, padding: '2px 10px', fontSize: 11.5 }}
                  title="Simples Nacional: PIS 0,65% · COFINS 3% · IR 0% · CSLL 0% · INSS 0%&#10;Para cessão de mão de obra defina INSS manualmente.">
                  Alíquotas padrão (SN)
                </button>
              )}
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 10 }}>
              {[['valor_pis','PIS','aliq_pis'],['valor_cofins','COFINS','aliq_cofins'],
                ['valor_inss','INSS','aliq_inss'],['valor_ir','IR','aliq_ir'],['valor_csll','CSLL','aliq_csll'],
              ].map(([c, r, ak]) => (
                <Campo key={c} label={r}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 5 }}>
                    <input value={f[ak] ?? ''} onChange={(e) => {
                      const aliq = e.target.value;
                      setF({ ...f, [ak]: aliq, [c]: calcR(f.valor_servicos, aliq) });
                    }} inputMode="decimal" placeholder="0,00" style={{ width: 50, fontSize: 12, textAlign: 'right' }} />
                    <span style={{ fontSize: 11, color: 'var(--texto-3)' }}>%</span>
                  </div>
                  <CampoMoeda value={f[c]} onChange={(v) => setF({ ...f, [c]: v })} />
                </Campo>
              ))}
              <Campo label="Outras">
                <div style={{ height: 29 }} />
                <CampoMoeda value={f.outras_retencoes} onChange={(v) => setF({ ...f, outras_retencoes: v })} />
              </Campo>
            </div>
            {editavel && (
              <p style={{ ...estilos.ajuda, margin: '6px 0 0', fontSize: 11.5 }}>
                Simples Nacional: IR e CSLL normalmente isentos de retenção na fonte (já incluídos no DAS).
                Para <b>cessão de mão de obra</b> a hospitais/órgãos públicos, informe INSS 11%.
              </p>
            )}
          </details>
          <Campo label="Informações complementares">
            <textarea rows={2} value={f.observacoes} onChange={muda('observacoes')} maxLength={2000} placeholder="Opcional: dados bancários, nº do empenho, da medição…" />
          </Campo>
        </fieldset>

        {/* rodapé: totais + ações */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* totais */}
          <div style={{ flex: 1, display: 'flex', gap: 16, fontSize: 13, color: 'var(--texto-2)', flexWrap: 'wrap' }}>
            <span>Base: <b>{formatarMoeda(totais.base)}</b></span>
            <span>ISS: <b>{formatarMoeda(editavel ? totais.iss : nota.valor_iss)}</b>{f.iss_retido ? <em style={{ fontSize: 11, marginLeft: 4 }}>(retido)</em> : ''}</span>
            {(editavel ? totais.ret : 0) > 0 && (
              <span>Ret. federais: <b>{formatarMoeda(totais.ret)}</b></span>
            )}
            <span style={{ fontSize: 15 }}>Líquido: <b style={{ color: 'var(--ouro)' }}>{formatarMoeda(editavel ? totais.liquido : nota.valor_liquido)}</b></span>
          </div>

          {/* indicador de auto-save */}
          {editavel && nota.id && (
            <span style={{ fontSize: 11.5, color: autoSalvando ? 'var(--aviso)' : autoSalvoEm ? 'var(--sucesso)' : 'var(--texto-3)' }}>
              {autoSalvando ? '⟳ Salvando…' : autoSalvoEm ? `✓ Auto-salvo ${autoSalvoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '● não salvo'}
            </span>
          )}

          {/* botões de ação */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {editavel && nota.id && (
              <button type="button" onClick={() => acoes.emitir(nota)} style={estilos.btnSecundario}><Send size={13} /> Emitir</button>
            )}
            {editavel && (
              <button type="submit" disabled={salvando} style={estilos.btnPrimario} data-testid="salvar-nota">
                {salvando ? 'Salvando…' : 'Salvar rascunho'}
              </button>
            )}
            {!editavel && (
              <button type="button" onClick={tentarFechar} style={estilos.btnPrimario}>Fechar</button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Duplicar ──────────────────────────────────────────────────────────────────

function ModalDuplicar({ nota, onFechar, onFeito }) {
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

// ── Emitir ────────────────────────────────────────────────────────────────────

function ModalEmitir({ nota, onFechar, onImportar }) {
  const [n, setN] = useState(null);
  useEffect(() => { getNotaFiscal(nota.id).then(r => setN(r.data)).catch(() => toast.error('Erro ao abrir o rascunho')); }, [nota.id]);
  const copiar = (texto, oque) => navigator.clipboard.writeText(String(texto || '')).then(() => toast.success(`${oque} copiado`)).catch(() => toast.error('Não deu para copiar'));

  const t = n?.tomador || {};
  const endLinha1 = [t.logradouro, t.numero, t.complemento].filter(Boolean).join(', ');
  const cepFmt = t.cep ? `${t.cep.slice(0, 5)}-${t.cep.slice(5)}` : '';
  const cidadeUf = [t.municipio, t.uf].filter(Boolean).join('/');
  const retFed = n ? [
    ['PIS', n.valor_pis], ['COFINS', n.valor_cofins], ['INSS', n.valor_inss],
    ['IR', n.valor_ir], ['CSLL', n.valor_csll],
  ].filter(([, v]) => Number(v) > 0).map(([r, v]) => `${r} ${formatarMoeda(v)}`).join(' · ') : '';

  return (
    <Modal titulo="Pré-visualização · Emitir nota" onFechar={onFechar} largura={700}>
      <p style={estilos.ajuda}>A emissão direta pelo sistema entra quando o <b>certificado digital A1</b> da H&M for instalado. Até lá:</p>
      <ol style={{ ...estilos.ajuda, paddingLeft: 20, marginBottom: 14 }}>
        <li>Abra o <a href={EMISSOR_NACIONAL} target="_blank" rel="noreferrer" style={estilos.link}>Emissor Nacional <ExternalLink size={11} /></a> e entre com o gov.br da empresa.</li>
        <li>Confira os dados abaixo e use os botões para copiar cada campo.</li>
        <li>Após emitir, baixe o <b>XML</b> e use <b>Importar XML</b> aqui para registrar a nota.</li>
      </ol>

      {!n && <p style={{ ...estilos.ajuda, textAlign: 'center', padding: '12px 0' }}>Carregando…</p>}
      {n && (
        <div style={{ display: 'grid', gap: 10 }}>
          <Secao titulo="Tomador (quem paga)">
            <Linha rotulo="Nome / Razão social" valor={t.nome || '—'} />
            <Linha rotulo="CPF / CNPJ" valor={formatarCpfCnpj(t.documento || '')} copiar={() => copiar(t.documento, 'CPF/CNPJ')} />
            {t.inscricao_municipal && <Linha rotulo="Insc. municipal" valor={t.inscricao_municipal} copiar={() => copiar(t.inscricao_municipal, 'Insc. municipal')} />}
            {cepFmt && <Linha rotulo="CEP" valor={cepFmt} copiar={() => copiar(t.cep, 'CEP')} />}
            {endLinha1 && <Linha rotulo="Logradouro / nº" valor={endLinha1} copiar={() => copiar(endLinha1, 'Endereço')} />}
            {t.bairro && <Linha rotulo="Bairro" valor={t.bairro} copiar={() => copiar(t.bairro, 'Bairro')} />}
            {cidadeUf && <Linha rotulo="Município / UF" valor={cidadeUf} copiar={() => copiar(cidadeUf, 'Município')} />}
            {t.codigo_municipio && <Linha rotulo="Cód. IBGE" valor={t.codigo_municipio} copiar={() => copiar(t.codigo_municipio, 'Cód. IBGE')} />}
            {t.email && <Linha rotulo="E-mail" valor={t.email} copiar={() => copiar(t.email, 'E-mail')} />}
          </Secao>

          <Secao titulo="Serviço e valores">
            <Linha rotulo="Cód. tributação" valor={formatarCtribNac(n.ctrib_nac)} copiar={() => copiar(formatarCtribNac(n.ctrib_nac), 'Código')} />
            <Linha rotulo="Competência" valor={formatarData(n.competencia)} />
            <Linha rotulo="Valor dos serviços" valor={formatarMoeda(n.valor_servicos)} copiar={() => copiar(Number(n.valor_servicos).toFixed(2).replace('.', ','), 'Valor')} />
            {n.aliquota_iss != null && <Linha rotulo="Alíquota ISS" valor={`${String(n.aliquota_iss).replace('.', ',')}%`} />}
            {n.iss_retido && <Linha rotulo="ISS" valor="Retido pelo tomador" />}
            {retFed && <Linha rotulo="Ret. federais" valor={retFed} />}
          </Secao>

          <Secao titulo="Discriminação do serviço">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ whiteSpace: 'pre-wrap', flex: 1, fontSize: 13, lineHeight: 1.5 }}>{n.discriminacao}</span>
              <button type="button" onClick={() => copiar(n.discriminacao, 'Discriminação')} style={{ ...estilos.btnIcone, width: 26, height: 26, flexShrink: 0 }} title="Copiar discriminação"><Copy size={12} /></button>
            </div>
          </Secao>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Fechar</button>
        <button type="button" onClick={onImportar} style={estilos.btnPrimario}><Upload size={13} /> Já emiti — importar XML</button>
      </div>
    </Modal>
  );
}

function Secao({ titulo, children }) {
  return (
    <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: .5, padding: '6px 12px', borderBottom: '1px solid var(--borda)' }}>{titulo}</div>
      <div style={{ padding: '4px 12px' }}>{children}</div>
    </div>
  );
}

function Linha({ rotulo, valor, copiar }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8, alignItems: 'start', padding: '5px 0', borderBottom: '1px solid var(--borda)' }}>
      <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>{rotulo}</span>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>{valor}</span>
      {copiar ? <button type="button" onClick={copiar} style={{ ...estilos.btnIcone, width: 26, height: 26 }} title="Copiar"><Copy size={12} /></button> : <span />}
    </div>
  );
}

// ── E-mail ────────────────────────────────────────────────────────────────────

function ModalEmail({ nota, onFechar, onEnviado }) {
  const [para, setPara] = useState(nota.tomador_email || nota.tomador?.email || '');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await enviarNotaFiscalPorEmail(nota.id, para, mensagem);
      toast.success(r.data.mensagem);
      onFechar();
      onEnviado?.();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo={`Enviar NFS-e nº ${nota.numero} por e-mail`} onFechar={onFechar} largura={500}>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 14 }}>
        <Campo label="Para (até 5, separados por vírgula) *">
          <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="financeiro@cliente.com.br" autoFocus data-testid="email-para" />
        </Campo>
        <Campo label="Mensagem (opcional)">
          <textarea rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
            placeholder="Em branco: mensagem padrão com número e valor da nota" />
        </Campo>
        <p style={{ ...estilos.ajuda, margin: 0 }}>
          Vão anexados o PDF da nota{nota.tem_xml ? ' e o XML' : ''}. A assinatura da empresa entra no final.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando} style={estilos.btnPrimario}>
            <Send size={13} /> {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Cancelar ──────────────────────────────────────────────────────────────────

function ModalCancelar({ nota, onFechar, onFeito }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await cancelarNotaFiscal(nota.id, motivo);
      toast.success(r.data.mensagem);
      onFeito();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao cancelar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo={`Cancelar NFS-e nº ${nota.numero}`} onFechar={onFechar} largura={500}>
      <div style={{ color: 'var(--aviso)', background: 'rgba(224,169,64,.1)', border: '1px solid rgba(224,169,64,.35)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
        O sistema ainda não cancela direto na Receita: cancele primeiro no {nota.padrao === 'abrasf' ? 'ISSnet (ou pelo SYSB1)' : 'Emissor Nacional'} e depois registre aqui.
        Se tiver o XML do evento de cancelamento, pode só importá-lo.
      </div>
      <form onSubmit={confirmar} style={{ display: 'grid', gap: 12 }}>
        <Campo label="Motivo do cancelamento *">
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255}
            placeholder="Ex.: erro no valor do serviço; nota substituída pela nº …" autoFocus />
        </Campo>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando} style={{ ...estilos.btnPrimario, background: 'var(--perigo)', color: '#fff' }}>
            <Ban size={13} /> {enviando ? 'Registrando…' : 'Registrar cancelamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Importar XML ──────────────────────────────────────────────────────────────

function ModalImportar({ onFechar, onFeito }) {
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState(null);

  async function enviar() {
    if (!arquivos.length) { toast.error('Escolha os arquivos XML (ou um .zip)'); return; }
    setEnviando(true);
    try {
      const r = await importarXmlNotasFiscais(arquivos);
      setResumo(r.data);
      onFeito();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao importar');
    } finally { setEnviando(false); }
  }

  return (
    <Modal titulo="Importar notas já emitidas" onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>
        Aceita o XML das notas do <b>SYSB1/ISSnet</b> e do <b>Emissor Nacional</b> (inclusive o XML do evento de cancelamento),
        um por arquivo, vários de uma vez ou num .zip. Importar de novo a mesma nota só atualiza. Cliente ainda não cadastrado é criado com os dados da nota.
      </p>
      {!resumo && (
        <>
          <input type="file" multiple accept=".xml,.zip,text/xml,application/xml,application/zip"
            onChange={(e) => setArquivos([...e.target.files])} data-testid="arquivos-xml" />
          <p style={{ ...estilos.ajuda, margin: '6px 0 0' }}>{arquivos.length} arquivo(s) escolhido(s).</p>
        </>
      )}
      {resumo && (
        <div style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.7 }} data-testid="resumo-importacao">
          <div>
            <b>{resumo.importadas}</b> nota(s) nova(s) · <b>{resumo.atualizadas}</b> atualizada(s)
            {resumo.rascunhos_emitidos ? <> · <b>{resumo.rascunhos_emitidos}</b> rascunho(s) viraram nota emitida</> : null}
            {resumo.canceladas ? <> · <b>{resumo.canceladas}</b> cancelamento(s)</> : null}
          </div>
          {resumo.clientes_criados.length > 0 && <div>Clientes criados: {resumo.clientes_criados.join('; ')}</div>}
          {resumo.erros.length > 0 && (
            <div style={{ color: 'var(--aviso)', marginTop: 6 }}>
              {resumo.erros.length} aviso(s):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, maxHeight: 180, overflowY: 'auto' }}>
                {resumo.erros.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>{resumo ? 'Fechar' : 'Voltar'}</button>
        {!resumo && (
          <button type="button" onClick={enviar} disabled={enviando} style={estilos.btnPrimario} data-testid="enviar-xml">
            <Upload size={13} /> {enviando ? 'Importando…' : 'Importar'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── constantes de estilo locais ───────────────────────────────────────────────
const sub = { fontSize: 11.5, color: 'var(--texto-3)', marginTop: 2 };
const opcao = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)', margin: '6px 0', cursor: 'pointer' };
