import { useState, useEffect } from 'react';
import { getAprendizadoOrcamento } from '../services/api';
import { formatarMoeda } from '../utils/format';
import { estilos } from '../components/ui/estilos';

// O que o sistema já sabe ORÇAR em cada disciplina (services/aprendizadoOrcamento.js, 06/11/2026): aprendido com as
// propostas aprovadas — o preço praticado de cada serviço e os itens que a H&M sempre acrescenta (com a quantidade
// por ponto). É o que deixa o "Gerar orçamento" da análise e do projeto sair pronto sem IA. Separado do aprendizado
// de desenho (Aprendizado), que é sobre ler os projetos.
const COR = { boa: '#81c784', aprendendo: '#d4b85a', pouca: 'var(--texto-3)' };
const ROTULO = { boa: 'Orça sozinho', aprendendo: 'Aprendendo', pouca: 'Pouca base' };

export default function AprendizadoOrcamento() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    getAprendizadoOrcamento().then(r => setDados(r.data || [])).catch(e => setErro(e.response?.data?.erro || 'Não foi possível carregar.'));
  }, []);
  if (erro) return <div style={estilos.card}>{erro}</div>;
  if (!dados) return <div style={estilos.card}>Carregando…</div>;
  return (
    <div>
      <div style={estilos.card}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>O que o sistema já sabe orçar</h3>
        <p style={{ ...estilos.ajuda, margin: 0 }}>
          Aprendido com as propostas <b>aprovadas</b> dos últimos 2 anos, por disciplina. Ao gerar um orçamento (da análise ou do projeto),
          o serviço sem preço recebe o preço praticado (confirmado quando veio de 2 ou mais propostas no último ano) e os itens que a H&M
          sempre acrescenta na disciplina entram como sugestão, <b>a cotar</b>. Quanto mais propostas aprovadas, menos o orçamento depende de IA.
        </p>
      </div>
      {dados.length === 0 && <div style={estilos.card}>Ainda não há propostas aprovadas com itens por disciplina. Aprove propostas geradas pela análise ou pelo projeto para o sistema aprender.</div>}
      {dados.map(d => (
        <div key={d.disciplina} style={estilos.card}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: 14.5 }}>{d.nome}</h4>
            <span style={{ fontSize: 12, fontWeight: 600, color: COR[d.autonomia] }}>{ROTULO[d.autonomia]}</span>
            <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
              {d.propostas} proposta(s) aprovada(s) · {d.itensConhecidos} itens conhecidos · {d.servicosComPreco} serviços e {d.materiaisComPreco} materiais com preço · {d.precosQueConfirmam} preço(s) que confirmam sozinhos
            </span>
          </div>
          {d.itensQueAcompanham.length > 0 && (
            <div style={{ ...estilos.caixaTabela, marginTop: 10 }}>
              <table style={estilos.tabela}>
                <thead><tr><th style={estilos.th}>Item que sempre acompanha</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Em</th><th style={estilos.th}>Por ponto</th><th style={estilos.th}>Preço praticado</th></tr></thead>
                <tbody>
                  {d.itensQueAcompanham.map((it, i) => (
                    <tr key={i} style={estilos.linhaTabela}>
                      <td style={estilos.td}>{it.descricao}</td>
                      <td style={estilos.td}>{it.servico ? 'Serviço' : 'Material'}</td>
                      <td style={estilos.td}>{it.ocorrencias} de {d.propostas}</td>
                      <td style={estilos.td}>{it.porPonto != null ? `${String(it.porPonto).replace('.', ',')} ${it.unidade || ''}` : '—'}</td>
                      <td style={estilos.td}>{formatarMoeda(it.preco, { vazio: '—' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
