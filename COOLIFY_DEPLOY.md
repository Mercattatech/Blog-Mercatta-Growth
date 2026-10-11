# 🚀 Guia de Implantação: Coolify na Hostinger VPS (PostgreSQL)

Este guia contém o comando **1-Clique via terminal (cURL)** e o passo a passo para implantar o **Mercatta Growth (SaaS de Blogs com IA)** no **Coolify** na sua VPS da **Hostinger**, integrado ao **PostgreSQL**.

---

## ⚡ 1. Instalador 1-Clique via Terminal SSH (O mais rápido)

Basta acessar sua VPS da Hostinger via SSH e colar este comando único:

```bash
curl -fsSL https://raw.githubusercontent.com/Mercattatech/Blog-Mercatta-Growth/main/install-coolify.sh | bash
```

> **Dica:** Se você já possui uma URL do PostgreSQL pronta (do Coolify, Neon ou Supabase), pode passar no mesmo comando:
> ```bash
> DATABASE_URL="postgresql://usuario:senha@host:5432/banco" curl -fsSL https://raw.githubusercontent.com/Mercattatech/Blog-Mercatta-Growth/main/install-coolify.sh | bash
> ```

### O que o instalador faz sozinho:
1. Clona/atualiza automaticamente o repositório oficial.
2. Instala Docker e Docker Compose caso não estejam na VPS.
3. Gera senhas criptográficas e seguras para `AUTH_SECRET` e `POSTGRES_PASSWORD`.
4. Constrói a imagem Docker de produção (Next.js 16 Multi-stage).
5. Sobe o container da aplicação e do PostgreSQL com migrações automáticas.
6. Mostra na tela a URL pública pronta, os dados de login e as credenciais de Super Admin.

---

## 🌐 2. Deploy pelo Painel Web do Coolify

Se você prefere gerenciar tudo visualmente pela interface web do Coolify:

### Passo 1: Criar o Banco de Dados PostgreSQL no Coolify
1. No painel do Coolify, clique em **+ New Resource**.
2. Selecione **Databases** -> **PostgreSQL**.
3. Escolha o nome `mercatta_blog`.
4. Clique em **Deploy**.
5. Na aba de configurações do banco, copie a **Internal Connection String**, por exemplo:
   `postgresql://postgres:sua_senha@postgres:5432/mercatta_blog`

### Passo 2: Criar a Aplicação Next.js no Coolify
1. No Coolify, clique em **+ New Resource** -> **Application**.
2. Escolha **Public Repository** e cole:
   `https://github.com/Mercattatech/Blog-Mercatta-Growth.git`
3. **Branch:** `main`
4. **Base Directory:** `/` *(deixe na raiz)*
5. **Build Pack:** Selecione **Dockerfile** *(ele usará o Dockerfile otimizado do repositório)*
6. **Port:** `3000`

### Passo 3: Adicionar as Variáveis de Ambiente no Coolify
Na aba **Environment Variables** da aplicação, adicione:

| Variável | Valor Recomendado | Finalidade |
|---|---|---|
| `NODE_ENV` | `production` | Modo de produção do Next.js |
| `PORT` | `3000` | Porta padrão da aplicação |
| `SITE_URL` | `https://grupomercatta.com.br` | Seu domínio principal |
| `DATABASE_URL` | *(Cole a Internal URL do Postgres gerada no Passo 1)* | Conexão com o banco |
| `AUTH_SECRET` | *(Chave segura de 64 caracteres)* | Criptografia de sessões |
| `GEMINI_API_KEY` | *(Sua chave Gemini)* | Geração de artigos e imagens com IA |
| `GEMINI_MODEL` | `gemini-flash-latest` | Modelo de IA de alta performance |
| `SUPERADMIN_EMAIL` | `admin@grupomercatta.com.br` | Acesso de Super Admin |
| `SUPERADMIN_NAME` | `Mercatta Super Admin` | Nome do Super Administrador |
| `MERCATTA_DOMAIN` | `grupomercatta.com.br` | Domínio master do SaaS |

> 🔑 **Para gerar um AUTH_SECRET rápido no terminal:**
> `openssl rand -hex 32`

7. Clique em **Deploy** no topo do Coolify! O Coolify gerará o certificado SSL automático (Let's Encrypt) e conectará com o seu domínio.

---

## 🔑 Credenciais Iniciais de Acesso

Após a inicialização do banco, os usuários são criados automaticamente:

- **Super Administrador (Acesso Geral a todos os Tenants, WhatsApp Flow, Configurações e MCP):**
  - **URL do Login:** `http://SEU_IP:3000/admin/login/` ou `https://seu-dominio.com/admin/login/`
  - **E-mail:** `admin@grupomercatta.com.br`
  - **Senha inicial:** `admin123`

- **Administrador do Tenant Inicial (Braziw):**
  - **E-mail:** `admin@braziw.com.br`
  - **Senha inicial:** `admin123`

*(Altere as senhas no menu Perfil após o primeiro acesso).*

---

## 🛠️ Comandos de Manutenção na VPS

```bash
# Ver status dos containers
docker compose ps

# Acompanhar logs em tempo real
docker compose logs -f app

# Reiniciar aplicação
docker compose restart

# Atualizar para a versão mais recente do GitHub
git pull origin main && docker compose up -d --build
```
