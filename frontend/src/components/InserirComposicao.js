import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Layers, X } from 'lucide-react';
import { getComposicoes, explodirComposicao } from '../services/api';
import Select, { comparador } from './Select';
import Modal from './ui/Modal';
import { formatarMoeda as moeda } from '../utils/format';
import { ROTULO_SEGMENTO } from '../utils/disciplinasServico';
import useDisciplinas from '../hooks/useDisciplinas';

/*
 * Botão "+ Kit/composição" do editor de orçamento (versão 2.0, Fase 3H).
 *
 * Abre a escolha de uma composição ativa (lista A–Z por disciplina), pede a
 * quantidade, mostra a prévia dos itens (o servidor "explode" a composição:
 * POST /composicoes/explodir) e chama onInserir com os itens já no formato
 * dos itens de Orcamento.js. A proposta NÃO guarda a composição — os itens
 * entram como itens comuns, agrupados no subgrupo da disciplina do kit.
 *
 * Props
 *   segmento  'publico' | 'privado'  — referência de preço dos serviços (órgão
 *             público → oficial; demais → particular; valor H&M tem prioridade)
 *   onInserir (itens) => void         — recebe a lista abaixo
 *   disabled  boolean                 — desabilita o botão
 *
 * Cada item entregue a onInserir (mesmos campos de um item de Orcamento.js,
 * mais `secao`/`tipo`/`origem_composicao`; `sid` vem null — quem insere
 * escolhe a seção, ver distribuirNasSecoes):
 *   { id: 'tmp_kit_…', sid: null,
 *     secao: 'Materiais e Equipamentos' | 'Serviços (Mão de Obra)',
 *     tipo: 'material' | 'servico',
 *     material_id: number|null, descricao, quantidade (coef × qtd, 3 casas),
 *     unidade, valor_unitario (0 quando a cotar), ncm: '', codigo: '' | código
 *     do serviço | código do material, subgrupo (disciplina: 'Elétrica',
 *     'Redes'…), status: 'confirmado' | 'a_cotar', origem_composicao: 'KIT-ELE-01' }
 *   status 'confirmado' só com preço fechado (catálogo ou valor H&M adotado);
 *   referência de mercado e item sem preço entram 'a_cotar'.
 *
 * Exemplo de uso em Orcamento.js:
 *
 *   import InserirComposicao, { distribuirNasSecoes } from '../components/InserirComposicao';
 *   ...
 *   <InserirComposicao
 *     segmento={segmento}
 *     disabled={carregandoEdicao}
 *     onInserir={(novos) => {
 *       const { secoes: s2, itens: comSid } = distribuirNasSecoes(novos, secoes, { gerarId, ehMaoDeObra });
 *       setSecoes(s2);
 *       setItens(atual => {
 *         let lista = [...atual, ...comSid];
 *         for (const sid of new Set(comSid.map(i => i.sid))) lista = reordenarPorSubgrupo(lista, sid);
 *         return lista;
 *       });
 *     }}
 *   />
 */

const SECAO_MATERIAIS = 'Materiais e Equipamentos';
const SECAO_SERVICOS = 'Serviços (Mão de Obra)';
// mesma regra de ehMaoDeObra (Orcamento.js): seção cujo nome sugere serviço
const ehSecaoDeServico = (nome) => /m[ãa]o.?de.?obra|serviç|servic/i.test(nome || '');
let contador = 0;
const gerarIdPadrao = () => `tmp_kit_${Date.now()}_${contador++}`;
const qtdBR = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

// Converte a resposta de /composicoes/explodir nos itens do editor
export function itensParaOrcamento(resposta, gerarId = gerarIdPadrao) {
  return (resposta?.itens || []).map(it => ({
    id: gerarId(), sid: null,
    secao: it.secao, tipo: it.tipo,
    material_id: it.material_id || null,
    descricao: it.descricao,
    quantidade: Number(it.quantidade) || 0,
    unidade: it.unidade || 'un',
    valor_unitario: Number(it.valor_unitario) || 0,
    ncm: it.ncm || '',
    codigo: it.codigo || '',
    subgrupo: it.subgrupo || '',
    status: it.status === 'confirmado' ? 'confirmado' : 'a_cotar',
    origem_composicao: it.origem || resposta?.composicao?.codigo || '',
  }));
}

