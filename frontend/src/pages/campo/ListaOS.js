// "Minhas OS": hoje / próximas / concluídas, com pendências de envio por OS.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UploadCloud, MapPin } from 'lucide-react';
import { useCampo } from './CampoApp';
import { classificarOS, progresso, atrasada, ROTULO_STATUS, ROTULO_TIPO_OS } from './operacoes';
import { COR, COR_STATUS, Botao, Cartao, Selo, formatarData } from './componentes';

const ABAS = [['hoje', 'Hoje'], ['proximas', 'Próximas'], ['concluidas', 'Concluídas']];

export function CartaoOS({ os }) {
  const p = progresso(os);
  const [fundo, texto] = COR_STATUS[os.status] || COR_STATUS.aberta;
  const pend = os.pendencias?.total || 0;
  return (
    <Link to={`/campo/os/${os.uuid}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} data-testid="cartao-os">
      <Cartao style={{ borderLeft: `6px solid ${os.status === 'em_execucao' ? COR.ouro : os.status === 'concluida' ? COR.verde : COR.borda}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: COR.texto3, fontWeight: 700 }}>
            {os.numero || 'OS nova (ainda não enviada)'} · {ROTULO_TIPO_OS[os.tipo] || os.tipo}
          </div>
          <Selo cor={fundo} texto={texto}>{ROTULO_STATUS[os.status] || os.status}</Selo>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, margin: '6px 0 4px', color: COR.texto }}>{os.titulo}</div>
        {os.obra && (
          <div style={{ color: COR.texto2, fontSize: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
            <MapPin size={16} style={{ flex: '0 0 auto' }} />
            <span>{os.obra.nome}{os.obra.cliente_nome ? ` — ${os.obra.cliente_nome}` : ''}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: atrasada(os) ? '#ff8a8a' : COR.texto2, fontWeight: 700 }}>
            {atrasada(os) ? 'Atrasada · ' : ''}{formatarData(os.agendada_para)}
          </span>
          {p.total > 0 && <span style={{ fontSize: 15, color: COR.texto2 }}>· checklist {p.feitos}/{p.total}</span>}
          {pend > 0 && (
            <Selo cor={COR.aviso} texto="#000" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <UploadCloud size={15} /> {pend} a enviar
            </Selo>
          )}
          {os.nao_aceita
            ? <Selo cor={COR.vermelho}>não aceita pelo servidor</Selo>
            : os.pendencias?.recusadas > 0 && <Selo cor={COR.vermelho}>{os.pendencias.recusadas} recusada(s)</Selo>}
        </div>
      </Cartao>
    </Link>
  );
}

export default function ListaOS() {
  const { visoes, dados, estadoSync } = useCampo();
  const navigate = useNavigate();
  const grupos = useMemo(() => classificarOS(visoes, dados.hoje()), [visoes, dados]);
  const [aba, setAba] = useState(() => (grupos.hoje.length || !grupos.proximas.length ? 'hoje' : 'proximas'));
  const lista = grupos[aba];
  return (
    <div style={{ paddingTop: 12 }}>
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
        {ABAS.map(([chave, rotulo]) => (
          <button key={chave} type="button" role="tab" aria-selected={aba === chave} onClick={() => setAba(chave)}
            style={{
              minHeight: 50, borderRadius: 10, fontSize: 16, fontWeight: 800,
              background: aba === chave ? COR.ouro : COR.superficie, color: aba === chave ? '#000' : COR.texto,
              border: `2px solid ${aba === chave ? COR.ouro : COR.borda}`,
            }}>
            {rotulo} ({grupos[chave].length})
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <Cartao style={{ textAlign: 'center', color: COR.texto2 }}>
          {estadoSync?.executando ? 'Baixando suas ordens de serviço…'
            : aba === 'hoje' ? 'Nenhuma OS para hoje.' : aba === 'proximas' ? 'Nenhuma OS agendada.' : 'Nenhuma OS concluída nos últimos dias.'}
        </Cartao>
      )}
      {lista.map(os => <CartaoOS key={os.uuid} os={os} />)}

      <Botao grande onClick={() => navigate('/campo/nova')} style={{ width: '100%', marginTop: 8 }}>
        <Plus size={22} /> Nova OS (visita)
      </Botao>
    </div>
  );
}
