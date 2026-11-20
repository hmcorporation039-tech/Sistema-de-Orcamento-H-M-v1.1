import { ArrowLeft, ChevronDown, DraftingCompass, ExternalLink, FileDown, MoreHorizontal, Receipt, X } from 'lucide-react';
import Select from '../../components/Select';
import CampoCliente from '../../components/CampoCliente';
import MenuSuspenso from '../../components/ui/MenuSuspenso';
import { estilos } from '../../components/ui/estilos';
import ConflitosCompatibilizacao from '../../components/analise/ConflitosCompatibilizacao';
// Finalidade da análise (versão 2.1 — análise ≠ laudo): escolhida ao enviar e
// editável depois; nenhuma das duas cria laudo. Lista e rótulos em utils/finalidades.
import { FINALIDADES } from '../../utils/finalidades';
import { card, tituloSecao, rotuloCabecalho, formatarHora } from './estilos';

// Peças da tela única da análise (2.48). Antes (2.39–2.47) eram 13 cartões empilhados, em ordem diferente em cada
// finalidade, com 38 botões à vista; agora: cabeçalho compacto com o resumo numa linha e o "⋯ Mais", o campo de
// instruções, três abas (Projeto · Itens e valores · Pendências) e a barra de ações fixa no rodapé.

const campoInvisivel = { fontWeight: 700, background: 'transparent', border: 'none', padding: '2px 0', width: '100%' };

// Cabeçalho: voltar à lista, nome do projeto, cliente, finalidade, obra, "Salvo às", o "⋯ Mais" e o resumo numa linha.
// resumo: [{ texto, cor? }]; itensMais: itens do MenuSuspenso.
export function CabecalhoAnalise({
  analise, clientes, clienteIdDaAnalise, elaboracao, salvando, salvoEm, resumo, itensMais,
  onNomeProjeto, onCliente, onFinalidade, onVoltar,
}) {
  return (
    <div style={{ ...card, padding: '14px 18px' }} data-testid="cabecalho-analise">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <button type="button" onClick={onVoltar} title="Todas as análises" aria-label="Voltar para a lista de análises" data-testid="voltar-lista"
          style={{ ...estilos.btnIcone, alignSelf: 'center' }}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: '2 1 220px', minWidth: 0 }}>
          <div style={rotuloCabecalho}>Projeto</div>
          <input value={analise.nomeProjeto || ''} onChange={e => onNomeProjeto(e.target.value)} placeholder={analise.cliente || 'Nome do projeto'}
            aria-label="Nome do projeto (pasta)" style={{ ...campoInvisivel, fontSize: 16, color: '#e8e8e8' }} />
        </div>
        <div style={{ flex: '2 1 200px', minWidth: 0 }}>
          <div style={rotuloCabecalho}>Cliente</div>
          <CampoCliente clientes={clientes} nome={analise.cliente || ''} clienteId={clienteIdDaAnalise} onChange={onCliente}
            placeholder="Nome do cliente" aria-label="Cliente" style={{ ...campoInvisivel, fontSize: 14, color: '#c9a227' }} />
        </div>
        <div style={{ flex: '0 1 190px' }} title="Orçamento: itens e gerar orçamento. Elaboração de projeto: o projeto por disciplina. Nenhuma gera laudo.">
          <div style={rotuloCabecalho}>Finalidade</div>
          <Select aria-label="Finalidade da análise" value={analise.finalidade || 'orcamento'} onChange={e => onFinalidade(e.target.value)}
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: elaboracao ? '#8ab4f8' : '#c9a227', padding: '5px 8px', fontSize: 13, fontWeight: 700 }}>
            {FINALIDADES.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
          </Select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--texto-3)', alignSelf: 'center', minWidth: 70, textAlign: 'right' }}>
          {salvando ? 'Salvando…' : salvoEm ? `Salvo às ${formatarHora(salvoEm)}` : ''}
        </div>
        <span style={{ alignSelf: 'center' }}>
          <MenuSuspenso testid="menu-mais" titulo="Mais opções da análise" itens={itensMais}
            rotulo={<><MoreHorizontal size={15} /> Mais</>} estiloBotao={{ ...estilos.btnSecundario, padding: '6px 12px' }} />
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6 }} data-testid="resumo-analise">
        {analise.obra && <span>Obra <b style={{ color: 'var(--texto)' }}>{analise.obra.codigo || analise.obra.nome}</b>{' · '}</span>}
        {resumo.map((r, i) => (
          <span key={i}>{i > 0 && ' · '}<span style={r.cor ? { color: r.cor, fontWeight: 700 } : undefined}>{r.texto}</span></span>
        ))}
      </div>
    </div>
  );
}

