import { estilos } from '../../components/ui/estilos';

// Constantes e estilos da tela Materiais (pages/Materiais.js e as peças da pasta materiais/).
// Divisão da tela em 2.39 (antes ~800 linhas num arquivo só) — o visual ficou como era.

export const VAZIO = { codigo: '', descricao: '', categoria: '', unidade: 'un', preco: '', preco_compra: '', marca: '', ncm: '' };
export const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 'cx', 'pct', 'rl', 'sc', 'pç', 'kit', 'h'];
export const ORIGEM_LABEL = {
  manual: 'Manual', importacao: 'Importação', nota_xml: 'NF-e (XML)', nota_pdf: 'NF-e (PDF)',
  email_xml: 'E-mail (XML)', email_pdf: 'E-mail (PDF)', fornecedor_whatsapp: 'Orçamento fornecedor (pasta)',
  fornecedor_whatsapp_ocr: 'Orçamento fornecedor (pasta, OCR)', fornecedor_whatsapp_ia: 'Orçamento fornecedor (pasta, IA)',
  fornecedor_email: 'Orçamento fornecedor (e-mail)', fornecedor_email_ocr: 'Orçamento fornecedor (e-mail, OCR)', fornecedor_email_ia: 'Orçamento fornecedor (e-mail, IA)',
};

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário desta
// tela é o transparente de borda apagada do kit (btnContorno).
export const { th, td, tdVazio, btnPrimario, btnIcone } = estilos;

export const btnSecundario = { ...estilos.btnContorno, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' };
