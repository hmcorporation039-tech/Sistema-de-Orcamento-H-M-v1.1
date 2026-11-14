import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { importarMateriais, extrairNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { Campo } from '../../components/ui/estilos';
import CampoMoeda from '../../components/CampoMoeda';
import { arred2 } from '../../utils/dinheiro';
import { th, btnPrimario, btnSecundario, btnIcone } from './apoio';

// Importar materiais de uma nota fiscal: lê o XML da NF-e (completo) ou o PDF do DANFE
// (confira), sugere o preço de venda pela margem padrão e importa os itens conferidos.
// Usa o <datalist id="categorias-lista"> da página. onImportado = recarregar a lista.
export default function ModalNotaFiscal({ margemPadrao, onFechar, onImportado }) {
  const [lendoNota, setLendoNota] = useState(false);
  const [fonteNota, setFonteNota] = useState(null);
  const [itensNota, setItensNota] = useState(null);
  const [categoriaPadraoNota, setCategoriaPadraoNota] = useState('');
  const [importandoNota, setImportandoNota] = useState(false);
  const inputArquivoRef = useRef(null);

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
          preco: arred2(precoCompra * (1 + margem / 100)),
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
      onFechar();
      onImportado();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao importar materiais da nota fiscal');
    } finally {
      setImportandoNota(false);
    }
  }

  return (
    <Modal titulo="Importar Nota Fiscal" onFechar={onFechar} largura={itensNota ? 980 : 520} espacoTitulo={14}>
        {!itensNota && (
          <>
            <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 16, lineHeight: 1.6 }}>
              Envie o <b>XML da NF-e</b> (recomendado — leitura completa: descrição, NCM/SH, unidade e preço)
              ou o <b>PDF do DANFE</b> (lê descrição e NCM/SH; categoria, unidade e preço ficam para você conferir).
            </p>
            <input
              ref={inputArquivoRef}
              type="file"
              accept=".pdf,.xml,application/pdf,text/xml,application/xml"
              onChange={lerArquivoNota}
              disabled={lendoNota}
              aria-label="Arquivo da nota fiscal (XML ou PDF)"
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

            <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginBottom: 8 }}>
              Fonte: {fonteNota === 'xml' ? 'XML da NF-e (dados completos)' : 'PDF do DANFE (confira os valores)'} ·
              {' '}{itensNota.length} {itensNota.length === 1 ? 'item lido' : 'itens lidos'}
            </p>

            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                        <input value={it.descricao} onChange={e => atualizarItemNota(idx, 'descricao', e.target.value)} aria-label="Descrição" />
                      </td>
                      <td style={{ padding: 6 }}>
                        <input value={it.ncm} onChange={e => atualizarItemNota(idx, 'ncm', e.target.value)} aria-label="NCM/SH" />
                      </td>
                      <td style={{ padding: 6 }}>
                        <input list="categorias-lista" value={it.categoria} onChange={e => atualizarItemNota(idx, 'categoria', e.target.value)} aria-label="Categoria" />
                      </td>
                      <td style={{ padding: 6 }}>
                        <input value={it.unidade} onChange={e => atualizarItemNota(idx, 'unidade', e.target.value)} aria-label="Unidade" />
                      </td>
                      <td style={{ padding: 6 }}>
                        <CampoMoeda aria-label="Preço de compra" value={it.preco_compra} onChange={v => atualizarItemNota(idx, 'preco_compra', v)} />
                      </td>
                      <td style={{ padding: 6 }}>
                        <CampoMoeda aria-label="Preço de venda" value={it.preco} onChange={v => atualizarItemNota(idx, 'preco', v)} />
                      </td>
                      <td style={{ padding: 6 }}>
                        <button onClick={() => removerItemNota(idx)} style={{ ...btnIcone, display: 'flex', color: '#b04040', width: 22, height: 22 }} title="Remover">
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
    </Modal>
  );
}
