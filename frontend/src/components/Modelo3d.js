// Modelo 3D ilustrativo (versão 2.3): botões "Ver em 3D" / "Baixar 3D", o
// cartão da análise (enviar a arquitetura DWG/DXF/PDF) e a opção da proposta
// "mostrar ao cliente". O 3D abre numa aba nova por um link curto do servidor
// (a página roda isolada do sistema — ver backend/src/services/modelo3d).
// enviarArquitetura(): o envio da arquitetura é o mesmo na análise e no projeto.
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Box, FileDown, Upload, RefreshCw, PencilRuler } from 'lucide-react';
import api, {
  abrirModelo3d, baixarModelo3d, urlModelo3d, enviarArquiteturaAnalise, getArquiteturaAnalise,
  getModelo3d, mostrarModelo3dAoCliente, getMapaCad,
} from '../services/api';
import Modelo3dEditor from './analise/Modelo3dEditor';
import { PainelCliente, useSituacao3d, textoSalvo, EMBAIXO } from './analise/Modelo3dCliente';
import { baixarArquivo, mensagemDeErro } from '../utils/download';
import { estilos } from './ui/estilos';

export const ACEITA_ARQUITETURA = '.dxf,.dwg,.pdf';
export const DICA_ARQUITETURA = 'Planta de arquitetura em DWG ou DXF (AutoCAD 2004 ou mais novo) ou em PDF exportado do AutoCAD/Revit (não escaneado), com o nome dos ambientes escrito dentro deles; portas pelo arco de abertura.';

// Envia a arquitetura (análise ou projeto) e mostra o resultado. PDF sem escala
// no carimbo nem portas para medir: pergunta a escala e reenvia. Devolve os
// dados da resposta, ou null (erro já mostrado / usuário desistiu).
export async function enviarArquitetura(enviar, arquivo, { extra = () => '' } = {}) {
  let escala = null;
  for (;;) {
    try {
      const { data } = await enviar(arquivo, { escala });
      const n = Array.isArray(data.ambientes) ? data.ambientes.length : data.ambientes;
      const pdf = data.pdf ? ` — PDF na escala 1:${data.pdf.escala}${data.pdf.origemEscala === 'portas' ? ' (pelo tamanho das portas)' : data.pdf.origemEscala === 'carimbo' ? ' (do carimbo)' : data.pdf.origemEscala === 'nome_arquivo' ? ' (do nome do arquivo)' : ''}` : data.origem === 'dwg' ? ' (DWG)' : '';
      toast.success(`${n} ambientes e ${data.portas ?? 0} portas lidos da arquitetura${pdf}${extra(data)}`, { duration: 8000 });
      for (const aviso of data.pdf?.avisos || []) toast(aviso, { icon: '⚠️', duration: 12000 });
      return data;
    } catch (err) {
      if (err.response?.data?.faltaEscala && !escala) {
        const r = window.prompt('O PDF não informa a escala da planta (nem dá para medir pelas portas).\nDigite a escala — por exemplo 50 para 1:50, 100 para 1:100:', '50');
        const v = Number(String(r || '').replace(/^1\s*[:/]\s*/, ''));
        if (!(v > 0)) return null;
        escala = v;
        continue;
      }
      toast.error(await mensagemDeErro(err, 'Erro ao ler a arquitetura'), { duration: 9000 });
      return null;
    }
  }
}

// "Gerar de novo": apaga o 3D guardado e gera outra vez (dono do registro ou
// administrador — o servidor confere). Mesma resposta de abrirModelo3d.
const gerarModelo3dDeNovo = (origem, id) => api.post(`/modelo-3d/${origem}/${id}/gerar-de-novo`, null, { timeout: 180000 });

