# H&M Engenharia — Sistema de Orçamentos

## Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL 15+ instalado e rodando
- VS Code

---

## 1. Configurar o Banco de Dados

Abra o pgAdmin ou o terminal do PostgreSQL e execute:

```sql
CREATE DATABASE hm_orcamentos;
```

---

## 2. Configurar variáveis de ambiente

### Backend
Crie o arquivo `backend/.env` com:
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hm_orcamentos
DB_USER=postgres
DB_PASS=SUA_SENHA_AQUI
JWT_SECRET=hm_eng_secret_2024_mude_isso
```

### Frontend
Crie o arquivo `frontend/.env` com:
```
REACT_APP_API_URL=http://localhost:3001
```

---

## 3. Instalar dependências e rodar

### Backend (Terminal 1)
```bash
cd backend
npm install
npm run dev
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm start
```

---

## 4. Acessar o sistema

Abra no navegador: **http://localhost:3000**

Login inicial:
- Usuário: `admin`
- Senha: `admin123`

> ⚠️ Troque a senha após o primeiro acesso!

---

## 5. Importação automática de notas fiscais por e-mail (opcional)

O sistema pode verificar periodicamente a caixa de entrada de um Gmail em busca de
e-mails com "DANFE" e anexo (XML e/ou PDF da nota fiscal), extrair os itens e
criar/atualizar materiais no catálogo automaticamente — usando o XML como fonte
confiável dos dados e o PDF só como comparação quando os dois vêm juntos.

### Gerar a senha de app do Gmail
1. Ative a **verificação em duas etapas** na conta Google que recebe as notas
   (myaccount.google.com → Segurança).
2. Em myaccount.google.com → Segurança → **Senhas de app**, crie uma senha para
   "Mail" (16 caracteres, sem espaços).
3. No `backend/.env`, preencha:
   ```
   EMAIL_IMAP_HOST=imap.gmail.com
   EMAIL_IMAP_PORT=993
   EMAIL_IMAP_USER=email-da-empresa@gmail.com
   EMAIL_IMAP_APP_PASSWORD=senha-de-16-digitos-sem-espacos
   ```
4. Reinicie o backend. Se as três variáveis estiverem preenchidas, a verificação
   automática roda a cada 15 minutos (a primeira, 10 segundos após o servidor
   subir). Também dá para disparar na hora pelo botão **"Verificar agora"** na
   tela de Materiais.

### Como funciona
- Busca e-mails com "DANFE" e anexo dos últimos 60 dias que ainda não foram lidos.
- Se o e-mail tem **XML**, ele é a fonte de verdade (descrição, NCM, unidade,
  quantidade e preço de compra). Se também vier um PDF, ele só é usado para
  comparar e alertar divergências no log do servidor — nunca sobrescreve o XML.
- Se só vier **PDF**, os dados são lidos por heurística de texto (menos confiável).
- Material com a mesma descrição já cadastrada: atualiza o preço de compra e
  recalcula o preço de venda pela **margem padrão** (configurável na tela de
  Materiais). Se alguém já ajustou o preço de venda manualmente pela tela de
  edição, esse preço fica protegido e só o custo é atualizado.
- Material novo: cria com a categoria "Não classificado" (ou herdando a
  categoria de outro material com o mesmo NCM, se houver) — vale revisar
  periodicamente os itens com essa categoria.
- Cada nota (pela chave de acesso) e cada e-mail só são processados uma vez.

Sem essas variáveis configuradas, o sistema funciona normalmente — só fica sem
a importação automática (a importação manual de PDF/XML na tela de Materiais
continua disponível).

---

## 6. Acesso em rede local

Para outros computadores na mesma rede acessarem:
1. Descubra o IP da sua máquina: `ipconfig` no terminal
2. Outros computadores acessam: `http://SEU_IP:3000`

---

## Estrutura do projeto
```
hm-eng/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── config/   # Conexão com banco
│   │   ├── models/   # Tabelas do banco
│   │   ├── routes/   # Rotas da API
│   │   ├── controllers/ # Lógica de negócio
│   │   └── middleware/  # Auth JWT
│   └── package.json
└── frontend/         # React
    ├── src/
    │   ├── pages/    # Telas do sistema
    │   ├── components/ # Componentes reutilizáveis
    │   ├── services/ # Chamadas à API
    │   └── hooks/    # React hooks
    └── package.json
```
