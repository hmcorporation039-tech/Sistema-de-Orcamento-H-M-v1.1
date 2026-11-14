import { FileDown, Receipt, ExternalLink, DraftingCompass } from 'lucide-react';
import PainelPasta from '../../components/PainelPasta';
import Select from '../../components/Select';
import CampoCliente from '../../components/CampoCliente';
import Indicador from '../../components/ui/Indicador';
import Info from '../../components/ui/Info';
// Finalidade da análise (versão 2.1 — análise ≠ laudo): escolhida ao enviar e
// editável depois; nenhuma das duas cria laudo. Lista e rótulos em utils/finalidades.
import { FINALIDADES } from '../../utils/finalidades';
import { formatarMoeda } from '../../utils/format';
import { card, tituloSecao, btnPrimario, btnSecundario, rotuloCabecalho, formatarHora } from './estilos';

// Cartões da Análise de Projeto que só mostram dados ou chamam a página (divisão em 2.39).

// Cabeçalho: nome do projeto (pasta), cliente (da lista do cadastro), finalidade, obra,
// "Salvo às", a pasta da análise e os números do resumo.
export function CabecalhoAnalise({
  analise, clientes, clienteIdDaAnalise, elaboracao, salvando, salvoEm, tilesResumo,
  onNomeProjeto, onCliente, onFinalidade, carregarPasta, abrirPasta,
}) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={rotuloCabecalho}>Nome do projeto (pasta)</div>
          <input value={analise.nomeProjeto || ''} onChange={e => onNomeProjeto(e.target.value)} placeholder={analise.cliente || 'Nome do projeto'} aria-label="Nome do projeto (pasta)" style={{ fontSize: 15, fontWeight: 700, color: '#e8e8e8', background: 'transparent', border: 'none', padding: '2px 0' }} />
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <div style={rotuloCabecalho}>Cliente</div>
          <CampoCliente clientes={clientes} nome={analise.cliente || ''} clienteId={clienteIdDaAnalise} onChange={onCliente}
            placeholder="Nome do cliente" aria-label="Cliente" style={{ fontSize: 15, fontWeight: 700, color: '#c9a227', background: 'transparent', border: 'none', padding: '2px 0' }} />
        </div>
        <div style={{ flex: '0 1 230px' }} title="Muda a tela desta análise: Orçamento (itens e gerar orçamento) ou Elaboração de projeto (projeto por disciplina e entregas). Nenhuma gera laudo.">
          <div style={rotuloCabecalho}>Finalidade</div>
          <Select aria-label="Finalidade da análise" value={analise.finalidade || 'orcamento'} onChange={e => onFinalidade(e.target.value)}
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: elaboracao ? '#8ab4f8' : '#c9a227', padding: '6px 8px', fontSize: 13, fontWeight: 700 }}>
            {FINALIDADES.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
          </Select>
        </div>
        {analise.obra && (
          <div style={{ flex: '0 1 260px' }}>
            <div style={rotuloCabecalho}>Obra</div>
            <div style={{ fontSize: 13, color: '#ccc' }}>{analise.obra.nome} <span style={{ color: 'var(--texto-3)' }}>({analise.obra.codigo})</span></div>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>
          {salvando ? 'Salvando...' : salvoEm ? `Salvo às ${formatarHora(salvoEm)}` : ''}
        </div>
      </div>
      <PainelPasta carregar={carregarPasta} abrir={abrirPasta} atualizarQuando={salvoEm} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tilesResumo.length}, 1fr)`, gap: 16 }}>
        {tilesResumo.map(t => <Info key={t.label} variante="destaque" rotulo={t.label} valor={t.valor} />)}
      </div>
    </div>
  );
}

// Estimativa pelo que foi extraído (só na finalidade Orçamento) — só informação
export function CartaoEstimativa({ analise, resumoOrcamento, onAbrirNoEditor }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 style={{ ...tituloSecao, flex: 1, marginBottom: 0 }}>Estimativa pelo que foi extraído</h3>
        {analise.propostaId && (
          <button onClick={onAbrirNoEditor} style={{ ...btnSecundario, padding: '6px 12px' }}>
            <ExternalLink size={12} style={{ marginRight: 5 }} /> Orçamento {analise.propostaNumero} no editor
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Indicador variante="bloco" rotulo="Bloco 1 — Mão de obra" valor={formatarMoeda(resumoOrcamento.blocoMaoDeObra)} />
        <Indicador variante="bloco" rotulo="Bloco 2 — Materiais e equipamentos" valor={formatarMoeda(resumoOrcamento.blocoMateriais)} />
        <Indicador variante="bloco" rotulo="Total estimado" valor={formatarMoeda(resumoOrcamento.total)} destaque />
      </div>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginTop: 12, lineHeight: 1.5 }}>
        Só informação: soma dos itens não marcados "já pronto", com o valor sugerido pela análise (serviço sem
        referência ou material sem correspondência no catálogo entra como R$ 0,00). Quantidades, preços, pesquisa
        de mercado e referências são revisados no editor do orçamento — o valor que vale é o da proposta.
      </p>
    </div>
  );
}

// Funcionamento do projeto (preenchido pela análise do Claude Desktop, editável)
export function CartaoFuncionamento({ valor, onMudar }) {
  return (
    <div style={card}>
      <h3 style={tituloSecao}>Funcionamento do Projeto</h3>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 10, lineHeight: 1.6 }}>
        Como o projeto opera — preenchido pela análise do Claude Desktop (visão do PDF) e editável aqui. Cobre só as disciplinas selecionadas.
      </p>
      <textarea
        value={valor || ''}
        onChange={(e) => onMudar(e.target.value)}
        placeholder="Ex.: CFTV com N câmeras gravando em NVR de X canais; rede com switch PoE alimentando as câmeras; elétrica com quadro dedicado alimentando os racks..."
        aria-label="Funcionamento do projeto"
        rows={5}
        style={{ width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', fontSize: 13, padding: 10, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
    </div>
  );
}

// Compatibilização — pendências e observações (só quando há achados)
export function CartaoPendencias({ achados }) {
  if (!achados.length) return null;
  return (
    <div style={card}>
      <h3 style={tituloSecao}>Compatibilização — Pendências e Observações</h3>
      {achados.map((a, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid #1e1e1e' : 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c9a227', marginBottom: 3 }}>{a.tema}</div>
          <div style={{ fontSize: 13, color: 'var(--texto-2)' }}>{a.observacao}</div>
        </div>
      ))}
    </div>
  );
}

// Cartão "Elaborar projeto por disciplina" (foco na Elaboração de projeto) ou
// "Dimensionar pela norma (projeto)" (opção secundária no Orçamento)
export function CartaoProjetos({ principal, disciplinasComSkill, projetoDa, criandoProjeto, onElaborar }) {
  return (
    <div style={{ ...card, ...(principal ? { borderColor: '#2f4f6f' } : {}) }} data-testid="cartao-projetos">
      <h3 style={{ ...tituloSecao, color: principal ? '#8ab4f8' : '#c9a227', display: 'flex', alignItems: 'center', gap: 8 }}>
        <DraftingCompass size={16} /> {principal ? 'Elaborar projeto por disciplina' : 'Dimensionar pela norma (projeto) — opcional'}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 12, lineHeight: 1.6 }}>
        {principal
          ? <>Cada disciplina vira um <b>projeto</b> (aba "Projetos por disciplina") já preenchido com o que foi lido dos arquivos (PDF, DWG ou DXF): calcule pela norma, gere o memorial e os desenhos e escolha as <b>entregas</b> — definições técnicas, as-built, DXF (abre no AutoCAD), QElectroTech e PDF. <b>Não gera laudo</b>: laudo é pedido quando necessário, em Obras › Laudos.</>
          : <>Cria o <b>projeto</b> da disciplina (não é laudo) já preenchido com o que foi lido dos arquivos, para quantificar melhor pela norma e gerar o orçamento de execução lá. O que for estimado vem marcado para conferir.</>}
      </p>
      {disciplinasComSkill.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--texto-3)', fontStyle: 'italic', margin: 0 }}>Nenhuma disciplina desta análise tem cálculo pela norma ainda.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {disciplinasComSkill.map(d => {
            const existente = projetoDa(d.skill);
            return (
              <button key={d.skill} onClick={() => onElaborar(d)} disabled={!!criandoProjeto}
                style={{ ...btnSecundario, padding: '9px 14px', fontSize: 12, ...(existente ? { borderStyle: 'solid', borderColor: '#2f4f6f', color: '#8ab4f8' } : {}) }}
                title={existente ? `Abre o projeto #${existente.id} desta disciplina` : 'Cria o projeto da disciplina a partir desta análise'}>
                {criandoProjeto === d.skill ? 'Preparando...' : existente ? `Abrir projeto — ${d.nome}` : `${principal ? 'Elaborar projeto — ' : ''}${d.nome}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Barra final: situação do orçamento, "Abrir no editor", gerar/atualizar orçamento e o relatório PDF
export function BarraAcoesAnalise({
  analise, elaboracao, foraPorQuantidade, gerandoOrcamento, gerando, onAbrirNoEditor, onGerarOrcamento, onBaixarRelatorio,
}) {
  return (
    <div style={{ ...card, display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--texto-3)', marginRight: 'auto', lineHeight: 1.5 }}>
        {elaboracao
          ? <>Elaboração de projeto: o orçamento de execução sai do projeto de cada disciplina.{analise.propostaNumero && <> Esta análise já tem o orçamento <b style={{ color: '#c9a227' }}>{analise.propostaNumero}</b>.</>}</>
          : analise.propostaNumero
            ? <>Vinculada ao orçamento <b style={{ color: '#c9a227' }}>{analise.propostaNumero}</b>.</>
            : 'O orçamento é revisado no editor de propostas.'}
        {!elaboracao && foraPorQuantidade > 0 && <><br /><span style={{ color: '#a08a3a' }}>{foraPorQuantidade} item(ns) com quantidade 0 ficam fora do rascunho — o editor lista para incluir.</span></>}
      </span>
      {analise.propostaId && (
        <button onClick={onAbrirNoEditor} style={{ ...btnSecundario, padding: '13px 18px', fontSize: 13 }}>
          <ExternalLink size={14} style={{ marginRight: 6 }} /> Abrir no editor
        </button>
      )}
      {!elaboracao && (
        <button onClick={onGerarOrcamento} disabled={gerandoOrcamento} style={{ ...btnSecundario, padding: '13px 20px', fontSize: 13, borderStyle: 'solid', borderColor: '#c9a227', color: '#c9a227' }}
          title={analise.propostaNumero ? 'Substitui os itens da proposta pelos desta análise e abre o editor' : 'Cria a proposta rascunho com os itens desta análise e abre o editor'}>
          <Receipt size={14} style={{ marginRight: 6 }} />
          {gerandoOrcamento ? 'Gerando...' : analise.propostaNumero ? `Atualizar orçamento (${analise.propostaNumero}) e abrir` : 'Gerar orçamento e abrir no editor'}
        </button>
      )}
      <button onClick={onBaixarRelatorio} disabled={gerando} style={{ ...btnPrimario, padding: '13px 26px', fontSize: 13 }}>
        <FileDown size={14} style={{ marginRight: 6 }} /> {gerando ? 'Gerando...' : 'Baixar Relatório PDF'}
      </button>
    </div>
  );
}
