// Modelo 3D ilustrativo (versão 2.3): botões "Ver em 3D" / "Baixar 3D", o
// cartão da análise (enviar a arquitetura DWG/DXF) e a opção da proposta
// "mostrar ao cliente". O 3D abre numa aba nova por um link curto do servidor
// (a página roda isolada do sistema — ver backend/src/services/modelo3d).
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Box, FileDown, Upload } from 'lucide-react';
import {
  abrirModelo3d, baixarModelo3d, urlModelo3d, enviarArquiteturaAnalise, getArquiteturaAnalise,
  getModelo3d, mostrarModelo3dAoCliente,
} from '../services/api';
import { baixarArquivo, mensagemDeErro } from '../utils/download';

// antes: chamado antes de gerar (ex.: salvar o formulário pendente)
export function BotoesModelo3d({ origem, id, desabilitado = false, antes = null, estilo = {} }) {
  const [ocupado, setOcupado] = useState('');

  async function ver() {
    // a aba é aberta já no clique: aberta depois de esperar o servidor, o navegador bloquearia
    const aba = window.open('', '_blank');
    if (aba) aba.document.title = 'Gerando o modelo 3D…';
    setOcupado('ver');
    try {
      if (antes) await antes();
      const r = await abrirModelo3d(origem, id);
      const url = urlModelo3d(r.data.url);
      if (aba && !aba.closed) aba.location.href = url;
      else toast((t) => <span>O navegador bloqueou a aba. <a href={url} target="_blank" rel="noreferrer" onClick={() => toast.dismiss(t.id)}>Abrir o 3D</a></span>, { duration: 15000 });
      const estimados = (r.data.avisos || []).filter(a => /CONFERIR|ESTIMAD/i.test(a)).length;
      if (estimados) toast(`Pontos estimados pela arquitetura em ${estimados} item(ns) — veja "Premissas do modelo" no rodapé do 3D.`, { icon: '⚠️', duration: 8000 });
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
      <button type="button" style={{ ...btn3d, ...estilo }} disabled={desabilitado || !!ocupado} onClick={ver} data-testid="ver-3d"
        title="Modelo 3D ilustrativo da arquitetura com os pontos previstos — gira, aproxima e liga/desliga camadas. Abre numa aba nova.">
        <Box size={13} style={{ marginRight: 5 }} /> {ocupado === 'ver' ? 'Gerando 3D…' : 'Ver em 3D'}
      </button>
      <button type="button" style={{ ...btn3d, ...estilo }} disabled={desabilitado || !!ocupado} onClick={baixar}
        title="Baixa o modelo 3D como uma página (.html) que abre em qualquer navegador, sem internet — para enviar ao cliente">
        <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'baixar' ? 'Gerando…' : 'Baixar 3D (.html)'}
      </button>
    </>
  );
}

// Cartão da análise: arquitetura (DWG/DXF) → 3D com os pontos estimados das disciplinas
export function CartaoModelo3dAnalise({ analiseId, estiloCartao, estiloTitulo }) {
  const entrada = useRef(null);
  const [arquitetura, setArquitetura] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setArquitetura(null);
    if (analiseId) getArquiteturaAnalise(analiseId).then(r => setArquitetura(r.data)).catch(() => {});
  }, [analiseId]);

  async function enviar(arquivo) {
    setEnviando(true);
    try {
      const r = await enviarArquiteturaAnalise(analiseId, arquivo);
      toast.success(`${r.data.ambientes} ambientes e ${r.data.portas ?? 0} portas lidos da arquitetura${r.data.origem === 'dwg' ? ' (DWG)' : ''}`, { duration: 7000 });
      setArquitetura((await getArquiteturaAnalise(analiseId)).data);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao ler a arquitetura'), { duration: 9000 });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={estiloCartao} data-testid="cartao-modelo-3d">
      <h3 style={{ ...estiloTitulo, display: 'flex', alignItems: 'center', gap: 8 }}><Box size={16} /> Modelo 3D ilustrativo (para o cliente)</h3>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
        Envie a <b>arquitetura em DWG ou DXF</b> e o sistema monta o 3D dos ambientes com os pontos das disciplinas desta análise
        (estimados pela norma — marcados para conferir). Serve para o cliente ter uma ideia de como vai ficar; não substitui o projeto executivo.
        O projeto criado a partir desta análise já recebe a mesma arquitetura.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={entrada} type="file" accept=".dxf,.dwg" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) enviar(f); }} />
        <button type="button" style={btn3d} disabled={enviando} onClick={() => entrada.current?.click()}
          title="Planta de arquitetura em DWG ou DXF (AutoCAD 2004 ou mais novo), com o nome dos ambientes escrito dentro deles">
          <Upload size={13} style={{ marginRight: 5 }} /> {enviando ? 'Lendo…' : arquitetura ? 'Trocar arquitetura (DWG/DXF)' : 'Enviar arquitetura (DWG/DXF)'}
        </button>
        {arquitetura && (
          <>
            <span style={{ fontSize: 12, color: '#777' }}>{arquitetura.nome_arquivo} — {arquitetura.resumo?.ambientes?.length || 0} ambientes lidos</span>
            <BotoesModelo3d origem="analise" id={analiseId} desabilitado={enviando} />
          </>
        )}
      </div>
    </div>
  );
}

// Proposta: só aparece quando a origem dela (análise ou projeto) tem arquitetura
export function OpcaoModelo3dProposta({ propostaId, somenteLeitura = false }) {
  const [situacao, setSituacao] = useState(null);
  const [valor, setValor] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setSituacao(null);
    if (propostaId) getModelo3d('proposta', propostaId).then(r => { setSituacao(r.data); setValor(!!r.data.modelo_3d_cliente); }).catch(() => {});
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
      <span style={{ fontSize: 11, color: '#777' }}>arquitetura: {situacao.arquivo}</span>
      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <BotoesModelo3d origem="proposta" id={propostaId} />
      </div>
    </div>
  );
}

const btn3d = {
  display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px solid #2f4f6f',
  borderRadius: 6, color: '#8ab4f8', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