// antes: chamado antes de gerar (ex.: salvar o formulário pendente)
// podeRefazer: false esconde "Gerar de novo" (proposta somente leitura — ver e baixar continuam)
export function BotoesModelo3d({ origem, id, desabilitado = false, antes = null, estilo = {}, podeRefazer = true }) {
  const [ocupado, setOcupado] = useState('');
  // análise: o 3D com a barra de edição (inserir/retirar componentes da biblioteca), dentro da tela — a aba nova não
  // grava nada (página em sandbox, sem login); aqui a tela grava pelo sistema (./analise/Modelo3dEditor.js)
  const [componentes, setComponentes] = useState(null);
  async function editar() {
    setOcupado('editar');
    try {
      if (antes) await antes();
      const { data } = await getMapaCad(id);
      // sem Mapa do CAD (arquitetura em PDF, análise antiga): abre para conferir e salvar para o cliente, sem a paleta (2.43)
      if (!data?.disponivel || !data.componentes?.length) {
        toast(data?.semMapa ? 'Esta análise foi lida antes do Mapa do CAD: dá para conferir e salvar para o cliente; para inserir e retirar componentes, use "Ler o DWG de novo" no Mapa do CAD.' : 'Inserir e retirar componentes vale para a análise com DWG/DXF do projeto (Mapa do CAD): aqui dá para conferir e salvar para o cliente.', { icon: 'ℹ️', duration: 9000, ...EMBAIXO });
        setComponentes({ lista: [], disciplinasDoProjeto: [], somenteConferir: true });
        return;
      }
      setComponentes({ lista: data.componentes, disciplinasDoProjeto: data.disciplinasDoProjeto || [] });
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui abrir a edição no 3D'), { duration: 9000 });
    } finally {
      setOcupado('');
    }
  }

  // deNovo: descarta o modelo guardado (3D velho depois de conferir símbolos no Mapa do CAD etc.)
  async function ver(deNovo = false) {
    // descarta o modelo guardado (e as edições vistas nele) e gera outro, o que leva tempo: pergunta antes
    if (deNovo && !window.confirm('Gerar o modelo 3D de novo? O 3D guardado é descartado e gerado outra vez a partir do desenho atual (pode levar alguns minutos).')) return;
    // a aba é aberta já no clique: aberta depois de esperar o servidor, o navegador bloquearia
    const aba = window.open('', '_blank');
    if (aba) aba.document.title = 'Gerando o modelo 3D…';
    setOcupado(deNovo ? 'refazer' : 'ver');
    try {
      if (antes) await antes();
      const r = deNovo ? await gerarModelo3dDeNovo(origem, id) : await abrirModelo3d(origem, id);
      const url = urlModelo3d(r.data.url);
      if (aba && !aba.closed) aba.location.href = url;
      else toast((t) => <span>O navegador bloqueou a aba. <a href={url} target="_blank" rel="noreferrer" onClick={() => toast.dismiss(t.id)}>Abrir o 3D</a></span>, { duration: 15000 });
      // um modelo por planta do desenho (escolhida no seletor "Planta" do 3D); pontos só os do projeto
      const plantas = r.data.numeros?.plantas || [];
      if (plantas.length > 1) toast(`${plantas.length} plantas no desenho, cada uma um modelo à parte — troque no seletor "Planta" do 3D.`, { icon: 'ℹ️', duration: 8000 });
      const semPontos = plantas.filter(p => !p.pontos).length;
      if (semPontos) toast(`${semPontos} planta(s) sem ponto de instalação desenhado: aparecem só com a arquitetura (nada é estimado).`, { icon: '⚠️', duration: 9000 });
      // pontos que o desenho deixou soltos: caminho SUGERIDO até o quadro/a rede (camada à parte no 3D)
      const sugerido = (r.data.numeros?.infraestrutura || []).filter(g => g.sugerido).reduce((s, g) => s + (g.comprimento_m || 0), 0);
      if (sugerido) toast(`${sugerido.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m de eletroduto SUGERIDO (azul-claro) ligando ao quadro/à tubulação os pontos que o projeto deixou soltos — liga/desliga no botão "Sugeridos" do 3D.`, { icon: 'ℹ️', duration: 9000 });
      // 3D interativo (fase 2): com circuitos e comandos do projeto, o 3D simula a instalação
      if (plantas.some(p => p.interativo)) toast('3D interativo: clique no quadro para abrir a porta e ligar/desligar os disjuntores; clique nos interruptores e nas luminárias. O estado fica só nesta aba.', { icon: '💡', duration: 9000 });
    } catch (err) {
      if (aba && !aba.closed) aba.close();
      toast.error(await mensagemDeErro(err, 'Erro ao gerar o modelo 3D'), { duration: 9000 });
    } finally {
      setOcupado('');
    }
  }

  async function baixar() {
    setOcupado('baixar');
    try {
      if (antes) await antes();
      await baixarArquivo(baixarModelo3d(origem, id), 'Modelo 3D.html');
      toast.success('Modelo 3D baixado: abre em qualquer navegador, sem internet — pode mandar ao cliente.', { duration: 7000 });
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao gerar o modelo 3D'), { duration: 9000 });
    } finally {
      setOcupado('');
    }
  }

  return (
    <>
      <button type="button" style={{ ...btn3d, ...estilo }} disabled={desabilitado || !!ocupado} onClick={() => ver()} data-testid="ver-3d"
        title="Modelo 3D ilustrativo da arquitetura com os pontos previstos — gira, aproxima e liga/desliga camadas. Abre numa aba nova.">
        <Box size={13} style={{ marginRight: 5 }} /> {ocupado === 'ver' ? 'Gerando 3D…' : 'Ver em 3D'}
      </button>
      {origem === 'analise' && (
        <button type="button" style={{ ...btn3d, ...estilo, borderColor: '#c9a227', color: '#c9a227' }} disabled={desabilitado || !!ocupado} onClick={editar} data-testid="editar-3d"
          title="Abre o 3D aqui na tela: inserir e retirar componentes da biblioteca H&M (gravado na análise; entra no orçamento ao reprocessar) e, aprovado, salvar para o cliente com um clique.">
          <PencilRuler size={13} style={{ marginRight: 5 }} /> {ocupado === 'editar' ? 'Abrindo…' : 'Editar e aprovar no 3D'}
        </button>
      )}
      <button type="button" style={{ ...btn3d, ...estilo }} disabled={desabilitado || !!ocupado} onClick={baixar}
        title="Baixa o modelo 3D como uma página (.html) que abre em qualquer navegador, sem internet — para enviar ao cliente">
        <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'baixar' ? 'Gerando…' : 'Baixar 3D (.html)'}
      </button>
      {podeRefazer && (
        <button type="button" style={{ ...btn3d, ...estilo }} disabled={desabilitado || !!ocupado} onClick={() => ver(true)} data-testid="refazer-3d"
          title="Descarta o 3D guardado e gera outra vez (ex.: depois de conferir símbolos no Mapa do CAD). Só o dono do registro ou um administrador.">
          <RefreshCw size={13} style={{ marginRight: 5 }} /> {ocupado === 'refazer' ? 'Gerando de novo…' : 'Gerar de novo'}
        </button>
      )}
      {componentes && (
        <Modelo3dEditor analiseId={id} componentes={componentes.lista} disciplinasDoProjeto={componentes.disciplinasDoProjeto} somenteConferir={!!componentes.somenteConferir}
          onFechar={() => setComponentes(null)} />
      )}
    </>
  );
}

