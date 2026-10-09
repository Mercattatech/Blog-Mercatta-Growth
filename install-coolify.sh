#!/usr/bin/env bash
# ==============================================================================
#  INSTALADOR AUTOMÁTICO 1-CLIQUE: BLOG MERCATTA GROWTH (SAAS COM IA)
#  Compatível com: Coolify, Hostinger VPS (Ubuntu/Debian), Docker & PostgreSQL
# ==============================================================================

set -e

# Cores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${PURPLE}==============================================================================${NC}"
echo -e "${PURPLE}   🚀 MERCATTA GROWTH — INSTALADOR AUTOMÁTICO PARA COOLIFY / HOSTINGER VPS    ${NC}"
echo -e "${PURPLE}==============================================================================${NC}"
echo ""

# 1. VERIFICAÇÃO DO DOCKER
echo -e "${CYAN}[1/5] Verificando Docker e Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker não encontrado no sistema. Instalando automaticamente...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker || service docker start
    systemctl enable docker || true
    echo -e "${GREEN}✓ Docker instalado com sucesso!${NC}"
else
    echo -e "${GREEN}✓ Docker já está instalado: $(docker --version)${NC}"
fi

# Verifica Compose
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Instalando docker-compose plugin...${NC}"
    apt-get update && apt-get install -y docker-compose-plugin || true
fi
echo -e "${GREEN}✓ Docker Compose verificado.${NC}"
echo ""

# 2. CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE (.env)
echo -e "${CYAN}[2/5] Configurando variáveis de ambiente de Produção...${NC}"

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Criando arquivo .env seguro com chaves de produção...${NC}"
    
    # Gera JWT Secret seguro de 64 caracteres
    AUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
    # Gera senha forte aleatória para o Postgres
    PG_PASS=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
    
    # Detecta IP público do servidor
    SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "localhost")

    cat <<EOF > "$ENV_FILE"
# -------------------------------------------------------------
# Configurações de Produção — Mercatta Growth
# Gerado automaticamente pelo instalador em $(date)
# -------------------------------------------------------------
NODE_ENV=production
PORT=3000
SITE_URL=http://${SERVER_IP}:3000

# Chave de Sessão Criptográfica
AUTH_SECRET=${AUTH_SECRET}

# Banco de Dados PostgreSQL Interno (Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=mercatta_blog
DATABASE_URL=postgresql://postgres:${PG_PASS}@postgres:5432/mercatta_blog?sslmode=disable

# Chave de IA Google Gemini (Insira sua chave em https://aistudio.google.com/apikey)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest

# Administradores Iniciais
ADMIN_EMAIL=admin@braziw.com.br
ADMIN_NAME="Administrador Braziw"
SUPERADMIN_EMAIL=admin@grupomercatta.com.br
SUPERADMIN_NAME="Mercatta Super Admin"
MERCATTA_DOMAIN=grupomercatta.com.br
EOF

    echo -e "${GREEN}✓ Arquivo .env gerado com sucesso com senhas e chaves seguras!${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env existente detectado. Mantendo suas configurações.${NC}"
fi
echo ""

# 3. BUILD DOS CONTAINERS COM DOCKER COMPOSE
echo -e "${CYAN}[3/5] Construindo containers (Next.js 16 + PostgreSQL)...${NC}"
docker compose down || true
docker compose up -d --build

echo ""
echo -e "${CYAN}[4/5] Aguardando inicialização do banco de dados e da aplicação...${NC}"
sleep 5

# Aguarda healthcheck do PostgreSQL
RETRIES=15
until docker compose exec -T postgres pg_isready -U postgres -d mercatta_blog &>/dev/null || [ $RETRIES -eq 0 ]; do
  echo -e "${YELLOW}Aguardando PostgreSQL iniciar... ($RETRIES tentativas restantes)${NC}"
  RETRIES=$((RETRIES-1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo -e "${RED}Erro: O banco PostgreSQL demorou muito para iniciar.${NC}"
else
  echo -e "${GREEN}✓ PostgreSQL conectado e pronto para conexões!${NC}"
fi

echo ""
# 4. VERIFICAÇÃO FINAL DE SAÚDE
echo -e "${CYAN}[5/5] Testando endpoints da aplicação...${NC}"
sleep 3

SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "localhost")
APP_URL="http://${SERVER_IP}:3000"

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}   🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO! SEU SAAS ESTÁ NO AR!                 ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${BLUE}📌 URL Pública da Aplicação:${NC} ${CYAN}${APP_URL}/${NC}"
echo -e "${BLUE}📌 Painel Administrativo:${NC}     ${CYAN}${APP_URL}/admin/login/${NC}"
echo ""
echo -e "${YELLOW}🔑 Credenciais Iniciais de Acesso:${NC}"
echo -e "   • Super Admin (Mercatta):  ${CYAN}admin@grupomercatta.com.br${NC}  | Senha: ${CYAN}admin123${NC}"
echo -e "   • Admin Cliente (Braziw):   ${CYAN}admin@braziw.com.br${NC}         | Senha: ${CYAN}admin123${NC}"
echo ""
echo -e "${PURPLE}💡 COMO USAR NO PAINEL DO COOLIFY:${NC}"
echo -e "   1. No Coolify, crie um novo recurso selecionando: ${YELLOW}Docker Compose${NC} ou ${YELLOW}Public/Private Git Repository${NC}."
echo -e "   2. O Coolify detectará automaticamente o ${CYAN}Dockerfile${NC} e o ${CYAN}docker-compose.yml${NC}."
echo -e "   3. Se utilizar o PostgreSQL nativo do Coolify, basta adicionar nas Environment Variables do Coolify:"
echo -e "      ${CYAN}DATABASE_URL=postgresql://usuario:senha@host:5432/banco${NC}"
echo -e "   4. Para ativar a IA, lembre-se de preencher a variável ${CYAN}GEMINI_API_KEY${NC} no seu .env."
echo ""
echo -e "${GREEN}Todos os serviços estão rodando em background (docker compose ps).${NC}"
echo -e "${GREEN}Para ver os logs a qualquer momento: docker compose logs -f app${NC}"
echo -e "${PURPLE}==============================================================================${NC}"
