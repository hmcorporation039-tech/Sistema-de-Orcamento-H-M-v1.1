import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { getPrecosMaoDeObra, atualizarPrecosMaoDeObra } from '../services/api';

// Mesmos nomes de disciplina usados em Análise de Projeto — só pra exibição
// (agrupa visualmente), a chave que realmente importa é o código de cada item.
const NOMES_DISCIPLINA = {
  eletrica: 'Elétrica (infraestrutura)',
  rede: 'Redes de Computadores (dados)',
  cabeamento: 'Infra. de Cabeamento Estruturado',
  telefonia: 'Telefonia',
  cftv: 'CFTV',
  iluminacao: 'Iluminação',
  automacao: 'Automação',
  alarme: 'Alarme',
  antena: 'Antena/TV',
};

export default function PrecosMaoDeObra() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterados, setAlterados] = useState(new Set());

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await getPrecosMaoDeObra();
      setItens(res.data);
      setAlterados(new Set());
    } catch {
      toast.error('Erro ao carregar preços de referência');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function atualizarValor(codigo, valor) {
    setItens(lista => lista.map(it => it.codigo === codigo ? { ...it, valor_referencia: valor } : it));
    setAlterados(a => new Set(a).add(codigo));
  }

  async function salvar() {
    if (alterados.size === 0) {
      toast.error('Nenhuma alteração para salvar');
      return;
    }
    setSalvando(true);
    try {
      const itensAlterados = itens.filter(it => alterados.has(it.codigo))
        .map(it => ({ codigo: it.codigo, valor_referencia: it.valor_referencia === '' ? null : it.valor_referencia }));
      await atualizarPrecosMaoDeObra(itensAlterados);
      toast.success('Preços de referência salvos');
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  const porDisciplina = {};
  for (const it of itens) {
    const chave = it.disciplina || 'outros';
    (porDisciplina[chave] = porDisciplina[chave] || []).push(it);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, color: '#c9a227', fontWeight: 700, marginBottom: 4 }}>Preços de Mão de Obra (Referência)</h2>
          <p style={{ fontSize: 13, color: '#777', maxWidth: 720, lineHeight: 1.6 }}>
            Valor médio de mercado por serviço, usado só como <b>sugestão</b> na tela de Análise de Projeto — nunca
            preenchido sozinho no orçamento. Deixe em branco o que ainda não tiver uma referência confiável.
          </p>
        </div>
        <button onClick={salvar} disabled={salvando || alterados.size === 0} style={btnPrimario}>
          <Save size={13} style={{ marginRight: 6 }} /> {salvando ? 'Salvando...' : `Salvar Alterações${alterados.size > 0 ? ` (${alterados.size})` : ''}`}
        </button>
      </div>

      {carregando ? (
        <div style={card}><p style={{ fontSize: 13, color: '#777' }}>Carregando...</p></div>
      ) : (
        Object.entries(porDisciplina).map(([disciplina, lista]) => (
          <div key={disciplina} style={card}>
            <h3 style={tituloSecao}>{NOMES_DISCIPLINA[disciplina] || disciplina}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 0.6fr 1.2fr', gap: 10, marginBottom: 8, fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              <span>Descrição</span><span>Un.</span><span>Valor de referência (R$)</span>
            </div>
            {lista.map(it => (
              <div key={it.codigo} style={{ display: 'grid', gridTemplateColumns: '3fr 0.6fr 1.2fr', gap: 10, marginBottom: 8, alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#ccc' }}>{it.descricao}</span>
                <span style={{ color: '#777' }}>{it.unidade}</span>
                <input
                  type="number" step="0.01" min="0" placeholder="Sem referência"
                  value={it.valor_referencia ?? ''}
                  onChange={e => atualizarValor(it.codigo, e.target.value)}
                  style={{ fontSize: 13, borderColor: alterados.has(it.codigo) ? '#c9a227' : undefined }}
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

const card = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
  padding: 22, marginBottom: 16
};

const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 14 };

const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
};
