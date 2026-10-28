// Pacote de arquivos da Análise de Projeto (versão 2.3): o que veio do cliente
// ou do arquiteto — arquivos soltos, uma pasta inteira ou um ZIP. O servidor
// guarda tudo, abre os ZIPs e sugere a disciplina de cada arquivo; aqui o
// usuário confere, ajusta e marca o que é só REFERÊNCIA (arquitetura,
// estrutura, hidráulica, climatização: não é orçado, mas entra na
// compatibilização por posição entre os DWG/DXF).
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FilePlus2, FolderOpen, X } from 'lucide-react';
import Select from '../Select';
import { enviarPacoteProjeto, descartarPacoteProjeto } from '../../services/api';

const ACEITOS = /\.(pdf|dwg|dxf|zip)$/i;
const ROTULO_REF = { arquitetura: 'Arquitetura', estrutura: 'Estrutura', hidraulica: 'Hidráulica', climatizacao: 'Climatização' };
const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Lista do pacote → itens editáveis da tela
export const itensDoPacote = (arquivos) => arquivos.map(a => ({
  id: a.id, nome: a.nome, caminho: a.caminho, tipo: a.tipo, tamanho: a.tamanho, motivo: a.sugestao?.motivo || '',
  disciplinas: a.sugestao?.disciplinas || [], referencia: !!a.sugestao?.referencia, tipoReferencia: a.sugestao?.tipoReferencia || null, incluir: true,
}));

