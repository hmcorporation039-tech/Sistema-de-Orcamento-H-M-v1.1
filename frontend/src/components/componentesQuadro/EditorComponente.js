import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Select, { Sugestoes } from '../Select';
import { estilos } from '../ui/estilos';
import { criarComponenteQuadro, atualizarComponenteQuadro } from '../../services/api';
import { FABRICANTES, TIPOS, MONTAGENS, linkSeguro } from '../../utils/componentesQuadro';

// Janela de cadastro/edição de um componente do catálogo de quadros (admin).
// `componente`:
//   - do banco (id): edita — o registro passa a ser "Cadastrado";
//   - do catálogo da skill (id null, origem catalogo_hm): salvar cria um
//     cadastro da H&M que SUBSTITUI o do catálogo para este fabricante + referência;
//   - null: novo.
// Medidas sempre do datasheet do fabricante, em mm, do produto montado.

const CAMPOS_NUMERO = [
  ['polos', 'Polos'], ['corrente_a', 'Corrente nominal (A)'], ['corrente_min_a', 'Corrente mínima da faixa (A)'], ['icu_ka', 'Icu/Icn (kA)'],
  ['sensibilidade_ma', 'Sensibilidade DR (mA)'], ['imax_ka', 'DPS Imax (kA)'], ['in_ka', 'DPS In (kA)'], ['uc_v', 'DPS Uc (V)'],
  ['potencia_kw', 'Potência (kW)'], ['corrente_ac3_a', 'Corrente AC-3 (A)'], ['saida_a', 'Saída da fonte (A)'],
  ['perda_w', 'Perda (W)'], ['consumo_24v_ma', 'Consumo em 24 V (mA)'], ['peso_kg', 'Peso (kg)'],
];
const TEXTO_NUM = (v) => (v == null ? '' : String(v).replace('.', ','));
const paraEnvio = (v) => (v === '' || v == null ? null : String(v).trim());

