import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { BASES_DO_EDITOR } from './apoio';
import { btnPrimario, btnSecundario, card } from './estilos';

// Faixas de aviso do topo do editor de orçamento (saíram de pages/Orcamento.js em 2.39, sem
// mudar o texto nem o visual): bases que não carregaram, rascunho a restaurar, somente leitura,
// conflito de versão, itens "a cotar", padrões não definidos e a composição do BDI.

// Cabeçalho: "Novo Orçamento" / "Editando Proposta P012" e o próximo número
export function CabecalhoEditor({ editandoId, somenteLeitura, numeroEditando, criadaPeloAssistente, proximoNumero }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1 }}>
        {editandoId ? `${somenteLeitura ? 'Proposta' : 'Editando Proposta'} ${numeroEditando}` : 'Novo Orçamento'}
        {editandoId && criadaPeloAssistente && (
          <span title="Rascunho montado pelo assistente virtual — revise antes de enviar ao cliente"
            style={{ marginLeft: 10, fontSize: 11.5, fontWeight: 700, color: '#c9a227', border: '1px solid #4a3d10', background: '#17140a', borderRadius: 10, padding: '2px 8px', verticalAlign: 'middle' }}>
            criada pelo assistente
          </span>
        )}
      </h2>
      {!editandoId && proximoNumero != null && (
        <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
          Próxima proposta: <b style={{ color: '#c9a227' }}>P{String(proximoNumero).padStart(3, '0')}</b>
        </span>
      )}
    </div>
  );
}