// Põe cada item numa seção existente do tipo certo (a primeira de serviço ou de
// material) ou cria a seção que faltar. Devolve { secoes, itens } novos — não
// altera os recebidos. `ehMaoDeObra` e `gerarId` podem vir do Orcamento.js.
export function distribuirNasSecoes(itens, secoes, { gerarId = gerarIdPadrao, ehMaoDeObra = ehSecaoDeServico } = {}) {
  const lista = [...(secoes || [])];
  const secaoDe = (ehServico) => {
    let sec = lista.find(s => !!ehMaoDeObra(s.nome) === ehServico);
    if (!sec) {
      sec = { id: gerarId(), nome: ehServico ? SECAO_SERVICOS : SECAO_MATERIAIS };
      lista.push(sec);
    }
    return sec.id;
  };
  const comSid = itens.map(it => ({ ...it, sid: secaoDe(it.tipo === 'servico' || it.secao === SECAO_SERVICOS) }));
  return { secoes: lista, itens: comSid };
}

export default function InserirComposicao({ segmento = 'privado', onInserir, disabled = false }) {
  const { nomeServico: nomeDisciplina } = useDisciplinas();
  const seg = segmento === 'publico' ? 'publico' : 'privado';
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!aberto || lista) return;
    getComposicoes().then(r => setLista(r.data.itens || [])).catch(() => { setLista([]); toast.error('Erro ao carregar as composições'); });
  }, [aberto, lista]);

  const grupos = useMemo(() => {
    const por = {};
    for (const c of lista || []) (por[c.disciplina] = por[c.disciplina] || []).push(c);
    return Object.entries(por).map(([d, l]) => ({ d, nome: nomeDisciplina(d), l })).sort((a, b) => comparador.compare(a.nome, b.nome));
  }, [lista, nomeDisciplina]);

  const qtd = Number(String(quantidade).replace(',', '.'));
  // prévia: o servidor calcula (mesma regra da base de preços), 300 ms depois da última mudança
  useEffect(() => {
    setErro('');
    if (!aberto || !codigo || !(qtd > 0)) { setPrevia(null); return undefined; }
    const n = ++pedido.current;
    setCarregando(true);
    const t = setTimeout(() => {
      explodirComposicao(codigo, qtd, seg)
        .then(r => { if (n === pedido.current) setPrevia(r.data); })
        .catch(e => { if (n === pedido.current) { setPrevia(null); setErro(e.response?.data?.erro || 'Erro ao montar os itens'); } })
        .finally(() => { if (n === pedido.current) setCarregando(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [aberto, codigo, qtd, seg]);

  function fechar() {
    setAberto(false);
    setPrevia(null);
    setCodigo('');
    setQuantidade('1');
    setLista(null); // na próxima abertura, pega preços/kits atualizados
  }

  function inserir() {
    if (!previa?.itens?.length) return;
    onInserir?.(itensParaOrcamento(previa));
    const cotar = previa.itens_a_cotar;
    toast.success(`${previa.itens.length} item(ns) de "${previa.composicao.descricao}" inseridos${cotar ? ` — ${cotar} a cotar` : ''}`);
    fechar();
  }

  return (
    <>
      <button type="button" style={btnAbrir} disabled={disabled} onClick={() => setAberto(true)} data-teste="botao-inserir-composicao">
        <Layers size={13} style={{ marginRight: 5 }} /> + Kit/composição
      </button>
      {aberto && (
        // cabeçalho próprio (X sem borda) — mantido como era
        <Modal rotulo="Inserir kit ou composição" data-teste="modal-inserir-composicao" onFechar={fechar}
          largura={820} style={{ padding: 24, maxHeight: '88vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, color: '#c9a227', fontWeight: 700 }}>Inserir kit / composição</div>
              <button type="button" style={btnFechar} onClick={fechar} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div style={{ fontSize: 11.5, color: '#888', marginBottom: 12 }}>
              Os itens entram na proposta como itens comuns (materiais e mão de obra), com preços da referência {ROTULO_SEGMENTO[seg]}.
              Sem preço, o item entra a cotar.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 12 }}>
              <label style={rotulo}>Composição
                <Select value={codigo} onChange={e => setCodigo(e.target.value)} aria-label="Composição">
                  <option value="">{lista == null ? 'Carregando…' : lista.length ? 'Escolha o kit…' : 'Nenhuma composição ativa'}</option>
                  {grupos.map(g => (
                    <optgroup key={g.d} label={g.nome}>
                      {g.l.map(c => {
                        const cu = c.custo?.[seg];
                        return <option key={c.codigo} value={c.codigo}>{`${c.descricao} (${c.codigo}) — ${moeda(cu?.custo_unitario)}/${c.unidade}${cu?.itens_a_cotar ? ` + ${cu.itens_a_cotar} a cotar` : ''}`}</option>;
                      })}
                    </optgroup>
                  ))}
                </Select>
              </label>
              <label style={rotulo}>Quantidade
                <input inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value)} aria-label="Quantidade" />
              </label>
            </div>

            {erro && <div style={{ color: '#e57373', fontSize: 12, marginBottom: 10 }}>{erro}</div>}
            {codigo && !(qtd > 0) && <div style={{ color: '#e57373', fontSize: 12, marginBottom: 10 }}>Informe uma quantidade maior que zero.</div>}
            {carregando && !previa && <div style={{ color: '#888', fontSize: 12 }}>Montando a prévia…</div>}
            {previa && (
              <div data-teste="previa-composicao" style={{ opacity: carregando ? 0.6 : 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ color: '#666', textAlign: 'left' }}>
                      <th style={th}>Seção</th><th style={th}>Descrição</th><th style={{ ...th, textAlign: 'right' }}>Qtd</th>
                      <th style={th}>Un</th><th style={{ ...th, textAlign: 'right' }}>Unitário</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.itens.map((it, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #1c1c1c' }}>
                        <td style={{ ...td, color: '#888', whiteSpace: 'nowrap' }}>{it.tipo === 'servico' ? 'Mão de obra' : 'Material'}</td>
                        <td style={td}>{it.descricao}{it.a_cotar && <div style={{ color: '#d9a441', fontSize: 10.5 }}>{it.motivo}</div>}
                          {!it.a_cotar && it.observacao_preco && <div style={{ color: '#8fb3d9', fontSize: 10.5 }}>{it.observacao_preco}</div>}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{qtdBR(it.quantidade)}</td>
                        <td style={td}>{it.unidade}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{it.a_cotar ? <span style={{ color: '#d9a441' }}>a cotar</span> : moeda(it.valor_unitario)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{it.a_cotar ? '—' : moeda(it.valor_total)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid #2a2a2a', fontWeight: 700 }}>
                      <td style={td} colSpan={5}>Total ({qtdBR(previa.quantidade)} × {moeda(previa.custo_unitario)}/{previa.composicao.unidade}){previa.itens_a_cotar ? ` + ${previa.itens_a_cotar} a cotar` : ''}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{moeda(previa.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" style={btnSecundario} onClick={fechar}>Cancelar</button>
              <button type="button" style={btnPrimario} disabled={!previa?.itens?.length || carregando} onClick={inserir} data-teste="confirmar-inserir-composicao">
                {previa?.itens?.length ? `Inserir ${previa.itens.length} itens` : 'Inserir'}
              </button>
            </div>
        </Modal>
      )}
    </>
  );
}

const btnAbrir = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent', border: '1px dashed #5a4a1a',
  borderRadius: 6, color: '#c9a227', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnPrimario = { padding: '9px 16px', background: '#c9a227', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const btnSecundario = { padding: '8px 14px', background: 'transparent', border: '1px dashed #333', borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 11, cursor: 'pointer' };
const btnFechar = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' };
const rotulo = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#888' };
const th = { padding: '5px 8px 5px 0', fontWeight: 600, fontSize: 11 };
const td = { padding: '5px 8px 5px 0', verticalAlign: 'top' };
