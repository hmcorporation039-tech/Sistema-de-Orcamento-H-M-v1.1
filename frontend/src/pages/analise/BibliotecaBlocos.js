import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Upload } from 'lucide-react';
import { exportarBibliotecaBlocos, importarBibliotecaBlocos } from '../../services/api';
import { mensagemDeErro } from '../../utils/download';
import { hojeBrasilia } from '../../utils/format';
import { estilos } from '../../components/ui/estilos';

// Biblioteca de blocos (fase 3, CAD-08): o que o sistema aprendeu das confirmações do Mapa do CAD (pela medida real e
// pelo escritório do carimbo), para levar a outra instalação. Até a 2.47 ficava no rodapé do Mapa do CAD; na 2.48 foi
// para o "⋯ Mais" da análise — é de uso raro e não é da análise aberta, é do sistema todo.
export default function BibliotecaBlocos() {
  const [ocupado, setOcupado] = useState(false);

  async function exportar() {
    setOcupado(true);
    try {
      const r = await exportarBibliotecaBlocos();
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `biblioteca-blocos-hm-${hojeBrasilia()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${r.data.linhas.length} linha(s) da biblioteca exportada(s)`);
    } catch (err) {
      toast.error(await mensagemDeErro(err, 'Não consegui exportar a biblioteca de blocos'), { duration: 8000 });
    } finally { setOcupado(false); }
  }

  async function importar(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setOcupado(true);
    try {
      const json = JSON.parse(await arquivo.text());
      const r = await importarBibliotecaBlocos(json);
      toast.success(`Biblioteca importada: ${r.data.gravadas} linha(s) gravada(s), ${r.data.mantidas} mantida(s) (já conferidas aqui)${r.data.recusadas ? `, ${r.data.recusadas} recusada(s)` : ''}.`, { duration: 9000 });
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : await mensagemDeErro(err, 'Não consegui importar a biblioteca (só administrador)'), { duration: 9000 });
    } finally { setOcupado(false); }
  }

  return (
    <div data-testid="biblioteca-blocos">
      <p style={estilos.ajuda}>
        O que o sistema aprendeu das confirmações do Mapa do CAD, pela medida real do símbolo e pelo escritório do carimbo.
        Exporte para levar a outra instalação; ao importar, o que já foi conferido aqui não é trocado (só administrador).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={estilos.btnSecundario} onClick={exportar} disabled={ocupado} data-testid="exportar-biblioteca">
          <Download size={13} /> Exportar JSON
        </button>
        <label style={{ ...estilos.btnSecundario, cursor: ocupado ? 'default' : 'pointer' }}>
          <Upload size={13} /> Importar JSON
          <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importar} disabled={ocupado} data-testid="importar-biblioteca" />
        </label>
      </div>
    </div>
  );
}
