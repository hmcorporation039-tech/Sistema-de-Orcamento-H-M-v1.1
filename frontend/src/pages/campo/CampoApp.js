// App de campo (/campo/*): o técnico executa a OS na obra pelo celular,
// inclusive sem rede. Fica FORA do Layout do escritório (App.js) e exige login.
//
//   /campo/                    Minhas OS (hoje / próximas / concluídas)
//   /campo/os/:uuid            detalhe, iniciar, checklist, fotos, observação, concluir
//   /campo/os/:uuid/assinatura assinatura do cliente
//   /campo/nova                OS nova (visita) para uma obra
//   /campo/pendencias          o que o servidor recusou
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Wifi, WifiOff, LogOut, AlertTriangle, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { abrirLoja } from './armazenamento';
import { criarDados } from './dados';
import { criarSincronizador } from './sincronizar';
import * as api from './apiCampo';
import { instalarManifesto, registrarServiceWorker } from './pwa';
import { COR, CSS_CAMPO, Botao, formatarDataHora, cacheMiniaturas } from './componentes';
import { descarregarTodos } from './gravacaoAdiada';
import ListaOS from './ListaOS';
import DetalheOS from './DetalheOS';
import Assinatura from './Assinatura';
import NovaOS from './NovaOS';
import Pendencias from './Pendencias';

const ContextoCampo = createContext(null);
export function useCampo() { return useContext(ContextoCampo); }

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function Cabecalho() {
  const { usuario, resumo, online, estadoSync, sincronizarAgora, sessaoExpirada } = useCampo();
  const { sair } = useAuth();
  const navigate = useNavigate();
  const pendentes = (resumo?.operacoes || 0) + (resumo?.fotos || 0);
  function aoSair() {
    const msg = pendentes
      ? `Há ${pendentes} envio(s) pendente(s). Eles ficam guardados neste aparelho e vão quando você entrar de novo. Sair?`
      : 'Sair do app de campo?';
    if (!window.confirm(msg)) return;
    sair();
    navigate('/login?volta=%2Fcampo%2F', { replace: true });
  }
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: COR.fundo, borderBottom: `2px solid ${COR.ouro}` }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COR.ouroForte, fontWeight: 800, fontSize: 18 }}>H&amp;M Campo</div>
          <div style={{ color: COR.texto2, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.nome}
          </div>
        </div>
        <span aria-label={online ? 'Com rede' : 'Sem rede'} title={online ? 'Com rede' : 'Sem rede'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: online ? '#4ade80' : COR.aviso }}>
          {online ? <Wifi size={20} /> : <WifiOff size={20} />}{online ? 'on-line' : 'sem rede'}
        </span>
        <button type="button" onClick={aoSair} aria-label="Sair"
          style={{ background: 'none', border: 'none', color: COR.texto2, padding: 8, minWidth: 44, minHeight: 44 }}>
          <LogOut size={22} />
        </button>
      </div>
      <BarraSync pendentes={pendentes} recusadas={resumo?.recusadas?.length || 0}
        online={online} estado={estadoSync} aoSincronizar={sincronizarAgora} />
      {(estadoSync?.precisaLogin || sessaoExpirada) && <FaixaSessao pendentes={pendentes} />}
    </header>
  );
}

