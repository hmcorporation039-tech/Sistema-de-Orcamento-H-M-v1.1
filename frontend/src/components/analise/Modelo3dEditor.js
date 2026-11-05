// 3D com edição de componentes (versão 2.30): o modelo 3D da análise DENTRO da tela, com a paleta da biblioteca H&M.
// A página do 3D roda em sandbox (sem login e sem rede: backend services/modelo3d CSP_MODELO_3D_EMBUTIDO); ela só avisa
// por postMessage o que o engenheiro clicou (skills/_comum/cad/visualizador3d/edicao.js). Esta tela confere a mensagem
// (vem do quadro do 3D, componente da biblioteca, números finitos) e grava pelo sistema, com o login de quem está aqui.
// "Atualizar 3D" gera o modelo de novo com as edições aplicadas (peça encostada na parede, no ambiente certo).
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';
import { abrirModelo3d, urlModelo3d, editarMapaCad } from '../../services/api';
import { mensagemDeErro } from '../../utils/download';

const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #2f2f2f', background: '#1a1a1a', color: '#ddd', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
// cor da disciplina no 3D (skills/_comum/disciplinas.js) para o marcador do componente inserido
const COR_DISC = { eletrica: '#f2c14e', iluminacao: '#ffe680', 'iluminacao-externa': '#ffd34d', incendio: '#e5534b', cftv: '#6cb6ff', rede: '#57ab5a', telefonia: '#8ddb8c', antena: '#b083f0', 'controle-acesso': '#f69d50', alarme: '#ff938a', automacao: '#39c5cf', spda: '#adbac7', solar: '#e0823d', veicular: '#4fd1c5', eletrica_hospitalar: '#ffb3b3', climatizacao: '#5ec8f2' };

// nome da disciplina na paleta (quem abre o editor fora do Mapa do CAD: o cartão do 3D da análise, ../Modelo3d.js)
const NOME_DISC = {
  eletrica: 'Elétrica', iluminacao: 'Iluminação', 'iluminacao-externa': 'Iluminação externa', incendio: 'Incêndio', cftv: 'CFTV', rede: 'Rede',
  alarme: 'Alarme', telefonia: 'Telefonia', antena: 'Antena', 'controle-acesso': 'Controle de acesso', automacao: 'Automação', spda: 'SPDA',
  solar: 'Solar', veicular: 'Veicular', eletrica_hospitalar: 'Elétrica hospitalar', climatizacao: 'Climatização',
};
export const nomeDaDisciplina3d = (d) => NOME_DISC[d] || d;

