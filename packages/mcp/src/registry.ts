import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  MCPServerConfig,
  MCPServerState,
  MCPServerStatus,
  MCPResource,
  MCPTool,
  MCPPrompt,
  MCPRegistryEvents,
} from './types';

/**
 * MCP Server Registry
 * Manages lifecycle of MCP servers and their connections
 */
export class MCPRegistry extends EventEmitter {
  private servers: Map<string, MCPServerState> = new Map();
  private clients: Map<string, Client> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    if (this.servers.has(config.id)) {
      throw new Error(`MCP server ${config.id} is already registered`);
    }

    const serverState: MCPServerState = {
      config,
      status: MCPServerStatus.STOPPED,
      restartCount: 0,
      resources: [],
      tools: [],
      prompts: [],
    };

    this.servers.set(config.id, serverState);
    this.emit('server:added', serverState);

    if (config.autoStart) {
      await this.startServer(config.id);
    }
  }

  /**
   * Unregister an MCP server
   */
  async unregisterServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server ${serverId} not found`);
    }

    await this.stopServer(serverId);
    this.servers.delete(serverId);
    this.emit('server:removed', serverId);
  }

  /**
   * Start an MCP server
   */
  async startServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server ${serverId} not found`);
    }

    if (server.status === MCPServerStatus.RUNNING) {
      return;
    }

    try {
      server.status = MCPServerStatus.STARTING;
      this.emit('server:status', serverId, MCPServerStatus.STARTING);

      // Create MCP client with stdio transport
      const envVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          envVars[key] = value;
        }
      }
      if (server.config.env) {
        for (const [key, value] of Object.entries(server.config.env)) {
          envVars[key] = value;
        }
      }

      const transport = new StdioClientTransport({
        command: server.config.command,
        args: server.config.args || [],
        env: envVars,
      });

      const client = new Client({
        name: 'galaos-mcp-client',
        version: '0.1.0',
      }, {
        capabilities: {
          roots: {
            listChanged: true,
          },
          sampling: {},
        },
      });

      await client.connect(transport);
      this.clients.set(serverId, client);

      // Initialize server capabilities
      await this.initializeServerCapabilities(serverId, client);

      server.status = MCPServerStatus.RUNNING;
      server.startedAt = new Date();
      this.emit('server:status', serverId, MCPServerStatus.RUNNING);

      // Start health check if configured
      if (server.config.healthCheck) {
        this.startHealthCheck(serverId);
      }
    } catch (error) {
      server.status = MCPServerStatus.ERROR;
      server.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.emit('server:error', serverId, error as Error);

      // Retry if restart policy allows
      if (this.shouldRestart(server)) {
        server.status = MCPServerStatus.RESTARTING;
        server.restartCount++;
        setTimeout(() => this.startServer(serverId), 5000);
      }
    }
  }

  /**
   * Stop an MCP server
   */
  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server ${serverId} not found`);
    }

    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
    }

    // Clear health check
    const healthCheckInterval = this.healthCheckIntervals.get(serverId);
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      this.healthCheckIntervals.delete(serverId);
    }

    server.status = MCPServerStatus.STOPPED;
    server.pid = undefined;
    this.emit('server:status', serverId, MCPServerStatus.STOPPED);
  }

  /**
   * Restart an MCP server
   */
  async restartServer(serverId: string): Promise<void> {
    await this.stopServer(serverId);
    await this.startServer(serverId);
  }

  /**
   * Initialize server capabilities (resources, tools, prompts)
   */
  private async initializeServerCapabilities(
    serverId: string,
    client: Client
  ): Promise<void> {
    const server = this.servers.get(serverId)!;

    try {
      // List resources
      const resourcesResponse = await client.listResources();
      server.resources = resourcesResponse.resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));

      for (const resource of server.resources) {
        this.emit('resource:added', serverId, resource);
      }

      // List tools
      const toolsResponse = await client.listTools();
      server.tools = toolsResponse.tools.map((t) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema,
      }));

      for (const tool of server.tools) {
        this.emit('tool:added', serverId, tool);
      }

      // List prompts
      const promptsResponse = await client.listPrompts();
      server.prompts = promptsResponse.prompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments?.map((arg) => ({
          name: arg.name,
          description: arg.description,
          required: arg.required ?? false,
        })),
      }));
    } catch (error) {
      console.error(`Failed to initialize capabilities for ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Start health check for a server
   */
  private startHealthCheck(serverId: string): void {
    const server = this.servers.get(serverId);
    if (!server?.config.healthCheck) {
      return;
    }

    const interval = setInterval(async () => {
      const client = this.clients.get(serverId);
      if (!client) {
        return;
      }

      try {
        // Simple ping to check if server is responsive
        await client.ping();
      } catch (error) {
        console.error(`Health check failed for ${serverId}:`, error);
        this.emit('server:error', serverId, error as Error);

        // Attempt restart if policy allows
        if (this.shouldRestart(server)) {
          await this.restartServer(serverId);
        }
      }
    }, server.config.healthCheck.interval);

    this.healthCheckIntervals.set(serverId, interval);
  }

  /**
   * Check if server should restart based on restart policy
   */
  private shouldRestart(server: MCPServerState): boolean {
    const { restart } = server.config;
    const maxRetries = server.config.healthCheck?.retries || 3;

    if (restart === 'no') {
      return false;
    }

    if (restart === 'always') {
      return true;
    }

    if (restart === 'on-failure' && server.restartCount < maxRetries) {
      return true;
    }

    if (restart === 'unless-stopped' && server.status !== MCPServerStatus.STOPPED) {
      return true;
    }

    return false;
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServerState[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific server
   */
  getServer(serverId: string): MCPServerState | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get MCP client for a server
   */
  getClient(serverId: string): Client | undefined {
    return this.clients.get(serverId);
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const server = this.servers.get(serverId);
    const tool = server?.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found on server ${serverId}`);
    }

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    return result;
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const result = await client.readResource({ uri });
    return result;
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(serverId: string, promptName: string, args?: Record<string, string>): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP server ${serverId} is not running`);
    }

    const result = await client.getPrompt({
      name: promptName,
      arguments: args,
    });

    return result;
  }

  /**
   * Shutdown all servers
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = Array.from(this.servers.keys()).map((serverId) =>
      this.stopServer(serverId)
    );
    await Promise.all(shutdownPromises);
  }

  // Type-safe event emitter methods
  override on<K extends keyof MCPRegistryEvents>(
    event: K,
    listener: MCPRegistryEvents[K]
  ): this {
    return super.on(event, listener as any);
  }

  override emit<K extends keyof MCPRegistryEvents>(
    event: K,
    ...args: Parameters<MCPRegistryEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
