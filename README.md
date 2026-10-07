# Blog Braziw — Nova Aplicação (Next.js 16 + App Router)

Aplicação moderna do blog da **Braziw — Idiomas e Intercâmbios**, contendo o site público completo (184 artigos migrados), área administrativa completa com gestão de artigos, agendamento de postagens, gerador e redator de conteúdo com Inteligência Artificial (Google Gemini) focado em SEO/Google Helpful Content e busca por IA, e recuperação de senha.

---

## 🚀 Como rodar localmente

1. Acesse a pasta do projeto:
   ```bash
   cd blog-app
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   O blog estará acessível em: **`http://localhost:3100`**  
   O painel administrativo estará em: **`http://localhost:3100/admin/`**

---

## 🔐 Primeiro acesso ao Painel Administrativo

O banco de dados local já contém os 184 artigos e o usuário administrador (`admin@braziw.com.br`).

- Usuário de teste já criado: `admin@braziw.com.br` com a senha temporária `TesteAdmin2026x`.
- Se quiser redefinir a senha de qualquer usuário, basta acessar [http://localhost:3100/admin/forgot/](http://localhost:3100/admin/forgot/). Como o SMTP está em modo de teste, o link exclusivo de redefinição é **impresso diretamente no terminal** onde o `npm run dev` está rodando.

---

## 🧠 Ativando a Inteligência Artificial (Google Gemini)

O painel inclui:
- **Treinar a IA** (`/admin/training/`): objetivo do blog, público, tom, estilo, regras proibidas, CTAs e artigos de referência.
- **Ideias com IA** (`/admin/ideas/`): botão para gerar pautas exclusivas com alta intenção de busca orgânica, sem repetir artigos já existentes.
- **Redação Automática**: ao aprovar uma ideia, a IA escreve o artigo completo (H2/H3, resposta rápida no padrão Google Featured Snippets / AI Overviews, FAQ para schema markup e links internos) e salva como **Rascunho**.
- **Editor Completo**: o administrador pode revisar e ajustar cada palavra, título, slug, capas, categorias e meta tags antes de publicar.

Para ativar a IA:
1. Gere uma chave de API gratuita em: [Google AI Studio](https://aistudio.google.com/apikey).
2. Adicione no seu arquivo `blog-app/.env.local`:
   ```bash
   GEMINI_API_KEY=sua_chave_aqui
   ```
3. Reinicie o servidor.

---

## ☁️ Deploy na Vercel

1. Suba o repositório para o seu GitHub/GitLab.
2. Na Vercel, crie um novo projeto apontando para a pasta raiz `blog-app`.
3. Adicione o banco Postgres gratuito da própria Vercel (ou conecte o Neon): Marketplace → **Neon Serverless Postgres** e anexe ao projeto.
4. Adicione o **Vercel Blob** (Storage → Blob) para upload de imagens.
5. Configure as Variáveis de Ambiente no painel da Vercel (consulte `.env.example`):
   - `DATABASE_URL` (injetado automaticamente pelo Neon/Postgres da Vercel)
   - `AUTH_SECRET` (gere uma string de 32 caracteres com `openssl rand -hex 32`)
   - `GEMINI_API_KEY`
   - `BLOB_READ_WRITE_TOKEN` (injetado pelo Vercel Blob)
   - `SITE_URL` (ex: `https://blog.braziw.com.br`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
6. Após o primeiro deploy, rode a migração inicial dos 184 artigos uma única vez apontando para o banco de produção:
   ```bash
   DATABASE_URL="postgres://..." npm run seed
   ```
