import { Children, cloneElement, isValidElement, useId } from 'react';

// Rótulo ligado ao campo (acessibilidade, 2.39): o <label> do Campo não tinha
// htmlFor e o campo não tinha id — o leitor de tela lia "caixa de texto" sem
// nome, e clicar no rótulo não levava ao campo. Em vez de reescrever cada
// formulário à mão, o Campo do kit (e as cópias locais que sobraram) usam este
// gancho: o PRIMEIRO filho que é um campo ganha um id gerado (useId) — ou mantém
// o id que já tinha — e o rótulo aponta para ele.
//
// Conta como campo: <input> (menos checkbox/radio/hidden, que já ficam dentro do
// próprio <label>), <select>, <textarea> e os componentes que repassam o `id`
// para o campo de verdade — marcados com `encaminhaId = true` (Select,
// CampoMoeda, CampoCliente, ClienteSelect, ObraSelect, BuscaCodigo, CampoBusca,
// EscolhaCnae).
//
// Sem campo para ligar (um <div> com botões, um texto, um checkbox com o próprio
// <label>), o rótulo deixa de ser um <label> que não rotula nada (2.40): vira
// <span> com id e a caixa vira um grupo nomeado por ele (role="group" +
// aria-labelledby) — o leitor de tela anuncia "grupo, ISS retido" ao entrar.
// O visual não muda (o estilo do rótulo é o mesmo).
const NATIVOS = new Set(['input', 'select', 'textarea']);
const SEM_ROTULO_EXTERNO = new Set(['checkbox', 'radio', 'hidden']);

export function ehCampo(el) {
  if (!isValidElement(el)) return false;
  if (el.type === 'input' && SEM_ROTULO_EXTERNO.has(el.props.type)) return false;
  return NATIVOS.has(el.type) || el.type?.encaminhaId === true;
}

// → { idCampo, idRotulo, filhos, propsCaixa }
//   idCampo: id do campo ligado; null quando não há campo (o rótulo usa idRotulo)
//   propsCaixa: {} com campo; { role: 'group', 'aria-labelledby': idRotulo } sem campo
export function useRotuloLigado(children) {
  const gerado = useId().replace(/:/g, '-');
  const idRotulo = `rotulo${gerado}`;
  // Children.map só quando há o que ligar: assim o filho único não ganha chave nova
  const alvo = Children.toArray(children).find(ehCampo);
  if (!alvo) return { idCampo: null, idRotulo, filhos: children, propsCaixa: { role: 'group', 'aria-labelledby': idRotulo } };
  const idCampo = alvo.props.id || `campo${gerado}`;
  if (alvo.props.id) return { idCampo, idRotulo, filhos: children, propsCaixa: {} };
  let feito = false;
  const filhos = Children.map(children, (f) => {
    if (feito || !ehCampo(f)) return f;
    feito = true;
    return cloneElement(f, { id: idCampo });
  });
  return { idCampo, idRotulo, filhos, propsCaixa: {} };
}

// O rótulo que acompanha o useRotuloLigado: <label htmlFor> quando há campo,
// <span id> (o nome do grupo) quando não há.
export function Rotulo({ ligacao, style, title, children }) {
  return ligacao.idCampo
    ? <label style={style} title={title} htmlFor={ligacao.idCampo}>{children}</label>
    : <span style={style} title={title} id={ligacao.idRotulo}>{children}</span>;
}
