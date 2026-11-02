import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Mail, Banknote, FolderOpen, Bot, RefreshCw, Play, Clock, CheckCircle2,
  AlertTriangle, XCircle, Loader2, History, ChevronDown, ChevronUp, PlugZap, DatabaseBackup, Percent, Database,
} from 'lucide-react';
import {
  getRotinasIntegracoes, executarRotinaIntegracao, testarIAIntegracoes,
  getBackupIntegracoes, executarBackupIntegracoes, getPadroesOrcamento, atualizarPadroesOrcamento, getSinapiSituacao, buscarSinapi, configurarSinapi,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { estilos } from '../components/ui/estilos';
import { formatarMoeda } from '../utils/format';

// Painel de Integrações (2.0): as rotinas automáticas (notas e Pix por e-mail,
// orçamentos de fornecedores nas pastas) e a cadeia de IA, numa visão só.
// Pendurado na aba "Integrações" do hub de administração.

const ICONES = { 'notas-email': Mail, 'pix-email': Banknote, 'fornecedores-pastas': FolderOpen };

const STATUS = {
  ok: { label: 'Concluída', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26', Icone: CheckCircle2 },
  avisos: { label: 'Concluída com avisos', cor: '#d9a53a', bg: '#1a150a', borda: '#4a3a1a', Icone: AlertTriangle },
  ignorada: { label: 'Ignorada', cor: '#999', bg: '#151515', borda: '#2a2a2a', Icone: Clock },
  erro: { label: 'Erro', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a', Icone: XCircle },
  em_andamento: { label: 'Em execução', cor: '#6fa8dc', bg: '#0a121a', borda: '#1a2f4a', Icone: Loader2 },
  interrompida: { label: 'Interrompida', cor: '#e08080', bg: '#1a0a0a', borda: '#4a1a1a', Icone: XCircle },
};

function dataHora(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function duracao(s) {
  if (s == null) return '';
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

function Selo({ cor, bg, borda, children, titulo }) {
  return (
    <span title={titulo} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 700, background: bg, color: cor, border: `1px solid ${borda}`, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function SeloStatus({ status }) {
  const s = STATUS[status] || STATUS.ignorada;
  const { Icone } = s;
  return <Selo {...s}><Icone size={11} />{s.label}</Selo>;
}

function Linha({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: 'var(--texto-3)', minWidth: 118 }}>{rotulo}</span>
      <span style={{ color: '#ccc', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}

function CartaoRotina({ rotina, executando, aoExecutar }) {
  const [verAvisos, setVerAvisos] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const Icone = ICONES[rotina.chave] || PlugZap;
  const ultima = rotina.ultimaExecucao;
  const rodando = executando || !!rotina.emExecucao;

  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Icone size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>{rotina.nome}</div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 2 }}>{rotina.descricao}</div>
        </div>
        {rotina.ativa
          ? <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26">Automática ligada</Selo>
          : <Selo cor="#999" bg="#151515" borda="#2a2a2a" titulo={rotina.motivoInativa || ''}>Automática desligada</Selo>}
      </div>

      {!rotina.ativa && rotina.motivoInativa && (
        <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 8 }}>{rotina.motivoInativa}</div>
      )}

      <Linha rotulo="Horários">{(rotina.horarios || []).join(' e ')}</Linha>
      <Linha rotulo="Próxima execução">{rotina.proximasExecucoes?.length ? rotina.proximasExecucoes.map(dataHora).join(' · ') : '—'}</Linha>
      {rotina.pastas && <Linha rotulo="Pastas">{rotina.pastas.join(' | ')}</Linha>}

      <div style={separador} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: '#c9a227', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>Última execução</span>
        {rotina.emExecucao ? <SeloStatus status="em_andamento" /> : ultima && <SeloStatus status={ultima.status} />}
      </div>
      {rotina.emExecucao && (
        <Linha rotulo="Em execução desde">{dataHora(rotina.emExecucao.desde)} ({rotina.emExecucao.origem === 'agendada' ? 'horário automático' : 'manual'})</Linha>
      )}
      {ultima ? (
        <>
          <Linha rotulo="Quando">
            {dataHora(ultima.iniciadoEm)}{ultima.duracaoSegundos != null && ` · ${duracao(ultima.duracaoSegundos)}`}
            {' · '}{ultima.origem === 'agendada' ? 'horário automático' : `manual${ultima.usuario ? ` (${ultima.usuario})` : ''}`}
          </Linha>
          <Linha rotulo="Itens">{ultima.itens ?? '—'}</Linha>
          {ultima.texto && <Linha rotulo="Resultado">{ultima.texto}</Linha>}
          {ultima.erro && <Linha rotulo="Erro"><span style={{ color: '#e08080' }}>{ultima.erro}</span></Linha>}
          {ultima.totalAvisos > 0 && (
            <div style={{ marginTop: 4 }}>
              <button onClick={() => setVerAvisos(v => !v)} style={btnTexto}>
                {verAvisos ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {ultima.totalAvisos} aviso(s)
              </button>
              {verAvisos && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#d9a53a', fontSize: 12 }}>
                  {ultima.avisos.map((a, i) => <li key={i} style={{ marginBottom: 3 }}>{a}</li>)}
                  {ultima.totalAvisos > ultima.avisos.length && <li style={{ color: 'var(--texto-3)' }}>… e mais {ultima.totalAvisos - ultima.avisos.length}</li>}
                </ul>
              )}
            </div>
          )}
        </>
      ) : !rotina.emExecucao && (
        <div style={{ fontSize: 12, color: 'var(--texto-3)', padding: '3px 0' }}>Nenhuma execução registrada no painel ainda.</div>
      )}
      {rotina.ultimoRegistroEm && <Linha rotulo="Último item lido">{dataHora(rotina.ultimoRegistroEm)}</Linha>}

      {rotina.historico?.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setVerHistorico(v => !v)} style={btnTexto}>
            <History size={12} /> {verHistorico ? 'Ocultar histórico' : `Histórico (${rotina.historico.length} últimas)`}
          </button>
          {verHistorico && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
              <tbody>
                {rotina.historico.map(h => (
                  <tr key={h.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={tdMini}>{dataHora(h.iniciadoEm)}</td>
                    <td style={tdMini}>{h.origem === 'agendada' ? 'automática' : 'manual'}</td>
                    <td style={tdMini}><SeloStatus status={h.status} /></td>
                    <td style={{ ...tdMini, textAlign: 'right' }}>{h.itens ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={() => aoExecutar(rotina)} disabled={rodando} style={{ ...btnPrimario, opacity: rodando ? 0.6 : 1, cursor: rodando ? 'wait' : 'pointer' }}>
          {rodando ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <Play size={14} />}
          {rodando ? 'Executando…' : 'Executar agora'}
        </button>
      </div>
    </div>
  );
}

function CartaoIA({ ia, cache, testando, aoTestar }) {
  if (!ia) return null;
  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Bot size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>Inteligência artificial</div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 2 }}>
            Usada na pesquisa de preço de mercado, na leitura de orçamentos de fornecedor, na classificação de materiais e nos equipamentos do projeto.
            Tenta na ordem abaixo e passa para a próxima quando uma falha.
          </div>
        </div>
        {ia.disponivel
          ? <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26">Disponível</Selo>
          : <Selo cor="#e08080" bg="#1a0a0a" borda="#4a1a1a">Nenhuma disponível</Selo>}
      </div>

      <Linha rotulo="Ordem">
        {ia.ordem.map(id => ia.provedores.find(p => p.id === id)?.rotulo || id).map((r, i, a) => (
          <span key={r}><b style={{ color: '#c9a227' }}>{i + 1}.</b> {r}{i < a.length - 1 ? '  →  ' : ''}</span>
        ))}
        {ia.ordemPersonalizada && <span style={{ color: 'var(--texto-3)' }}> (IA_ORDEM)</span>}
      </Linha>
      {ia.desligada && <Linha rotulo="Atenção"><span style={{ color: '#d9a53a' }}>COTACAO_IA=desligada — só a pesquisa de preço na web usa IA</span></Linha>}

      {cache && (
        <Linha rotulo="Cache">
          <span>
            <b style={{ color: '#3fb95f' }}>{cache.evitadas}</b> chamada(s) à IA evitada(s) em {cache.dias} dias
            {' '}({cache.taxa}% das consultas) · {cache.guardadas} resposta(s) guardada(s)
          </span>
        </Linha>
      )}

      <div style={separador} />

      {ia.provedores.map(p => (
        <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: p.ativo ? '#3fb95f' : '#555', flexShrink: 0 }} />
            <span style={{ color: '#ddd', fontWeight: 700, fontSize: 12, flex: 1 }}>
              {p.posicao ? `${p.posicao}. ` : ''}{p.rotulo}
            </span>
            <span style={{ color: p.ativo ? '#3fb95f' : '#888', fontSize: 12 }}>{p.ativo ? 'ligado' : (p.motivo || 'desligado')}</span>
          </div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginLeft: 16, marginTop: 2 }}>{p.descricao}{p.modelo ? ` · ${p.modelo}` : ''}</div>
          {(p.ultimoSucesso || p.ultimoErro) && (
            <div style={{ fontSize: 12, marginLeft: 16, marginTop: 3, color: 'var(--texto-3)' }}>
              {p.sucessos} resposta(s), {p.falhas} falha(s) desde que o sistema subiu
              {p.ultimoSucesso && <div style={{ color: '#3fb95f' }}>Última resposta: {dataHora(p.ultimoSucesso.em)} ({p.ultimoSucesso.finalidade})</div>}
              {p.ultimoErro && <div style={{ color: '#e08080', overflowWrap: 'anywhere' }}>Última falha: {dataHora(p.ultimoErro.em)} — {p.ultimoErro.mensagem}</div>}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={aoTestar} disabled={testando || !ia.disponivel} style={{ ...btnSecundario, display: 'flex', alignItems: 'center', gap: 6, opacity: testando || !ia.disponivel ? 0.6 : 1 }}>
          {testando ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <PlugZap size={14} />}
          {testando ? 'Testando…' : 'Testar IA'}
        </button>
      </div>
    </div>
  );
}

function tamanho(bytes) {
  if (bytes == null) return '—';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function haQuanto(horas) {
  if (horas == null) return '';
  if (horas < 1) return 'há menos de 1 hora';
  if (horas < 48) return `há ${Math.round(horas)} h`;
  return `há ${Math.floor(horas / 24)} dias`;
}

// null = não deu para conferir (rede fora do ar / destino não configurado)
function SeloCopia({ ok, rotulo }) {
  if (ok === true) return <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26" titulo={`Cópia em ${rotulo} conferida`}>{rotulo}</Selo>;
  if (ok === false) return <Selo cor="#e08080" bg="#1a0a0a" borda="#4a1a1a" titulo={`Sem cópia em ${rotulo}`}>sem {rotulo}</Selo>;
  return <Selo cor="#999" bg="#151515" borda="#2a2a2a" titulo={`Não deu para conferir ${rotulo}`}>{rotulo}: ?</Selo>;
}

function CartaoBackup({ backup, rodando, aoExecutar }) {
  const [verLista, setVerLista] = useState(false);
  if (!backup) return null;
  const ultimo = backup.ultimo;
  const emAndamento = rodando || !!backup.emExecucao;

  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><DatabaseBackup size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>Backup do banco</div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 2 }}>
            Automático {backup.agendado}, com cópia no servidor de arquivos e fora do prédio. "Fazer backup agora" gera um dump do banco na hora (sem as pastas de arquivos).
          </div>
        </div>
        {backup.atrasado
          ? <Selo cor="#e08080" bg="#1a0a0a" borda="#4a1a1a"><AlertTriangle size={11} />Atrasado</Selo>
          : <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26"><CheckCircle2 size={11} />Em dia</Selo>}
      </div>

      {backup.atrasado && (
        <div style={{ fontSize: 12, color: '#e08080', marginBottom: 8 }}>
          {ultimo
            ? `O último backup foi ${haQuanto(backup.horasDesdeUltimo)} — a tarefa agendada das 02:00 pode não ter rodado. Faça um agora e confira o log em backend\\logs\\backup.log.`
            : 'Nenhum backup deste banco encontrado na pasta backend\\backups. Faça um agora.'}
        </div>
      )}

      {ultimo ? (
        <>
          <Linha rotulo="Último backup">{dataHora(ultimo.em)} · {tamanho(ultimo.tamanho)} {backup.horasDesdeUltimo != null && `(${haQuanto(backup.horasDesdeUltimo)})`}</Linha>
          <Linha rotulo="Cópias">
            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
              <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26">neste PC</Selo>
              <SeloCopia ok={ultimo.copiaRede} rotulo="rede" />
              {backup.destinos.externo ? <SeloCopia ok={ultimo.copiaExterna} rotulo="nuvem" /> : <Selo cor="#d9a53a" bg="#1a150a" borda="#4a3a1a" titulo="BACKUP_DESTINO_EXTERNO não definido no .env">nuvem: não configurada</Selo>}
            </span>
          </Linha>
        </>
      ) : <div style={{ fontSize: 12, color: 'var(--texto-3)', padding: '3px 0' }}>Nenhum backup encontrado.</div>}
      <Linha rotulo="Guardados">{backup.totalLocal} neste PC (30 dias)</Linha>

      {backup.backups?.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setVerLista(v => !v)} style={btnTexto}>
            <History size={12} /> {verLista ? 'Ocultar lista' : `Últimos ${backup.backups.length} backups`}
          </button>
          {verLista && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
              <tbody>
                {backup.backups.map(b => (
                  <tr key={b.nome} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={tdMini}>{dataHora(b.em)}</td>
                    <td style={{ ...tdMini, textAlign: 'right' }}>{tamanho(b.tamanho)}</td>
                    <td style={{ ...tdMini, textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <SeloCopia ok={b.copiaRede} rotulo="rede" />
                        {backup.destinos.externo && <SeloCopia ok={b.copiaExterna} rotulo="nuvem" />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={aoExecutar} disabled={emAndamento} style={{ ...btnPrimario, opacity: emAndamento ? 0.6 : 1, cursor: emAndamento ? 'wait' : 'pointer' }}>
          {emAndamento ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <Play size={14} />}
          {emAndamento ? 'Fazendo backup…' : 'Fazer backup agora'}
        </button>
      </div>
    </div>
  );
}

// BDI e impostos padrão das propostas NOVAS. Sem valor de fábrica: as alíquotas da reforma
// tributária ainda não existem, então o administrador define e atualiza aqui. Proposta já salva
// guarda o próprio valor e não muda. Campo vazio = "não definido".
const CAMPOS_PADRAO = [
  { chave: 'bdi', rotulo: 'BDI', dica: 'sobre material + mão de obra' },
  { chave: 'imposto_venda', rotulo: 'Imposto sobre a venda de material', dica: 'sobre o material' },
  { chave: 'imposto_servico', rotulo: 'Imposto sobre serviço', dica: 'sobre a mão de obra' },
];

function CartaoPadroes() {
  const [salvo, setSalvo] = useState(null);
  const [valores, setValores] = useState({ bdi: '', imposto_venda: '', imposto_servico: '' });
  const [salvando, setSalvando] = useState(false);

  const aplicar = useCallback((p) => {
    setSalvo(p);
    setValores(Object.fromEntries(CAMPOS_PADRAO.map(c => [c.chave, p[c.chave] == null ? '' : String(p[c.chave]).replace('.', ',')])));
  }, []);
  useEffect(() => { getPadroesOrcamento().then(r => aplicar(r.data)).catch(() => {}); }, [aplicar]);
  if (!salvo) return null;

  const mudou = CAMPOS_PADRAO.some(c => (valores[c.chave].trim() === '' ? null : Number(valores[c.chave].replace(',', '.'))) !== salvo[c.chave]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await atualizarPadroesOrcamento(valores);
      aplicar(res.data);
      toast.success('BDI e impostos padrão salvos — valem para as propostas novas');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Percent size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>BDI e impostos padrão</div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 2 }}>
            Valem só para as propostas novas (orçamento, análise de projeto, laudos e assistente). A proposta já salva guarda o próprio valor. Deixe vazio o que ainda não estiver definido: o sistema não inventa número.
          </div>
        </div>
        {salvo.definidos
          ? <Selo cor="#3fb95f" bg="#0a1a0f" borda="#1a4a26"><CheckCircle2 size={11} />Definidos</Selo>
          : <Selo cor="#d9a53a" bg="#1a150a" borda="#4a3a1a"><AlertTriangle size={11} />Faltam valores</Selo>}
      </div>
      {CAMPOS_PADRAO.map(c => (
        <label key={c.chave} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--texto-2)', padding: '4px 0' }}>
          <span style={{ flex: 1, minWidth: 0 }}>{c.rotulo} <span style={{ color: 'var(--texto-3)' }}>({c.dica})</span></span>
          <input type="text" inputMode="decimal" placeholder="não definido" value={valores[c.chave]}
            onChange={e => setValores(v => ({ ...v, [c.chave]: e.target.value }))} style={{ width: 96, textAlign: 'right' }} />
          <span>%</span>
        </label>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={salvar} disabled={!mudou || salvando} style={{ ...btnPrimario, opacity: !mudou || salvando ? 0.6 : 1 }}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

// SINAPI local (Caixa): meses importados, estado e regime de referência (só o administrador troca)
// e uma busca rápida por insumo/composição. A importação mensal é pelo script
// backend/scripts/importar-sinapi.js (ver docs/PLANO-PROXIMAS-MELHORIAS.md, item 6).
const mesBR = (m) => { const [a, mm] = String(m || '').trim().split('-'); return a && mm ? `${mm}/${a}` : '—'; };

function CartaoSinapi({ ehAdmin }) {
  const [sit, setSit] = useState(null);
  const [termo, setTermo] = useState('');
  const [tipo, setTipo] = useState('insumos');
  const [achados, setAchados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => { getSinapiSituacao().then(r => setSit(r.data)).catch(() => {}); }, []);
  if (!sit) return null;

  const ufs = [...new Set(sit.importacoes.map(i => i.uf))];
  const ultimo = sit.importacoes.find(i => i.uf === sit.uf);
  const vazio = !sit.importacoes.length;

  async function trocar(mudanca) {
    setTrocando(true);
    try {
      const res = await configurarSinapi(mudanca);
      setSit(res.data);
      setAchados(null);
      toast.success('Referência do SINAPI atualizada');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setTrocando(false);
    }
  }

  async function buscar(e) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    setBuscando(true);
    try {
      const res = await buscarSinapi(termo.trim(), tipo);
      setAchados(res.data.itens);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro na busca');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div style={cartao}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={iconeCaixa}><Database size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eee', fontWeight: 700, fontSize: 14 }}>SINAPI local (Caixa)</div>
          <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 2 }}>
            {vazio
              ? 'Nenhuma planilha importada ainda. A Caixa publica a de cada mês por volta do dia 10; a importação é feita com o script importar-sinapi.js.'
              : <>Referência mais recente do {sit.uf}: <b>{mesBR(ultimo?.mes)}</b> — {ultimo?.insumos?.toLocaleString('pt-BR')} insumos e {ultimo?.composicoes?.toLocaleString('pt-BR')} composições (os dois regimes).</>}
          </div>
        </div>
      </div>
      {!vazio && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--texto-2)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Estado
              <select value={sit.uf} disabled={!ehAdmin || trocando || ufs.length < 2} onChange={e => trocar({ uf: e.target.value })}>
                {ufs.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Regime
              <select value={sit.regime} disabled={!ehAdmin || trocando} onChange={e => trocar({ regime: e.target.value })}>
                <option value="sem">sem desoneração</option>
                <option value="com">com desoneração</option>
              </select>
            </label>
            {!ehAdmin && <span style={{ color: 'var(--texto-3)' }}>(só o administrador troca)</span>}
          </div>
          <form onSubmit={buscar} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input type="text" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar (ex.: cabo flexivel 2,5)" style={{ flex: 1, minWidth: 160 }} />
            <select value={tipo} onChange={e => { setTipo(e.target.value); setAchados(null); }}>
              <option value="insumos">Insumos (material, mão de obra)</option>
              <option value="composicoes">Composições (serviço)</option>
            </select>
            <button type="submit" disabled={buscando || termo.trim().length < 2} style={{ ...btnSecundario, opacity: buscando ? 0.6 : 1 }}>{buscando ? 'Buscando…' : 'Buscar'}</button>
          </form>
          {achados && (
            achados.length === 0
              ? <div style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 10 }}>Nada encontrado para esse texto.</div>
              : (
                <div style={{ marginTop: 10, maxHeight: 260, overflowY: 'auto', fontSize: 12 }}>
                  {achados.map(i => (
                    <div key={i.codigo} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: '1px solid #1e1e1e', color: 'var(--texto-2)' }}>
                      <span style={{ color: 'var(--texto-3)', minWidth: 54 }}>{i.codigo}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{i.descricao}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{formatarMoeda(i.valor)}/{i.unidade}</span>
                    </div>
                  ))}
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}

export default function Integracoes() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState({});
  const [testando, setTestando] = useState(false);
  const [backup, setBackup] = useState(null);
  const [fazendoBackup, setFazendoBackup] = useState(false);
  const timer = useRef(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const res = await getRotinasIntegracoes();
      setDados(res.data);
      // o backup é um cartão à parte: se falhar (rede fora do ar), o resto do painel segue
      getBackupIntegracoes().then(r => setBackup(r.data)).catch(() => {});
    } catch (err) {
      if (!silencioso) toast.error(err.response?.data?.erro || 'Erro ao carregar as integrações');
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  useEffect(() => { if (ehAdmin) carregar(); }, [carregar, ehAdmin]);

  // enquanto alguma rotina roda (aqui ou pelo horário), atualiza a cada 5 s
  const algumaRodando = Object.values(executando).some(Boolean) || !!dados?.rotinas?.some(r => r.emExecucao);
  useEffect(() => {
    if (!algumaRodando) return undefined;
    timer.current = setInterval(() => carregar(true), 5000);
    return () => clearInterval(timer.current);
  }, [algumaRodando, carregar]);

  async function executar(rotina) {
    const aviso = rotina.chave === 'fornecedores-pastas'
      ? 'Ler agora as pastas de orçamentos de fornecedores e cadastrar os materiais novos?'
      : `Ler agora a caixa de e-mail (${rotina.nome})?`;
    if (!window.confirm(aviso)) return;
    setExecutando(e => ({ ...e, [rotina.chave]: true }));
    setTimeout(() => carregar(true), 800); // mostra "em execução" logo
    try {
      const res = await executarRotinaIntegracao(rotina.chave);
      const ultima = res.data?.rotina?.ultimaExecucao;
      if (ultima?.status === 'erro') toast.error(`${rotina.nome}: ${ultima.erro || 'erro'}`);
      else toast.success(`${rotina.nome}: ${ultima?.texto || 'concluída'}`);
    } catch (err) {
      if (err.code === 'ECONNABORTED') toast('A rotina continua rodando no servidor — o painel atualiza sozinho.', { icon: '⏳' });
      else toast.error(err.response?.data?.erro || `Erro ao executar ${rotina.nome}`);
    } finally {
      setExecutando(e => ({ ...e, [rotina.chave]: false }));
      carregar(true);
    }
  }

  async function fazerBackup() {
    if (!window.confirm('Fazer um backup do banco agora? Leva alguns segundos e não interrompe o sistema.')) return;
    setFazendoBackup(true);
    try {
      const res = await executarBackupIntegracoes();
      setBackup(res.data.situacao);
      if (res.data.avisos?.length) toast(`Backup feito, com aviso: ${res.data.avisos[0].replace(/^\S+ \S+ /, '')}`, { icon: '⚠️', duration: 9000 });
      else toast.success(`Backup concluído: ${res.data.arquivo}`);
    } catch (err) {
      if (err.response?.data?.situacao) setBackup(err.response.data.situacao);
      if (err.code === 'ECONNABORTED') toast('O backup continua no servidor — atualize o painel em instantes.', { icon: '⏳' });
      else toast.error(err.response?.data?.erro || 'Erro ao fazer o backup');
    } finally {
      setFazendoBackup(false);
      getBackupIntegracoes().then(r => setBackup(r.data)).catch(() => {});
    }
  }

  async function testarIA() {
    setTestando(true);
    try {
      const res = await testarIAIntegracoes();
      toast.success(`IA respondeu: ${res.data.fonte} em ${(res.data.ms / 1000).toFixed(1)} s`);
      setDados(d => (d ? { ...d, ia: res.data.ia } : d));
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Nenhuma IA respondeu');
      if (err.response?.data?.ia) setDados(d => (d ? { ...d, ia: err.response.data.ia } : d));
    } finally {
      setTestando(false);
    }
  }

  if (!ehAdmin) {
    return <div style={{ color: 'var(--texto-3)', fontSize: 13, padding: 20 }}>Somente administradores veem o painel de integrações.</div>;
  }

  return (
    <div>
      <style>{'@keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, color: '#c9a227', fontWeight: 700, flex: 1, margin: 0 }}>Integrações</h2>
        <button onClick={() => carregar()} style={{ ...btnSecundario, display: 'flex', alignItems: 'center', gap: 6 }} disabled={carregando}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {dados && !dados.rotinasAutomaticas?.ligadas && (
        <div style={{ ...cartao, padding: '10px 14px', marginBottom: 14, borderColor: '#4a3a1a', color: '#d9a53a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> Rotinas automáticas desligadas nesta instância (ROTINAS_AUTOMATICAS). Os horários não rodam; o botão "Executar agora" continua funcionando.
        </div>
      )}

      {backup?.atrasado && (
        <div style={{ ...cartao, padding: '10px 14px', marginBottom: 14, borderColor: '#4a1a1a', color: '#e08080', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} />
          {backup.ultimo ? `O último backup do banco foi ${haQuanto(backup.horasDesdeUltimo)}. Veja o cartão "Backup do banco" abaixo.` : 'Nenhum backup do banco encontrado. Veja o cartão "Backup do banco" abaixo.'}
        </div>
      )}

      {carregando && !dados && <div style={{ color: 'var(--texto-3)', padding: 30, textAlign: 'center' }}>Carregando...</div>}

      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {dados.rotinas.map(r => (
            <CartaoRotina key={r.chave} rotina={r} executando={!!executando[r.chave]} aoExecutar={executar} />
          ))}
          <CartaoBackup backup={backup} rodando={fazendoBackup} aoExecutar={fazerBackup} />
          <CartaoIA ia={dados.ia} cache={dados.iaCache} testando={testando} aoTestar={testarIA} />
          <CartaoPadroes />
          <CartaoSinapi ehAdmin={ehAdmin} />
        </div>
      )}
    </div>
  );
}

const cartao = {
  background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 16,
  display: 'flex', flexDirection: 'column', minWidth: 0,
};

const iconeCaixa = {
  width: 34, height: 34, borderRadius: 8, background: '#1a1608', border: '1px solid #3a2f0a',
  color: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const separador = { borderTop: '1px solid #1e1e1e', margin: '10px 0' };

const tdMini = { padding: '5px 4px', color: 'var(--texto-2)', verticalAlign: 'middle' };

// Estilos do kit de tela (components/ui/estilos.js), com o que esta tela tem
// de diferente por cima — o visual ficou como era.
const btnPrimario = { ...estilos.btnPrimario, display: 'flex' };

const btnSecundario = {
  padding: '9px 16px', background: 'transparent', border: '1px solid #2a2a2a',
  borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};

const btnTexto = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent',
  border: 'none', color: 'var(--texto-2)', fontSize: 12, cursor: 'pointer',
};
