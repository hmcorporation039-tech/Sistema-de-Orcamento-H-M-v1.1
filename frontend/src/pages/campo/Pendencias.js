// O que o servidor recusou (erro de regra): não é reenviado sozinho. O técnico
// vê o motivo e decide descartar ou tentar de novo (depois de o escritório
// corrigir, por exemplo).
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { useCampo } from './CampoApp';
import { COR, Botao, Cartao } from './componentes';

const ROTULO_OP = {
  criar_os: 'Criar OS', iniciar: 'Iniciar', responder: 'Resposta do checklist', item_extra: 'Item extra',
  observacao: 'Observação final', assinar: 'Assinatura', concluir: 'Concluir', foto: 'Foto',
};

export default function Pendencias() {
  const navigate = useNavigate();
  const { resumo, visoes, dados } = useCampo();
  const lista = resumo?.recusadas || [];
  return (
    <div style={{ paddingTop: 12 }}>
      <Botao variante="contorno" onClick={() => navigate('/campo/')} style={{ marginBottom: 12 }}><ArrowLeft size={20} />Minhas OS</Botao>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Recusadas pelo servidor ({lista.length})</h1>
      {lista.length === 0 && <Cartao>Nada recusado.</Cartao>}
      {lista.map(r => {
        const os = visoes.find(v => v.uuid === r.os_uuid);
        if (r.tipo === 'os') {
          // criação recusada: a OS inteira (criação + o que foi feito nela) vai ou sai junto
          const titulo = os?.titulo || r.titulo || 'OS nova';
          return (
            <Cartao key={`os-${r.chave}`} style={{ borderColor: COR.vermelho }} data-testid="recusada-os">
              <div style={{ fontWeight: 800, fontSize: 18 }}>OS não aceita pelo servidor</div>
              <div style={{ color: COR.texto2 }}>{titulo}{os?.obra ? ` — ${os.obra.nome}` : ''}</div>
              <div style={{ color: '#ff8a8a', fontWeight: 700, margin: '8px 0' }}>{r.erro || 'Recusada.'}</div>
              <div style={{ color: COR.texto2, fontSize: 15, marginBottom: 8 }}>
                Guardado no aparelho: {r.operacoes} alteração(ões) e {r.fotos} foto(s) desta OS.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Botao variante="contorno" style={{ flex: 1 }} onClick={() => dados.tentarDeNovo(r)}><RotateCcw size={18} />Tentar de novo</Botao>
                <Botao variante="vermelho" style={{ flex: 1 }}
                  onClick={() => { if (window.confirm(`Descartar a OS "${titulo}" com ${r.operacoes} alteração(ões) e ${r.fotos} foto(s)? Isso não volta.`)) dados.descartarRecusada(r); }}>
                  <Trash2 size={18} />Descartar
                </Botao>
              </div>
              {os && <Botao variante="contorno" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate(`/campo/os/${os.uuid}`)}>Abrir a OS</Botao>}
            </Cartao>
          );
        }
        return (
          <Cartao key={`${r.tipo}-${r.chave}`} style={{ borderColor: COR.vermelho }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{ROTULO_OP[r.descricao] || r.descricao}</div>
            <div style={{ color: COR.texto2 }}>{os ? `${os.numero || 'OS nova'} — ${os.titulo}` : 'OS não encontrada neste aparelho'}</div>
            <div style={{ color: '#ff8a8a', fontWeight: 700, margin: '8px 0' }}>{r.erro || 'Recusada.'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Botao variante="contorno" style={{ flex: 1 }} onClick={() => dados.tentarDeNovo(r)}><RotateCcw size={18} />Tentar de novo</Botao>
              <Botao variante="vermelho" style={{ flex: 1 }} onClick={() => { if (window.confirm('Descartar? Isso não volta.')) dados.descartarRecusada(r); }}>
                <Trash2 size={18} />Descartar
              </Botao>
            </div>
          </Cartao>
        );
      })}
    </div>
  );
}
