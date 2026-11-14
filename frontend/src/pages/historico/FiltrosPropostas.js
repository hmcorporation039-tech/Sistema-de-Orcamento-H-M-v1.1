import { Search, FileDown, FileSpreadsheet } from 'lucide-react';
import Select from '../../components/Select';
import { ATALHOS_PERIODO, Campo, rotulo, card, btnPrimario, btnSecundario } from './apoio';

// Filtros e exportação (antigo Relatórios) — valem para a lista e para os totais.
// Os atalhos de período marcam o que está ativo comparando com as datas escolhidas.
export default function FiltrosPropostas({
  dataInicio, setDataInicio, dataFim, setDataFim, statusFiltro, setStatusFiltro, busca, setBusca,
  exportando, semPropostas, onExportar,
}) {
  function aplicarAtalho(atalho) {
    const [ini, fim] = atalho.calcular();
    setDataInicio(ini);
    setDataFim(fim);
  }

  function atalhoAtivo(atalho) {
    const [ini, fim] = atalho.calcular();
    return ini === dataInicio && fim === dataFim;
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Campo label="Data início" largura={150}>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </Campo>
        <Campo label="Data fim" largura={150}>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </Campo>
        <Campo label="Status" largura={150}>
          <Select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="Ativa">Ativa</option>
            <option value="Aprovada">Aprovada</option>
            <option value="Recusada">Recusada</option>
            <option value="Cancelada">Cancelada</option>
          </Select>
        </Campo>
        <Campo label="Buscar" flexivel>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--texto-3)' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Número, cliente ou local..."
              aria-label="Buscar proposta"
              style={{ paddingLeft: 30 }}
            />
          </div>
        </Campo>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onExportar('csv')}
            disabled={!!exportando || semPropostas}
            style={btnSecundario}
          >
            <FileSpreadsheet size={13} /> {exportando === 'csv' ? 'Gerando...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => onExportar('pdf')}
            disabled={!!exportando || semPropostas}
            style={btnPrimario}
          >
            <FileDown size={13} /> {exportando === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        <span style={{ ...rotulo, marginBottom: 0, marginRight: 4 }}>Período:</span>
        {ATALHOS_PERIODO.map(a => {
          const ativo = atalhoAtivo(a);
          return (
            <button
              key={a.rotulo}
              onClick={() => aplicarAtalho(a)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: ativo ? '1px solid #c9a227' : '1px solid #2a2a2a',
                background: ativo ? '#c9a227' : 'transparent',
                color: ativo ? '#000' : '#999',
              }}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
