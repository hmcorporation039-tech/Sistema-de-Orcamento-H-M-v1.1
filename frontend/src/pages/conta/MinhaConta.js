import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { LogOut, Trash2, RefreshCw } from 'lucide-react';
import {
  getConta, encerrarSessao, encerrarOutrasSessoes, gerarCodigoVinculo, removerVinculo,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatarData } from '../../utils/format';
import { rotuloPapel, CANAIS, rotuloCanal } from '../../utils/papeis';
import Select from '../../components/Select';
import { estilos } from '../../components/ui/estilos';
import VerificacaoDuasEtapas from './VerificacaoDuasEtapas';

// Minha conta (Fase 6 — segurança antes do canal remoto, 02/11/2026):
//   - sessões abertas (um navegador = uma sessão), com "encerrar" e "encerrar as outras";
//   - verificação em duas etapas (aplicativo autenticador);
//   - Telegram/WhatsApp ligados à conta, por código de uso único ("/vincular 123456").
const dataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export default function MinhaConta() {
  const { usuario, sair, totpAtivado } = useAuth();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [canal, setCanal] = useState('telegram');
  const [codigoVinculo, setCodigoVinculo] = useState(null);   // { codigo, canal, expira_em, minutos }

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await getConta();
      setConta(data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar a conta');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function encerrar(s) {
    if (s.atual) {
      if (!window.confirm('Encerrar a sessão deste navegador? Você sai do sistema.')) return;
      sair();
      return;
    }
    try {
      await encerrarSessao(s.id);
      toast.success('Sessão encerrada');
      carregar();
    } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao encerrar a sessão'); }
  }

  async function encerrarOutras() {
    if (!window.confirm('Encerrar todas as outras sessões? Os outros aparelhos vão pedir login de novo.')) return;
    try {
      const { data } = await encerrarOutrasSessoes();
      toast.success(data.encerradas ? `${data.encerradas} sessão(ões) encerrada(s)` : 'Não havia outras sessões abertas');
      carregar();
    } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao encerrar as sessões'); }
  }

  async function pedirCodigo() {
    try {
      const { data } = await gerarCodigoVinculo(canal);
      setCodigoVinculo(data);
    } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao gerar o código'); }
  }

  async function remover(v) {
    if (!window.confirm(`Desligar o ${rotuloCanal(v.canal)} ${v.id_externo} da sua conta? O sistema deixa de responder a ele.`)) return;
    try {
      await removerVinculo(v.id);
      toast.success('Vínculo removido');
      carregar();
    } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao remover o vínculo'); }
  }

  if (carregando && !conta) return <div style={estilos.tdVazio}>Carregando...</div>;
  if (!conta) return <div style={estilos.tdVazio}>Não foi possível carregar a conta.</div>;

  const outras = conta.sessoes.filter(s => !s.atual).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, color: 'var(--ouro)', fontWeight: 700 }}>Minha conta</h2>
          <p style={{ ...estilos.ajuda, margin: 0 }}>{usuario?.nome} · {usuario?.email} · {rotuloPapel(conta.usuario.role)}</p>
        </div>
        <button type="button" onClick={carregar} style={estilos.btnSecundario} title="Atualizar"><RefreshCw size={14} /> Atualizar</button>
      </div>

      {/* ── Sessões ── */}
      <section style={estilos.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={titulo}>Sessões abertas</h3>
          <span style={{ flex: 1 }} />
          {outras > 0 && (
            <button type="button" onClick={encerrarOutras} style={estilos.btnSecundario}><LogOut size={14} /> Encerrar as outras sessões</button>
          )}
        </div>
        <p style={estilos.ajuda}>
          Cada navegador ou aparelho em que você entrou. Se não reconhecer algum, encerre-o e troque a senha.
          Uma sessão parada por 7 dias termina sozinha.
        </p>
        <div style={estilos.caixaTabela}>
          <table style={estilos.tabela}>
            <thead>
              <tr>
                <th style={estilos.th}>Aparelho</th>
                <th style={estilos.th}>IP</th>
                <th style={estilos.th}>Entrou em</th>
                <th style={estilos.th}>Último uso</th>
                <th style={{ ...estilos.th, width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {conta.sessoes.length === 0 && (
                <tr><td colSpan={5} style={estilos.tdVazio}>
                  Nenhuma sessão registrada. (Quem entrou antes desta versão aparece aqui depois do próximo login.)
                </td></tr>
              )}
              {conta.sessoes.map(s => (
                <tr key={s.id} style={estilos.linhaTabela}>
                  <td style={estilos.td}>
                    {s.dispositivo || 'Desconhecido'}
                    {s.atual && <span style={selo}>este navegador</span>}
                  </td>
                  <td style={estilos.td}>{s.ip || '—'}</td>
                  <td style={estilos.td}>{dataHora(s.criada_em)}</td>
                  <td style={estilos.td}>{dataHora(s.ultimo_uso_em)}</td>
                  <td style={estilos.td}>
                    <button type="button" onClick={() => encerrar(s)} style={{ ...estilos.btnSecundario, padding: '5px 10px', fontSize: 12 }}>
                      {s.atual ? 'Sair' : 'Encerrar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Duas etapas ── */}
      <section style={estilos.card}>
        <h3 style={{ ...titulo, marginBottom: 10 }}>Verificação em duas etapas</h3>
        {conta.totp.obrigatorio && !conta.totp.ativo && (
          <p style={{ ...estilos.ajuda, color: '#e0a040' }}>Obrigatória para administradores neste sistema.</p>
        )}
        <VerificacaoDuasEtapas
          situacao={conta.totp}
          aoMudar={({ ativado } = {}) => { if (ativado) totpAtivado(); carregar(); }}
        />
      </section>

      {/* ── Telegram / WhatsApp ── */}
      <section style={estilos.card}>
        <h3 style={{ ...titulo, marginBottom: 10 }}>Telegram e WhatsApp</h3>
        <p style={estilos.ajuda}>
          Para falar com o sistema de fora do escritório, ligue o seu Telegram ou WhatsApp à sua conta.
          Gere um código aqui e mande <b>/vincular</b> seguido do código para o sistema, pelo próprio aplicativo.
          O sistema só responde a quem estiver ligado aqui.
        </p>

        {conta.vinculos.length > 0 && (
          <div style={{ ...estilos.caixaTabela, marginBottom: 14 }}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.th}>Canal</th>
                  <th style={estilos.th}>Número / chat</th>
                  <th style={estilos.th}>Ligado em</th>
                  <th style={{ ...estilos.th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {conta.vinculos.map(v => (
                  <tr key={v.id} style={estilos.linhaTabela}>
                    <td style={estilos.td}>{rotuloCanal(v.canal)}</td>
                    <td style={{ ...estilos.td, fontFamily: 'monospace' }}>{v.id_externo}</td>
                    <td style={estilos.td}>{formatarData(v.verificado_em)}</td>
                    <td style={estilos.td}>
                      <button type="button" onClick={() => remover(v)} style={{ ...estilos.btnIcone, color: '#b04040' }} title="Remover" aria-label="Remover vínculo">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select value={canal} onChange={e => { setCanal(e.target.value); setCodigoVinculo(null); }} style={{ width: 160 }} aria-label="Canal">
            {CANAIS.map(c => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
          </Select>
          <button type="button" onClick={pedirCodigo} style={estilos.btnPrimario}>Gerar código</button>
          {codigoVinculo && <button type="button" onClick={carregar} style={estilos.btnSecundario}>Já mandei — atualizar</button>}
        </div>

        {codigoVinculo && (
          <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--borda)', borderRadius: 10, background: 'var(--superficie-2)' }}>
            <div style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 6 }}>
              Mande esta mensagem para o sistema pelo {rotuloCanal(codigoVinculo.canal)}:
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 26, letterSpacing: 3, color: 'var(--ouro-claro)' }}>
              /vincular {codigoVinculo.codigo}
            </div>
            <div style={{ ...estilos.ajuda, marginTop: 6, marginBottom: 0 }}>
              Vale uma vez, até {dataHora(codigoVinculo.expira_em)} ({codigoVinculo.minutos} min). Pedir outro código cancela este.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const titulo = { fontSize: 15, color: 'var(--texto)', fontWeight: 700, margin: 0 };
const selo = {
  marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
  background: 'var(--ouro-fundo)', color: 'var(--ouro-claro)',
};
