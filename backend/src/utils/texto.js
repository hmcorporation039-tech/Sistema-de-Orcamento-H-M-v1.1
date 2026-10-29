// Normalização de texto para COMPARAR nomes — um lugar só (estava copiada na
// pasta do cliente, na compatibilização por posição, na classificação de
// arquivos do pacote e no assistente). Não mude a regra sem conferir: as chaves
// de comparação de pastas já gravadas dependem dela.

// sem acento (mantém maiúsculas/minúsculas)
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// chave de nome: MAIÚSCULAS, sem acento, tudo que não é letra/dígito vira um espaço
// ("Clínica São José-2" → "CLINICA SAO JOSE 2")
const chaveNome = (s) => semAcento(String(s || '').toUpperCase()).replace(/[^A-Z0-9]+/g, ' ').trim();

module.exports = { semAcento, chaveNome };
