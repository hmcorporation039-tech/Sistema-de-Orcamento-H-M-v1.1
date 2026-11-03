import { FileDown, Send, FilePlus2, Calculator } from 'lucide-react';
import { formatarMoeda } from '../../utils/format';
import BotaoLinkAprovacao from '../../components/BotaoLinkAprovacao';
import { temBdiMateriais } from './apoio';
import { Totalzinho } from './Dicas';
import { btnPrimario, btnSecundario, btnUsar, card, fieldsetLimpo, rotulo } from './estilos';

// Barra de totais do editor de orçamento (fixa no rodapé): subtotais, impostos, BDI, reajustes,
// total geral e os botões de salvar, PDF, planilha, e-mail e link de aprovação.
export default function BarraTotais({
  ajusteMaoDeObraInput, ajusteMateriaisInput, alteracoesPendentes, anexosPdf, aplicarAjustePercentual,
  atualizarStatusSalvo, baixarPdf, baixarPlanilha, editandoId, ehPublico, form, gerandoPdf,
  gerandoPlanilha, idAtual, memoriaBdi, novoOrcamento, propostaSalva, removerComposicaoBdi, salvando,
  salvar, salvarComoCopia, setAjusteMaoDeObraInput, setAjusteMateriaisInput, setAnexosPdf,
  setCalculadoraBdiAberta, setForm, setModalEmail, somenteLeitura, subtotalMaoObra, subtotalMateriais,
  sujo, total, valorBdi, valorBdiMaoObra, valorBdiMateriais, valorImpostoServico, valorImpostoVenda,
}) {
  return (
    <div style={{ ...card, position: 'sticky', bottom: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <fieldset disabled={!!somenteLeitura} style={{ ...fieldsetLimpo, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <Totalzinho label="Materiais" valor={subtotalMateriais} />
          <Totalzinho label="Mão de obra" valor={subtotalMaoObra} />
          <div>
            <label style={rotulo}>Imp. Vendas (%)</label>
            <input type="number" step="0.1" min="0" value={form.imposto_venda} onChange={e => setForm({ ...form, imposto_venda: e.target.value })} style={{ width: 80 }} />
            <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>{formatarMoeda(valorImpostoVenda)}</div>
          </div>
          <div>
            <label style={rotulo}>Imp. Serviços (%)</label>
            <input type="number" step="0.1" min="0" value={form.imposto_servico} onChange={e => setForm({ ...form, imposto_servico: e.target.value })} style={{ width: 80 }} />
            <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>{formatarMoeda(valorImpostoServico)}</div>
          </div>
          <div>
            <label style={rotulo}>{temBdiMateriais(form.bdi_materiais) ? 'BDI mão de obra (%)' : 'BDI (%)'}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="number" step="0.01" min="0" value={form.bdi} onChange={e => setForm({ ...form, bdi: e.target.value })} style={{ width: 80 }} />
              <button type="button" onClick={() => setCalculadoraBdiAberta(true)}
                style={{ ...btnSecundario, padding: '4px 8px', fontSize: 12, ...(ehPublico && !memoriaBdi ? { borderStyle: 'solid', borderColor: '#c9a227', color: '#c9a227' } : {}) }}
                title="Calcular o BDI pela fórmula do TCU (Acórdão 2.622/2013) — tipo de obra, regime, parcelas e faixas de referência">
                <Calculator size={12} style={{ marginRight: 3 }} /> TCU
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>
              {formatarMoeda(temBdiMateriais(form.bdi_materiais) ? valorBdiMaoObra : valorBdi)}
              {memoriaBdi && (
                <span title={`Composição pelo TCU guardada na proposta (${memoriaBdi.regime === 'desonerado' ? 'desonerado' : 'não desonerado'})`} style={{ color: '#8a7333' }}>
                  {' '}· composição <button type="button" onClick={removerComposicaoBdi} style={btnUsar} title="Remover a composição do BDI">remover</button>
                </span>
              )}
            </div>
          </div>
          {form.bdi_materiais != null && (
            <div>
              <label style={rotulo} title="BDI diferenciado (reduzido) para o fornecimento de materiais — Acórdão 2.622/2013-TCU. Vazio = o mesmo BDI para tudo.">BDI materiais (%)</label>
              <input type="number" step="0.01" min="0" value={form.bdi_materiais} onChange={e => setForm({ ...form, bdi_materiais: e.target.value })} style={{ width: 80 }} />
              <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 4 }}>{formatarMoeda(valorBdiMateriais)}</div>
            </div>
          )}
          <div>
            <label style={rotulo} title="Multiplica o valor unitário de cada item de Materiais por esse percentual. (+) aumenta, (-) desconta. Roda na hora, ao clicar em Aplicar — não recalcula sozinho depois.">Reajuste Materiais (%)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="number" step="0.1" value={ajusteMateriaisInput} onChange={e => setAjusteMateriaisInput(e.target.value)} placeholder="+10 / -10" style={{ width: 70 }} />
              <button
                type="button"
                onClick={() => { aplicarAjustePercentual('materiais', ajusteMateriaisInput); setAjusteMateriaisInput(''); }}
                style={{ ...btnSecundario, padding: '4px 8px', fontSize: 12 }}
              >
                Aplicar
              </button>
            </div>
            {form.desconto_materiais_pct < 0 && (
              <div style={{ fontSize: 10.5, color: '#e08080', marginTop: 4 }}>Desconto de {Math.abs(form.desconto_materiais_pct)}% já aplicado</div>
            )}
          </div>
          <div>
            <label style={rotulo} title="Multiplica o valor unitário de cada item de Mão de Obra por esse percentual. (+) aumenta, (-) desconta. Roda na hora, ao clicar em Aplicar — não recalcula sozinho depois.">Reajuste Mão de Obra (%)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="number" step="0.1" value={ajusteMaoDeObraInput} onChange={e => setAjusteMaoDeObraInput(e.target.value)} placeholder="+10 / -10" style={{ width: 70 }} />
              <button
                type="button"
                onClick={() => { aplicarAjustePercentual('maoDeObra', ajusteMaoDeObraInput); setAjusteMaoDeObraInput(''); }}
                style={{ ...btnSecundario, padding: '4px 8px', fontSize: 12 }}
              >
                Aplicar
              </button>
            </div>
            {form.desconto_mao_obra_pct < 0 && (
              <div style={{ fontSize: 10.5, color: '#e08080', marginTop: 4 }}>Desconto de {Math.abs(form.desconto_mao_obra_pct)}% já aplicado</div>
            )}
          </div>
          <div>
            <div style={rotulo}>Total geral</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a227' }}>{formatarMoeda(total)}</div>
          </div>
        </fieldset>
        {somenteLeitura ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#8ab4f8', marginRight: 4, whiteSpace: 'nowrap' }}>Somente leitura</span>
            {idAtual && !sujo && (<>
              <button onClick={baixarPdf} disabled={gerandoPdf} style={btnSecundario}>
                <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
              </button>
              <button onClick={baixarPlanilha} disabled={gerandoPlanilha} style={btnSecundario}>
                <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPlanilha ? 'Gerando...' : 'Planilha Excel'}
              </button>
            </>)}
            <button onClick={salvarComoCopia} disabled={salvando} style={{ ...btnPrimario, padding: '13px 20px', fontSize: 13 }}>
              {salvando ? 'Salvando...' : sujo ? 'Salvar como cópia minha' : 'Duplicar para mim'}
            </button>
          </div>
        ) : propostaSalva ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: alteracoesPendentes ? '#c9a227' : '#3fb95f', marginRight: 4, whiteSpace: 'nowrap' }}>
              {alteracoesPendentes
                ? `Proposta ${propostaSalva.numero} — alterações não salvas`
                : `Proposta ${propostaSalva.numero} salva`}
            </span>
            {alteracoesPendentes && (
              <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, padding: '13px 20px', fontSize: 13 }}>
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            )}
            <button onClick={baixarPdf} disabled={gerandoPdf || alteracoesPendentes} style={btnSecundario}
              title={alteracoesPendentes ? 'Salve as alterações antes de gerar o PDF' : ''}>
              <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
            </button>
            {/* anexos opcionais do PDF (Fase 3F) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5, color: 'var(--texto-3)' }} title="Anexos no fim do PDF da proposta">
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={anexosPdf.curva_abc} onChange={e => setAnexosPdf(a => ({ ...a, curva_abc: e.target.checked }))} style={{ width: 'auto' }} />
                anexo curva ABC
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}
                title={memoriaBdi ? 'Composição do BDI pela fórmula do TCU (exigida em proposta para órgão público)' : 'Sem composição calculada: o anexo mostra só o BDI adotado'}>
                <input type="checkbox" checked={anexosPdf.composicao_bdi} onChange={e => setAnexosPdf(a => ({ ...a, composicao_bdi: e.target.checked }))} style={{ width: 'auto' }} />
                anexo composição do BDI
              </label>
            </div>
            <button onClick={baixarPlanilha} disabled={gerandoPlanilha || alteracoesPendentes} style={btnSecundario}
              title={alteracoesPendentes ? 'Salve as alterações antes de gerar a planilha' : 'Planilha para o cliente: orçamento, resumo, pesquisa de preços, fornecedores e cronograma'}>
              <FileDown size={13} style={{ marginRight: 4 }} /> {gerandoPlanilha ? 'Gerando...' : 'Planilha Excel'}
            </button>
            <button onClick={() => setModalEmail(true)} disabled={alteracoesPendentes} style={btnSecundario}
              title={alteracoesPendentes ? 'Salve as alterações antes de enviar' : ''}>
              <Send size={13} style={{ marginRight: 4 }} /> Enviar E-mail
            </button>
            <BotaoLinkAprovacao propostaId={propostaSalva.id} numero={propostaSalva.numero}
              status={propostaSalva.status} onAlterado={atualizarStatusSalvo} />
            <button onClick={novoOrcamento} style={{ ...btnPrimario, padding: '13px 20px', fontSize: 13 }}>
              <FilePlus2 size={13} style={{ marginRight: 4 }} /> Novo Orçamento
            </button>
          </div>
        ) : (
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrimario, padding: '13px 26px', fontSize: 13 }}>
            {salvando ? 'Salvando...' : (editandoId ? 'Salvar Alterações' : 'Salvar Proposta')}
          </button>
        )}
      </div>
    </div>
  );
}
