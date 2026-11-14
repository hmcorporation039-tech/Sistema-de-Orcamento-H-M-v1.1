import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getSegmentoCliente, getObra, getPrecosVendidos } from '../../services/api';
import { comparador } from '../../components/Select';
import { BASES_DO_EDITOR, normalizarNome } from './apoio';

// Ganchos do editor de orçamento, um por assunto (saíram de pages/Orcamento.js em 2.39, sem
// mudar o funcionamento).

// Catálogo e clientes inteiros (o servidor pagina em até 1000 por vez). Se uma base não carregar, avisa e
// oferece "Tentar de novo": antes o erro era engolido, e a lista vazia do "+ catálogo" parecia material não cadastrado.
//
// Base única de serviços de mão de obra (versão 2.0): os padrão da Análise
// de Projeto/laudos + os já lançados em qualquer proposta, com as
// referências oficial e particular e a sugestão por segmento (ver
// aplicarServicoNoItem). Um serviço digitado à mão entra na base ao salvar
// a proposta (backend: utils/servicosBase.js).
export function useBasesDoEditor() {
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [basesComFalha, setBasesComFalha] = useState([]);
  const carregarBases = useCallback((quais = Object.keys(BASES_DO_EDITOR)) => {
    const guardar = { clientes: (d) => setClientes(d.itens), materiais: (d) => setMateriais(d.itens), servicos: (d) => setServicos(d.itens || []) };
    setBasesComFalha(f => f.filter(b => !quais.includes(b)));
    quais.forEach(b => BASES_DO_EDITOR[b].carregar().then(res => guardar[b](res.data)).catch(() => {
      setBasesComFalha(f => (f.includes(b) ? f : [...f, b]));
      toast.error(`Não foi possível carregar ${BASES_DO_EDITOR[b].nome}. Use "Tentar de novo" no aviso do topo.`, { id: `falha-base-${b}` });
    }));
  }, []);
  useEffect(() => { carregarBases(); }, [carregarBases]);
  return { clientes, materiais, servicos, basesComFalha, carregarBases };
}

// Segmento do cliente da proposta: 'publico' (cadastro "Órgão Público" ou
// nome de órgão) usa a referência oficial; os demais, a particular. Vem do backend
// (mesma regra dos laudos e da Análise de Projeto), só depois que o nome do cliente para
// de mudar. E o segmento da obra (obras.segmento) — órgão público pela obra OU pelo cliente.
export function useSegmentoProposta(clienteNome, obraId) {
  const [segmento, setSegmento] = useState('privado');
  const [segmentoObra, setSegmentoObra] = useState(null);

  useEffect(() => {
    const nome = (clienteNome || '').trim();
    if (!nome) { setSegmento('privado'); return undefined; }
    const t = setTimeout(() => {
      getSegmentoCliente(nome).then(res => setSegmento(res.data.segmento === 'publico' ? 'publico' : 'privado')).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [clienteNome]);

  useEffect(() => {
    if (!obraId) { setSegmentoObra(null); return; }
    getObra(obraId).then(res => setSegmentoObra(res.data?.segmento ?? res.data?.obra?.segmento ?? null)).catch(() => setSegmentoObra(null));
  }, [obraId]);

  const ehPublico = segmento === 'publico' || segmentoObra === 'publico';
  return { segmento, segmentoObra, ehPublico };
}

// Serviços da base para as linhas de mão de obra: por código, pela descrição (item sem código
// — veio digitado, ou de uma análise antiga — ainda acha o serviço para mostrar as referências),
// os grupos da lista suspensa e a sugestão de preço do segmento.
export function useServicosDoEditor(servicos, segmento, nomeDisciplina) {
  const servicosPorCodigo = useMemo(() => Object.fromEntries(servicos.map(s => [s.codigo, s])), [servicos]);
  // lista suspensa: um grupo por disciplina, grupos em ordem alfabética (as
  // opções dentro de cada grupo o Select já ordena A–Z)
  const gruposServicos = useMemo(() => {
    const grupos = {};
    for (const s of servicos) (grupos[s.disciplina || 'outros'] = grupos[s.disciplina || 'outros'] || []).push(s);
    return Object.entries(grupos)
      .map(([disc, lista]) => ({ disc, nome: nomeDisciplina(disc), lista }))
      .sort((a, b) => comparador.compare(a.nome, b.nome));
  }, [servicos, nomeDisciplina]);
  const sugestaoDoServico = (s) => (s?.sugerido ? s.sugerido[segmento] : null);
  const servicosPorDescricao = useMemo(() => Object.fromEntries(servicos.map(s => [normalizarNome(s.descricao), s])), [servicos]);
  const servicoDoItem = (it) => servicosPorCodigo[it.codigo] || servicosPorDescricao[normalizarNome(it.descricao)];
  return { servicosPorCodigo, gruposServicos, sugestaoDoServico, servicoDoItem };
}

// Faixa praticada (propostas aprovadas) dos materiais que estão nesta proposta. A tela da
// própria proposta não conta contra si; falha de rede só some com a dica.
export function usePrecosVendidos(itens, editandoId) {
  const [vendidos, setVendidos] = useState({});
  const idsMateriais = [...new Set(itens.map(i => Number(i.material_id)).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  const chaveIdsMateriais = idsMateriais.join(',');
  useEffect(() => {
    if (!chaveIdsMateriais) { setVendidos({}); return undefined; }
    let vivo = true;
    getPrecosVendidos(chaveIdsMateriais.split(',').map(Number), editandoId)
      .then(r => { if (vivo) setVendidos(r.data || {}); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [chaveIdsMateriais, editandoId]);
  return vendidos;
}
