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

    return (
      <div style={{
        background: '#131313', border: '1px solid #3a1212', borderRadius: 10,
        padding: 28, margin: '24px auto', maxWidth: 720, color: '#e8e0cc',
      }}>
        <h2 style={{ fontSize: 17, color: '#c9a227', fontWeight: 700, marginBottom: 10 }}>
          Esta tela encontrou um erro
        </h2>
        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, marginBottom: 16 }}>
          O resto do sistema continua funcionando — use o menu acima para ir a outra
          área. Se o erro se repetir sempre nesta tela, avise o suporte com o horário
          e o que você estava fazendo.
        </p>
        <pre style={{
          background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6,
          padding: 12, fontSize: 11, color: '#b04040', whiteSpace: 'pre-wrap',
          marginBottom: 16, maxHeight: 160, overflow: 'auto',
        }}>
          {String(this.state.erro?.message || this.state.erro)}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => this.setState({ erro: null })}
            style={{
              padding: '9px 16px', background: '#c9a227', border: 'none', borderRadius: 6,
              color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 16px', background: 'transparent', border: '1px dashed #333',
              borderRadius: 6, color: '#999', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            Recarregar a página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
