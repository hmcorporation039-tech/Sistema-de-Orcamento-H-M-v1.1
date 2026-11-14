// Etiqueta (selo) arredondada de status: obra, proposta, rotina, canal, usuário...
// Revisão de 14/11/2026 — morava em pages/obras/comum.js e havia cópias com outros
// nomes (Selo, SeloNota, SeloConfianca, SeloDecisaoCliente) em várias telas.
// Cores: `info` = { cor, bg, borda } (formato das tabelas de status, ex.: STATUS_OBRA)
// ou as mesmas cores soltas em props; `vazada` = sem fundo, com a borda na cor do
// texto em transparência. `titulo` vira a dica (title); o resto (data-testid,
// aria-label...) vai para o <span>. `style` vai por cima: é por ele que cada tela
// mantém o tamanho, o espaçamento ou a borda tracejada que já tinha.
export function Etiqueta({ info, cor, bg, borda, vazada, titulo, style, children, ...resto }) {
  const corTexto = cor || info?.cor || '#999';
  const fundo = vazada ? 'transparent' : (bg || info?.bg || '#151515');
  const contorno = borda || info?.borda || (vazada ? `${corTexto}55` : '#2a2a2a');
  return (
    <span title={titulo} {...resto} style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
      background: fundo, color: corTexto, border: `1px solid ${contorno}`, ...style,
    }}>
      {children}
    </span>
  );
}

export default Etiqueta;