function BarraSync({ pendentes, recusadas, online, estado, aoSincronizar }) {
  const navigate = useNavigate();
  const texto = estado?.executando ? (estado.etapa || 'Sincronizando…')
    : pendentes ? `${pendentes} pendente(s) de envio`
      : 'Tudo enviado';
  return (
    <div style={{ background: pendentes ? '#2a2200' : COR.superficie, borderTop: `1px solid ${COR.borda}` }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-testid="campo-pendentes" style={{ fontWeight: 700, fontSize: 15, color: pendentes ? COR.aviso : '#4ade80' }}>{texto}</div>
          <div style={{ fontSize: 13, color: COR.texto3 }}>
            {estado?.erro && !estado.executando ? `Falhou: ${estado.erro}` : estado?.ultimaSincronizacao ? `Última: ${formatarDataHora(estado.ultimaSincronizacao)}` : 'Ainda não sincronizado'}
          </div>
        </div>
        {recusadas > 0 && (
          <Botao variante="vermelho" onClick={() => navigate('/campo/pendencias')} style={{ minHeight: 44, padding: '6px 10px', fontSize: 15 }}>
            <AlertTriangle size={18} />{recusadas}
          </Botao>
        )}
        <Botao variante="ouro" onClick={aoSincronizar} disabled={!online || estado?.executando}
          style={{ minHeight: 44, padding: '6px 12px', fontSize: 15 }} aria-label="Sincronizar">
          <RefreshCw size={18} className={estado?.executando ? 'campo-gira' : ''} />Sincronizar
        </Botao>
      </div>
    </div>
  );
}

// 401 (login vencido): o app NÃO sai da tela. A faixa fica fixa no topo; o
// que a pessoa faz continua indo para o aparelho. "Entrar" grava o texto em
// edição, avisa o que está guardado e só então vai ao login, que volta para
// esta mesma tela.
function FaixaSessao({ pendentes }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [indo, setIndo] = useState(false);
  async function entrar() {
    setIndo(true);
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      await descarregarTodos(); // observações em digitação vão para o aparelho antes
    } catch { /* segue */ }
    if (pendentes && !window.confirm(`${pendentes} alteração(ões) ainda não enviada(s) ficam guardadas neste aparelho e vão para o servidor depois que você entrar. Ir para o login?`)) {
      setIndo(false);
      return;
    }
    navigate(`/login?volta=${encodeURIComponent(pathname + search)}`);
  }
  return (
    <div role="alert" data-testid="faixa-sessao"
      style={{ background: COR.vermelho, color: '#fff', borderTop: `1px solid ${COR.borda}` }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.3 }}>
          <b>Sessão expirou — entrar.</b>{' '}
          {pendentes ? `${pendentes} alteração(ões) guardada(s) no aparelho; nada se perde.` : 'Pode continuar: o que fizer fica guardado no aparelho.'}
        </div>
        <Botao variante="contorno" onClick={entrar} disabled={indo} data-testid="entrar-de-novo"
          style={{ minHeight: 44, padding: '6px 12px', fontSize: 15, color: '#fff', borderColor: '#fff' }}>
          <LogIn size={18} />Entrar
        </Botao>
      </div>
    </div>
  );
}

function AvisoHttp() {
  if (window.isSecureContext) return null;
  return (
    <div role="note" style={{ fontSize: 13, color: COR.texto3, padding: '8px 12px', textAlign: 'center' }}>
      Para abrir sem rede, use o endereço HTTPS. Neste endereço o app funciona e guarda tudo no aparelho,
      mas precisa estar aberto antes de a rede cair.
    </div>
  );
}

