# 🚂 [Deprecated] Railway Deployment Guide

## Prerequisites

Note: Railway deployment is retired in this repository. CI automation for Railway has been removed. This guide is preserved for historical reference only.

Before deploying to Railway (not maintained), you would need:

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional) - `npm i -g @railway/cli`
3. **GitHub Repository** - Code pushed to GitHub
4. **API Keys**:
   - Anthropic API key (required)
   - OpenAI API key (optional)
   - OAuth credentials for integrations (optional)

## 🎯 Quick Deploy (Recommended)

### Option 1: Deploy from GitHub (Easiest)

1. **Push your code to GitHub main branch:**
   ```bash
   # Merge feature branch to main
   git checkout main
   git pull origin main
   git merge claude/initialize-galactic-os-011CURmQ9LrQatAbsPn9znEb
   git push origin main
   ```

2. **Go to Railway Dashboard:**
   - Visit [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your `justinwalkertattoo/GalaOS` repository
   - Railway will auto-detect the `railway.json` configuration

3. **Configure Environment Variables:**

   Railway will prompt you to set these variables:

   **Required:**
   ```
   ANTHROPIC_API_KEY=sk-ant-xxx
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=<generate-random-32-chars>
   ENCRYPTION_KEY=<generate-random-hex-key>
   ```

   **Generate secrets:**
   ```bash
   # JWT Secret
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   # Encryption Key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy!**
   - Railway will automatically:
     - Provision PostgreSQL, Redis, and Qdrant databases
     - Build your Docker containers
     - Deploy API and Web services
     - Set up networking and health checks

5. **Access Your Deployment:**
   - Railway will provide URLs like:
     - API: `https://galaos-api-production-xxxx.up.railway.app`
     - Web: `https://galaos-production-xxxx.up.railway.app`

### Option 2: Deploy from Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to your Railway project
railway link

# Set environment variables
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
railway variables set ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Deploy
railway up
```

## 📦 Services Deployed

Your Railway deployment includes:

| Service | Description | Port |
|---------|-------------|------|
| **galaos-api** | Main API server | 3000 |
| **galaos-web** | Next.js frontend | 3000 |
| **postgres** | PostgreSQL 15 database | 5432 |
| **redis** | Redis cache | 6379 |
| **qdrant** | Vector database for AI | 6333 |

## ⚙️ Environment Variables Reference

### Core Variables (Required)

```bash
# Database (Auto-set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
POSTGRES_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}

# Redis (Auto-set by Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# Qdrant (Auto-set by Railway)
QDRANT_URL=http://qdrant:6333

# Security (You must set these)
JWT_SECRET=<your-jwt-secret>
ENCRYPTION_KEY=<your-32-byte-hex-key>
SESSION_SECRET=<your-session-secret>

# AI Provider (Required)
ANTHROPIC_API_KEY=sk-ant-xxx

# Application
NODE_ENV=production
PORT=3000
```

### Optional Variables

```bash
# OpenAI Integration
OPENAI_API_KEY=sk-xxx

# Other AI Providers
GOOGLE_API_KEY=xxx
COHERE_API_KEY=xxx
MISTRAL_API_KEY=xxx

# Self-Update Features
AUTO_UPDATE_ENABLED=true
UPDATE_BRANCH=main
GITHUB_REPO=justinwalkertattoo/GalaOS

# Frontend API URL (Auto-set by Railway)
NEXT_PUBLIC_API_URL=${{galaos-api.RAILWAY_PUBLIC_DOMAIN}}
```

## 🔧 Post-Deployment Setup

### 1. Run Database Migrations

After first deployment, run migrations:

```bash
# Using Railway CLI
railway run npm run db:migrate

# Or connect to your Railway Postgres and run:
railway connect postgres
```

### 2. Verify Deployment

Check health endpoints:
```bash
curl https://your-api-url.railway.app/api/health
curl https://your-api-url.railway.app/api/trpc/health.check
```

### 3. Configure Custom Domains (Optional)

In Railway dashboard:
1. Go to your service settings
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed

### 4. Set Up OAuth Integrations

For each integration you want to use:

1. **Get OAuth Credentials:**
   - GitHub: https://github.com/settings/developers
   - Google: https://console.cloud.google.com/apis/credentials
   - Slack: https://api.slack.com/apps
   - Notion: https://www.notion.so/my-integrations
   - Etc.

2. **Set Callback URLs:**
   ```
   https://your-api-url.railway.app/api/oauth/callback/{provider}
   ```

3. **Add to Railway Environment:**
   ```bash
   railway variables set GITHUB_CLIENT_ID=xxx
   railway variables set GITHUB_CLIENT_SECRET=xxx
   # Repeat for each integration
   ```

## 🔍 Monitoring & Logs

### View Logs
```bash
# All services
railway logs

# Specific service
railway logs --service=galaos-api
```

### Monitor Resources
- Railway dashboard shows CPU, Memory, Network usage
- Set up alerts for resource limits
- Check health endpoint: `/api/health`

## 💰 Pricing

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- Free $5 credit each month

Estimated monthly cost for GalaOS:
- **Small Setup** (~$15-25/mo):
  - API + Web + Postgres + Redis
  - Low traffic

- **Medium Setup** (~$30-50/mo):
  - All services including Qdrant
  - Moderate traffic
  - Some AI workloads

## 🐛 Troubleshooting

### Build Fails

**Problem:** Docker build fails
```bash
# Check build logs
railway logs --service=galaos-api

# Common fixes:
# 1. Clear build cache
railway service delete-cache

# 2. Check Dockerfile paths
# 3. Verify all dependencies in package.json
```

### Database Connection Issues

**Problem:** Can't connect to Postgres
```bash
# Check DATABASE_URL is set
railway variables

# Verify Postgres is running
railway status

# Test connection
railway run npm run db:migrate
```

### API Not Responding

**Problem:** API service crashes or won't start
```bash
# Check logs
railway logs --service=galaos-api

# Verify environment variables
railway variables

# Check health endpoint
curl https://your-api-url.railway.app/api/health
```

### Out of Memory

**Problem:** Service runs out of memory
```bash
# Upgrade service resources in Railway dashboard
# Settings → Resources → Increase memory limit

# Or optimize Node.js memory:
railway variables set NODE_OPTIONS="--max-old-space-size=2048"
```

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your connected branch:

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Railway auto-deploys within 2-3 minutes
```

## 📊 Scaling

### Horizontal Scaling
Railway supports horizontal scaling:
1. Go to service settings
2. Click "Settings" → "Replicas"
3. Increase replica count
4. Railway handles load balancing

### Vertical Scaling
Increase resources per service:
1. Click "Settings" → "Resources"
2. Adjust CPU/Memory limits
3. Restart service

## 🎉 Success!

Your GalaOS deployment should now be live at:
- **Web**: `https://galaos-production-xxxx.up.railway.app`
- **API**: `https://galaos-api-production-xxxx.up.railway.app`

Test it out:
```bash
# Create an account
curl -X POST https://your-api-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secure123"}'

# Test AI agent
curl https://your-api-url.railway.app/api/trpc/agents.list
```

## 🆘 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GalaOS Issues: https://github.com/justinwalkertattoo/GalaOS/issues

---

**Next Steps:**
1. ✅ Deploy to Railway (you are here)
2. Configure OAuth integrations
3. Set up custom domains
4. Enable monitoring & alerts
5. Invite team members
