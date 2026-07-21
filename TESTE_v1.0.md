# H&M Engenharia — Sistema de Orçamentos
## Relatório de Testes — Versão 1.0.0

**Data do teste:** 2026-07-20
**Ambiente:** local (Windows), PostgreSQL 18, Node.js

---

## 1. Escopo da versão 1.0

| Módulo | Descrição | Status |
|---|---|---|
| Login / Autenticação | JWT, usuário admin padrão | ✅ Concluído |
| Clientes | Cadastro, edição, busca, remoção | ✅ Concluído |
| Materiais | Catálogo, categorias, busca, importação em massa | ✅ Concluído |
| Orçamento | Montagem de proposta por seções/itens, cálculo de BDI e totais | ✅ Concluído |
| Histórico | Listagem, filtro por status, detalhe, mudança de status | ✅ Concluído |
| PDF | Geração da proposta em PDF para envio ao cliente | ✅ Concluído |

---

## 2. Testes automatizados executados (via API)

Os testes abaixo foram executados de ponta a ponta contra o backend real, com o PostgreSQL local ativo (banco `hm_orcamentos`). Os dados de teste foram removidos ao final — o sistema fica limpo para o primeiro uso real.

| # | Teste | Resultado |
|---|---|---|
| 1 | `GET /health` | ✅ `{"status":"ok"}` |
| 2 | `POST /auth/login` com `admin@hmengenharia.com` / `admin123` | ✅ Token JWT emitido |
| 3 | `POST /clientes` — criar cliente | ✅ Cliente criado (id 1) |
| 4 | `POST /materiais` — criar material | ✅ Material criado (id 1) |
| 5 | `POST /propostas` — criar proposta com 2 seções e 2 itens | ✅ Proposta **P142** gerada, total R$ 900,00 calculado corretamente |
| 6 | `GET /propostas/1` — detalhar proposta | ✅ Retornou seções e itens corretamente vinculados |
| 7 | `PATCH /propostas/1/status` → `Aprovada` | ✅ Status atualizado |
| 8 | `GET /propostas/1/pdf` | ✅ PDF de 34 KB gerado, cabeçalho `%PDF-1.4` válido |
| 9 | Limpeza dos dados de teste (`DELETE`) | ✅ Cliente, material e proposta de teste removidos |
| 10 | Reset do contador de numeração de propostas | ✅ Próximo número volta a ser **P142** |
| 11 | `npm run build` do frontend (react-scripts) | ✅ Compilou sem erros |

O PDF gerado durante o teste 8 foi salvo em [`Proposta_P142_teste.pdf`](Proposta_P142_teste.pdf), na raiz do projeto, como evidência do layout final (cabeçalho da empresa, seções, itens, subtotais, BDI e total).

> Os itens acima foram executados via linha de comando (curl) contra a API real — não é uma simulação. A interface web (React) não pôde ser clicada automaticamente neste ambiente; use o checklist manual abaixo para validar visualmente.

---

## 3. Checklist de teste manual (pela interface)

Execute `iniciar.bat` (ou `npm run dev` no backend e `npm start` no frontend) e acesse `http://localhost:3000`.

### Login
- [ ] Acessar `/login` e entrar com `admin@hmengenharia.com` / `admin123`
- [ ] Tentar senha errada → deve exibir erro
- [ ] Após login, redireciona para `/orcamento`

### Clientes
- [ ] Cadastrar um cliente novo (nome obrigatório)
- [ ] Editar o cliente cadastrado
- [ ] Buscar por nome/documento/e-mail
- [ ] Remover um cliente

### Materiais
- [ ] Cadastrar um material (descrição, categoria e unidade obrigatórios)
- [ ] Filtrar por categoria
- [ ] Buscar por descrição/código/marca
- [ ] Importar vários materiais colando texto no formato `código;descrição;categoria;unidade;preço;marca`
- [ ] Editar e remover um material

### Orçamento
- [ ] Selecionar/digitar um cliente (autocomplete puxa cadastrados)
- [ ] Preencher tipo, porte, local da obra, validade, condições de pagamento
- [ ] Adicionar itens em "Materiais" puxando do catálogo (auto-preenche descrição/unidade/preço)
- [ ] Adicionar itens manuais em "Mão de Obra"
- [ ] Criar uma seção nova e renomeá-la
- [ ] Conferir se os subtotais e o total geral atualizam em tempo real ao mudar quantidade/preço/BDI
- [ ] Salvar a proposta e conferir o número gerado (ex.: P142)

### Histórico
- [ ] Ver a proposta recém-criada na lista
- [ ] Abrir o detalhe e conferir seções/itens/totais
- [ ] Mudar o status (Ativa → Aprovada, Recusada, Cancelada)
- [ ] Baixar o PDF pelo botão "Baixar PDF" e abrir o arquivo
- [ ] Buscar por número/cliente/local e filtrar por status
- [ ] Excluir uma proposta de teste

---

## 4. Pendências / observações conhecidas

- **Logo da empresa:** `frontend/public/logo.jpg` não existe no projeto — o círculo do cabeçalho/login fica sem imagem (não quebra a tela, só fica vazio). Adicione o arquivo `logo.jpg` em `frontend/public/` para exibi-lo.
- **Senha do admin:** troque a senha padrão (`admin123`) após o primeiro acesso em produção.
- **PostgreSQL:** o sistema exige uma instância local rodando com o banco `hm_orcamentos` criado — confirmado funcional neste teste com PostgreSQL 18.
- **Categorização Materiais x Mão de Obra:** o sistema identifica seções de "mão de obra" pelo nome (contendo "mão de obra" ou "serviço"); qualquer outro nome de seção é somado como material no subtotal.

---

## 5. Conclusão

A versão **1.0.0** está funcional de ponta a ponta: autenticação, cadastro de clientes e materiais, montagem de orçamentos com cálculo automático de BDI, histórico com controle de status e exportação em PDF. Recomenda-se rodar o checklist manual da seção 3 antes de liberar para uso pela equipe.
