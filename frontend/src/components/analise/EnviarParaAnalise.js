// "Enviar o projeto para análise" (versão 2.3) — o MESMO bloco na aba Análise
// de projeto e dentro da obra (aba Análises), em passos numerados:
//   1. para que é a análise (orçamento × elaboração de projeto);
//   2. os arquivos: soltos, uma pasta inteira, um ZIP — ou os que já estão na
//      pasta da obra no servidor (o projeto que o cliente mandou e alguém salvou lá);
//   3. conferir a disciplina sugerida de cada arquivo (ou marcar como referência);
//   4. analisar.
// Nenhuma disciplina vem escolhida "de fábrica": a sugestão sai do próprio
// arquivo (nome/conteúdo) e o usuário confirma.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FolderSearch, HardDrive } from 'lucide-react';
import ObraSelect from '../ObraSelect';
import { BotoesPacote, ListaPacote, itensDoPacote } from './PacoteProjeto';
import { analisarPacoteProjeto, pacoteDaPastaObra } from '../../services/api';

export const FINALIDADES = [
  { valor: 'elaboracao', rotulo: 'Elaboração de projeto', descricao: 'A H&M vai DEFINIR e ENTREGAR o projeto a partir do arquitetônico recebido: projeto por disciplina com definições técnicas, as-built, DXF, QElectroTech e PDF.' },
  { valor: 'orcamento', rotulo: 'Orçamento', descricao: 'Orçar a partir do projeto recebido: itens extraídos dos arquivos e "Gerar orçamento e abrir no editor".' },
];

