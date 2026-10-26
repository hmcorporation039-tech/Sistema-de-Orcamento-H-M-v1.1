# Fase 4 — app de campo: contrato entre backend e app

O app de campo (`/campo`, celular, funciona sem rede) e o backend combinam só o
que está aqui. Mudou o contrato, mude este arquivo junto.

## Conceitos

- **OS (ordem de serviço)**: trabalho de campo de uma obra — instalação,
  manutenção, vistoria (laudo), visita técnica. Tem checklist, fotos, assinatura
  do cliente e relatório em PDF.
- **Identidade offline**: toda OS, foto e operação criada no celular nasce com um
  **UUID v4 gerado no aparelho** (`uuid`). O servidor usa esse UUID para não
  duplicar quando a mesma coisa chega duas vezes (reenvio após queda de rede).
  O `id` numérico é só do servidor.
- **Quem vê o quê**: admin vê tudo. Usuário comum (`role = 'user'`, o técnico)
  vê as OS em que é o `responsavel_id` e as das obras que são dele (mesma posse
  das outras rotas de obra). Só pode alterar as que vê.

## Objeto OS (como o servidor devolve)

```json
{
  "id": 12, "uuid": "8f0c…", "numero": "OS-2026-0007", "obra_id": 9,
  "obra": { "id": 9, "codigo": "OB-2026-009", "nome": "…", "cliente_nome": "…", "endereco": "…" },
  "titulo": "Instalação dos pontos de CFTV", "descricao": "…",
  "tipo": "instalacao | manutencao | vistoria | visita | outro",
  "disciplina": "cftv | null",
  "status": "aberta | em_execucao | concluida | cancelada",
  "responsavel_id": 3, "responsavel_nome": "…",
  "agendada_para": "2026-11-03", "iniciada_em": null, "concluida_em": null,
  "checklist": [
    { "id": "c1", "grupo": "Câmeras", "texto": "Câmera fixa e alinhada",
      "resposta": "conforme | nao_conforme | na | null", "observacao": "",
      "fotos": ["<uuid da foto>"], "respondido_em": "2026-11-03T14:02:00-03:00" }
  ],
  "fotos": [ { "uuid": "…", "item_id": "c1 | null", "legenda": "", "tirada_em": "…",
               "lat": null, "lon": null, "enviada": true, "url": "/api/campo/fotos/<uuid>" } ],
  "assinatura": { "nome": "…", "documento": "…", "assinada_em": "…", "url": "/api/campo/os/12/assinatura" } ,
  "observacao_final": "", "versao": 4, "atualizado_em": "…"
}
```

`assinatura` é `null` enquanto não houver.

Campos a mais que o servidor também devolve (o app pode ignorar):
`modelo_checklist`, `cancelada_em`, `inicio`/`conclusao` (`{ lat, lon }` ou
`null`), `resumo` (`{ total, respondidos, conforme, nao_conforme, na }`),
`criado_por`, `criado_por_nome`, `criado_em`, `pode_editar` (escritório),
`pode_excluir`; no item do checklist, `extra: true` nos itens criados no campo;
na foto, `tamanho` (bytes). `GET /campo/os/:id` traz também `historico`
(respostas, observações e assinaturas substituídas — nada some).

## Rotas (todas com `autenticar`; prefixo `/api`)

| Método e rota | Uso |
|---|---|
| `GET /campo/os?status=abertas\|todas&desde=<iso>` | Lista do técnico (as que ele vê). `abertas` = aberta + em_execucao + concluídas nos últimos 7 dias. `desde` devolve só as alteradas depois da data (sincronização incremental). Resposta `{ itens: [OS], agora: "<iso do servidor>" }`. |
| `GET /campo/os/:id` | Uma OS completa. |
| `GET /campo/modelos-checklist?disciplina=` | Modelos de checklist: os `checklistBase` das skills (via o motor da disciplina, como `laudosController` faz) e um modelo genérico. Resposta `{ itens: [{ chave, rotulo, disciplina, itens: [{ id, grupo, texto }] }] }`. |
| `POST /obras/:id/os` | Escritório cria OS (`titulo, descricao, tipo, disciplina, responsavel_id, agendada_para, modelo_checklist`). |
| `PUT /campo/os/:id` | Escritório edita (com `versao`; 409 se mudou). |
| `DELETE /campo/os/:id` | Admin; só sem fotos e sem assinatura, senão cancela. |
| `POST /campo/sincronizar` | O app manda a fila de operações; ver abaixo. |
| `POST /campo/os/:uuid/fotos` | multipart: `foto` (arquivo), `uuid`, `item_id?`, `legenda?`, `tirada_em`, `lat?`, `lon?`. Idempotente pelo `uuid` (reenvio devolve 200 com a mesma foto). Até 8 MB, só JPEG/PNG/WebP conferido pelos bytes iniciais. A OS pode ter sido criada offline: aceita o `uuid` da OS. |
| `GET /campo/fotos/:uuid` | A foto (autenticada, mesma regra de quem vê a OS). |
| `GET /campo/os/:id/assinatura` | PNG da assinatura. |
| `GET /campo/os/:id/pdf` | Relatório da OS em PDF (dados, checklist com resposta e observação, fotos reduzidas, assinatura, NCs em destaque). `escapeHtml` em tudo. |

