import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Upload, FileDown, Printer, Mail, Copy, Ban, Trash2, Pencil, Eye, Send, Search, FileCode, ExternalLink, Users,
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

// Notas fiscais de serviço (versão 2.4) — aba do Financeiro, só administrador.
// Rascunho → (emissão no Emissor Nacional + importação do XML, até a emissão
// direta da etapa 2) → emitida → cancelada. "Duplicar" é o clonador: copia
// serviço, descrição e valores para um rascunho novo, para o mesmo cliente ou
// para vários de uma vez; aí é só mudar valor, data e descrição.

const SITUACOES = {
  rascunho: { rotulo: 'Rascunho', cor: '#d9a53a' },
  emitida: { rotulo: 'Emitida', cor: '#3fb95f' },
  cancelada: { rotulo: 'Cancelada', cor: '#b04040' },
  substituida: { rotulo: 'Substituída', cor: '#8c8c8c' },
};
const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const competencia = (v) => { const s = String(v || '').slice(0, 10); return s ? `${s.slice(5, 7)}/${s.slice(0, 4)}` : '—'; };

// imprime o PDF sem baixar: abre num quadro escondido e chama o diálogo de impressão
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
  const [editando, setEditando] = useState(null); // {} = nova; { id } = abrir
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

  async function acao(chave, fn) {
    setOcupado(chave);
    try { await fn(); } finally { setOcupado(null); }
  }
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
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontSize: 18, color: 'var(--ouro)', fontWeight: 700, margin: 0, flex: 1 }}>Notas fiscais de serviço (NFS-e)</h2>
        <button type="button" onClick={() => setImportando(true)} style={estilos.btnSecundario} data-testid="importar-notas"><Upload size={14} /> Importar XML</button>
        <button type="button" onClick={() => setEditando({})} style={estilos.btnPrimario} data-testid="nova-nota"><Plus size={14} /> Nova nota</button>
      </div>
      <p style={estilos.ajuda}>
        Para repetir uma nota, use <Copy size={12} style={{ verticalAlign: -2 }} /> <b>Duplicar</b>: a cópia vira rascunho e é só trocar cliente,
        valor, data e descrição. A emissão direta pelo sistema entra com o certificado digital; até lá, emita no Emissor Nacional e importe o XML aqui.
      </p>

      {t && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Indicador rotulo="Notas emitidas" valor={t.emitidas} />
          <Indicador rotulo="Valor emitido" valor={formatarMoeda(t.valor_emitido)} destaque />
          <Indicador rotulo="Líquido a receber" valor={formatarMoeda(t.liquido_emitido)} />
          <Indicador rotulo="Rascunhos" valor={t.rascunhos} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(3, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--texto-3)' }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, CNPJ, número ou descrição" style={{ paddingLeft: 30 }} />
        </div>
        <Select value={situacao} onChange={(e) => setSituacao(e.target.value)}>
          <option value="">Todas as situações</option>
          {Object.entries(SITUACOES).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}
        </Select>
        <input type="date" value={de} onChange={(e) => setDe(e.target.value)} title="Competência a partir de" />
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} title="Competência até" />
      </div>

      <div style={estilos.caixaTabela}>
        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Nº</th>
              <th style={estilos.th}>Emissão</th>
              <th style={estilos.th}>Tomador</th>
              <th style={estilos.th}>Serviço</th>
              <th style={{ ...estilos.th, textAlign: 'right' }}>Valor</th>
              <th style={estilos.th}>Situação</th>
              <th style={{ ...estilos.th, width: 250 }} />
            </tr>
          </thead>
          <tbody>
            {!carregando && dados.itens.length === 0 && <tr><td colSpan={7} style={estilos.tdVazio}>Nenhuma nota. Crie uma nova ou importe os XML das notas já emitidas.</td></tr>}
            {dados.itens.map(n => {
              const s = SITUACOES[n.situacao];
              const rascunho = n.situacao === 'rascunho';
              return (
                <tr key={n.id} style={estilos.linhaTabela} data-testid={`nota-${n.id}`}>
                  <td style={{ ...estilos.td, fontWeight: 700 }}>{n.numero || '—'}</td>
                  <td style={estilos.td}>
                    {rascunho ? '—' : formatarData(n.data_emissao)}
                    <div style={sub}>comp. {competencia(n.competencia)}</div>
                  </td>
                  <td style={estilos.td}>
                    {n.tomador_nome || <em style={{ color: 'var(--texto-3)' }}>sem cliente</em>}
                    <div style={sub}>{n.tomador_documento ? formatarCpfCnpj(n.tomador_documento) : ''}</div>
                  </td>
                  <td style={estilos.td} title={n.discriminacao}>
                    <code>{n.ctrib_nac ? formatarCtribNac(n.ctrib_nac) : n.item_lista || '—'}</code>
                    <div style={{ ...sub, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.discriminacao}</div>
                  </td>
                  <td style={{ ...estilos.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <b>{formatarMoeda(n.valor_servicos)}</b>
                    {Number(n.valor_liquido) !== Number(n.valor_servicos) && <div style={sub}>líq. {formatarMoeda(n.valor_liquido)}</div>}
                  </td>
                  <td style={estilos.td}>
                    <span style={{ ...selo, color: s.cor, borderColor: s.cor }}>{s.rotulo}</span>
                    {n.origem === 'importada' && <div style={sub}>{n.padrao === 'abrasf' ? 'ISSnet (SYSB1)' : 'importada'}</div>}
                    {n.ultimo_envio_em && <div style={sub} title={n.ultimo_envio_para}>e-mail {formatarData(n.ultimo_envio_em)}</div>}
                  </td>
                  <td style={{ ...estilos.td }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Botao titulo={rascunho ? 'Editar' : 'Ver'} onClick={() => setEditando({ id: n.id })}>{rascunho ? <Pencil size={13} /> : <Eye size={13} />}</Botao>
                      {rascunho && <Botao titulo="Emitir" onClick={() => setEmitindo(n)} cor="var(--ouro)"><Send size={13} /></Botao>}
                      <Botao titulo="Baixar PDF" onClick={() => pdf(n)} ocupado={ocupado === `pdf${n.id}`}><FileDown size={13} /></Botao>
                      <Botao titulo="Imprimir" onClick={() => imprimir(n)} ocupado={ocupado === `imp${n.id}`}><Printer size={13} /></Botao>
                      {!rascunho && <Botao titulo="Enviar por e-mail" onClick={() => setEmailPara(n)}><Mail size={13} /></Botao>}
                      {n.tem_xml && <Botao titulo="Baixar XML" onClick={() => xml(n)} ocupado={ocupado === `xml${n.id}`}><FileCode size={13} /></Botao>}
                      <Botao titulo="Duplicar" onClick={() => setDuplicando(n)} testid={`duplicar-${n.id}`}><Copy size={13} /></Botao>
                      {n.situacao === 'emitida' && <Botao titulo="Cancelar nota" onClick={() => setCancelando(n)} cor="#b04040"><Ban size={13} /></Botao>}
                      {rascunho && <Botao titulo="Apagar rascunho" onClick={() => apagar(n)} cor="#b04040"><Trash2 size={13} /></Botao>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />

      {editando && <ModalNota abrir={editando} onFechar={() => setEditando(null)} onSalvo={() => carregar()}
        acoes={{ pdf, imprimir, xml, email: setEmailPara, duplicar: setDuplicando, cancelar: setCancelando, emitir: setEmitindo }} />}
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

function Indicador({ rotulo, valor, destaque }) {
  return (
    <div style={{ ...estilos.card, padding: '12px 14px', marginBottom: 0 }}>
      <div style={{ fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: destaque ? 'var(--ouro)' : 'var(--texto)', marginTop: 4 }}>{valor}</div>
    </div>
  );
}

function Botao({ titulo, onClick, children, cor, ocupado, testid }) {
  return (
    <button type="button" onClick={onClick} title={titulo} aria-label={titulo} disabled={ocupado} data-testid={testid}
      style={{ ...estilos.btnIcone, ...(cor ? { color: cor } : {}), opacity: ocupado ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

// ── Nota: rascunho editável / emitida só leitura ───────────────────────────

const RETENCOES = [['valor_pis', 'PIS'], ['valor_cofins', 'COFINS'], ['valor_inss', 'INSS'], ['valor_ir', 'IR'], ['valor_csll', 'CSLL'], ['outras_retencoes', 'Outras']];

function ModalNota({ abrir, onFechar, onSalvo, acoes }) {
  const [nota, setNota] = useState(abrir.id ? null : { situacao: 'rascunho' });
  const [empresa, setEmpresa] = useState(null);
  const [f, setF] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const clientes = useClientes();
  const descricaoMexida = useRef(false);

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
        setF({
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
          observacoes: nn.observacoes || '',
        });
      })
      .catch(err => { toast.error(err.response?.data?.erro || 'Erro ao abrir a nota'); onFechar(); });
    return () => { vivo = false; };
  }, [abrir.id]); // só ao abrir (onFechar muda a cada render do pai)

  const servicos = empresa?.servicos || [];
  const servico = servicos.find(s => String(s.id) === f?.servico_id);
  const totais = useMemo(() => {
    if (!f) return null;
    const aliq = Number(String(f.aliquota_iss || '').replace(',', '.')) || 0;
    const base = f.valor_servicos - f.valor_deducoes - f.desconto_incondicionado;
    const iss = Math.round(Math.max(0, base) * aliq) / 100;
    const ret = RETENCOES.reduce((s, [c]) => s + Number(f[c] || 0), 0);
    return { base, iss, liquido: f.valor_servicos - f.desconto_incondicionado - f.desconto_condicionado - ret - (f.iss_retido ? iss : 0) };
  }, [f]);

  if (!f || !nota) return <Modal titulo="Nota fiscal" onFechar={onFechar} largura={760}><p style={estilos.ajuda}>Carregando…</p></Modal>;
  const editavel = nota.situacao === 'rascunho';
  const muda = (c) => (e) => setF({ ...f, [c]: e.target.value });

  function escolherServico(id) {
    const s = servicos.find(x => String(x.id) === id);
    const novo = { ...f, servico_id: id };
    if (s && !descricaoMexida.current) novo.discriminacao = s.descricao_padrao || '';
    if (s?.aliquota_iss != null) novo.aliquota_iss = String(s.aliquota_iss).replace('.', ',');
    setF(novo);
  }
  function escolherCliente(id) {
    const c = clientes.find(x => String(x.id) === id);
    setF({ ...f, cliente_id: id, iss_retido: c ? !!c.retem_iss : f.iss_retido });
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const corpo = {
      ...Object.fromEntries(['cliente_id', 'servico_id', 'competencia', 'discriminacao', 'valor_servicos', 'valor_deducoes',
        'desconto_incondicionado', 'desconto_condicionado', 'aliquota_iss', 'iss_retido', 'observacoes', ...RETENCOES.map(([c]) => c)].map(c => [c, f[c]])),
      codigo_municipio_prestacao: f.local?.codigo || null,
    };
    try {
      const r = nota.id ? await atualizarNotaFiscal(nota.id, corpo) : await criarNotaFiscal(corpo);
      toast.success(nota.id ? 'Rascunho salvo' : 'Rascunho criado');
      setNota(r.data);
      onSalvo();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  const s = SITUACOES[nota.situacao];
  const titulo = nota.id
    ? <span>{nota.numero ? `NFS-e nº ${nota.numero}` : 'Rascunho de nota'} <span style={{ ...selo, color: s.cor, borderColor: s.cor, marginLeft: 8 }}>{s.rotulo}</span></span>
    : 'Nova nota fiscal';

  return (
    <Modal titulo={titulo} onFechar={onFechar} largura={820} testid="modal-nota">
      {!editavel && (
        <div style={{ ...estilos.ajuda, background: 'var(--superficie-2)', padding: '8px 12px', borderRadius: 8 }}>
          {nota.padrao === 'nacional' && nota.chave_acesso ? <>Chave de acesso: <code>{nota.chave_acesso}</code><br /></> : null}
          {nota.codigo_verificacao ? <>Código de verificação: <code>{nota.codigo_verificacao}</code><br /></> : null}
          Emitida em {dataHora(nota.data_emissao)}{nota.origem === 'importada' ? ` · importada (${nota.padrao === 'abrasf' ? 'ISSnet/SYSB1' : 'Emissor Nacional'})` : ''}
          {nota.situacao === 'cancelada' && <><br /><b style={{ color: '#b04040' }}>Cancelada em {dataHora(nota.cancelada_em)}: {nota.motivo_cancelamento}</b></>}
          <br />Nota emitida não se edita: para refazer com outro valor ou data, use Duplicar.
        </div>
      )}
      {nota.origem_numero && <p style={estilos.ajuda}>Cópia da nota nº {nota.origem_numero}.</p>}
      <form onSubmit={salvar}>
        <fieldset disabled={!editavel} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Campo label="Cliente (tomador) *">
              {editavel
                ? <ClienteSelect value={f.cliente_id} onChange={(e) => escolherCliente(e.target.value)} rotuloVazio="Escolha o cliente" data-testid="nota-cliente" />
                : <input value={`${nota.tomador?.nome || '—'}${nota.tomador?.documento ? ` · ${formatarCpfCnpj(nota.tomador.documento)}` : ''}`} readOnly />}
            </Campo>
            <Campo label="Competência *">
              <input type="date" value={f.competencia} onChange={muda('competencia')} data-testid="nota-competencia" />
            </Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
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
          {servico && editavel && <p style={{ ...estilos.ajuda, margin: '-6px 0 0' }}>{servico.ctrib_nac_descricao}</p>}
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
          <details open={RETENCOES.some(([c]) => Number(f[c]) > 0)}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--texto-2)' }}>Retenções federais (órgão público, hospitais e grandes empresas)</summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 10 }}>
              {RETENCOES.map(([c, r]) => <Campo key={c} label={r}><CampoMoeda value={f[c]} onChange={(v) => setF({ ...f, [c]: v })} /></Campo>)}
            </div>
          </details>
          <Campo label="Informações complementares">
            <textarea rows={2} value={f.observacoes} onChange={muda('observacoes')} maxLength={2000} placeholder="Opcional: dados bancários, nº do empenho, da medição…" />
          </Campo>
        </fieldset>

        <div style={{ display: 'flex', gap: 18, justifyContent: 'flex-end', alignItems: 'baseline', margin: '14px 0 4px', fontSize: 13, color: 'var(--texto-2)', flexWrap: 'wrap' }}>
          <span>Base: <b>{formatarMoeda(totais.base)}</b></span>
          <span>ISS: <b>{formatarMoeda(editavel ? totais.iss : nota.valor_iss)}</b>{f.iss_retido ? ' (retido)' : ''}</span>
          <span style={{ fontSize: 16 }}>Líquido: <b style={{ color: 'var(--ouro)' }}>{formatarMoeda(editavel ? totais.liquido : nota.valor_liquido)}</b></span>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
          {nota.id && <button type="button" onClick={() => acoes.pdf(nota)} style={estilos.btnSecundario}><FileDown size={13} /> PDF</button>}
          {nota.id && <button type="button" onClick={() => acoes.imprimir(nota)} style={estilos.btnSecundario}><Printer size={13} /> Imprimir</button>}
          {nota.tem_xml && <button type="button" onClick={() => acoes.xml(nota)} style={estilos.btnSecundario}><FileCode size={13} /> XML</button>}
          {nota.id && !editavel && <button type="button" onClick={() => acoes.email(nota)} style={estilos.btnSecundario}><Mail size={13} /> E-mail</button>}
          {nota.id && <button type="button" onClick={() => acoes.duplicar(nota)} style={estilos.btnSecundario}><Copy size={13} /> Duplicar</button>}
          {nota.situacao === 'emitida' && <button type="button" onClick={() => acoes.cancelar(nota)} style={{ ...estilos.btnSecundario, color: '#b04040' }}><Ban size={13} /> Cancelar nota</button>}
          {editavel && nota.id && <button type="button" onClick={() => acoes.emitir(nota)} style={estilos.btnSecundario}><Send size={13} /> Emitir</button>}
          {editavel && <button type="submit" disabled={salvando} style={estilos.btnPrimario} data-testid="salvar-nota">{salvando ? 'Salvando…' : 'Salvar rascunho'}</button>}
          {!editavel && <button type="button" onClick={onFechar} style={estilos.btnPrimario}>Fechar</button>}
        </div>
      </form>
    </Modal>
  );
}

// ── Duplicar (clonador) ────────────────────────────────────────────────────

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
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Duplicar ${nota.numero ? `a nota nº ${nota.numero}` : 'o rascunho'}`} onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>A cópia vira <b>rascunho</b> com o mesmo serviço, descrição, valores e retenções, e a competência de hoje.
        Depois é só ajustar o que mudou e emitir.</p>
      <label style={opcao}><input type="radio" checked={!varios} onChange={() => setVarios(false)} style={{ width: 'auto' }} />
        Para o mesmo cliente{nota.tomador_nome || nota.tomador?.nome ? ` (${nota.tomador_nome || nota.tomador?.nome})` : ''} — abre a cópia para editar</label>
      <label style={opcao}><input type="radio" checked={varios} onChange={() => setVarios(true)} style={{ width: 'auto' }} data-testid="duplicar-varios" />
        <Users size={14} /> Para outros clientes (uma cópia para cada)</label>
      {varios && (
        <div style={{ marginTop: 8 }}>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar clientes" />
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8, border: '1px solid var(--borda)', borderRadius: 8 }}>
            {visiveis.map(c => (
              <label key={c.id} style={{ ...opcao, padding: '6px 10px', margin: 0, borderTop: '1px solid var(--borda)' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={marcados.has(c.id)}
                  onChange={(e) => { const s = new Set(marcados); if (e.target.checked) s.add(c.id); else s.delete(c.id); setMarcados(s); }} />
                <span style={{ flex: 1 }}>{c.nome}</span><span style={sub}>{c.documento ? formatarCpfCnpj(c.documento) : ''}</span>
              </label>
            ))}
          </div>
          <p style={{ ...estilos.ajuda, margin: '6px 0 0' }}>{marcados.size} cliente(s) marcado(s).</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
        <button type="button" onClick={confirmar} disabled={enviando} style={estilos.btnPrimario} data-testid="confirmar-duplicar"><Copy size={13} /> {enviando ? 'Duplicando…' : 'Duplicar'}</button>
      </div>
    </Modal>
  );
}

// ── Emitir (até a etapa 2: pelo Emissor Nacional + importação do XML) ─────

function ModalEmitir({ nota, onFechar, onImportar }) {
  const [n, setN] = useState(null);
  useEffect(() => { getNotaFiscal(nota.id).then(r => setN(r.data)).catch(() => toast.error('Erro ao abrir o rascunho')); }, [nota.id]);
  const copiar = (texto, oque) => navigator.clipboard.writeText(texto).then(() => toast.success(`${oque} copiado`)).catch(() => toast.error('Não deu para copiar'));
  return (
    <Modal titulo="Emitir a nota" onFechar={onFechar} largura={600}>
      <p style={estilos.ajuda}>
        A emissão direta pelo sistema entra quando o <b>certificado digital A1</b> da H&M for instalado. Até lá, o caminho é este:
      </p>
      <ol style={{ ...estilos.ajuda, paddingLeft: 20 }}>
        <li>Abra o <a href={EMISSOR_NACIONAL} target="_blank" rel="noreferrer" style={estilos.link}>Emissor Nacional <ExternalLink size={11} /></a> e entre com o gov.br da empresa.</li>
        <li>Preencha com os dados abaixo (os botões copiam cada um).</li>
        <li>Depois de emitir, baixe o <b>XML</b> da nota no portal e use <b>Importar XML</b> aqui: este rascunho vira a nota emitida, com número e chave.</li>
      </ol>
      {n && (
        <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
          <Linha rotulo="Tomador" valor={`${n.tomador?.nome || ''} · ${formatarCpfCnpj(n.tomador?.documento || '')}`} copiar={() => copiar(n.tomador?.documento || '', 'CPF/CNPJ')} />
          <Linha rotulo="Código de tributação" valor={formatarCtribNac(n.ctrib_nac)} copiar={() => copiar(formatarCtribNac(n.ctrib_nac), 'Código')} />
          <Linha rotulo="Competência" valor={formatarData(n.competencia)} />
          <Linha rotulo="Valor" valor={formatarMoeda(n.valor_servicos)} copiar={() => copiar(Number(n.valor_servicos).toFixed(2).replace('.', ','), 'Valor')} />
          <Linha rotulo="Discriminação" valor={n.discriminacao} copiar={() => copiar(n.discriminacao, 'Descrição')} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Fechar</button>
        <button type="button" onClick={onImportar} style={estilos.btnPrimario}><Upload size={13} /> Já emiti — importar XML</button>
      </div>
    </Modal>
  );
}

function Linha({ rotulo, valor, copiar }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 8, alignItems: 'start', padding: '6px 10px', background: 'var(--superficie-2)', borderRadius: 6 }}>
      <span style={{ color: 'var(--texto-3)' }}>{rotulo}</span>
      <span style={{ whiteSpace: 'pre-wrap' }}>{valor}</span>
      {copiar ? <button type="button" onClick={copiar} style={{ ...estilos.btnIcone, width: 26, height: 26 }} title="Copiar"><Copy size={12} /></button> : <span />}
    </div>
  );
}

// ── E-mail, cancelamento, importação ───────────────────────────────────────

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
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal titulo={`Enviar a NFS-e nº ${nota.numero} por e-mail`} onFechar={onFechar} largura={480}>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 12 }}>
        <Campo label="Para (até 5, separados por vírgula) *">
          <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="financeiro@cliente.com.br" autoFocus data-testid="email-para" />
        </Campo>
        <Campo label="Mensagem (opcional)">
          <textarea rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Em branco: mensagem padrão com número e valor da nota" />
        </Campo>
        <p style={{ ...estilos.ajuda, margin: 0 }}>Vão anexados o PDF da nota{nota.tem_xml ? ' e o XML' : ''}. A assinatura da empresa entra no final.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando} style={estilos.btnPrimario}><Send size={13} /> {enviando ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </form>
    </Modal>
  );
}

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
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal titulo={`Cancelar a NFS-e nº ${nota.numero}`} onFechar={onFechar} largura={500}>
      <div style={{ ...estilos.ajuda, color: '#d9a53a', background: '#1a150a', border: '1px solid #4a3a1a', padding: '8px 12px', borderRadius: 8 }}>
        O sistema ainda não cancela direto na Receita: cancele primeiro no {nota.padrao === 'abrasf' ? 'ISSnet (ou pelo SYSB1)' : 'Emissor Nacional'} e depois registre aqui.
        Se tiver o XML do evento de cancelamento, pode só importá-lo.
      </div>
      <form onSubmit={confirmar} style={{ display: 'grid', gap: 12 }}>
        <Campo label="Motivo do cancelamento *">
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255} placeholder="Ex.: erro no valor do serviço; nota substituída pela nº …" autoFocus />
        </Campo>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Voltar</button>
          <button type="submit" disabled={enviando} style={{ ...estilos.btnPrimario, background: '#b04040', color: '#fff' }}><Ban size={13} /> {enviando ? 'Registrando…' : 'Registrar cancelamento'}</button>
        </div>
      </form>
    </Modal>
  );
}

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
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal titulo="Importar notas já emitidas" onFechar={onFechar} largura={560}>
      <p style={estilos.ajuda}>
        Aceita o XML das notas do <b>SYSB1/ISSnet</b> (exportação de XML do SYSB1) e do <b>Emissor Nacional</b> (inclusive o XML do evento de cancelamento),
        um por arquivo, vários de uma vez ou num .zip. Importar de novo a mesma nota só atualiza. Cliente que ainda não está no cadastro é criado com os dados da nota.
      </p>
      {!resumo && (
        <>
          <input type="file" multiple accept=".xml,.zip,text/xml,application/xml,application/zip" onChange={(e) => setArquivos([...e.target.files])} data-testid="arquivos-xml" />
          <p style={{ ...estilos.ajuda, margin: '6px 0 0' }}>{arquivos.length} arquivo(s) escolhido(s).</p>
        </>
      )}
      {resumo && (
        <div style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.7 }} data-testid="resumo-importacao">
          <div><b>{resumo.importadas}</b> nota(s) nova(s) · <b>{resumo.atualizadas}</b> atualizada(s){resumo.rascunhos_emitidos ? <> · <b>{resumo.rascunhos_emitidos}</b> rascunho(s) viraram nota emitida</> : null}{resumo.canceladas ? <> · <b>{resumo.canceladas}</b> cancelamento(s)</> : null}</div>
          {resumo.clientes_criados.length > 0 && <div>Clientes criados: {resumo.clientes_criados.join('; ')}</div>}
          {resumo.erros.length > 0 && (
            <div style={{ color: '#d9a53a', marginTop: 6 }}>
              {resumo.erros.length} aviso(s):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, maxHeight: 180, overflowY: 'auto' }}>{resumo.erros.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>{resumo ? 'Fechar' : 'Voltar'}</button>
        {!resumo && <button type="button" onClick={enviar} disabled={enviando} style={estilos.btnPrimario} data-testid="enviar-xml"><Upload size={13} /> {enviando ? 'Importando…' : 'Importar'}</button>}
      </div>
    </Modal>
  );
}

const sub = { fontSize: 11.5, color: 'var(--texto-3)', marginTop: 2 };
const selo = { display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', border: '1px solid', borderRadius: 999 };
const opcao = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)', margin: '6px 0', cursor: 'pointer' };
