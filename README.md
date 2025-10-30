# GalaOS

<div align="center">

**Your Personal AI Operating System**

AI-powered platform for unifying apps, automating workflows, and harnessing AI agency to manage your life, business, and growth.

[Getting Started](./GETTING_STARTED.md) · [Documentation](./ARCHITECTURE.md) · [Roadmap](./ROADMAP.md) · [Contributing](./CONTRIBUTING.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

</div>

---

## What is GalaOS?

GalaOS is a personal AI orchestration system that combines the best of:

- **Workspace Management** (like Notion) - Rich text pages, databases, and content organization
- **Workflow Automation** (like n8n/Zapier) - Visual workflow builder with 200+ integrations
- **AI Orchestration** - Conversational AI with Claude, GPT-4, and multi-agent capabilities
- **Extensibility** - Plugin system for custom features and integrations

All unified in a single, powerful platform designed to help you manage your life, businesses, and self-development.

## Key Features

### 🗂️ Workspace Management
- Rich text document editor with blocks
- Hierarchical page organization
- Custom databases with multiple views
- File attachments and media
- Templates and reusable blocks

### ⚡ Workflow Automation
- Visual drag-and-drop workflow builder
- Trigger-based automation (schedules, webhooks, events)
- Pre-built workflow templates
- Error handling and retry logic
- Execution history and debugging

### 🤖 AI Orchestration (NEW!)
- **"Gala"** - Conversational AI assistant that understands complex tasks
- **Multi-agent system** - Specialized agents for vision, content, social media, email
- **Intelligent routing** - Automatically decomposes tasks and creates execution plans
- **Tool calling** - AI agents can use integrations and APIs
- **Human-in-the-loop** - Confirms actions before execution
- **Context-aware** - Understands files, preferences, and history

**Example**: Say "Gala, post these photos" with images attached, and watch as Gala:
1. Analyzes images
2. Generates caption (with your input)
3. Creates hashtags
4. Posts to Instagram & Buffer
5. Updates portfolio
6. Drafts email campaign

### 🔌 Integrations
- OAuth 2.0 authentication flow
- 200+ service integrations (planned)
- API connector framework
- Webhook management
- Rate limiting and quota tracking

### 🧩 Extensibility
- Plugin architecture
- Custom workflow nodes
- Developer API (tRPC)
- Extension marketplace
- Self-hosted option

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/justinwalkertattoo/GalaOS.git
cd GalaOS

# Copy environment variables
cp .env.template .env

# Edit .env and add your API keys
# ANTHROPIC_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here

# Start with Docker Compose
cd docker
docker-compose up

# In a new terminal, run migrations
npm install
npm run db:migrate

# Open http://localhost:3000
```

**That's it!** GalaOS is now running locally.

For detailed setup instructions, see [GETTING_STARTED.md](./GETTING_STARTED.md).

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **API**: tRPC (type-safe APIs)
- **Database**: PostgreSQL 16+ with Prisma ORM
- **Cache/Queue**: Redis 7+ with BullMQ
- **AI**: Anthropic Claude, OpenAI GPT-4

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State**: Zustand + TanStack Query
- **Workflow Builder**: React Flow

### DevOps
- **Containerization**: Docker
- **Monorepo**: Turborepo
- **CI/CD**: GitHub Actions
- **Testing**: Vitest, Playwright

## Project Structure

```
galaos/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── api/                 # Express + tRPC backend
│   └── docs/                # Documentation site
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── db/                  # Prisma schema & client
│   ├── types/               # Shared TypeScript types
│   ├── ai/                  # AI orchestration library
│   ├── workflow/            # Workflow engine core
│   └── integrations/        # Integration connectors
├── docker/                  # Docker configuration
└── docs/                    # Documentation
```

## Documentation

- **[Getting Started](./GETTING_STARTED.md)** - Setup and installation guide
- **[AI Orchestration](./AI_ORCHESTRATION.md)** - Complete guide to Gala and the orchestration system
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design decisions
- **[Roadmap](./ROADMAP.md)** - Feature roadmap and milestones
- **[Contributing](./CONTRIBUTING.md)** - How to contribute to GalaOS
- **[Changelog](./CHANGELOG.md)** - Version history and changes

## Roadmap

GalaOS is currently in **Alpha (v0.2.0)**. See our [detailed roadmap](./ROADMAP.md) for planned features.

### Current Phase: AI Orchestration ⚡ NEW!
- ✅ Core infrastructure (database, API, frontend)
- ✅ User authentication
- ✅ Basic workspace management
- ✅ AI chat interface
- ✅ **AI Orchestration System** - "Gala" conversational assistant
- ✅ **Multi-agent coordination** - Specialized AI agents working together
- ✅ **Workflow execution engine** - Automated task workflows
- ✅ **Integration framework** - Buffer, Instagram, SendGrid connectors
- ✅ **Universal Inbox** - Single input for all tasks
- ✅ **File upload support** - Attach images and files to conversations
- 🚧 Rich text editor
- 🚧 Visual workflow builder UI
- 🚧 OAuth flows for integrations

### Next Phase: Visual Builder & More Integrations
- Visual drag-and-drop workflow builder
- OAuth authentication for all integrations
- 50+ pre-built integrations
- RAG support with vector database
- Real-time collaboration

## Use Cases

GalaOS can help you:

- **Manage Projects** - Track tasks, documents, and resources in one place
- **Automate Workflows** - Connect your apps and automate repetitive tasks
- **AI-Powered Assistance** - Use AI to draft content, analyze data, make decisions
- **Centralize Information** - Unify data from multiple services
- **Build Custom Tools** - Create specialized workflows and integrations
- **Personal Operating System** - Manage life, business, and self-development

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- 🧪 Write tests
- 🌍 Translate (coming soon)

## Community

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and general discussion
- **Twitter** - Follow for updates

## License

GalaOS is open source software licensed under the [MIT License](LICENSE).

## Acknowledgments

GalaOS is inspired by and builds upon ideas from:
- Notion - Workspace and content management
- n8n/Zapier - Workflow automation
- LangChain - AI orchestration
- tRPC - Type-safe APIs

Special thanks to all contributors and the open source community.

## Support

- **Documentation**: Check the docs in this repository
- **Issues**: Create a GitHub issue
- **Discussions**: Start a GitHub discussion

---

<div align="center">

**Built with ❤️ for creatives, entrepreneurs, and productivity enthusiasts**

[⭐ Star this repo](https://github.com/justinwalkertattoo/GalaOS) if you find it useful!

</div> 
