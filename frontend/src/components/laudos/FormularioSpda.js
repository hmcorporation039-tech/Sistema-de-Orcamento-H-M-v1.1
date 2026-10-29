import { Trash2 } from 'lucide-react';
import { Campo, Selecao, Marcador, Grade, Secao, TabelaEditavel, Nota, btnAdicionar } from './campos';
import { ChecklistEditor, FotosInspecao, resumoChecklist } from './inspecaoUi';

// Formulário do laudo/projeto de SPDA — mesmos campos do JSON da skill
// (skills/spda/referencia/esquema-dados.md). As opções abaixo são as chaves
// aceitas pelo motor de cálculo (skills/spda/scripts/lib/tabelas.js).

const op = (pares) => pares.map(([valor, rotulo]) => ({ valor, rotulo }));

const OPCOES = {
  np: op([['I', 'NP I'], ['II', 'NP II'], ['III', 'NP III'], ['IV', 'NP IV']]),
  localizacao: op([['isolada', 'Isolada (sem objetos próximos / objetos mais baixos)'], ['cercada_mesma_altura', 'Cercada por objetos da mesma altura'], ['cercada_mais_altos', 'Cercada por objetos mais altos'], ['topo_colina', 'Isolada no topo de colina']]),
  tipo_construcao: op([['concreto_armado', 'Concreto armado'], ['metalica', 'Estrutura metálica'], ['simples', 'Madeira ou alvenaria simples']]),
  ambiente: op([['urbano', 'Urbano'], ['urbano_alto', 'Urbano com prédios > 20 m'], ['suburbano', 'Suburbano'], ['rural', 'Rural']]),
  material_captacao: op([['cobre_35', 'Cobre nu 35 mm²'], ['aluminio_70', 'Alumínio 70 mm²'], ['aco_galvanizado_50', 'Aço zincado 50 mm²'], ['aco_cobreado_35', 'Aço cobreado 35 mm²']]),
  material_aterramento: op([['cobre_50', 'Cobre nu 50 mm²'], ['aco_galvanizado_90', 'Fita de aço zincado 90 mm²'], ['aco_cobreado_50', 'Aço cobreado 50 mm²']]),
  aterramento: op([['anel', 'Anel'], ['fundacao', 'Fundação'], ['existente', 'Existente']]),
  tipoLinha: op([['energia', 'Energia'], ['sinal', 'Sinal (telecom/dados)']]),
  instalacao: op([['enterrada', 'Enterrada'], ['aerea', 'Aérea'], ['enterrada_malha', 'Enterrada dentro de malha']]),
  ct: op([['bt_ou_sinal', 'BT ou sinal'], ['at_trafo', 'AT com transformador']]),
  cld_cli: op([['enterrada_nao_blindada', 'Enterrada não blindada'], ['aerea_nao_blindada', 'Aérea não blindada'], ['neutro_multiaterrado', 'Energia com neutro multiaterrado'], ['blindada_ligada_bep', 'Blindada, blindagem ligada ao BEP'], ['enterrada_blindada_nao_ligada', 'Enterrada blindada, blindagem não ligada'], ['aerea_blindada_nao_ligada', 'Aérea blindada, blindagem não ligada'], ['duto_protecao', 'Em duto/eletroduto metálico ligado ao BEP'], ['fibra_optica', 'Fibra óptica (sem metal)'], ['interface_isolante', 'Interface isolante']]),
  blindagem_rs: op([['nao_blindada', 'Não blindada'], ['rs_5_20', 'Blindagem 5–20 Ω/km'], ['rs_1_5', 'Blindagem 1–5 Ω/km'], ['rs_ate_1', 'Blindagem ≤ 1 Ω/km']]),
  dps: op([['nenhum', 'Sem DPS'], ['III-IV', 'NP III-IV'], ['II', 'NP II'], ['I', 'NP I'], ['melhor_I', 'Melhor que NP I (0,005)'], ['melhor_I_max', 'Melhor que NP I (0,001)']]),
  ocupacao: op([['outros', 'Outros (residencial etc.)'], ['industrial_comercial', 'Industrial / comercial'], ['hotel_escola_civico', 'Hotel, escola, edifício cívico'], ['entretenimento_igreja_museu', 'Entretenimento, igreja, museu'], ['hospital_geral', 'Hospital — demais áreas'], ['hospital_uti_cc', 'Hospital — UTI e centro cirúrgico'], ['explosao', 'Risco de explosão']]),
  piso: op([['terra_concreto', 'Terra / concreto'], ['marmore_ceramica', 'Mármore / cerâmica'], ['brita_carpete', 'Brita / carpete'], ['asfalto_linoleo_madeira', 'Asfalto / linóleo / madeira']]),
  carga_incendio: op([['incendio_normal', 'Incêndio normal (400–800 MJ/m²)'], ['incendio_alto', 'Incêndio alto (≥ 800 MJ/m²)'], ['incendio_baixo', 'Incêndio baixo (< 400 MJ/m²)'], ['explosao_zona_0_20', 'Explosão — zonas 0/20'], ['explosao_zona_1_21', 'Explosão — zonas 1/21'], ['explosao_zona_2_22', 'Explosão — zonas 2/22'], ['nenhum', 'Sem risco']]),
  protecao_incendio: op([['nenhuma', 'Nenhuma'], ['manual', 'Manual (extintores, hidrantes, alarme manual)'], ['automatica', 'Automática (sprinkler, alarme automático)']]),
  perigo_especial: op([['nenhum', 'Nenhum'], ['dificuldade_evacuacao', 'Dificuldade de evacuação (hospital)'], ['panico_baixo', 'Pânico baixo (≤ 2 andares, ≤ 100 pessoas)'], ['panico_medio', 'Pânico médio (100–1 000 pessoas)'], ['panico_alto', 'Pânico alto (> 1 000 pessoas)']]),
  ks3: op([['sem_preocupacao', 'Sem cuidado no roteamento'], ['evitando_lacos_grandes', 'Evitando laços grandes'], ['evitando_lacos_medios', 'Evitando laços médios'], ['evitando_lacos_pequenos', 'Evitando laços pequenos'], ['blindado', 'Cabo blindado / conduto metálico']]),
  tipoInspecao: op([['periodica', 'Periódica (7.3.2 f)'], ['apos_instalacao', 'Após a instalação / as built (7.3.2 b)'], ['durante_instalacao', 'Durante a instalação (7.3.2 a)'], ['alteracao', 'Após alteração (7.3.2 c/d)'], ['descarga', 'Após descarga atmosférica (7.3.2 e)'], ['provisorio', 'SPDA provisório de obra']]),
  situacao: op([['NV', 'NV — não verificado'], ['C', 'C — conforme'], ['NC', 'NC — não conforme'], ['NA', 'NA — não aplicável']]),
  prioridade: op([['P1', 'P1 — 48 h'], ['P2', 'P2 — 30 dias'], ['P3', 'P3 — 90 dias'], ['P4', 'P4 — manutenção']]),
  ensaio: op([['F.1', 'F.1 armaduras (cruzado)'], ['F.2', 'F.2 pilar (topo × base)'], ['F.3', 'F.3 fundação'], ['F.4', 'F.4 captação × BEP'], ['F.5', 'F.5 descida não natural'], ['F.6', 'F.6 eletrodo não natural'], ['F.7', 'F.7 ligação equipotencial']]),
  materialCondutor: op([['', '—'], ['cobre', 'Cobre'], ['aluminio', 'Alumínio'], ['aco_galvanizado', 'Aço galvanizado'], ['aco_cobreado', 'Aço cobreado']]),
  uw: op([['1', '1 kV'], ['1.5', '1,5 kV'], ['2.5', '2,5 kV'], ['4', '4 kV'], ['6', '6 kV']]),
  tipoLaudo: op([['spda_aterramento', 'SPDA e aterramento (com análise de risco)'], ['aterramento', 'Somente aterramento']]),
  // onde a foto entra no laudo (skills/spda/scripts/lib/doc-laudo.js, CATEGORIAS_FOTO)
  categoriaFoto: op([['', 'Automática (ensaio se tiver ensaio)'], ['ensaio', 'Ensaio — Anexo 01'], ['geral', 'Inspeção — Anexo 01'], ['localizacao', 'Localização — seção 1'], ['prancha', 'Prancha / as built — seção 10'], ['metodo', 'Metodologia — seção 8'], ['calibracao', 'Certificado de calibração — Anexo 02'], ['art', 'ART — Anexo 03']]),
};
const UFS = op(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(u => [u, u]));

