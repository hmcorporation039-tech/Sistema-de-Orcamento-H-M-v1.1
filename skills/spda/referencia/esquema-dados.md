# Formulário de dados da obra (JSON) — campos e opções

Um arquivo por obra. Modelo em branco: `exemplos/modelo-vazio.json`; exemplos completos: `exemplos/exemplo-hospital.json` (inspeção de SPDA provisório, base dos testes de cálculo) e `exemplos/exemplo-laudo-spda-aterramento.json` (laudo de SPDA e aterramento no formato do modelo HM de 29/10/2026 — dados fictícios). Campos marcados com * são obrigatórios para o cálculo.

Em qualquer texto, `[CONFERIR …]` sai em vermelho e negrito no documento — use para todo valor estimado ou não confirmado.

## meta

| Campo | Descrição |
|---|---|
| `titulo` | Título interno da obra |
| `prefixo` | Prefixo dos nomes de arquivo (ex.: `HX_Exemplo`); se vazio, usa o nome da obra |
| `tipo_laudo` | `spda_aterramento` (padrão: laudo de SPDA e aterramento, com análise de risco) · `aterramento` (laudo só de aterramento: sem análise de risco, sem captação/descidas; checklist só de aterramento, equipotencialização e DPS) |
| `codigo`, `contrato` | Código do documento e nº do contrato (capa) |
| `data` | Data de emissão `AAAA-MM-DD` |
| `revisao` | `R00`, `R01`… seguido de descrição curta (ex.: `R02 (após visita de campo)`) |
| `revisoes` | Tabela de revisões da capa: `[{ "revisao", "data", "descricao", "responsavel" }]`; vazia, sai uma linha com `revisao`/`data` |
| `observacoes_capa` | Observações da capa (padrão: "aferidas in loco com miliohmímetro e terrômetro", quando há medições) |
| `observacao` | Nota interna |

## responsavel

`nome`, `titulo`, `crea`, `rnp`, `art` — **preenchidos pelo engenheiro**. Vazios saem como "(preencher)".
O emitente do laudo é sempre a H&M (papel timbrado, `_comum/empresa.js`). Quando quem assina é de outra empresa, informe `empresa` e `cnpj` dela: saem na capa como "Empresa do responsável técnico" e na assinatura.

## cliente / obra

`cliente`: `nome`, `cnpj`, `unidade` (ex.: "Unidade Norte"), `contato`, `endereco`, `cep`, `cidade`, `uf`.
`obra`: `nome`, `uso` (texto livre que aparece no laudo — "Tipo do estabelecimento"), `coordenadas` (`"-15.65, -47.78"`, usadas na seção 1 e para conferir o GPS das fotos), `pavimentos`, `area_construida_m2`.

## estrutura *

| Campo | Opções / unidade |
|---|---|
| `L`, `W`, `H` * | comprimento, largura e altura (m). Planta irregular: usar o retângulo envolvente e informar `spda.perimetro_m` |
| `localizacao` * | `cercada_mais_altos` (0,25) · `cercada_mesma_altura` (0,5) · `isolada` (1) · `topo_colina` (2) — Tabela A.1 |
| `tipo_construcao` * | `simples` (rs = 2) · `concreto_armado` (1) · `metalica` (1) — Tabela C.7 |
| `ambiente` * | `rural` (1) · `suburbano` (0,5) · `urbano` (0,1) · `urbano_alto` (0,01, estruturas > 20 m) — Tabela A.4 |
| `municipio`, `uf` * | para buscar o NG na Tabela F.1 |
| `ng`, `ng_fonte` | deixe vazio para buscar automaticamente; se informar, cite a Tabela F.1 |
| `saliencias` | `[{ "hp": altura_m }]` — saliências elevadas na cobertura (Eq. A.2) |
| `sistemas_criticos` | `true` → FT = 0,1/ano; `false` → FT = 1/ano (7.3.4) |
| `nt` | total de pessoas; se vazio, soma `nz` das zonas |
| `ct_valor` | valor total da estrutura, só se houver patrimônio cultural (R3) |

## spda