Detalhes das rotas (Fase 4J, backend pronto):

- **`:id` e `:uuid` nas rotas `/campo/os/...` aceitam os dois**: o id numérico
  ou o uuid da OS (a OS criada no aparelho só tem o uuid até sincronizar).
- `GET /campo/os` aceita também `obra_id=` (a aba "Campo (OS)" da obra usa
  `status=todas&obra_id=`). Até 500 OS, ordem: em execução, abertas,
  concluídas, canceladas. `agora` vem **2 minutos antes** da hora do servidor
  (folga para alteração que estava gravando durante a leitura): no `desde`
  seguinte algumas OS podem vir repetidas — o app só substitui pela mais nova.
  OS excluída ou passada para outro técnico não aparece no incremental: a lista
  completa (sem `desde`) é a referência.
- **Quem vê** (`404` para quem não vê — não revela que existe): admin; o
  `responsavel_id` da OS; o dono da obra (`obras.usuario_id`; obra sem dono é
  livre, como na posse das outras rotas de obra).
- `POST /obras/:id/os`: dono da obra ou admin (`403` para os demais); obra
  cancelada → `409`. `responsavel_id` precisa ser usuário ativo. Aceita `uuid`
  opcional (senão o servidor gera). `modelo_checklist`: `generico`, a chave de
  uma disciplina, `''` = sem checklist; ausente = o da `disciplina` (ou o
  genérico). Número `OS-AAAA-NNNN`, sequencial por ano, gerado sob trava na
  transação (sem repetir nem pular, também com criações simultâneas).
- `PUT /campo/os/:id`: dono da obra ou admin (`403`); OS concluída ou
  cancelada → `409`. Campos: `titulo, descricao, tipo, disciplina,
  responsavel_id, agendada_para, modelo_checklist` (troca só enquanto nada foi
  respondido, senão `409`) e `status: 'cancelada'` (só admin; outro status →
  `400`, quem inicia/conclui é o app). `versao` diferente → `409
  CONFLITO_VERSAO` — inclusive quando o campo mexeu na OS (toda operação de
  campo e toda foto sobem a `versao`).
- `DELETE /campo/os/:id` (admin) → `{ cancelada: false|true, mensagem }`.
- Fotos — respostas: `201` foto nova; `200` com `repetida: true` para o mesmo
  `uuid` na mesma OS; `400` sem arquivo/uuid inválido; `404` OS que não vê;
  `409` uuid já usado em outra OS, OS cancelada, concluída há mais de 7 dias ou
  com 300 fotos; `413` acima de 8 MB; `415` não é JPEG/PNG/WebP pelos bytes.
  O corpo é o objeto da foto (+ `os_id`). `item_id` é guardado como veio (pode
  ser de um item extra que ainda vai chegar); o item mostra as fotos pelo
  `item_id`.
- `GET /campo/fotos/:uuid` e `/assinatura`: binário com `Content-Type` da
  imagem; o app/escritório baixa com o token e mostra como `blob:`.

### `POST /campo/sincronizar`

Corpo:

```json
{ "operacoes": [
  { "op_uuid": "…", "feita_em": "<iso do aparelho>", "tipo": "criar_os",
    "os_uuid": "…", "dados": { "obra_id": 9, "titulo": "…", "tipo": "visita", "disciplina": null, "modelo_checklist": "generico" } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "iniciar",   "os_uuid": "…", "dados": { "lat": null, "lon": null } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "responder", "os_uuid": "…", "dados": { "item_id": "c1", "resposta": "nao_conforme", "observacao": "…" } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "item_extra", "os_uuid": "…", "dados": { "item_id": "x-<uuid>", "grupo": "Extras", "texto": "…" } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "observacao", "os_uuid": "…", "dados": { "texto": "…" } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "assinar",   "os_uuid": "…", "dados": { "nome": "…", "documento": "…", "png_base64": "…" } },
  { "op_uuid": "…", "feita_em": "…", "tipo": "concluir",  "os_uuid": "…", "dados": { "lat": null, "lon": null } }
]}
```

