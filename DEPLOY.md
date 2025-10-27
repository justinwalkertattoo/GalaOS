# GalaOS Deployment Guide

Complete guide to deploying GalaOS in various environments.

## 🚀 Quick Start (Recommended)

The fastest way to get GalaOS running:

```bash
# 1. Clone the repository
git clone https://github.com/justinwalkertattoo/GalaOS.git
cd GalaOS

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Access GalaOS
# Web: http://localhost:3000
# API: http://localhost:4000
```

That's it! The setup script will:
- Create `.env` with secure secrets
- Prompt for your API keys
- Let you choose Quick Start or Full Stack
- Pull Docker images
- Start all services
- Run database migrations

## 📋 Prerequisites

- **Docker** 24.0+ & **Docker Compose** 2.20+
- **2GB RAM minimum** (4GB+ recommended for Full Stack)
- **NVIDIA GPU** (optional, for local LLMs)
- **API Keys**:
  - Anthropic API key (required for self-coding)
  - OpenAI API key (optional)

## 🎯 Deployment Options

### Option 1: Docker Compose (Recommended)

**Quick Start Mode** - Minimal setup, fast startup:
```bash
docker compose up -d
```

Services:
- PostgreSQL, Redis, Ollama
- GalaOS API, Web, Worker

**Full Stack Mode** - All features enabled:
```bash
docker compose -f docker/docker-compose.full.yml up -d
```

Additional services:
- Neo4j (knowledge graph)
- Qdrant (vector database)
- MinIO (object storage)
- RabbitMQ (message queue)
- PyTorch, Whisper (AI/ML)
- Prometheus, Grafana (monitoring)

### Option 2: Using Pre-built Images (Coming Soon)

Once images are published to Docker Hub:

```bash
# Quick Start
docker compose -f docker-compose.hub.yml up -d

# Full Stack
docker compose -f docker/docker-compose.hub.full.yml up -d
```

### Option 3: Manual Build

```bash
# Install dependencies
pnpm install

# Setup database
cp .env.example .env
# Edit .env with your values

# Run migrations
pnpm prisma:migrate

# Build
pnpm build

# Start services
pnpm dev
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required:
```bash
# Database
POSTGRES_PASSWORD=secure_password_here
DATABASE_URL=postgresql://galaos:password@localhost:5432/galaos

# Redis
REDIS_PASSWORD=secure_password_here
REDIS_URL=redis://:password@localhost:6379

# Security
JWT_SECRET=your_32_byte_hex_key
ENCRYPTION_KEY=your_32_byte_hex_key

# AI (Required for self-coding)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

#### Optional:
```bash
# OpenAI (for additional models)
OPENAI_API_KEY=sk-your-openai-key-here

# Self-Update
AUTO_UPDATE_ENABLED=true
GITHUB_REPO=justinwalkertattoo/GalaOS

# Features
HOT_RELOAD_ENABLED=true
```

### Generating Secure Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or with OpenSSL
openssl rand -hex 32
```

## 🔧 Post-Installation

### 1. Create Admin User

Visit http://localhost:3000 and create your first account.

### 2. Configure AI Providers

Go to Settings > AI Providers and add:
- Anthropic (Claude)
- OpenAI (GPT)
- Ollama (local models)

### 3. Pull Ollama Models (Optional)

For local LLMs:
```bash
docker exec -it galaos-ollama ollama pull llama2
docker exec -it galaos-ollama ollama pull codellama
docker exec -it galaos-ollama ollama pull mistral
```

### 4. Test Self-Coding

Try the self-coding feature:
```
"Add a dark mode toggle to the header"
```

## 📊 Accessing Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| GalaOS Web | http://localhost:3000 | - |
| GalaOS API | http://localhost:4000 | - |
| Grafana | http://localhost:3002 | admin / admin |
| Neo4j Browser | http://localhost:7474 | neo4j / neo4j_secure_password |
| Qdrant Dashboard | http://localhost:6333/dashboard | - |
| MinIO Console | http://localhost:9001 | galaos / minio_secure_password |
| RabbitMQ UI | http://localhost:15672 | galaos / rabbitmq_secure_password |

## 🐳 Docker Hub Publishing

### Build and Push Images

For maintainers to publish to Docker Hub:

```bash
# Build images
docker build -t justinwalkertattoo/galaos-api:latest -f apps/api/Dockerfile .
docker build -t justinwalkertattoo/galaos-web:latest -f apps/web/Dockerfile .
docker build -t justinwalkertattoo/galaos-worker:latest -f apps/worker/Dockerfile .

