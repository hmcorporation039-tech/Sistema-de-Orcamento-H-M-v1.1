import { RefreshCw } from 'lucide-react';
import { Campo, Selecao, Marcador, Grade, Secao, TabelaEditavel, Nota } from './campos';
import { ChecklistEditor, FotosInspecao, resumoChecklist } from './inspecaoUi';

const btnPreencher = {
  display: 'inline-flex', alignItems: 'center', padding: '5px 10px', marginBottom: 8, background: 'transparent',
  border: '1px solid #2f4f6f', borderRadius: 6, color: '#8ab4f8', fontWeight: 700, fontSize: 11,
};

// Formulário desenhado a partir do esquema da disciplina (skills/_comum/formulario.js).
// Qualquer disciplina nova aparece na tela sem precisar de componente próprio.

function ler(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function definir(obj, caminho, valor) {
  const partes = caminho.split('.');
  const raiz = { ...obj };
  let atual = raiz;
  for (let i = 0; i < partes.length - 1; i++) {
    atual[partes[i]] = { ...(atual[partes[i]] || {}) };
    atual = atual[partes[i]];
  }
  atual[partes[partes.length - 1]] = valor;
  return raiz;
}

// novaLinha pode trazer "{n}" para numerar a linha nova automaticamente
function linhaNova(modelo, lista) {
  const n = String((lista || []).length + 1);
  return Object.fromEntries(Object.entries(modelo || {}).map(([k, v]) => [k, typeof v === 'string' ? v.replace('{n}', n) : v]));
}

function resumoSecao(secao, dados) {
  if (!secao.resumo) {
    const tabela = secao.itens.find(i => i.tipo === 'tabela');
    if (tabela) return `${(ler(dados, tabela.caminho) || []).length} item(ns)`;
    const chk = secao.itens.find(i => i.tipo === 'checklist');
    if (chk) return resumoChecklist(ler(dados, chk.caminho));
    const fotos = secao.itens.find(i => i.tipo === 'fotos');
    if (fotos) return `${(ler(dados, fotos.caminho) || []).length} foto(s)`;
    return '';
  }
  return ler(dados, secao.resumo) || '';
}

// Tabela que pode ser preenchida com o resultado do último cálculo (ex.: os
// circuitos da divisão automática, para o projetista editar só o que quiser)
function BotaoPreencher({ item, resumo, linhas, onPreencher }) {
  const valores = resumo?.preencher?.[item.preencherDe];
  const trazer = () => {
    if ((linhas || []).length && !window.confirm(`Substituir as ${linhas.length} linha(s) atuais pelos valores calculados?`)) return;
    onPreencher(JSON.parse(JSON.stringify(valores)));
  };
  return (
    <button onClick={trazer} disabled={!valores?.length} style={{ ...btnPreencher, opacity: valores?.length ? 1 : 0.5, cursor: valores?.length ? 'pointer' : 'not-allowed' }}
      title={valores?.length ? 'Copia os valores calculados para a tabela, para editar' : 'Clique em "Calcular" primeiro'}>
      <RefreshCw size={12} style={{ marginRight: 4 }} /> {item.rotuloPreencher || 'Trazer do cálculo'}
    </button>
  );
}

// Seção só de INSPEÇÃO (versão 2.1): todos os campos/tabelas dela ficam em
// inspecao.* (dados gerais da inspeção, checklist, ensaios, NCs, fotos). Em
// todas as 16 skills de formulário genérico essas seções vêm depois das de
// projeto e não misturam campo de projeto — esconder no projeto é seguro.
function soDeInspecao(secao) {
  const caminhos = [];
  for (const item of secao.itens || []) {
    if (item.tipo === 'grade') (item.campos || []).forEach(c => caminhos.push(c.caminho));
    else if (item.caminho) caminhos.push(item.caminho);
  }
  return caminhos.length > 0 && caminhos.every(c => String(c).startsWith('inspecao.'));
}

// tipo (2.1): 'projeto' esconde as seções de inspeção (os dados continuam salvos); 'laudo' mostra tudo
export default function FormularioGenerico({ esquema, dados, onChange, checklistBase, fotos, urlsFotos, onEnviarFotos, onRemoverFoto, resumo, tipo = 'laudo' }) {
  const d = dados || {};
  const set = (caminho) => (valor) => onChange(atual => definir(atual, caminho, valor));
  const secoes = (esquema || []).filter(s => tipo !== 'projeto' || !soDeInspecao(s));
  const escondidas = (esquema || []).length - secoes.length;

  return (
    <div>
      {escondidas > 0 && (
        <Nota>Projeto: as {escondidas} seções de inspeção (checklist, ensaios, não conformidades e fotos) ficam no laudo — crie em Laudos › Novo laudo quando a inspeção for pedida.</Nota>
      )}
      {secoes.map((secao, iSec) => (
        <Secao key={iSec} titulo={secao.titulo} abertaInicial={!!secao.aberta} resumo={String(resumoSecao(secao, d))}>
          {secao.itens.map((item, i) => {
            if (item.tipo === 'nota') return <Nota key={i}>{item.texto}</Nota>;
            if (item.tipo === 'grade') {
              return (
                <Grade key={i} colunas={item.colunas || 4}>
                  {item.campos.map(c => {
                    const valor = ler(d, c.caminho);
                    if (c.tipo === 'selecao') return <Selecao key={c.caminho} rotulo={c.rotulo} valor={valor == null ? '' : String(valor)} onChange={v => set(c.caminho)(/^-?\d+(\.\d+)?$/.test(v) && c.numerico ? Number(v) : v)} opcoes={c.opcoes} largura={c.largura} />;
                    if (c.tipo === 'check') return <Marcador key={c.caminho} rotulo={c.rotulo} valor={valor} onChange={set(c.caminho)} dica={c.dica} />;
                    return <Campo key={c.caminho} rotulo={c.rotulo} tipo={c.tipo || 'texto'} valor={valor} onChange={set(c.caminho)} dica={c.dica} largura={c.largura} />;
                  })}
                </Grade>
              );
            }
            if (item.tipo === 'tabela') {
              return (
                <div key={i}>
                  {item.preencherDe && <BotaoPreencher item={item} resumo={resumo} linhas={ler(d, item.caminho)} onPreencher={set(item.caminho)} />}
                  <TabelaEditavel linhas={ler(d, item.caminho)} onChange={set(item.caminho)} rotuloAdicionar={item.rotuloAdicionar}
                    novaLinha={(lista) => linhaNova(item.novaLinha, lista)} colunas={item.colunas} />
                </div>
              );
            }
            if (item.tipo === 'checklist') {
              return <ChecklistEditor key={i} base={checklistBase} lista={ler(d, item.caminho)} onChange={set(item.caminho)} />;
            }
            if (item.tipo === 'fotos') {
              return (
                <FotosInspecao key={i} lista={ler(d, item.caminho) || []} fotos={fotos} urlsFotos={urlsFotos}
                  onChange={set(item.caminho)} onEnviarFotos={onEnviarFotos} onRemoverFoto={onRemoverFoto} />
              );
            }
            return null;
          })}
        </Secao>
      ))}
    </div>
  );
}
