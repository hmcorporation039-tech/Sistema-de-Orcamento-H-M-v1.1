// 3D salvo para o cliente (2.43, 14/11/2026). Antes: editava-se no 3D (Mapa do CAD ou "Editar componentes no 3D")
// e depois, no cartão "Modelo 3D ilustrativo", era preciso gerar de novo e baixar para mandar ao cliente. Agora o
// próprio 3D tem "Aprovar e salvar para o cliente" (POST /modelo-3d/analise/:id/salvar-cliente): grava o arquivo na
// pasta do cliente e guarda quem salvou e quando. Este painel mostra a situação — salvo, mudou depois de salvo ou
// ainda não salvo — e, salvo, baixa, abre numa aba e liga o 3D nas propostas feitas da análise, ali mesmo.
// O editor e o cartão da análise ficam em dia pelo evento EVENTO_3D (o editor pode ter sido aberto pelo Mapa do CAD).
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, FileDown, ExternalLink } from 'lucide-react';
import { getModelo3d, abrirModelo3d, urlModelo3d, baixarModelo3d, mostrarModelo3dAoCliente } from '../../services/api';
import { baixarArquivo, mensagemDeErro } from '../../utils/download';
import { dataHoraBr } from '../../utils/format';

// avisos do 3D embaixo, no centro: em cima à direita cobriam o "Aprovar e salvar para o cliente" do editor
export const EMBAIXO = { position: 'bottom-center' };
export const EVENTO_3D = 'hm3d:situacao';
export const avisarMudanca3d = (analiseId) => window.dispatchEvent(new CustomEvent(EVENTO_3D, { detail: { analiseId: Number(analiseId) } }));

