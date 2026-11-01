import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Plus, Pencil, Trash2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getEmpresaFiscal, salvarEmpresaFiscal, criarServicoEmpresa, atualizarServicoEmpresa, removerServicoEmpresa,
  buscarServicosNacionais, buscarNbs, buscarMunicipios,
} from '../services/api';
import Select from '../components/Select';
import Modal from '../components/ui/Modal';
import { estilos, Campo } from '../components/ui/estilos';
import BuscaCodigo, { formatarCtribNac, formatarNbs, formatarCnae } from '../components/fiscal/BuscaCodigo';

// Dados fiscais da H&M para a NFS-e Padrão Nacional (versão 2.4, etapa 1 —
// só cadastro; a emissão vem na etapa 2). Aba "Dados fiscais" do hub de
// Cadastros, só administrador. Razão social, CNPJ e endereço vêm do papel
// timbrado (skills/_comum/empresa.js) e aparecem só para conferência.

const SIMPLES = [
  { v: 3, t: 'ME/EPP optante do Simples Nacional' },
  { v: 2, t: 'MEI' },
  { v: 1, t: 'Não optante' },
];
const APURACAO = [
  { v: 1, t: 'Tributos federais e ISS pelo Simples (DAS)' },
  { v: 2, t: 'Federais pelo Simples; ISS fora do Simples' },
  { v: 3, t: 'Federais e ISS fora do Simples' },
];
const REG_ESPECIAL = [
  { v: 0, t: 'Nenhum' },
  { v: 1, t: 'Ato cooperado' },
  { v: 2, t: 'Estimativa' },
  { v: 3, t: 'Microempresa municipal' },
  { v: 4, t: 'Notário ou registrador' },
  { v: 5, t: 'Profissional autônomo' },
  { v: 6, t: 'Sociedade de profissionais' },
];

const buscarMunicipio = (t) => buscarMunicipios(t);

