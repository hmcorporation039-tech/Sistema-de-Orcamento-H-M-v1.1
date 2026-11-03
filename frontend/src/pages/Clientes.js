import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useUltimoPedido from '../hooks/useUltimoPedido';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getClientes, criarCliente, atualizarCliente, removerCliente, getPastaCliente, abrirPastaCliente, getOpcoesPastaCliente, ligarPastaCliente,
  consultarCep, buscarMunicipios,
} from '../services/api';
import BuscaCodigo, { formatarCep } from '../components/fiscal/BuscaCodigo';
import PainelPasta from '../components/PainelPasta';
import { AvisoNovidades } from '../components/NovidadesPastas';
import Paginacao from '../components/Paginacao';
import { formatarTelefone, formatarCpfCnpj, validarCpf, validarCnpj, validarCpfCnpj } from '../utils/format';
import Select from '../components/Select';
import Modal from '../components/ui/Modal';
import { invalidarCacheClientes } from '../components/ClienteSelect';
import { estilos, Campo } from '../components/ui/estilos';

// 2.4: dados para a NFS-e (tomador) — endereço em campos com o município do
// IBGE, inscrições, e-mail para a nota e retenção do ISS
const VAZIO_FISCAL = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: null,
  inscricao_municipal: '', inscricao_estadual: '', email_nota: '', retem_iss: false,
};
const VAZIO = { nome: '', documento: '', tipo: 'Empresa', responsavel: '', telefone: '', email: '', endereco: '', ...VAZIO_FISCAL };

