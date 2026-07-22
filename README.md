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

Existem dois jeitos de rodar o sistema — escolha conforme o momento.

### Modo desenvolvimento (dois terminais, com hot-reload)
Use isso quando for mexer no código.

**Backend (Terminal 1)**
```bash
cd backend
npm install
npm run dev
```

**Frontend (Terminal 2)**
```bash
cd frontend
npm install
npm start
```
Acesse **http://localhost:3000**.

### Modo produção (um processo só, sem terminal aberto)
O backend também serve a interface pronta (build do React) na mesma porta —
não precisa de dois terminais nem deixar nada visível na tela.

```bash
cd frontend && npm run build
cd ../backend && npm start
```
Acesse **http://localhost:3001** (API e interface na mesma porta).

> Sempre que você alterar algo em `frontend/src`, rode `npm run build` de
> novo — senão o modo produção continua servindo a versão antiga.

### Iniciar sozinho ao ligar o PC
Um atalho em `shell:startup` (pasta Inicializar do Windows) já está
configurado para rodar o backend em modo produção automaticamente, sem
janela visível, toda vez que você faz login no Windows — veja a seção 8.

---

## 4. Acessar o sistema

- Modo desenvolvimento: **http://localhost:3000**
- Modo produção / inicialização automática: **http://localhost:3001**

Login inicial:
- Usuário: `admin@hmengenharia.com`
- Senha: `admin123` (troque assim que possível — veja seção 8.1)

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
   EMAIL_IMAP_USER=ha@gmail.com
   EMAIL_IMAP_APP_PASSWORD=senha-de-16-digitos-sem-espacos
   ```
4. Reinicie o backend. Se as três variáveis estiverem preenchidas, a verificação
   automática roda **3 vezes por dia** (a cada 8h; a primeira, 10 segundos após
   o servidor subir). Também dá para disparar na hora pelo botão **"Verificar
   agora"** na tela de Materiais.

### Como funciona
- Busca e-mails com "DANFE" e anexo a partir de uma data fixa (definida no
  código, em `DESDE_DATA` no `notaFiscalEmailService.js`) que ainda não foram
  lidos — nunca reprocessa nem olha para trás dessa data.
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

## 6. Backup automático do banco

Uma tarefa agendada do Windows ("HM-Engenharia Backup Diário") roda todo dia às
2h da manhã e salva um `.sql.zip` do banco em `backend/backups/` (mantém os
últimos 30 dias, apaga o resto sozinho). Para rodar manualmente:
```powershell
powershell -ExecutionPolicy Bypass -File backend\scripts\backup-db.ps1
```
Para restaurar um backup, descompacte o `.zip` e rode:
```
psql -h localhost -U postgres -d hm_orcamentos -f caminho\para\o\backup.sql
```
Recomendado copiar esses arquivos periodicamente para outro lugar (pen drive,
nuvem) — um backup que só existe na mesma máquina não protege contra falha de
disco.

---

## 7. Acesso em rede local

Para outros computadores na mesma rede acessarem:
1. Descubra o IP da sua máquina: `ipconfig` no terminal
2. Em modo desenvolvimento: `http://SEU_IP:3000`. Em modo produção /
   inicialização automática: `http://SEU_IP:3001`

---

## 8. Iniciar automaticamente ao ligar o PC

Um atalho oculto em `shell:startup` ("HM Engenharia - Sistema.lnk") sobe o
backend em modo produção (mesma porta serve API + interface) toda vez que
você faz login no Windows, sem abrir nenhuma janela.

- **Log:** `backend/logs/sistema.log` — se algo não subir, olhe esse arquivo.
- **Parar manualmente:** abra o Gerenciador de Tarefas, procure o processo
  `node.exe` e finalize (ou `Get-Process node | Stop-Process` no PowerShell).
- **Desativar o início automático:** apague o atalho em
  `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`.
- **Script usado:** `backend/scripts/iniciar-producao.ps1`.

### 8.1 Segurança
Já trocamos a senha padrão do admin e o `JWT_SECRET` nesta instalação. Se
você recriar o banco do zero, o usuário volta a ser criado com a senha
padrão `admin123` — troque assim que possível pela tela de login → seu
usuário, ou peça para um administrador redefinir na tela **Usuários**.

### 8.2 Quando estiver pronto para sair do computador local
Hoje o sistema roda só neste PC. Quando fizer sentido para o negócio, dá para
migrar para um servidor/VPS pequeno (ex.: DigitalOcean, Hetzner, Contabo) e
manter tudo rodando 24/7 independente deste computador estar ligado — isso
fica para uma etapa futura, quando você quiser dar esse passo.

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