export default function DadosFiscais() {
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [servicoEditado, setServicoEditado] = useState(null); // {} = novo
  const [verCnaes, setVerCnaes] = useState(false);

  const aplicar = (d) => {
    setDados(d);
    setForm({
      inscricao_municipal: d.inscricao_municipal || '',
      municipio: d.codigo_municipio ? { codigo: d.codigo_municipio, descricao: `${d.municipio}-${d.uf}` } : null,
      op_simp_nac: d.op_simp_nac, reg_ap_trib_sn: d.reg_ap_trib_sn, reg_esp_trib: d.reg_esp_trib,
      ambiente: d.ambiente, serie_dps: d.serie_dps, proximo_numero_dps: d.proximo_numero_dps,
      cnae_principal: d.cnae_principal || '', cnae_principal_descricao: d.cnae_principal_descricao || '',
      cnaes_secundarios: d.cnaes_secundarios || [],
    });
  };

  const carregar = useCallback(() => getEmpresaFiscal().then(r => aplicar(r.data))
    .catch(e => toast.error(e.response?.data?.erro || 'Erro ao carregar os dados fiscais')), []);
  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.municipio) { toast.error('Escolha o município'); return; }
    if (form.ambiente === 'producao' && dados.ambiente !== 'producao'
      && !window.confirm('Passar para PRODUÇÃO?\n\nNotas emitidas em produção valem de verdade (geram imposto). Só mude depois de testar em homologação.')) return;
    setSalvando(true);
    try {
      const { municipio, ...resto } = form;
      const r = await salvarEmpresaFiscal({ ...resto, codigo_municipio: municipio.codigo });
      aplicar(r.data);
      toast.success('Dados fiscais salvos');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function removerServico(s) {
    if (!window.confirm(`Remover o serviço "${s.nome}"?`)) return;
    try {
      await removerServicoEmpresa(s.id);
      toast.success('Serviço removido');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover');
    }
  }

  if (!form) return <p style={estilos.ajuda}>Carregando…</p>;
  const muda = (c) => (e) => setForm({ ...form, [c]: e.target.value });
  const cnaesDaEmpresa = [
    ...(form.cnae_principal ? [{ codigo: form.cnae_principal, descricao: form.cnae_principal_descricao, principal: true }] : []),
    ...form.cnaes_secundarios,
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, color: 'var(--ouro)', fontWeight: 700, margin: '0 0 6px' }}>Dados fiscais (NFS-e)</h2>
      <p style={estilos.ajuda}>
        O que a nota fiscal de serviço (NFS-e Padrão Nacional) pede da H&M. Desde 01/11/2026 a H&M, como empresa do Simples,
        emite pelo Emissor Nacional. Aqui fica só o cadastro: a emissão pelo sistema vem na próxima etapa.
      </p>

      {dados.pendencias.length > 0 ? (
        <div style={aviso('#d9a53a', '#1a150a', '#4a3a1a')} data-testid="pendencias-fiscais">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Falta para poder emitir:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{dados.pendencias.map(p => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      ) : (
        <div style={aviso('#3fb95f', '#0a1a0f', '#1a4a26')}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> Cadastro fiscal completo.
        </div>
      )}

      <form onSubmit={salvar}>
        <div style={estilos.card}>
          <h3 style={tituloCard}>Empresa (prestador)</h3>
          <div style={fixos}>
            <span>Razão social</span><strong>{dados.razao_social}</strong>
            <span>CNPJ</span><strong>{dados.cnpj}</strong>
            <span>Endereço</span><strong>{dados.endereco}</strong>
          </div>
          <div style={grade}>
            <Campo label="Inscrição Municipal (CF/DF)">
              <input value={form.inscricao_municipal} onChange={muda('inscricao_municipal')} placeholder="Só números" inputMode="numeric" maxLength={20} data-testid="fiscal-im" />
            </Campo>
            <Campo label="Município do prestador">
              <BuscaCodigo buscar={buscarMunicipio} valor={form.municipio} onEscolher={(m) => setForm({ ...form, municipio: m })} placeholder="Nome ou código IBGE" />
            </Campo>
            <Campo label="Situação no Simples Nacional">
              <Select value={form.op_simp_nac} onChange={(e) => setForm({ ...form, op_simp_nac: Number(e.target.value) })}>
                {SIMPLES.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
              </Select>
            </Campo>
            <Campo label="Regime de apuração (Simples)">
              <Select value={form.reg_ap_trib_sn} onChange={(e) => setForm({ ...form, reg_ap_trib_sn: Number(e.target.value) })} disabled={form.op_simp_nac !== 3}>
                {APURACAO.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
              </Select>
            </Campo>
            <Campo label="Regime especial de tributação">
              <Select value={form.reg_esp_trib} onChange={(e) => setForm({ ...form, reg_esp_trib: Number(e.target.value) })}>
                {REG_ESPECIAL.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
              </Select>
            </Campo>
          </div>
        </div>

        <div style={estilos.card}>
          <h3 style={tituloCard}>Numeração e ambiente</h3>
          <div style={grade}>
            <Campo label="Ambiente">
              <Select value={form.ambiente} onChange={muda('ambiente')} data-testid="fiscal-ambiente">
                <option value="homologacao">Homologação (teste, sem valor fiscal)</option>
                <option value="producao">Produção (nota de verdade)</option>
              </Select>
            </Campo>
            <Campo label="Série da DPS">
              <input value={form.serie_dps} onChange={muda('serie_dps')} inputMode="numeric" maxLength={5} />
            </Campo>
            <Campo label="Próximo número da DPS">
              <input type="number" min={1} value={form.proximo_numero_dps} onChange={muda('proximo_numero_dps')} />
            </Campo>
          </div>
          <p style={{ ...estilos.ajuda, margin: '10px 0 0' }}>
            A DPS é o pedido de nota que o sistema manda ao Emissor Nacional; cada uma tem série e número próprios, sem repetir.
            Confirme a série com o contador antes da primeira emissão.
          </p>
        </div>

        <div style={estilos.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ ...tituloCard, flex: 1, margin: 0 }}>Atividades (CNAE)</h3>
            <button type="button" onClick={() => setVerCnaes(!verCnaes)} style={estilos.btnSecundario}>
              {verCnaes ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {verCnaes ? 'Recolher' : `Ver as ${cnaesDaEmpresa.length}`}
            </button>
          </div>
          <p style={{ ...estilos.ajuda, margin: '8px 0 0' }}>
            Principal: <code>{formatarCnae(form.cnae_principal)}</code> {form.cnae_principal_descricao} · {form.cnaes_secundarios.length} secundárias
            (do cartão CNPJ de 31/10/2026).
          </p>
          {verCnaes && <ListaCnaes form={form} setForm={setForm} />}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button type="submit" disabled={salvando} style={estilos.btnPrimario} data-testid="salvar-fiscal">
            {salvando ? 'Salvando…' : 'Salvar dados fiscais'}
          </button>
        </div>
      </form>

      <div style={estilos.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h3 style={{ ...tituloCard, flex: 1, margin: 0 }}>Serviços que a H&M fatura</h3>
          <button type="button" onClick={() => setServicoEditado({})} style={estilos.btnPrimario} data-testid="novo-servico-fiscal">
            <Plus size={14} /> Novo serviço
          </button>
        </div>
        <p style={estilos.ajuda}>
          Cada nota escolhe um destes. O código de tributação nacional vem da lista oficial (LC 116); confirme com o contador qual
          usar em cada tipo de serviço (ex.: 07.01.01 engenharia, 07.02.02 execução de obra por empreitada, 07.03.02 projetos).
        </p>
        <div style={estilos.caixaTabela}>
          <table style={estilos.tabela}>
            <thead>
              <tr>
                <th style={estilos.th}>Serviço</th>
                <th style={estilos.th}>Cód. nacional</th>
                <th style={estilos.th}>NBS</th>
                <th style={estilos.th}>CNAE</th>
                <th style={estilos.th}>ISS</th>
                <th style={{ ...estilos.th, width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {dados.servicos.length === 0 && <tr><td colSpan={6} style={estilos.tdVazio}>Nenhum serviço cadastrado</td></tr>}
              {dados.servicos.map(s => (
                <tr key={s.id} style={estilos.linhaTabela}>
                  <td style={estilos.td}>
                    {s.padrao && <Star size={12} fill="currentColor" style={{ color: 'var(--ouro)', marginRight: 6 }} title="Padrão" />}
                    {s.nome}
                  </td>
                  <td style={estilos.td} title={s.ctrib_nac_descricao}><code>{formatarCtribNac(s.ctrib_nac)}</code></td>
                  <td style={estilos.td} title={s.nbs_descricao || ''}><code>{s.nbs ? formatarNbs(s.nbs) : '—'}</code></td>
                  <td style={estilos.td}>
                    <code>{s.cnae ? formatarCnae(s.cnae) : '—'}</code>
                    {s.cnae && <div style={{ fontSize: 11.5, color: 'var(--texto-3)', maxWidth: 260 }}>{cnaesDaEmpresa.find(c => c.codigo === s.cnae)?.descricao}</div>}
                  </td>
                  <td style={estilos.td}>{s.aliquota_iss != null ? `${String(s.aliquota_iss).replace('.', ',')}%` : '—'}</td>
                  <td style={{ ...estilos.td, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => setServicoEditado(s)} style={estilos.btnIcone} title="Editar"><Pencil size={13} /></button>
                    <button type="button" onClick={() => removerServico(s)} style={{ ...estilos.btnIcone, color: '#b04040' }} title="Remover"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {servicoEditado && (
        <ModalServico
          servico={servicoEditado}
          cnaes={cnaesDaEmpresa}
          onFechar={() => setServicoEditado(null)}
          onSalvo={() => { setServicoEditado(null); carregar(); }}
        />
      )}
    </div>
  );
}

// CNAEs: principal e secundárias, com inclusão e remoção (vale quando a
// empresa altera as atividades na Receita).
function ListaCnaes({ form, setForm }) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const incluir = () => {
    const c = codigo.replace(/\D/g, '');
    if (c.length !== 7) { toast.error('CNAE tem 7 dígitos (ex.: 71.12-0-00)'); return; }
    if (c === form.cnae_principal || form.cnaes_secundarios.some(s => s.codigo === c)) { toast.error('Esse CNAE já está na lista'); return; }
    setForm({ ...form, cnaes_secundarios: [...form.cnaes_secundarios, { codigo: c, descricao: descricao.trim() }] });
    setCodigo(''); setDescricao('');
  };
  return (
    <div style={{ marginTop: 12 }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflowY: 'auto', fontSize: 12.5 }}>
        <li style={linhaCnae}><code>{formatarCnae(form.cnae_principal)}</code><span style={{ flex: 1 }}>{form.cnae_principal_descricao} <em style={{ color: 'var(--ouro)' }}>(principal)</em></span></li>
        {form.cnaes_secundarios.map(s => (
          <li key={s.codigo} style={linhaCnae}>
            <code>{formatarCnae(s.codigo)}</code><span style={{ flex: 1 }}>{s.descricao}</span>
            <button type="button" style={{ ...estilos.btnIcone, width: 24, height: 24 }} title="Tirar da lista"
              onClick={() => setForm({ ...form, cnaes_secundarios: form.cnaes_secundarios.filter(x => x.codigo !== s.codigo) })}>
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8, marginTop: 10 }}>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="00.00-0-00" maxLength={10} />
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição da atividade" maxLength={200} />
        <button type="button" onClick={incluir} style={estilos.btnSecundario}><Plus size={13} /> Incluir</button>
      </div>
      <p style={{ ...estilos.ajuda, margin: '8px 0 0' }}>Mudanças na lista valem depois de “Salvar dados fiscais”.</p>
    </div>
  );
}

function ModalServico({ servico, cnaes, onFechar, onSalvo }) {
  const novo = !servico.id;
  const [f, setF] = useState({
    nome: servico.nome || '',
    ctrib: servico.ctrib_nac ? { codigo: servico.ctrib_nac, descricao: servico.ctrib_nac_descricao } : null,
    nbs: servico.nbs ? { codigo: servico.nbs, descricao: servico.nbs_descricao } : null,
    cnae: servico.cnae || '',
    ctrib_mun: servico.ctrib_mun || '',
    aliquota_iss: servico.aliquota_iss != null ? String(servico.aliquota_iss).replace('.', ',') : '',
    descricao_padrao: servico.descricao_padrao || '',
    padrao: !!servico.padrao,
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (!f.nome.trim()) { toast.error('Dê um nome ao serviço'); return; }
    if (!f.ctrib) { toast.error('Escolha o código de tributação nacional'); return; }
    setSalvando(true);
    const corpo = {
      nome: f.nome, ctrib_nac: f.ctrib.codigo, nbs: f.nbs?.codigo || null, cnae: f.cnae || null,
      ctrib_mun: f.ctrib_mun, aliquota_iss: f.aliquota_iss, descricao_padrao: f.descricao_padrao, padrao: f.padrao,
    };
    try {
      if (novo) await criarServicoEmpresa(corpo); else await atualizarServicoEmpresa(servico.id, corpo);
      toast.success(novo ? 'Serviço cadastrado' : 'Serviço atualizado');
      onSalvo();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar o serviço');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={novo ? 'Novo serviço' : 'Editar serviço'} onFechar={onFechar} largura={640}>
      <form onSubmit={salvar} style={{ display: 'grid', gap: 12 }}>
        <Campo label="Nome (como aparece para escolher na nota) *">
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Projeto elétrico" maxLength={100} autoFocus data-testid="servico-nome" />
        </Campo>
        <Campo label="Código de tributação nacional (LC 116) *">
          <BuscaCodigo buscar={buscarServicosNacionais} valor={f.ctrib} onEscolher={(v) => setF({ ...f, ctrib: v })}
            formatar={formatarCtribNac} placeholder="Ex.: engenharia, projeto, 07.02" testid="servico-ctrib" />
        </Campo>
        <Campo label="NBS (obrigatória com IBS/CBS a partir de 2027)">
          <BuscaCodigo buscar={buscarNbs} valor={f.nbs} onEscolher={(v) => setF({ ...f, nbs: v })}
            formatar={formatarNbs} placeholder="Ex.: engenharia para projetos, 1.1403" testid="servico-nbs" />
        </Campo>
        <Campo label="CNAE da atividade (as do cartão CNPJ — as que combinam com o código vêm primeiro)">
          <EscolhaCnae cnaes={cnaes} ctribNac={f.ctrib?.codigo} valor={f.cnae} onEscolher={(c) => setF({ ...f, cnae: c })} />
        </Campo>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo label="Cód. municipal">
            <input value={f.ctrib_mun} onChange={(e) => setF({ ...f, ctrib_mun: e.target.value.replace(/\D/g, '') })} maxLength={3} placeholder="opcional" />
          </Campo>
          <Campo label="Alíquota ISS (%)">
            <input value={f.aliquota_iss} onChange={(e) => setF({ ...f, aliquota_iss: e.target.value })} inputMode="decimal" placeholder="ex.: 2,00" />
          </Campo>
        </div>
        <Campo label="Descrição padrão do serviço na nota">
          <textarea rows={3} value={f.descricao_padrao} onChange={(e) => setF({ ...f, descricao_padrao: e.target.value })} maxLength={2000}
            placeholder="Texto que a nota já traz preenchido (dá para mudar em cada nota)" />
        </Campo>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)' }}>
          <input type="checkbox" checked={f.padrao} onChange={(e) => setF({ ...f, padrao: e.target.checked })} style={{ width: 'auto' }} />
          Serviço padrão (a nota já abre com ele)
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Cancelar</button>
          <button type="submit" disabled={salvando} style={estilos.btnPrimario} data-testid="salvar-servico">{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// CNAE × código de tributação (LC 116): divisões da CNAE que costumam
// corresponder a cada subitem — só ordena a lista (sugestão), não restringe.
// 07.01/07.03 engenharia e projetos → 71; 07.02/07.04/07.05 obras e
// instalações → 41–43; 14.xx manutenção/instalação de equipamentos → 33, 43, 95;
// 01.xx informática → 62, 95; 08.02 treinamento → 85.
const CNAE_POR_SUBITEM = {
  '0701': ['71'], '0702': ['41', '42', '43'], '0703': ['71'], '0704': ['43'], '0705': ['42', '43'],
  '0719': ['42', '43'], '1401': ['33', '95'], '1402': ['33', '95'], '1406': ['43', '33'],
  '0101': ['62'], '0103': ['62', '63'], '0106': ['62'], '0107': ['62', '95'], '0802': ['85'],
};
function cnaesSugeridos(ctribNac) {
  const c = String(ctribNac || '');
  return CNAE_POR_SUBITEM[c.slice(0, 4)] || (c.startsWith('07') ? ['41', '42', '43', '71'] : []);
}

// Lista das atividades da empresa com código e descrição, com busca; as que
// combinam com o código de tributação escolhido aparecem primeiro.
function EscolhaCnae({ cnaes, ctribNac, valor, onEscolher }) {
  const [filtro, setFiltro] = useState('');
  const divisoes = cnaesSugeridos(ctribNac);
  const casa = (c) => !filtro || c.codigo.includes(filtro.replace(/D/g, '') || '§') || c.descricao.toLowerCase().includes(filtro.toLowerCase());
  const sugeridas = cnaes.filter(c => divisoes.some(d => c.codigo.startsWith(d)) && casa(c));
  const outras = cnaes.filter(c => !divisoes.some(d => c.codigo.startsWith(d)) && casa(c));
  const escolhida = cnaes.find(c => c.codigo === valor);
  const linha = (c) => (
    <button type="button" key={c.codigo} onClick={() => onEscolher(c.codigo)} data-testid={`cnae-${c.codigo}`}
      style={{ ...itemCnae, ...(c.codigo === valor ? { background: 'var(--superficie-2)', color: 'var(--ouro)' } : {}) }}>
      <code style={{ minWidth: 86 }}>{formatarCnae(c.codigo)}</code><span style={{ flex: 1 }}>{c.descricao}</span>
      {c.principal && <em style={{ color: 'var(--ouro)', fontSize: 11 }}>principal</em>}
    </button>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 12.5, color: 'var(--texto-2)' }}>
        <span style={{ flex: 1 }}>{escolhida ? <>Escolhida: <code>{formatarCnae(escolhida.codigo)}</code> {escolhida.descricao}</> : 'Nenhuma (a nota sai sem CNAE)'}</span>
        {valor && <button type="button" onClick={() => onEscolher('')} style={estilos.btnSecundario}>Não informar</button>}
      </div>
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por código ou palavra (ex.: elétrica, 43.21)" />
      <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 6, border: '1px solid var(--borda)', borderRadius: 8 }}>
        {sugeridas.length > 0 && <div style={grupoCnae}>Combinam com o código {ctribNac ? formatarCtribNac(ctribNac) : ''}</div>}
        {sugeridas.map(linha)}
        {outras.length > 0 && <div style={grupoCnae}>{sugeridas.length ? 'Demais atividades da empresa' : 'Atividades da empresa'}</div>}
        {outras.map(linha)}
        {!sugeridas.length && !outras.length && <div style={{ ...grupoCnae, textTransform: 'none' }}>Nenhuma atividade com esse filtro</div>}
      </div>
    </div>
  );
}
const itemCnae = {
  display: 'flex', gap: 10, alignItems: 'baseline', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12.5,
  background: 'transparent', border: 0, borderTop: '1px solid var(--borda)', color: 'var(--texto-2)', cursor: 'pointer',
};
const grupoCnae = { padding: '6px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--texto-3)', background: 'var(--superficie-2)' };

const tituloCard = { fontSize: 14, color: 'var(--texto)', fontWeight: 700, margin: '0 0 12px' };
const grade = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 };
const fixos = {
  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: 12.5, color: 'var(--texto-3)',
  padding: '10px 12px', marginBottom: 14, borderRadius: 8, background: 'var(--superficie-2)',
};
const linhaCnae = { display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--borda)', color: 'var(--texto-2)' };
const aviso = (cor, bg, borda) => ({
  display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16, borderRadius: 10, fontSize: 13,
  color: cor, background: bg, border: `1px solid ${borda}`, lineHeight: 1.5,
});