export default function EditorComponente({ componente, onFechar, onSalvo }) {
  const novo = !componente?.id;
  const sobrepoe = novo && componente?.origem === 'catalogo_hm';
  const [form, setForm] = useState(() => {
    const c = componente || {};
    const f = {
      fabricante: c.fabricante || '', linha: c.linha || '', referencia: c.referencia || '', tipo: c.tipo || 'disjuntor_din',
      descricao: c.descricao || '', curva: c.curva || '', classe_dps: c.classe_dps || '', tensao_bobina: c.tensao_bobina || '',
      largura_mm: TEXTO_NUM(c.largura_mm), altura_mm: TEXTO_NUM(c.altura_mm), profundidade_mm: TEXTO_NUM(c.profundidade_mm),
      modulos_din: TEXTO_NUM(c.modulos_din), montagem: c.montagem || '', fonte_url: c.fonte_url || '', fonte_documento: c.fonte_documento || '',
      obs: c.obs || '', verificado: !!c.verificado && !novo,
      pontos: c.pontos == null ? '' : (typeof c.pontos === 'object' ? JSON.stringify(c.pontos) : String(c.pontos)),
    };
    for (const [k] of CAMPOS_NUMERO) f[k] = TEXTO_NUM(c[k]);
    return f;
  });
  const [salvando, setSalvando] = useState(false);
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function salvar() {
    let pontos = null;
    if (String(form.pontos).trim()) {
      try { pontos = /^\s*\{/.test(form.pontos) ? JSON.parse(form.pontos) : form.pontos; } catch { toast.error('Pontos: use um número (seção do borne) ou {"DI":16}'); return; }
    }
    const dados = {
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? paraEnvio(v) : v])),
      pontos, verificado: !!form.verificado,
    };
    setSalvando(true);
    try {
      const r = novo ? await criarComponenteQuadro(dados) : await atualizarComponenteQuadro(componente.id, dados);
      toast.success(novo ? 'Componente cadastrado' : 'Componente atualizado');
      onSalvo?.(r.data);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar o componente', { duration: 9000 });
    } finally {
      setSalvando(false);
    }
  }

  const link = linkSeguro(form.fonte_url);
  return (
    <Modal titulo={novo ? (sobrepoe ? 'Cadastrar versão da H&M deste componente' : 'Novo componente de quadro') : 'Editar componente de quadro'} onFechar={onFechar} largura={760}>
      {sobrepoe && (
        <p style={estilos.ajuda}>Este componente vem do catálogo embutido na skill (só leitura). Salvar cria um cadastro da H&M com o mesmo fabricante e
          referência, que passa a valer no lugar dele.</p>
      )}
      <p style={{ ...estilos.ajuda, marginTop: 0 }}>Medidas do <b>datasheet ou catálogo do fabricante</b>, em milímetros, com o produto montado: largura (frente,
        ao longo do trilho ou da placa) × altura × profundidade (a partir do trilho/placa). Não use medida de loja nem estimada.</p>
      <Sugestoes id="lista-fabricantes-editor">{FABRICANTES.map(f => <option key={f} value={f} />)}</Sugestoes>
      <div style={grade(3)}>
        <label style={rotulo}>Fabricante *
          <input list="lista-fabricantes-editor" value={form.fabricante} maxLength={80} onChange={campo('fabricante')} placeholder="Escolha ou digite" />
        </label>
        <label style={rotulo}>Tipo *
          <Select value={form.tipo} onChange={campo('tipo')}>
            {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </label>
        <label style={rotulo}>Referência (código de pedido) *
          <input value={form.referencia} maxLength={80} onChange={campo('referencia')} placeholder="Ex.: A9F74316" />
        </label>
        <label style={rotulo}>Linha / série
          <input value={form.linha} maxLength={120} onChange={campo('linha')} placeholder="Ex.: Acti9 iC60N" />
        </label>
        <label style={{ ...rotulo, gridColumn: 'span 2' }}>Descrição
          <input value={form.descricao} maxLength={300} onChange={campo('descricao')} placeholder="Ex.: Disjuntor 3P 16 A curva C 10 kA" />
        </label>
      </div>

      <div style={subtitulo}>Medidas oficiais (mm)</div>
      <div style={grade(5)}>
        <label style={rotulo}>Largura *<input inputMode="decimal" value={form.largura_mm} onChange={campo('largura_mm')} /></label>
        <label style={rotulo}>Altura *<input inputMode="decimal" value={form.altura_mm} onChange={campo('altura_mm')} /></label>
        <label style={rotulo}>Profundidade *<input inputMode="decimal" value={form.profundidade_mm} onChange={campo('profundidade_mm')} /></label>
        <label style={rotulo}>Módulos DIN<input inputMode="decimal" value={form.modulos_din} onChange={campo('modulos_din')} placeholder="ex.: 3" /></label>
        <label style={rotulo}>Montagem
          <Select value={form.montagem} onChange={campo('montagem')}>
            <option value="">—</option>
            {MONTAGENS.map(m => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </Select>
        </label>
      </div>

      <div style={subtitulo}>Dados técnicos (o que o documento trouxer)</div>
      <div style={grade(4)}>
        {CAMPOS_NUMERO.map(([k, r]) => (
          <label key={k} style={rotulo}>{r}<input inputMode="decimal" value={form[k]} onChange={campo(k)} /></label>
        ))}
        <label style={rotulo}>Curva<input value={form.curva} maxLength={10} onChange={campo('curva')} placeholder="B, C, D…" /></label>
        <label style={rotulo}>Classe do DPS<input value={form.classe_dps} maxLength={10} onChange={campo('classe_dps')} placeholder="I, II, I+II" /></label>
        <label style={rotulo}>Tensão da bobina<input value={form.tensao_bobina} maxLength={40} onChange={campo('tensao_bobina')} placeholder="24 Vcc, 220 Vca" /></label>
        <label style={rotulo}>Pontos / seção<input value={form.pontos} onChange={campo('pontos')} placeholder='{"DI":16} ou 2,5' /></label>
      </div>

      <div style={subtitulo}>Fonte (documento do fabricante)</div>
      <div style={grade(2)}>
        <label style={rotulo}>Link do datasheet/catálogo
          <input value={form.fonte_url} maxLength={1000} onChange={campo('fonte_url')} placeholder="https://site-do-fabricante/…pdf" />
        </label>
        <label style={rotulo}>Documento (nome, edição, página)
          <input value={form.fonte_documento} maxLength={300} onChange={campo('fonte_documento')} placeholder="Ex.: Catálogo Acti9 2023, p. 45" />
        </label>
      </div>
      {link && <p style={{ fontSize: 12, margin: '-4px 0 10px' }}><a href={link} target="_blank" rel="noopener noreferrer" style={estilos.link}>Abrir o documento informado</a></p>}
      <label style={{ ...rotulo, marginBottom: 12 }}>Observações
        <textarea rows={2} maxLength={2000} value={form.obs} onChange={campo('obs')} placeholder="Norma da capacidade de interrupção, condição da medida…" />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto)', marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={form.verificado} onChange={campo('verificado')} />
        Conferi as medidas no documento do fabricante (marca como <b>Verificado</b>)
      </label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={estilos.btnSecundario} onClick={onFechar}>Cancelar</button>
        <button type="button" style={estilos.btnPrimario} disabled={salvando} onClick={salvar}><Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </Modal>
  );
}

const rotulo = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--texto-3)' };
const grade = (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: 10, marginBottom: 12 });
const subtitulo = { fontSize: 12.5, fontWeight: 700, color: 'var(--ouro-claro, #c9a227)', margin: '4px 0 8px' };
