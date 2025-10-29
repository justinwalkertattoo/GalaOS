import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import Docker from 'dockerode';
import { readFile } from 'fs/promises';
import { MCPServerConfig, MCPServerConfigSchema, DockerWatchEvent, DockerWatchEventData } from './types';
import { MCPRegistry } from './registry';

/**
 * Docker MCP Watcher
 * Watches for MCP configuration changes and manages Docker container lifecycle
 */
export class DockerMCPWatcher extends EventEmitter {
  private watcher?: FSWatcher;
  private docker: Docker;
  private registry: MCPRegistry;
  private configPath: string;
  private containerPrefix = 'galaos-mcp-';

  constructor(
    registry: MCPRegistry,
    configPath: string = '/etc/galaos/mcp-servers.json',
    dockerOptions?: Docker.DockerOptions
  ) {
    super();
    this.registry = registry;
    this.configPath = configPath;
    this.docker = new Docker(dockerOptions || { socketPath: '/var/run/docker.sock' });
  }

  /**
   * Start watching the MCP configuration file
   */
  async start(): Promise<void> {
    // Initial load of configuration
    await this.loadConfiguration();

    // Watch for configuration changes
    this.watcher = watch(this.configPath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', async () => {
      console.log(`MCP configuration changed: ${this.configPath}`);
      await this.handleConfigurationChange();
    });

    this.watcher.on('error', (error) => {
      console.error('MCP configuration watcher error:', error);
    });

    // Watch for Docker events
    this.watchDockerEvents();

