import React, { Children, cloneElement, forwardRef, isValidElement } from 'react';

// Lista suspensa padrão do sistema: SEMPRE mostra as opções em ordem
// alfabética (regra do usuário, 10/10/2026 — vale para qualquer lista, de
// categorias a status). Ordem do português: ignora acentos e maiúsculas e põe
// números em ordem natural ("2 MP" antes de "12 MP"). A opção-guia de valor
// vazio ("Todos", "Selecione...", "Nenhuma", "+ catálogo") fica sempre no topo.
// Dentro de <optgroup>, ordena as opções de cada grupo. Use no lugar de <select>.

const comparador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

function textoDe(no) {
  if (no == null || typeof no === 'boolean') return '';
  if (typeof no === 'string' || typeof no === 'number') return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join('');
  if (isValidElement(no)) return textoDe(no.props.children);
  return '';
}

// texto exibido; na <datalist> a opção costuma ter só value
const chave = (op) => textoDe(op?.props?.children) || String(op?.props?.value ?? '');

function ordenarOpcoes(filhos) {
  const lista = Children.toArray(filhos);
  const guias = [];
  const opcoes = [];
  for (const f of lista) {
    if (isValidElement(f) && f.type === 'optgroup') {
      opcoes.push(cloneElement(f, {}, ordenarOpcoes(f.props.children)));
    } else if (isValidElement(f) && f.type === 'option' && (f.props.value === '' || (f.props.value === undefined && textoDe(f.props.children) === ''))) {
      guias.push(f);
    } else {
      opcoes.push(f);
    }
  }
  const grupos = opcoes.filter(f => isValidElement(f) && f.type === 'optgroup');
  const simples = opcoes.filter(f => !(isValidElement(f) && f.type === 'optgroup'))
    .sort((a, b) => comparador.compare(chave(a), chave(b)));
  return [...guias, ...simples, ...grupos];
}

const Select = forwardRef(function Select({ children, ...props }, ref) {
  return <select ref={ref} {...props}>{ordenarOpcoes(children)}</select>;
});

// Lista de sugestões de campo de texto (<datalist>), também em ordem alfabética.
function Sugestoes({ children, ...props }) {
  return <datalist {...props}>{ordenarOpcoes(children)}</datalist>;
}

export default Select;
export { Sugestoes, ordenarOpcoes, comparador };
