# Placar de precisão da leitura de PDF e DWG

Fase 3 do roteiro (`docs/ROTEIRO-GRANDE-IMPLEMENTACAO.md`), princípio 3: a precisão é **medida**, não percebida.
O placar lê projetos reais e compara o que o sistema contou com a contagem **conferida pelo engenheiro**.
Cada mudança de leitor roda o placar antes de subir.

## Onde ficam os projetos

Os arquivos dos clientes **não entram no repositório**. Eles ficam numa pasta do servidor:

- variável de ambiente `HM_PLACAR_PASTA`; ou
- sem ela, `C:\HM-Engenharia\Placar de precisao` (a pasta acima do repositório).

Cada projeto é uma subpasta com os arquivos (PDF, DWG, DXF) e um `gabarito.json`:

```
Placar de precisao\
  Paroquia NSA\
    Paroquia_NSA_Incendio_CFTV_Cabeamento_R04.dxf
    Lumino - Paroquia ... A0 1_50.pdf
    gabarito.json
```

Sem a pasta, o teste `backend/testes/placarPrecisao.test.js` diz "pulado" e só roda a parte sintética.

## Como rodar

Na pasta `backend`:

| Comando | O que faz |
|---|---|
| `node scripts/placar-precisao.js` | Placar de todos os projetos conferidos |
| `node scripts/placar-precisao.js --json placar.json` | Grava também o resultado completo |
| `node scripts/placar-precisao.js --rascunhos` | Inclui os gabaritos com `"conferido": false` |
| `node scripts/placar-precisao.js --modelo "<pasta do projeto>"` | Grava `gabarito.rascunho.json` com o que o sistema lê hoje |
| `node scripts/placar-precisao.js --com-aprendizado` | Lê com o que o sistema aprendeu (banco do `.env`): legenda, notas e blocos do DWG e a legenda de PDF do escritório (versão 2.30) |

Para começar um gabarito:

1. Rode `--modelo`.
2. Confira cada número na planta e corrija.
3. Marque `"conferido": true` e renomeie o arquivo para `gabarito.json`.

Sem `--com-aprendizado` o placar não usa o banco: mede o leitor, sem o aprendizado do escritório. Rodar sem e com mostra o ganho do treino. Para essa medida valer, os arquivos do placar **não** podem estar na pasta que o treino lê: o gabarito viraria treino.

## Formato do `gabarito.json`

```json
{
  "projeto": "Paróquia NSA — incêndio, CFTV e cabeamento R04",
  "conferido": true,
  "conferido_por": "Márcio",
  "conferido_em": "2026-11-02",
  "arquivos": [
    { "arquivo": "Paroquia_NSA_Incendio_CFTV_Cabeamento_R04.dxf", "disciplinas": ["incendio", "cftv", "cabeamento"] },
    { "arquivo": "Lumino - Paroquia ... A0 1_50.pdf", "disciplinas": ["iluminacao"], "escala": 50 }
  ],
  "simbolos": [
    { "disciplina": "incendio", "tipo": "Detector de fumaça", "busca": "detector", "quantidade": 14 },
    { "disciplina": "incendio", "tipo": "Avisador audiovisual", "busca": "sinalizador|avisador", "quantidade": 6 }
  ],
  "trechos": [
    { "disciplina": "incendio", "tipo": "eletroduto", "metros": 95.3 },
    { "disciplina": "rede", "tipo": "eletrocalha", "layer": "CAB-ELETROCALHA", "metros": 83.9 }
  ],
  "ambientes": {
    "quantidade": 18,
    "tolerancia_area_pct": 5,
    "lista": [{ "nome": "Nave", "area_m2": 320.5 }, { "nome": "Sacristia" }]
  }
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `conferido` | sim | `false` = rascunho, fica fora do placar (a não ser com `--rascunhos`) |
| `arquivos[].arquivo` | sim | Nome do arquivo na pasta do projeto |
| `arquivos[].disciplinas` | não | As que se marcam no envio. O item sem disciplina fica com a primeira, como no orçamento |
| `arquivos[].escala` | não | Escala informada (50 = 1:50), como na tela de envio. Sem ela, o leitor deduz |
| `simbolos[].busca` | sim | Texto ou expressão regular procurada na descrição lida (sem diferenciar maiúsculas) |
| `simbolos[].quantidade` | sim | Contagem conferida na planta |
| `simbolos[].disciplina` | não | Filtra pela disciplina lida. `rede`, `cabeamento` e `telefonia` são do mesmo grupo |
| `trechos[].tipo` | não | `eletroduto`, `eletrocalha`, `perfilado` ou `leito` |
| `trechos[].layer` | não | Expressão regular da layer (só DWG/DXF) |
| `trechos[].metros` | sim | Metragem conferida |
| `ambientes.lista[].nome` | não | Nome do ambiente. Compara sem acento e sem diferenciar maiúsculas |
| `ambientes.lista[].area_m2` | não | Área conferida. Fora da tolerância, o ambiente vale meio acerto |
| `ambientes.quantidade` | não | Quantos ambientes a planta tem |

## Como o acerto é calculado

- **Cada linha:** `menor ÷ maior` entre o lido e o esperado. Contar a mais e contar a menos pesam igual. Nada esperado e nada lido vale 100 %.
- **Símbolos que ainda estão "a conferir"** (símbolo explodido sem confirmação no Mapa do CAD) entram na contagem lida e aparecem à parte, na coluna "a conferir".
- **Por disciplina:** média das linhas de símbolo e de metro da disciplina.
- **Geral do projeto:** média de símbolos, metros e ambientes (só das partes que o gabarito tem).
- **Placar total:** média dos projetos conferidos.
