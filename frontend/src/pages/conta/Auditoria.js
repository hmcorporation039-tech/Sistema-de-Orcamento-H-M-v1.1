import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { getAuditoria, getUsuarios } from '../../services/api';
import Select from '../../components/Select';
import Paginacao from '../../components/Paginacao';
import { estilos, Campo } from '../../components/ui/estilos';

// Auditoria (só administrador — Fase 6, 02/11/2026): logins (com e sem sucesso), login de aparelho ou
// IP novo, renovação e fim de sessão, verificação em duas etapas, vínculos e mensagens do Telegram/
// WhatsApp, e as alterações sensíveis que o sistema já registrava (exclusões, usuários, margem…).
const ACOES = {
  login: 'Entrou',
  login_falhou: 'Senha errada / conta inexistente',
  login_novo: 'Entrou de aparelho ou IP novo',
  login_recusado: 'Login recusado (exige duas etapas fora do escritório)',
  login_totp_falhou: 'Código de duas etapas errado',
  sessao_renovada: 'Sessão renovada',
  logout: 'Saiu',
  sessao_encerrada: 'Encerrou uma sessão',
  sessoes_outras_encerradas: 'Encerrou as outras sessões',
  sessoes_encerradas_admin: 'Administrador encerrou as sessões de um usuário',
  sessao_chave_reusada: 'Chave de sessão antiga reusada (sessão derrubada)',
  senha_alterada: 'Trocou a senha',
  totp_ativado: 'Ativou a verificação em duas etapas',
  totp_desativado: 'Desligou a verificação em duas etapas',
  totp_codigos_novos: 'Gerou novos códigos de recuperação',
  totp_desativado_admin: 'Administrador desligou as duas etapas de um usuário',
  vinculo_codigo_gerado: 'Gerou código de vínculo',
  vinculo_confirmado: 'Ligou Telegram/WhatsApp',
  vinculo_falhou: 'Código de vínculo errado',
  vinculo_bloqueado: 'Vínculo bloqueado (tentativas demais)',
  vinculo_removido: 'Removeu Telegram/WhatsApp',
};
const ORIGENS = { web: 'Sistema', telegram: 'Telegram', whatsapp: 'WhatsApp', mcp: 'Claude (MCP)' };

const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
function descricao(l) {
  if (l.entidade === 'acesso') return ACOES[l.acao] || l.acao;
  return `${l.entidade}${l.entidade_id ? ` #${l.entidade_id}` : ''}: ${l.acao}`;
}
function detalhes(d) {
  if (!d || typeof d !== 'object') return '';
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ')
    .slice(0, 300);
}

const FILTROS_VAZIOS = { tipo: 'acesso', origem: '', usuario_id: '', acao: '', de: '', ate: '' };

export default function Auditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0, totalPaginas: 1 });
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina };
      for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
      const { data } = await getAuditoria(params);
      setDados(data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar a auditoria');
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { getUsuarios().then(r => setUsuarios(r.data)).catch(() => {}); }, []);

  const mudar = (k) => (e) => { setPagina(1); setFiltros(f => ({ ...f, [k]: e.target.value })); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, color: 'var(--ouro)', fontWeight: 700, flex: 1 }}>Auditoria</h2>
        <button type="button" onClick={carregar} style={estilos.btnSecundario}><RefreshCw size={14} /> Atualizar</button>
      </div>
      <p style={estilos.ajuda}>
        Quem entrou, de onde, e o que mudou. Um "Entrou de aparelho ou IP novo" que ninguém reconhece
        pede troca de senha e "Encerrar sessões" na tela de usuários.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-end' }}>
        <Campo label="Tipo" style={{ minWidth: 150 }}>
          <Select value={filtros.tipo} onChange={mudar('tipo')}>
            <option value="">Tudo</option>
            <option value="acesso">Acessos e canal</option>
            <option value="alteracoes">Alterações e exclusões</option>
          </Select>
        </Campo>
        <Campo label="Origem" style={{ minWidth: 140 }}>
          <Select value={filtros.origem} onChange={mudar('origem')}>
            <option value="">Todas</option>
            {Object.entries(ORIGENS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </Campo>
        <Campo label="Usuário" style={{ minWidth: 180 }}>
          <Select value={filtros.usuario_id} onChange={mudar('usuario_id')}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}
          </Select>
        </Campo>
        <Campo label="Ação contém" style={{ minWidth: 140 }}>
          <input value={filtros.acao} onChange={mudar('acao')} placeholder="login, vinculo…" />
        </Campo>
        <Campo label="De" style={{ minWidth: 140 }}>
          <input type="date" value={filtros.de} onChange={mudar('de')} />
        </Campo>
        <Campo label="Até" style={{ minWidth: 140 }}>
          <input type="date" value={filtros.ate} onChange={mudar('ate')} />
        </Campo>
        <button type="button" style={estilos.btnSecundario} onClick={() => { setPagina(1); setFiltros(FILTROS_VAZIOS); }}>Limpar</button>
      </div>

      <div style={estilos.caixaTabela}>
        <table style={estilos.tabela}>
          <thead>
            <tr>
              <th style={estilos.th}>Quando</th>
              <th style={estilos.th}>Usuário</th>
              <th style={estilos.th}>Origem</th>
              <th style={estilos.th}>O que</th>
              <th style={estilos.th}>Detalhes</th>
              <th style={estilos.th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={6} style={estilos.tdVazio}>Carregando...</td></tr>}
            {!carregando && dados.itens.length === 0 && <tr><td colSpan={6} style={estilos.tdVazio}>Nada registrado com esses filtros.</td></tr>}
            {!carregando && dados.itens.map(l => (
              <tr key={l.id} style={estilos.linhaTabela}>
                <td style={{ ...estilos.td, whiteSpace: 'nowrap' }}>{quando(l.criado_em)}</td>
                <td style={estilos.td}>{l.usuario_nome || (l.usuario_id ? `#${l.usuario_id}` : '—')}</td>
                <td style={estilos.td}>{ORIGENS[l.origem] || (l.origem ? l.origem : '—')}</td>
                <td style={{ ...estilos.td, color: /falhou|recusado|bloqueado|reusada|novo/.test(l.acao) ? '#e0a040' : undefined }}>{descricao(l)}</td>
                <td style={{ ...estilos.td, fontSize: 12, color: 'var(--texto-2)', maxWidth: 420, wordBreak: 'break-word' }}>{detalhes(l.detalhes)}</td>
                <td style={{ ...estilos.td, fontFamily: 'monospace', fontSize: 12 }}>{l.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={dados.pagina || pagina} totalPaginas={dados.totalPaginas} total={dados.total} onMudarPagina={setPagina} />
    </div>
  );
}