export default function Modelo3dEditor({ analiseId, componentes, nomeDisciplina, onEditado, onFechar }) {
  const quadro = useRef(null);
  const [url, setUrl] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [contagem, setContagem] = useState({ adicionados: 0, removidos: 0 });
  // o que a mensagem usa sempre na versão mais nova, sem refazer o ouvinte a cada desenho da tela
  const atual = useRef({});
  atual.current = { componentes, nomeDisciplina, onEditado, validos: new Set(componentes.map(c => c.simbolo)) };

  async function abrir() {
    setCarregando(true);
    try {
      const r = await abrirModelo3d('analise', analiseId, { embutido: true });
      setUrl(urlModelo3d(r.data.url)); // link novo a cada vez: o quadro recarrega
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui abrir o modelo 3D'), { duration: 9000 });
      onFechar();
    } finally { setCarregando(false); }
  }
  useEffect(() => { abrir(); }, [analiseId]);

  useEffect(() => {
    const responder = (msg) => quadro.current?.contentWindow?.postMessage(msg, '*');
    const fila = { ocupado: false };
    async function gravar(corpo, texto) {
      if (fila.ocupado) { responder({ tipo: 'hm3d:resultado', ok: false, texto: 'Aguarde: gravando a edição anterior.' }); return; }
      fila.ocupado = true;
      try {
        const r = await editarMapaCad(analiseId, { sistema: '3d', ...corpo });
        setContagem(c => ({ adicionados: c.adicionados + (r.data.resumo?.adicionados || 0), removidos: c.removidos + (r.data.resumo?.removidos || 0) }));
        atual.current.onEditado(r.data);
        responder({ tipo: 'hm3d:resultado', ok: true, texto });
      } catch (err) {
        responder({ tipo: 'hm3d:resultado', ok: false, texto: await mensagemDeErro(err, 'Não consegui gravar') });
      } finally { fila.ocupado = false; }
    }
    const aoReceber = (ev) => {
      // só o quadro do 3D desta tela (a página dele não tem origem própria: a fonte é o que identifica)
      if (!quadro.current || ev.source !== quadro.current.contentWindow) return;
      const m = ev.data;
      if (!m || typeof m !== 'object' || typeof m.tipo !== 'string') return;
      const numero = (v) => typeof v === 'number' && Number.isFinite(v);
      if (m.tipo === 'hm3d:pronto') {
        if (!m.comOrigem) { toast('Este 3D foi gerado antes da edição de componentes: use "Atualizar 3D".', { icon: 'ℹ️' }); return; }
        const paleta = atual.current.componentes.map(c => ({ simbolo: c.simbolo, nome: c.nome, disciplina: c.disciplina, grupo: atual.current.nomeDisciplina(c.disciplina), montagem: c.montagem, altura_m: c.altura_m, cor: COR_DISC[c.disciplina] || '#c9a227' }));
        responder({ tipo: 'hm3d:editar', paleta });
      } else if (m.tipo === 'hm3d:adicionar' && atual.current.validos.has(m.simbolo) && numero(m.x) && numero(m.y)) {
        const nome = atual.current.componentes.find(c => c.simbolo === m.simbolo)?.nome || 'Componente';
        gravar({ adicionar: [{ simbolo: m.simbolo, x: m.x, y: m.y }] }, `${nome}: inserido`);
      } else if (m.tipo === 'hm3d:remover' && numero(m.x) && numero(m.y)) {
        gravar({ remover: [{ x: m.x, y: m.y, ...(atual.current.validos.has(m.simbolo) ? { simbolo: m.simbolo } : {}), ...(typeof m.rotulo === 'string' ? { rotulo: m.rotulo.slice(0, 120) } : {}) }] }, 'Componente retirado');
      }
    };
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [analiseId]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Editar componentes no 3D" data-testid="editor-3d"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#121212', border: '1px solid #2a2a2a', borderBottom: 'none', borderRadius: '10px 10px 0 0', padding: '10px 14px' }}>
        <b style={{ color: '#e6c45a', fontSize: 14, flex: 1 }}>Editar componentes no 3D</b>
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
          {contagem.adicionados || contagem.removidos ? `${contagem.adicionados} inserido(s), ${contagem.removidos} retirado(s) nesta sessão · ` : ''}
          Inserir e Retirar ficam no painel do 3D (canto superior direito). Gravado na análise; entra no orçamento ao reprocessar.
        </span>
        <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={abrir} disabled={carregando} data-testid="atualizar-3d">
          <RefreshCw size={13} /> {carregando ? 'Gerando…' : 'Atualizar 3D'}
        </button>
        <button type="button" style={botao} onClick={onFechar} aria-label="Fechar o 3D"><X size={14} /> Fechar</button>
      </div>
      <div style={{ flex: 1, background: '#0b0d10', border: '1px solid #2a2a2a', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
        {url
          // sandbox sem allow-same-origin: a página do 3D não lê nada da tela (login, cookies, armazenamento)
          ? <iframe ref={quadro} src={url} title="Modelo 3D da análise" sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 0 }} />
          : <div style={{ padding: 24, color: 'var(--texto-3)', fontSize: 13 }}>Gerando o modelo 3D…</div>}
      </div>
    </div>
  );
}
