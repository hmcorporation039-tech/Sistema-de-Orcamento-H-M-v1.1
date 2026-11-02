// CNPJ do fornecedor lido do texto de uma cotação: o primeiro CNPJ válido que não seja da própria H&M
// (o orçamento é endereçado à H&M, então o CNPJ dela aparece como cliente). Sem IA: o dígito verificador
// descarta número de pedido, inscrição estadual e ruído de OCR.
const RAIZ_PROPRIA = '04003376';

const soDigitos = (v) => String(v || '').replace(/\D/g, '');

function cnpjValido(valor) {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const digito = (base) => {
    let soma = 0, peso = base.length - 7;
    for (const n of base) { soma += Number(n) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digito(c.slice(0, 12)) === Number(c[12]) && digito(c.slice(0, 13)) === Number(c[13]);
}

const formatarCnpj = (v) => soDigitos(v).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

const ROTULO = /^(p[áa]gina|cnpj|cpf|endere[çc]o|inscri[çc][ãa]o|bairro|fone|telefone|cidade|rua|av\b|avenida|cliente|dados|emitido|e-?mail|contato|brasil|cep|or[çc]amento)/i;

// Linha que não pode ser o nome do fornecedor: a H&M (ou o dono) como cliente, endereço e rótulos.
const NAO_E_NOME = /H\s*&\s*M\b|HEM\s+ENGENHARIA|MARCIO\s+HENRIQUE|\b(cep|quadra|bloco|lote|setor|conjunto)\b|^(st|sh[a-z]*|q[a-z]{1,2}|sq[a-z]*|cl|rua|av|trecho)\s+\w*\d|nome:|raz[ãa]o social|\bUF:/i;

function candidato(texto) {
  const l = String(texto || '').replace(/\s+/g, ' ').trim();
  if (l.length < 4 || l.length > 80 || ROTULO.test(l) || NAO_E_NOME.test(l) || /\d{2}[/:.]\d{2}/.test(l) || /emitido em/i.test(l) || /^[\d(|.\-\s]/.test(l)) return null;
  return (l.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 6 && /[A-Za-zÀ-ÿ]{3,}/.test(l) ? l : null;
}

// Nome provável do fornecedor, por ordem: o que vem antes do CNPJ na mesma linha ("DISPEL ... LTDA - ME 06.159..."),
// a primeira linha de texto antes do CNPJ e, se nada serviu, as próximas linhas. Os layouts variam, então é
// só um palpite: a tela mostra o CNPJ junto e o nome pode ser corrigido.
function nomeAntesDe(linhas, indiceCnpj, inicioNaLinha) {
  const mesmaLinha = candidato(linhas[indiceCnpj].slice(0, inicioNaLinha).replace(/(cnpj|cpf)\s*[:/]*\s*$/i, '').replace(/[\s\-–:]+$/, ''));
  if (mesmaLinha) return mesmaLinha;
  for (let i = 0; i < indiceCnpj; i++) { const n = candidato(linhas[i]); if (n) return n; }
  for (let i = indiceCnpj + 1; i <= indiceCnpj + 3 && i < linhas.length; i++) { const n = candidato(linhas[i]); if (n) return n; }
  return null;
}

// -> { cnpj: '11953410000173', nome: 'ECO Automação Industrial Ltda' | null } ou null
function extrairFornecedor(texto) {
  const linhas = String(texto || '').split('\n');
  const re = /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g;
  for (let i = 0; i < linhas.length; i++) {
    for (const m of linhas[i].matchAll(re)) {
      const cnpj = soDigitos(m[0]);
      if (cnpj.startsWith(RAIZ_PROPRIA) || !cnpjValido(cnpj)) continue;
      return { cnpj, nome: nomeAntesDe(linhas, i, m.index) };
    }
  }
  return null;
}

module.exports = { cnpjValido, extrairFornecedor, formatarCnpj, soDigitos };