// Cartão da análise: arquitetura (DWG/DXF/PDF) → 3D com os pontos das disciplinas
// compacto (2.48, tela única da análise): uma linha no lugar das explicações longas
export function CartaoModelo3dAnalise({ analiseId, estiloCartao, estiloTitulo, compacto = false }) {
  const entrada = useRef(null);
  const [arquitetura, setArquitetura] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // 2.43: salvo para o cliente (pelo 3D — daqui ou do Mapa do CAD), em dia ou mudou depois
  const [situacao, recarregarSituacao] = useSituacao3d(analiseId);

  useEffect(() => {
    // trocou de análise antes da resposta chegar: a arquitetura da anterior não
    // entra no cartão da nova (revisão de 11/2026)
    let cancelado = false;
    setArquitetura(null);
    if (analiseId) getArquiteturaAnalise(analiseId).then(r => { if (!cancelado) setArquitetura(r.data); }).catch(() => {});
    return () => { cancelado = true; };
  }, [analiseId]);

  async function enviar(arquivo) {
    setEnviando(true);
    try {
      if (await enviarArquitetura((a, op) => enviarArquiteturaAnalise(analiseId, a, op), arquivo)) {
        setArquitetura((await getArquiteturaAnalise(analiseId)).data);
        recarregarSituacao(); // arquitetura nova: o 3D salvo para o cliente deixa de ser o atual
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={estiloCartao} data-testid="cartao-modelo-3d">
      <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 8 }}><Box size={16} /> Modelo 3D ilustrativo (para o cliente)</h3>
      {compacto ? (
        <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 12, lineHeight: 1.6 }} data-testid="3d-compacto">
          Um 3D por planta com os pontos do projeto, para o cliente ver como vai ficar. Para mandar: <b>Editar e aprovar no 3D</b> → confira →{' '}
          <b>Aprovar e salvar para o cliente</b>.
        </p>
      ) : (
        <>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 12, lineHeight: 1.6 }}>
          Envie a <b>arquitetura em DWG, DXF ou PDF</b> (pode ser o próprio DWG do projeto) e o sistema monta <b>um 3D por planta</b> de cada
          prancha/folha, com os pontos que estão <b>desenhados no projeto</b> — nada é estimado; planta sem ponto desenhado sai só com a arquitetura.
          Eletrodutos e eletrocalhas vêm do desenho; o ponto que ficou solto ganha um <b>caminho sugerido</b> até o quadro ou a tubulação (camada à parte, para conferir).
          PDF é sempre convertido em DXF (cada cor do traço numa layer) e o DXF fica na pasta do cliente, junto do original.
          Serve para o cliente ter uma ideia de como vai ficar; não substitui o projeto executivo. O PDF precisa ser o exportado do AutoCAD/Revit (não escaneado).
          O projeto criado a partir desta análise já recebe a mesma arquitetura.
        </p>
        <p style={{ fontSize: 12, color: 'var(--texto-2)', marginBottom: 12, lineHeight: 1.6 }}>
          Para mandar ao cliente: <b>Editar e aprovar no 3D</b> → confira (insira ou retire o que faltar) → <b>Aprovar e salvar para o cliente</b>, lá dentro.
          O arquivo vai para a pasta do cliente e dali mesmo você baixa ou liga o 3D na proposta — não precisa gerar de novo aqui.
        </p>
        </>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={entrada} type="file" accept={ACEITA_ARQUITETURA} style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviar(f); }} />
        <button type="button" style={btn3d} disabled={enviando} onClick={() => entrada.current?.click()} title={DICA_ARQUITETURA}>
          <Upload size={13} style={{ marginRight: 5 }} /> {enviando ? 'Lendo…' : arquitetura ? 'Trocar arquitetura' : 'Enviar arquitetura (DWG/DXF/PDF)'}
        </button>
        {arquitetura && (
          <>
            <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>{arquitetura.nome_arquivo} — {arquitetura.resumo?.ambientes?.length || 0} ambientes lidos</span>
            <BotoesModelo3d origem="analise" id={analiseId} desabilitado={enviando} />
          </>
        )}
      </div>
      {arquitetura && (
        <div style={{ marginTop: 10 }}>
          <PainelCliente analiseId={analiseId} situacao={situacao} acoes={false}
            quandoNaoSalvo={<span>Ainda não salvo para o cliente: abra <b>Editar e aprovar no 3D</b>, confira e use <b>Aprovar e salvar para o cliente</b>.</span>} />
        </div>
      )}
    </div>
  );
}

