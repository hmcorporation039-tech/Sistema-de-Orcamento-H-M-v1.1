import Modal from '../../components/ui/Modal';
import { formatarData } from '../../utils/format';
import { th, tdVazio, btnPrimario, btnSecundario } from './apoio';

// Janelas simples da tela Materiais: colar o CSV e o histórico da importação automática.
// O texto colado e o histórico ficam na página (fechar e abrir de novo mantém o que havia).

export function ModalImportarCsv({ texto, setTexto, importando, onImportar, onFechar }) {
  return (
    <Modal titulo="Importar Materiais (CSV)" onFechar={onFechar} largura={620} espacoTitulo={14}>
        <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 10, lineHeight: 1.5 }}>
          Cole uma linha por material, campos separados por <b>;</b> ou tabulação, na ordem:<br />
          <code style={{ color: '#c9a227' }}>código;descrição;categoria;unidade;preço;marca;ncm</code> (ncm é opcional)
        </p>
        <textarea
          rows={10}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={'001;Cabo flexível 2,5mm;Elétrica;m;2.50;Sil;8544.42.00\n002;Disjuntor bipolar 25A;Elétrica;un;18.90;Siemens'}
          aria-label="Linhas do CSV"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onFechar} style={btnSecundario}>Cancelar</button>
          <button onClick={onImportar} disabled={importando} style={btnPrimario}>
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </div>
    </Modal>
  );
}

export function ModalHistoricoEmail({ historicoEmail, onFechar }) {
  return (
    <Modal titulo="Histórico de Importação Automática" onFechar={onFechar} largura={620} espacoTitulo={14}>
        {!historicoEmail && <p style={{ color: 'var(--texto-3)', fontSize: 12 }}>Carregando...</p>}

        {historicoEmail && (
          <>
            <p style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 12 }}>
              {historicoEmail.totalEmailsProcessados} e-mails já processados no total ·
              {' '}{historicoEmail.notas.length} notas fiscais nos últimos registros
            </p>
            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0f0f0f', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={th}>Data</th>
                    <th style={th}>Chave de acesso da NF-e</th>
                    <th style={{ ...th, textAlign: 'right' }}>Novos</th>
                    <th style={{ ...th, textAlign: 'right' }}>Atualizados</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoEmail.notas.length === 0 && (
                    <tr><td colSpan={4} style={tdVazio}>Nenhuma nota importada ainda</td></tr>
                  )}
                  {historicoEmail.notas.map(n => (
                    <tr key={n.chave_acesso} style={{ borderTop: '1px solid #1e1e1e' }}>
                      <td style={{ padding: '8px 10px', color: '#ccc' }}>{formatarData(n.processado_em)}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--texto-3)', fontFamily: 'monospace', fontSize: 11.5 }}>{n.chave_acesso || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#3fb95f' }}>{n.itens_novos}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#c9a227' }}>{n.itens_atualizados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </Modal>
  );
}
