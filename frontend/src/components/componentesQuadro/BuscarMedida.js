import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import Modal from '../ui/Modal';
import Select, { Sugestoes } from '../Select';
import { estilos } from '../ui/estilos';
import { pesquisarMedidaComponente } from '../../services/api';
import { FABRICANTES, TIPOS, textoMedidas, linkSeguro } from '../../utils/componentesQuadro';

// Busca a medida oficial de UM componente pela IA (Claude Max primeiro): ela
// procura o datasheet no site do fabricante. O que vier entra no catálogo
// "A conferir" — o administrador abre o link, confere e aprova. Link fora do
// site do fabricante ou medida faltando: o sistema recusa e não grava nada.

export function textoResultado(r) {
  if (!r) return '';
  if (r.situacao === 'encontrado') return 'Achado no site do fabricante — entrou no catálogo como "A conferir".';
  if (r.situacao === 'ja_no_catalogo') return 'Este componente já está no catálogo.';
  return `Não encontrado: ${r.motivo || 'sem documento oficial do fabricante com as três medidas.'}`;
}

export default function BuscarMedida({ fabricantes = FABRICANTES, inicial, onFechar, onAchado }) {
  const [form, setForm] = useState({ fabricante: inicial?.fabricante || '', tipo: inicial?.tipo || 'disjuntor_din', especificacao: inicial?.especificacao || '' });
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function buscar() {
    setBuscando(true);
    setResultado(null);
    try {
      const r = await pesquisarMedidaComponente(form);
      setResultado(r.data);
      if (r.data.situacao === 'encontrado') onAchado?.(r.data.registro);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro na busca da medida', { duration: 9000 });
    } finally {
      setBuscando(false);
    }
  }

  const reg = resultado?.registro;
  const link = linkSeguro(reg?.fonte_url);
  return (
    <Modal titulo="Buscar medida oficial do fabricante" onFechar={onFechar} largura={620}>
      <p style={{ ...estilos.ajuda, marginTop: 0 }}>A IA procura o datasheet ou catálogo no <b>site do fabricante</b> e traz o código de pedido e as medidas
        (largura × altura × profundidade, em mm). Leva de 30 segundos a alguns minutos. O resultado entra como <b>A conferir</b>.</p>
      <Sugestoes id="lista-fabricantes-busca">{fabricantes.map(f => <option key={f} value={f} />)}</Sugestoes>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label style={rotulo}>Fabricante
          <input list="lista-fabricantes-busca" value={form.fabricante} onChange={campo('fabricante')} placeholder="Escolha ou digite" />
        </label>
        <label style={rotulo}>Tipo
          <Select value={form.tipo} onChange={campo('tipo')}>
            {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </label>
      </div>
      <label style={{ ...rotulo, marginBottom: 14 }}>Especificação
        <input value={form.especificacao} maxLength={300} onChange={campo('especificacao')} placeholder='Ex.: "disjuntor 3P 16 A curva C 10 kA" ou o código, se souber' />
      </label>
      {resultado && (
        <div style={{ border: '1px solid var(--borda)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }} data-testid="resultado-busca-medida">
          <div style={{ color: resultado.situacao === 'nao_encontrado' ? '#e0a030' : '#3fb95f', marginBottom: reg ? 6 : 0 }}>{textoResultado(resultado)}</div>
          {reg && (
            <div style={{ color: 'var(--texto-2)', lineHeight: 1.6 }}>
              <b>{reg.fabricante} {reg.referencia}</b>{reg.descricao ? ` — ${reg.descricao}` : ''}<br />
              {textoMedidas(reg)} mm{reg.modulos_din ? ` · ${String(reg.modulos_din).replace('.', ',')} módulo(s) DIN` : ''}
              {link && <> · <a href={link} target="_blank" rel="noopener noreferrer" style={estilos.link}>abrir o datasheet</a></>}
              {reg.fonte_documento && <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>{reg.fonte_documento}</div>}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={estilos.btnSecundario} onClick={onFechar}>Fechar</button>
        <button type="button" style={estilos.btnPrimario} disabled={buscando || !form.fabricante.trim() || !form.especificacao.trim()} onClick={buscar}>
          <Search size={14} /> {buscando ? 'Buscando no site do fabricante…' : 'Buscar'}
        </button>
      </div>
    </Modal>
  );
}

const rotulo = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--texto-3)' };