- As operações são aplicadas **na ordem enviada**, cada uma na sua transação.
- **Idempotência**: `op_uuid` já aplicado → devolve o mesmo resultado sem aplicar de novo.
- **Conflito**: `responder` do mesmo item vale o de `feita_em` mais recente (o
  mais antigo é guardado no histórico da OS, não some). Escritório e campo
  podem mexer na mesma OS: a operação de campo não recusa por `versao`.
- **Regras**: `iniciar` só de `aberta`; `concluir` só de `em_execucao` (se vier
  de `aberta`, inicia e conclui); nada altera OS `cancelada` ou `concluida`
  (exceto `assinar` e fotos chegando atrasadas em OS concluída há até 7 dias);
  `assinar` com PNG até 300 KB, conferido pelo cabeçalho PNG.
- Resposta: `{ resultados: [{ op_uuid, ok: true|false, erro?, os_id? }], os: [OS afetadas] }`.
  `ok:false` com `erro` legível para o técnico; erro de regra **não** deve
  ser reenviado pelo app (marcar como "recusada" e mostrar); erro de rede/5xx sim.

Detalhes da sincronização (Fase 4J, backend pronto):

- Até **200 operações** por envio (`413` acima); corpo sem `operacoes` → `400`.
- Operação reenviada volta com o mesmo resultado e `repetida: true`. O
  resultado de erro de regra também fica gravado (reenviar dá o mesmo `ok:false`).
  `op_uuid` já usado por OUTRO usuário → `ok:false`.
- **Erro inesperado** (banco, disco) numa operação: a requisição inteira
  responde `500`. As operações anteriores da fila já ficaram gravadas; no
  reenvio elas voltam como `repetida` e a fila continua de onde parou.
- `feita_em` inválido ou mais de 5 minutos no futuro (relógio do aparelho
  errado) → vale a hora do servidor. `iniciada_em`/`concluida_em`/
  `respondido_em` gravam o `feita_em` do aparelho; a conclusão nunca fica antes
  do início.
- O mesmo critério de conflito do `responder` vale para `observacao` e
  `assinar`: vale o `feita_em` mais recente, o outro vai para o `historico`.
- `criar_os`: pode quem é dono da obra/admin, o `responsavel_id` da obra ou
  quem já é responsável por alguma OS dessa obra; o responsável da OS nova é
  quem a criou. `os_uuid` que já existe e o usuário vê → `ok:true` (idempotente).
- `item_extra`: `item_id` começa com `x-`; repetido com o mesmo texto →
  `ok:true` sem mudar; com outro texto → `ok:false`.
- `assinar` em OS concluída: até 7 dias depois da conclusão, como as fotos.
- `responder` com `resposta: null` limpa a resposta. Respostas também são
  aceitas com a OS ainda `aberta` (não muda o status).
- Limites: título 200, observação do item 2000, observação final 5000, texto de
  item extra 500, nome da assinatura 150, documento 30, 500 itens no checklist.

## Arquivos no disco

Fotos e assinatura ficam na pasta da obra no sistema (`utils/pastasSistema.js`),
em `Campo/<numero da OS>/`, nunca no repositório. O banco guarda o caminho.

Nomes (nunca vêm do cliente): foto `<uuid da foto>.<jpg|png|webp>` (extensão
pelo tipo conferido nos bytes); assinatura `assinatura-<op_uuid>.png`; a cada
PDF gerado, uma cópia `Relatório <numero>.pdf` (sobrescrita). O caminho no banco
é relativo à pasta da obra (renomear a obra não quebra nada). Tabelas:
`ordens_servico`, `os_fotos`, `campo_operacoes` (migração `2.0-10-campo.js`).
Obra com OS não pode ser excluída (`409`, como os outros vínculos).

## HTTPS opcional (para o app abrir sem rede)

O service worker (que guarda o app no celular para abrir sem rede) só funciona
em HTTPS ou `localhost`. O sistema roda em HTTP na rede local (decisão do
usuário). Por isso:

