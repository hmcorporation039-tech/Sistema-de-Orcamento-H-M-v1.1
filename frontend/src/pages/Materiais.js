import { useState, useEffect, useCallback } from 'react';
import useUltimoPedido from '../hooks/useUltimoPedido';
import toast from 'react-hot-toast';
import { Plus, Upload, FileScan } from 'lucide-react';
import {
  getMateriais, removerMaterial, importarMateriais, getCategoriasMateriais,
  getStatusEmail, verificarEmailAgora, getHistoricoEmail, getMargemPadrao, verificarFornecedoresAgora,
} from '../services/api';
import Paginacao from '../components/Paginacao';
import ModalOportunidades, { ModalCompararMaterial } from '../components/ComparativoFornecedores';
import Select, { Sugestoes } from '../components/Select';
import CampoBusca from '../components/ui/CampoBusca';
import { useAuth } from '../hooks/useAuth';
import { categoriasComUsadas } from '../utils/categoriasMateriais';
import { btnPrimario, btnSecundario } from './materiais/apoio';
import BarraImportacao from './materiais/BarraImportacao';
import TabelaMateriais from './materiais/TabelaMateriais';
import ModalMaterial from './materiais/ModalMaterial';
import ModalNotaFiscal from './materiais/ModalNotaFiscal';
import { ModalImportarCsv, ModalHistoricoEmail } from './materiais/ModaisImportacao';