# Tag with version
docker tag justinwalkertattoo/galaos-api:latest justinwalkertattoo/galaos-api:v0.1.0

# Push to Docker Hub
docker push justinwalkertattoo/galaos-api:latest
docker push justinwalkertattoo/galaos-web:latest
docker push justinwalkertattoo/galaos-worker:latest
```

Or use the publish script:
```bash
chmod +x scripts/publish-docker.sh
./scripts/publish-docker.sh v0.1.0
```

## 🚀 Production Deployment

### Additional Considerations

1. **Reverse Proxy** (Nginx/Traefik):
```nginx
server {
    listen 80;
    server_name galaos.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:4000;
    }
}
```

2. **SSL/TLS** (Let's Encrypt):
```bash
certbot --nginx -d galaos.yourdomain.com
```

3. **Backup Strategy**:
```bash
# Backup database
docker exec galaos-postgres pg_dump -U galaos galaos > backup.sql

# Backup volumes
docker run --rm -v galaos_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

4. **Monitoring**:
- Grafana dashboards (included)
- Prometheus metrics (included)
- Langfuse LLM observability (optional)

5. **Scaling**:
```yaml
# Scale workers
docker compose up -d --scale galaos-worker=3
```

## 🔄 Updates

GalaOS can update itself! Use the built-in update system:

```typescript
// Via API
await trpc.systemUpdates.applyFullUpdate.mutate()

// Or trigger from UI
Settings > System > Updates > Check for Updates
```

Or manually:
```bash
git pull origin main
docker compose down
docker compose up -d --build
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs galaos-postgres

# Reset database
docker compose down -v
docker compose up -d
```

### API Won't Start
```bash
# Check logs
docker logs galaos-api

# Common issues:
# 1. Missing ANTHROPIC_API_KEY in .env
# 2. Database not ready (wait 30s after postgres starts)
# 3. Port 4000 already in use
```

### Frontend Build Errors
```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Rebuild
docker compose up -d --build galaos-web
```

### Hot Reload Not Working
```bash
# Enable in .env
HOT_RELOAD_ENABLED=true

# Restart watcher
await trpc.selfCoding.stopWatcher.mutate()
await trpc.selfCoding.startWatcher.mutate()
```

## 📈 Performance Tuning

### For Low-Resource Environments

Use Quick Start mode and disable background workers:
```yaml
# docker-compose.override.yml
services:
  galaos-worker:
    deploy:
      replicas: 0  # Disable workers
```

### For High-Performance

Enable all services and add:
```yaml
services:
  galaos-api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## 🔒 Security Hardening

1. **Change all default passwords** in `.env`
2. **Use strong JWT secrets** (32+ characters)
3. **Enable firewall** (allow only 80/443)
4. **Run behind reverse proxy** with rate limiting
5. **Regular backups** of database and volumes
6. **Update regularly** using built-in update system

## 📚 Additional Resources

- [GitHub Repository](https://github.com/justinwalkertattoo/GalaOS)
- [API Documentation](http://localhost:4000/docs)
- [Self-Coding Guide](./packages/core/README.md)
- [Architecture Overview](./ARCHITECTURE.md)

## 🆘 Getting Help

- **GitHub Issues**: https://github.com/justinwalkertattoo/GalaOS/issues
- **Discussions**: https://github.com/justinwalkertattoo/GalaOS/discussions

## 📝 License

See LICENSE file in repository.
