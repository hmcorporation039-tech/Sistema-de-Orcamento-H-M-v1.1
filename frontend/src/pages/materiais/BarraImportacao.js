import { Link } from 'react-router-dom';
import { Mail, RefreshCw, History, Scale } from 'lucide-react';
import { formatarData } from '../../utils/format';
import { btnSecundario } from './apoio';

// Faixa de importação automática do catálogo: e-mail (NF-e), orçamentos de fornecedor na pasta,
// comparação de fornecedores, histórico e a margem padrão (alterada em Padrões de orçamento).
export default function BarraImportacao({
  statusEmail, ehAdmin, margemPadrao,
  verificandoEmail, onVerificarEmail, verificandoFornecedores, onVerificarFornecedores,
  onCompararFornecedores, onAbrirHistorico,
}) {
  return (
    <div style={{
      background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10,
      padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center',
      gap: 18, flexWrap: 'wrap', fontSize: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--texto-2)' }}>
        <Mail size={14} color={statusEmail?.configurado ? '#3fb95f' : '#666'} />
        {statusEmail?.configurado ? (
          <span>
            Importação por e-mail ativa ({statusEmail.conta}) · última verificação: {statusEmail.ultimaVerificacao ? formatarData(statusEmail.ultimaVerificacao) : 'ainda não rodou'}
          </span>
        ) : (
          <span>Importação automática por e-mail não configurada (veja EMAIL_IMAP_* no backend/.env)</span>
        )}
      </div>

      {ehAdmin && statusEmail?.configurado && (
        <button onClick={onVerificarEmail} disabled={verificandoEmail} style={{ ...btnSecundario, padding: '5px 10px' }}>
          <RefreshCw size={12} style={{ marginRight: 5 }} /> {verificandoEmail ? 'Verificando...' : 'Verificar agora'}
        </button>
      )}

      {ehAdmin && (
      <button onClick={onVerificarFornecedores} disabled={verificandoFornecedores} style={{ ...btnSecundario, padding: '5px 10px' }} title="Lê agora os orçamentos (PDF, PDF escaneado ou foto, de qualquer fornecedor) salvos em 'Orçamentos recebidos fornecedores', sem esperar a leitura automática das 06:00 e das 18:00">
        <RefreshCw size={12} style={{ marginRight: 5 }} /> {verificandoFornecedores ? 'Verificando...' : 'Verificar orçamentos de fornecedores'}
      </button>
      )}

      <button onClick={onCompararFornecedores} style={{ ...btnSecundario, padding: '5px 10px' }} title="Mostra quem cotou mais barato cada material e onde o custo do catálogo está acima da melhor cotação">
        <Scale size={12} style={{ marginRight: 5 }} /> Comparar fornecedores
      </button>

      <button onClick={onAbrirHistorico} style={{ ...btnSecundario, padding: '5px 10px' }}>
        <History size={12} style={{ marginRight: 5 }} /> Ver histórico
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        {/* 2.39: a margem é alterada no cartão "Padrões de orçamento" (Integrações), junto com o BDI e os impostos */}
        <span style={{ color: 'var(--texto-3)' }} data-testid="margem-padrao">
          Margem padrão de venda: <b style={{ color: 'var(--texto)' }}>{margemPadrao === '' ? '—' : `${String(margemPadrao).replace('.', ',')}%`}</b>
        </span>
        {ehAdmin && (
          <Link to="/cadastros?aba=integracoes" style={{ ...btnSecundario, padding: '5px 10px', textDecoration: 'none' }}
            title="A margem, o BDI e os impostos padrão ficam juntos no cartão Padrões de orçamento (Cadastros → Integrações)">
            Alterar em Padrões de orçamento
          </Link>
        )}
      </div>
    </div>
  );
}
