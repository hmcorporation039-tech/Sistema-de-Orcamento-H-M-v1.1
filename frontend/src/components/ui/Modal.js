// Janela (modal) única do sistema — revisão de 28/10/2026, etapa 7 do kit de
// tela. Antes havia ~12 cópias de `overlay`/`modal` espalhadas pelas páginas,
// cada uma com um jeitinho: umas fechavam ao arrastar a seleção de texto para
// fora, nenhuma fechava com Esc e o foco ficava na página de trás.
//
// INTERFACE
//   <Modal titulo="Novo Cliente" onFechar={fn} largura={520}>…</Modal>
//   titulo     texto/JSX do cabeçalho (com o X de fechar). Sem titulo, o
//              cabeçalho é do conteúdo (telas que têm um cabeçalho próprio).
//   rotulo     nome acessível (aria-label); padrão = titulo quando é texto
//   onFechar   Esc, clique no fundo e o X chamam esta função
//   largura    width da janela (número = px); maxWidth limita (padrão 100%)
//   testid     data-testid da janela (os testes Cypress usam alguns)
//   zIndex     pilha: 100 nas páginas; a CalculadoraBdi abre por cima do
//              editor de proposta com 1000
//   acoes      botões extras no cabeçalho, antes do X
//   espacoTitulo / tamanhoTitulo  margem abaixo do cabeçalho e fonte do título
//              (as janelas antigas variavam entre 12–20 px e 15–17 px)
//   estiloTitulo / estiloFechar  ajuste do título (ex.: ícone ao lado do texto,
//              no BDI) e do X (o Financeiro usa o X de 24 px)
//   style / estiloFundo  ajustes finos da janela e do fundo escuro
//   demais props (data-teste, aria-*) vão para a janela
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { estilos } from './estilos';

const FUNDO = {
  position: 'fixed', inset: 0, background: '#000000cc', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 20,
};

const JANELA = {
  background: '#131313', border: '1px solid #2a2a2a', borderRadius: 12,
  padding: 28, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px #000000aa',
  // a janela recebe o foco ao abrir; sem isto o Chrome desenha o contorno dela
  outline: 'none',
};

// Janelas abertas, da de baixo para a de cima: o Esc fecha só a de cima
// (ex.: e-mail aberto por cima do detalhe da proposta).
const pilha = [];

export default function Modal({
  titulo, rotulo, onFechar, largura = 520, maxWidth = '100%', testid, zIndex = 100,
  acoes, espacoTitulo = 20, tamanhoTitulo = 15, estiloTitulo, estiloFechar, style, estiloFundo, children, ...resto
}) {
  const janela = useRef(null);
  // fecha só se o clique COMEÇOU e terminou no fundo — arrastar a seleção de
  // um campo para fora da janela não fecha mais (e não perde o que foi digitado)
  const apertouNoFundo = useRef(false);
  // onFechar muda a cada render do pai; o efeito do Esc não precisa reinscrever
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  // quem tinha o foco antes de abrir (o botão) — lido no 1º render, antes do
  // autoFocus de algum campo da janela
  const focoAnterior = useRef(document.activeElement);

  useEffect(() => {
    const eu = {};
    const el = janela.current;
    const antes = focoAnterior.current;
    pilha.push(eu);
    // foco no conteúdo: se nenhum campo pegou o foco (autoFocus), foca a
    // janela — assim o Tab anda dentro dela e o leitor de tela anuncia o título
    if (el && !el.contains(document.activeElement)) el.focus();
    function teclou(e) {
      if (e.key === 'Escape' && pilha[pilha.length - 1] === eu) {
        e.stopPropagation();
        fechar.current?.();
      }
    }
    document.addEventListener('keydown', teclou);
    return () => {
      document.removeEventListener('keydown', teclou);
      const i = pilha.indexOf(eu);
      if (i >= 0) pilha.splice(i, 1);
      // devolve o foco a quem abriu (o botão), se ele ainda estiver na tela
      // (depois do render: no StrictMode do desenvolvimento o efeito desmonta e
      // remonta com a janela ainda na tela — aí não mexe no foco)
      setTimeout(() => {
        if (el && el.isConnected) return;
        // só se o foco "caiu" no body; se alguém já focou outra coisa, respeita
        const ativo = document.activeElement;
        if (ativo && ativo !== document.body) return;
        if (antes && antes.focus && antes !== document.body && document.contains(antes)) antes.focus();
      }, 0);
    };
  }, []);

  const nome = rotulo || (typeof titulo === 'string' ? titulo : undefined);

  return (
    <div
      data-modal-fundo=""
      style={{ ...FUNDO, zIndex, ...estiloFundo }}
      onMouseDown={e => { apertouNoFundo.current = e.target === e.currentTarget; }}
      onClick={e => { if (e.target === e.currentTarget && apertouNoFundo.current) onFechar?.(); }}
    >
      <div
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-label={nome}
        tabIndex={-1}
        data-testid={testid}
        style={{ ...JANELA, width: largura, maxWidth, ...style }}
        // cliques dentro da janela não sobem para a página de trás (era o
        // stopPropagation de cada cópia antiga)
        onClick={e => e.stopPropagation()}
        {...resto}
      >
        {titulo != null && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: espacoTitulo }}>
            <h3 style={{ color: '#c9a227', fontSize: tamanhoTitulo, fontWeight: 700, flex: 1, ...estiloTitulo }}>{titulo}</h3>
            {acoes}
            <button type="button" onClick={onFechar} title="Fechar" aria-label="Fechar" style={{ ...estilos.btnIcone, background: 'transparent', ...estiloFechar }}>
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