export default function CampoApp() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [visoes, setVisoes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [estadoSync, setEstadoSync] = useState(null);
  const [lojaTemporaria, setLojaTemporaria] = useState(false);
  // 401 em qualquer chamada (miniatura, por exemplo) — não só na sincronização
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const online = useOnline();
  const syncRef = useRef(null);
  // o mesmo usuário com outro objeto (login refeito em outra aba) não recria o banco nem a fila
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;
  const usuarioId = usuario?.id;

  // 401: acende a faixa (nunca sai da tela). Token trocado em outra aba (ou
  // login feito): apaga a faixa e volta a sincronizar.
  useEffect(() => {
    api.definirAoNaoAutenticado(() => setSessaoExpirada(true));
    function aoMudarToken(e) {
      if (e.key !== 'hm_token' || !e.newValue || e.newValue === e.oldValue) return;
      setSessaoExpirada(false);
      syncRef.current?.retomar();
    }
    window.addEventListener('storage', aoMudarToken);
    return () => { api.definirAoNaoAutenticado(null); window.removeEventListener('storage', aoMudarToken); };
  }, []);

  // Textos em digitação (observações) vão para o aparelho na hora quando o
  // app sai da frente (bloqueio de tela, troca de app, fechar a aba).
  useEffect(() => {
    const gravar = () => { descarregarTodos().catch(() => {}); };
    const aoVisibilidade = () => { if (document.visibilityState === 'hidden') gravar(); };
    document.addEventListener('visibilitychange', aoVisibilidade);
    window.addEventListener('pagehide', gravar);
    return () => {
      document.removeEventListener('visibilitychange', aoVisibilidade);
      window.removeEventListener('pagehide', gravar);
      gravar();
    };
  }, []);

  // Miniaturas: os endereços blob: são deste usuário; saiu do app ou trocou de usuário, revoga.
  useEffect(() => () => cacheMiniaturas.limpar(), [usuario?.id]);

  // Manifesto + service worker só aqui dentro
  useEffect(() => {
    const tirar = instalarManifesto();
    registrarServiceWorker();
    const st = document.createElement('style');
    st.setAttribute('data-campo', '1');
    st.textContent = CSS_CAMPO;
    document.head.appendChild(st);
    const corAntes = document.body.style.background;
    document.body.style.background = COR.fundo;
    return () => { tirar(); st.remove(); document.body.style.background = corAntes; };
  }, []);

  // Abre o banco do usuário e cria a sincronização
  useEffect(() => {
    let vivo = true;
    let desfazer = () => {};
    (async () => {
      const loja = await abrirLoja(usuarioId);
      if (!vivo) return;
      const d = criarDados({ loja, usuario: usuarioRef.current });
      const ultima = await d.meta('ultima_sincronizacao');
      const s = criarSincronizador({
        dados: d, api, aoEstado: setEstadoSync, ultimaSincronizacao: ultima || null, tokenAtual: api.token,
      });
      setEstadoSync(s.estado());
      syncRef.current = s;
      setLojaTemporaria(loja.tipo === 'memoria');
      let timerAuto = null;
      async function recarregar() {
        const [v, r] = [await d.visoes(), await d.resumo()];
        if (vivo) { setVisoes(v); setResumo(r); }
      }
      const tirar = d.assinar(motivo => {
        recarregar();
        // mudança do técnico: envia logo que der (com rede), sem atrapalhar a digitação
        if (motivo === 'local' && navigator.onLine) {
          clearTimeout(timerAuto);
          timerAuto = setTimeout(() => s.sincronizar(), 1500);
        }
      });
      const aoOnline = () => s.sincronizar();
      const aoVisivel = () => { if (document.visibilityState === 'visible' && navigator.onLine) s.sincronizar(); };
      window.addEventListener('online', aoOnline);
      document.addEventListener('visibilitychange', aoVisivel);
      desfazer = () => {
        tirar(); clearTimeout(timerAuto); s.parar();
        window.removeEventListener('online', aoOnline);
        document.removeEventListener('visibilitychange', aoVisivel);
        loja.fechar();
      };
      await recarregar();
      setDados(d);
      if (navigator.onLine) s.sincronizar();
    })();
    return () => { vivo = false; desfazer(); };
  }, [usuarioId]);

  const sincronizarAgora = useCallback(() => {
    setSessaoExpirada(false); // se o 401 continuar, a sincronização acende a faixa de novo
    return syncRef.current?.sincronizar({ forcarCompleto: true, manual: true });
  }, []);
  const valor = useMemo(() => ({
    usuario, dados, visoes, resumo, estadoSync, online, sincronizarAgora, sessaoExpirada,
  }), [usuario, dados, visoes, resumo, estadoSync, online, sincronizarAgora, sessaoExpirada]);

  if (!dados) {
    return <div className="campo-app"><div className="loading">Abrindo o app de campo…</div></div>;
  }
  return (
    <ContextoCampo.Provider value={valor}>
      <div className="campo-app">
        <Cabecalho />
        {lojaTemporaria && (
          <div role="alert" style={{ background: COR.vermelho, color: '#fff', padding: 10, fontWeight: 700, textAlign: 'center' }}>
            Este navegador não deixa guardar dados no aparelho (modo anônimo?). Sem rede, o que você fizer pode se perder.
          </div>
        )}
        <AvisoHttp />
        <main className="campo-coluna">
          <Routes>
            <Route index element={<ListaOS />} />
            <Route path="os/:uuid" element={<DetalheOS />} />
            <Route path="os/:uuid/assinatura" element={<Assinatura />} />
            <Route path="nova" element={<NovaOS />} />
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="*" element={<Navigate to="/campo/" replace />} />
          </Routes>
        </main>
      </div>
    </ContextoCampo.Provider>
  );
}