// obraFixa: id da obra (dentro da página da obra) — sem ela, a obra é escolhida aqui (opcional)
// iniciarComPasta: já lê a pasta da obra ao abrir (vindo de Obra › Arquivos › "Analisar os arquivos desta pasta")
// pacoteInicial: pacote já recebido (ex.: "Analisar" das novidades da pasta do cliente)
export default function EnviarParaAnalise({ obraFixa = null, obraInicial = null, disciplinas, onCriada, iniciarComPasta = false, pacoteInicial = null }) {
  const [finalidade, setFinalidade] = useState('');
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [obra, setObra] = useState(obraFixa || obraInicial || null);
  const [pacote, setPacote] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [lendoPasta, setLendoPasta] = useState(false);
  const obraId = obraFixa || obra;

  function receber(p, { daPasta = false } = {}) {
    const itens = itensDoPacote(p.arquivos).map((it, i) => ({ ...it, incluir: daPasta ? p.arquivos[i].incluirSugerido !== false : true }));
    setPacote({ token: p.token, itens, pasta: p.pasta || null });
  }

  async function usarPastaDaObra() {
    setLendoPasta(true);
    try {
      const r = await pacoteDaPastaObra(obraId);
      receber(r.data, { daPasta: true });
      const fora = r.data.arquivos.filter(a => a.incluirSugerido === false).length;
      toast.success(`${r.data.arquivos.length} arquivo(s) da pasta da obra${fora ? ` (${fora} gerado(s) pelo sistema vieram desmarcados)` : ''}. Confira as disciplinas sugeridas.`, { duration: 7000 });
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao ler a pasta da obra', { duration: 9000 });
    } finally {
      setLendoPasta(false);
    }
  }

  const jaLeu = useRef(false);
  useEffect(() => { if (pacoteInicial) receber(pacoteInicial); }, [pacoteInicial]); // eslint-disable-line
  useEffect(() => {
    if (iniciarComPasta && obraId && !jaLeu.current) { jaLeu.current = true; usarPastaDaObra(); }
  }, [iniciarComPasta, obraId]); // eslint-disable-line

  async function analisar() {
    const incluidos = (pacote?.itens || []).filter(i => i.incluir);
    if (!finalidade) { toast.error('Passo 1: escolha para que é a análise — Orçamento ou Elaboração de projeto'); return; }
    if (!incluidos.length) { toast.error('Passo 2: envie os arquivos do projeto (ou use os da pasta da obra)'); return; }
    if (incluidos.some(it => !it.referencia && !it.disciplinas.length)) { toast.error('Passo 3: marque a disciplina de cada arquivo (ou marque como referência, ou desmarque "Usar")'); return; }
    if (!incluidos.some(it => !it.referencia)) { toast.error('Marque a disciplina de ao menos um arquivo: só arquivos de referência não geram análise'); return; }
    setAnalisando(true);
    try {
      const r = await analisarPacoteProjeto(pacote.token, {
        arquivos: incluidos.map(i => ({ id: i.id, disciplinas: i.disciplinas, referencia: i.referencia, tipoReferencia: i.tipoReferencia })),
        nome_projeto: nomeProjeto.trim(), obra_id: obraId || null, finalidade,
      });
      const conflitos = (r.data.conflitos || []).length;
      toast.success(`Projeto analisado: ${incluidos.length} arquivo(s), ${r.data.ambientes.length} ambientes${conflitos ? ` — ${conflitos} conflito(s) de posição entre disciplinas` : ''}`, { duration: 7000 });
      setPacote(null); setFinalidade(''); setNomeProjeto('');
      onCriada(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao analisar o projeto', { duration: 9000 });
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div data-testid="enviar-para-analise">
      <Passo n={1} titulo="Para que é esta análise?">
        <div role="radiogroup" aria-label="Finalidade da análise" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {[...FINALIDADES].reverse().map(f => {
            const marcada = finalidade === f.valor;
            return (
              <label key={f.valor} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${marcada ? (f.valor === 'elaboracao' ? '#2f4f6f' : '#5a4a12') : '#2a2a2a'}`, background: marcada ? '#161616' : 'transparent' }}>
                <input type="radio" name="finalidade" value={f.valor} checked={marcada} onChange={() => setFinalidade(f.valor)} style={{ width: 'auto', marginTop: 3 }} />
                <span>
                  <b style={{ fontSize: 13, color: marcada ? (f.valor === 'elaboracao' ? '#8ab4f8' : '#c9a227') : '#ccc' }}>{f.rotulo}</b>
                  <span style={{ display: 'block', fontSize: 12, color: '#888', lineHeight: 1.5, marginTop: 2 }}>{f.descricao}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: '#666', margin: '6px 0 0' }}>Análise de projeto não gera laudo nem escolhe disciplina por conta própria. Laudo é pedido quando necessário, em Laudos.</p>
      </Passo>

      <Passo n={2} titulo="Arquivos do projeto">
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', lineHeight: 1.6 }}>
          PDF, DWG ou DXF — vários arquivos, uma <b>pasta inteira</b> (com subpastas) ou um <b>ZIP</b> do jeito que o cliente/arquiteto mandou.
          {obraId ? <> Se os arquivos já estão salvos na <b>pasta da obra</b> no servidor, use o último botão.</> : null}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <BotoesPacote desabilitado={analisando || lendoPasta} onRecebido={(p) => receber(p)} />
          {obraId && (
            <button type="button" style={btnPasta} disabled={analisando || lendoPasta} onClick={usarPastaDaObra} data-testid="usar-pasta-obra"
              title="Usa os PDF/DWG/DXF/ZIP que já estão na pasta desta obra (Arquivos do Sistema\Obras\…). O que o sistema gerou (propostas, laudos…) vem desmarcado.">
              <HardDrive size={13} style={{ marginRight: 6 }} /> {lendoPasta ? 'Lendo a pasta da obra…' : 'Usar os arquivos da pasta da obra'}
            </button>
          )}
        </div>
        {pacote?.pasta && <p style={{ fontSize: 11, color: '#666', margin: '8px 0 0' }}>Pasta lida: <code>{pacote.pasta}</code></p>}
      </Passo>

      {pacote && (
        <Passo n={3} titulo="Confira a disciplina de cada arquivo">
          <ListaPacote itens={pacote.itens} token={pacote.token} disciplinas={disciplinas}
            onMudar={(itens) => setPacote(p => ({ ...p, itens }))} onDescartar={() => setPacote(null)} />
        </Passo>
      )}

      <Passo n={pacote ? 4 : 3} titulo="Analisar" ultimo>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={nomeProjeto} onChange={e => setNomeProjeto(e.target.value)} placeholder="Nome do projeto (opcional — vazio: nome da pasta/ZIP ou do cliente)" style={{ flex: '1 1 300px', maxWidth: 440 }} />
          {!obraFixa && (
            <div style={{ flex: '1 1 300px', maxWidth: 460 }} title="Obra a que este projeto pertence (opcional) — a análise, a pasta e o orçamento gerado ficam ligados a ela">
              <ObraSelect value={obra} onChange={(id) => { setObra(id); }} rotuloVazio="Sem obra (opcional)" />
            </div>
          )}
          <button onClick={analisar} disabled={analisando || !pacote} style={btnPrimario} data-testid="analisar-projeto">
            <FolderSearch size={13} style={{ marginRight: 6 }} /> {analisando ? `Analisando ${pacote?.itens.filter(i => i.incluir).length || ''} arquivo(s)…` : 'Analisar projeto'}
          </button>
        </div>
        {analisando && <p style={{ fontSize: 12, color: '#c9a227', margin: '8px 0 0' }}>Lendo os arquivos e comparando as disciplinas — pacote grande leva alguns minutos.</p>}
      </Passo>
    </div>
  );
}

function Passo({ n, titulo, children, ultimo = false }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: ultimo ? 0 : 18 }}>
      <div style={{ flex: 'none', width: 24, height: 24, borderRadius: '50%', background: '#2c2715', border: '1px solid #5a4a12', color: '#e2c35a', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#bbb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', margin: '3px 0 8px' }}>{titulo}</div>
        {children}
      </div>
    </div>
  );
}

const btnPrimario = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' };
const btnPasta = { display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px solid #5a4a12', borderRadius: 6, color: '#e2c35a', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