// situação do 3D da análise (GET /modelo-3d/analise/:id), recarregada quando o 3D dela é editado ou salvo
export function useSituacao3d(analiseId) {
  const [situacao, setSituacao] = useState(null);
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao(v => v + 1), []);
  useEffect(() => {
    let cancelado = false;
    if (!analiseId) { setSituacao(null); return undefined; }
    Promise.resolve().then(() => getModelo3d('analise', analiseId))
      .then(r => { if (!cancelado) setSituacao(r?.data || null); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [analiseId, versao]);
  useEffect(() => {
    const ouvir = (e) => { if (e.detail?.analiseId === Number(analiseId)) recarregar(); };
    window.addEventListener(EVENTO_3D, ouvir);
    return () => window.removeEventListener(EVENTO_3D, ouvir);
  }, [analiseId, recarregar]);
  return [situacao, recarregar];
}

export function textoSalvo(s) {
  const quem = s.por ? ` por ${s.por}` : '';
  return `Salvo para o cliente em ${dataHoraBr(s.salvo_em)}${quem}`;
}
const textoEdicoes = (s) => {
  const partes = [s.inseridos ? `${s.inseridos} inserido(s)` : '', s.retirados ? `${s.retirados} retirado(s)` : ''].filter(Boolean);
  return partes.length ? ` · com ${partes.join(' e ')} por você` : '';
};

const CORES = {
  ok: { borda: '#2f6f4f', fundo: '#0f1a14', texto: '#9fe0b8' },
  aviso: { borda: '#7a5c12', fundo: '#1c160a', texto: '#e6c45a' },
  neutra: { borda: '#2a2a2a', fundo: '#141414', texto: 'var(--texto-3)' },
};
const faixa = (tipo) => ({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', border: `1px solid ${CORES[tipo].borda}`, background: CORES[tipo].fundo, color: CORES[tipo].texto, borderRadius: 8, fontSize: 12, lineHeight: 1.5 });
const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid #2f6f4f', background: 'transparent', color: '#9fe0b8', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };

// O 3D numa aba nova (a aba é aberta já no clique: depois de esperar o servidor, o navegador bloquearia)
export async function abrir3dEmAba(origem, id) {
  const aba = window.open('', '_blank');
  if (aba) aba.document.title = 'Abrindo o modelo 3D…';
  try {
    const r = await abrirModelo3d(origem, id);
    const url = urlModelo3d(r.data.url);
    if (aba && !aba.closed) aba.location.href = url;
    else toast((t) => <span>O navegador bloqueou a aba. <a href={url} target="_blank" rel="noreferrer" onClick={() => toast.dismiss(t.id)}>Abrir o 3D</a></span>, { duration: 15000, ...EMBAIXO });
  } catch (err) {
    if (aba && !aba.closed) aba.close();
    toast.error(await mensagemDeErro(err, 'Erro ao abrir o modelo 3D'), { duration: 9000, ...EMBAIXO });
  }
}

// acoes: false esconde Baixar/Abrir (o cartão da análise já tem os botões dele)
export function PainelCliente({ analiseId, situacao, acoes = true, quandoNaoSalvo = null }) {
  const [propostas, setPropostas] = useState([]);
  const [ocupado, setOcupado] = useState('');
  useEffect(() => { setPropostas(situacao?.propostas || []); }, [situacao]);
  if (!situacao?.disponivel) return null;
  const s = situacao.salvo_cliente;

  if (!s) return quandoNaoSalvo && <div style={faixa('neutra')} data-testid="3d-cliente-nao-salvo">{quandoNaoSalvo}</div>;
  if (!s.atual) {
    return (
      <div style={faixa('aviso')} data-testid="3d-cliente-desatualizado">
        <AlertTriangle size={14} />
        <span>O 3D mudou depois de salvo ({textoSalvo(s).replace('Salvo para o cliente', 'salvo')}). A pasta do cliente continua com a versão salva — confira e use <b>Aprovar e salvar para o cliente</b> de novo.</span>
      </div>
    );
  }

  async function baixar() {
    setOcupado('baixar');
    try {
      await baixarArquivo(baixarModelo3d('analise', analiseId), s.nome_arquivo || 'Modelo 3D.html');
      toast.success('Modelo 3D baixado: abre em qualquer navegador, sem internet — pode mandar ao cliente.', { duration: 7000, ...EMBAIXO });
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao baixar o modelo 3D'), { duration: 9000, ...EMBAIXO });
    } finally { setOcupado(''); }
  }
  async function abrir() {
    setOcupado('abrir');
    try { await abrir3dEmAba('analise', analiseId); } finally { setOcupado(''); }
  }
  async function alternar(p, mostrar) {
    setOcupado(`p${p.id}`);
    try {
      await mostrarModelo3dAoCliente(p.id, mostrar);
      setPropostas(lista => lista.map(x => (x.id === p.id ? { ...x, modelo_3d_cliente: mostrar } : x)));
      toast.success(mostrar ? `Proposta ${p.numero}: o cliente verá o 3D no link de aprovação e a imagem no PDF.` : `Proposta ${p.numero}: 3D retirado do link e do PDF.`, EMBAIXO);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Erro ao salvar a opção do modelo 3D'), EMBAIXO);
    } finally { setOcupado(''); }
  }

  return (
    <div style={faixa('ok')} data-testid="3d-cliente-salvo">
      <CheckCircle2 size={14} />
      <span style={{ flex: '1 1 260px' }}>{textoSalvo(s)} — <b>{s.nome_arquivo}</b> na pasta do cliente{textoEdicoes(s)}.</span>
      {acoes && (
        <>
          <button type="button" style={botao} onClick={baixar} disabled={!!ocupado} data-testid="baixar-3d-cliente"
            title="A página .html do 3D salvo: abre em qualquer navegador, sem internet — para mandar ao cliente">
            <FileDown size={13} /> {ocupado === 'baixar' ? 'Baixando…' : 'Baixar .html'}
          </button>
          <button type="button" style={botao} onClick={abrir} disabled={!!ocupado} title="Abre o 3D salvo numa aba nova, como o cliente vê">
            <ExternalLink size={13} /> Abrir em aba nova
          </button>
        </>
      )}
      {propostas.map(p => (
        <label key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
          title={`Liga o 3D no link de aprovação e a imagem no PDF da proposta ${p.numero} (${p.status})`}>
          <input type="checkbox" checked={!!p.modelo_3d_cliente} disabled={!!ocupado} onChange={e => alternar(p, e.target.checked)} data-testid={`mostrar-proposta-${p.id}`} />
          Mostrar na proposta {p.numero}
        </label>
      ))}
    </div>
  );
}
