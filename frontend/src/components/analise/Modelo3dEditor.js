// 3D com edição de componentes (versão 2.30): o modelo 3D da análise DENTRO da tela, com a paleta da biblioteca H&M.
// A página do 3D roda em sandbox (sem login e sem rede: backend services/modelo3d CSP_MODELO_3D_EMBUTIDO); ela só avisa
// por postMessage o que o engenheiro clicou (skills/_comum/cad/visualizador3d/edicao.js). Esta tela confere a mensagem
// (vem do quadro do 3D, componente da biblioteca, números finitos) e grava pelo sistema, com o login de quem está aqui.
// "Atualizar 3D" gera o modelo de novo com as edições aplicadas (peça encostada na parede, no ambiente certo).
// 2.43: "Aprovar e salvar para o cliente" aqui mesmo — grava o 3D na pasta do cliente e mostra baixar/abrir/ligar na
// proposta (./Modelo3dCliente.js); antes era preciso ir ao cartão "Modelo 3D ilustrativo" e gerar de novo.
// somenteConferir: análise sem Mapa do CAD (arquitetura em PDF, análise antiga) — o 3D sem a paleta, para conferir e salvar.
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { abrirModelo3d, urlModelo3d, editarMapaCad, salvarModelo3dCliente } from '../../services/api';
import { mensagemDeErro } from '../../utils/download';
import { marcarDoProjeto } from './componentesDoProjeto';
import useDisciplinas from '../../hooks/useDisciplinas';
import { PainelCliente, useSituacao3d, avisarMudanca3d, EMBAIXO } from './Modelo3dCliente';

const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #2f2f2f', background: '#1a1a1a', color: '#ddd', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
// Nome curto e cor da disciplina: os do registro único (skills/_comum/disciplinas.js, GET /disciplinas — 2.37), os
// mesmos da legenda do 3D. Antes havia aqui uma tabela própria, com cores diferentes das do modelo.