    console.log(`Started watching MCP configuration: ${this.configPath}`);
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }
  }

  /**
   * Load MCP configuration from file
   */
  private async loadConfiguration(): Promise<MCPServerConfig[]> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      const data = JSON.parse(content);

      if (!Array.isArray(data.servers)) {
        throw new Error('Invalid MCP configuration: servers must be an array');
      }

      const configs: MCPServerConfig[] = [];
      for (const serverConfig of data.servers) {
        const validated = MCPServerConfigSchema.parse(serverConfig);
        configs.push(validated);
      }

      return configs;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('MCP configuration file not found, starting with empty configuration');
        return [];
      }
      throw error;
    }
  }

  /**
   * Handle configuration file changes
   */
  private async handleConfigurationChange(): Promise<void> {
    try {
      const newConfigs = await this.loadConfiguration();
      const currentServers = this.registry.getServers();

      // Map of server IDs to configs
      const newConfigMap = new Map(newConfigs.map((c) => [c.id, c]));
      const currentConfigMap = new Map(currentServers.map((s) => [s.config.id, s.config]));

      // Find added servers
      for (const [serverId, config] of newConfigMap) {
        if (!currentConfigMap.has(serverId)) {
          console.log(`Detected new MCP server: ${serverId}`);
          await this.handleServerAdded(config);
        } else {
          // Check if config changed
          const currentConfig = currentConfigMap.get(serverId)!;
          if (JSON.stringify(config) !== JSON.stringify(currentConfig)) {
            console.log(`Detected MCP server configuration change: ${serverId}`);
            await this.handleServerUpdated(config);
          }
        }
      }

      // Find removed servers
      for (const [serverId] of currentConfigMap) {
        if (!newConfigMap.has(serverId)) {
          console.log(`Detected removed MCP server: ${serverId}`);
          await this.handleServerRemoved(serverId);
        }
      }
    } catch (error) {
      console.error('Failed to handle configuration change:', error);
      this.emitEvent({
        event: DockerWatchEvent.MCP_ERROR,
        serverId: 'system',
        serverName: 'config-watcher',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle server added
   */
  private async handleServerAdded(config: MCPServerConfig): Promise<void> {
    try {
      await this.registry.registerServer(config);

      this.emitEvent({
        event: DockerWatchEvent.MCP_ADDED,
        serverId: config.id,
        serverName: config.name,
        timestamp: new Date(),
        metadata: { config },
      });

      // If enabled, create and start Docker container
      if (config.enabled) {
        await this.startDockerContainer(config);
      }
    } catch (error) {
      console.error(`Failed to add MCP server ${config.id}:`, error);
      this.emitEvent({
        event: DockerWatchEvent.MCP_ERROR,
        serverId: config.id,
        serverName: config.name,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle server updated
   */
  private async handleServerUpdated(config: MCPServerConfig): Promise<void> {
    try {
      // Restart the server with new configuration
      await this.registry.unregisterServer(config.id);
      await this.stopDockerContainer(config.id);

      await this.registry.registerServer(config);

      this.emitEvent({
        event: DockerWatchEvent.MCP_UPDATED,
        serverId: config.id,
        serverName: config.name,
        timestamp: new Date(),
        metadata: { config },
      });

      if (config.enabled) {
        await this.startDockerContainer(config);
      }
    } catch (error) {
      console.error(`Failed to update MCP server ${config.id}:`, error);
      this.emitEvent({
        event: DockerWatchEvent.MCP_ERROR,
        serverId: config.id,
        serverName: config.name,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle server removed
   */
  private async handleServerRemoved(serverId: string): Promise<void> {
    try {
      const server = this.registry.getServer(serverId);
      if (!server) {
        return;
      }

      await this.registry.unregisterServer(serverId);
      await this.stopDockerContainer(serverId);

      this.emitEvent({
        event: DockerWatchEvent.MCP_REMOVED,
        serverId,
        serverName: server.config.name,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`Failed to remove MCP server ${serverId}:`, error);
      this.emitEvent({
        event: DockerWatchEvent.MCP_ERROR,
        serverId,
        serverName: 'unknown',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start a Docker container for an MCP server
   */
  private async startDockerContainer(config: MCPServerConfig): Promise<void> {
    const containerName = `${this.containerPrefix}${config.id}`;

    try {
      // Check if container already exists
      let container = this.docker.getContainer(containerName);
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          console.log(`Container ${containerName} already running`);
          return;
        }
        // Container exists but not running, remove it
        await container.remove({ force: true });
      } catch (error) {
        // Container doesn't exist, which is fine
      }

      // Create and start new container
      container = await this.docker.createContainer({
        name: containerName,
        Image: config.command, // Assuming command is Docker image
        Env: config.env ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`) : [],
        Cmd: config.args,
        HostConfig: {
          RestartPolicy: {
            Name: config.restart,
            MaximumRetryCount: config.healthCheck?.retries || 0,
          },
          NetworkMode: 'galaos-network',
        },
        Labels: {
          'galaos.mcp.server': 'true',
          'galaos.mcp.id': config.id,
          'galaos.mcp.name': config.name,
        },
      });

      await container.start();

      this.emitEvent({
        event: DockerWatchEvent.MCP_STARTED,
        serverId: config.id,
        serverName: config.name,
        timestamp: new Date(),
        metadata: { containerName },
      });

      console.log(`Started Docker container for MCP server: ${containerName}`);
    } catch (error) {
      console.error(`Failed to start Docker container ${containerName}:`, error);
      throw error;
    }
  }

  /**
   * Stop a Docker container for an MCP server
   */
  private async stopDockerContainer(serverId: string): Promise<void> {
    const containerName = `${this.containerPrefix}${serverId}`;

    try {
      const container = this.docker.getContainer(containerName);
      await container.stop();
      await container.remove();

      this.emitEvent({
        event: DockerWatchEvent.MCP_STOPPED,
        serverId,
        serverName: serverId,
        timestamp: new Date(),
        metadata: { containerName },
      });

      console.log(`Stopped Docker container for MCP server: ${containerName}`);
    } catch (error) {
      // Container might not exist, which is fine
      if ((error as any).statusCode !== 404) {
        console.error(`Failed to stop Docker container ${containerName}:`, error);
      }
    }
  }

  /**
   * Watch Docker events for MCP containers
   */
  private async watchDockerEvents(): Promise<void> {
    try {
      const stream = await this.docker.getEvents({
        filters: {
          label: ['galaos.mcp.server=true'],
        },
      });

      stream.on('data', (chunk: Buffer) => {
        try {
          const event = JSON.parse(chunk.toString());
          const serverId = event.Actor?.Attributes['galaos.mcp.id'];
          const serverName = event.Actor?.Attributes['galaos.mcp.name'];

          if (!serverId) {
            return;
          }

          // Handle different Docker events
          switch (event.Action) {
            case 'start':
              this.emitEvent({
                event: DockerWatchEvent.MCP_STARTED,
                serverId,
                serverName: serverName || serverId,
                timestamp: new Date(event.time * 1000),
              });
              break;
            case 'die':
            case 'stop':
              this.emitEvent({
                event: DockerWatchEvent.MCP_STOPPED,
                serverId,
                serverName: serverName || serverId,
                timestamp: new Date(event.time * 1000),
              });
              break;
            case 'health_status: unhealthy':
              this.emitEvent({
                event: DockerWatchEvent.MCP_ERROR,
                serverId,
                serverName: serverName || serverId,
                timestamp: new Date(event.time * 1000),
                error: 'Container health check failed',
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse Docker event:', error);
        }
      });

      stream.on('error', (error: Error) => {
        console.error('Docker events stream error:', error);
      });
    } catch (error) {
      console.error('Failed to watch Docker events:', error);
    }
  }

  /**
   * Emit Docker watch event
   */
  private emitEvent(data: DockerWatchEventData): void {
    this.emit('docker:event', data);
    console.log(`Docker MCP Event: ${data.event} - ${data.serverName} (${data.serverId})`);
  }

  /**
   * Get Docker container status for an MCP server
   */
  async getContainerStatus(serverId: string): Promise<any> {
    const containerName = `${this.containerPrefix}${serverId}`;
    try {
      const container = this.docker.getContainer(containerName);
      const info = await container.inspect();
      return {
        running: info.State.Running,
        status: info.State.Status,
        startedAt: info.State.StartedAt,
        finishedAt: info.State.FinishedAt,
        restartCount: info.RestartCount,
        health: info.State.Health,
      };
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return { running: false, status: 'not-found' };
      }
      throw error;
    }
  }
}
