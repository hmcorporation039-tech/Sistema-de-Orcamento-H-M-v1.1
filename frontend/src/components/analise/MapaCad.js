// Mapa do CAD (item 3 do plano): o que o sistema entendeu de cada layer do DWG/DXF com símbolos desenhados
// (QiBuilder/AltoQi, PDF convertido). O engenheiro confere o tipo e a altura; cada confirmação fica na
// análise, vira aprendizado (o próximo desenho do escritório já vem certo) e, ao reprocessar, entra no orçamento.
// Até conferir, esses pontos NÃO entram no orçamento. A planta (./PlantaMapaCad.js) e a tabela andam juntas: clique no
// ponto escolhe a linha (e abre a ficha para conferir na própria planta); clique na linha enquadra os pontos dela.
// Versão 2.30: componentes da biblioteca H&M (com o símbolo) inseridos e retirados na planta ou no 3D
// (./Modelo3dEditor.js) — aparecem no 3D na hora e entram no orçamento ao reprocessar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Box, CheckCheck, Download, RefreshCw, Undo2, Upload } from 'lucide-react';
import { getMapaCad, salvarMapaCad, editarMapaCad, reprocessarMapaCad, exportarBibliotecaBlocos, importarBibliotecaBlocos } from '../../services/api';
import { mensagemDeErro } from '../../utils/download';
import PlantaMapaCad, { SITUACAO, situacaoDaLinha, IconeComponente, COR_INSERIDO } from './PlantaMapaCad';
import Modelo3dEditor from './Modelo3dEditor';

