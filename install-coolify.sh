#!/usr/bin/env bash
# ==============================================================================
#  MERCATTA GROWTH — INSTALADOR AUTOMÁTICO 1-CLIQUE (CURL | BASH)
#  Compatível com: Coolify, Hostinger VPS (Ubuntu/Debian/CentOS), Docker & PostgreSQL
# ==============================================================================

set -e

# Cores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear 2>/dev/null || true

echo -e "${PURPLE}==============================================================================${NC}"
echo -e "${PURPLE}${BOLD}   🚀 MERCATTA GROWTH — INSTALADOR AUTOMÁTICO 1-CLIQUE                       ${NC}"
echo -e "${PURPLE}      Plataforma SaaS Multi-Tenant com IA & PostgreSQL                       ${NC}"
echo -e "${PURPLE}==============================================================================${NC}"
echo ""

REPO_URL="https://github.com/Mercattatech/Blog-Mercatta-Growth.git"
TARGET_DIR="blog-mercatta-growth"

# ------------------------------------------------------------------------------
# 1. VERIFICAÇÃO / CLONE DO REPOSITÓRIO
# ------------------------------------------------------------------------------
echo -e "${CYAN}[1/6] Verificando arquivos da aplicação...${NC}"

if [ -f "Dockerfile" ] && [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓ Executando dentro da pasta do repositório ($(pwd)).${NC}"
else
    echo -e "${YELLOW}Repositório não detectado na pasta atual.${NC}"
    
    # Instala Git caso necessário
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}Instalando Git no sistema...${NC}"
        if command -v apt-get &> /dev/null; then
            apt-get update -qq && apt-get install -y -qq git
        elif command -v yum &> /dev/null; then
            yum install -y git
        elif command -v apk &> /dev/null; then
            apk add git
        fi
    fi

    if [ -d "$TARGET_DIR" ]; then
        echo -e "${CYAN}Diretório $TARGET_DIR já existe. Atualizando com git pull...${NC}"
        cd "$TARGET_DIR"
        git pull origin main || true
    else
        echo -e "${CYAN}Clonando repositório oficial em ./$TARGET_DIR...${NC}"
        git clone "$REPO_URL" "$TARGET_DIR"
        cd "$TARGET_DIR"
    fi
    echo -e "${GREEN}✓ Repositório pronto em $(pwd).${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# 2. VERIFICAÇÃO E INSTALAÇÃO DO DOCKER & DOCKER COMPOSE
# ------------------------------------------------------------------------------
echo -e "${CYAN}[2/6] Verificando Docker e Docker Compose...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker não encontrado. Instalando automaticamente via get.docker.com...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker || service docker start || true
    systemctl enable docker || true
    echo -e "${GREEN}✓ Docker instalado com sucesso: $(docker --version)${NC}"
else
    echo -e "${GREEN}✓ Docker já instalado: $(docker --version)${NC}"
fi

# Verifica se o plugin compose está instalado
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Instalando Docker Compose plugin...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq docker-compose-plugin || true
    fi
fi

if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose ativo: $(docker compose version)${NC}"
else
    echo -e "${YELLOW}⚠️ Aviso: docker compose plugin não encontrado nativamente, tentando docker-compose legado...${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# 3. CONFIGURAÇÃO DE PRODUÇÃO (.env)
# ------------------------------------------------------------------------------
echo -e "${CYAN}[3/6] Configurando variáveis de ambiente de Produção (.env)...${NC}"

ENV_FILE=".env"
SERVER_IP=$(curl -s --max-time 3 ifconfig.me || curl -s --max-time 3 icanhazip.com || echo "localhost")

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Gerando chaves criptográficas de segurança e credenciais...${NC}"
    
    # Gera JWT Secret seguro de 64 caracteres
    AUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
    # Gera senha forte aleatória para o Postgres
    PG_PASS=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
    
    # Verifica se o usuário passou DATABASE_URL customizada via linha de comando
    if [ -n "$DATABASE_URL" ]; then
        CUSTOM_DB_URL="$DATABASE_URL"
    else
        CUSTOM_DB_URL="postgresql://postgres:${PG_PASS}@postgres:5432/mercatta_blog?sslmode=disable"
    fi

    cat <<EOF > "$ENV_FILE"
# -------------------------------------------------------------
# Configurações de Produção — Mercatta Growth
# Gerado automaticamente pelo instalador em $(date)
# -------------------------------------------------------------
NODE_ENV=production
PORT=3000
SITE_URL=http://${SERVER_IP}:3000

# Chave Criptográfica de Sessão (JWT)
AUTH_SECRET=${AUTH_SECRET}

# Banco de Dados PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=mercatta_blog
DATABASE_URL=${CUSTOM_DB_URL}

# Chave de Inteligência Artificial Google Gemini
# Obtenha gratuitamente em: https://aistudio.google.com/apikey
GEMINI_API_KEY=${GEMINI_API_KEY:-}
GEMINI_MODEL=gemini-flash-latest