| Campo | Opções |
|---|---|
| `np` * | `I` · `II` · `III` · `IV` (nível de proteção do projeto/instalação) |
| `isolado` | `true` / `false` |
| `descida_natural` | `true` se as descidas forem as armaduras/estrutura metálica |
| `descidas_naturais_8_1_2_b` | `true` se houver ≥ 10 caminhos naturais interligados (8.1.2 b) — habilita PB = 0,01 com NP I |
| `cobertura_metalica_natural` | `true` se a cobertura metálica for captor natural (PB = 0,001 com descida natural) |
| `wm_m` | largura da malha/espaçamento das descidas para KS1 (B.4.12) |
| `resistividade_solo_ohm_m` | obrigatório para NP I e II (l1 da Figura 3) |
| `material_captacao` | `cobre_35` · `aluminio_70` · `aco_galvanizado_50` · `aco_cobreado_35` |
| `material_aterramento` | `cobre_50` · `aco_galvanizado_90` · `aco_cobreado_50` |
| `aterramento` | `anel` (padrão) · `fundacao` · `existente` |
| `perimetro_m`, `area_cobertura_m2` | medidos, para planta irregular |
| `captores_verticais` | `[{ "id", "descricao", "cota_ponta_m", "x", "y" }]` — Franklin/mastros; com `x`,`y` (m, a partir de um canto) calcula a fração protegida |
| `planos` | `[{ "nome", "cota_m" }]` — planos de referência para o raio protegido (ex.: telha, topo da platibanda) |

## linhas (uma por linha que entra na estrutura)

| Campo | Opções |
|---|---|
| `id` * | identificador usado pelos sistemas das zonas (ex.: `ENERGIA`, `TELECOM`) |
| `nome` | descrição (aparece nos documentos) |
| `tipo` * | `energia` · `sinal` |
| `instalacao` * | `aerea` (CI 1) · `enterrada` (0,5) · `enterrada_malha` (0,01) — Tabela A.2 |
| `ct` * | `bt_ou_sinal` (1) · `at_trafo` (0,2, AT com transformador) — Tabela A.3 |
| `LL_m` | comprimento do trecho (m); desconhecido → 1 000 |
| `resistividade_ohm_m` | para trecho enterrado com ρ > 400 Ω·m |
| `cld_cli` * | `aerea_nao_blindada` · `enterrada_nao_blindada` · `neutro_multiaterrado` · `enterrada_blindada_nao_ligada` · `aerea_blindada_nao_ligada` · `blindada_ligada_bep` · `duto_protecao` · `fibra_optica` · `interface_isolante` — Tabela B.4 |
| `blindagem_rs` | `nao_blindada` · `rs_5_20` · `rs_1_5` · `rs_ate_1` (Ω/km) — Tabela B.8 |
| `peb_np` | NP dos DPS classe I na entrada: `nenhum` · `III-IV` · `II` · `I` · `melhor_I` (0,005) · `melhor_I_max` (0,001) — Tabela B.7 |
| `zonas` | `["todas"]` ou nomes das zonas que a linha atende |
| `adjacente` | `{ "L", "W", "H", "localizacao" }` da estrutura na outra ponta (NDJ) |

## zonas *

Zona externa: `{ "nome", "tipo": "externa", "nz", "tz", "piso", "medidas_pta": [] }`.

Zona interna:

| Campo | Opções |
|---|---|
| `nome`, `nz` *, `tz` * | pessoas na zona e horas/ano (8 760 = permanente) |
| `ocupacao` * | `explosao` · `hospital_uti_cc` · `hospital_geral` · `hotel_escola_civico` · `entretenimento_igreja_museu` · `industrial_comercial` · `outros` — Tabela C.2 (LF e LO) |
| `piso` * | `terra_concreto` · `marmore_ceramica` · `brita_carpete` · `asfalto_linoleo_madeira` — Tabela C.3 |
| `carga_incendio` | `incendio_alto` · `incendio_normal` · `incendio_baixo` · `explosao_zona_0_20` · `explosao_zona_1_21` · `explosao_zona_2_22` · `nenhum` — Tabela C.5 |
| `protecao_incendio` | `nenhuma` · `manual` · `automatica` — Tabela C.4 |
| `perigo_especial` | `nenhum` · `panico_baixo` · `panico_medio` · `dificuldade_evacuacao` · `panico_alto` — Tabela C.6 |
| `medidas_pta` (externa) | `avisos` · `isolacao` · `malha_solo` · `restricoes` — Tabela B.1 (descida natural entra sozinha) |
| `medidas_ptu` | `avisos` · `isolacao` · `restricoes` — Tabela B.6 |
| `wm2_m` | malha de blindagem interna (KS2) |
| `equipamento_zpr0a` | `true` se houver equipamento exposto a descarga direta (FB) |
| `ft` | FT específico, só se imposto pela autoridade e MAIS restritivo que o da norma (valor maior é ignorado e registrado no relatório de risco) |
| `cz` | valor de patrimônio cultural da zona (R3) |
| `sistemas` | `[{ "nome", "linha", "uw_kv", "dps_np", "ks3", "rede_equipotencial_malha", "blindado", "interface_optica", "pm_igual_1" }]` |

