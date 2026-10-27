import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../../components/ErrorBoundary';

// Página-"hub" de um grupo do menu (versão 2.0): o menu de topo tem só os
// grupos, e cada grupo junta as telas que antes eram itens soltos em abas.
//
// A aba ativa vive na URL (?aba=chave), para o F5 e o "voltar" do navegador
// continuarem onde a pessoa estava. Algumas telas usam um id no caminho
// (ex.: /propostas/editar/:id, porque o Orcamento lê o id com useParams) —
// nesse caso a rota passa `abaFixa`, que tem prioridade sobre o ?aba=.
//
// Cada aba: { chave, rotulo, render, admin?, para? }
//   admin: só aparece para administradores (a API também exige admin);
//   para:  destino do clique quando não é o padrão `${base}?aba=${chave}`.
// Aba pedida na URL que não existe (ou que é só de admin) cai na primeira
// visível. Sem nenhuma aba visível, volta para o painel.
export default function Hub({ grupo, base, abas, abaFixa, larga = false }) {
  const { usuario } = useAuth();
  const [busca] = useSearchParams();
  const ehAdmin = usuario?.role === 'admin';
  const visiveis = abas.filter(a => !a.admin || ehAdmin);
  const pedida = abaFixa || busca.get('aba');
  const ativa = visiveis.find(a => a.chave === pedida) || visiveis[0];

  if (!ativa) return <Navigate to="/dashboard" replace />;

  return (
    <div style={larga ? paginaLargaTela : undefined}>
      <div style={barra}>
        <span style={rotuloGrupo}>{grupo}</span>
        {visiveis.length > 1 && (
          <div role="tablist" aria-label={grupo} style={trilho}>
            {visiveis.map(a => {
              const selecionada = a.chave === ativa.chave;
              return (
                <Link
                  key={a.chave}
                  role="tab"
                  aria-selected={selecionada}
                  to={a.para || `${base}?aba=${a.chave}`}
                  // Clicar na aba que já está aberta não faz nada — senão,
                  // em "Nova / editar", perderia a proposta que está sendo
                  // editada (/propostas/editar/:id → formulário vazio).
                  onClick={e => { if (selecionada) e.preventDefault(); }}
                  style={{
                    ...aba,
                    background: selecionada ? '#c9a227' : 'transparent',
                    color: selecionada ? '#000' : '#999',
                    cursor: selecionada ? 'default' : 'pointer',
                  }}
                >
                  {a.rotulo}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Um erro numa aba não derruba o hub: as outras abas continuam
          acessíveis e o boundary se recupera ao trocar de aba. */}
      <ErrorBoundary key={ativa.chave}>
        {ativa.render()}
      </ErrorBoundary>
    </div>
  );
}

const barra = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
};

const rotuloGrupo = {
  fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 700,
};

const trilho = {
  display: 'flex', gap: 4, flexWrap: 'wrap', background: '#111',
  border: '1px solid #1e1e1e', borderRadius: 8, padding: 3, maxWidth: '100%',
};

const aba = {
  padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700,
  textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all .15s',
};

// Quebra o limite de largura (max-width: 1280) do <main> do Layout — as telas
// de Obras têm tabelas largas (Serviços/Materiais) que ficam melhor ocupando a
// largura inteira da janela. (Veio da AnaliseProjeto, que fazia isso sozinha.)
const paginaLargaTela = {
  width: '100vw', maxWidth: '100vw',
  marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)',
  padding: '0 clamp(12px, 3vw, 32px)', boxSizing: 'border-box',
};
