# Changelog

All notable changes to GalaOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Rich text editor with blocks
- Visual workflow builder
- Integration framework
- OAuth 2.0 support

## [0.1.0] - 2024-10-24

### Added

#### Infrastructure
- Monorepo setup with Turborepo
- TypeScript configuration across all packages
- Docker development environment with Docker Compose
- PostgreSQL database with Prisma ORM
- Redis for caching and job queues
- tRPC for type-safe API layer
- Environment configuration with .env support

#### Backend (API)
- Express.js server with TypeScript
- tRPC router setup with:
  - Authentication router (login, register, logout)
  - Workspace router (workspaces, pages)
  - Workflow router (CRUD operations)
  - AI router (chat, conversations)
  - Integration router (connection management)
- JWT-based authentication
- Protected routes with authentication middleware
- Database schema with Prisma:
  - User and account management
  - Workspace and page hierarchy
  - Workflow definitions and executions
  - AI conversations and messages
  - Integration connections
  - API keys and webhooks

#### Frontend (Web)
- Next.js 14 with App Router
- Tailwind CSS styling with custom theme
- Landing page with feature showcase
- Authentication pages (login, register)
- Dashboard with quick actions
- AI chat interface with real-time messaging
- tRPC client integration
- Type-safe API calls from frontend to backend

#### AI Integration
- Anthropic Claude API integration
- OpenAI GPT-4 API integration
- Conversation management
- Message history persistence

#### Developer Experience
- Comprehensive documentation:
  - README with quick start guide
  - ARCHITECTURE documentation
  - GETTING_STARTED guide
  - ROADMAP with planned features
  - CONTRIBUTING guidelines
- Code formatting with Prettier
- Git configuration and .gitignore
- Example environment variables

### Project Structure
```
galaos/
├── apps/
│   ├── api/          # Backend Express + tRPC server
│   └── web/          # Next.js frontend
├── packages/
│   ├── db/           # Prisma database package
│   └── types/        # Shared TypeScript types
├── docker/           # Docker Compose setup
└── docs/             # Documentation
```

### Technical Details
- Node.js 20+
- TypeScript 5.3
- Next.js 14
- Prisma 5.8
- tRPC 10.45
- PostgreSQL 16
- Redis 7

---

## Release Notes

### v0.1.0 - "Foundation"

This is the initial alpha release of GalaOS, establishing the foundational architecture for the platform.

**What's Working:**
- User registration and authentication
- Basic workspace and page management
- AI chat with Claude and GPT-4
- Docker-based development environment
- Type-safe APIs with tRPC

**What's Next:**
- Rich text editor implementation
- Visual workflow builder
- Integration framework
- OAuth provider support
- Enhanced AI capabilities

**Known Limitations:**
- No rich text editing yet (basic text only)
- Workflows are stored but not executed
- Integrations are placeholder (no OAuth flow)
- No real-time collaboration
- Limited error handling

**Installation:**
See [GETTING_STARTED.md](./GETTING_STARTED.md) for installation instructions.

**Feedback:**
This is an alpha release. Please report issues and suggest features via GitHub Issues.

---

[Unreleased]: https://github.com/justinwalkertattoo/GalaOS/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/justinwalkertattoo/GalaOS/releases/tag/v0.1.0
