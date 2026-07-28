import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, X, Upload, FileScan, Mail, RefreshCw, History } from 'lucide-react';
import {
  getMateriais, criarMaterial, atualizarMaterial, removerMaterial,
  importarMateriais, extrairNotaFiscal, getCategoriasMateriais,
  getStatusEmail, verificarEmailAgora, getHistoricoEmail, getMargemPadrao, atualizarMargemPadrao,
} from '../services/api';
import { formatarMoeda, formatarNcm, formatarData } from '../utils/format';
import Paginacao from '../components/Paginacao';

const VAZIO = { codigo: '', descricao: '', categoria: '', unidade: 'un', preco: '', preco_compra: '', marca: '', ncm: '' };
const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 'cx', 'pct', 'rl', 'sc', 'pç', 'kit', 'h'];
const ORIGEM_LABEL = {
  manual: 'Manual', importacao: 'Importação', nota_xml: 'NF-e (XML)', nota_pdf: 'NF-e (PDF)',
  email_xml: 'E-mail (XML)', email_pdf: 'E-mail (PDF)',
};

export default function Materiais() {
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
  const [modalAberto, setModalAberto] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [textoImport, setTextoImport] = useState('');
  const [importando, setImportando] = useState(false);

  const [modalNota, setModalNota] = useState(false);
  const [lendoNota, setLendoNota] = useState(false);
  const [fonteNota, setFonteNota] = useState(null);
  const [itensNota, setItensNota] = useState(null);
  const [categoriaPadraoNota, setCategoriaPadraoNota] = useState('');
  const [importandoNota, setImportandoNota] = useState(false);
  const inputArquivoRef = useRef(null);

  const [statusEmail, setStatusEmail] = useState(null);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
  const [margemPadrao, setMargemPadrao] = useState('');
  const [salvandoMargem, setSalvandoMargem] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [historicoEmail, setHistoricoEmail] = useState(null);

  const carregarCategorias = useCallback(() => {
    getCategoriasMateriais().then(res => setCategorias(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    getStatusEmail().then(res => setStatusEmail(res.data)).catch(() => {});
    getMargemPadrao().then(res => setMargemPadrao(String(res.data.margem))).catch(() => {});
    carregarCategorias();
  }, [carregarCategorias]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getMateriais({
        ...(busca ? { busca } : {}),
        ...(categoriaFiltro ? { categoria: categoriaFiltro } : {}),
        pagina,
      });
      setMateriais(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
      carregarCategorias();
    } catch {
      toast.error('Erro ao carregar materiais');
    } finally {
      setCarregando(false);
    }
  }, [busca, categoriaFiltro, pagina, carregarCategorias]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca, categoriaFiltro]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(m) {
    setEditandoId(m.id);
    setForm({
      codigo: m.codigo || '', descricao: m.descricao || '', categoria: m.categoria || '',
      unidade: m.unidade || 'un', preco: m.preco || '', preco_compra: m.preco_compra || '',
      marca: m.marca || '', ncm: m.ncm || ''
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.descricao.trim() || !form.categoria.trim() || !form.unidade.trim()) {
      toast.error('Descrição, categoria e unidade são obrigatórios');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        preco: parseFloat(form.preco) || 0,
        preco_compra: form.preco_compra !== '' ? parseFloat(form.preco_compra) || 0 : null,
      };
      if (editandoId) {
        await atualizarMaterial(editandoId, payload);
        toast.success('Material atualizado');
      } else {
        await criarMaterial(payload);
        toast.success('Material cadastrado');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar material');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(m) {
    if (!window.confirm(`Remover "${m.descricao}"?`)) return;
    try {
      await removerMaterial(m.id);
      toast.success('Material removido');
      carregar();
    } catch {
      toast.error('Erro ao remover material');
    }
  }

  async function importar() {
    const linhas = textoImport.split('\n').map(l => l.trim()).filter(Boolean);
    if (linhas.length === 0) {
      toast.error('Cole ao menos uma linha para importar');
      return;
    }
    const materiaisParaImportar = linhas.map(linha => {
      const partes = linha.split(/[;\t]/).map(p => p.trim());
      const [codigo, descricao, categoria, unidade, preco, marca, ncm] = partes;
      return { codigo, descricao, categoria, unidade, preco: parseFloat((preco || '0').replace(',', '.')) || 0, marca, ncm };
    }).filter(m => m.descricao && m.categoria && m.unidade);

    if (materiaisParaImportar.length === 0) {
      toast.error('Nenhuma linha válida encontrada. Use: código;descrição;categoria;unidade;preço;marca');
      return;
    }

    setImportando(true);
    try {
      const res = await importarMateriais(materiaisParaImportar);
      toast.success(res.data.mensagem);
      setModalImport(false);
      setTextoImport('');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao importar materiais');
    } finally {
      setImportando(false);
    }
  }

  async function verificarEmail() {
    setVerificandoEmail(true);
    try {
      const res = await verificarEmailAgora();
      const r = res.data;
      toast.success(`${r.emailsProcessados}/${r.emailsEncontrados} e-mails · ${r.materiaisCriados} materiais criados, ${r.materiaisAtualizados} atualizados`);
      r.avisos?.forEach(a => toast(a));
      setStatusEmail(s => ({ ...s, ultimaVerificacao: new Date().toISOString() }));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao verificar caixa de entrada');
    } finally {
      setVerificandoEmail(false);
    }
  }

  async function abrirHistorico() {
    setModalHistorico(true);
    try {
      const res = await getHistoricoEmail();
      setHistoricoEmail(res.data);
    } catch {
      toast.error('Erro ao carregar histórico de importação');
    }
  }

  async function salvarMargem() {
    const valor = parseFloat(margemPadrao);
    if (Number.isNaN(valor) || valor < 0) {
      toast.error('Margem inválida');
      return;
    }
    setSalvandoMargem(true);
    try {
      await atualizarMargemPadrao(valor);
      toast.success('Margem padrão atualizada');
    } catch {
      toast.error('Erro ao atualizar margem padrão');
    } finally {
      setSalvandoMargem(false);
    }
  }

  function abrirModalNota() {
    setFonteNota(null);
    setItensNota(null);
    setCategoriaPadraoNota('');
    setModalNota(true);
  }

  async function lerArquivoNota(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setLendoNota(true);
    try {
      const res = await extrairNotaFiscal(arquivo);
      setFonteNota(res.data.fonte);
      const margem = parseFloat(margemPadrao) || 0;
      setItensNota(res.data.itens.map(it => {
        const precoCompra = it.preco || 0;
        return {
          codigo: it.codigo || '',
          descricao: it.descricao || '',
          ncm: it.ncm || '',
          categoria: '',
          unidade: it.unidade || 'un',
          preco_compra: precoCompra,
          preco: Math.round(precoCompra * (1 + margem / 100) * 100) / 100,
          marca: '',
        };
      }));
      if (res.data.fonte === 'pdf') {
        toast('Leitura por PDF: confira categoria, unidade e preço antes de importar');
      } else {
        toast.success(`${res.data.itens.length} itens lidos do XML da NF-e`);
      }
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao ler o arquivo da nota fiscal');
    } finally {
      setLendoNota(false);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
    }
  }

  function atualizarItemNota(idx, campo, valor) {
    setItensNota(itens => itens.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  }

  function removerItemNota(idx) {
    setItensNota(itens => itens.filter((_, i) => i !== idx));
  }

  function aplicarCategoriaATodos() {
    if (!categoriaPadraoNota.trim()) return;
    setItensNota(itens => itens.map(it => ({ ...it, categoria: it.categoria || categoriaPadraoNota })));
  }

  async function confirmarImportacaoNota() {
    const validos = itensNota.filter(it => it.descricao.trim() && it.categoria.trim() && it.unidade.trim());
    if (validos.length === 0) {
      toast.error('Preencha ao menos categoria e unidade de um item para importar');
      return;
    }
    setImportandoNota(true);
    try {
      const res = await importarMateriais(validos.map(it => ({
        ...it,
        preco: parseFloat(it.preco) || 0,
        preco_compra: parseFloat(it.preco_compra) || 0,
        origem: fonteNota === 'xml' ? 'nota_xml' : 'nota_pdf',
      })));
      toast.success(res.data.mensagem);
      setModalNota(false);
      setItensNota(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao importar materiais da nota fiscal');
    } finally {
      setImportandoNota(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Materiais</h2>

        <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} style={{ width: 170 }}>
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#555' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar descrição, código, marca..."
            style={{ paddingLeft: 30 }}
          />
        </div>

        <button onClick={() => setModalImport(true)} style={btnSecundario}>
          <Upload size={14} style={{ marginRight: 6 }} /> Importar CSV
        </button>
        <button onClick={abrirModalNota} style={btnSecundario}>
          <FileScan size={14} style={{ marginRight: 6 }} /> Importar Nota Fiscal
        </button>
        <button onClick={abrirNovo} style={btnPrimario}>
          <Plus size={14} /> Novo Material
        </button>
      </div>

      <div style={{
        background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
        padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center',
        gap: 18, flexWrap: 'wrap', fontSize: 11
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999' }}>
          <Mail size={14} color={statusEmail?.configurado ? '#3fb95f' : '#666'} />
          {statusEmail?.configurado ? (
            <span>
              Importação por e-mail ativa ({statusEmail.conta}) · última verificação: {statusEmail.ultimaVerificacao ? formatarData(statusEmail.ultimaVerificacao) : 'ainda não rodou'}
            </span>
          ) : (
            <span>Importação automática por e-mail não configurada (veja EMAIL_IMAP_* no backend/.env)</span>
          )}
        </div>

        {statusEmail?.configurado && (
          <button onClick={verificarEmail} disabled={verificandoEmail} style={{ ...btnSecundario, padding: '5px 10px' }}>
            <RefreshCw size={12} style={{ marginRight: 5 }} /> {verificandoEmail ? 'Verificando...' : 'Verificar agora'}
          </button>
        )}

        <button onClick={abrirHistorico} style={{ ...btnSecundario, padding: '5px 10px' }}>
          <History size={12} style={{ marginRight: 5 }} /> Ver histórico
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ color: '#666' }}>Margem padrão de venda:</span>
          <input
            type="number" step="0.1" min="0" value={margemPadrao}
            onChange={e => setMargemPadrao(e.target.value)}
            style={{ width: 60, padding: '4px 6px' }}
          />
          <span style={{ color: '#666' }}>%</span>
          <button onClick={salvarMargem} disabled={salvandoMargem} style={{ ...btnSecundario, padding: '5px 10px' }}>
            {salvandoMargem ? '...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f0f0f', textAlign: 'left' }}>
              <th style={th}>Código</th>
              <th style={th}>Descrição</th>
              <th style={th}>NCM/SH</th>
              <th style={th}>Categoria</th>
              <th style={th}>Un.</th>
              <th style={{ ...th, textAlign: 'right' }}>Compra</th>
              <th style={{ ...th, textAlign: 'right' }}>Venda</th>
              <th style={th}>Marca</th>
              <th style={{ ...th, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={9} style={tdVazio}>Carregando...</td></tr>
            )}
            {!carregando && materiais.length === 0 && (
              <tr><td colSpan={9} style={tdVazio}>Nenhum material encontrado</td></tr>
            )}
            {!carregando && materiais.map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                <td style={td}>{m.codigo || '—'}</td>
                <td style={td}>
                  {m.descricao}
                  {m.origem && m.origem !== 'manual' && (
                    <span style={{
                      marginLeft: 8, padding: '1px 6px', borderRadius: 10, fontSize: 9,
                      background: '#1a1a0a', color: '#c9a227', border: '1px solid #4a3d10'
                    }}>
                      {ORIGEM_LABEL[m.origem] || m.origem}
                    </span>
                  )}
                </td>
                <td style={td}>{formatarNcm(m.ncm) || '—'}</td>
                <td style={td}>{m.categoria}</td>
                <td style={td}>{m.unidade}</td>
                <td style={{ ...td, textAlign: 'right', color: '#888' }}>{m.preco_compra ? formatarMoeda(m.preco_compra) : '—'}</td>
                <td style={{ ...td, textAlign: 'right', color: '#c9a227', fontWeight: 700 }}>{formatarMoeda(m.preco)}</td>
                <td style={td}>{m.marca || '—'}</td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEdicao(m)} style={btnIcone} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => excluir(m)} style={{ ...btnIcone, color: '#b04040' }} title="Remover">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {modalAberto && (
        <div style={overlay} onClick={() => setModalAberto(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>
                {editandoId ? 'Editar Material' : 'Novo Material'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Código">
                  <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} autoFocus />
                </Campo>
                <Campo label="Descrição *">
                  <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Campo label="Categoria *">
                  <input list="categorias-lista" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
                  <datalist id="categorias-lista">
                    {categorias.map(c => <option key={c} value={c} />)}
                  </datalist>
                </Campo>
                <Campo label="Unidade *">
                  <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Campo>
                <Campo label="Preço Compra (R$)">
                  <input type="number" step="0.01" min="0" value={form.preco_compra} onChange={e => setForm({ ...form, preco_compra: e.target.value })} />
                </Campo>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                <Campo label="Preço Venda (R$) *">
                  <input type="number" step="0.01" min="0" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} />
                </Campo>
                <button
                  type="button"
                  style={btnSecundario}
                  onClick={() => {
                    const compra = parseFloat(form.preco_compra) || 0;
                    const margem = parseFloat(margemPadrao) || 0;
                    setForm({ ...form, preco: String(Math.round(compra * (1 + margem / 100) * 100) / 100) });
                  }}
                >
                  Sugerir com margem
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Marca">
                  <input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
                </Campo>
                <Campo label="NCM/SH">
                  <input
                    value={form.ncm}
                    onChange={e => setForm({ ...form, ncm: e.target.value.replace(/[^\d.]/g, '') })}
                    placeholder="8544.42.00"
                    maxLength={10}
                  />
                </Campo>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalImport && (
        <div style={overlay} onClick={() => setModalImport(false)}>
          <div style={{ ...modal, width: 620 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Importar Materiais (CSV)</h3>
              <button onClick={() => setModalImport(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#777', marginBottom: 10, lineHeight: 1.5 }}>
              Cole uma linha por material, campos separados por <b>;</b> ou tabulação, na ordem:<br />
              <code style={{ color: '#c9a227' }}>código;descrição;categoria;unidade;preço;marca;ncm</code> (ncm é opcional)
            </p>
            <textarea
              rows={10}
              value={textoImport}
              onChange={e => setTextoImport(e.target.value)}
              placeholder={'001;Cabo flexível 2,5mm;Elétrica;m;2.50;Sil;8544.42.00\n002;Disjuntor bipolar 25A;Elétrica;un;18.90;Siemens'}
              style={{ fontFamily: 'monospace', fontSize: 11 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalImport(false)} style={btnSecundario}>Cancelar</button>
              <button onClick={importar} disabled={importando} style={btnPrimario}>
                {importando ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNota && (
        <div style={overlay} onClick={() => setModalNota(false)}>
          <div style={{ ...modal, width: itensNota ? 980 : 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Importar Nota Fiscal</h3>
              <button onClick={() => setModalNota(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            {!itensNota && (
              <>
                <p style={{ fontSize: 11, color: '#777', marginBottom: 16, lineHeight: 1.6 }}>
                  Envie o <b>XML da NF-e</b> (recomendado — leitura completa: descrição, NCM/SH, unidade e preço)
                  ou o <b>PDF do DANFE</b> (lê descrição e NCM/SH; categoria, unidade e preço ficam para você conferir).
                </p>
                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept=".pdf,.xml,application/pdf,text/xml,application/xml"
                  onChange={lerArquivoNota}
                  disabled={lendoNota}
                />
                {lendoNota && <p style={{ fontSize: 12, color: '#c9a227', marginTop: 12 }}>Lendo arquivo...</p>}
              </>
            )}

            {itensNota && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Campo label="Categoria padrão (aplicar aos itens sem categoria)">
                      <input
                        list="categorias-lista"
                        value={categoriaPadraoNota}
                        onChange={e => setCategoriaPadraoNota(e.target.value)}
                        placeholder="Ex.: Elétrica"
                      />
                    </Campo>
                  </div>
                  <button type="button" onClick={aplicarCategoriaATodos} style={{ ...btnSecundario, marginBottom: 1 }}>
                    Aplicar a todos
                  </button>
                </div>

                <p style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
                  Fonte: {fonteNota === 'xml' ? 'XML da NF-e (dados completos)' : 'PDF do DANFE (confira os valores)'} ·
                  {' '}{itensNota.length} {itensNota.length === 1 ? 'item lido' : 'itens lidos'}
                </p>

                <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#0f0f0f', textAlign: 'left', position: 'sticky', top: 0 }}>
                        <th style={th}>Descrição</th>
                        <th style={{ ...th, width: 90 }}>NCM/SH</th>
                        <th style={{ ...th, width: 130 }}>Categoria</th>
                        <th style={{ ...th, width: 60 }}>Un.</th>
                        <th style={{ ...th, width: 85 }}>Preço Compra</th>
                        <th style={{ ...th, width: 85 }}>Preço Venda</th>
                        <th style={{ ...th, width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensNota.map((it, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #1e1e1e' }}>
                          <td style={{ padding: 6 }}>
                            <input value={it.descricao} onChange={e => atualizarItemNota(idx, 'descricao', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input value={it.ncm} onChange={e => atualizarItemNota(idx, 'ncm', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input list="categorias-lista" value={it.categoria} onChange={e => atualizarItemNota(idx, 'categoria', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input value={it.unidade} onChange={e => atualizarItemNota(idx, 'unidade', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input type="number" step="0.01" min="0" value={it.preco_compra} onChange={e => atualizarItemNota(idx, 'preco_compra', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input type="number" step="0.01" min="0" value={it.preco} onChange={e => atualizarItemNota(idx, 'preco', e.target.value)} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <button onClick={() => removerItemNota(idx)} style={{ ...btnIcone, color: '#b04040', width: 22, height: 22 }} title="Remover">
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setItensNota(null)} style={btnSecundario}>Voltar</button>
                  <button onClick={confirmarImportacaoNota} disabled={importandoNota} style={btnPrimario}>
                    {importandoNota ? 'Importando...' : `Importar ${itensNota.length} itens`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalHistorico && (
        <div style={overlay} onClick={() => setModalHistorico(false)}>
          <div style={{ ...modal, width: 620 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ color: '#c9a227', fontSize: 15, fontWeight: 700, flex: 1 }}>Histórico de Importação Automática</h3>
              <button onClick={() => setModalHistorico(false)} style={{ ...btnIcone, background: 'transparent' }}>
                <X size={16} />
              </button>
            </div>

            {!historicoEmail && <p style={{ color: '#666', fontSize: 12 }}>Carregando...</p>}

            {historicoEmail && (
              <>
                <p style={{ fontSize: 11, color: '#777', marginBottom: 12 }}>
                  {historicoEmail.totalEmailsProcessados} e-mails já processados no total ·
                  {' '}{historicoEmail.notas.length} notas fiscais nos últimos registros
                </p>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#0f0f0f', textAlign: 'left', position: 'sticky', top: 0 }}>
                        <th style={th}>Data</th>
                        <th style={th}>Chave de acesso da NF-e</th>
                        <th style={{ ...th, textAlign: 'right' }}>Novos</th>
                        <th style={{ ...th, textAlign: 'right' }}>Atualizados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoEmail.notas.length === 0 && (
                        <tr><td colSpan={4} style={tdVazio}>Nenhuma nota importada ainda</td></tr>
                      )}
                      {historicoEmail.notas.map(n => (
                        <tr key={n.chave_acesso} style={{ borderTop: '1px solid #1e1e1e' }}>
                          <td style={{ padding: '8px 10px', color: '#ccc' }}>{formatarData(n.processado_em)}</td>
                          <td style={{ padding: '8px 10px', color: '#888', fontFamily: 'monospace', fontSize: 10 }}>{n.chave_acesso || '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#3fb95f' }}>{n.itens_novos}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#c9a227' }}>{n.itens_atualizados}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      {children}
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
  display: 'flex', alignItems: 'center', padding: '9px 16px', background: 'transparent',
  border: '1px solid #2a2a2a', borderRadius: 6, color: '#999', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
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
  padding: 28, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa'
};
