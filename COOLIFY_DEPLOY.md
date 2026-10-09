# 🚀 Guia de Implantação: Coolify na Hostinger VPS (PostgreSQL)

Este guia contém tudo o que você precisa para colocar o **Mercatta Growth (SaaS de Blogs com IA)** no ar com 1 clique no **Coolify** e na sua VPS da **Hostinger**, integrado com **PostgreSQL**.

---

## 🎯 Opção 1: Instalador com 1 Clique no Terminal da VPS (Recomendado)

Se você já acessa sua VPS da Hostinger via SSH, você pode instalar e subir todo o ambiente (Node.js, Next.js 16, Docker e PostgreSQL) em 1 único comando:

```bash
# 1. Acesse sua VPS Hostinger via SSH:
ssh root@SEU_IP_HOSTINGER

# 2. Clone o repositório (ou acesse a pasta do projeto):
git clone <URL_DO_SEU_REPOSITORIO> app
cd app/blog-app

# 3. Execute o instalador automático:
chmod +x install-coolify.sh
./install-coolify.sh
```

### O que o instalador faz automaticamente:
1. Verifica se o Docker e o Docker Compose estão instalados (e instala se não estiverem).
2. Gera chaves criptográficas seguras de 64 caracteres para o `AUTH_SECRET` (JWT).
3. Gera senha aleatória forte para o PostgreSQL.
4. Cria o arquivo `.env` de produção completo.
5. Constrói o container multi-stage otimizado do Next.js e sobe o PostgreSQL com volumes persistentes.
6. Executa as migrações do banco e popula os tenants iniciais e o Super Admin.
7. Exibe a URL de acesso e as credenciais prontas na sua tela!

---

## 🌐 Opção 2: Deploy Direto pelo Painel Web do Coolify

Se você já tem o **Coolify** rodando na Hostinger:

### Passo 1: Criar o Banco PostgreSQL no Coolify
1. No painel do Coolify, clique em **+ Create Resource**.
2. Selecione **Databases** -> **PostgreSQL**.
3. Defina o nome do banco como `mercatta_blog`.
4. Clique em **Deploy**. O Coolify gerará a string de conexão (Internal URL), por exemplo:
   `postgresql://postgres:SENHA@postgres:5432/mercatta_blog`

### Passo 2: Criar a Aplicação Next.js no Coolify
1. No Coolify, clique em **+ Create Resource** -> **Application**.
2. Escolha **Public / Private Repository** (GitHub / GitLab) e aponte para o seu repositório.
3. Defina o **Base Directory** como: `/blog-app`
4. Em **Build Pack**, selecione **Dockerfile** (o arquivo `blog-app/Dockerfile` já está pronto e otimizado).
5. Defina a porta de exposição como: `3000`.

### Passo 3: Configurar as Variáveis de Ambiente no Coolify
Na aba **Environment Variables** da aplicação no Coolify, adicione:

| Variável | Valor Recomendado | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Ambiente de produção |
| `PORT` | `3000` | Porta padrão do container |
| `SITE_URL` | `https://grupomercatta.com.br` | URL principal do seu domínio |
| `DATABASE_URL` | `postgresql://...` | A URL do Postgres gerada no Passo 1 |
| `AUTH_SECRET` | *(Chave de 64 caracteres)* | Gere com `openssl rand -hex 32` |
| `GEMINI_API_KEY` | *(Sua chave Gemini)* | Obtenha em https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | `gemini-flash-latest` | Modelo de IA de alta velocidade |
| `SUPERADMIN_EMAIL`| `admin@grupomercatta.com.br` | E-mail do Super Admin |
| `SUPERADMIN_NAME` | `Mercatta Super Admin` | Nome do Super Administrador |
| `MERCATTA_DOMAIN` | `grupomercatta.com.br` | Domínio base multi-tenant |

6. Clique em **Deploy** no topo do Coolify!

---

## 🔑 Credenciais Iniciais de Acesso

Após a inicialização do banco, os usuários são criados automaticamente:

- **Super Administrador (Acesso Global a todos os Tenants, WhatsApp Flow e MCP):**
  - **URL:** `https://seu-dominio.com/admin/login/`
  - **E-mail:** `admin@grupomercatta.com.br`
  - **Senha inicial:** `admin123`

- **Administrador do Tenant Inicial (Braziw):**
  - **E-mail:** `admin@braziw.com.br`
  - **Senha inicial:** `admin123`

*(Lembre-se de alterar as senhas no menu Perfil após o primeiro acesso).*

---

## 🛠️ Comandos Úteis na VPS

```bash
# Ver status dos containers
docker compose ps

# Acompanhar logs em tempo real
docker compose logs -f app

# Reiniciar containers
docker compose restart

# Parar tudo
docker compose down

# Recarregar com nova versão
git pull && docker compose up -d --build
```