Sistemas internos: `uw_kv` = suportabilidade de impulso (1; 1,5; 2,5; 4; 6 kV); `dps_np` como `peb_np`; `ks3` = `sem_preocupacao` · `evitando_lacos_grandes` (= 0,2, igual a `evitando_lacos_medios`; a Tabela B.5 não tem 0,5) · `evitando_lacos_medios` · `evitando_lacos_pequenos` · `blindado` (Tabela B.5); `rede_equipotencial_malha: true` reduz KS1 e KS2 à metade; `interface_optica: true` → PMS = 0 (B.4.11); `pm_igual_1: true` para equipamento sem suportabilidade normalizada (B.4.10).

## inspecao

| Campo | Descrição |
|---|---|
| `tipo` | `durante_instalacao` · `apos_instalacao` · `alteracao` · `descarga` · `periodica` · `provisorio` |
| `data_inspecao`, `data_inspecao_fim`, `datas_inspecao`, `documento_n`, `equipe` | identificação da visita (`data_inspecao_fim` ou a lista `datas_inspecao` quando a inspeção durou mais de um dia — as fotos fora dessas datas saem com [CONFERIR]) |
| `norma_origem`, `justificativa_norma` | edição usada no projeto existente e justificativa (2015 × 2026) |
| `servico_essencial`, `area_classificada`, `corrosao_severa`, `explosivos` | definem a periodicidade (1 ou 3 anos) |
| `abrangencia`, `fora_escopo`, `itens_adicionais` | escopo do laudo |
| `documentos` | `[{ "documento", "recebido", "data_rev", "situacao" }]` |
| `dados_projeto` | `[{ "dado", "valor", "fonte" }]` |
| `contador_anterior`, `contador_atual` | leitura do contador de descargas |
| `instrumentos` | `[{ "instrumento", "fabricante", "modelo", "serie", "certificado", "data_calibracao", "validade", "uso" }]` — validade anterior à inspeção ou certificado vazio saem com [CONFERIR] |
| `continuidade` | `[{ "ponto", "tipo_ensaio" (F.1…F.7), "origem", "destino", "valor_ohm", "material", "secao_mm2", "comprimento_m" }]` |
| `aterramento` | `[{ "ponto", "metodo", "distancia_m", "valor_ohm", "condicao_solo" }]` (informativo) |
| `fotos`, `pasta_fotos`, `fotos_obs` | `[{ "id", "categoria", "ensaio", "data_hora", "gps", "local", "subsistema", "descricao", "ref", "arquivo" }]` — ver abaixo |
| `checklist` | só os itens apurados: `[{ "cod", "situacao", "obs", "foto", "prioridade" }]` (códigos em `dados/checklist_base.json`) |
| `ncs` | `[{ "item", "local", "descricao", "requisito", "recomendacao", "prioridade", "foto" }]` |

### Fotos do laudo

| Campo | Descrição |
|---|---|
| `categoria` | `localizacao` (seção 1 — imagem de satélite/mapa) · `prancha` (seção 10 — as built) · `ensaio` (Anexo 01, foto da leitura do instrumento) · `geral` (Anexo 01, inspeção visual) · `metodo` (seção 8) · `calibracao` (Anexo 02, certificado) · `art` (Anexo 03). Sem categoria: `ensaio` se tiver `ensaio`, senão `geral` |
| `ensaio` | `ponto` do ensaio de continuidade que a foto comprova — a legenda traz a identificação, a leitura e a situação |
| `data_hora`, `gps` | Data/hora (`AAAA-MM-DDTHH:MM:SS` ou `dd/mm/aaaa hh:mm:ss`) e coordenadas (`"-15.65, -47.78"`). Vazios, são lidos do EXIF da foto (JPEG da câmera do celular) |

Conferência automática (seção 10 e parecer, em vermelho): foto a mais de 500 m de `obra.coordenadas`, foto fora das datas da inspeção e `ensaio` que não existe na tabela de continuidade. O parecer calculado não muda, mas o `[CONFERIR]` fica até a foto ser trocada ou justificada.

## spda — textos do laudo (seção 6)

`descricao_captacao`, `descricao_descidas`, `descricao_aterramento`, `descricao_equipotencializacao` (texto de cada subsistema), `caixas_inspecao` (quantidade; vazio = conta os ensaios com "caixa" na identificação), `bep` (nome do barramento, padrão "BEP").

## spda_provisorio (opcional — SPDA de etapa de obra)

`etapa`, `definitivo`, `previsao`, `validade`, `descricao`, `partes: [{ "subsistema", "situacao", "referencia" }]`.

## desenhos (opcional)

Lista de pranchas citadas no memorial, ex.: `["SPDA-01 Planta de cobertura", "SPDA-02 Fachadas"]`.
