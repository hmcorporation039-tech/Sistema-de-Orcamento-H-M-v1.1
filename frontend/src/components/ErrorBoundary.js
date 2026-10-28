import { Component } from 'react';

// Rede de segurança da interface.
//
// Sem isto, qualquer exceção durante a renderização desmontava a árvore
// INTEIRA do React: a tela ficava em branco, sem menu e sem botão de sair, e a
// única saída era F5. Casos reais encontrados na auditoria: o Dashboard lendo
// `resumo.propostas` quando a API falha (o guard só cobria o caso "carregando"),
// `STATUS_CORES[status].cor` com um status novo, e a Análise de Projeto lendo
// `analise.ambientes.length` de um registro antigo sem esse campo.
//
// Agora o erro fica contido: o resto da aplicação continua utilizável e a
// pessoa vê o que aconteceu e como sair dali.
//
// Fora do escritório (app de campo, página pública de aprovação) não há menu:
// `fora` troca o texto. Falha ao baixar um pedaço do código (o sistema foi
// atualizado e o arquivo antigo não existe mais — comum no app de campo aberto
// há dias) vira "Atualizar agora" (recarregar), que é o que resolve.
export function ehFalhaDeCarregamento(erro) {
  const texto = `${erro?.name || ''} ${erro?.message || erro || ''}`;
  return /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(texto);
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro na interface:', erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    const carregamento = ehFalhaDeCarregamento(this.state.erro);
    const fora = !!this.props.fora;

    return (
      <div data-testid="erro-tela" style={{
        background: '#131313', border: '1px solid #3a1212', borderRadius: 10,
        padding: 28, margin: '24px auto', maxWidth: 720, color: '#e8e0cc',
      }}>
        <h2 style={{ fontSize: 17, color: '#c9a227', fontWeight: 700, marginBottom: 10 }}>
          {carregamento ? 'O sistema foi atualizado' : 'Esta tela encontrou um erro'}
        </h2>
        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, marginBottom: 16 }}>
          {carregamento
            ? 'Não foi possível abrir esta parte do sistema (versão nova no servidor ou rede instável). Toque em "Atualizar agora". O que estava guardado no aparelho não se perde.'
            : fora
              ? 'Toque em "Recarregar a página". Se o erro se repetir, avise a H&M com o horário e o que você estava fazendo.'
              : 'O resto do sistema continua funcionando — use o menu acima para ir a outra área. Se o erro se repetir sempre nesta tela, avise o suporte com o horário e o que você estava fazendo.'}
        </p>
        {!carregamento && (
          <pre style={{
            background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6,
            padding: 12, fontSize: 11, color: '#b04040', whiteSpace: 'pre-wrap',
            marginBottom: 16, maxHeight: 160, overflow: 'auto',
          }}>
            {String(this.state.erro?.message || this.state.erro)}
          </pre>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!carregamento && (
            <button
              onClick={() => this.setState({ erro: null })}
              style={{
                padding: '9px 16px', background: '#c9a227', border: 'none', borderRadius: 6,
                color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 16px', background: carregamento ? '#c9a227' : 'transparent',
              border: carregamento ? 'none' : '1px dashed #333',
              borderRadius: 6, color: carregamento ? '#000' : '#999', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            {carregamento ? 'Atualizar agora' : 'Recarregar a página'}
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