// Catálogo de materiais. Divisão em 2.39 (antes ~800 linhas aqui): a página guarda a lista,
// os filtros e o que fica entre uma janela e outra; as peças estão em pages/materiais/
// (tabela, faixa de importação, formulário do material, nota fiscal, CSV e histórico).
export default function Materiais() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
  // janela do material: null = fechada; { material } = aberta (material null = novo)
  const [edicao, setEdicao] = useState(null);
  const [modalImport, setModalImport] = useState(false);
  const [textoImport, setTextoImport] = useState('');
  const [importando, setImportando] = useState(false);
  const [modalNota, setModalNota] = useState(false);

  const [statusEmail, setStatusEmail] = useState(null);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
  const [verificandoFornecedores, setVerificandoFornecedores] = useState(false);
  const [margemPadrao, setMargemPadrao] = useState('');
  const [modalHistorico, setModalHistorico] = useState(false);
  const [modalOportunidades, setModalOportunidades] = useState(false);
  const [materialComparar, setMaterialComparar] = useState(null);
  const [historicoEmail, setHistoricoEmail] = useState(null);

  const carregarCategorias = useCallback(() => {
    getCategoriasMateriais().then(res => setCategorias(res.data)).catch(() => {});
  }, []);

  // Sugestões de categoria: as padrão da empresa + as que já estão em uso no banco
  const categoriasSugeridas = categoriasComUsadas(categorias);

  useEffect(() => {
    getStatusEmail().then(res => setStatusEmail(res.data)).catch(() => {});
    getMargemPadrao().then(res => setMargemPadrao(String(res.data.margem))).catch(() => {});
    carregarCategorias();
  }, [carregarCategorias]);

  const novoPedido = useUltimoPedido();
  const carregar = useCallback(async () => {
    const vale = novoPedido(); // resposta de busca antiga não sobrescreve a atual
    setCarregando(true);
    try {
      const res = await getMateriais({
        ...(busca ? { busca } : {}),
        ...(categoriaFiltro ? { categoria: categoriaFiltro } : {}),
        pagina,
      });
      if (!vale()) return;
      setMateriais(res.data.itens);
      setPaginacao({ total: res.data.total, totalPaginas: res.data.totalPaginas });
      carregarCategorias();
    } catch {
      if (vale()) toast.error('Erro ao carregar materiais');
    } finally {
      if (vale()) setCarregando(false);
    }
  }, [busca, categoriaFiltro, pagina, carregarCategorias, novoPedido]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => { setPagina(1); }, [busca, categoriaFiltro]);

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
      toast.success(`${r.emailsProcessados}/${r.emailsEncontrados} e-mails (${r.orcamentosImportados || 0} orçamentos de fornecedor) · ${r.materiaisCriados} materiais novos cadastrados, ${r.materiaisAtualizados} atualizados`);
      r.avisos?.forEach(a => toast(a));
      setStatusEmail(s => ({ ...s, ultimaVerificacao: new Date().toISOString() }));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao verificar caixa de entrada');
    } finally {
      setVerificandoEmail(false);
    }
  }

  async function verificarFornecedores() {
    setVerificandoFornecedores(true);
    try {
      const res = await verificarFornecedoresAgora();
      const r = res.data;
      toast.success(`${r.arquivosProcessados} orçamento(s) novo(s) lido(s) de ${r.arquivosEncontrados} na pasta · ${r.materiaisCriados} materiais novos cadastrados, ${r.materiaisJaCadastrados || 0} já existiam no catálogo (preço mantido)`);
      r.avisos?.forEach(a => toast(a));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao verificar orçamentos de fornecedores');
    } finally {
      setVerificandoFornecedores(false);
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>Materiais</h2>

        <Select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} style={{ width: 170 }} aria-label="Categoria">
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        {/* Datalist único de sugestões de categoria, usado pelos campos editáveis
            de categoria em qualquer modal desta página (edição, importação de nota) */}
        <Sugestoes id="categorias-lista">
          {categoriasSugeridas.map(c => <option key={c} value={c} />)}
        </Sugestoes>

        <CampoBusca value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar descrição, código, marca..."
          aria-label="Buscar material" estiloCaixa={{ width: 240 }} />

        <button onClick={() => setModalImport(true)} style={btnSecundario}>
          <Upload size={14} style={{ marginRight: 6 }} /> Importar CSV
        </button>
        <button onClick={() => setModalNota(true)} style={btnSecundario}>
          <FileScan size={14} style={{ marginRight: 6 }} /> Importar Nota Fiscal
        </button>
        <button onClick={() => setEdicao({ material: null })} style={btnPrimario}>
          <Plus size={14} /> Novo Material
        </button>
      </div>

      <BarraImportacao
        statusEmail={statusEmail} ehAdmin={ehAdmin} margemPadrao={margemPadrao}
        verificandoEmail={verificandoEmail} onVerificarEmail={verificarEmail}
        verificandoFornecedores={verificandoFornecedores} onVerificarFornecedores={verificarFornecedores}
        onCompararFornecedores={() => setModalOportunidades(true)} onAbrirHistorico={abrirHistorico}
      />

      <TabelaMateriais
        materiais={materiais} carregando={carregando} ehAdmin={ehAdmin}
        onComparar={setMaterialComparar} onEditar={(m) => setEdicao({ material: m })} onExcluir={excluir}
      />

      <Paginacao pagina={pagina} totalPaginas={paginacao.totalPaginas} total={paginacao.total} onMudarPagina={setPagina} />

      {edicao && (
        <ModalMaterial material={edicao.material} categoriasSugeridas={categoriasSugeridas} margemPadrao={margemPadrao}
          onFechar={() => setEdicao(null)} onSalvo={carregar} />
      )}

      {modalImport && (
        <ModalImportarCsv texto={textoImport} setTexto={setTextoImport} importando={importando}
          onImportar={importar} onFechar={() => setModalImport(false)} />
      )}

      {modalNota && (
        <ModalNotaFiscal margemPadrao={margemPadrao} onFechar={() => setModalNota(false)} onImportado={carregar} />
      )}

      {modalOportunidades && <ModalOportunidades onFechar={() => setModalOportunidades(false)} onAbrirMaterial={setMaterialComparar} />}
      {materialComparar && <ModalCompararMaterial material={materialComparar} onFechar={() => setMaterialComparar(null)} />}

      {modalHistorico && <ModalHistoricoEmail historicoEmail={historicoEmail} onFechar={() => setModalHistorico(false)} />}
    </div>
  );
}
