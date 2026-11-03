import { formatarMoeda } from '../../utils/format';
import { ROTULO_SEGMENTO } from '../../utils/disciplinasServico';
import { btnUsar, rotulo } from './estilos';

// Dicas de preço da linha do orçamento (referência, catálogo, já vendido) e o total pequeno da barra.

// Referências do serviço do item, como na Análise de Projeto: "Ref." é o valor
// H&M adotado (tela Preços de Mão de Obra) e oficial / particular são as
// referências de mercado; só aparecem quando diferem do valor da linha, e a do
// segmento do cliente vem destacada. "usar" troca o valor unitário.
export function DicasReferencia({ servico, segmento, valor, onUsar }) {
  if (!servico) return null;
  const dicas = [
    ['hm', servico.valor_referencia, 'valor adotado pela H&M (tela Preços de Mão de Obra)'],
    ['publico', servico.valor_publico, servico.fonte_publico],
    ['privado', servico.valor_privado, servico.fonte_privado],
  ].filter(([, v]) => v != null && Number(v) !== Number(valor || 0));
  if (!dicas.length) return null;
  return dicas.map(([seg, v, fonte]) => (
    <div key={seg} style={{ fontSize: 10.5, color: seg === 'hm' || seg === segmento ? '#8a7333' : '#6f7f8f', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={seg === 'hm' ? `Referência: ${fonte}` : `Referência ${ROTULO_SEGMENTO[seg]}${seg === segmento ? ' (segmento do cliente)' : ''}${fonte ? ` — ${fonte}` : ''}`}>
      {seg === 'hm' ? 'Ref.' : seg === 'publico' ? 'oficial' : 'particular'}: {formatarMoeda(v)}{' '}
      <button type="button" onClick={() => onUsar(Number(v))} style={btnUsar}>usar</button>
    </div>
  ));
}

// Preço do material no catálogo, quando o item está ligado a ele e o valor da
// linha é outro (pesquisa de mercado adotada, reajuste, digitado à mão).
export function DicaCatalogo({ material, valor, onUsar }) {
  if (!material || material.preco == null || !(Number(material.preco) > 0) || Number(material.preco) === Number(valor || 0)) return null;
  return (
    <div style={{ fontSize: 10.5, color: '#8a7333', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={`Preço do catálogo de materiais — ${material.descricao}`}>
      catálogo: {formatarMoeda(material.preco)}{' '}
      <button type="button" onClick={() => onUsar(Number(material.preco))} style={btnUsar}>usar</button>
    </div>
  );
}

// Faixa do valor unitário (antes do BDI, como lançado no item) em propostas aprovadas: menor – maior, mediana e quantas
// propostas. Avisa quando o valor da linha está abaixo do menor preço já vendido, e quando o
// custo de compra do catálogo passou do último preço vendido (venda no prejuízo).
export function DicaVendido({ faixa, valor, material }) {
  if (!faixa) return null;
  const v = Number(valor) || 0;
  const custo = Number(material?.preco_compra) || 0;
  const abaixo = v > 0 && v < faixa.minimo;
  const custoAcima = custo > faixa.ultimo;
  const [ano, mes, dia] = String(faixa.ultima_data || '').split('-');
  const quando = ano ? ` em ${dia}/${mes}/${ano}` : '';
  const alertas = [
    abaixo && `abaixo do menor valor unitário já aprovado (${formatarMoeda(faixa.minimo)})`,
    custoAcima && `custo de compra ${formatarMoeda(custo)} acima do último valor unitário aprovado (${formatarMoeda(faixa.ultimo)})`,
  ].filter(Boolean);
  const linha = { fontSize: 10.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  return (
    <>
      <div style={{ ...linha, color: '#6f7f8f' }}
        title={`Valor unitário (antes do BDI) já lançado em propostas aprovadas (${faixa.propostas} proposta${faixa.propostas > 1 ? 's' : ''}). Último: ${formatarMoeda(faixa.ultimo)} na proposta ${faixa.ultima_proposta}${quando}.`}>
        vendido: {faixa.minimo === faixa.maximo ? formatarMoeda(faixa.minimo) : `${formatarMoeda(faixa.minimo)} – ${formatarMoeda(faixa.maximo)}`}
        {faixa.propostas > 1 ? ` · mediana ${formatarMoeda(faixa.mediana)}` : ''} · {faixa.propostas}×
      </div>
      {alertas.map(a => <div key={a} style={{ ...linha, color: '#e08080' }} title={a}>⚠ {a}</div>)}
    </>
  );
}

export function Totalzinho({ label, valor }) {
  return (
    <div>
      <div style={rotulo}>{label}</div>
      <div style={{ fontSize: 15, color: '#ccc', fontWeight: 600 }}>{formatarMoeda(valor)}</div>
    </div>
  );
}
