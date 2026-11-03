import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Printer, Mail, Copy, Ban, Send, FileCode, ScanEye } from 'lucide-react';
import { getNotaFiscal, criarNotaFiscal, atualizarNotaFiscal, getEmpresaFiscal, buscarMunicipios } from '../../services/api';
import Select from '../../components/Select';
import Modal from '../../components/ui/Modal';
import CampoMoeda from '../../components/CampoMoeda';
import ClienteSelect, { useClientes } from '../../components/ClienteSelect';
import BuscaCodigo, { formatarCtribNac } from '../../components/fiscal/BuscaCodigo';
import { estilos, Campo } from '../../components/ui/estilos';
import { formatarMoeda, formatarCpfCnpj, dataHoraBr, FUSO_BRASILIA } from '../../utils/format';
import { SITUACOES } from './comum';

const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

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

export function ModalNota({ abrir, onFechar, onSalvo, acoes }) {
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
          <div>Emitida em {dataHoraBr(nota.data_emissao, { fuso: FUSO_BRASILIA })}{nota.origem === 'importada' ? ` · importada (${nota.padrao === 'abrasf' ? 'ISSnet/SYSB1' : 'Emissor Nacional'})` : ''}</div>
          {nota.situacao === 'cancelada' && <div style={{ color: 'var(--perigo)', marginTop: 4, fontWeight: 500 }}>Cancelada em {dataHoraBr(nota.cancelada_em, { fuso: FUSO_BRASILIA })}: {nota.motivo_cancelamento}</div>}
          <div style={{ color: 'var(--texto-3)', marginTop: 4 }}>Nota emitida não pode ser editada — use <b>Duplicar</b> para refazer com outro valor ou data.</div>
        </div>
      )}
      {nota.origem_numero && <p style={{ ...estilos.ajuda, marginBottom: 10 }}>Cópia da nota nº {nota.origem_numero}.</p>}

      {/* ações rápidas para nota emitida (no topo, proeminentes) */}
      {!editavel && nota.id && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--texto-3)', alignSelf: 'center', marginRight: 4 }}>Ações:</span>
          <button type="button" onClick={() => acoes.previa(nota)} style={estilos.btnSecundario}><ScanEye size={13} /> Prévia</button>
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
            {nota.id && (
              <button type="button" onClick={() => acoes.previa(nota)} style={estilos.btnSecundario}><ScanEye size={13} /> Prévia</button>
            )}
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