// O que falta no cliente para sair uma NFS-e para ele (mostrado na lista).
function pendenciasNota(c) {
  const p = [];
  const doc = String(c.documento || '').replace(/\D/g, '');
  if (!validarCpfCnpj(doc)) p.push('CPF/CNPJ válido');
  if (!c.cep) p.push('CEP');
  if (!c.logradouro) p.push('logradouro');
  if (!c.codigo_municipio) p.push('município');
  if (!c.email_nota && !c.email) p.push('e-mail');
  return p;
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
  // 2.3: pasta do cliente (servidor) com as novidades — ?pasta=ID abre direto (vindo do sininho do topo)
  const [parametros] = useSearchParams();
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin'; // excluir cliente: só administrador (o servidor confere)
  const [pastaDe, setPastaDe] = useState(null);
  useEffect(() => { const id = Number(parametros.get('pasta')); if (id) setPastaDe({ id, nome: '' }); }, [parametros]);

  const novoPedido = useUltimoPedido();
  const carregar = useCallback(async () => {
    const vale = novoPedido(); // resposta de busca antiga não sobrescreve a atual
    setCarregando(true);
    try {
      const res = await getClientes({ ...(busca ? { busca } : {}), pagina });
      if (!vale()) return;
      setClientes(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
    } catch {
      if (vale()) toast.error('Erro ao carregar clientes');
    } finally {
      if (vale()) setCarregando(false);
    }
  }, [busca, pagina, novoPedido]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(cliente) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome || '', documento: cliente.documento || '', tipo: cliente.tipo || 'Empresa',
      responsavel: cliente.responsavel || '', telefone: cliente.telefone || '',
      email: cliente.email || '', endereco: cliente.endereco || '',
      cep: formatarCep(cliente.cep), logradouro: cliente.logradouro || '', numero: cliente.numero || '',
      complemento: cliente.complemento || '', bairro: cliente.bairro || '',
      municipio: cliente.codigo_municipio ? { codigo: cliente.codigo_municipio, descricao: cliente.municipio_uf || cliente.codigo_municipio } : null,
      inscricao_municipal: cliente.inscricao_municipal || '', inscricao_estadual: cliente.inscricao_estadual || '',
      email_nota: cliente.email_nota || '', retem_iss: !!cliente.retem_iss,
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (form.documento.trim()) {
      const digitos = form.documento.replace(/\D/g, '');
      if (form.tipo === 'Pessoa Física') {
        if (digitos.length !== 11 || !validarCpf(digitos)) {
          toast.error('CPF inválido');
          return;
        }
      } else if (digitos.length !== 14 || !validarCnpj(digitos)) {
        toast.error('CNPJ inválido');
        return;
      }
    }
    setSalvando(true);
    const { municipio, ...resto } = form;
    const corpo = { ...resto, codigo_municipio: municipio?.codigo || null };
    try {
      if (editandoId) {
        await atualizarCliente(editandoId, corpo);
        toast.success('Cliente atualizado');
      } else {
        await criarCliente(corpo);
        toast.success('Cliente cadastrado');
      }
      setModalAberto(false);
      invalidarCacheClientes(); // as listas de cliente das outras telas recarregam
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cliente) {
    if (!window.confirm(`Remover o cliente "${cliente.nome}"?`)) return;
    try {
      await removerCliente(cliente.id);
      toast.success('Cliente removido');
      invalidarCacheClientes();
      carregar();
    } catch {
      toast.error('Erro ao remover cliente');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Clientes</h2>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--texto-3)' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, documento ou e-mail..."
            style={{ paddingLeft: 30 }}
          />
        </div>

        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Nome</th>
              <th style={th}>Tipo</th>
              <th style={th}>Documento</th>
              <th style={th}>Responsável</th>
              <th style={th}>Telefone</th>
              <th style={th}>E-mail</th>
              <th style={th} title="Cadastro pronto para emitir nota fiscal de serviço">NFS-e</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={8} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && clientes.length === 0 && (
              <tr><td colSpan={8} style={tdVazio}>Nenhum cliente encontrado</td></tr>
            )}
            {!carregando && clientes.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{c.nome}</td>
                <td style={td}>{c.tipo}</td>
                <td style={td}>{formatarCpfCnpj(c.documento) || '—'}</td>
                <td style={td}>{c.responsavel || '—'}</td>
                <td style={td}>{formatarTelefone(c.telefone) || '—'}</td>
                <td style={td}>{c.email || '—'}</td>
                <td style={td}><SeloNota pendencias={pendenciasNota(c)} /></td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => setPastaDe({ id: c.id, nome: c.nome })} style={btnIcone} title="Pasta do cliente (tudo dele: obras, projetos, propostas e o que ele mandar)" data-testid="pasta-cliente">
                    <FolderOpen size={13} />
                  </button>
                  <button onClick={() => abrirEdicao(c)} style={btnIcone} title="Editar">
                    <Pencil size={13} />
                  </button>
                  {ehAdmin && (
                    <button onClick={() => excluir(c)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {pastaDe && (
        // cabeçalho próprio (X menor, com fundo) — mantido como era
        <Modal onFechar={() => setPastaDe(null)} largura="95%" maxWidth={900} testid="modal-pasta-cliente" rotulo="Pasta do cliente">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, margin: 0, flex: 1 }}>Pasta do cliente{pastaDe.nome ? ` — ${pastaDe.nome}` : ''}</h3>
              <button onClick={() => setPastaDe(null)} style={btnIcone} title="Fechar"><X size={14} /></button>
            </div>
            <p style={{ color: 'var(--texto-3)', fontSize: 12, margin: '0 0 8px', lineHeight: 1.6 }}>
              Tudo deste cliente fica aqui (no servidor): obras, projetos, laudos, propostas e contratos gerados pelo sistema. O que o cliente mandar,
              salve em <code>Recebidos do cliente</code> (ou na pasta da obra) — o sistema procura arquivos novos e alterados e avisa.
            </p>
            <PastaDoCliente id={pastaDe.id} ehAdmin={ehAdmin} />
            <AvisoNovidades clienteId={pastaDe.id} sempre />
        </Modal>
      )}

      {modalAberto && (
        <Modal titulo={editandoId ? 'Editar Cliente' : 'Novo Cliente'} onFechar={() => setModalAberto(false)} largura={640}>
            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Nome / Razão Social *">
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoFocus />
                </Campo>
                <Campo label="Tipo">
                  <Select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option>Empresa</option>
                    <option>Pessoa Física</option>
                    <option>Órgão Público</option>
                  </Select>
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label={form.tipo === 'Pessoa Física' ? 'Documento (CPF)' : 'Documento (CNPJ)'}>
                  <input
                    value={form.documento}
                    onChange={e => setForm({ ...form, documento: formatarCpfCnpj(e.target.value) })}
                    placeholder={form.tipo === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}
                    maxLength={18}
                  />
                </Campo>
                <Campo label="Responsável">
                  <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </Campo>
                <Campo label="E-mail">
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </Campo>
              </div>

              <Campo label="Endereço (como sai na proposta)">
                <textarea rows={2} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Em branco: montado com os dados da nota fiscal abaixo" />
              </Campo>

              <DadosNota form={form} setForm={setForm} />

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}

function SeloNota({ pendencias }) {
  const ok = pendencias.length === 0;
  return (
    <span
      title={ok ? 'Cadastro pronto para a nota fiscal' : `Falta: ${pendencias.join(', ')}`}
      style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
        color: ok ? '#3fb95f' : '#d9a53a', background: ok ? '#0a1a0f' : '#1a150a', border: `1px solid ${ok ? '#1a4a26' : '#4a3a1a'}`,
      }}
    >
      {ok ? 'Pronto' : `Falta ${pendencias.length}`}
    </span>
  );
}

const buscarMunicipio = (t) => buscarMunicipios(t);

// Seção "Dados para a nota fiscal" do cadastro: o CEP preenche rua, bairro e
// município (código IBGE); o resto é digitado. Abre sozinha se já tem algo.
function DadosNota({ form, setForm }) {
  const preenchido = Boolean(form.cep || form.logradouro || form.municipio || form.inscricao_municipal || form.email_nota);
  const [aberta, setAberta] = useState(preenchido);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const muda = (c) => (e) => setForm({ ...form, [c]: e.target.value });

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) { toast.error('CEP tem 8 dígitos'); return; }
    setBuscandoCep(true);
    try {
      const { data: d } = await consultarCep(cep);
      setForm(f => ({
        ...f,
        logradouro: d.logradouro || f.logradouro,
        bairro: d.bairro || f.bairro,
        complemento: f.complemento || d.complemento || '',
        municipio: d.codigo_municipio ? { codigo: d.codigo_municipio, descricao: `${d.municipio}-${d.uf}` } : f.municipio,
      }));
      if (!d.logradouro) toast('CEP geral da cidade: preencha a rua à mão', { icon: 'ℹ️' });
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Não foi possível consultar o CEP');
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div style={{ marginTop: 14, border: '1px solid var(--borda)', borderRadius: 10 }}>
      <button type="button" onClick={() => setAberta(!aberta)} style={cabecalhoSecao} data-testid="secao-nota-fiscal">
        {aberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Dados para a nota fiscal (NFS-e)
      </button>
      {aberta && (
        <div style={{ padding: '4px 14px 14px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px auto 1fr', gap: 10, alignItems: 'end' }}>
            <Campo label="CEP">
              <input value={form.cep} onChange={e => setForm({ ...form, cep: formatarCep(e.target.value) })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarCep(); } }}
                placeholder="00000-000" inputMode="numeric" maxLength={9} data-testid="cliente-cep" />
            </Campo>
            <button type="button" onClick={buscarCep} disabled={buscandoCep} style={{ ...btnSecundario, padding: '9px 12px' }}>
              {buscandoCep ? 'Buscando…' : 'Buscar CEP'}
            </button>
            <Campo label="Município">
              <BuscaCodigo buscar={buscarMunicipio} valor={form.municipio} onEscolher={m => setForm({ ...form, municipio: m })}
                placeholder="Nome da cidade" testid="cliente-municipio" />
            </Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10 }}>
            <Campo label="Logradouro"><input value={form.logradouro} onChange={muda('logradouro')} maxLength={200} /></Campo>
            <Campo label="Número"><input value={form.numero} onChange={muda('numero')} maxLength={20} placeholder="S/N" /></Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Complemento"><input value={form.complemento} onChange={muda('complemento')} maxLength={100} /></Campo>
            <Campo label="Bairro"><input value={form.bairro} onChange={muda('bairro')} maxLength={100} /></Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Inscrição Municipal"><input value={form.inscricao_municipal} onChange={muda('inscricao_municipal')} maxLength={20} inputMode="numeric" placeholder="se tiver" /></Campo>
            <Campo label="Inscrição Estadual"><input value={form.inscricao_estadual} onChange={muda('inscricao_estadual')} maxLength={20} inputMode="numeric" placeholder="se tiver" /></Campo>
          </div>
          <Campo label="E-mail para receber a nota">
            <input type="email" value={form.email_nota} onChange={muda('email_nota')} maxLength={100} placeholder="Em branco: usa o e-mail do cadastro" />
          </Campo>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--texto-2)' }}>
            <input type="checkbox" checked={form.retem_iss} onChange={e => setForm({ ...form, retem_iss: e.target.checked })} style={{ width: 'auto' }} />
            O cliente retém o ISS na fonte (comum em órgão público e grandes empresas)
          </label>
        </div>
      )}
    </div>
  );
}

