// Excluir de vez (análise, projeto, laudo): pergunta antes, com o mesmo texto
// em todo o sistema (antes eram 3 versões que se contradiziam — "não pode ser
// desfeita" × "dá para recuperar"). A pasta do item vai para _Excluídos; só o
// dono ou um administrador exclui — o servidor confere e a mensagem dele aparece.
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { estilos } from './estilos';

export const textoExclusao = (rotulo) => `Excluir ${rotulo}? O registro sai do sistema; a pasta vai para _Excluídos, na pasta do cliente — os arquivos podem ser recuperados de lá.`;

// Pergunta e exclui; devolve true se excluiu
export async function confirmarExclusao(rotulo, excluir) {
  if (!window.confirm(textoExclusao(rotulo))) return false;
  try {
    await excluir();
    toast.success('Excluído');
    return true;
  } catch (err) {
    toast.error(err.response?.data?.erro || 'Erro ao excluir', { duration: 8000 });
    return false;
  }
}

export default function BotaoExcluir({ rotulo, excluir, depois, titulo = 'Excluir (não só desligar da obra)', testid = 'excluir-item' }) {
  return (
    <button type="button" data-testid={testid} title={titulo} style={{ ...estilos.btnIcone, color: '#c05050', marginLeft: 4 }}
      onClick={async (e) => { e.stopPropagation(); if (await confirmarExclusao(rotulo, excluir)) depois?.(); }}>
      <Trash2 size={12} />
    </button>
  );
}
