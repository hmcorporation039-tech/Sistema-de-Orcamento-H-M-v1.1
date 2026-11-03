import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getConta } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import VerificacaoDuasEtapas from './VerificacaoDuasEtapas';

// Tela obrigatória (Fase 6, 02/11/2026): com TOTP_OBRIGATORIO_ADMIN=true no servidor, o administrador
// sem a verificação em duas etapas só usa o sistema depois de ativá-la (o servidor recusa as outras
// rotas com 403 TOTP_OBRIGATORIO). Desligado por padrão.
export default function AtivarDuasEtapas() {
  const { usuario, sair, totpAtivado } = useAuth();
  const [situacao, setSituacao] = useState(null);
  const [ativou, setAtivou] = useState(false);

  useEffect(() => {
    getConta().then(r => {
      setSituacao(r.data.totp);
      // já ativa (em outra aba, por exemplo): libera
      if (r.data.totp.ativo) totpAtivado();
    }).catch(() => setSituacao({ ativo: false, configurado: true }));
  // uma vez, ao abrir (totpAtivado muda a cada render do AuthProvider)
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fundo)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: 30, width: '100%', maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={20} color="#c9a227" />
          <h1 style={{ fontSize: 19, color: '#c9a227', fontWeight: 700 }}>Ative a verificação em duas etapas</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, marginBottom: 18 }}>
          Olá, {usuario?.nome?.split(' ')[0] || 'administrador'}. Neste sistema, a conta de administrador precisa
          da verificação em duas etapas: além da senha, um código do aplicativo autenticador do celular.
        </p>
        {situacao && (
          <VerificacaoDuasEtapas
            situacao={situacao}
            aoMudar={({ ativado } = {}) => { if (ativado) { setAtivou(true); setSituacao(s => ({ ...s, ativo: true })); } }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {ativou && (
            <button type="button" onClick={totpAtivado} style={{
              padding: '10px 18px', background: '#c9a227', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Continuar para o sistema</button>
          )}
          <button type="button" onClick={sair} style={{
            padding: '10px 14px', background: 'transparent', border: '1px dashed #333', borderRadius: 6, color: 'var(--texto-2)', fontSize: 13, cursor: 'pointer',
          }}>Sair</button>
        </div>
      </div>
    </div>
  );
}
