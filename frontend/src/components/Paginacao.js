import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginacao({ pagina, totalPaginas, total, onMudarPagina }) {
  if (totalPaginas <= 1) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      gap: 12, padding: '12px 4px', fontSize: 11, color: '#777'
    }}>
      <span>{total} {total === 1 ? 'registro' : 'registros'} · página {pagina} de {totalPaginas}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onMudarPagina(pagina - 1)}
          disabled={pagina <= 1}
          style={{ ...btn, opacity: pagina <= 1 ? 0.4 : 1, cursor: pagina <= 1 ? 'not-allowed' : 'pointer' }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => onMudarPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          style={{ ...btn, opacity: pagina >= totalPaginas ? 0.4 : 1, cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

const btn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 5, color: '#999'
};
