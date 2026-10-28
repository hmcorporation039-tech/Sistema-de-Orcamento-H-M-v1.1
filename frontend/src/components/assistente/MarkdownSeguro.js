import { Fragment } from 'react';
import { Link } from 'react-router-dom';

// Markdown SIMPLES da resposta do assistente, montado como elementos React —
// nunca HTML cru (nada de dangerouslySetInnerHTML): um "<script>" ou "<img
// onerror>" vindo do modelo ou de um PDF aparece como texto. Suporta títulos
// (#, ##, ###), listas (-, *, 1.), tabelas com |, bloco de código ```,
// **negrito**, *itálico*, `código` e links. Link só para páginas DO SISTEMA
// (caminho que começa com "/" — ex.: /propostas/editar/12); qualquer outro
// (http, javascript:, //host) vira texto.

const OURO = '#c9a227';
const linkInterno = (href) => /^\/(?!\/)[\w\-/?=&.%#]*$/.test(href);

function inline(texto, chave, aoNavegar) {
  const partes = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)/g;
  let ultimo = 0; let m; let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const k = `${chave}-${i++}`;
    if (m[2]) partes.push(<strong key={k} style={{ color: '#f0e6c8' }}>{m[2]}</strong>);
    else if (m[3]) partes.push(<code key={k} style={{ background: '#1d1d1d', padding: '1px 4px', borderRadius: 3, fontSize: '0.92em' }}>{m[3]}</code>);
    else if (m[4]) {
      partes.push(linkInterno(m[5])
        ? <Link key={k} to={m[5]} onClick={aoNavegar} style={{ color: OURO, textDecoration: 'underline' }}>{m[4]}</Link>
        : <span key={k}>{m[4]} ({m[5]})</span>);
    } else if (m[6] || m[7]) partes.push(<em key={k}>{m[6] || m[7]}</em>);
    ultimo = re.lastIndex;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

const celulas = (linha) => linha.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export default function MarkdownSeguro({ texto, aoNavegar }) {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  const blocos = [];
  let i = 0; let n = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    const k = `b${n++}`;
    if (/^```/.test(l)) {
      const corpo = [];
      i++;
      while (i < linhas.length && !/^```/.test(linhas[i])) corpo.push(linhas[i++]);
      i++;
      blocos.push(<pre key={k} style={{ background: '#111', border: '1px solid #262626', borderRadius: 6, padding: 8, overflowX: 'auto', fontSize: 12, whiteSpace: 'pre' }}>{corpo.join('\n')}</pre>);
      continue;
    }
    const titulo = l.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) {
      const tam = { 1: 17, 2: 15, 3: 14, 4: 13 }[titulo[1].length];
      blocos.push(<div key={k} style={{ fontSize: tam, fontWeight: 700, color: OURO, margin: '10px 0 4px' }}>{inline(titulo[2], k, aoNavegar)}</div>);
      i++; continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1])) {
      const cab = celulas(l);
      i += 2;
      const corpo = [];
      while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) corpo.push(celulas(linhas[i++]));
      blocos.push(
        <div key={k} style={{ overflowX: 'auto', margin: '6px 0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
            <thead><tr>{cab.map((c, j) => <th key={j} style={{ borderBottom: `1px solid ${OURO}`, textAlign: 'left', padding: '4px 6px', color: OURO, whiteSpace: 'nowrap' }}>{inline(c, `${k}h${j}`, aoNavegar)}</th>)}</tr></thead>
            <tbody>{corpo.map((linha, r) => <tr key={r}>{linha.map((c, j) => <td key={j} style={{ borderBottom: '1px solid #262626', padding: '4px 6px', verticalAlign: 'top' }}>{inline(c, `${k}c${r}-${j}`, aoNavegar)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordenada = /^\s*\d+[.)]/.test(l);
      const itens = [];
      while (i < linhas.length && /^\s*([-*•]|\d+[.)])\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      const Tag = ordenada ? 'ol' : 'ul';
      blocos.push(<Tag key={k} style={{ margin: '4px 0', paddingLeft: 20 }}>{itens.map((t, j) => <li key={j} style={{ margin: '2px 0' }}>{inline(t, `${k}i${j}`, aoNavegar)}</li>)}</Tag>);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const paragrafo = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|```|\s*([-*•]|\d+[.)])\s+|\s*\|.*\|\s*$)/.test(linhas[i])) paragrafo.push(linhas[i++]);
    if (!paragrafo.length) { paragrafo.push(linhas[i++]); }
    blocos.push(<p key={k} style={{ margin: '4px 0', lineHeight: 1.5 }}>{paragrafo.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t, `${k}p${j}`, aoNavegar)}</Fragment>)}</p>);
  }
  return <div style={{ fontSize: 13, color: '#e8e0cc', wordBreak: 'break-word' }}>{blocos}</div>;
}

export { linkInterno };