// Proposta: só aparece quando a origem dela (análise ou projeto) tem arquitetura
export function OpcaoModelo3dProposta({ propostaId, somenteLeitura = false }) {
  const [situacao, setSituacao] = useState(null);
  const [valor, setValor] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // resposta de outra proposta (trocou antes de chegar) é descartada
    let cancelado = false;
    setSituacao(null);
    if (propostaId) getModelo3d('proposta', propostaId).then(r => { if (cancelado) return; setSituacao(r.data); setValor(!!r.data.modelo_3d_cliente); }).catch(() => {});
    return () => { cancelado = true; };
  }, [propostaId]);

  if (!situacao?.disponivel) return null;

  async function alternar(mostrar) {
    setSalvando(true);
    try {
      await mostrarModelo3dAoCliente(propostaId, mostrar);
      setValor(mostrar);
      toast.success(mostrar ? 'O cliente verá o 3D no link de aprovação e a imagem no PDF.' : 'Modelo 3D retirado do link e do PDF.');
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao salvar a opção do modelo 3D'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', border: '1px solid #2f4f6f', borderRadius: 8, background: '#0f1620', marginBottom: 16 }} data-testid="opcao-modelo-3d">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ddd', cursor: somenteLeitura ? 'default' : 'pointer' }}
        title="Liga o modelo 3D ilustrativo na página do link de aprovação e acrescenta a imagem como anexo no PDF da proposta">
        <input type="checkbox" checked={!!valor} disabled={somenteLeitura || salvando} onChange={e => alternar(e.target.checked)} />
        <Box size={14} style={{ color: '#8ab4f8' }} /> Mostrar o modelo 3D ao cliente (link de aprovação e anexo no PDF)
      </label>
      <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>arquitetura: {situacao.arquivo}</span>
      {/* 2.43: o 3D da análise de origem foi aprovado e salvo para o cliente? (o link mostra sempre o 3D de agora) */}
      {situacao.salvo_cliente && (situacao.salvo_cliente.atual
        ? <span style={{ fontSize: 12, color: '#9fe0b8' }} data-testid="proposta-3d-aprovado">✓ {textoSalvo(situacao.salvo_cliente).replace('Salvo para o cliente', '3D aprovado')}</span>
        : <span style={{ fontSize: 12, color: '#e6c45a' }} data-testid="proposta-3d-mudou">⚠ O 3D da análise mudou depois de aprovado — o cliente veria a versão nova; confira e salve de novo no 3D da análise.</span>)}
      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <BotoesModelo3d origem="proposta" id={propostaId} podeRefazer={!somenteLeitura} />
      </div>
    </div>
  );
}

const btn3d = estilos.btnContornoAzul;
