#!/bin/bash

# GalaOS Quick Setup Script
# This script sets up GalaOS for first-time use

set -e

echo "=========================================="
echo "  GalaOS Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from .env.template...${NC}"
    cp .env.template .env

    # Generate secure secrets
    echo -e "${GREEN}✓ Generating secure secrets...${NC}"

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env

    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    sed -i "s/generate-a-32-byte-hex-key-using-command-above/$ENCRYPTION_KEY/" .env

    # Generate session secret
    SESSION_SECRET=$(openssl rand -hex 32)
    sed -i "s/your_session_secret_here/$SESSION_SECRET/" .env

    echo -e "${GREEN}✓ .env file created with secure secrets${NC}"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Please edit .env and add your API keys:${NC}"
    echo "  - ANTHROPIC_API_KEY (required for self-coding)"
    echo "  - OPENAI_API_KEY (optional)"
    echo ""
    read -p "Press Enter once you've added your API keys..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo "=========================================="
echo "  Choose Setup Mode"
echo "=========================================="
echo ""
echo "1) Quick Start (Basic services only)"
echo "   - PostgreSQL, Redis, Ollama"
echo "   - API, Web, Worker"
echo "   - Fast startup, minimal resources"
echo ""
echo "2) Full Stack (All services)"
echo "   - All basic services +"
echo "   - Neo4j, Qdrant, MinIO, RabbitMQ"
echo "   - PyTorch, Whisper, Monitoring"
echo "   - Complete feature set, more resources"
echo ""
read -p "Select mode (1 or 2): " MODE

COMPOSE_FILE="docker-compose.yml"
if [ "$MODE" = "2" ]; then
    COMPOSE_FILE="docker/docker-compose.full.yml"
fi

echo ""
echo -e "${GREEN}Starting GalaOS with $COMPOSE_FILE...${NC}"
echo ""

# Pull images
echo "📥 Pulling Docker images..."
docker compose -f $COMPOSE_FILE pull

# Start services
echo ""
echo "🚀 Starting services..."
docker compose -f $COMPOSE_FILE up -d

# Wait for database
echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations (assuming we have a script for this)
echo ""
echo "🔧 Running database migrations..."
docker compose -f $COMPOSE_FILE exec -T galaos-api npx prisma migrate deploy || echo "Migrations will run on first API startup"

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ GalaOS Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "🌐 Access GalaOS:"
echo "   - Web UI:  http://localhost:3000"
echo "   - API:     http://localhost:4000"
echo ""
if [ "$MODE" = "2" ]; then
    echo "📊 Additional Services:"
    echo "   - Grafana:       http://localhost:3002 (admin/admin)"
    echo "   - Neo4j Browser: http://localhost:7474"
    echo "   - Qdrant:        http://localhost:6333/dashboard"
    echo "   - MinIO:         http://localhost:9001 (galaos/minio_secure_password_change_me)"
    echo ""
fi
echo "📝 Next steps:"
echo "   1. Create your first user account at http://localhost:3000"
echo "   2. Configure AI providers in Settings"
echo "   3. Start using GalaOS!"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs:    docker compose -f $COMPOSE_FILE logs -f"
echo "   - Stop:         docker compose -f $COMPOSE_FILE down"
echo "   - Restart:      docker compose -f $COMPOSE_FILE restart"
echo "   - Full cleanup: docker compose -f $COMPOSE_FILE down -v"
echo ""
echo "📚 Documentation: https://github.com/justinwalkertattoo/GalaOS"
echo ""
