import ObraSelect from '../../components/ObraSelect';
import { Sugestoes } from '../../components/Select';
import { Campo } from '../../components/ui/estilos';
import { card } from './estilos';

// Dados gerais da proposta: cliente, data, validade, tipo, porte, responsável, obra, local,
// escopo, condições de pagamento e observações.
export default function DadosGerais({ clienteResolvido, clientes, form, setForm }) {
  return (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Campo label="Cliente *">
          <input
            list="clientes-lista"
            value={form.cliente_nome}
            onChange={e => setForm({ ...form, cliente_nome: e.target.value })}
            placeholder="Nome do cliente"
          />
          <Sugestoes id="clientes-lista">
            {clientes.map(c => <option key={c.id} value={c.nome} />)}
          </Sugestoes>
        </Campo>
        <Campo label="Data">
          <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
        </Campo>
        <Campo label="Validade (dias)">
          <input type="number" min="1" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
        </Campo>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Campo label="Tipo">
          <input list="tipos-lista" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} placeholder="Instalação, Manutenção..." />
          <Sugestoes id="tipos-lista">
            <option value="Instalação" /><option value="Manutenção" /><option value="Reforma" /><option value="Projeto" />
          </Sugestoes>
        </Campo>
        <Campo label="Porte">
          <input list="portes-lista" value={form.porte} onChange={e => setForm({ ...form, porte: e.target.value })} placeholder="Pequeno, Médio, Grande" />
          <Sugestoes id="portes-lista">
            <option value="Pequeno" /><option value="Médio" /><option value="Grande" />
          </Sugestoes>
        </Campo>
        <Campo label="Responsável técnico">
          <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
        </Campo>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Campo label="Obra">
          <ObraSelect
            value={form.obra_id}
            clienteId={clienteResolvido?.id || null}
            clienteNome={form.cliente_nome}
            onChange={(id, obra) => setForm(f => ({
              ...f, obra_id: id,
              // obra escolhida numa proposta ainda sem cliente: traz o cliente da obra
              cliente_nome: f.cliente_nome.trim() || !obra?.cliente_nome ? f.cliente_nome : obra.cliente_nome,
            }))}
          />
        </Campo>
        <Campo label="Local da obra">
          <input value={form.local_obra} onChange={e => setForm({ ...form, local_obra: e.target.value })} />
        </Campo>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Campo label="Escopo">
          <textarea rows={3} value={form.escopo} onChange={e => setForm({ ...form, escopo: e.target.value })} placeholder="O que está sendo executado/fornecido — aparece logo após a saudação no PDF" />
        </Campo>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo label="Condições de pagamento">
          <textarea rows={3} value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })} />
        </Campo>
        <Campo label="Observações">
          <textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas gerais — aparece logo após as condições de pagamento no PDF" />
        </Campo>
      </div>
    </div>
  );
}
