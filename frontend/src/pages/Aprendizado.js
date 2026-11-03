import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Brain, Play, Square, RefreshCw, Target, ListChecks, FolderSearch, Cpu } from 'lucide-react';
import { getAprendizado, getTreinoAcervo, iniciarTreinoAcervo, pararTreinoAcervo } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { estilos } from '../components/ui/estilos';
import { dataHoraBr } from '../utils/format';
import { mensagemDeErro } from '../utils/download';

// "O que o sistema sabe" (plano "sistema autônomo", 03/11/2026): o conhecimento que o sistema acumulou sem IA (vínculos
// de material, símbolos e blocos por escritório, alturas), o treino com as obras da pasta dos clientes, quanto do
// trabalho já sai sem IA, o ACERTO da leitura automática medido no que o engenheiro conferiu no mapa do CAD e a fila do
// que falta conferir (mais pontos primeiro). O treino é por disciplina: arquivos lidos e materiais novos do acervo
// aparecem separados por disciplina. Backend: controllers/aprendizadoController.js.

const ORIGEM = { legenda: 'da legenda', aprendido: 'aprendido', semelhante: 'parecido', regra: 'regra da layer', nao_reconhecido: 'não reconhecido' };
const corDaTaxa = (t) => (t == null ? 'var(--texto-3)' : t >= 90 ? '#3fb95f' : t >= 70 ? '#d9a53a' : '#e08080');
const n = (v) => Number(v || 0).toLocaleString('pt-BR');

function Numero({ valor, rotulo, detalhe, cor }) {
  return (
    <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px 14px', minWidth: 150, flex: '1 1 150px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor || 'var(--texto)' }}>{valor}</div>
      <div style={{ fontSize: 12, color: 'var(--texto-2)', marginTop: 2 }}>{rotulo}</div>
      {detalhe && <div style={{ fontSize: 11, color: 'var(--texto-3)', marginTop: 4, lineHeight: 1.4 }}>{detalhe}</div>}
    </div>
  );
}

function Titulo({ Icone, children }) {
  return <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', fontSize: 15, color: 'var(--texto)' }}><Icone size={17} color="var(--ouro)" />{children}</h3>;
}

