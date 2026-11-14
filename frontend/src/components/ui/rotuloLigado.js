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
// CampoMoeda, CampoCliente, ClienteSelect, ObraSelect). Outro filho (um <div>
// com botões, um texto) fica como estava: o rótulo sem htmlFor, como antes.
const NATIVOS = new Set(['input', 'select', 'textarea']);
const SEM_ROTULO_EXTERNO = new Set(['checkbox', 'radio', 'hidden']);

export function ehCampo(el) {
  if (!isValidElement(el)) return false;
  if (el.type === 'input' && SEM_ROTULO_EXTERNO.has(el.props.type)) return false;
  return NATIVOS.has(el.type) || el.type?.encaminhaId === true;
}

// → { idCampo, filhos }: idCampo é null quando não há campo para ligar
export function useRotuloLigado(children) {
  const gerado = useId();
  let idCampo = null;
  // Children.map só quando há o que ligar: assim o filho único não ganha chave nova
  const alvo = Children.toArray(children).find(ehCampo);
  if (!alvo) return { idCampo, filhos: children };
  idCampo = alvo.props.id || `campo${gerado.replace(/:/g, '-')}`;
  if (alvo.props.id) return { idCampo, filhos: children };
  let feito = false;
  const filhos = Children.map(children, (f) => {
    if (feito || !ehCampo(f)) return f;
    feito = true;
    return cloneElement(f, { id: idCampo });
  });
  return { idCampo, filhos };
}