// Atualiza um caminho "a.b.c" sem mutar o objeto original
function definir(obj, caminho, valor) {
  const partes = caminho.split('.');
  const raiz = { ...obj };
  let atual = raiz;
  for (let i = 0; i < partes.length - 1; i++) {
    atual[partes[i]] = { ...(atual[partes[i]] || {}) };
    atual = atual[partes[i]];
  }
  atual[partes[partes.length - 1]] = valor;
  return raiz;
}

// tipo (2.1): 'projeto' esconde as seções de inspeção; 'laudo' mostra tudo
export default function FormularioSpda({ dados, onChange, checklistBase, fotos, urlsFotos, onEnviarFotos, onRemoverFoto, tipo = 'laudo' }) {
  const d = dados || {};
  const v = (caminho) => caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
  const set = (caminho) => (valor) => onChange(atual => definir(atual, caminho, valor));
  const insp = d.inspecao || {};
  const zonas = d.zonas || [];
  const nomesZonas = zonas.map(z => z.nome).filter(Boolean);

  return (
    <div>
      <Secao titulo="1. Identificação" abertaInicial resumo={d.cliente?.nome || ''}>
        <Grade colunas={4}>
          {tipo !== 'projeto' && (
            <Selecao rotulo="Tipo de laudo" valor={v('meta.tipo_laudo') || 'spda_aterramento'} onChange={set('meta.tipo_laudo')} opcoes={OPCOES.tipoLaudo} largura="inteira" />
          )}
          <Campo rotulo="Cliente (razão social)" valor={v('cliente.nome')} onChange={set('cliente.nome')} />
          <Campo rotulo="CNPJ" valor={v('cliente.cnpj')} onChange={set('cliente.cnpj')} />
          <Campo rotulo="Unidade" valor={v('cliente.unidade')} onChange={set('cliente.unidade')} placeholder="ex.: Unidade Norte" />
          <Campo rotulo="Contato" valor={v('cliente.contato')} onChange={set('cliente.contato')} />
          <Campo rotulo="Endereço" valor={v('cliente.endereco')} onChange={set('cliente.endereco')} />
          <Campo rotulo="CEP" valor={v('cliente.cep')} onChange={set('cliente.cep')} />
          <Campo rotulo="Cidade" valor={v('cliente.cidade')} onChange={set('cliente.cidade')} />
          <Selecao rotulo="UF" valor={v('cliente.uf')} onChange={set('cliente.uf')} opcoes={[{ valor: '', rotulo: '—' }, ...UFS]} />
          <Campo rotulo="Obra / edificação" valor={v('obra.nome')} onChange={set('obra.nome')} largura="inteira" />
          <Campo rotulo="Uso / ocupação (texto do laudo)" valor={v('obra.uso')} onChange={set('obra.uso')} largura="inteira" />
          <Campo rotulo="Coordenadas (latitude, longitude)" valor={v('obra.coordenadas')} onChange={set('obra.coordenadas')} placeholder="-15.652004, -47.783291" dica="Sai na seção 1 e serve para conferir o GPS das fotos (alerta acima de 500 m)" />
          <Campo rotulo="Pavimentos" tipo="numero" valor={v('obra.pavimentos')} onChange={set('obra.pavimentos')} />
          <Campo rotulo="Área construída (m²)" tipo="numero" valor={v('obra.area_construida_m2')} onChange={set('obra.area_construida_m2')} />
          <Campo rotulo="Data de emissão" tipo="data" valor={v('meta.data')} onChange={set('meta.data')} />
          <Campo rotulo="Revisão" valor={v('meta.revisao')} onChange={set('meta.revisao')} placeholder="R00" dica="R00, R01… seguido de descrição curta" />
          <Campo rotulo="Código do documento" valor={v('meta.codigo')} onChange={set('meta.codigo')} placeholder="HM-SPDA-2026-XXX" />
          <Campo rotulo="Contrato nº" valor={v('meta.contrato')} onChange={set('meta.contrato')} />
          <Campo rotulo="Prefixo dos arquivos" valor={v('meta.prefixo')} onChange={set('meta.prefixo')} placeholder="ex.: HX_Exemplo" />
          <Campo rotulo="Observações da capa" valor={v('meta.observacoes_capa')} onChange={set('meta.observacoes_capa')} largura="inteira" placeholder="Vazio: “Todas as informações foram aferidas in loco, com miliohmímetro e terrômetro.”" />
        </Grade>
        <Nota>Responsável técnico (preenchido pelo engenheiro que assina). O emitente é sempre a H&M (papel timbrado); se quem assina é de outra empresa, informe a empresa e o CNPJ dela.</Nota>
        <Grade colunas={4}>
          <Campo rotulo="Engenheiro responsável" valor={v('responsavel.nome')} onChange={set('responsavel.nome')} />
          <Campo rotulo="Título profissional" valor={v('responsavel.titulo')} onChange={set('responsavel.titulo')} placeholder="Engenheiro Eletricista" />
          <Campo rotulo="CREA" valor={v('responsavel.crea')} onChange={set('responsavel.crea')} />
          <Campo rotulo="RNP" valor={v('responsavel.rnp')} onChange={set('responsavel.rnp')} />
          <Campo rotulo="ART nº" valor={v('responsavel.art')} onChange={set('responsavel.art')} />
          <Campo rotulo="Empresa do responsável (se não for a H&M)" valor={v('responsavel.empresa')} onChange={set('responsavel.empresa')} />
          <Campo rotulo="CNPJ da empresa do responsável" valor={v('responsavel.cnpj')} onChange={set('responsavel.cnpj')} />
        </Grade>
        <Nota>Revisões do documento (tabela da capa). Vazia: sai uma linha com a revisão e a data de emissão acima.</Nota>
        <TabelaEditavel
          linhas={v('meta.revisoes')} onChange={set('meta.revisoes')} rotuloAdicionar="Adicionar revisão"
          novaLinha={(l) => ({ revisao: `R${String(l.length).padStart(2, '0')}`, data: '', descricao: l.length ? '' : 'Emissão inicial', responsavel: v('responsavel.nome') || '' })}
          colunas={[{ campo: 'revisao', rotulo: 'Revisão', largura: 80 }, { campo: 'data', rotulo: 'Data (AAAA-MM-DD)', largura: 140 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'responsavel', rotulo: 'Responsável', largura: 200 }]}
        />
      </Secao>

      <Secao titulo="2. Estrutura" resumo={d.estrutura?.L ? `${d.estrutura.L} × ${d.estrutura.W} × ${d.estrutura.H} m` : ''}>
        <Grade colunas={4}>
          <Campo rotulo="Comprimento L (m)" tipo="numero" valor={v('estrutura.L')} onChange={set('estrutura.L')} />
          <Campo rotulo="Largura W (m)" tipo="numero" valor={v('estrutura.W')} onChange={set('estrutura.W')} />
          <Campo rotulo="Altura H (m)" tipo="numero" valor={v('estrutura.H')} onChange={set('estrutura.H')} />
          <Selecao rotulo="Localização (CD)" valor={v('estrutura.localizacao')} onChange={set('estrutura.localizacao')} opcoes={OPCOES.localizacao} />
          <Selecao rotulo="Tipo construtivo" valor={v('estrutura.tipo_construcao')} onChange={set('estrutura.tipo_construcao')} opcoes={OPCOES.tipo_construcao} />
          <Selecao rotulo="Ambiente das linhas (CE)" valor={v('estrutura.ambiente')} onChange={set('estrutura.ambiente')} opcoes={OPCOES.ambiente} />
          <Campo rotulo="Município (para o NG)" valor={v('estrutura.municipio')} onChange={set('estrutura.municipio')} />
          <Selecao rotulo="UF" valor={v('estrutura.uf')} onChange={set('estrutura.uf')} opcoes={[{ valor: '', rotulo: '—' }, ...UFS]} />
          <Campo rotulo="NG (vazio = Tabela F.1)" tipo="numero" valor={v('estrutura.ng')} onChange={set('estrutura.ng')} dica="Deixe vazio: o sistema busca na Tabela F.1 da NBR 5419-2:2026 (única fonte aceita)" />
          <Marcador rotulo="Sistemas internos críticos (FT = 0,1)" valor={v('estrutura.sistemas_criticos')} onChange={set('estrutura.sistemas_criticos')} dica="Falha afeta a comunidade: hospital, energia, água, telecom" />
        </Grade>
      </Secao>

      <Secao titulo="3. SPDA" resumo={d.spda?.np ? `NP ${d.spda.np}` : ''}>
        <Grade colunas={4}>
          <Selecao rotulo="Nível de proteção" valor={v('spda.np')} onChange={set('spda.np')} opcoes={OPCOES.np} />
          <Selecao rotulo="Material da captação" valor={v('spda.material_captacao') || 'cobre_35'} onChange={set('spda.material_captacao')} opcoes={OPCOES.material_captacao} />
          <Selecao rotulo="Material do aterramento" valor={v('spda.material_aterramento') || 'cobre_50'} onChange={set('spda.material_aterramento')} opcoes={OPCOES.material_aterramento} />
          <Selecao rotulo="Aterramento" valor={v('spda.aterramento') || 'anel'} onChange={set('spda.aterramento')} opcoes={OPCOES.aterramento} />
          <Marcador rotulo="Descidas naturais (armaduras)" valor={v('spda.descida_natural')} onChange={set('spda.descida_natural')} />
          <Marcador rotulo="≥ 10 descidas naturais interligadas (8.1.2 b)" valor={v('spda.descidas_naturais_8_1_2_b')} onChange={set('spda.descidas_naturais_8_1_2_b')} />
          <Marcador rotulo="Cobertura metálica como captor natural" valor={v('spda.cobertura_metalica_natural')} onChange={set('spda.cobertura_metalica_natural')} />
          <Marcador rotulo="SPDA isolado" valor={v('spda.isolado')} onChange={set('spda.isolado')} />
          <Campo rotulo="Largura de malha wm (m) — KS1" tipo="numero" valor={v('spda.wm_m')} onChange={set('spda.wm_m')} />
          <Campo rotulo="Resistividade do solo (Ω·m)" tipo="numero" valor={v('spda.resistividade_solo_ohm_m')} onChange={set('spda.resistividade_solo_ohm_m')} dica="Obrigatória para NP I e II" />
          <Campo rotulo="Perímetro medido (m) — planta irregular" tipo="numero" valor={v('spda.perimetro_m')} onChange={set('spda.perimetro_m')} />
          <Campo rotulo="Área da cobertura (m²)" tipo="numero" valor={v('spda.area_cobertura_m2')} onChange={set('spda.area_cobertura_m2')} />
        </Grade>
        <Nota>Captores verticais (Franklin/mastros), verificados pela esfera rolante. x e y em metros a partir de um canto da cobertura (opcional, para calcular a área protegida).</Nota>
        <TabelaEditavel
          linhas={v('spda.captores_verticais')} onChange={set('spda.captores_verticais')} rotuloAdicionar="Adicionar captor"
          novaLinha={(l) => ({ id: `CV-${l.length + 1}`, descricao: '', cota_ponta_m: null, x: null, y: null })}
          colunas={[
            { campo: 'id', rotulo: 'Id', largura: 70 }, { campo: 'descricao', rotulo: 'Descrição' },
            { campo: 'cota_ponta_m', rotulo: 'Cota da ponta (m)', tipo: 'numero', largura: 110 },
            { campo: 'x', rotulo: 'x (m)', tipo: 'numero', largura: 80 }, { campo: 'y', rotulo: 'y (m)', tipo: 'numero', largura: 80 },
          ]}
        />
        <Nota>Planos de referência para o raio protegido (ex.: plano da telha, topo da platibanda):</Nota>
        <TabelaEditavel
          linhas={v('spda.planos')} onChange={set('spda.planos')} rotuloAdicionar="Adicionar plano"
          novaLinha={{ nome: '', cota_m: null }}
          colunas={[{ campo: 'nome', rotulo: 'Plano' }, { campo: 'cota_m', rotulo: 'Cota (m)', tipo: 'numero', largura: 110 }]}
        />
      </Secao>

      <Secao titulo="4. Linhas que entram na estrutura" resumo={`${(d.linhas || []).length} linha(s)`}>
        <TabelaEditavel
          linhas={d.linhas} onChange={set('linhas')} rotuloAdicionar="Adicionar linha"
          novaLinha={(l) => ({ id: l.length ? `LINHA${l.length + 1}` : 'ENERGIA', nome: '', tipo: 'energia', instalacao: 'enterrada', ct: 'bt_ou_sinal', LL_m: 1000, cld_cli: 'enterrada_nao_blindada', blindagem_rs: 'nao_blindada', peb_np: 'nenhum', zonas: ['todas'] })}
          colunas={[
            { campo: 'id', rotulo: 'Id', largura: 90 }, { campo: 'nome', rotulo: 'Descrição' },
            { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OPCOES.tipoLinha, largura: 110 },
            { campo: 'instalacao', rotulo: 'Instalação', tipo: 'selecao', opcoes: OPCOES.instalacao, largura: 130 },
            { campo: 'ct', rotulo: 'Tipo (CT)', tipo: 'selecao', opcoes: OPCOES.ct, largura: 130 },
            { campo: 'LL_m', rotulo: 'Comprimento (m)', tipo: 'numero', largura: 90 },
            { campo: 'cld_cli', rotulo: 'Blindagem / entrada (B.4)', tipo: 'selecao', opcoes: OPCOES.cld_cli, largura: 190 },
            { campo: 'blindagem_rs', rotulo: 'RS (B.8)', tipo: 'selecao', opcoes: OPCOES.blindagem_rs, largura: 130 },
            { campo: 'peb_np', rotulo: 'DPS classe I', tipo: 'selecao', opcoes: OPCOES.dps, largura: 140 },
          ]}
        />
      </Secao>

      <Secao titulo="5. Zonas de estudo" resumo={`${zonas.length} zona(s)`}>
        <Nota>Uma zona externa (até 3 m da edificação) e as internas com características homogêneas. nz = pessoas na zona; tz = horas por ano (8 760 = permanente).</Nota>
        {zonas.map((z, i) => {
          const setZ = (campo) => (valor) => onChange(atual => definir(atual, 'zonas', (atual.zonas || []).map((zz, j) => (j === i ? { ...zz, [campo]: valor } : zz))));
          return (
            <div key={i} style={{ border: '1px solid #222', borderRadius: 7, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
                <div style={{ flex: 1 }}><Campo rotulo={`Zona ${i + 1}`} valor={z.nome} onChange={setZ('nome')} /></div>
                <div style={{ width: 150 }}><Selecao rotulo="Tipo" valor={z.tipo} onChange={setZ('tipo')} opcoes={op([['interna', 'Interna'], ['externa', 'Externa (só RA)']])} /></div>
                <button style={{ ...btnAdicionar, color: '#b04040', height: 30 }} onClick={() => onChange(atual => definir(atual, 'zonas', atual.zonas.filter((_, j) => j !== i)))}><Trash2 size={12} /></button>
              </div>
              <Grade colunas={4}>
                <Campo rotulo="Pessoas (nz)" tipo="numero" valor={z.nz} onChange={setZ('nz')} />
                <Campo rotulo="Horas/ano (tz)" tipo="numero" valor={z.tz} onChange={setZ('tz')} />
                <Selecao rotulo="Piso" valor={z.piso} onChange={setZ('piso')} opcoes={OPCOES.piso} />
                {z.tipo === 'externa' ? (
                  <Campo rotulo="Medidas toque/passo (avisos, isolacao, malha_solo, restricoes)" valor={(z.medidas_pta || []).join(', ')} onChange={(t) => setZ('medidas_pta')(t.split(',').map(s => s.trim()).filter(Boolean))} />
                ) : (
                  <>
                    <Selecao rotulo="Ocupação (LF/LO)" valor={z.ocupacao} onChange={setZ('ocupacao')} opcoes={OPCOES.ocupacao} />
                    <Selecao rotulo="Carga de incêndio" valor={z.carga_incendio || 'incendio_normal'} onChange={setZ('carga_incendio')} opcoes={OPCOES.carga_incendio} />
                    <Selecao rotulo="Proteção contra incêndio" valor={z.protecao_incendio || 'nenhuma'} onChange={setZ('protecao_incendio')} opcoes={OPCOES.protecao_incendio} />
                    <Selecao rotulo="Perigo especial" valor={z.perigo_especial || 'nenhum'} onChange={setZ('perigo_especial')} opcoes={OPCOES.perigo_especial} />
                  </>
                )}
              </Grade>
              {z.tipo !== 'externa' && (
                <>
                  <Nota>Sistemas internos da zona (um por linha que chega a ela):</Nota>
                  <TabelaEditavel
                    linhas={z.sistemas} onChange={setZ('sistemas')} rotuloAdicionar="Adicionar sistema"
                    novaLinha={{ nome: '', linha: (d.linhas || [])[0]?.id || '', uw_kv: 2.5, dps_np: 'nenhum', ks3: 'sem_preocupacao', rede_equipotencial_malha: false }}
                    colunas={[
                      { campo: 'nome', rotulo: 'Sistema' },
                      { campo: 'linha', rotulo: 'Linha', tipo: 'selecao', opcoes: [{ valor: '', rotulo: '—' }, ...(d.linhas || []).map(l => ({ valor: l.id, rotulo: l.id }))], largura: 120 },
                      { campo: 'uw_kv', rotulo: 'UW (kV)', tipo: 'numero', largura: 70 },
                      { campo: 'dps_np', rotulo: 'DPS coordenados', tipo: 'selecao', opcoes: OPCOES.dps, largura: 160 },
                      { campo: 'ks3', rotulo: 'Fiação interna (KS3)', tipo: 'selecao', opcoes: OPCOES.ks3, largura: 190 },
                      { campo: 'rede_equipotencial_malha', rotulo: 'Malha equip.', tipo: 'check', largura: 70 },
                    ]}
                  />
                </>
              )}
            </div>
          );
        })}
        <button style={btnAdicionar} onClick={() => onChange(atual => definir(atual, 'zonas', [...(atual.zonas || []), { nome: '', tipo: 'interna', nz: null, tz: 8760, ocupacao: 'outros', piso: 'marmore_ceramica', carga_incendio: 'incendio_normal', protecao_incendio: 'nenhuma', perigo_especial: 'nenhum', sistemas: [] }]))}>
          + Adicionar zona
        </button>
      </Secao>

      {/* 6 a 12 são do LAUDO (inspeção, checklist, NCs, ensaios, fotos, SPDA
          provisório): no projeto ficam escondidas — os dados continuam salvos */}
      {tipo === 'projeto' ? (
        <Nota>Projeto: as seções de inspeção (checklist, não conformidades, ensaios de continuidade e fotos) ficam no laudo — crie em Laudos › Novo laudo quando a inspeção for pedida.</Nota>
      ) : (<>
      <Secao titulo="6. Inspeção — dados gerais" resumo={insp.documento_n || ''}>
        <Grade colunas={4}>
          <Selecao rotulo="Tipo de inspeção" valor={insp.tipo || 'periodica'} onChange={set('inspecao.tipo')} opcoes={OPCOES.tipoInspecao} />
          <Campo rotulo="Data da inspeção" tipo="data" valor={insp.data_inspecao} onChange={set('inspecao.data_inspecao')} />
          <Campo rotulo="Último dia (se durou mais de um)" tipo="data" valor={insp.data_inspecao_fim} onChange={set('inspecao.data_inspecao_fim')} />
          <Campo rotulo="Documento nº" valor={insp.documento_n} onChange={set('inspecao.documento_n')} placeholder="HM-SPDA-2026-XXX-01" />
          <Campo rotulo="Equipe de campo" valor={insp.equipe} onChange={set('inspecao.equipe')} />
          <Marcador rotulo="Serviço essencial (saúde, energia, água, sinais)" valor={insp.servico_essencial} onChange={set('inspecao.servico_essencial')} />
          <Marcador rotulo="Áreas classificadas 0/1/20/21" valor={insp.area_classificada} onChange={set('inspecao.area_classificada')} />
          <Marcador rotulo="Corrosão atmosférica severa" valor={insp.corrosao_severa} onChange={set('inspecao.corrosao_severa')} />
          <Marcador rotulo="Munição / explosivos / tóxicos" valor={insp.explosivos} onChange={set('inspecao.explosivos')} />
          <Campo rotulo="Contador de descargas — anterior" valor={insp.contador_anterior} onChange={set('inspecao.contador_anterior')} />
          <Campo rotulo="Contador de descargas — atual" valor={insp.contador_atual} onChange={set('inspecao.contador_atual')} />
          <Campo rotulo="Norma de origem do projeto" valor={insp.norma_origem} onChange={set('inspecao.norma_origem')} largura="inteira" />
          <Campo rotulo="Justificativa da edição da norma (2015 × 2026)" tipo="area" valor={insp.justificativa_norma} onChange={set('inspecao.justificativa_norma')} largura="inteira" />
          <Campo rotulo="Abrangência" tipo="area" valor={insp.abrangencia} onChange={set('inspecao.abrangencia')} largura="inteira" />
          <Campo rotulo="Fora do escopo" valor={insp.fora_escopo} onChange={set('inspecao.fora_escopo')} largura="inteira" />
          <Campo rotulo="Itens adicionais" valor={insp.itens_adicionais} onChange={set('inspecao.itens_adicionais')} largura="inteira" />
        </Grade>
        <Nota>Descrição dos subsistemas (seção 6 do laudo — "Características do SPDA da edificação"):</Nota>
        <Grade colunas={2}>
          <Campo rotulo="Subsistema de captação" tipo="area" valor={v('spda.descricao_captacao')} onChange={set('spda.descricao_captacao')} placeholder="ex.: captores Franklin, minicaptores e condutores de captação nas torres, coroa e cobertura" />
          <Campo rotulo="Subsistema de descida" tipo="area" valor={v('spda.descricao_descidas')} onChange={set('spda.descricao_descidas')} />
          <Campo rotulo="Subsistema de aterramento" tipo="area" valor={v('spda.descricao_aterramento')} onChange={set('spda.descricao_aterramento')} />
          <Campo rotulo="Equipotencialização" tipo="area" valor={v('spda.descricao_equipotencializacao')} onChange={set('spda.descricao_equipotencializacao')} />
          <Campo rotulo="Caixas de inspeção (quantidade)" tipo="numero" valor={v('spda.caixas_inspecao')} onChange={set('spda.caixas_inspecao')} dica="Vazio: conta os ensaios com “caixa” na identificação" />
          <Campo rotulo="Barramento de equipotencialização" valor={v('spda.bep')} onChange={set('spda.bep')} placeholder="BEP" />
        </Grade>
        <Nota>Use [CONFERIR] em qualquer texto estimado ou não confirmado — sai em vermelho no documento.</Nota>
      </Secao>

      <Secao titulo="7. Documentos recebidos e dados do projeto" resumo={`${(insp.documentos || []).length} doc. / ${(insp.dados_projeto || []).length} dados`}>
        <TabelaEditavel
          linhas={insp.documentos} onChange={set('inspecao.documentos')} rotuloAdicionar="Adicionar documento"
          novaLinha={{ documento: '', recebido: 'Sim', data_rev: '', situacao: '' }}
          colunas={[{ campo: 'documento', rotulo: 'Documento' }, { campo: 'recebido', rotulo: 'Recebido?', largura: 90 }, { campo: 'data_rev', rotulo: 'Data/rev.', largura: 110 }, { campo: 'situacao', rotulo: 'Situação' }]}
        />
        <TabelaEditavel
          linhas={insp.dados_projeto} onChange={set('inspecao.dados_projeto')} rotuloAdicionar="Adicionar dado do projeto"
          novaLinha={{ dado: '', valor: '', fonte: '' }}
          colunas={[{ campo: 'dado', rotulo: 'Dado', largura: 200 }, { campo: 'valor', rotulo: 'Valor', tipo: 'area' }, { campo: 'fonte', rotulo: 'Fonte', largura: 200 }]}
        />
        <TabelaEditavel
          linhas={insp.instrumentos} onChange={set('inspecao.instrumentos')} rotuloAdicionar="Adicionar instrumento"
          novaLinha={{ instrumento: '', fabricante: '', modelo: '', serie: '', certificado: '', data_calibracao: '', validade: '', uso: '' }}
          colunas={['instrumento', 'fabricante', 'modelo', 'serie', 'certificado', 'data_calibracao', 'validade', 'uso'].map(c => ({
            campo: c, rotulo: { serie: 'Nº série', data_calibracao: 'Calibração (AAAA-MM-DD)', validade: 'Validade (AAAA-MM-DD)' }[c] || c.charAt(0).toUpperCase() + c.slice(1),
          }))}
        />
      </Secao>

      <Secao titulo="8. Checklist de inspeção (60 itens)" resumo={resumoChecklist(insp.checklist)}>
        <Nota>Itens não preenchidos ficam NV (não verificado). O item CP8 (prédios até 60 m) e os de componentes naturais inexistentes viram NA automaticamente.</Nota>
        <ChecklistEditor base={checklistBase} lista={insp.checklist} onChange={set('inspecao.checklist')} />
      </Secao>

      <Secao titulo="9. Não conformidades" resumo={`${(insp.ncs || []).length} descrita(s)`}>
        <Nota>Descreva aqui as NCs com recomendação própria; elas substituem a NC automática do mesmo item do checklist (sem duplicar no laudo).</Nota>
        <TabelaEditavel
          linhas={insp.ncs} onChange={set('inspecao.ncs')} rotuloAdicionar="Adicionar não conformidade"
          novaLinha={{ item: '', local: '', descricao: '', requisito: '', recomendacao: '', prioridade: 'P3', foto: '' }}
          colunas={[
            { campo: 'item', rotulo: 'Item', tipo: 'selecao', opcoes: [{ valor: '', rotulo: '—' }, ...(checklistBase || []).map(b => ({ valor: b.cod, rotulo: b.cod }))], largura: 80 },
            { campo: 'local', rotulo: 'Local', largura: 140 }, { campo: 'descricao', rotulo: 'Descrição', tipo: 'area' },
            { campo: 'requisito', rotulo: 'Requisito', largura: 140 }, { campo: 'recomendacao', rotulo: 'Recomendação', tipo: 'area' },
            { campo: 'prioridade', rotulo: 'Prior.', tipo: 'selecao', opcoes: OPCOES.prioridade, largura: 120 }, { campo: 'foto', rotulo: 'Fotos', largura: 90 },
          ]}
        />
      </Secao>

      <Secao titulo="10. Ensaios de continuidade (Anexo F)" resumo={`${(insp.continuidade || []).length} ponto(s)`}>
        <Nota>Critérios: F.1/F.2/F.3 ≤ 1 Ω; F.4 ≤ 0,2 Ω; F.5/F.6/F.7 pela resistência esperada — informe material, seção e comprimento. Valor vazio = não medido.</Nota>
        <TabelaEditavel
          linhas={insp.continuidade} onChange={set('inspecao.continuidade')} rotuloAdicionar="Adicionar ponto de ensaio"
          novaLinha={(l) => ({ ponto: `T${String(l.length + 1).padStart(2, '0')}`, tipo_ensaio: 'F.2', origem: '', destino: '', valor_ohm: null })}
          colunas={[
            { campo: 'ponto', rotulo: 'Ponto', largura: 60 }, { campo: 'tipo_ensaio', rotulo: 'Ensaio', tipo: 'selecao', opcoes: OPCOES.ensaio, largura: 170 },
            { campo: 'origem', rotulo: 'Origem' }, { campo: 'destino', rotulo: 'Destino' },
            { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 80 },
            { campo: 'material', rotulo: 'Material', tipo: 'selecao', opcoes: OPCOES.materialCondutor, largura: 120 },
            { campo: 'secao_mm2', rotulo: 'Seção (mm²)', tipo: 'numero', largura: 80 }, { campo: 'comprimento_m', rotulo: 'Compr. (m)', tipo: 'numero', largura: 80 },
          ]}
        />
      </Secao>

      <Secao titulo="11. Registro fotográfico" resumo={`${(insp.fotos || []).length} foto(s)`}>
        <Nota>Escolha onde cada foto entra no laudo e, nas fotos de leitura do instrumento, o ensaio que ela comprova. Data/hora e GPS vazios são lidos da própria foto (câmera do celular); foto a mais de 500 m da obra ou fora da data da inspeção sai marcada em vermelho para conferir.</Nota>
        <FotosInspecao
          lista={insp.fotos || []} fotos={fotos} urlsFotos={urlsFotos}
          onChange={set('inspecao.fotos')} onEnviarFotos={onEnviarFotos} onRemoverFoto={onRemoverFoto}
          camposExtras={(f, alterar) => (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              <Selecao valor={f.categoria || ''} onChange={(x) => alterar('categoria', x)} opcoes={OPCOES.categoriaFoto} largura="inteira" />
              <Selecao valor={f.ensaio || ''} onChange={(x) => alterar('ensaio', x)} largura="inteira"
                opcoes={[{ valor: '', rotulo: 'Sem ensaio' }, ...(insp.continuidade || []).filter(e => e.ponto).map(e => ({ valor: String(e.ponto), rotulo: `Ensaio ${e.ponto}${e.destino ? ` — ${e.destino}` : ''}` }))]} />
              <Campo valor={f.data_hora} onChange={(x) => alterar('data_hora', x)} placeholder="Data/hora (da foto)" />
              <Campo valor={f.gps} onChange={(x) => alterar('gps', x)} placeholder="GPS (da foto)" />
            </div>
          )}
        />
      </Secao>

      <Secao titulo="12. SPDA provisório (etapa de obra) — opcional" resumo={d.spda_provisorio ? 'preenchido' : ''}>
        <Marcador rotulo="Este laudo é de SPDA provisório de etapa de obra" valor={!!d.spda_provisorio}
          onChange={(marcado) => onChange(atual => { const n = { ...atual }; if (marcado) n.spda_provisorio = { etapa: '', definitivo: '', previsao: '', validade: '', descricao: '', partes: [] }; else delete n.spda_provisorio; return n; })} />
        {d.spda_provisorio && (
          <div style={{ marginTop: 12 }}>
            <Grade colunas={2}>
              <Campo rotulo="Etapa atual" valor={v('spda_provisorio.etapa')} onChange={set('spda_provisorio.etapa')} />
              <Campo rotulo="Configuração definitiva prevista" valor={v('spda_provisorio.definitivo')} onChange={set('spda_provisorio.definitivo')} />
              <Campo rotulo="Previsão da implantação definitiva" valor={v('spda_provisorio.previsao')} onChange={set('spda_provisorio.previsao')} />
              <Campo rotulo="Validade do laudo" valor={v('spda_provisorio.validade')} onChange={set('spda_provisorio.validade')} />
              <Campo rotulo="Descrição" tipo="area" valor={v('spda_provisorio.descricao')} onChange={set('spda_provisorio.descricao')} largura="inteira" />
            </Grade>
            <TabelaEditavel
              linhas={v('spda_provisorio.partes')} onChange={set('spda_provisorio.partes')} rotuloAdicionar="Adicionar subsistema"
              novaLinha={{ subsistema: '', situacao: '', referencia: '' }}
              colunas={[{ campo: 'subsistema', rotulo: 'Subsistema' }, { campo: 'situacao', rotulo: 'Situação nesta etapa', tipo: 'area' }, { campo: 'referencia', rotulo: 'Referência', largura: 180 }]}
            />
          </div>
        )}
      </Secao>
      </>)}
      {nomesZonas.length === 0 && <Nota>Cadastre ao menos uma zona de estudo para a análise de risco.</Nota>}
    </div>
  );
}