- sem certificado: o app funciona com rede; os dados (OS baixadas, respostas,
  fotos, assinatura) ficam no aparelho (IndexedDB) e sincronizam quando a rede
  volta — mas o app precisa estar aberto antes de perder a rede;
- com `HTTPS_PORTA`, `HTTPS_CERTIFICADO` e `HTTPS_CHAVE` no `.env`: o servidor
  abre também uma porta HTTPS com esse certificado, e o service worker passa a
  valer.

### Como ligar o HTTPS (rede local)

No `backend/.env` (o HTTP da `PORT` continua igual; sem estas linhas nada muda):

```
HTTPS_PORTA=3443
HTTPS_CERTIFICADO=C:/HM-Engenharia/certificados/servidor.pem
HTTPS_CHAVE=C:/HM-Engenharia/certificados/servidor-key.pem
# ou um .pfx/.p12 em HTTPS_CERTIFICADO (HTTPS_CHAVE vazio) com HTTPS_SENHA=<senha do pfx>
```

Reinicie o backend (`reiniciar-backend.bat`); o console mostra a linha
`HTTPS: https://SEU_IP:3443`. Se o certificado não puder ser lido, aparece
"HTTPS desligado: ..." e o HTTP segue normal. Com o HTTPS ligado o servidor
deixa de mandar o cabeçalho HSTS (senão o navegador que abriu o HTTPS passaria
a recusar o endereço HTTP do mesmo servidor). Libere a porta no Firewall do
Windows (entrada, TCP 3443, rede privada). Guarde os certificados FORA do
repositório.

O celular só confia no certificado se confiar em quem o emitiu. Duas formas:

**A) mkcert (recomendado — cria uma autoridade local e o certificado):**

1. Baixe o `mkcert` (github.com/FiloSottile/mkcert, versão para Windows) no PC
   do servidor.
2. `mkcert -install` (cria a autoridade local deste PC) e
   `mkcert -cert-file servidor.pem -key-file servidor-key.pem 192.168.0.10 hm-servidor localhost`
   (troque pelo IP fixo e pelo nome do PC do servidor — o celular precisa
   abrir exatamente um desses endereços).
3. `mkcert -CAROOT` mostra a pasta do `rootCA.pem`. Copie **só o
   `rootCA.pem`** para o celular (nunca o `rootCA-key.pem`, que fica só no PC).
4. Android: Configurações › Segurança › Criptografia e credenciais › Instalar
   certificado › Certificado de CA → escolher o arquivo. iPhone: abrir o
   arquivo (AirDrop/e-mail) › Ajustes › Perfil baixado › Instalar; depois
   Ajustes › Geral › Sobre › Ajustes de Confiança de Certificados › ligar a
   confiança total para ele.
5. No celular, abrir `https://192.168.0.10:3443/campo` e "Adicionar à tela
   inicial".

**B) Só com o PowerShell do Windows (sem baixar nada), como administrador** —
não testado nesta fase (grava no repositório de certificados do Windows):

```powershell
$cert = New-SelfSignedCertificate -Subject "CN=hm-servidor" -CertStoreLocation Cert:\LocalMachine\My `
  -KeyExportPolicy Exportable -NotAfter (Get-Date).AddYears(3) -FriendlyName "H&M sistema (rede local)" `
  -KeyUsage CertSign, DigitalSignature, KeyEncipherment `
  -TextExtension @("2.5.29.19={critical}{text}ca=true", "2.5.29.37={text}1.3.6.1.5.5.7.3.1", "2.5.29.17={text}DNS=hm-servidor&IPAddress=192.168.0.10")
$senha = Read-Host -AsSecureString "Senha do .pfx"
Export-PfxCertificate -Cert $cert -FilePath C:\HM-Engenharia\certificados\servidor.pfx -Password $senha
Export-Certificate -Cert $cert -FilePath C:\HM-Engenharia\certificados\servidor-para-celular.cer
```

No `.env`: `HTTPS_CERTIFICADO=C:/HM-Engenharia/certificados/servidor.pfx` e
`HTTPS_SENHA=<a senha>`. Instale o `servidor-para-celular.cer` no celular como
"Certificado de CA" (mesmo caminho do passo 4 acima). Esse certificado é a
própria autoridade: se o `.pfx` vazar, quem o tiver consegue se passar pelo
servidor para esses celulares — guarde-o como uma senha.

Renovação: antes de vencer, gere de novo e reinstale no celular (mkcert vale
cerca de 2 anos; o do PowerShell, o prazo do `-NotAfter`). Trocou o IP ou o
nome do servidor → gere de novo.