export default function Modelo3dEditor({ analiseId, componentes, disciplinasDoProjeto = [], onEditado = () => {}, onFechar, somenteConferir = false }) {
  const quadro = useRef(null);
  const [url, setUrl] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [contagem, setContagem] = useState({ adicionados: 0, removidos: 0 });
  const { nomeCurto, cor } = useDisciplinas();
  const [situacao] = useSituacao3d(analiseId);
  const [salvando, setSalvando] = useState(false);
  // o que a mensagem usa sempre na versão mais nova, sem refazer o ouvinte a cada desenho da tela
  const atual = useRef({});
  atual.current = { componentes: marcarDoProjeto(componentes, disciplinasDoProjeto), nomeCurto, cor, onEditado, onFechar, somenteConferir, validos: new Set(componentes.map(c => c.simbolo)) };

  // abre ao montar e a cada análise nova (e no "Atualizar 3D"); o onFechar vem pela referência:
  // a tela de cima o recria a cada desenho, e isso não pode reabrir o 3D
  const abrir = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await abrirModelo3d('analise', analiseId, { embutido: true });
      setUrl(urlModelo3d(r.data.url)); // link novo a cada vez: o quadro recarrega
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui abrir o modelo 3D'), { duration: 9000, ...EMBAIXO });
      atual.current.onFechar();
    } finally { setCarregando(false); }
  }, [analiseId]);
  useEffect(() => { abrir(); }, [abrir]);

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
        avisarMudanca3d(analiseId); // o salvo para o cliente passa a "mudou depois de salvo"
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
        if (atual.current.somenteConferir) return; // sem Mapa do CAD: sem a paleta de inserir/retirar
        if (!m.comOrigem) { toast('Este 3D foi gerado antes da edição de componentes: use "Atualizar 3D".', { icon: 'ℹ️', ...EMBAIXO }); return; }
        const { nomeCurto: nome, cor: corDe } = atual.current;
        const paleta = atual.current.componentes.map(c => ({ simbolo: c.simbolo, nome: c.nome, disciplina: c.disciplina, grupo: nome(c.disciplina), montagem: c.montagem, altura_m: c.altura_m, cor: corDe(c.disciplina), doProjeto: c.doProjeto }));
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

  // gera a versão final com as edições de agora e grava na pasta do cliente (dono da análise ou admin — o servidor confere)
  async function salvarParaCliente() {
    setSalvando(true);
    try {
      const { data } = await salvarModelo3dCliente(analiseId);
      toast.success(`3D salvo para o cliente: ${data.nome_arquivo}${data.na_pasta ? ' na pasta do cliente' : ''}. Baixe ou ligue na proposta logo abaixo da barra.`, { duration: 8000, ...EMBAIXO });
      if (!data.na_pasta) toast('Não consegui gravar o arquivo na pasta do cliente (servidor de arquivos fora?). O 3D ficou salvo no sistema: dá para baixar aqui.', { icon: '⚠️', duration: 12000, ...EMBAIXO });
      avisarMudanca3d(analiseId);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui salvar o 3D para o cliente'), { duration: 9000, ...EMBAIXO });
    } finally { setSalvando(false); }
  }
  const salvoEmDia = !!situacao?.salvo_cliente?.atual;

  return (
    <div role="dialog" aria-modal="true" aria-label="3D da análise — editar e aprovar para o cliente" data-testid="editor-3d"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#121212', border: '1px solid #2a2a2a', borderBottom: 'none', borderRadius: '10px 10px 0 0', padding: '6px 12px' }}>
        <b style={{ color: '#e6c45a', fontSize: 14, flex: 1 }}>{somenteConferir ? '3D da análise — conferir e aprovar para o cliente' : '3D da análise — editar e aprovar para o cliente'}</b>
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}
          title={somenteConferir
            ? 'Sem o Mapa do CAD: aqui dá para conferir e salvar para o cliente (inserir e retirar valem para a análise com DWG/DXF do projeto).'
            : 'Inserir e Retirar ficam no painel do 3D (à direita, abaixo da barra). Gravado na análise; entra no orçamento ao reprocessar.'}>
          {contagem.adicionados || contagem.removidos ? `${contagem.adicionados} inserido(s), ${contagem.removidos} retirado(s) nesta sessão` : ''}
        </span>
        <button type="button" style={botao} onClick={abrir} disabled={carregando || salvando} data-testid="atualizar-3d">
          <RefreshCw size={13} /> {carregando ? 'Gerando…' : 'Atualizar 3D'}
        </button>
        <button type="button" onClick={salvarParaCliente} disabled={carregando || salvando} data-testid="salvar-3d-cliente"
          style={salvoEmDia ? { ...botao, borderColor: '#2f6f4f', color: '#9fe0b8' } : { ...botao, background: '#c9a227', borderColor: '#c9a227', color: '#111', fontWeight: 700 }}
          title="Gera o 3D com as edições de agora e grava o arquivo (.html) na pasta do cliente — depois é só baixar ou ligar na proposta, logo abaixo">
          <CheckCircle2 size={13} /> {salvando ? 'Salvando…' : salvoEmDia ? 'Salvar de novo para o cliente' : 'Aprovar e salvar para o cliente'}
        </button>
        <button type="button" style={botao} onClick={onFechar} aria-label="Fechar o 3D"><X size={14} /> Fechar</button>
      </div>
      <div style={{ background: '#121212', borderLeft: '1px solid #2a2a2a', borderRight: '1px solid #2a2a2a', padding: '0 12px 6px' }}>
        <PainelCliente analiseId={analiseId} situacao={situacao}
          quandoNaoSalvo={<span title="O arquivo vai para a pasta do cliente e aqui mesmo você baixa ou liga na proposta — não precisa gerar de novo no cartão da análise.">Ainda não salvo para o cliente — quando aprovado, use <b>Aprovar e salvar para o cliente</b>.</span>} />
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
