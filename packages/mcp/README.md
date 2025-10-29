# @galaos/mcp

Model Context Protocol (MCP) integration for GalaOS, providing a unified interface for AI models, datasets, tools, and services.

## Features

- **MCP Server Registry**: Manage and orchestrate multiple MCP servers
- **Docker Integration**: Automatic container lifecycle management with file watching
- **Multi-Provider Support**:
  - **HuggingFace Hub**: Models, datasets, spaces, and embeddings
  - **Ollama**: Local model management and inference
  - **GitHub**: Repository access, code search, and tools
  - **Anthropic Claude**: Advanced AI capabilities (existing integration)
  - **OpenAI GPT**: Versatile AI models (existing integration)
  - **Perplexity**: Online search-enhanced responses
  - **Google Gemini**: Google's latest AI models

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Registry                         │
│  - Server Lifecycle Management                             │
│  - Health Monitoring                                        │
│  - Resource/Tool Discovery                                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌─────────▼────────┐
│ Docker Watcher │  │ MCP Servers │  │  AI Providers    │
│  - File Watch  │  │  - Stdio    │  │  - HuggingFace   │
│  - Container   │  │  - WebSocket│  │  - Ollama        │
│    Lifecycle   │  │  - HTTP     │  │  - GitHub        │
└────────────────┘  └─────────────┘  │  - Perplexity    │
                                      │  - Google        │
                                      └──────────────────┘
```

## Installation

The MCP package is already included in the GalaOS monorepo. Install dependencies:

```bash
pnpm install
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# API Keys
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
GOOGLE_API_KEY=your-google-key
HUGGINGFACE_API_KEY=your-huggingface-token

# MCP Configuration
MCP_CONFIG_PATH=/etc/galaos/mcp-servers.json
MCP_ENABLE_DOCKER_WATCH=true

# Service URLs
OLLAMA_URL=http://ollama:11434
PERPLEXITY_BASE_URL=https://api.perplexity.ai
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

### MCP Servers Configuration

Create `mcp-servers.json` (see `mcp-servers.example.json`):

```json
{
  "servers": [
    {
      "id": "filesystem",
      "name": "Filesystem MCP Server",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "enabled": true,
      "autoStart": true,
      "restart": "on-failure"
    }
  ]
}
```

## Usage

### MCP Registry

```typescript
import { MCPRegistry } from '@galaos/mcp';

const registry = new MCPRegistry();

// Register an MCP server
await registry.registerServer({
  id: 'my-server',
  name: 'My MCP Server',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace'],
  enabled: true,
  autoStart: true,
});

// Start the server
await registry.startServer('my-server');

// Call a tool
const result = await registry.callTool('my-server', 'read_file', {
  path: '/workspace/README.md',
});

// Read a resource
const content = await registry.readResource('my-server', 'file:///workspace/data.json');
```

### Docker Watcher

```typescript
import { MCPRegistry, DockerMCPWatcher } from '@galaos/mcp';

const registry = new MCPRegistry();
const watcher = new DockerMCPWatcher(registry, '/etc/galaos/mcp-servers.json');

// Listen for events
watcher.on('docker:event', (event) => {
  console.log('Docker event:', event);
});

// Start watching
await watcher.start();
```

### Provider Integrations

#### HuggingFace

```typescript
import { HuggingFaceProvider } from '@galaos/mcp';

const hf = new HuggingFaceProvider(process.env.HUGGINGFACE_API_KEY);

// Search models
const models = await hf.listModels({
  search: 'llama',
  sort: 'downloads',
  limit: 10,
});

// Chat completion
const response = await hf.chatCompletion({
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// List datasets
const datasets = await hf.listDatasets({
  search: 'wikipedia',
  limit: 10,
});
```

#### Ollama