// Painel aberto pelo "⋯ Mais" (pasta, objetivo, funcionamento, biblioteca de blocos): um de cada vez, logo abaixo do cabeçalho
export function PainelMais({ titulo, onFechar, children }) {
  return (
    <div style={{ ...card, position: 'relative' }} data-testid="painel-mais">
      {/* sem título (o conteúdo já traz o seu): só o fechar, no canto */}
      {titulo ? (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>{titulo}</h3>
          <button type="button" onClick={onFechar} aria-label="Fechar" style={estilos.btnIcone}><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={onFechar} aria-label="Fechar" style={{ ...estilos.btnIcone, position: 'absolute', top: 14, right: 14 }}><X size={14} /></button>
      )}
      {children}
    </div>
  );
}

// Funcionamento do projeto (preenchido pela análise do Claude Desktop, editável) — no "⋯ Mais" desde a 2.48
export function CampoFuncionamento({ valor, onMudar }) {
  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 10, lineHeight: 1.6 }}>
        Como o projeto opera — preenchido pela análise do Claude Desktop (visão do PDF) e editável aqui. Cobre só as disciplinas selecionadas.
      </p>
      <textarea value={valor || ''} onChange={(e) => onMudar(e.target.value)} aria-label="Funcionamento do projeto" rows={5}
        placeholder="Ex.: CFTV com N câmeras gravando em NVR de X canais; rede com switch PoE alimentando as câmeras…"
        style={{ width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', fontSize: 13, padding: 10, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
    </>
  );
}