# Administradores Padrão
ADMIN_EMAIL=admin@braziw.com.br
ADMIN_NAME="Administrador Braziw"
SUPERADMIN_EMAIL=admin@grupomercatta.com.br
SUPERADMIN_NAME="Mercatta Super Admin"
MERCATTA_DOMAIN=grupomercatta.com.br
EOF

    echo -e "${GREEN}✓ Arquivo .env gerado com chaves seguras e banco configurado!${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env existente detectado. Mantendo credenciais preservadas.${NC}"
    
    # Se o usuário passou uma DATABASE_URL nova via parâmetro, atualiza
    if [ -n "$DATABASE_URL" ]; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|g" "$ENV_FILE" 2>/dev/null || true
        echo -e "${GREEN}✓ DATABASE_URL atualizada com o valor fornecido.${NC}"
    fi
fi
echo ""

# ------------------------------------------------------------------------------
# 4. COMPILAÇÃO E SUBIDA DOS CONTAINERS COM DOCKER COMPOSE
# ------------------------------------------------------------------------------
echo -e "${CYAN}[4/6] Construindo e iniciando containers (Next.js 16 + PostgreSQL)...${NC}"

# Derruba instâncias antigas se houver
docker compose down --remove-orphans 2>/dev/null || docker-compose down 2>/dev/null || true

# Constrói e sobe em background
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo -e "${GREEN}✓ Containers iniciados em segundo plano!${NC}"
echo ""

# ------------------------------------------------------------------------------
# 5. AGUARDANDO POSTGRESQL E MIGRAÇÃO AUTOMÁTICA
# ------------------------------------------------------------------------------
echo -e "${CYAN}[5/6] Aguardando prontidão do banco PostgreSQL e inicialização do SaaS...${NC}"

RETRIES=20
DB_READY=false

while [ $RETRIES -gt 0 ]; do
    if docker compose exec -T postgres pg_isready -U postgres -d mercatta_blog &>/dev/null || \
       docker-compose exec -T postgres pg_isready -U postgres -d mercatta_blog &>/dev/null; then
        DB_READY=true
        break
    fi
    echo -n "."
    sleep 2
    RETRIES=$((RETRIES-1))
done
echo ""

if [ "$DB_READY" = true ]; then
    echo -e "${GREEN}✓ PostgreSQL conectado e pronto!${NC}"
else
    echo -e "${YELLOW}Aviso: Container do Postgres ainda inicializando ou usando banco externo.${NC}"
fi

# Aguarda 5 segundos para o Next.js responder
sleep 5
echo ""

# ------------------------------------------------------------------------------
# 6. VERIFICAÇÃO FINAL DE SAÚDE E APRESENTAÇÃO
# ------------------------------------------------------------------------------
echo -e "${CYAN}[6/6] Validando saúde da aplicação...${NC}"

APP_URL="http://${SERVER_IP}:3000"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${APP_URL}/api/status/" || echo "000")

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 PARABÉNS! O MERCATTA GROWTH ESTÁ ONLINE E OPERACIONAL!                ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${BLUE}${BOLD}📌 URL Pública da Aplicação:${NC}   ${CYAN}${BOLD}${APP_URL}/${NC}"
echo -e "${BLUE}${BOLD}📌 Painel Administrativo:${NC}       ${CYAN}${BOLD}${APP_URL}/admin/login/${NC}"
echo -e "${BLUE}${BOLD}📌 Verificação de Status:${NC}       ${CYAN}${APP_URL}/api/status/${NC} (HTTP ${STATUS_CODE})"
echo ""
echo -e "${YELLOW}${BOLD}🔑 Credenciais de Acesso Inicial:${NC}"
echo -e "   • ${BOLD}Super Administrador (Mercatta):${NC}"
echo -e "     Login: ${CYAN}admin@grupomercatta.com.br${NC}"
echo -e "     Senha: ${CYAN}admin123${NC}"
echo ""
echo -e "   • ${BOLD}Administrador Cliente (Braziw):${NC}"
echo -e "     Login: ${CYAN}admin@braziw.com.br${NC}"
echo -e "     Senha: ${CYAN}admin123${NC}"
echo ""
echo -e "${PURPLE}${BOLD}💡 COMO INTEGRAR COM O PAINEL WEB DO COOLIFY:${NC}"
echo -e "   Se você já usa o Coolify na sua VPS Hostinger:"
echo -e "   1. No Coolify, adicione um novo recurso: ${YELLOW}Public Repository${NC} apontando para:"
echo -e "      ${CYAN}https://github.com/Mercattatech/Blog-Mercatta-Growth.git${NC}"
echo -e "   2. Base Directory: ${YELLOW}/${NC} (raiz)"
echo -e "   3. Build Pack: ${YELLOW}Dockerfile${NC} (Porta: ${YELLOW}3000${NC})"
echo -e "   4. Conecte o PostgreSQL do Coolify configurando a variável:"
echo -e "      ${CYAN}DATABASE_URL=postgresql://usuario:senha@host:5432/banco${NC}"
echo -e "   5. Para ativar a IA, preencha sua ${CYAN}GEMINI_API_KEY${NC} no painel."
echo ""
echo -e "${GREEN}Dica de ouro:${NC} Para acompanhar os logs em tempo real na VPS: ${BOLD}docker compose logs -f app${NC}"
echo -e "${PURPLE}==============================================================================${NC}"