function Barra({ taxa }) {
  return (
    <div style={{ height: 6, background: 'var(--superficie-2)', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
      <div style={{ width: `${taxa || 0}%`, height: '100%', background: corDaTaxa(taxa) }} />
    </div>
  );
}

export default function Aprendizado() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState(null);
  const [treino, setTreino] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setDados((await getAprendizado()).data); setTreino(null); } catch (e) { toast.error(await mensagemDeErro(e, 'Não consegui carregar o aprendizado')); }
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // treino em andamento: acompanha a cada 5 s; ao terminar, recarrega os números
  const rodando = (treino || dados?.acervo?.rodada)?.rodando;
  useEffect(() => {
    if (!rodando) return undefined;
    const t = setInterval(async () => {
      try {
        const s = (await getTreinoAcervo()).data;
        setTreino(s);
        if (!s.rodando) carregar();
      } catch { /* a próxima volta tenta de novo */ }
    }, 5000);
    return () => clearInterval(t);
  }, [rodando, carregar]);

  const iniciar = async () => {
    try { setTreino((await iniciarTreinoAcervo()).data); toast.success('Treino iniciado: o sistema está lendo as obras da pasta dos clientes'); } catch (e) { toast.error(await mensagemDeErro(e, 'Não consegui iniciar o treino')); }
  };
  const parar = async () => {
    try { setTreino((await pararTreinoAcervo()).data); toast('O treino para depois do arquivo atual'); } catch (e) { toast.error(await mensagemDeErro(e, 'Não consegui parar o treino')); }
  };

  if (!dados) return <div style={estilos.card}>{carregando ? 'Carregando…' : 'Sem dados do aprendizado.'}</div>;
  const { materiais, simbolos, blocos, notas, acervo, autonomia, precisao, fila } = dados;
  const rodada = treino || acervo.rodada || {};

  return (
    <div data-testid="pagina-aprendizado">
      <div style={{ ...estilos.card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Brain size={22} color="var(--ouro)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ ...estilos.ajuda, margin: 0 }}>
            O sistema aprende sem IA: com cada análise de projeto, com o que você confere no <b>mapa do CAD</b>, com cada orçamento confirmado e com as
            obras já feitas na pasta dos clientes. Tudo o que ele aprende é <b>sugestão</b> — o que entra no orçamento continua sendo o que o engenheiro confere.
          </p>
        </div>
        <button style={estilos.btnSecundario} onClick={carregar} disabled={carregando}><RefreshCw size={14} /> Atualizar</button>
      </div>

      <div style={estilos.card}>
        <Titulo Icone={Target}>Acerto da leitura automática</Titulo>
        {precisao.conferidas ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <Numero valor={`${precisao.taxa}%`} cor={corDaTaxa(precisao.taxa)} rotulo="das linhas conferidas o sistema já tinha acertado" detalhe={`${n(precisao.certas)} de ${n(precisao.conferidas)} linha(s) do mapa do CAD`} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[['Por origem da sugestão', precisao.porOrigem], ['Por disciplina', precisao.porDisciplina]].map(([titulo, lista]) => (
                <div key={titulo}>
                  <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 6 }}>{titulo}</div>
                  {lista.map(x => (
                    <div key={x.origem || x.chave} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 12.5 }}>
                      <span>{x.nome}</span><Barra taxa={x.taxa} />
                      <span style={{ color: corDaTaxa(x.taxa), textAlign: 'right' }}>{x.taxa == null ? '—' : `${x.taxa}%`} <span style={{ color: 'var(--texto-3)' }}>({x.conferidas})</span></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : <p style={estilos.ajuda}>Ainda não há linhas conferidas no mapa do CAD. Cada linha que você confere mostra aqui se o sistema tinha acertado — e ensina para os próximos projetos.</p>}
      </div>

      <div style={estilos.card}>
        <Titulo Icone={ListChecks}>O que falta conferir (mais pontos primeiro)</Titulo>
        {fila.length ? (
          <div style={estilos.caixaTabela}>
            <table style={estilos.tabela}>
              <thead><tr>{['Análise', 'Arquivo', 'Layer', 'Tipo sugerido', 'Pontos', 'Origem'].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr></thead>
              <tbody>
                {fila.map((f, i) => (
                  <tr key={i} style={estilos.linhaTabela}>
                    <td style={estilos.td}><Link style={estilos.link} to={`/obras/analise/${f.analise_id}`}>{f.nome}</Link></td>
                    <td style={{ ...estilos.td, color: 'var(--texto-2)' }}>{f.arquivo}</td>
                    <td style={{ ...estilos.td, color: 'var(--texto-2)' }}>{f.layer}</td>
                    <td style={estilos.td}>{f.tipo}</td>
                    <td style={{ ...estilos.td, fontWeight: 700 }}>{n(f.quantidade)}</td>
                    <td style={{ ...estilos.td, color: 'var(--texto-2)' }}>{ORIGEM[f.origem] || f.origem}{f.confianca != null ? ` · ${Math.round(f.confianca * 100)}%` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={estilos.ajuda}>Nada pendente: todas as linhas com tipo sugerido já foram conferidas.</p>}
      </div>

      <div style={estilos.card}>
        <Titulo Icone={FolderSearch}>Treino com as obras já feitas</Titulo>
        <p style={estilos.ajuda}>
          O sistema lê a pasta dos clientes (só leitura, sem IA), <b>sempre por disciplina</b> — a do nome e das pastas de cada arquivo. Dos DWG/DXF aprende as
          legendas, as alturas e os nomes de bloco de cada escritório; das planilhas e dos orçamentos em PDF, só os <b>materiais que o catálogo ainda não tem</b>
          (o que já existe não muda). Arquitetura, hidráulica e estrutura ficam de fora. Roda sozinho às 06:00 e às 18:00 (até 2 h por vez) e só relê o
          arquivo que mudou; cópia idêntica em outra pasta não conta duas vezes.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Numero valor={n(acervo.lidos)} rotulo="arquivo(s) já lido(s)" detalhe={acervo.ultimo ? `último em ${dataHoraBr(acervo.ultimo)}` : 'nenhuma rodada ainda'} />
          <Numero valor={n(materiais.do_acervo)} rotulo="material(is) novo(s) no catálogo vindos do acervo" detalhe="das planilhas e orçamentos das obras, com o preço como referência" />
          <Numero valor={n(acervo.escritorios)} rotulo="escritório(s) de projeto identificados" />
          <Numero valor={n(acervo.ignorados)} rotulo="arquivo(s) de outra disciplina (não lidos)" detalhe="arquitetura, hidráulica, estrutura" />
          <Numero valor={n(acervo.erros)} rotulo="arquivo(s) que não deu para ler" cor={acervo.erros ? '#d9a53a' : undefined} />
        </div>
        {(acervo.porDisciplina?.length > 0 || acervo.materiais?.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 12 }} data-testid="treino-por-disciplina">
            {acervo.porDisciplina?.length > 0 && (
              <div style={estilos.caixaTabela}>
                <table style={estilos.tabela}>
                  <thead><tr>{['Disciplina', 'Desenhos', 'Planilhas / PDFs', 'Legenda aprendida'].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {acervo.porDisciplina.map(d => (
                      <tr key={d.chave || '-'} style={estilos.linhaTabela}>
                        <td style={estilos.td}>{d.nome}</td>
                        <td style={estilos.td}>{n(d.desenhos)}</td>
                        <td style={estilos.td}>{n(d.documentos)}</td>
                        <td style={{ ...estilos.td, color: 'var(--ouro)', fontWeight: 700 }}>{n(d.legenda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {acervo.materiais?.length > 0 && (
              <div style={estilos.caixaTabela}>
                <table style={estilos.tabela}>
                  <thead><tr>{['Disciplina', 'Materiais novos no catálogo', 'Conhecidos sem preço'].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {acervo.materiais.map(d => (
                      <tr key={d.chave} style={estilos.linhaTabela}>
                        <td style={estilos.td}>{d.nome}</td>
                        <td style={{ ...estilos.td, color: 'var(--ouro)', fontWeight: 700 }}>{n(d.no_catalogo)}</td>
                        <td style={{ ...estilos.td, color: 'var(--texto-2)' }}>{n(d.sem_preco)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {rodada.rodando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }} data-testid="treino-andamento">
            <span style={{ color: '#6fa8dc', fontSize: 13 }}>
              Lendo {n(rodada.feitos)} de {n(rodada.pendentes)} pendente(s){rodada.atual ? ` — ${rodada.atual}` : ''}{rodada.mensagem ? ` (${rodada.mensagem})` : ''}
            </span>
            {ehAdmin && <button style={estilos.btnSecundario} onClick={parar}><Square size={14} /> Parar</button>}
          </div>
        ) : ehAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button style={estilos.btnPrimario} onClick={iniciar} data-testid="iniciar-treino"><Play size={14} /> Treinar agora</button>
            {rodada.terminadoEm && <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
              Última rodada: {n(rodada.lidos)} lido(s), {n(rodada.ignorados)} de outra disciplina, {n(rodada.erros)} com erro — aprendeu {n(rodada.ensinou?.simbolos)} símbolo(s), {n(rodada.ensinou?.blocos)} bloco(s), {n(rodada.ensinou?.notas)} altura(s), {n(rodada.ensinou?.materiais)} material(is) novo(s). {rodada.mensagem || ''}
            </span>}
          </div>
        )}
      </div>

      <div style={estilos.card}>
        <Titulo Icone={Brain}>O que o sistema já sabe</Titulo>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Numero valor={n((simbolos.conferidos || 0) + (simbolos.da_legenda || 0))} rotulo="formas de símbolo (DWG explodido)"
            detalhe={`${n(simbolos.conferidos)} conferida(s) por um engenheiro, ${n(simbolos.da_legenda)} lida(s) de legendas${simbolos.em_conflito ? `; ${n(simbolos.em_conflito)} em conflito (fora de uso até alguém conferir)` : ''}`} />
          <Numero valor={n(blocos.em_uso)} rotulo="nomes de bloco aprendidos da legenda" detalhe={`${n(blocos.escritorios)} escritório(s)${blocos.em_conflito ? `; ${n(blocos.em_conflito)} em conflito` : ''}`} />
          <Numero valor={n(notas.em_uso)} rotulo="alturas de instalação por escritório" detalhe={`${n(notas.lidas)} nota(s) lida(s), ${n(notas.escritorios)} escritório(s)`} />
          <Numero valor={n(materiais.vinculos)} rotulo="descrições ligadas a um material" detalhe={`de ${n(materiais.catalogo)} materiais no catálogo — vêm dos orçamentos confirmados`} />
        </div>
        {dados.porDisciplina?.length > 0 && (
          <div style={{ marginTop: 14 }} data-testid="sabe-por-disciplina">
            <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 6 }}>Símbolos e blocos que reconhece, por disciplina</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {dados.porDisciplina.map(d => (
                <span key={d.chave} style={{ padding: '4px 10px', borderRadius: 14, background: 'var(--superficie-2)', border: '1px solid var(--borda)', fontSize: 12 }}>
                  {d.nome} <b style={{ color: 'var(--ouro)' }}>{n(d.n)}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={estilos.card}>
        <Titulo Icone={Cpu}>Quanto já sai sem IA (últimos {autonomia.dias} dias)</Titulo>
        {autonomia.funcoes.length ? autonomia.funcoes.map(f => (
          <div key={f.nome} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px', gap: 10, alignItems: 'center', padding: '5px 0', fontSize: 12.5 }}>
            <span>{f.nome}</span><Barra taxa={f.taxa} />
            <span style={{ color: 'var(--texto-2)' }}>{f.taxa == null ? '—' : `${f.taxa}% sem IA`} <span style={{ color: 'var(--texto-3)' }}>({n(f.acertos)} / {n(f.acertos + f.chamadas)})</span></span>
          </div>
        )) : <p style={estilos.ajuda}>Nenhuma consulta registrada no período.</p>}
      </div>
    </div>
  );
}
