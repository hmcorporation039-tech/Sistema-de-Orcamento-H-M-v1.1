---
name: controle-acesso
description: Projeto (memorial, dimensionamento de leitores, fechaduras, controladoras, fontes com bateria e cabos), relatório de vistoria/comissionamento e orçamento de sistemas eletrônicos de controle de acesso — portas, portões, catracas e cancelas com cartão, biometria, facial ou QR Code — pela IEC 60839-11-1/-11-2, NBR 9077 e IT de saídas de emergência (rota de fuga fail-safe e liberação por incêndio), NBR 9050, NBR 14565 e LGPD, no padrão da H&M Engenharia. Use quando o pedido envolver controle de acesso, fechadura eletromagnética/eletroímã, fecho elétrico, leitor de cartão, biometria, reconhecimento facial, catraca, cancela, botoeira de saída ou de emergência, controladora de acesso, porta em rota de fuga ou orçamento de controle de acesso.
---

# Controle de acesso (IEC 60839-11 / NBR 9077 / LGPD) — H&M Engenharia

Gera, a partir de **um arquivo JSON por obra**, os documentos e o rascunho de orçamento da disciplina. Os cálculos estão em `scripts/lib/` (teste `npm test` na pasta `skills`: 35 verificações desta disciplina). **Não refaça contas de cabeça: rode os scripts.**

| Documento | Tipo | Formato |
|---|---|---|
| Memorial descritivo do controle de acesso | `memorial` | Word |
| Planilha de portas, dimensionamento e materiais | `planilha` | Excel |
| Relatório de vistoria / comissionamento | `laudo` | Word |
| Checklist de campo | `checklist` | Word |

## Também no sistema (aba Análise de Projeto)

O mesmo motor roda no Sistema de Orçamentos (chave `controle_acesso`, pasta `skills/controle-acesso`), depois de registrado em `backend/src/utils/disciplinasLaudo.js`: **Análise de Projeto → Laudos e projetos por disciplina → Controle de acesso**. O formulário da tela é o mesmo JSON (importa/exporta o arquivo); os documentos saem pelos botões e o orçamento é criado direto, com materiais casados com o catálogo e mão de obra pela tabela de preços de referência (códigos `ace_*`). Mudanças em `scripts/lib/` valem para os dois — rode `npm test` antes e reinicie o backend depois.

## Fluxo de trabalho

1. **Entender o serviço:** projeto/instalação nova, ou vistoria/comissionamento de sistema existente. Pergunte o que faltar (portas em rota de fuga, existência de central de incêndio, tecnologia, quantidade de usuários); não suponha.
2. **Montar o JSON da obra:** copie `exemplos/modelo-vazio.json` para a pasta da obra (fora do repositório). O exemplo completo está em `exemplos/exemplo-clinica.json` (6 portas + 2 catracas); o esquema dos campos é o `formulario` de `scripts/lib/index.js` (`node _comum/cli.js controle-acesso modelo <obra>.json` grava o modelo em branco). Valor estimado ou duvidoso leva `[CONFERIR]`; nunca invente medição, nome, CREA, ART ou data.
3. **Calcular e conferir com o engenheiro:**
   ```bash
   cd C:\HM-Engenharia\hm-eng\skills
   node _comum/cli.js controle-acesso calcular <obra>.json
   ```
   Mostre os indicadores, as **não conformidades de projeto** e os avisos antes de gerar documentos.
4. **Gerar os documentos:**
   ```bash
   node _comum/cli.js controle-acesso documentos <obra>.json --saida <pasta da obra> [--fotos <pasta>] [--so memorial,planilha]
   ```
5. **Orçamento:** `node _comum/cli.js controle-acesso orcamento <obra>.json --modo execucao` gera o rascunho (modos: `execucao` (Implantação do controle de acesso) ou `inspecao` (Vistoria / comissionamento)). Para criar no sistema, use a ferramenta MCP `criar_rascunho_proposta` (servidor `hm-orcamentos`) com os itens gerados, ou o botão na aba Análise de Projeto.

## Entradas principais

