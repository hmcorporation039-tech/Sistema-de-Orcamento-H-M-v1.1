import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { getComponentesQuadro, aprovarComponenteQuadro, removerComponenteQuadro } from '../services/api';
import Select from '../components/Select';
import EditorComponente from '../components/componentesQuadro/EditorComponente';
import BuscarMedida from '../components/componentesQuadro/BuscarMedida';
import { useAuth } from '../hooks/useAuth';
import { estilos } from '../components/ui/estilos';
import { rotuloTipo, ROTULO_ORIGEM, textoMedidas, linkSeguro } from '../utils/componentesQuadro';

// Catálogo de componentes de quadros (2.4): as medidas OFICIAIS de cada
// componente por fabricante, que a skill de quadros usa para organizar o
// arranjo interno, dimensionar o invólucro e montar o modelo 3D.
//   - "Catálogo H&M (skill)": embutido na skill, conferido no datasheet (só leitura);
//   - "Cadastrado": incluído aqui à mão (substitui o da skill de mesmo código);
//   - "Pesquisa IA": achado pela IA no site do fabricante — fica "A conferir"
//     até um administrador abrir o link, conferir e aprovar.
// Ver: todos. Cadastrar, editar, aprovar e excluir: administrador.

export default function ComponentesQuadro() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState({ itens: [], fabricantes: [], tipos: [] });
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({ fabricante: '', tipo: '', verificado: '', texto: '' });
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(undefined); // undefined = fechado; null = novo; objeto = editar
  const [buscando, setBuscando] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  // busca por texto espera a pessoa parar de digitar
  useEffect(() => {
    const t = setTimeout(() => setFiltros(f => (f.texto === texto ? f : { ...f, texto })), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const r = await getComponentesQuadro(params);
      setDados(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar o catálogo de componentes');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);
  useEffect(() => { carregar(); }, [carregar]);

  // fabricantes da lista padrão + os que já estão no catálogo (digitados)
  const fabricantes = useMemo(() => [...new Set([...(dados.fabricantes || []), ...dados.itens.map(c => c.fabricante)])], [dados]);
  const filtro = (k) => (e) => setFiltros(f => ({ ...f, [k]: e.target.value }));

  async function aprovar(c) {
    setOcupado(c.chave);
    try {
      await aprovarComponenteQuadro(c.id);
      toast.success(`${c.fabricante} ${c.referencia}: verificado`);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao aprovar', { duration: 9000 });
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(c) {
    if (!window.confirm(`Excluir do catálogo o componente ${c.fabricante} ${c.referencia}?${c.substitui_catalogo ? '\n\nVolta a valer o do catálogo da skill.' : ''}`)) return;
    setOcupado(c.chave);
    try {
      await removerComponenteQuadro(c.id);
      toast.success('Componente excluído do catálogo');
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir');
    } finally {
      setOcupado(null);
    }
  }

  const aConferir = dados.itens.filter(c => !c.verificado).length;
  return (
    <div>
      <div style={estilos.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ouro-claro, #c9a227)', flex: 1 }}>Catálogo de componentes de quadros</h3>
          <button style={estilos.btnSecundario} onClick={() => setBuscando(true)} title="A IA procura o datasheet no site do fabricante e traz as medidas para conferir">
            <Search size={14} /> Buscar medida oficial
          </button>
          {ehAdmin && <button style={estilos.btnPrimario} onClick={() => setEditando(null)}><Plus size={14} /> Adicionar componente</button>}
        </div>
        <p style={estilos.ajuda}>
          Medidas oficiais (datasheet do fabricante) de disjuntores, DR, DPS, contatores, inversores, CLP, fontes, bornes, canaletas e invólucros.
          O projeto de quadros usa estas medidas para organizar os componentes nos trilhos, escolher o tamanho do quadro e montar o modelo 3D.
          Componente sem medida aqui entra com medida típica, marcada [CONFERIR] no memorial.
          {!ehAdmin && ' Só um administrador cadastra, edita e aprova.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Select value={filtros.fabricante} onChange={filtro('fabricante')} aria-label="Fabricante">
            <option value="">Todos os fabricantes</option>
            {fabricantes.map(f => <option key={f} value={f}>{f}</option>)}
          </Select>
          <Select value={filtros.tipo} onChange={filtro('tipo')} aria-label="Tipo">
            <option value="">Todos os tipos</option>
            {(dados.tipos || []).map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </Select>
          <Select value={filtros.verificado} onChange={filtro('verificado')} aria-label="Situação">
            <option value="">Verificados e a conferir</option>
            <option value="nao">Só a conferir</option>
            <option value="sim">Só verificados</option>
          </Select>
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar referência, linha ou descrição" aria-label="Buscar" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', margin: '10px 0 0' }}>
          {carregando ? 'Carregando…' : `${dados.itens.length} componente(s) na lista${aConferir ? ` — ${aConferir} a conferir` : ''}`}
          {dados.total != null && ` · catálogo completo: ${dados.total} (${dados.total_embutido || 0} da skill${dados.versao_catalogo ? ` de ${dados.versao_catalogo}` : ''}, ${dados.total_banco || 0} cadastrados ou pesquisados)`}
        </p>
      </div>

      <div style={estilos.caixaTabela}>
        <table style={estilos.tabela} data-testid="tabela-componentes-quadro">
          <thead>
            <tr>
              <th style={estilos.th}>Fabricante</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Referência</th><th style={estilos.th}>Descrição</th>
              <th style={estilos.th} title="Largura × altura × profundidade, em mm">L × A × P (mm)</th><th style={estilos.th}>Origem</th>
              <th style={estilos.th}>Situação</th><th style={estilos.th}>Fonte</th><th style={estilos.th} />
            </tr>
          </thead>
          <tbody>
            {!carregando && dados.itens.length === 0 && (
              <tr><td colSpan={9} style={estilos.tdVazio}>Nenhum componente com estes filtros.{ehAdmin ? ' Use "Adicionar componente" ou "Buscar medida oficial".' : ''}</td></tr>
            )}
            {dados.itens.map(c => {
              const link = linkSeguro(c.fonte_url);
              return (
                <tr key={c.chave} style={estilos.linhaTabela}>
                  <td style={estilos.td}>{c.fabricante}</td>
                  <td style={estilos.td}>{rotuloTipo(c.tipo)}</td>
                  <td style={estilos.td}><b>{c.referencia}</b>{c.linha && <div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{c.linha}</div>}</td>
                  <td style={{ ...estilos.td, maxWidth: 260 }}>{c.descricao || '—'}</td>
                  <td style={{ ...estilos.td, whiteSpace: 'nowrap' }}>{textoMedidas(c)}{c.modulos_din ? <div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{String(c.modulos_din).replace('.', ',')} módulo(s) DIN</div> : null}</td>
                  <td style={estilos.td}>
                    {ROTULO_ORIGEM[c.origem] || c.origem}
                    {c.substitui_catalogo && <div style={{ fontSize: 11, color: 'var(--texto-3)' }}>substitui o da skill</div>}
                  </td>
                  <td style={estilos.td}>
                    {c.verificado
                      ? <span style={seloVerificado} title={c.verificado_por ? `Conferido por ${c.verificado_por}${c.verificado_em ? ` em ${new Date(c.verificado_em).toLocaleDateString('pt-BR')}` : ''}` : 'Conferido no documento do fabricante'}>Verificado</span>
                      : <span style={seloConferir} title="Abra o link do fabricante, confira as medidas e aprove">A conferir</span>}
                  </td>
                  <td style={estilos.td}>
                    {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={estilos.link} title={c.fonte_documento || link}>Datasheet <ExternalLink size={11} /></a> : null}
                    {c.fonte_documento && <div style={{ fontSize: 11.5, color: 'var(--texto-3)', maxWidth: 200 }}>{c.fonte_documento}</div>}
                    {!link && !c.fonte_documento && '—'}
                  </td>
                  <td style={{ ...estilos.td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {ehAdmin && (
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        {c.id && !c.verificado && (
                          <button style={{ ...estilos.btnIcone, color: '#3fb95f' }} disabled={ocupado === c.chave} onClick={() => aprovar(c)} title="Conferi no documento do fabricante: marcar como verificado">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button style={estilos.btnIcone} onClick={() => setEditando(c)} title={c.id ? 'Editar' : 'Cadastrar uma versão da H&M (substitui a do catálogo da skill)'}><Pencil size={13} /></button>
                        {c.id && <button style={{ ...estilos.btnIcone, color: '#c05050' }} disabled={ocupado === c.chave} onClick={() => excluir(c)} title="Excluir do catálogo"><Trash2 size={13} /></button>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editando !== undefined && (
        <EditorComponente componente={editando} onFechar={() => setEditando(undefined)} onSalvo={() => { setEditando(undefined); carregar(); }} />
      )}
      {buscando && <BuscarMedida fabricantes={fabricantes} onFechar={() => setBuscando(false)} onAchado={() => carregar()} />}
    </div>
  );
}

const selo = { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 4, padding: '2px 7px', border: '1px solid', whiteSpace: 'nowrap' };
const seloVerificado = { ...selo, color: '#3fb95f', borderColor: '#2f5a2f', background: '#12301a' };
const seloConferir = { ...selo, color: '#e0b050', borderColor: '#5a4a12', background: '#3a2a10' };