// Abas da análise: [{ chave, rotulo, n? }]
export function AbasAnalise({ abas, ativa, onTrocar }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--borda)', marginBottom: 16, flexWrap: 'wrap' }}>
      {abas.map(a => {
        const sel = a.chave === ativa;
        return (
          <button key={a.chave} type="button" role="tab" aria-selected={sel} onClick={() => onTrocar(a.chave)} data-testid={`guia-${a.chave}`}
            style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${sel ? '#c9a227' : 'transparent'}`, marginBottom: -1,
              color: sel ? '#c9a227' : 'var(--texto-2)', padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {a.rotulo}
            {a.n != null && (
              <span style={{ marginLeft: 6, fontSize: 11.5, padding: '1px 7px', borderRadius: 10, background: a.alerta && a.n ? '#3a2f12' : 'var(--superficie-2)', color: a.alerta && a.n ? '#e0a030' : 'var(--texto-3)' }}>{a.n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Aba "Pendências": o que pede atenção antes de orçar ou entregar — itens sem quantidade, achados da leitura e conflitos
export function Pendencias({ analise, foraPorQuantidade, onVerSemQuantidade }) {
  const achados = analise.achados || [];
  const temConflitos = !!analise.compatibilizacao || (analise.conflitos || []).length > 0;
  if (!achados.length && !foraPorQuantidade && !temConflitos) {
    return <p style={{ fontSize: 13, color: 'var(--texto-3)' }} data-testid="sem-pendencias">Nenhuma pendência nesta análise.</p>;
  }
  return (
    <div data-testid="aba-pendencias">
      {foraPorQuantidade > 0 && (
        <div style={{ padding: '10px 12px', border: '1px solid #3a3320', borderRadius: 8, background: '#16140d', fontSize: 13, color: 'var(--texto-2)', marginBottom: 12 }}>
          <b style={{ color: '#c9a227' }}>{foraPorQuantidade} item(ns) com quantidade 0</b> ficam fora do rascunho do orçamento.{' '}
          <button type="button" onClick={onVerSemQuantidade} style={{ ...estilos.botaoTexto, color: '#c9a227', fontWeight: 700 }}>Ver os itens →</button>
        </div>
      )}
      {achados.map((a, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none' }} data-testid="achado">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 3 }}>{a.tema}</div>
          <div style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.5 }}>{a.observacao}</div>
        </div>
      ))}
      {temConflitos && (
        <div style={{ marginTop: achados.length ? 16 : 0 }}>
          <ConflitosCompatibilizacao analise={analise} estiloCartao={{}} estiloTitulo={tituloSecao} />
        </div>
      )}
    </div>
  );
}

// Barra de ações fixa no rodapé: o que se faz com a análise. Orçamento → gerar/atualizar orçamento; Elaboração →
// elaborar o projeto de cada disciplina. O relatório PDF nas duas; "Projeto pela norma" é secundário no Orçamento.
// O espaço à direita (168 px) é do botão flutuante do Assistente, que cobria o botão principal.
export function BarraAcoesAnalise({
  analise, elaboracao, foraPorQuantidade, gerandoOrcamento, gerando, onAbrirNoEditor, onGerarOrcamento, onBaixarRelatorio,
  disciplinasComSkill, projetoDa, criandoProjeto, onElaborar,
}) {
  // em ordem alfabética (regra das listas do sistema)
  const itensProjeto = [...disciplinasComSkill].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')).map(d => {
    const existente = projetoDa(d.skill);
    return {
      chave: d.skill, testid: `projeto-${d.skill}`, icone: <DraftingCompass size={13} />,
      rotulo: existente ? `Abrir projeto — ${d.nome}` : d.nome,
      detalhe: existente ? `Projeto #${existente.id} já criado` : 'Cria o projeto da disciplina com o que foi lido (não é laudo)',
      onClick: () => onElaborar(d),
    };
  });
  const botaoProjeto = (principal) => (
    <MenuSuspenso testid="menu-projeto" abrirAcima alinhar="direita" itens={itensProjeto} desabilitado={!!criandoProjeto}
      titulo={elaboracao ? 'Cada disciplina vira um projeto (aba Projetos por disciplina): memorial, desenhos e entregas' : 'Dimensionar pela norma: cria o projeto da disciplina (opcional)'}
      estiloBotao={principal ? { ...estilos.btnPrimario, background: '#8ab4f8' } : estilos.btnSecundario}
      rotulo={<><DraftingCompass size={14} /> {criandoProjeto ? 'Preparando…' : principal ? 'Elaborar projeto' : 'Projeto pela norma'} <ChevronDown size={13} /></>} />
  );
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end',
      padding: '12px 168px 12px 16px', margin: '16px -4px 0', background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12,
      boxShadow: '0 -6px 18px rgba(0,0,0,.35)',
    }} data-testid="barra-acoes">
      <span style={{ fontSize: 12, color: 'var(--texto-3)', marginRight: 'auto', lineHeight: 1.5, flex: '1 1 180px' }}>
        {analise.propostaNumero && <>Orçamento <b style={{ color: '#c9a227' }}>{analise.propostaNumero}</b> vinculado. </>}
        {!analise.propostaNumero && elaboracao && 'O orçamento sai do projeto de cada disciplina.'}
        {!elaboracao && foraPorQuantidade > 0 && <span style={{ color: '#a08a3a' }}>{foraPorQuantidade} item(ns) sem quantidade ficam fora.</span>}
      </span>
      {analise.propostaId && (
        <button type="button" onClick={onAbrirNoEditor} style={estilos.btnSecundario} data-testid="abrir-editor"><ExternalLink size={14} /> Abrir no editor</button>
      )}
      <button type="button" onClick={onBaixarRelatorio} disabled={gerando} style={estilos.btnSecundario} data-testid="baixar-relatorio">
        <FileDown size={14} /> {gerando ? 'Gerando…' : 'Relatório PDF'}
      </button>
      {itensProjeto.length > 0 && botaoProjeto(elaboracao)}
      {!elaboracao && (
        <button type="button" onClick={onGerarOrcamento} disabled={gerandoOrcamento} style={estilos.btnPrimario} data-testid="gerar-orcamento"
          title={analise.propostaNumero ? 'Substitui os itens da proposta pelos desta análise e abre o editor' : 'Cria a proposta rascunho com os itens desta análise e abre o editor'}>
          <Receipt size={14} /> {gerandoOrcamento ? 'Gerando…' : analise.propostaNumero ? `Atualizar orçamento ${analise.propostaNumero}` : 'Gerar orçamento'}
        </button>
      )}
    </div>
  );
}
