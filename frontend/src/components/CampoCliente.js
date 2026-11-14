import { useId, useMemo, useState } from 'react';
import { useClientes } from './ClienteSelect';
import { comparador } from './Select';
import { chaveBusca, normalizarNome } from '../utils/texto';

// Campo CLIENTE com a lista do cadastro (2.39 — Orçamento e Análise de Projeto).
// Antes o cliente era só texto e o sistema adivinhava o cadastro pelo nome (dois
// clientes com o mesmo nome, ou um nome com acento diferente, ligavam errado ou
// não ligavam). Agora:
//   - digitar filtra a lista (sem acento, sem maiúsculas), em ordem A–Z;
//   - escolher um da lista (clique, ou setas + Enter) liga o cadastro: onChange
//     recebe { id, nome };
//   - digitar um nome que não está no cadastro continua valendo (cliente novo):
//     onChange recebe { id: null, nome };
//   - nome digitado IGUAL ao de um único cliente do cadastro (sem acento/maiúsculas)
//     liga esse cliente — o mesmo que escolher na lista. Com dois homônimos não liga:
//     escolha na lista.
//
// Interface:
//   <CampoCliente nome={...} clienteId={...} onChange={({ id, nome }) => ...}
//     clientes={lista}   opcional; sem ela usa useClientes() (cadastro ativo, com cache)
//     id                 id do <input> (para o <label htmlFor>); sem ele, um gerado
//     style / placeholder / aria-label / data-testid vão para o <input>
//     mostrarSituacao    linha "cadastrado" / "cliente novo" embaixo (padrão: true)
//   />
const LIMITE = 50; // a lista mostra os 50 primeiros que casam; digitar mais filtra

export function clientePorNome(clientes, nome) {
  const chave = normalizarNome(nome);
  if (!chave) return null;
  const iguais = (clientes || []).filter(c => normalizarNome(c.nome) === chave);
  return iguais.length === 1 ? iguais[0] : null;
}

// Cliente do cadastro de uma proposta (Orçamento e Histórico, 2.40): o cliente_id manda —
// ligado e fora da lista (inativo) continua ligado, como { id, nome }; sem cliente_id
// (proposta antiga), só o nome igual ao de um único cliente (clientePorNome).
export function clienteDaProposta(clientes, clienteId, nome) {
  if (clienteId != null && clienteId !== '') {
    return (clientes || []).find(c => String(c.id) === String(clienteId)) || { id: Number(clienteId), nome };
  }
  return clientePorNome(clientes, nome);
}

// repassa o `id` ao <input>: o Campo do kit liga o rótulo a ele (ui/rotuloLigado.js)
CampoCliente.encaminhaId = true;

export default function CampoCliente({
  nome, clienteId, onChange, clientes: listaRecebida, id, style, mostrarSituacao = true,
  placeholder = 'Nome do cliente (escolha da lista ou digite um novo)', ...resto
}) {
  const doCache = useClientes(!listaRecebida);
  const clientes = listaRecebida || doCache;
  const gerado = useId();
  const idCampo = id || `cliente-${gerado}`;
  const idLista = `${idCampo}-lista`;
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  const opcoes = useMemo(() => {
    const termo = chaveBusca(String(nome || '').trim());
    return clientes
      .filter(c => c?.nome && c.ativo !== false && (!termo || chaveBusca(c.nome).includes(termo)))
      .sort((a, b) => comparador.compare(a.nome, b.nome))
      .slice(0, LIMITE);
  }, [clientes, nome]);

  // ligado ao cadastro (mesmo que o cliente tenha saído da lista por estar inativo)
  const ligado = clienteId != null && clienteId !== '';

  function escolher(c) {
    onChange({ id: c.id, nome: c.nome });
    setAberto(false);
  }

  function digitar(texto) {
    const igual = clientePorNome(clientes, texto);
    onChange({ id: igual ? igual.id : null, nome: texto });
    setAberto(true);
    setAtivo(0);
  }

  function teclar(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setAtivo(i => Math.min(i + 1, opcoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && aberto && opcoes[ativo]) {
      e.preventDefault();
      escolher(opcoes[ativo]);
    } else if (e.key === 'Escape' && aberto) {
      e.stopPropagation(); // dentro de uma janela, o Esc fecha a lista, não a janela
      setAberto(false);
    }
  }

  const mostrarLista = aberto && opcoes.length > 0;
  const temNome = String(nome || '').trim() !== '';

  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      <input
        {...resto}
        id={idCampo}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostrarLista}
        aria-controls={idLista}
        aria-activedescendant={mostrarLista ? `${idLista}-${ativo}` : undefined}
        autoComplete="off"
        value={nome || ''}
        placeholder={placeholder}
        onChange={e => digitar(e.target.value)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={teclar}
        style={style}
      />
      {mostrarLista && (
        <ul id={idLista} role="listbox" aria-label="Clientes cadastrados" style={LISTA}>
          {opcoes.map((c, i) => (
            <li key={c.id} id={`${idLista}-${i}`} role="option" aria-selected={i === ativo}
              // mousedown (não click): o blur do campo fecharia a lista antes do click
              onMouseDown={e => { e.preventDefault(); escolher(c); }}
              onMouseEnter={() => setAtivo(i)}
              style={{ ...OPCAO, background: i === ativo ? 'var(--superficie-2, #1c1c1c)' : 'transparent' }}>
              {c.nome}
              {/* o documento separa homônimos */}
              {c.documento ? <span style={{ color: 'var(--texto-3)', fontSize: 11.5 }}> · {c.documento}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {mostrarSituacao && temNome && (
        <div style={{ fontSize: 11.5, marginTop: 3, color: ligado ? '#5fbf7a' : 'var(--texto-3)' }} data-testid="situacao-cliente">
          {ligado ? '✓ cliente do cadastro' : 'cliente novo — sem cadastro (escolha da lista para ligar)'}
        </div>
      )}
    </div>
  );
}

const LISTA = {
  position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, marginTop: 2, maxHeight: 260, overflowY: 'auto',
  listStyle: 'none', padding: 4, background: 'var(--superficie, #131313)', border: '1px solid var(--borda-forte, #2a2a2a)',
  borderRadius: 8, boxShadow: '0 8px 24px #00000088',
};
const OPCAO = { padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--texto, #ddd)', fontWeight: 400 };
