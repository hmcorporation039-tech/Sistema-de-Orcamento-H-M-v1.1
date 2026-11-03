import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Check } from 'lucide-react';
import { getCotacoesMaterial, getOportunidadesCotacao, renomearFornecedorCotacao } from '../services/api';
import { formatarMoeda, dataBr } from '../utils/format';
import Modal from './ui/Modal';
import { estilos } from './ui/estilos';

// Comparativo de fornecedores (services/cotacoesFornecedor.js): quem cotou mais barato cada material nos
// últimos 90 dias e onde o custo do catálogo está acima do melhor preço. Só aponta: o catálogo não muda
// por cotação, quem decide é o engenheiro. O nome do fornecedor é um palpite tirado do documento e pode
// ser corrigido aqui.
const pct = (v) => `${String(v).replace('.', ',')} %`;
const cnpjBr = (c) => String(c).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

function NomeFornecedor({ f, onRenomeado }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(f.nome);
  const salvar = async () => {
    try { await renomearFornecedorCotacao(f.cnpj, nome); setEditando(false); toast.success('Nome do fornecedor atualizado.'); onRenomeado(); }
    catch (e) { toast.error(e.response?.data?.erro || 'Não foi possível renomear.'); }
  };
  if (!editando) {
    return (
      <span>
        {f.nome}
        <button type="button" aria-label={`Corrigir o nome de ${f.nome}`} title="Corrigir o nome" style={{ ...estilos.btnIcone, width: 22, height: 22, marginLeft: 6 }} onClick={() => setEditando(true)}><Pencil size={11} /></button>
        <div style={{ fontSize: 11, color: 'var(--texto-3)' }}>CNPJ {cnpjBr(f.cnpj)}</div>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input value={nome} maxLength={200} onChange={e => setNome(e.target.value)} aria-label="Nome do fornecedor" style={{ width: 220 }} />
      <button type="button" aria-label="Salvar nome" style={estilos.btnIcone} onClick={salvar}><Check size={13} /></button>
    </span>
  );
}

export function ModalCompararMaterial({ material, onFechar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const carregar = useCallback(async () => {
    try { setDados((await getCotacoesMaterial(material.id)).data); setErro(false); } catch { setErro(true); }
  }, [material.id]);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <Modal titulo={`Fornecedores: ${material.descricao}`} onFechar={onFechar} largura={720}>
      {erro && <p style={{ color: '#e5534b', fontSize: 13 }}>Não foi possível carregar as cotações.</p>}
      {!dados && !erro && <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>Carregando...</p>}
      {dados && (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--texto-2)', margin: '0 0 10px' }} data-testid="comparar-resumo">
            Custo no catálogo: <b>{dados.custo_catalogo != null ? formatarMoeda(dados.custo_catalogo) : 'sem custo'}</b> por {material.unidade}.
            {dados.catalogo_acima_pct != null && dados.catalogo_acima_pct >= 5 && !dados.suspeito && (
              <b style={{ color: '#d69a2d' }}> O catálogo está {pct(dados.catalogo_acima_pct)} acima do menor preço cotado.</b>
            )}
          </p>
          {dados.suspeito && (
            <p style={{ fontSize: 12.5, color: '#d69a2d', margin: '0 0 10px' }} data-testid="comparar-suspeito">
              Os preços estão muito distantes entre si (5 vezes ou mais). Confira a unidade e a embalagem antes de tirar conclusão.
            </p>
          )}
          {dados.fornecedores.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--texto-3)' }} data-testid="comparar-vazio">
              Nenhuma cotação com fornecedor nos últimos {dados.validade_dias} dias{dados.antigas ? ` (há ${dados.antigas} mais antiga${dados.antigas > 1 ? 's' : ''})` : ''}.
              As próximas cotações lidas das pastas e do e-mail passam a entrar aqui sozinhas.
            </p>
          ) : (
            <div style={estilos.caixaTabela}>
              <table style={{ ...estilos.tabela, fontSize: 12.5 }}>
                <thead><tr><th style={estilos.th}>Fornecedor</th><th style={{ ...estilos.th, textAlign: 'right' }}>Preço</th><th style={estilos.th}>Un.</th><th style={estilos.th}>Cotado em</th><th style={estilos.th}>Diferença</th></tr></thead>
                <tbody>
                  {dados.fornecedores.map(f => (
                    <tr key={f.cnpj} style={{ borderTop: '1px solid var(--borda)' }} data-testid="comparar-linha">
                      <td style={estilos.td}><NomeFornecedor f={f} onRenomeado={carregar} /></td>
                      <td style={{ ...estilos.td, textAlign: 'right', fontWeight: 700, color: f.menor ? '#3fb95f' : 'var(--texto)' }}>{formatarMoeda(f.preco)}</td>
                      <td style={estilos.td}>{f.unidade || '—'}</td>
                      <td style={estilos.td}>{dataBr(f.data)} <span style={{ color: 'var(--texto-3)' }}>(há {f.dias} d)</span></td>
                      <td style={estilos.td}>
                        {!f.comparavel ? <span style={{ color: '#d69a2d' }} title="Unidade diferente da do material: não entra na comparação">outra unidade</span>
                          : f.menor ? <b style={{ color: '#3fb95f' }}>menor preço</b> : `+${pct(f.acima_do_menor_pct)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--texto-3)', margin: '10px 0 0' }}>
            Vale a cotação mais nova de cada fornecedor, até {dados.validade_dias} dias. O preço do catálogo não muda por cotação.
          </p>
        </>
      )}
    </Modal>
  );
}

export default function ModalOportunidades({ onFechar, onAbrirMaterial }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    getOportunidadesCotacao().then(r => { if (vivo) setDados(r.data); }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  return (
    <Modal titulo="Comparar fornecedores" onFechar={onFechar} largura={820}>
      {erro && <p style={{ color: '#e5534b', fontSize: 13 }}>Não foi possível carregar o comparativo.</p>}
      {!dados && !erro && <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>Carregando...</p>}
      {dados && (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--texto-2)', margin: '0 0 12px' }} data-testid="oport-resumo">
            {dados.resumo.materiais_cotados} materiais cotados nos últimos {dados.resumo.validade_dias} dias, por {dados.resumo.fornecedores} fornecedores;
            {' '}{dados.resumo.materiais_com_varios_fornecedores} deles com mais de um fornecedor.
          </p>
          {dados.ranking.length > 0 && (
            <div style={{ marginBottom: 14 }} data-testid="oport-ranking">
              <b style={{ fontSize: 12.5 }}>Quem costuma cotar mais barato</b>
              {dados.ranking.map(r => (
                <div key={r.cnpj} style={{ fontSize: 12.5, color: 'var(--texto-2)', padding: '3px 0' }}>
                  {r.nome}: menor preço em <b>{r.vezes_menor}</b> de {r.itens_comparados} materiais em comum ({r.pct_menor} %)
                </div>
              ))}
            </div>
          )}
          {dados.itens.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--texto-3)' }} data-testid="oport-vazio">
              Nenhuma diferença relevante por enquanto. O comparativo aparece quando o mesmo material for cotado por mais de um fornecedor, ou quando uma cotação ficar abaixo do custo do catálogo.
            </p>
          ) : (
            <div style={estilos.caixaTabela}>
              <table style={{ ...estilos.tabela, fontSize: 12.5 }}>
                <thead><tr><th style={estilos.th}>Material</th><th style={{ ...estilos.th, textAlign: 'right' }}>Catálogo</th><th style={{ ...estilos.th, textAlign: 'right' }}>Menor cotação</th><th style={estilos.th}>Fornecedor</th><th style={estilos.th}>Situação</th></tr></thead>
                <tbody>
                  {dados.itens.map(i => (
                    <tr key={i.material_id} style={{ borderTop: '1px solid var(--borda)', cursor: 'pointer' }} onClick={() => onAbrirMaterial({ id: i.material_id, descricao: i.descricao, unidade: i.unidade })} data-testid="oport-linha">
                      <td style={estilos.td}>{i.descricao}</td>
                      <td style={{ ...estilos.td, textAlign: 'right' }}>{i.custo_catalogo != null ? formatarMoeda(i.custo_catalogo) : '—'}</td>
                      <td style={{ ...estilos.td, textAlign: 'right', fontWeight: 700, color: '#3fb95f' }}>{formatarMoeda(i.menor.preco)}</td>
                      <td style={estilos.td}>{i.menor.nome}</td>
                      <td style={estilos.td}>
                        {i.suspeito ? <span style={{ color: '#d69a2d' }}>confira a unidade</span>
                          : i.motivo === 'catalogo_acima' ? `catálogo ${pct(i.catalogo_acima_pct)} acima` : `fornecedores ${pct(i.diferenca_entre_fornecedores_pct)} distantes`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--texto-3)', margin: '10px 0 0' }}>
            Clique numa linha para ver todos os fornecedores do material. Isto só aponta: o preço do catálogo não é alterado por cotação.
          </p>
        </>
      )}
    </Modal>
  );
}