```typescript
import { OllamaProvider } from '@galaos/mcp';

const ollama = new OllamaProvider('http://localhost:11434');

// List available models
const models = await ollama.listModels();

// Pull a model
await ollama.pullModel('llama3.1', (progress) => {
  console.log(`Pulling: ${progress.status}`);
});

// Chat
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
});

// Generate embeddings
const embeddings = await ollama.embeddings({
  model: 'nomic-embed-text',
  prompt: 'Hello world',
});
```

#### GitHub

```typescript
import { GitHubProvider } from '@galaos/mcp';

const github = new GitHubProvider(process.env.GITHUB_TOKEN);

// Search repositories
const repos = await github.searchRepositories({
  query: 'model-context-protocol',
  sort: 'stars',
});

// Read file contents
const content = await github.readFile('owner', 'repo', 'README.md');

// Search code
const results = await github.searchCode({
  query: 'mcp server language:typescript',
});
```

#### Perplexity

```typescript
import { PerplexityProvider } from '@galaos/mcp';

const perplexity = new PerplexityProvider(process.env.PERPLEXITY_API_KEY);

// Search with online context
const response = await perplexity.search({
  query: 'What are the latest developments in AI?',
  return_images: true,
  return_related_questions: true,
});

// Chat with citations
const result = await perplexity.generateWithCitations({
  prompt: 'Explain the Model Context Protocol',
  search_recency_filter: 'week',
});

console.log(result.content);
console.log('Citations:', result.citations);
```

#### Google Gemini

```typescript
import { GoogleProvider } from '@galaos/mcp';

const google = new GoogleProvider(process.env.GOOGLE_API_KEY);

// Generate content
const response = await google.generateContent({
  prompt: 'Write a poem about AI',
  temperature: 0.9,
});

// Chat
const chatResponse = await google.chat({
  messages: [
    { role: 'user', content: 'What is the Model Context Protocol?' },
  ],
});

// Generate embeddings
const embeddings = await google.embedContent({
  content: 'Hello world',
  taskType: 'RETRIEVAL_DOCUMENT',
});
```

## API Endpoints

### MCP Servers

- `POST /mcp/registerServer` - Register a new MCP server
- `GET /mcp/listServers` - List all MCP servers
- `GET /mcp/getServer` - Get server details
- `POST /mcp/startServer` - Start a server
- `POST /mcp/stopServer` - Stop a server
- `POST /mcp/restartServer` - Restart a server
- `DELETE /mcp/deleteServer` - Delete a server

### Resources & Tools

- `GET /mcp/listResources` - List MCP resources
- `POST /mcp/callTool` - Call an MCP tool

### Providers

- `GET /mcp/searchHuggingFace` - Search HuggingFace
- `GET /mcp/listHuggingFaceModels` - List HF models
- `GET /mcp/searchGitHub` - Search GitHub
- `GET /mcp/listOllamaModels` - List Ollama models
- `POST /mcp/pullOllamaModel` - Pull Ollama model

### API Keys

- `GET /mcp/listAPIKeys` - List API keys
- `POST /mcp/addAPIKey` - Add new API key
- `DELETE /mcp/deleteAPIKey` - Delete API key
- `POST /mcp/testAPIKey` - Test API key

## Docker Integration

The MCP package includes a Docker watcher that monitors configuration changes and automatically manages MCP server containers:

1. **File Watching**: Monitors `mcp-servers.json` for changes
2. **Auto-Discovery**: Detects when servers are added or removed
3. **Container Management**: Creates, starts, stops, and removes containers
4. **Health Monitoring**: Performs health checks on running containers
5. **Event Emission**: Emits events for all lifecycle changes

## Database Schema

The following Prisma models are used:

- `MCPServer` - MCP server configurations
- `MCPResource` - Resources provided by servers
- `MCPTool` - Tools provided by servers
- `MCPPrompt` - Prompts provided by servers
- `HuggingFaceResource` - HuggingFace resources cache
- `GitHubResource` - GitHub resources cache
- `OllamaModel` - Ollama models registry
- `ProviderAPIKey` - API keys for external providers

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type checking
pnpm typecheck
```

## Contributing

See the main GalaOS contributing guide.

## License

MIT
