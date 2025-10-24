# Getting Started with GalaOS

This guide will help you set up and run GalaOS locally for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)
- **Docker & Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Optional but Recommended
- **VS Code** with recommended extensions
- **PostgreSQL** (if not using Docker)

## Quick Start (Recommended)

The fastest way to get started is using Docker Compose:

### 1. Clone the Repository

```bash
git clone https://github.com/justinwalkertattoo/GalaOS.git
cd GalaOS
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 3. Start with Docker Compose

```bash
cd docker
docker-compose up
```

This will start:
- PostgreSQL database on `localhost:5432`
- Redis cache on `localhost:6379`
- Backend API on `http://localhost:3001`
- Frontend web app on `http://localhost:3000`

### 4. Run Database Migrations

In a new terminal:

```bash
npm install
npm run db:migrate
```

### 5. Open Your Browser

Visit `http://localhost:3000` and create your account!

## Manual Setup (Without Docker)

If you prefer to run services manually:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL and Redis

You'll need PostgreSQL and Redis running locally. Using Homebrew on macOS:

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

Or use Docker for just the databases:

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=galaos_dev_password -e POSTGRES_DB=galaos postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. Set Up Database

```bash
npm run db:migrate
```

### 4. Start Development Servers

In separate terminals:

```bash
# Terminal 1 - Backend API
npm run dev --workspace=@galaos/api

# Terminal 2 - Frontend
npm run dev --workspace=@galaos/web
```

Or use Turbo to run both:

```bash
npm run dev
```

## Project Structure

```
galaos/
├── apps/
│   ├── api/           # Backend API (Express + tRPC)
│   └── web/           # Frontend (Next.js)
├── packages/
│   ├── db/            # Prisma database schema
│   ├── types/         # Shared TypeScript types
│   ├── ai/            # AI orchestration (future)
│   ├── workflow/      # Workflow engine (future)
│   └── integrations/  # Integration connectors (future)
└── docker/            # Docker configuration
```

## Available Scripts

### Root Level

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps for production
- `npm run lint` - Lint all apps
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

### Database

- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:generate` - Generate Prisma client

## Next Steps

Now that you have GalaOS running, you can:

1. **Create Your First Workspace** - Organize your pages and content
2. **Build a Workflow** - Automate tasks with the visual workflow builder
3. **Chat with AI** - Use the AI assistant to help with tasks
4. **Connect Integrations** - Link your favorite apps and services
5. **Explore the API** - Build custom integrations using tRPC

## Development Tips

### Hot Reload

Both the frontend and backend support hot reload. Make changes and see them instantly!

### Database GUI

View and edit your database with Prisma Studio:

```bash
npm run db:studio
```

Opens at `http://localhost:5555`

### API Testing

The tRPC API is accessible at `http://localhost:3001/trpc`

### Debugging

- Backend logs appear in the terminal running the API
- Frontend logs appear in the browser console
- Database queries are logged in development mode

## Common Issues

### Port Already in Use

If port 3000 or 3001 is already in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database Connection Error

Ensure PostgreSQL is running and the DATABASE_URL in `.env` is correct:

```bash
DATABASE_URL=postgresql://galaos:galaos_dev_password@localhost:5432/galaos
```

### Module Not Found

Try clearing node_modules and reinstalling:

```bash
npm run clean
npm install
```

## Getting Help

- **Documentation**: Check the `/docs` folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Join the GitHub Discussions

## What's Next?

Check out:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture details
- [ROADMAP.md](./ROADMAP.md) - Feature roadmap
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute

Happy building with GalaOS!
