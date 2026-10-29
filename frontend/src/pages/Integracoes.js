import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Mail, Banknote, FolderOpen, Bot, RefreshCw, Play, Clock, CheckCircle2,
  AlertTriangle, XCircle, Loader2, History, ChevronDown, ChevronUp, PlugZap,
} from 'lucide-react';
import { getRotinasIntegracoes, executarRotinaIntegracao, testarIAIntegracoes } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { estilos } from '../components/ui/estilos';

// Painel de Integrações (2.0): as rotinas automáticas (notas e Pix por e-mail,
// orçamentos de fornecedores nas pastas) e a cadeia de IA, numa visão só.
// Pendurado na aba "Integrações" do hub de administração.

const ICONES = { 'notas-email': Mail, 'pix-email': Banknote, 'fornecedores-pastas': FolderOpen };

const STATUS = {
  ok: { label: 'Concluída', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26', Icone: CheckCircle2 },
  avisos: { label: 'Concluída com avisos', cor: '#d9a53a', bg: '#1a150a', borda: '#4a3a1a', Icone: AlertTriangle },
  ignorada: { label: 'Ignorada', cor: '#999', bg: '#151515', borda: '#2a2a2a', Icone: Clock },
  erro: { label: 'Erro', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a', Icone: XCircle },
  em_andamento: { label: 'Em execução', cor: '#6fa8dc', bg: '#0a121a', borda: '#1a2f4a', Icone: Loader2 },
  interrompida: { label: 'Interrompida', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a', Icone: XCircle },
};

function dataHora(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function duracao(s) {
  if (s == null) return '';
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

function Selo({ cor, bg, borda, children, titulo }) {
  return (
    <span title={titulo} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, background: bg, color: cor, border: `1px solid ${borda}`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function SeloStatus({ status }) {
  const s = STATUS[status] || STATUS.ignorada;
  const { Icone } = s;
  return <Selo {...s}><Icone size={11} />{s.label}</Selo>;
}

function Linha({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: '#666', minWidth: 118 }}>{rotulo}</span>
      <span style={{ color: '#ccc', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

function CartaoRotina({ rotina, executando, aoExecutar }) {
  const [verAvisos, setVerAvisos] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const Icone = ICONES[rotina.chave] || PlugZap;
  const ultima = rotina.ultimaExecucao;
  const rodando = executando || !!rotina.emExecucao;

  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Icone size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>{rotina.nome}</div>
          <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>{rotina.descricao}</div>
        </div>
        {rotina.ativa
          ? <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26">Automática ligada</Selo>
          : <Selo cor="#999" bg="#151515" borda="#2a2a2a" titulo={rotina.motivoInativa || ''}>Automática desligada</Selo>}
      </div>

      {!rotina.ativa && rotina.motivoInativa && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{rotina.motivoInativa}</div>
      )}

      <Linha rotulo="Horários">{(rotina.horarios || []).join(' e ')}</Linha>
      <Linha rotulo="Próxima execução">{rotina.proximasExecucoes?.length ? rotina.proximasExecucoes.map(dataHora).join(' · ') : '—'}</Linha>
      {rotina.pastas && <Linha rotulo="Pastas">{rotina.pastas.join(' | ')}</Linha>}

      <div style={separador} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: '#c9a227', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>Última execução</span>
        {rotina.emExecucao ? <SeloStatus status="em_andamento" /> : ultima && <SeloStatus status={ultima.status} />}
      </div>
      {rotina.emExecucao && (
        <Linha rotulo="Em execução desde">{dataHora(rotina.emExecucao.desde)} ({rotina.emExecucao.origem === 'agendada' ? 'horário automático' : 'manual'})</Linha>
      )}
      {ultima ? (
        <>
          <Linha rotulo="Quando">
            {dataHora(ultima.iniciadoEm)}{ultima.duracaoSegundos != null && ` · ${duracao(ultima.duracaoSegundos)}`}
            {' · '}{ultima.origem === 'agendada' ? 'horário automático' : `manual${ultima.usuario ? ` (${ultima.usuario})` : ''}`}
          </Linha>
          <Linha rotulo="Itens">{ultima.itens ?? '—'}</Linha>
          {ultima.texto && <Linha rotulo="Resultado">{ultima.texto}</Linha>}
          {ultima.erro && <Linha rotulo="Erro"><span style={{ color: '#e08080' }}>{ultima.erro}</span></Linha>}
          {ultima.totalAvisos > 0 && (
            <div style={{ marginTop: 4 }}>
              <button onClick={() => setVerAvisos(v => !v)} style={btnTexto}>
                {verAvisos ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {ultima.totalAvisos} aviso(s)
              </button>
              {verAvisos && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#d9a53a', fontSize: 11 }}>
                  {ultima.avisos.map((a, i) => <li key={i} style={{ marginBottom: 3 }}>{a}</li>)}
                  {ultima.totalAvisos > ultima.avisos.length && <li style={{ color: '#777' }}>… e mais {ultima.totalAvisos - ultima.avisos.length}</li>}
                </ul>
              )}
            </div>
          )}
        </>
      ) : !rotina.emExecucao && (
        <div style={{ fontSize: 12, color: '#666', padding: '3px 0' }}>Nenhuma execução registrada no painel ainda.</div>
      )}
      {rotina.ultimoRegistroEm && <Linha rotulo="Último item lido">{dataHora(rotina.ultimoRegistroEm)}</Linha>}

      {rotina.historico?.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setVerHistorico(v => !v)} style={btnTexto}>
            <History size={12} /> {verHistorico ? 'Ocultar histórico' : `Histórico (${rotina.historico.length} últimas)`}
          </button>
          {verHistorico && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 6 }}>
              <tbody>
                {rotina.historico.map(h => (
                  <tr key={h.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={tdMini}>{dataHora(h.iniciadoEm)}</td>
                    <td style={tdMini}>{h.origem === 'agendada' ? 'automática' : 'manual'}</td>
                    <td style={tdMini}><SeloStatus status={h.status} /></td>
                    <td style={{ ...tdMini, textAlign: 'right' }}>{h.itens ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={() => aoExecutar(rotina)} disabled={rodando} style={{ ...btnPrimario, opacity: rodando ? 0.6 : 1, cursor: rodando ? 'wait' : 'pointer' }}>
          {rodando ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <Play size={14} />}
          {rodando ? 'Executando…' : 'Executar agora'}
        </button>
      </div>
    </div>
  );
}

function CartaoIA({ ia, testando, aoTestar }) {
  if (!ia) return null;
  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Bot size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>Inteligência artificial</div>
          <div style={{ color: '#777', fontSize: 11, marginTop: 2 }}>
            Usada na pesquisa de preço de mercado, na leitura de orçamentos de fornecedor, na classificação de materiais e nos equipamentos do projeto.
            Tenta na ordem abaixo e passa para a próxima quando uma falha.
          </div>
        </div>
        {ia.disponivel
          ? <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26">Disponível</Selo>
          : <Selo cor="#e08080" bg="#1a0a0a" borda="#4a1a1a">Nenhuma disponível</Selo>}
      </div>

      <Linha rotulo="Ordem">
        {ia.ordem.map(id => ia.provedores.find(p => p.id === id)?.rotulo || id).map((r, i, a) => (
          <span key={r}><b style={{ color: '#c9a227' }}>{i + 1}.</b> {r}{i < a.length - 1 ? '  →  ' : ''}</span>
        ))}
        {ia.ordemPersonalizada && <span style={{ color: '#777' }}> (IA_ORDEM)</span>}
      </Linha>
      {ia.desligada && <Linha rotulo="Atenção"><span style={{ color: '#d9a53a' }}>COTACAO_IA=desligada — só a pesquisa de preço na web usa IA</span></Linha>}

      <div style={separador} />

      {ia.provedores.map(p => (
        <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: p.ativo ? '#3fb95f' : '#555', flexShrink: 0 }} />
            <span style={{ color: '#ddd', fontWeight: 700, fontSize: 12, flex: 1 }}>
              {p.posicao ? `${p.posicao}. ` : ''}{p.rotulo}
            </span>
            <span style={{ color: p.ativo ? '#3fb95f' : '#888', fontSize: 11 }}>{p.ativo ? 'ligado' : (p.motivo || 'desligado')}</span>
          </div>
          <div style={{ color: '#666', fontSize: 11, marginLeft: 16, marginTop: 2 }}>{p.descricao}{p.modelo ? ` · ${p.modelo}` : ''}</div>
          {(p.ultimoSucesso || p.ultimoErro) && (
            <div style={{ fontSize: 11, marginLeft: 16, marginTop: 3, color: '#888' }}>
              {p.sucessos} resposta(s), {p.falhas} falha(s) desde que o sistema subiu
              {p.ultimoSucesso && <div style={{ color: '#3fb95f' }}>Última resposta: {dataHora(p.ultimoSucesso.em)} ({p.ultimoSucesso.finalidade})</div>}
              {p.ultimoErro && <div style={{ color: '#e08080', overflowWrap: 'anywhere' }}>Última falha: {dataHora(p.ultimoErro.em)} — {p.ultimoErro.mensagem}</div>}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={aoTestar} disabled={testando || !ia.disponivel} style={{ ...btnSecundario, display: 'flex', alignItems: 'center', gap: 6, opacity: testando || !ia.disponivel ? 0.6 : 1 }}>
          {testando ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <PlugZap size={14} />}
          {testando ? 'Testando…' : 'Testar IA'}
        </button>
      </div>
    </div>
  );
}

export default function Integracoes() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState({});
  const [testando, setTestando] = useState(false);
  const timer = useRef(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const res = await getRotinasIntegracoes();
      setDados(res.data);
    } catch (err) {
      if (!silencioso) toast.error(err.response?.data?.erro || 'Erro ao carregar as integrações');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  useEffect(() => { if (ehAdmin) carregar(); }, [carregar, ehAdmin]);

  // enquanto alguma rotina roda (aqui ou pelo horário), atualiza a cada 5 s
  const algumaRodando = Object.values(executando).some(Boolean) || !!dados?.rotinas?.some(r => r.emExecucao);
  useEffect(() => {
    if (!algumaRodando) return undefined;
    timer.current = setInterval(() => carregar(true), 5000);
    return () => clearInterval(timer.current);
  }, [algumaRodando, carregar]);

  async function executar(rotina) {
    const aviso = rotina.chave === 'fornecedores-pastas'
      ? 'Ler agora as pastas de orçamentos de fornecedores e cadastrar os materiais novos?'
      : `Ler agora a caixa de e-mail (${rotina.nome})?`;
    if (!window.confirm(aviso)) return;
    setExecutando(e => ({ ...e, [rotina.chave]: true }));
    setTimeout(() => carregar(true), 800); // mostra "em execução" logo
    try {
      const res = await executarRotinaIntegracao(rotina.chave);
      const ultima = res.data?.rotina?.ultimaExecucao;
      if (ultima?.status === 'erro') toast.error(`${rotina.nome}: ${ultima.erro || 'erro'}`);
      else toast.success(`${rotina.nome}: ${ultima?.texto || 'concluída'}`);
    } catch (err) {
      if (err.code === 'ECONNABORTED') toast('A rotina continua rodando no servidor — o painel atualiza sozinho.', { icon: '⏳' });
      else toast.error(err.response?.data?.erro || `Erro ao executar ${rotina.nome}`);
    } finally {
      setExecutando(e => ({ ...e, [rotina.chave]: false }));
      carregar(true);
    }
  }

  async function testarIA() {
    setTestando(true);
    try {
      const res = await testarIAIntegracoes();
      toast.success(`IA respondeu: ${res.data.fonte} em ${(res.data.ms / 1000).toFixed(1)} s`);
      setDados(d => (d ? { ...d, ia: res.data.ia } : d));
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Nenhuma IA respondeu');
      if (err.response?.data?.ia) setDados(d => (d ? { ...d, ia: err.response.data.ia } : d));
    } finally {
      setTestando(false);
    }
  }

  if (!ehAdmin) {
    return <div style={{ color: '#777', fontSize: 13, padding: 20 }}>Somente administradores veem o painel de integrações.</div>;
  }

  return (
    <div>
      <style>{'@keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1, margin: 0 }}>Integrações</h2>
        <button onClick={() => carregar()} style={{ ...btnSecundario, display: 'flex', alignItems: 'center', gap: 6 }} disabled={carregando}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {dados && !dados.rotinasAutomaticas?.ligadas && (
        <div style={{ ...cartao, padding: '10px 14px', marginBottom: 14, borderColor: '#4a3a1a', color: '#d9a53a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> Rotinas automáticas desligadas nesta instância (ROTINAS_AUTOMATICAS). Os horários não rodam; o botão "Executar agora" continua funcionando.
        </div>
      )}

      {carregando && !dados && <div style={{ color: '#555', padding: 30, textAlign: 'center' }}>Carregando...</div>}

      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {dados.rotinas.map(r => (
            <CartaoRotina key={r.chave} rotina={r} executando={!!executando[r.chave]} aoExecutar={executar} />
          ))}
          <CartaoIA ia={dados.ia} testando={testando} aoTestar={testarIA} />
        </div>
      )}
    </div>
  );
}

const cartao = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 16,
  display: 'flex', flexDirection: 'column', minWidth: 0,
};

const iconeCaixa = {
  width: 34, height: 34, borderRadius: 8, background: '#1a1608', border: '1px solid #3a2f0a',
  color: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const separador = { borderTop: '1px solid #1e1e1e', margin: '10px 0' };

const tdMini = { padding: '5px 4px', color: '#aaa', verticalAlign: 'middle' };

// Estilos do kit de tela (components/ui/estilos.js), com o que esta tela tem
// de diferente por cima — o visual ficou como era.
const btnPrimario = { ...estilos.btnPrimario, display: 'flex' };

const btnSecundario = {
  padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
  borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};

const btnTexto = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent',
  border: 'none', color: '#999', fontSize: 11, cursor: 'pointer',
};