export function BotoesPacote({ desabilitado, onRecebido }) {
  const arquivosRef = useRef(null);
  const pastaRef = useRef(null);
  const [progresso, setProgresso] = useState(null);

  async function enviar(lista) {
    const aceitos = Array.from(lista || []).filter(f => ACEITOS.test(f.name));
    const fora = (lista?.length || 0) - aceitos.length;
    if (!aceitos.length) { toast.error('Nenhum PDF, DWG, DXF ou ZIP no que foi escolhido.'); return; }
    setProgresso(0);
    try {
      const r = await enviarPacoteProjeto(aceitos, (p) => setProgresso(p));
      const ign = r.data.ignorados.length + fora;
      toast.success(`${r.data.arquivos.length} arquivo(s) recebido(s)${ign ? `; ${ign} ignorado(s) (não são PDF/DWG/DXF)` : ''}. Confira as disciplinas sugeridas.`, { duration: 7000 });
      onRecebido(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar os arquivos', { duration: 9000 });
    } finally {
      setProgresso(null);
    }
  }

  const ocupado = desabilitado || progresso !== null;
  return (
    <>
      <input ref={arquivosRef} type="file" accept=".pdf,.dwg,.dxf,.zip" multiple style={{ display: 'none' }} data-testid="entrada-arquivos"
        onChange={e => { const l = e.target.files; enviar(l); e.target.value = ''; }} />
      <input ref={pastaRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} data-testid="entrada-pasta"
        onChange={e => { const l = e.target.files; enviar(l); e.target.value = ''; }} />
      <button type="button" style={btn} disabled={ocupado} onClick={() => arquivosRef.current?.click()}
        title="Um ou vários arquivos: PDF, DWG, DXF ou um ZIP com o projeto inteiro">
        <FilePlus2 size={13} style={{ marginRight: 6 }} /> Arquivos ou ZIP
      </button>
      <button type="button" style={btn} disabled={ocupado} onClick={() => pastaRef.current?.click()}
        title="Uma pasta inteira (com subpastas): só os PDF, DWG e DXF são enviados">
        <FolderOpen size={13} style={{ marginRight: 6 }} /> Pasta inteira
      </button>
      {progresso !== null && (
        <span style={{ fontSize: 12, color: '#c9a227' }} data-testid="progresso-pacote">
          {progresso < 100 ? `Enviando… ${progresso ?? ''}%` : 'Abrindo ZIPs e sugerindo as disciplinas…'}
        </span>
      )}
    </>
  );
}

export function ListaPacote({ itens, onMudar, disciplinas, token, onDescartar }) {
  const mudar = (id, campos) => onMudar(itens.map(it => (it.id === id ? { ...it, ...campos } : it)));
  const nomeDisc = (k) => disciplinas.find(d => d.chave === k)?.nome?.replace(/\s*\(.*\)$/, '') || k;
  const incluidos = itens.filter(i => i.incluir);
  const semDisciplina = incluidos.filter(i => !i.referencia && !i.disciplinas.length).length;

  async function descartar() {
    if (token) await descartarPacoteProjeto(token).catch(() => {});
    onDescartar();
  }

  return (
    <div data-testid="lista-pacote">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {itens.length} arquivo(s) no pacote — {incluidos.filter(i => i.referencia).length} referência(s)
        </span>
        {semDisciplina > 0 && <span style={{ fontSize: 12, color: '#e0a030' }}>{semDisciplina} sem disciplina — marque ou tire da análise</span>}
        <button type="button" onClick={descartar} style={{ ...btn, marginLeft: 'auto', padding: '5px 10px' }}>Descartar pacote</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid #222' }}>
              <th style={th} title="Entra na análise">Usar</th><th style={th}>Arquivo</th><th style={th}>Disciplinas</th><th style={th}>Referência</th>
            </tr>
          </thead>
          <tbody>
            {itens.map(it => (
              <tr key={it.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: it.incluir ? 1 : 0.45 }} data-testid="linha-pacote">
                <td style={td}><input type="checkbox" checked={it.incluir} onChange={e => mudar(it.id, { incluir: e.target.checked })} /></td>
                <td style={{ ...td, maxWidth: 360 }}>
                  <div style={{ color: '#ddd', fontWeight: 600, wordBreak: 'break-all' }}>
                    <span style={{ display: 'inline-block', minWidth: 32, marginRight: 6, padding: '1px 5px', borderRadius: 3, background: it.tipo === 'pdf' ? '#3a1d1d' : '#1d2d3a', color: it.tipo === 'pdf' ? '#f19999' : '#8ab4f8', fontSize: 10, textAlign: 'center', textTransform: 'uppercase' }}>{it.tipo}</span>
                    {it.nome}
                  </div>
                  <div style={{ color: '#666', fontSize: 11, wordBreak: 'break-all' }}>{it.caminho && it.caminho !== it.nome ? `${it.caminho} · ` : ''}{tamanho(it.tamanho)} · {it.motivo}</div>
                </td>
                <td style={td}>
                  {it.referencia ? <span style={{ color: '#777' }}>— (não é orçado)</span> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      {it.disciplinas.map(k => (
                        <span key={k} style={chip}>
                          {nomeDisc(k)}
                          <button type="button" title="Tirar esta disciplina" style={chipX} onClick={() => mudar(it.id, { disciplinas: it.disciplinas.filter(x => x !== k) })}><X size={11} /></button>
                        </span>
                      ))}
                      <Select value="" aria-label={`Adicionar disciplina a ${it.nome}`} style={sel}
                        onChange={e => e.target.value && mudar(it.id, { disciplinas: [...it.disciplinas, e.target.value] })}>
                        <option value="">+ disciplina</option>
                        {disciplinas.filter(d => !it.disciplinas.includes(d.chave)).map(d => <option key={d.chave} value={d.chave}>{d.nome}</option>)}
                      </Select>
                    </div>
                  )}
                </td>
                <td style={td}>
                  <Select value={it.referencia ? (it.tipoReferencia || 'arquitetura') : ''} aria-label={`Referência: ${it.nome}`} style={sel}
                    title="Referência: não é orçado; o DWG/DXF entra na compatibilização por posição (e a arquitetura vira base do 3D)"
                    onChange={e => mudar(it.id, e.target.value ? { referencia: true, tipoReferencia: e.target.value } : { referencia: false, tipoReferencia: null })}>
                    <option value="">Não (é projeto a orçar)</option>
                    {Object.entries(ROTULO_REF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btn = { display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: '1px dashed #333', borderRadius: 6, color: '#bbb', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
const th = { padding: '6px 8px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px' };
const td = { padding: '7px 8px', verticalAlign: 'top' };
const chip = { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 4px 2px 8px', borderRadius: 10, background: '#2c2715', border: '1px solid #5a4a12', color: '#e2c35a', fontSize: 11 };
const chipX = { display: 'flex', background: 'none', border: 0, color: '#c9a227', cursor: 'pointer', padding: 0 };
const sel = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#aaa', fontSize: 11, padding: '3px 5px', maxWidth: 190 };
