import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Copy, ExternalLink } from 'lucide-react';
import { getNotaFiscal } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { formatarCtribNac } from '../../components/fiscal/BuscaCodigo';
import { estilos } from '../../components/ui/estilos';
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../../utils/format';
import { Linha, Secao } from './comum';

const EMISSOR_NACIONAL = 'https://www.nfse.gov.br/EmissorNacional';

// ── Emitir ────────────────────────────────────────────────────────────────────

export function ModalEmitir({ nota, onFechar, onImportar }) {
  const [n, setN] = useState(null);
  useEffect(() => { getNotaFiscal(nota.id).then(r => setN(r.data)).catch(() => toast.error('Erro ao abrir o rascunho')); }, [nota.id]);
  const copiar = (texto, oque) => navigator.clipboard.writeText(String(texto || '')).then(() => toast.success(`${oque} copiado`)).catch(() => toast.error('Não deu para copiar'));

  const t = n?.tomador || {};
  const endLinha1 = [t.logradouro, t.numero, t.complemento].filter(Boolean).join(', ');
  const cepFmt = t.cep ? `${t.cep.slice(0, 5)}-${t.cep.slice(5)}` : '';
  const cidadeUf = [t.municipio, t.uf].filter(Boolean).join('/');
  const retFed = n ? [
    ['PIS', n.valor_pis], ['COFINS', n.valor_cofins], ['INSS', n.valor_inss],
    ['IR', n.valor_ir], ['CSLL', n.valor_csll],
  ].filter(([, v]) => Number(v) > 0).map(([r, v]) => `${r} ${formatarMoeda(v)}`).join(' · ') : '';

  return (
    <Modal titulo="Pré-visualização · Emitir nota" onFechar={onFechar} largura={700}>
      <p style={estilos.ajuda}>A emissão direta pelo sistema entra quando o <b>certificado digital A1</b> da H&M for instalado. Até lá:</p>
      <ol style={{ ...estilos.ajuda, paddingLeft: 20, marginBottom: 14 }}>
        <li>Abra o <a href={EMISSOR_NACIONAL} target="_blank" rel="noreferrer" style={estilos.link}>Emissor Nacional <ExternalLink size={11} /></a> e entre com o gov.br da empresa.</li>
        <li>Confira os dados abaixo e use os botões para copiar cada campo.</li>
        <li>Após emitir, baixe o <b>XML</b> e use <b>Importar XML</b> aqui para registrar a nota.</li>
      </ol>

      {!n && <p style={{ ...estilos.ajuda, textAlign: 'center', padding: '12px 0' }}>Carregando…</p>}
      {n && (
        <div style={{ display: 'grid', gap: 10 }}>
          <Secao titulo="Tomador (quem paga)">
            <Linha rotulo="Nome / Razão social" valor={t.nome || '—'} />
            <Linha rotulo="CPF / CNPJ" valor={formatarCpfCnpj(t.documento || '')} copiar={() => copiar(t.documento, 'CPF/CNPJ')} />
            {t.inscricao_municipal && <Linha rotulo="Insc. municipal" valor={t.inscricao_municipal} copiar={() => copiar(t.inscricao_municipal, 'Insc. municipal')} />}
            {cepFmt && <Linha rotulo="CEP" valor={cepFmt} copiar={() => copiar(t.cep, 'CEP')} />}
            {endLinha1 && <Linha rotulo="Logradouro / nº" valor={endLinha1} copiar={() => copiar(endLinha1, 'Endereço')} />}
            {t.bairro && <Linha rotulo="Bairro" valor={t.bairro} copiar={() => copiar(t.bairro, 'Bairro')} />}
            {cidadeUf && <Linha rotulo="Município / UF" valor={cidadeUf} copiar={() => copiar(cidadeUf, 'Município')} />}
            {t.codigo_municipio && <Linha rotulo="Cód. IBGE" valor={t.codigo_municipio} copiar={() => copiar(t.codigo_municipio, 'Cód. IBGE')} />}
            {t.email && <Linha rotulo="E-mail" valor={t.email} copiar={() => copiar(t.email, 'E-mail')} />}
          </Secao>

          <Secao titulo="Serviço e valores">
            <Linha rotulo="Cód. tributação" valor={formatarCtribNac(n.ctrib_nac)} copiar={() => copiar(formatarCtribNac(n.ctrib_nac), 'Código')} />
            <Linha rotulo="Competência" valor={formatarData(n.competencia)} />
            <Linha rotulo="Valor dos serviços" valor={formatarMoeda(n.valor_servicos)} copiar={() => copiar(Number(n.valor_servicos).toFixed(2).replace('.', ','), 'Valor')} />
            {n.aliquota_iss != null && <Linha rotulo="Alíquota ISS" valor={`${String(n.aliquota_iss).replace('.', ',')}%`} />}
            {n.iss_retido && <Linha rotulo="ISS" valor="Retido pelo tomador" />}
            {retFed && <Linha rotulo="Ret. federais" valor={retFed} />}
          </Secao>

          <Secao titulo="Discriminação do serviço">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ whiteSpace: 'pre-wrap', flex: 1, fontSize: 13, lineHeight: 1.5 }}>{n.discriminacao}</span>
              <button type="button" onClick={() => copiar(n.discriminacao, 'Discriminação')} style={{ ...estilos.btnIcone, width: 26, height: 26, flexShrink: 0 }} title="Copiar discriminação"><Copy size={12} /></button>
            </div>
          </Secao>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onFechar} style={estilos.btnSecundario}>Fechar</button>
        <button type="button" onClick={onImportar} style={estilos.btnPrimario}><Upload size={13} /> Já emiti — importar XML</button>
      </div>
    </Modal>
  );
}