- `sistema`: tecnologia (`proximidade`, `mifare`, `biometria`, `facial`, `qrcode`), comunicação (`wiegand`, `rs485`, `ip`), grau de segurança (1–4, IEC 60839-11-1), portas e leitores por controladora, reserva (%), autonomia (h), integração com incêndio/CFTV, usuários, visitantes simultâneos, veículos (TAG), passagem acessível, infraestrutura/switch existentes.
- `portas[]`: id, local, tipo (`simples`, `dupla`, `portao`, `catraca`, `cancela`), quantidade, sentido (`entrada` = saída por botoeira, `entrada_livre` = saída mecânica livre, `entrada_saida` = leitor dos dois lados), rota de fuga, fechadura (`eletroima`, `fecho`, `solenoide`, `motor`), modo de falha, material ou força (kgf)/peso, tecnologia própria (opcional), distância até a controladora/rack (m).
- `perfis[]` (opcional): matriz de níveis de acesso — perfil, usuários, portas, horário (a soma dá os usuários se o campo estiver vazio).

## Critérios adotados

- **Rota de fuga** (NBR 9077, IT de saídas de emergência, NBR 11785): fechadura fail-safe liberada pelo alarme de incêndio, pela falta de energia e por acionador de emergência que corta a alimentação diretamente; fail-secure só com saída mecânica livre. Sem isso → **não conformidade P1** (item R1); rota de fuga sem integração com incêndio → NC R2; catraca em rota de fuga → NC R5; catracas sem passagem acessível ≥ 0,90 m (NBR 9050) → NC A2. Essas NCs entram no relatório e no orçamento de vistoria.
- **Fechaduras:** força do eletroímã pelo material (madeira leve 150 kgf; madeira, vidro e alumínio 300 kgf; metálica/portão 500 kgf) ou pelo peso (≤ 40 kg 150, ≤ 80 kg 300, acima 500) [CONFERIR]; porta dupla = uma por folha; eletroímã é sempre fail-safe.
- **Controladoras** = max(⌈portas × (1 + reserva) ÷ portas/controladora⌉, ⌈leitores ligados × (1 + reserva) ÷ leitores/controladora⌉); catracas têm controladora própria (rede).
- **Fonte e bateria por controladora:** repouso = controladora + leitores + fechaduras fail-safe; pico = repouso + acionamento das fail-secure; fonte ≥ pico × 1,25; bateria ≥ repouso × autonomia × 1,25 [CONFERIR].
- **Cabos** = distância × 1,15: manga blindada 6 vias (Wiegand) ou 4 vias (RS-485) por leitor; manga 4 vias para sensor/botoeira; cabo PP 2 × S para a fechadura com queda ≤ 10 % de 12 V (ΔV = 2·L·I·ρ/S); UTP Cat 6 ≤ 90 m (NBR 14565) para leitores IP e catracas. Avisos: Wiegand > 100 m, UTP > 90 m, queda acima de 2,5 mm².
- **Credenciais:** cartões = usuários × 1,1; visitantes × 1,1; TAGs = veículos × 1,1; licença por portas (pontos + reserva).
- **LGPD:** biometria/face = dado sensível (art. 5º II e 11): aviso junto ao leitor, base legal registrada, alternativa sem biometria, templates criptografados, retenção e exclusão.
- Correntes, potências PoE e forças são típicas de mercado e saem com [CONFERIR] — usar a ficha técnica do equipamento escolhido. Alturas de leitores/botoeiras 0,80–1,20 m (NBR 9050) [CONFERIR edição].

O checklist (24 itens) está em `dados/checklist_base.json`; itens não conformes viram não conformidades com prioridade (P1 48 h, P2 30 dias, P3 90 dias, P4 manutenção) e entram no orçamento do modo `inspecao`.

## Regras

- Dados reais de clientes ficam na pasta do cliente, **nunca** no repositório (`exemplos/` só tem dados ilustrativos — "Cliente Exemplo").
- Documento gerado é rascunho técnico: deve ser revisado e assinado pelo responsável técnico habilitado. Conferir a IT de saídas de emergência do Corpo de Bombeiros do estado.
- Ao mudar cálculo, atualize `testes/teste.js` e rode `npm test` na pasta `skills`.