const ORIGEM = {
  legenda: ['da legenda do desenho', '#4a9'],
  aprendido: ['aprendido de outro projeto', '#8ab4f8'],
  // forma parecida com o que já foi aprendido, com outro nome de layer (skills/_comum/cad/semelhancaDeSimbolo.js)
  semelhante: ['parecido com outro projeto', '#b48ead'],
  regra: ['pela regra da layer', '#c9a227'],
  nao_reconhecido: ['não reconhecido', '#c06060'],
  confirmado: ['conferido', '#5fbf7a'],
};
const NOME_DISC = {
  eletrica: 'Elétrica', iluminacao: 'Iluminação', 'iluminacao-externa': 'Iluminação externa', incendio: 'Incêndio', cftv: 'CFTV', rede: 'Rede',
  alarme: 'Alarme', telefonia: 'Telefonia', antena: 'Antena', 'controle-acesso': 'Controle de acesso', automacao: 'Automação', spda: 'SPDA',
  solar: 'Solar', veicular: 'Veicular', eletrica_hospitalar: 'Elétrica hospitalar', climatizacao: 'Climatização',
};
const nomeDisciplina = (d) => NOME_DISC[d] || d;
// componentes inseridos de um arquivo, por tipo: [{ simbolo, nome, quantidade }]
function inseridosPorTipo(edicoes, nomeDoTipo) {
  const por = new Map();
  for (const a of edicoes?.adicionados || []) por.set(a.simbolo, (por.get(a.simbolo) || 0) + 1);
  return [...por].map(([simbolo, quantidade]) => ({ simbolo, nome: nomeDoTipo(simbolo), quantidade })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
// de onde veio a altura sugerida (quando não é da legenda do desenho nem conferida)
const ALTURA_DE = { nota: 'sugerida pela nota do desenho', nota_aprendida: 'costume deste escritório (notas anteriores)' };
const LIMITE_LINHAS = 60;
// circuito e retorno escritos junto dos símbolos da linha ("3", "a" — fase 1 do roteiro): sugestão; ao conferir
// a linha, o circuito de cada ponto vai para o 3D
function textoCircuitos(c) {
  const lista = (o) => Object.entries(o || {}).sort((x, y) => y[1] - x[1]);
  const circ = lista(c.circuitos), ret = lista(c.retornos);
  const partes = [];
  if (circ.length) partes.push(`circ. ${circ.slice(0, 6).map(([k, n]) => `${k} (${n})`).join(', ')}${circ.length > 6 ? '…' : ''}`);
  if (ret.length) partes.push(`retornos ${ret.slice(0, 6).map(([k]) => k).join(', ')}${ret.length > 6 ? '…' : ''}`);
  return partes.join(' · ');
}
const campo = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '5px 7px', boxSizing: 'border-box', fontFamily: 'inherit' };
const botao = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #2f2f2f', background: '#1a1a1a', color: '#ddd', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };

// filtro da tabela pela situação da linha (as mesmas cores da planta)
const FILTROS = [
  ['todas', 'Todas', () => true],
  ['conferir', 'A conferir', (s) => ['nao_reconhecido', 'reconhecido'].includes(situacaoDaLinha(s))],
  ['nao_reconhecido', 'Não reconhecidas', (s) => situacaoDaLinha(s) === 'nao_reconhecido'],
  ['conferido', 'Conferidas', (s) => situacaoDaLinha(s) === 'conferido'],
];

const br = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const paraNumero = (t) => { const n = Number(String(t).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
const cm = (medida) => (medida || []).map(m => Math.round(m * 100)).join(' × ');

// por que a linha do mapa não entra no orçamento (backend: services/analiseCad, CAD-12 — decidido por layer)
const MOTIVO_FORA = {
  layer_com_bloco: 'Não entra no orçamento: esta layer tem blocos nomeados, e o orçamento conta pelos blocos',
  referencia: 'Não entra no orçamento: layer de referência de outra disciplina (REF-…)',
  repete_bloco: 'Não entra no orçamento: repete um bloco da mesma família no mesmo lugar',
};

export default function MapaCad({ analiseId, estiloCartao, estiloTitulo }) {
  const navigate = useNavigate();
  const [mapa, setMapa] = useState(null); // { disponivel, arquivos, tipos }
  const [edicao, setEdicao] = useState({}); // `${arquivo}|${idx}` → { simbolo, altura }
  const [ocupado, setOcupado] = useState(false);
  const [mostrarTodas, setMostrarTodas] = useState({});
  const [ativa, setAtiva] = useState({}); // arquivo → linha do mapa escolhida (destaque na planta e na tabela)
  const [foco, setFoco] = useState({}); // arquivo → { idx, vez }: a planta enquadra os pontos dessa linha
  const [filtro, setFiltro] = useState({}); // arquivo → chave de FILTROS
  const [incluirDisciplinas, setIncluirDisciplinas] = useState(true);
  const [editor3d, setEditor3d] = useState(false);

  useEffect(() => {
    let vivo = true;
    getMapaCad(analiseId).then(r => { if (vivo) setMapa(r.data); }).catch(() => { if (vivo) setMapa({ disponivel: false, arquivos: [], tipos: [] }); });
    return () => { vivo = false; };
  }, [analiseId]);

  const grupos = useMemo(() => {
    const por = new Map();
    for (const t of mapa?.tipos || []) {
      if (!por.has(t.disciplina)) por.set(t.disciplina, []);
      por.get(t.disciplina).push(t);
    }
    return [...por.entries()];
  }, [mapa]);
  const nomes = useMemo(() => new Map((mapa?.tipos || []).map(t => [t.simbolo, t.nome])), [mapa]);
  const porSimbolo = useMemo(() => new Map((mapa?.componentes || []).map(c => [c.simbolo, c])), [mapa]);
  const nomeDoTipo = (simbolo) => nomes.get(simbolo) || porSimbolo.get(simbolo)?.nome || simbolo;
  // resposta do servidor depois de uma edição feita no 3D: a planta e os totais acompanham
  const aoEditarNo3d = useCallback((dados) => setMapa(m => ({ ...m, ...dados })), []);

  // análise com DWG feita antes do mapa existir: sem ele os pontos do desenho não têm onde ser conferidos
  if (!mapa?.disponivel && !mapa?.semMapa) return null;
  const totalConferidas = mapa.arquivos.reduce((t, a) => t + a.resumo.conferidas, 0);
  const totalPontosPendentes = mapa.arquivos.reduce((t, a) => t + a.resumo.pontosPendentes, 0);
  const disciplinasFaltando = mapa.arquivos.flatMap(a => (a.disciplinasAIncluir || []).map(d => ({ ...d, arquivo: a.arquivo })));
  const totalEditadas = mapa.arquivos.reduce((t, a) => t + (a.resumo.inseridos || 0) + (a.resumo.retirados || 0), 0);
  const edicoesForaDoOrcamento = mapa.arquivos.some(a => ((a.resumo.inseridos || 0) + (a.resumo.retirados || 0)) > 0 && !a.edicoesNoOrcamento);
  const podeReprocessar = totalConferidas > 0 || totalEditadas > 0;
  const componentes = mapa.componentes || [];

  const valorDe = (arquivo, s) => edicao[`${arquivo}|${s.idx}`] || { simbolo: s.simbolo, altura: br(s.altura_m) };
  const mudar = (arquivo, s, parte) => setEdicao(e => ({ ...e, [`${arquivo}|${s.idx}`]: { ...valorDe(arquivo, s), ...parte } }));

  // controles de uma linha — os mesmos na tabela e na ficha da planta
  const seletorTipo = (arquivo, s, largura = '100%') => (
    <select value={valorDe(arquivo, s).simbolo} onChange={(e) => mudar(arquivo, s, { simbolo: e.target.value })} style={{ ...campo, width: largura }} disabled={ocupado || s.confirmado} aria-label="Tipo do ponto">
      <option value="?">{s.origem === 'nao_reconhecido' && !s.confirmado ? '— escolha o tipo ou "não é ponto" —' : 'Não é ponto'}</option>
      {grupos.map(([disc, tipos]) => (
        <optgroup key={disc} label={NOME_DISC[disc] || disc}>
          {tipos.map(t => <option key={t.simbolo} value={t.simbolo}>{t.nome}</option>)}
        </optgroup>
      ))}
    </select>
  );
  const campoAltura = (arquivo, s) => (
    <input value={valorDe(arquivo, s).altura} onChange={(e) => mudar(arquivo, s, { altura: e.target.value })} placeholder="altura" inputMode="decimal" style={{ ...campo, width: 70 }} disabled={ocupado || s.confirmado} aria-label="Altura (m)" />
  );
  const botaoAcao = (arquivo, s) => {
    const v = valorDe(arquivo, s);
    const mudou = v.simbolo !== s.simbolo || v.altura !== br(s.altura_m);
    return s.confirmado
      ? <button type="button" style={botao} onClick={() => desfazer(arquivo, s)} disabled={ocupado}><Undo2 size={12} /> Desfazer</button>
      : <button type="button" style={{ ...botao, ...(mudou || s.simbolo !== '?' ? { borderColor: '#5fbf7a', color: '#5fbf7a' } : {}) }} onClick={() => confirmar(arquivo, s)} disabled={ocupado}>Confirmar</button>;
  };
  // escolher a linha: pela planta (só destaca e garante que ela aparece na tabela) ou pela tabela (enquadra na planta)
  const escolherNaPlanta = (a, idx) => {
    setAtiva(m => ({ ...m, [a.arquivo]: idx }));
    if (a.simbolos.findIndex(x => x.idx === idx) >= LIMITE_LINHAS) setMostrarTodas(m => ({ ...m, [a.arquivo]: true }));
    const f = FILTROS.find(([k]) => k === (filtro[a.arquivo] || 'todas'));
    const s = a.simbolos.find(x => x.idx === idx);
    if (s && f && !f[2](s)) setFiltro(m => ({ ...m, [a.arquivo]: 'todas' }));
  };
  const escolherNaTabela = (a, idx) => {
    setAtiva(m => ({ ...m, [a.arquivo]: idx }));
    setFoco(m => ({ ...m, [a.arquivo]: { idx, vez: (m[a.arquivo]?.vez || 0) + 1 } }));
  };
  const irParaTabela = (arquivo, idx) => document.querySelector(`[data-mapa-linha="${CSS.escape(`${arquivo}|${idx}`)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function enviar(arquivo, linhas, mensagem) {
    setOcupado(true);
    try {
      const r = await salvarMapaCad(analiseId, arquivo, linhas);
      setMapa(m => ({ ...m, ...r.data }));
      setEdicao(e => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`${arquivo}|`))));
      if (mensagem) toast.success(mensagem(r.data));
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui salvar o mapa'), { duration: 8000 });
    } finally { setOcupado(false); }
  }

  const confirmar = (arquivo, s) => {
    const v = valorDe(arquivo, s);
    return enviar(arquivo, [{ idx: s.idx, simbolo: v.simbolo, altura_m: paraNumero(v.altura), confirmado: true }],
      (d) => (d.aprendidas ? 'Conferido — o sistema aprendeu esse tipo para os próximos desenhos' : 'Conferido'));
  };
  const desfazer = (arquivo, s) => enviar(arquivo, [{ idx: s.idx, confirmado: false }], () => 'Confirmação desfeita');

  // inserir/retirar componentes (planta): pedido = { adicionar } | { remover } | { desfazer }
  async function editar(arquivo, pedido, mensagem) {
    setOcupado(true);
    try {
      const r = await editarMapaCad(analiseId, { arquivo, ...pedido });
      setMapa(m => ({ ...m, ...r.data }));
      if (mensagem) toast.success(mensagem, { duration: 2500 });
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui gravar a edição'), { duration: 8000 });
    } finally { setOcupado(false); }
  }
  // a edição mais recente do arquivo (inserida ou retirada) volta atrás
  const desfazerUltima = (a) => {
    const todas = [...(a.edicoes?.adicionados || []), ...(a.edicoes?.removidos || [])].sort((x, y) => String(y.em).localeCompare(String(x.em)));
    if (todas.length) editar(a.arquivo, { desfazer: [todas[0].id] }, 'Última edição desfeita');
  };
  const confirmarReconhecidas = (a) => {
    const linhas = a.simbolos.filter(s => !s.confirmado && s.simbolo !== '?' && s.quantidade > 0)
      .map(s => ({ idx: s.idx, simbolo: valorDe(a.arquivo, s).simbolo, altura_m: paraNumero(valorDe(a.arquivo, s).altura), confirmado: true }));
    if (!linhas.length) return toast('Nenhuma linha reconhecida para confirmar.');
    return enviar(a.arquivo, linhas, () => `${linhas.length} linha(s) conferida(s)`);
  };

  async function reprocessar() {
    setOcupado(true);
    try {
      const r = await reprocessarMapaCad(analiseId, { incluirDisciplinas });
      const h = r.data.edicoesHerdadas;
      const copiadas = h?.copiadas ? h.alterados + h.removidos + h.acrescentados : 0;
      toast.success(`${mapa.disponivel ? 'Nova análise gravada com o mapa conferido.' : 'Nova análise gravada com o mapa do CAD — confira as layers nela.'} A anterior continua salva.${copiadas ? ` ${copiadas} edição(ões) sua(s) foram copiadas.` : ''}`);
      if (h && !h.copiadas) toast(h.motivo, { duration: 10000, icon: 'ℹ️' });
      if (h?.recalculados?.length) toast(`${h.recalculados.length} item(ns) que você tinha ajustado na quantidade foram recalculados pelo mapa conferido — vale a do mapa; revise: ${h.recalculados.slice(0, 4).join('; ')}${h.recalculados.length > 4 ? '…' : ''}`, { duration: 14000, icon: '⚠️' });
      navigate(`/obras/analise/${r.data.id}`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui reprocessar a análise'), { duration: 10000 });
    } finally { setOcupado(false); }
  }

  async function exportarBiblioteca() {
    try {
      const r = await exportarBibliotecaBlocos();
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `biblioteca-blocos-hm-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${r.data.linhas.length} linha(s) da biblioteca exportada(s)`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui exportar a biblioteca de blocos'), { duration: 8000 });
    }
  }

  async function importarBiblioteca(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setOcupado(true);
    try {
      const json = JSON.parse(await arquivo.text());
      const r = await importarBibliotecaBlocos(json);
      toast.success(`Biblioteca importada: ${r.data.gravadas} linha(s) gravada(s), ${r.data.mantidas} mantida(s) (já conferidas aqui)${r.data.recusadas ? `, ${r.data.recusadas} recusada(s)` : ''}.`, { duration: 9000 });
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : await mensagemDeErro(err, 'Não consegui importar a biblioteca (só administrador)'), { duration: 9000 });
    } finally { setOcupado(false); }
  }

  if (!mapa.disponivel) {
    return (
      <div style={estiloCartao} data-testid="cartao-mapa-cad-ausente">
        <h3 style={estiloTitulo}>Mapa do CAD — esta análise ainda não tem</h3>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
          Ela foi feita antes do mapa do CAD: os pontos dos símbolos desenhados no DWG/DXF (tomadas, luminárias, quadros) foram lidos,
          mas <b>não entram no orçamento</b> sem conferência. Ler o desenho de novo grava uma análise nova com o mapa para conferir
          (a atual continua salva e o que você editou nela é copiado).
        </p>
        <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={reprocessar} disabled={ocupado} data-testid="gerar-mapa">
          <RefreshCw size={13} /> {ocupado ? 'Lendo o desenho…' : 'Ler o DWG de novo e gerar o mapa'}
        </button>
      </div>
    );
  }

  return (
    <div style={estiloCartao} data-testid="cartao-mapa-cad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ ...estiloTitulo, flex: 1, marginBottom: 0 }}>Mapa do CAD — confira o que o sistema entendeu do desenho</h3>
        {componentes.length > 0 && (
          <button type="button" style={botao} onClick={() => setEditor3d(true)} disabled={ocupado} data-testid="editar-no-3d"
            title="Abre o modelo 3D aqui, com a biblioteca de componentes para inserir e retirar">
            <Box size={13} /> Editar no 3D
          </button>
        )}
        {podeReprocessar && (
          <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={reprocessar} disabled={ocupado} data-testid="reprocessar-mapa">
            <RefreshCw size={13} /> Reprocessar com o mapa conferido
          </button>
        )}
        {mapa.semFundo && !podeReprocessar && (
          <button type="button" style={{ ...botao, borderColor: '#c9a227', color: '#c9a227' }} onClick={reprocessar} disabled={ocupado} data-testid="ler-de-novo"
            title="Grava uma análise nova com o desenho de fundo e a leitura atual (a atual continua salva)">
            <RefreshCw size={13} /> {ocupado ? 'Lendo o desenho…' : 'Ler o DWG de novo'}
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
        Cada linha é uma layer × forma de símbolo do desenho. Confira o <b>tipo</b> e a <b>altura</b>: o que for conferido vira aprendizado do sistema
        (o próximo desenho do escritório já vem certo) e, ao reprocessar, entra no orçamento. Pontos ainda não conferidos <b>não entram no orçamento</b>
        {totalPontosPendentes > 0 ? ` — hoje são ${totalPontosPendentes} ponto(s) fora.` : '.'} "Não é ponto" tira a layer da contagem.
        {componentes.length > 0 && <> Na planta, <b>Inserir</b> e <b>Retirar</b> põem e tiram componentes da biblioteca (com o símbolo de cada disciplina); o 3D mostra na hora.</>}
      </p>
      {podeReprocessar && (
        <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 10 }} data-testid="aviso-reprocessar">
          {edicoesForaDoOrcamento
            ? 'Há componentes inseridos ou retirados que ainda não estão no orçamento: use "Reprocessar com o mapa conferido" (grava uma análise nova; a atual continua salva).'
            : 'Depois de conferir, use "Reprocessar com o mapa conferido": ele grava uma análise nova com esses pontos já no orçamento (a atual continua salva).'}
        </div>
      )}
      {podeReprocessar && (
        <div style={{ fontSize: 12, color: 'var(--texto-2)', marginBottom: 10, lineHeight: 1.6 }}>
          Ao reprocessar, o que você editou nesta análise (quantidades, valores, itens retirados ou acrescentados) é copiado para a nova.
          {disciplinasFaltando.length > 0 && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, color: '#c9a227', cursor: 'pointer' }}>
              <input type="checkbox" checked={incluirDisciplinas} onChange={(e) => setIncluirDisciplinas(e.target.checked)} style={{ marginTop: 3 }} data-testid="incluir-disciplinas" />
              <span>
                Incluir na análise nova as disciplinas dos pontos conferidos ou inseridos que não foram marcadas no envio:{' '}
                {disciplinasFaltando.map(d => `${d.nome} (${d.pontos} ponto(s))`).join('; ')}. Sem elas, esses pontos ficariam fora do orçamento.
              </span>
            </label>
          )}
        </div>
      )}
      {mapa.arquivos.map(a => {
        const aberta = mostrarTodas[a.arquivo];
        const filtroDaLinha = (FILTROS.find(([k]) => k === (filtro[a.arquivo] || 'todas')) || FILTROS[0])[2];
        const filtradas = a.simbolos.filter(filtroDaLinha);
        const linhas = aberta ? filtradas : filtradas.slice(0, LIMITE_LINHAS);
        return (
          <div key={a.arquivo} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd', flex: 1 }}>{a.arquivo}
                <span style={{ fontWeight: 400, color: 'var(--texto-3)', marginLeft: 8 }}>
                  {a.resumo.conferidas} de {a.resumo.linhas} linha(s) conferida(s){a.resumo.naoReconhecidas ? ` · ${a.resumo.naoReconhecidas} não reconhecida(s)` : ''}
                </span>
              </div>
              <button type="button" style={botao} onClick={() => confirmarReconhecidas(a)} disabled={ocupado} title="Confirma como estão as linhas que o sistema reconheceu">
                <CheckCheck size={13} /> Confirmar as reconhecidas
              </button>
            </div>
            {!a.valeParaOrcamento && (
              <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 6 }}>
                Este desenho tem blocos nomeados: o orçamento conta pelos blocos. O mapa abaixo vale para o 3D e para o aprendizado.
              </div>
            )}
            {a.valeParaOrcamento && a.layersComBloco?.length > 0 && (
              <div style={{ fontSize: 12, color: '#c9a227', marginBottom: 6 }}>
                Desenho misto: nas layers com blocos nomeados ({a.layersComBloco.slice(0, 6).join(', ')}{a.layersComBloco.length > 6 ? '…' : ''}) o orçamento conta pelos blocos; nas outras, pelos símbolos conferidos aqui.
              </div>
            )}
            {a.planta && (
              <div style={{ marginBottom: 10 }}>
                <PlantaMapaCad planta={a.planta} simbolos={a.simbolos} nomeDoTipo={nomeDoTipo} ativa={ativa[a.arquivo] ?? null} foco={foco[a.arquivo]}
                  onEscolher={(idx) => escolherNaPlanta(a, idx)}
                  componentes={componentes} edicoes={a.edicoes} ocupado={ocupado} nomeDisciplina={nomeDisciplina}
                  onEditar={(pedido, mensagem) => editar(a.arquivo, pedido, mensagem)}
                  ficha={(s) => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {seletorTipo(a.arquivo, s, 240)}
                      {campoAltura(a.arquivo, s)}
                      {botaoAcao(a.arquivo, s)}
                      <button type="button" style={botao} onClick={() => irParaTabela(a.arquivo, s.idx)}>Ver na tabela</button>
                      <button type="button" style={botao} onClick={() => setAtiva(m => ({ ...m, [a.arquivo]: null }))} aria-label="Fechar a ficha">✕</button>
                    </div>
                  )} />
              </div>
            )}
            {((a.edicoes?.adicionados?.length || 0) + (a.edicoes?.removidos?.length || 0)) > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--texto-2)', margin: '-2px 0 10px', padding: '8px 10px', border: '1px solid #3a3320', borderRadius: 8, background: '#16140d' }} data-testid="edicoes-do-arquivo">
                <b style={{ color: COR_INSERIDO }}>Edições do engenheiro:</b>
                {inseridosPorTipo(a.edicoes, nomeDoTipo).map(t => (
                  <span key={t.simbolo} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconeComponente componente={porSimbolo.get(t.simbolo)} tamanho={16} cor={COR_INSERIDO} /> {t.quantidade} × {t.nome}
                  </span>
                ))}
                {a.edicoes?.removidos?.length > 0 && <span style={{ color: '#e5534b' }}>✕ {a.edicoes.removidos.length} ponto(s) retirado(s)</span>}
                <span style={{ color: a.edicoesNoOrcamento ? '#57ab5a' : '#c9a227' }}>{a.edicoesNoOrcamento ? '· já no orçamento' : '· entram no orçamento ao reprocessar'}</span>
                <button type="button" style={{ ...botao, marginLeft: 'auto' }} onClick={() => desfazerUltima(a)} disabled={ocupado} data-testid="desfazer-ultima-edicao">
                  <Undo2 size={12} /> Desfazer a última
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {FILTROS.map(([k, rotulo, f]) => {
                const n = a.simbolos.filter(f).length;
                const sel = (filtro[a.arquivo] || 'todas') === k;
                return (
                  <button key={k} type="button" onClick={() => setFiltro(m => ({ ...m, [a.arquivo]: k }))}
                    style={{ ...botao, padding: '3px 10px', ...(sel ? { borderColor: '#c9a227', color: '#c9a227', background: '#1f1c12' } : {}) }}>
                    {rotulo} ({n})
                  </button>
                );
              })}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--texto-3)' }}>
                    {['', 'Layer', 'Símbolo (cm)', 'Qtd', 'Tipo do ponto', 'Altura (m)', 'Origem', ''].map((h, i) => <th key={i} style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(s => {
                    const [rotuloOrigem, corOrigem] = ORIGEM[s.origem] || ORIGEM.regra;
                    const sit = SITUACAO[situacaoDaLinha(s)];
                    const temPontos = a.planta?.pontos.some(p => p[0] === s.idx);
                    return (
                      <tr key={s.idx} style={{ borderTop: '1px solid #1e1e1e', cursor: temPontos ? 'pointer' : 'default', ...(ativa[a.arquivo] === s.idx ? { background: '#1b1a12', boxShadow: 'inset 3px 0 0 #f0c63c' } : {}) }}
                        data-testid={`linha-mapa-${s.idx}`} data-mapa-linha={`${a.arquivo}|${s.idx}`}
                        title={temPontos ? 'Clique para ver os pontos desta linha na planta' : undefined}
                        // clique na linha (fora dos campos) enquadra os pontos dela na planta
                        onClick={(e) => { if (temPontos && !e.target.closest('select, input, button, option')) escolherNaTabela(a, s.idx); }}>
                        <td style={{ padding: '6px 4px 6px 8px' }}><span title={sit.rotulo} style={{ width: 9, height: 9, borderRadius: '50%', background: sit.cor, display: 'inline-block' }} /></td>
                        <td style={{ padding: '6px 8px', color: '#ddd', whiteSpace: 'nowrap' }}>{s.layer}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }}>{cm(s.medida)}</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--texto-2)' }} title={MOTIVO_FORA[s.foraDoOrcamento] || 'pontos que entram na contagem / símbolos desta forma no desenho'}>
                          {s.contados}{s.contados !== s.quantidade ? ` / ${s.quantidade}` : ''}
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 190 }}>{seletorTipo(a.arquivo, s)}</td>
                        <td style={{ padding: '6px 8px', width: 80 }}>
                          {campoAltura(a.arquivo, s)}
                          {!s.confirmado && ALTURA_DE[s.alturaDe] && <div style={{ fontSize: 10, color: '#8ab4f8', marginTop: 2, maxWidth: 130, lineHeight: 1.3 }} title={s.alturaTexto || ''}>{ALTURA_DE[s.alturaDe]}</div>}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: corOrigem }}>{rotuloOrigem}</span>
                          {s.origem === 'semelhante' && s.semelhanca && (
                            <div style={{ fontSize: 10, color: '#b48ead', marginTop: 2 }} data-testid={`semelhanca-${s.idx}`}
                              title={`parecido com a layer "${s.semelhanca.base?.layer}"${s.semelhanca.base?.usuario ? ' (conferida por um engenheiro)' : ' (lida da legenda)'} — confiança ${Math.round(s.semelhanca.confianca * 100)}%`}>
                              {s.semelhanca.faixa === 'provavel' ? 'provável' : 'possível'} · {Math.round(s.semelhanca.confianca * 100)}%
                            </div>
                          )}
                          {s.corrigido && <span style={{ color: 'var(--texto-3)' }} title={`o sistema tinha proposto: ${s.proposto?.simbolo}`}> · corrigido</span>}
                          {s.circuitos_lidos && (
                            <div style={{ fontSize: 10, color: '#8ab4f8', marginTop: 2, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.3 }}
                              title={`Texto escrito junto do símbolo: ${s.circuitos_lidos.com_circuito} de ${s.circuitos_lidos.pontos} ponto(s) com circuito lido${s.circuitos_lidos.conflitos ? `, ${s.circuitos_lidos.conflitos} com dois circuitos (ficam sem)` : ''}. ${s.confirmado ? 'Linha conferida: o circuito vai para o 3D.' : 'Sugestão: entra no 3D quando a linha for conferida.'}`}>
                              {textoCircuitos(s.circuitos_lidos)}{s.confirmado ? '' : ' — a conferir'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{botaoAcao(a.arquivo, s)}</td>
                      </tr>
                    );
                  })}
                  {!linhas.length && (
                    <tr><td colSpan={8} style={{ padding: '10px 8px', color: 'var(--texto-3)' }}>Nenhuma linha nesta situação.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filtradas.length > LIMITE_LINHAS && !aberta && (
              <button type="button" style={{ ...botao, marginTop: 8 }} onClick={() => setMostrarTodas(m => ({ ...m, [a.arquivo]: true }))}>Mostrar as {filtradas.length} linhas</button>
            )}
            {a.trechos?.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 8 }}>
                Traçados medidos: {a.trechos.map(t => `${t.layer} (${t.tipo}, ${String(t.comprimento_m).replace('.', ',')} m)`).join(' · ')}
              </div>
            )}
          </div>
        );
      })}
      {/* biblioteca de blocos (fase 3, CAD-08): as confirmações por medida real e escritório, para levar a outra instalação */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--texto-3)' }}>
        <span style={{ flex: 1, minWidth: 220 }}>Biblioteca de blocos: o que o sistema aprendeu das confirmações (pela medida real e pelo escritório do carimbo).</span>
        <button type="button" style={botao} onClick={exportarBiblioteca} disabled={ocupado} data-testid="exportar-biblioteca">
          <Download size={13} /> Exportar JSON
        </button>
        <label style={{ ...botao, cursor: ocupado ? 'default' : 'pointer' }} title="Só administrador. O que já foi conferido nesta instalação não é trocado">
          <Upload size={13} /> Importar JSON
          <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importarBiblioteca} disabled={ocupado} data-testid="importar-biblioteca" />
        </label>
      </div>
      {editor3d && (
        <Modelo3dEditor analiseId={analiseId} componentes={componentes} nomeDisciplina={nomeDisciplina}
          onEditado={aoEditarNo3d} onFechar={() => setEditor3d(false)} />
      )}
    </div>
  );
}