export function AvisoBases({ basesComFalha, onTentarDeNovo }) {
  if (!basesComFalha.length) return null;
  return (
    <div data-testid="aviso-bases" role="alert" style={{ ...card, padding: '12px 16px', borderColor: '#6a2a2a', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
        Não foi possível carregar <b style={{ color: '#e0a050' }}>{basesComFalha.map(b => BASES_DO_EDITOR[b].nome).join(', ')}</b>.
        As listas podem estar vazias ou incompletas: um material que não aparece no "+ catálogo" pode só não ter carregado.
      </div>
      <button type="button" onClick={() => onTentarDeNovo(basesComFalha)} style={{ ...btnSecundario, padding: '8px 14px' }}>Tentar de novo</button>
    </div>
  );
}

// `versaoAtual` = versão da proposta aberta (para avisar que o rascunho é anterior a ela)
export function AvisoRascunho({ rascunho, editandoId, versaoAtual, onRestaurar, onDescartar }) {
  return (
    <div data-testid="aviso-rascunho" style={{ ...card, padding: '12px 16px', borderColor: '#5a4a12', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
        Há um <b style={{ color: '#c9a227' }}>rascunho não salvo</b> desta {editandoId ? 'proposta' : 'proposta nova'} neste navegador
        {rascunho.salvoEm ? `, de ${new Date(rascunho.salvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
        {rascunho.form?.cliente_nome ? ` (cliente: ${rascunho.form.cliente_nome})` : ''}
        {` — ${rascunho.itens.length} item(ns)`}.
        {editandoId && rascunho.versao != null && versaoAtual != null && rascunho.versao !== versaoAtual && (
          <span style={{ color: '#e0a050' }}> A proposta foi alterada no servidor depois desse rascunho: ao salvar, o sistema vai avisar do conflito.</span>
        )}
      </div>
      <button type="button" onClick={onRestaurar} style={{ ...btnPrimario, padding: '8px 14px' }}>Restaurar rascunho</button>
      <button type="button" onClick={() => { if (window.confirm('Descartar o rascunho? Ele não poderá ser recuperado.')) onDescartar(); }} style={btnSecundario}>Descartar</button>
    </div>
  );
}

export function FaixaSomenteLeitura({ somenteLeitura, sujo, salvando, onSalvarComoCopia }) {
  return (
    <div data-testid="faixa-somente-leitura" style={{ ...card, padding: '12px 16px', borderColor: '#2f4f6f', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
        <b style={{ color: '#8ab4f8' }}>Somente leitura</b> — {somenteLeitura.mensagem}
        <span style={{ color: 'var(--texto-3)' }}>{sujo ? ' As alterações feitas aqui continuam na tela: salve-as numa cópia sua.' : ' Para trabalhar nela, faça uma cópia sua.'}</span>
      </div>
      <button type="button" onClick={onSalvarComoCopia} disabled={salvando} style={{ ...btnPrimario, padding: '8px 14px' }}>
        {salvando ? 'Salvando…' : sujo ? 'Salvar como cópia minha' : 'Duplicar para mim'}
      </button>
    </div>
  );
}

export function AvisoConflito({ conflito, salvando, onRecarregar, onSalvarComoCopia }) {
  return (
    <div data-testid="aviso-conflito" style={{ ...card, padding: '12px 16px', borderColor: '#6a2a2a', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: '#ddd', lineHeight: 1.5 }}>
        <b style={{ color: '#e08080' }}>Não foi salvo:</b> {conflito.mensagem}
        <span style={{ color: 'var(--texto-3)' }}> Nada foi sobrescrito. As suas alterações continuam na tela (e no rascunho deste navegador).</span>
      </div>
      <button type="button" onClick={onRecarregar} disabled={salvando} style={btnSecundario}
        title="Descarta as alterações desta tela e abre a versão que está gravada agora">Recarregar do servidor</button>
      <button type="button" onClick={onSalvarComoCopia} disabled={salvando} style={{ ...btnPrimario, padding: '8px 14px' }}
        title="Grava o que está na tela como uma proposta nova (outro número); a original fica como a outra pessoa deixou">
        {salvando ? 'Salvando…' : 'Salvar como cópia'}
      </button>
    </div>
  );
}

// Itens "a cotar" ou sem preço — revisar antes de enviar ao cliente
export function AvisoItensACotar({ itens }) {
  const aCotar = itens.filter(it => it.status === 'a_cotar').length;
  const semPreco = itens.filter(it => !(Number(it.valor_unitario) > 0)).length;
  if (!aCotar && !semPreco) return null;
  return (
    <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
      {[aCotar && `${aCotar} item(ns) "a cotar"`, semPreco && `${semPreco} item(ns) sem preço (R$ 0,00)`].filter(Boolean).join(' · ')}
      <span style={{ color: 'var(--texto-3)' }}> — revise antes de enviar ao cliente: use "Pesquisar mercado", as referências ("usar") ou o catálogo em cada linha.</span>
    </div>
  );
}

// Proposta nova com BDI/impostos padrão ainda não definidos pelo administrador
export function AvisoPadroesNaoDefinidos({ ehAdmin }) {
  return (
    <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
      ⚠ O BDI e os impostos padrão ainda não foram definidos{ehAdmin ? <> (<Link to="/cadastros?aba=integracoes" style={{ color: '#c9a227', textDecoration: 'underline' }}>Integrações → Padrões de orçamento</Link>)</> : ' — peça ao administrador (Integrações)'}.
      Os campos abaixo vieram com 0 %: confira BDI, imposto sobre venda e imposto sobre serviço antes de salvar.
    </div>
  );
}

// BDI (Fase 3F): órgão público sem composição do BDI e avisos da composição
export function AvisoBdi({ ehPublico, memoriaBdi, avisosBdi, segmento, segmentoObra, onCalcular }) {
  if (!((ehPublico && !memoriaBdi) || avisosBdi.length > 0)) return null;
  return (
    <div style={{ ...card, padding: '10px 16px', borderColor: '#4a3a12', fontSize: 12, color: '#c9a227' }}>
      {ehPublico && !memoriaBdi && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 260 }}>
            Cliente órgão público{segmentoObra === 'publico' && segmento !== 'publico' ? ' (pela obra)' : ''}: a proposta não tem a <b>composição do BDI</b>
            <span style={{ color: 'var(--texto-3)' }}> (memória do cálculo pela fórmula do TCU, Acórdão 2.622/2013), que costuma ser exigida pelo órgão.</span>
          </span>
          <button type="button" onClick={onCalcular} style={{ ...btnSecundario, borderStyle: 'solid', borderColor: '#5a4a12', color: '#c9a227' }}>
            <Calculator size={13} style={{ marginRight: 4 }} /> Calcular BDI (TCU)
          </button>
        </div>
      )}
      {avisosBdi.map(a => <div key={a} style={{ marginTop: ehPublico && !memoriaBdi ? 6 : 0 }}>⚠ {a}</div>)}
    </div>
  );
}
