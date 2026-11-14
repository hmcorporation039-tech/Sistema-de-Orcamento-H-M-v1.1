import { useEffect, useState } from 'react';
import Select from './Select';
import { getTodosClientes } from '../services/api';

// Seleção de CLIENTE (revisão de 28/10/2026, etapa 7 do kit de tela).
// Antes, Obras (lista e detalhe) e Propostas buscavam GET /clientes?porPagina=1000
// cada uma por conta própria — e acima de 1000 clientes a lista vinha cortada.
// Agora todas usam esta lista: todas as páginas (getTodosClientes), com cache
// curto como o do ObraSelect (várias telas abrem ao mesmo tempo) e só clientes
// ativos (o servidor já filtra; o filtro aqui é só garantia).
//
// Interface:
//   <ClienteSelect value={id} onChange={e => ...} rotuloVazio="Todos" disabled style />
//     value/onChange iguais aos do <select> (e.target.value é o id em texto)
//   useClientes()             → lista [{ id, nome, email, ... }] (vazia enquanto carrega);
//                               useClientes(false) não busca (quem chama já tem a lista)
//   invalidarCacheClientes()  → chamar depois de criar/editar/excluir cliente

let cache = null; // { quando, promessa }
const VALIDADE_CACHE = 30 * 1000;

export function invalidarCacheClientes() { cache = null; }

export function carregarClientes(forcar = false) {
  if (!forcar && cache && Date.now() - cache.quando < VALIDADE_CACHE) return cache.promessa;
  const promessa = getTodosClientes()
    .then(res => (res.data.itens || []).filter(c => c.ativo !== false))
    .catch(err => { cache = null; throw err; }); // erro não fica guardado
  cache = { quando: Date.now(), promessa };
  return promessa;
}

// carregar = false: não busca (quem chama já tem a lista — ex.: o editor de proposta)
export function useClientes(carregar = true) {
  const [clientes, setClientes] = useState([]);
  useEffect(() => {
    if (!carregar) return undefined;
    let vivo = true;
    carregarClientes().then(lista => { if (vivo) setClientes(lista); }).catch(() => {});
    return () => { vivo = false; };
  }, [carregar]);
  return clientes;
}

// A ordem A–Z vem do Select (regra do projeto para toda lista suspensa)
// repassa o `id` ao <select> (via Select): o Campo do kit liga o rótulo a ele
ClienteSelect.encaminhaId = true;

export default function ClienteSelect({ value, onChange, rotuloVazio = 'Sem cliente cadastrado', ...props }) {
  const clientes = useClientes();
  return (
    <Select value={value} onChange={onChange} {...props}>
      <option value="">{rotuloVazio}</option>
      {clientes.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
    </Select>
  );
}
