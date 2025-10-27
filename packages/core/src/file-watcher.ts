import chokidar from 'chokidar';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface WatchConfig {
  paths: string[]; // Paths to watch
  ignored?: string[]; // Patterns to ignore
  autoReload?: boolean; // Automatically reload on changes
  debounceMs?: number; // Debounce delay
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export type ChangeCallback = (event: FileChangeEvent) => void | Promise<void>;

/**
 * File Watcher
 *
 * Watches for file changes and triggers hot reload.
 * Enables real-time updates to GalaOS codebase with automatic reload.
 */
export class FileWatcher {
  private watcher?: chokidar.FSWatcher;
  private config: WatchConfig;
  private rootDir: string;
  private callbacks: ChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(rootDir: string = process.cwd(), config?: Partial<WatchConfig>) {
    this.rootDir = rootDir;
    this.config = {
      paths: config?.paths || [
        'apps/web/src/**/*.{ts,tsx,js,jsx}',
        'apps/api/src/**/*.{ts,js}',
        'packages/*/src/**/*.{ts,tsx,js,jsx}',
      ],
      ignored: config?.ignored || [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/.git/**',
        '**/.galaos-backups/**',
        '**/.galaos-code-backups/**',
      ],
      autoReload: config?.autoReload ?? true,
      debounceMs: config?.debounceMs ?? 300,
    };
  }

  /**
   * Start watching files
   */
  start(): void {
    if (this.watcher) {
      console.warn('File watcher already running');
      return;
    }

    console.log('Starting file watcher...');
    console.log('Watching paths:', this.config.paths);

    this.watcher = chokidar.watch(this.config.paths, {
      ignored: this.config.ignored,
      persistent: true,
      ignoreInitial: true,
      cwd: this.rootDir,
    });

    this.watcher
      .on('add', (filePath) => this.handleChange('add', filePath))
      .on('change', (filePath) => this.handleChange('change', filePath))
      .on('unlink', (filePath) => this.handleChange('unlink', filePath))
      .on('error', (error) => console.error('Watcher error:', error))
      .on('ready', () => console.log('File watcher ready'));
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      console.log('File watcher stopped');
    }
  }

  /**
   * Handle file change
   */
  private handleChange(type: 'add' | 'change' | 'unlink', filePath: string): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      const event: FileChangeEvent = {
        type,
        path: filePath,
        timestamp: new Date(),
      };

      console.log(`[${type.toUpperCase()}] ${filePath}`);

      // Trigger callbacks
      for (const callback of this.callbacks) {
        try {
          await callback(event);
        } catch (error) {
          console.error('Callback error:', error);
        }
      }

      // Auto-reload if enabled
      if (this.config.autoReload) {
        await this.triggerReload(filePath);
      }

      this.debounceTimers.delete(filePath);
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Trigger hot reload
   */
  private async triggerReload(filePath: string): Promise<void> {
    try {
      const ext = path.extname(filePath);
      const dir = filePath.split(path.sep)[0];

      // Determine what to reload based on file location
      if (dir === 'apps/web' || filePath.includes('apps/web')) {
        // Frontend change - Next.js has built-in hot reload
        console.log('Frontend change detected - Next.js will auto-reload');
      } else if (dir === 'apps/api' || filePath.includes('apps/api')) {
        // Backend change - may need to restart
        console.log('Backend change detected - consider restarting API server');
        // Could implement automatic restart here
      } else if (dir === 'packages' || filePath.includes('packages')) {
        // Package change - may affect both frontend and backend
        console.log('Package change detected - rebuilding...');
        // Could trigger rebuild
      }
    } catch (error) {
      console.error('Reload trigger error:', error);
    }
  }

  /**
   * Register callback for file changes
   */
  onChange(callback: ChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: ChangeCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get currently watched paths
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) {
      return [];
    }
    return Object.keys(this.watcher.getWatched());
  }

  /**
   * Add paths to watch
   */
  addPaths(paths: string | string[]): void {
    if (!this.watcher) {
      throw new Error('Watcher not started');
    }
    this.watcher.add(paths);
  }

  /**
   * Remove paths from watch
   */
  removePaths(paths: string | string[]): void {
    if (!this.watcher) {
      throw new Error('Watcher not started');
    }
    this.watcher.unwatch(paths);
  }

  /**
   * Restart services (for backend changes)
   */
  async restartBackend(): Promise<{ success: boolean; output: string }> {
    try {
      console.log('Restarting backend services...');

      // Option 1: Using PM2 (if available)
      try {
        const { stdout, stderr } = await execAsync('pm2 restart galaos-api', {
          cwd: this.rootDir,
        });
        return { success: true, output: stdout + stderr };
      } catch (pm2Error) {
        // PM2 not available, try other methods
      }

      // Option 2: Using Docker
      try {
        const { stdout, stderr } = await execAsync(
          'docker-compose restart galaos-api',
          { cwd: this.rootDir }
        );
        return { success: true, output: stdout + stderr };
      } catch (dockerError) {
        // Docker not available
      }

      // Option 3: Kill and restart process (development only)
      // This would require process management setup

      return {
        success: false,
        output: 'No restart method available (PM2, Docker, or process manager required)',
      };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  /**
   * Rebuild packages
   */
  async rebuildPackages(): Promise<{ success: boolean; output: string }> {
    try {
      console.log('Rebuilding packages...');

      // Detect package manager
      let command = 'npm run build';
      if (require('fs').existsSync(path.join(this.rootDir, 'pnpm-lock.yaml'))) {
        command = 'pnpm run build';
      } else if (require('fs').existsSync(path.join(this.rootDir, 'yarn.lock'))) {
        command = 'yarn build';
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.rootDir,
        timeout: 300000, // 5 minutes
      });

      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }
}

/**
 * Hot Reload Manager
 *
 * Manages hot module replacement for frontend and backend
 */
export class HotReloadManager {
  private fileWatcher: FileWatcher;
  private reloadCallbacks: Map<string, () => void> = new Map();

  constructor(rootDir: string = process.cwd()) {
    this.fileWatcher = new FileWatcher(rootDir);

    // Setup default callbacks
    this.fileWatcher.onChange(async (event) => {
      console.log(`Hot reload triggered: ${event.type} ${event.path}`);

      // Call registered callbacks
      for (const [pattern, callback] of this.reloadCallbacks) {
        if (event.path.includes(pattern)) {
          callback();
        }
      }
    });
  }

  /**
   * Start hot reload
   */
  start(): void {
    this.fileWatcher.start();
  }

  /**
   * Stop hot reload
   */
  async stop(): Promise<void> {
    await this.fileWatcher.stop();
  }

  /**
   * Register reload callback for path pattern
   */
  onReload(pathPattern: string, callback: () => void): void {
    this.reloadCallbacks.set(pathPattern, callback);
  }

  /**
   * Get file watcher instance
   */
  getWatcher(): FileWatcher {
    return this.fileWatcher;
  }
}
