import { z } from 'zod';

/**
 * MCP Protocol Types
 * Model Context Protocol for standardized AI model interactions
 */

// MCP Server Configuration
export const MCPServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  autoStart: z.boolean().default(true),
  restart: z.enum(['always', 'on-failure', 'unless-stopped', 'no']).default('on-failure'),
  healthCheck: z.object({
    interval: z.number().default(30000),
    timeout: z.number().default(5000),
    retries: z.number().default(3),
  }).optional(),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// MCP Resource Types
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type MCPResource = z.infer<typeof MCPResourceSchema>;

// MCP Tool Types
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()).optional(),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

// MCP Prompt Types
export const MCPPromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(false),
  })).optional(),
});

export type MCPPrompt = z.infer<typeof MCPPromptSchema>;

// Provider Types
export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity',
  GOOGLE = 'google',
  OLLAMA = 'ollama',
  HUGGINGFACE = 'huggingface',
}

export const AIProviderConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().optional(),
  topP: z.number().min(0).max(1).optional(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// HuggingFace Types
export const HuggingFaceResourceTypeSchema = z.enum(['model', 'dataset', 'space', 'database']);
export type HuggingFaceResourceType = z.infer<typeof HuggingFaceResourceTypeSchema>;

export const HuggingFaceResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: HuggingFaceResourceTypeSchema,
  author: z.string().optional(),
  description: z.string().optional(),
  downloads: z.number().optional(),
  likes: z.number().optional(),
  tags: z.array(z.string()).optional(),
  lastModified: z.string().optional(),
  private: z.boolean().default(false),
});

export type HuggingFaceResource = z.infer<typeof HuggingFaceResourceSchema>;

// GitHub Types
export const GitHubResourceTypeSchema = z.enum(['repository', 'gist', 'tool', 'action']);
export type GitHubResourceType = z.infer<typeof GitHubResourceTypeSchema>;

export const GitHubResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: GitHubResourceTypeSchema,
  owner: z.string(),
  description: z.string().optional(),
  url: z.string(),
  stars: z.number().optional(),
  language: z.string().optional(),
  topics: z.array(z.string()).optional(),
  private: z.boolean().default(false),
});

export type GitHubResource = z.infer<typeof GitHubResourceSchema>;

// Ollama Types
export const OllamaModelSchema = z.object({
  name: z.string(),
  model: z.string(),
  size: z.number(),
  digest: z.string(),
  modifiedAt: z.string(),
  details: z.object({
    format: z.string().optional(),
    family: z.string().optional(),
    families: z.array(z.string()).optional(),
    parameterSize: z.string().optional(),
    quantizationLevel: z.string().optional(),
  }).optional(),
});

export type OllamaModel = z.infer<typeof OllamaModelSchema>;

// MCP Server Status
export enum MCPServerStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
  RESTARTING = 'restarting',
}

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPServerStatus;
  pid?: number;
  startedAt?: Date;
  lastError?: string;
  restartCount: number;
  resources: MCPResource[];
  tools: MCPTool[];
  prompts: MCPPrompt[];
}

// Docker Watch Events
export enum DockerWatchEvent {
  MCP_ADDED = 'mcp:added',
  MCP_REMOVED = 'mcp:removed',
  MCP_UPDATED = 'mcp:updated',
  MCP_STARTED = 'mcp:started',
  MCP_STOPPED = 'mcp:stopped',
  MCP_ERROR = 'mcp:error',
}

export interface DockerWatchEventData {
  event: DockerWatchEvent;
  serverId: string;
  serverName: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: string;
}

// MCP Registry Events
export interface MCPRegistryEvents {
  'server:added': (server: MCPServerState) => void;
  'server:removed': (serverId: string) => void;
  'server:updated': (server: MCPServerState) => void;
  'server:status': (serverId: string, status: MCPServerStatus) => void;
  'server:error': (serverId: string, error: Error) => void;
  'resource:added': (serverId: string, resource: MCPResource) => void;
  'resource:removed': (serverId: string, resourceUri: string) => void;
  'tool:added': (serverId: string, tool: MCPTool) => void;
  'tool:removed': (serverId: string, toolName: string) => void;
}

// API Response Types
export interface MCPListServersResponse {
  servers: MCPServerState[];
  total: number;
}

export interface MCPServerDetailsResponse {
  server: MCPServerState;
  health: {
    healthy: boolean;
    lastCheck: Date;
    uptime: number;
  };
}

export interface MCPResourceListResponse {
  resources: MCPResource[];
  total: number;
  serverId: string;
}

export interface MCPToolListResponse {
  tools: MCPTool[];
  total: number;
  serverId: string;
}