const cabecalhoSecao = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'transparent',
  border: 'none', color: 'var(--texto)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left',
};

// funções estáveis: o PainelPasta recarrega quando `carregar` muda
function PastaDoCliente({ id, ehAdmin }) {
  const [versao, setVersao] = useState(0);
  const carregar = useCallback(() => getPastaCliente(id), [id]);
  const abrir = useCallback(() => abrirPastaCliente(id), [id]);
  return (
    <>
      <PainelPasta carregar={carregar} abrir={abrir} atualizarQuando={versao} />
      {ehAdmin && <LigarPasta id={id} onLigada={() => setVersao(v => v + 1)} />}
    </>
  );
}

// Cliente com pasta de nome diferente no servidor ("Hosp Beta" para
// "Hospital Beta S/A"): liga o cadastro àquela pasta. O que o sistema já
// tinha gravado vai para dentro dela; o que já estava lá não vira novidade.
function LigarPasta({ id, onLigada }) {
  const [opcoes, setOpcoes] = useState(null);
  const [escolhida, setEscolhida] = useState('');
  const [ligando, setLigando] = useState(false);

  const carregar = () => getOpcoesPastaCliente(id).then(r => {
    setOpcoes(r.data);
    setEscolhida(r.data.pastas.find(p => p.sugerida)?.nome || '');
  }).catch(e => toast.error(e.response?.data?.erro || 'Não foi possível listar as pastas do servidor'));

  const ligar = async () => {
    if (!escolhida) return;
    if (!window.confirm(`Ligar este cliente à pasta "${escolhida}" do servidor?\n\nO que o sistema já gravou para ele vai para dentro dela. Os arquivos que já estão lá ficam como estão.`)) return;
    setLigando(true);
    try {
      await ligarPastaCliente(id, escolhida);
      toast.success(`Cliente ligado à pasta "${escolhida}"`);
      setOpcoes(null);
      onLigada();
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Não foi possível ligar a pasta');
    } finally {
      setLigando(false);
    }
  };

  if (!opcoes) {
    return (
      <button type="button" onClick={carregar} style={{ ...btnSecundario, fontSize: 12, padding: '5px 10px', margin: '0 0 8px' }} data-testid="ligar-pasta">
        <FolderOpen size={12} /> Usar uma pasta que já existe no servidor
      </button>
    );
  }
  if (!opcoes.disponivel) return <p style={{ color: '#e67e22', fontSize: 12 }}>O servidor das pastas está fora do ar agora. Tente de novo em instantes.</p>;
  const atual = opcoes.pastas.find(p => p.atual)?.nome;
  const livres = opcoes.pastas.filter(p => !p.atual);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 8px', fontSize: 12 }}>
      <span style={{ color: 'var(--texto-2)' }}>Pasta do servidor:</span>
      <Select value={escolhida} onChange={e => setEscolhida(e.target.value)} style={{ width: 'auto', minWidth: 260 }} data-testid="opcoes-pasta">
        <option value="">Escolha a pasta…</option>
        <optgroup label="Nome parecido com o do cliente">
          {livres.filter(p => p.sugerida).map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
        </optgroup>
        <optgroup label="Outras pastas sem cliente">
          {livres.filter(p => !p.sugerida).map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
        </optgroup>
      </Select>
      <button type="button" onClick={ligar} disabled={!escolhida || ligando} style={{ ...btnPrimario, fontSize: 12, padding: '5px 12px' }}>
        {ligando ? 'Ligando…' : 'Ligar'}
      </button>
      <button type="button" onClick={() => setOpcoes(null)} style={{ ...btnSecundario, fontSize: 12, padding: '5px 10px' }}>Cancelar</button>
      {atual && <span style={{ color: 'var(--texto-3)', width: '100%' }}>Hoje: <code>{atual}</code></span>}
    </div>
  );
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário desta
// tela é um pouco maior e mais apagado que o do kit — mantido como era.
const { th, td, tdVazio, btnPrimario, btnIcone } = estilos;

const btnSecundario = {
  padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
  borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer'
};
