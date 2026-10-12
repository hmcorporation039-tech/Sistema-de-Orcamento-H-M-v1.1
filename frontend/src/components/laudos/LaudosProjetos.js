import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FilePlus2, FileDown, Upload, Calculator, Receipt, Trash2, Download, BookOpen, FolderDown } from 'lucide-react';
import {
  getDisciplinasLaudo, getModeloLaudo, getLaudos, getLaudo, criarLaudo, atualizarLaudo, removerLaudo,
  calcularLaudo, baixarDocumentoLaudo, enviarFotosLaudo, getFotoLaudo, removerFotoLaudo, gerarOrcamentoDoLaudo,
  salvarDocumentosLaudo, getPastaLaudo, abrirPastaLaudo,
} from '../../services/api';
import PainelPasta from '../PainelPasta';
import FormularioSpda from './FormularioSpda';
import ResultadoSpda from './ResultadoSpda';
import FormularioGenerico from './FormularioGenerico';
import ResultadoGenerico from './ResultadoGenerico';
import Select from '../Select';

// Laudos e projetos por disciplina — dentro da aba Análise de Projeto.
// O SPDA tem tela própria; as demais disciplinas usam o formulário genérico,
// desenhado a partir do esquema que a skill envia (skills/_comum/formulario.js).
// O backend usa a skill da disciplina (mesmo motor do Claude Code).
const TELAS_POR_DISCIPLINA = {
  spda: { Formulario: FormularioSpda, Resultado: ResultadoSpda },
};
const TELA_GENERICA = { Formulario: FormularioGenerico, Resultado: ResultadoGenerico };

function baixarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function LaudosProjetos() {
  const navigate = useNavigate();
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplina, setDisciplina] = useState('spda');
  const [modelo, setModelo] = useState(null); // { modelo, exemplo, checklistBase }
  const [lista, setLista] = useState([]);
  const [laudo, setLaudo] = useState(null); // { id, disciplina, propostas, gerar_orcamento }
  const [dados, setDados] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [urlsFotos, setUrlsFotos] = useState({});
  const [resumo, setResumo] = useState(null);
  const [sujo, setSujo] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const [pastaMudou, setPastaMudou] = useState(0); // recarrega o painel da pasta após gravar arquivos
  const entradaJson = useRef(null);
  const salvandoRef = useRef(null);

  // A barra de ações fica presa logo abaixo do menu do sistema (que também é
  // fixo e muda de altura quando os botões quebram linha em telas estreitas)
  const [alturaMenu, setAlturaMenu] = useState(0);
  useEffect(() => {
    const medir = () => setAlturaMenu(document.querySelector('header')?.offsetHeight || 0);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const infoDisciplina = disciplinas.find(d => d.chave === disciplina);
  const tela = TELAS_POR_DISCIPLINA[disciplina] || (modelo?.formulario ? TELA_GENERICA : null);

  const carregarLista = useCallback(async () => {
    try {
      const r = await getLaudos({ disciplina });
      setLista(r.data);
    } catch { /* lista vazia já informa */ }
  }, [disciplina]);

  useEffect(() => {
    getDisciplinasLaudo().then(r => setDisciplinas(r.data)).catch(() => toast.error('Erro ao carregar as disciplinas'));
  }, []);

  const disponivel = !!disciplinas.find(d => d.chave === disciplina)?.disponivel;
  useEffect(() => {
    setModelo(null);
    carregarLista();
    if (disponivel) {
      getModeloLaudo(disciplina).then(r => setModelo(r.data)).catch(err => toast.error(err.response?.data?.erro || 'Erro ao carregar o modelo'));
    }
  }, [disciplina, disponivel, carregarLista]);

  // Miniaturas das fotos (object URLs): liberadas ao trocar de laudo e ao sair da tela
  const urlsRef = useRef({});
  useEffect(() => { urlsRef.current = urlsFotos; }, [urlsFotos]);
  useEffect(() => () => Object.values(urlsRef.current).forEach(u => window.URL.revokeObjectURL(u)), []);

  async function carregarFotos(id, listaFotos) {
    Object.values(urlsRef.current).forEach(u => window.URL.revokeObjectURL(u));
    setUrlsFotos({});
    const urls = {};
    for (const f of listaFotos) {
      try {
        const r = await getFotoLaudo(id, f.id);
        urls[f.id] = window.URL.createObjectURL(r.data);
      } catch { /* foto removida ou inacessível: o cartão mostra "não carregada" */ }
    }
    setUrlsFotos(urls);
  }

  async function abrir(id) {
    try {
      const r = await getLaudo(id);
      setLaudo({ id: r.data.id, disciplina: r.data.disciplina, propostas: r.data.propostas || {}, gerar_orcamento: r.data.gerar_orcamento !== false });
      setDados(r.data.dados);
      setFotos(r.data.fotos);
      setResumo(null);
      setSujo(false);
      setSalvoEm(new Date(r.data.atualizado_em));
      carregarFotos(r.data.id, r.data.fotos);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao abrir o laudo');
    }
  }

  async function novo(base) {
    try {
      const r = await criarLaudo(disciplina, base);
      toast.success('Laudo criado');
      await carregarLista();
      await abrir(r.data.id);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao criar o laudo');
    }
  }

  async function importarJson(arquivo) {
    try {
      const texto = await arquivo.text();
      const json = JSON.parse(texto);
      await novo(json);
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'O arquivo não é um JSON válido' : 'Erro ao importar o arquivo');
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir o laudo "${item.titulo}"? As fotos dele também serão apagadas.`)) return;
    try {
      await removerLaudo(item.id);
      if (laudo?.id === item.id) { setLaudo(null); setDados(null); setResumo(null); }
      carregarLista();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir');
    }
  }

  const carregarPasta = useCallback(() => getPastaLaudo(laudo.id), [laudo?.id]);
  const abrirPasta = useCallback(() => abrirPastaLaudo(laudo.id), [laudo?.id]);

  const salvarAgora = useCallback(async () => {
    if (!laudo || !dados) return;
    if (salvandoRef.current) await salvandoRef.current;
    const promessa = atualizarLaudo(laudo.id, dados)
      .then(() => { setSujo(false); setSalvoEm(new Date()); })
      .catch(err => { toast.error(err.response?.data?.erro || 'Erro ao salvar'); throw err; })
      .finally(() => { salvandoRef.current = null; });
    salvandoRef.current = promessa;
    return promessa;
  }, [laudo, dados]);

  // Salvamento automático 2 s depois da última alteração
  useEffect(() => {
    if (!sujo) return undefined;
    const t = setTimeout(() => { salvarAgora().then(carregarLista).catch(() => {}); }, 2000);
    return () => clearTimeout(t);
  }, [sujo, dados, salvarAgora, carregarLista]);

  const alterarDados = (atualizador) => {
    setDados(atual => (typeof atualizador === 'function' ? atualizador(atual) : atualizador));
    setSujo(true);
  };

  async function calcular() {
    setOcupado('calcular');
    try {
      await salvarAgora();
      const r = await calcularLaudo(laudo.id);
      setResumo(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro no cálculo', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  // Gera todos os documentos do padrão da disciplina e grava na pasta do laudo
  // (substituindo as versões anteriores, sem acumular cópias).
  async function salvarDocumentosNaPasta() {
    setOcupado('pasta');
    try {
      await salvarAgora();
      const r = await salvarDocumentosLaudo(laudo.id);
      const gravados = r.data.documentos.filter(d => d.gravado).length;
      toast.success(`${gravados} documento(s) salvos na pasta do laudo`);
      if (gravados < r.data.documentos.length) toast.error('Algum documento não pôde ser gravado — feche-o no Word/Excel e tente de novo', { duration: 8000 });
      setPastaMudou(Date.now());
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar os documentos na pasta', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  // "Só laudo": desliga os orçamentos deste laudo (os documentos continuam iguais)
  async function alternarOrcamento(valor) {
    try {
      await salvarAgora().catch(() => {});
      const r = await atualizarLaudo(laudo.id, dados, valor);
      setLaudo(l => ({ ...l, gerar_orcamento: r.data.gerar_orcamento }));
      carregarLista();
      toast.success(valor ? 'Laudo com orçamento de material' : 'Só laudo — sem orçamento de material');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao alterar a opção de orçamento');
    }
  }

  async function baixar(doc) {
    setOcupado(`doc_${doc.tipo}`);
    try {
      await salvarAgora();
      const r = await baixarDocumentoLaudo(laudo.id, doc.tipo);
      const nome = decodeURIComponent(r.headers['x-nome-arquivo'] || `${doc.tipo}.${doc.formato === 'Excel' ? 'xlsx' : 'docx'}`);
      baixarBlob(r.data, nome);
      setPastaMudou(Date.now()); // a cópia também foi gravada na pasta do laudo
    } catch (err) {
      let msg = 'Erro ao gerar o documento';
      try { msg = JSON.parse(await err.response.data.text()).erro || msg; } catch { /* resposta não-JSON */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  function exportarJson() {
    const nome = `${(dados?.meta?.prefixo || dados?.obra?.nome || 'laudo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40)}_dados_${disciplina.toUpperCase()}.json`;
    baixarBlob(new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' }), nome);
  }

  async function orcar(modo) {
    setOcupado(`orc_${modo.modo}`);
    try {
      await salvarAgora();
      const r = await gerarOrcamentoDoLaudo(laudo.id, modo.modo);
      setLaudo(l => ({ ...l, propostas: { ...l.propostas, [modo.modo]: r.data.propostaId } }));
      toast.success(r.data.mensagem, { duration: 9000 });
      navigate(`/orcamento/${r.data.propostaId}`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar o orçamento', { duration: 8000 });
    } finally {
      setOcupado('');
    }
  }

  async function enviarFotos(arquivos) {
    setOcupado('fotos');
    try {
      await salvarAgora();
      const r = await enviarFotosLaudo(laudo.id, arquivos);
      const novas = r.data;
      setFotos(f => [...f, ...novas]);
      const urls = {};
      arquivos.forEach((a, i) => { if (novas[i]) urls[novas[i].id] = window.URL.createObjectURL(a); });
      setUrlsFotos(u => ({ ...u, ...urls }));
      alterarDados(atual => {
        const listaFotos = [...((atual.inspecao || {}).fotos || [])];
        novas.forEach(f => {
          listaFotos.push({ id: `F-${String(listaFotos.length + 1).padStart(2, '0')}`, local: '', subsistema: '', descricao: f.nome_arquivo.replace(/\.[^.]+$/, ''), ref: '', arquivo: `foto:${f.id}`, largura_cm: 8 });
        });
        return { ...atual, inspecao: { ...(atual.inspecao || {}), fotos: listaFotos } };
      });
      toast.success(`${novas.length} foto(s) enviada(s)`);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar as fotos');
    } finally {
      setOcupado('');
    }
  }

  async function removerFoto(fotoId) {
    try {
      await removerFotoLaudo(laudo.id, fotoId);
      setFotos(f => f.filter(x => x.id !== fotoId));
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover a foto');
    }
  }

  return (
    <div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ ...tituloSecao, marginBottom: 0, flex: 1 }}>Laudos e projetos por disciplina</h3>
          <Select value={disciplina} onChange={e => { setDisciplina(e.target.value); setLaudo(null); setDados(null); setResumo(null); }}
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', padding: '8px 10px', fontSize: 13 }}>
            {disciplinas.map(d => <option key={d.chave} value={d.chave}>{d.nome}{d.disponivel ? '' : ' — em preparação'}</option>)}
          </Select>
        </div>

        {infoDisciplina && !infoDisciplina.disponivel ? (
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            A disciplina <b>{infoDisciplina.nome}</b> ainda está em preparação. Ela vai usar este mesmo fluxo: formulário,
            cálculo pela norma, laudo/memorial em Word e orçamento integrado ao catálogo de materiais.
            {infoDisciplina.erro && <><br /><span style={{ color: '#e05050' }}>{infoDisciplina.erro}</span></>}
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button style={btnPrimario} disabled={!modelo} onClick={() => novo(modelo?.modelo)}><FilePlus2 size={14} /> Novo laudo</button>
              <button style={btnSecundario} disabled={!modelo} onClick={() => novo(modelo?.exemplo)} title="Cria um laudo preenchido com o exemplo, para conhecer o formulário">
                <BookOpen size={13} style={{ marginRight: 5 }} /> Novo a partir do exemplo
              </button>
              <button style={btnSecundario} onClick={() => entradaJson.current?.click()} title="Importa um arquivo JSON de laudo (ex.: ST_Lucia_dados_SPDA.json)">
                <Upload size={13} style={{ marginRight: 5 }} /> Importar JSON
              </button>
              <input ref={entradaJson} type="file" accept=".json,application/json" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) importarJson(e.target.files[0]); e.target.value = ''; }} />
            </div>

            {lista.length === 0 ? (
              <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Nenhum laudo salvo nesta disciplina.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px 8px 0' }}>Obra</th><th style={{ padding: '4px 8px 8px 0' }}>Cliente</th>
                    <th style={{ padding: '4px 8px 8px 0' }}>Revisão</th><th style={{ padding: '4px 8px 8px 0' }}>Fotos</th>
                    <th style={{ padding: '4px 8px 8px 0' }}>Atualizado em</th><th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map(item => (
                    <tr key={item.id} onClick={() => abrir(item.id)} style={{ cursor: 'pointer', borderTop: '1px solid #1e1e1e', background: laudo?.id === item.id ? '#1a1a1a' : 'transparent' }}>
                      <td style={{ padding: '8px 8px 8px 0' }}>{item.titulo}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.cliente_nome || '—'}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{(item.revisao || '').split(' ')[0] || '—'}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{item.total_fotos}</td>
                      <td style={{ padding: '8px 8px 8px 0', color: '#999' }}>{new Date(item.atualizado_em).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => excluir(item)} style={{ ...btnIcone, color: '#b04040' }} title="Excluir"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {laudo && dados && tela && (
        <>
          <div style={{ ...card, position: 'sticky', top: alturaMenu, zIndex: 40, boxShadow: '0 6px 14px rgba(0,0,0,.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ddd' }}>{dados.obra?.nome || dados.cliente?.nome || 'Laudo sem título'}</div>
                <div style={{ fontSize: 11, color: '#777' }}>
                  {sujo ? 'Alterações não salvas…' : salvoEm ? `Salvo às ${salvoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>
              <button style={btnPrimario} onClick={calcular} disabled={!!ocupado}><Calculator size={14} /> {ocupado === 'calcular' ? 'Calculando…' : 'Calcular'}</button>
              <button style={btnSecundario} onClick={exportarJson}><Download size={13} style={{ marginRight: 5 }} /> Exportar JSON</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <button style={{ ...btnSecundario, borderColor: '#2f5a2f', color: '#8fd18f' }} disabled={!!ocupado} onClick={salvarDocumentosNaPasta} title="Gera todos os documentos do padrão (Word e Excel) e grava na pasta do laudo, substituindo as versões anteriores">
                <FolderDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'pasta' ? 'Salvando…' : 'Salvar documentos na pasta'}
              </button>
              {(infoDisciplina?.documentos || []).map(doc => (
                <button key={doc.tipo} style={btnSecundario} disabled={!!ocupado} onClick={() => baixar(doc)} title={`Gerar ${doc.rotulo} (${doc.formato})`}>
                  <FileDown size={13} style={{ marginRight: 5 }} /> {ocupado === `doc_${doc.tipo}` ? 'Gerando…' : doc.rotulo}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#bbb', marginRight: 6, cursor: 'pointer', whiteSpace: 'nowrap' }} title="Desmarque quando for emitido só o laudo, sem orçamento de material">
                <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={laudo.gerar_orcamento !== false} onChange={e => alternarOrcamento(e.target.checked)} /> Gerar orçamento de material
              </label>
              {laudo.gerar_orcamento === false && <span style={{ fontSize: 12, color: '#777' }}>Só laudo — os documentos são emitidos sem orçamento.</span>}
              {laudo.gerar_orcamento !== false && (infoDisciplina?.modosOrcamento || []).map(m => (
                <button key={m.modo} style={{ ...btnSecundario, borderColor: '#5a4a12', color: '#c9a227' }} disabled={!!ocupado} onClick={() => orcar(m)} title={m.descricao}>
                  <Receipt size={13} style={{ marginRight: 5 }} />
                  {ocupado === `orc_${m.modo}` ? 'Gerando…' : `${laudo.propostas?.[m.modo] ? 'Atualizar' : 'Gerar'} orçamento — ${m.rotulo}`}
                </button>
              ))}
            </div>
            <PainelPasta carregar={carregarPasta} abrir={abrirPasta} atualizarQuando={`${salvoEm}-${pastaMudou}`} />
          </div>

          {resumo && (
            <div style={card}>
              <h3 style={tituloSecao}>Resultado</h3>
              <tela.Resultado resumo={resumo} />
            </div>
          )}

          <div style={card}>
            <tela.Formulario
              esquema={modelo?.formulario}
              dados={dados} onChange={alterarDados} checklistBase={modelo?.checklistBase || []}
              fotos={fotos} urlsFotos={urlsFotos} onEnviarFotos={enviarFotos} onRemoverFoto={removerFoto}
            />
          </div>
        </>
      )}
    </div>
  );
}

const card = { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 18, marginBottom: 16 };
const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 10 };
const btnPrimario = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none',
  borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnIcone = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: 5, color: '#999', cursor: 'pointer',
};
