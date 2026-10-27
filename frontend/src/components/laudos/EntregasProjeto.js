import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PackageCheck, FolderDown } from 'lucide-react';
import { getEntregasProjeto, gerarEntregaProjeto } from '../../services/api';

// Entregas do PROJETO (versão 2.1): o projetista escolhe o que entregar —
// Definições técnicas, As-built, DXF (DWG não é gerado), QElectroTech e PDF —
// e baixa tudo num ZIP ou grava na pasta do projeto (Entrega\, nomes fixos,
// sobrescritos a cada versão). O catálogo vem do servidor
// (backend/src/utils/projetoLaudo.js → ENTREGAS).

let catalogoCache = null;

// "R00 — emissão" → "R01 — As built" (mesma regra de skills/_comum/entrega.js)
function revisaoAsBuiltSugerida(revisaoAtual) {
  const m = /^R(\d+)/i.exec(String(revisaoAtual || '').trim());
  const n = m ? Number(m[1]) + 1 : 1;
  return `R${String(n).padStart(2, '0')} — As built`;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function baixarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function EntregasProjeto({ laudo, desenhos, temArquitetura, revisaoAtual, salvarAgora, ocupado, setOcupado, onGerado }) {
  const [catalogo, setCatalogo] = useState(catalogoCache);
  const salvas = laudo.entregas || {};
  const [itens, setItens] = useState(() => new Set(salvas.itens?.length ? salvas.itens : ['definicoes', 'pdf']));
  const [asBuilt, setAsBuilt] = useState(() => ({
    data: salvas.as_built?.data || hoje(),
    revisao: salvas.as_built?.revisao || revisaoAsBuiltSugerida(revisaoAtual),
  }));

  useEffect(() => {
    if (catalogoCache) return;
    getEntregasProjeto().then(r => { catalogoCache = r.data; setCatalogo(r.data); }).catch(() => toast.error('Erro ao carregar as entregas'));
  }, []);

  // DXF precisa da planta da disciplina e da arquitetura enviada; QElectroTech, do unifilar
  const indisponivel = (e) => {
    if (e.requer === 'planta' && !desenhos.planta) return 'A planta automática ainda não existe para esta disciplina';
    if (e.requer === 'planta' && !temArquitetura) return 'Envie a arquitetura (DWG/DXF) em "Desenhos", acima, para gerar a planta';
    if (e.requer === 'unifilar' && !desenhos.unifilar) return 'O unifilar existe só para a elétrica predial, a industrial e a média tensão';
    return null;
  };
  const escolhidos = [...itens].filter(chave => {
    const e = (catalogo || []).find(x => x.chave === chave);
    return e && !indisponivel(e);
  });

  function alternar(chave, marcado) {
    setItens(atual => {
      const novo = new Set(atual);
      if (marcado) novo.add(chave); else novo.delete(chave);
      return novo;
    });
  }

  async function gerar(destino) {
    if (!escolhidos.length) { toast.error('Escolha pelo menos uma entrega'); return; }
    setOcupado(`entrega_${destino}`);
    try {
      await salvarAgora();
      const corpo = { itens: escolhidos, ...(itens.has('asbuilt') ? { as_built: asBuilt } : {}) };
      const r = await gerarEntregaProjeto(laudo.id, corpo, destino);
      if (destino === 'zip') {
        const nome = decodeURIComponent(r.headers['x-nome-arquivo'] || 'Entrega.zip');
        baixarBlob(r.data, nome);
        const arquivos = decodeURIComponent(r.headers['x-arquivos'] || '').split('; ').filter(Boolean);
        toast.success(`Entrega baixada (${arquivos.length} arquivo(s)) e gravada na pasta do projeto, em Entrega`, { duration: 7000 });
      } else {
        toast.success(`${r.data.gravados} arquivo(s) gravados em ${r.data.caminhoPasta}`, { duration: 8000 });
      }
      onGerado?.({ itens: escolhidos, as_built: itens.has('asbuilt') ? asBuilt : null });
    } catch (err) {
      let msg = 'Erro ao gerar a entrega';
      try {
        const corpoErro = err.response?.data instanceof Blob ? JSON.parse(await err.response.data.text()) : err.response?.data;
        msg = corpoErro?.erro || msg;
      } catch { /* resposta não-JSON */ }
      toast.error(msg, { duration: 9000 });
    } finally {
      setOcupado('');
    }
  }

  if (!catalogo) return null;
  return (
    <div style={caixa} data-testid="entregas-projeto">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#c9a227', fontWeight: 700 }}>Entregas do projeto</span>
        <span style={{ fontSize: 11, color: '#777' }}>escolha o que entregar ao cliente — vai num ZIP e para a pasta do projeto (Entrega)</span>
      </div>
      <div style={{ display: 'flex', gap: '6px 18px', flexWrap: 'wrap' }}>
        {catalogo.map(e => {
          const motivo = indisponivel(e);
          return (
            <label key={e.chave} title={motivo || e.descricao}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: motivo ? '#555' : itens.has(e.chave) ? '#c9a227' : '#bbb', cursor: motivo ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" style={{ width: 'auto', margin: 0 }} disabled={!!motivo}
                checked={!motivo && itens.has(e.chave)} onChange={ev => alternar(e.chave, ev.target.checked)} />
              {e.rotulo}
            </label>
          );
        })}
      </div>
      {itens.has('asbuilt') && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#e08080', fontWeight: 700 }}>AS BUILT</span>
          <label style={rotulo}>Data
            <input type="date" value={asBuilt.data} onChange={e => setAsBuilt(a => ({ ...a, data: e.target.value }))} style={campo} />
          </label>
          <label style={rotulo}>Revisão
            <input value={asBuilt.revisao} onChange={e => setAsBuilt(a => ({ ...a, revisao: e.target.value }))} style={{ ...campo, width: 180 }} />
          </label>
          <span style={{ fontSize: 11, color: '#888', flex: '1 1 260px' }}>
            Os arquivos saem com título/carimbo "AS BUILT", esta data e esta revisão. Antes, atualize o formulário com o que foi executado na obra.
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <button style={{ ...btn, borderColor: '#5a4a12', color: '#c9a227' }} disabled={!!ocupado} onClick={() => gerar('zip')}>
          <PackageCheck size={13} style={{ marginRight: 5 }} /> {ocupado === 'entrega_zip' ? 'Gerando…' : 'Baixar entrega (ZIP)'}
        </button>
        <button style={{ ...btn, borderColor: '#2f5a2f', color: '#8fd18f' }} disabled={!!ocupado} onClick={() => gerar('pasta')}
          title="Grava os arquivos escolhidos na pasta do projeto, em Entrega (nomes fixos, sobrescritos a cada versão)">
          <FolderDown size={13} style={{ marginRight: 5 }} /> {ocupado === 'entrega_pasta' ? 'Gravando…' : 'Salvar entrega na pasta'}
        </button>
        {salvas.gerado_em && <span style={{ fontSize: 11, color: '#666', alignSelf: 'center' }}>Última entrega: {new Date(salvas.gerado_em).toLocaleString('pt-BR')}</span>}
      </div>
    </div>
  );
}

const caixa = { marginTop: 10, padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 8, background: '#101010' };
const rotulo = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#999' };
const campo = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '4px 6px' };
const btn = {
  display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
};
