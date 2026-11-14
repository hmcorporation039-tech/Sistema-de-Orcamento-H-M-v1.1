import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { criarMaterial, atualizarMaterial, pesquisarPrecoMercado } from '../../services/api';
import Select from '../../components/Select';
import Modal from '../../components/ui/Modal';
import { Campo } from '../../components/ui/estilos';
import CampoMoeda from '../../components/CampoMoeda';
import { arred2 } from '../../utils/dinheiro';
import { VAZIO, UNIDADES, btnPrimario, btnSecundario } from './apoio';

// Formulário de material (novo ou edição), com "Sugerir com margem" e a pesquisa de preço de
// mercado. `material` = o material em edição ou null (novo); onSalvo = recarregar a lista.
function formDe(m) {
  if (!m) return VAZIO;
  return {
    codigo: m.codigo || '', descricao: m.descricao || '', categoria: m.categoria || '',
    unidade: m.unidade || 'un', preco: m.preco || '', preco_compra: m.preco_compra || '',
    marca: m.marca || '', ncm: m.ncm || ''
  };
}

export default function ModalMaterial({ material, categoriasSugeridas, margemPadrao, onFechar, onSalvo }) {
  const editandoId = material?.id ?? null;
  const [form, setForm] = useState(() => formDe(material));
  // Se a categoria atual não está na lista de sugestões, abre já no modo "digitar categoria nova"
  const [categoriaCustom, setCategoriaCustom] = useState(() => !!material?.categoria && !categoriasSugeridas.includes(material.categoria));
  const [pesquisaMercado, setPesquisaMercado] = useState(null); // { carregando, resultado, erro }
  const [salvando, setSalvando] = useState(false);

  async function pesquisarMercadoDoForm() {
    if (!form.descricao.trim()) {
      toast.error('Preencha a descrição antes de pesquisar');
      return;
    }
    // 2º clique sobre uma pesquisa reaproveitada do histórico (válida por 7 dias) consulta a web de novo
    const refazer = !!pesquisaMercado?.deCache;
    setPesquisaMercado({ carregando: true });
    try {
      const res = await pesquisarPrecoMercado(form.descricao, 'material', refazer);
      setPesquisaMercado({ resultado: res.data.resultado, deCache: !!res.data.deCache, interna: !!res.data.interna, pesquisadoEm: res.data.pesquisadoEm });
    } catch (err) {
      setPesquisaMercado({ erro: err.response?.data?.erro || 'Erro ao pesquisar preço de mercado' });
    }
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
        preco_compra: form.preco_compra === '' || form.preco_compra == null ? null : parseFloat(form.preco_compra) || 0,
      };
      if (editandoId) {
        await atualizarMaterial(editandoId, payload);
        toast.success('Material atualizado');
      } else {
        await criarMaterial(payload);
        toast.success('Material cadastrado');
      }
      onFechar();
      onSalvo();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar material');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={editandoId ? 'Editar Material' : 'Novo Material'} onFechar={onFechar}>
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
              {categoriaCustom ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Digite a nova categoria"
                    aria-label="Categoria nova"
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => setCategoriaCustom(false)} style={{ ...btnSecundario, padding: '9px 12px', fontSize: 11.5 }}>
                    Lista
                  </button>
                </div>
              ) : (
                <Select
                  value={form.categoria}
                  onChange={e => {
                    if (e.target.value === '__nova__') {
                      setCategoriaCustom(true);
                      setForm({ ...form, categoria: '' });
                    } else {
                      setForm({ ...form, categoria: e.target.value });
                    }
                  }}
                >
                  <option value="" disabled>Selecione...</option>
                  {categoriasSugeridas.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__nova__">+ Nova categoria...</option>
                </Select>
              )}
            </Campo>
            <Campo label="Unidade *">
              <Select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Campo>
            <Campo label="Preço Compra (R$)">
              <CampoMoeda permiteVazio placeholder="sem preço de compra" value={form.preco_compra} onChange={v => setForm({ ...form, preco_compra: v })} />
            </Campo>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12, alignItems: 'end' }}>
            <Campo label="Preço Venda (R$) *">
              <CampoMoeda value={form.preco} onChange={v => setForm({ ...form, preco: v })} />
            </Campo>
            <button
              type="button"
              style={btnSecundario}
              onClick={() => {
                const compra = parseFloat(form.preco_compra) || 0;
                const margem = parseFloat(margemPadrao) || 0;
                setForm({ ...form, preco: String(arred2(compra * (1 + margem / 100))) });
              }}
            >
              Sugerir com margem
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={pesquisarMercadoDoForm}
              disabled={pesquisaMercado?.carregando}
              style={{ ...btnSecundario, fontSize: 12 }}
            >
              <Search size={12} style={{ marginRight: 6 }} />
              {pesquisaMercado?.carregando ? 'Pesquisando preço de mercado...' : 'Pesquisar preço de mercado'}
            </button>
            {pesquisaMercado?.resultado && (
              <div style={{ marginTop: 8, padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12, color: 'var(--texto-2)', whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto' }}>
                <b style={{ color: '#c9a227' }}>{pesquisaMercado.interna ? 'Referências da H&M (sem IA — cotações, vendas, catálogo e SINAPI):' : 'Pesquisa de mercado (IA, confira antes de usar):'}</b><br />
                {pesquisaMercado.interna && (
                  <div style={{ color: 'var(--texto-3)', marginBottom: 4 }}>
                    Clique em "Pesquisar preço de mercado" de novo para consultar a web pela IA.
                  </div>
                )}
                {pesquisaMercado.deCache && !pesquisaMercado.interna && (
                  <div style={{ color: 'var(--texto-3)', marginBottom: 4 }}>
                    Reaproveitada do histórico, feita em {new Date(pesquisaMercado.pesquisadoEm).toLocaleString('pt-BR')}. Clique em "Pesquisar preço de mercado" de novo para consultar a web outra vez.
                  </div>
                )}
                {pesquisaMercado.resultado}
              </div>
            )}
            {pesquisaMercado?.erro && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#b04040' }}>{pesquisaMercado.erro}</div>
            )}
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
            <button type="button" onClick={onFechar} style={btnSecundario}>Cancelar</button>
            <button type="submit" disabled={salvando} style={btnPrimario}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
