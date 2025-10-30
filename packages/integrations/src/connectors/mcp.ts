import { z } from 'zod';
import { BaseIntegration, IntegrationAction, IntegrationConfig, IntegrationCredentials } from '../base';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_TIMEOUT = 300000; // 5 minutes

// Rate limiting map (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

// Cache for parsed allowlists
let allowlistCache: {
  commands: Set<string>;
  dirs: Set<string>;
  apps: Set<string>;
  lastParsed: number;
} | null = null;
const CACHE_TTL = 60000; // 1 minute

function getOrUpdateCache() {
  const now = Date.now();
  if (!allowlistCache || now - allowlistCache.lastParsed > CACHE_TTL) {
    allowlistCache = {
      commands: new Set(
        (process.env.MCP_ALLOWED_COMMANDS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
      dirs: new Set(
        (process.env.MCP_ALLOWED_DIRS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((d) => path.resolve(d))
      ),
      apps: new Set(
        (process.env.MCP_ALLOWED_APPS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
      lastParsed: now,
    };
  }
  return allowlistCache;
}

function isEnabled(): boolean {
  return (process.env.MCP_ENABLE || '').toLowerCase() === 'true';
}

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const key = `mcp:${userId}`;
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    throw new Error('Rate limit exceeded. Try again later.');
  }

  limit.count++;
}

function checkApiKey(credentials: IntegrationCredentials): void {
  const expected = process.env.MCP_ACCESS_TOKEN || '';
  const provided = (credentials as any).apiKey || (credentials as any).accessToken || '';

  if (!expected || !provided) {
    throw new Error('Unauthorized: invalid MCP access token');
  }

  // Constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    throw new Error('Unauthorized: invalid MCP access token');
  }

  const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!isValid) {
    throw new Error('Unauthorized: invalid MCP access token');
  }
}

function isAllowedCommand(cmd: string): boolean {
  const cache = getOrUpdateCache();
  if (cache.commands.size === 0) return false;

  // Only allow exact command name matches (no path components)
  const commandName = path.basename(cmd);

  // Reject if command contains path separators or special characters
  if (cmd.includes(path.sep) || cmd.includes('/') || cmd.includes('\\')) {
    return false;
  }

  return cache.commands.has(commandName);
}

function isAllowedPath(targetPath: string): boolean {
  const cache = getOrUpdateCache();
  if (cache.dirs.size === 0) return false;

  try {
    // Resolve to absolute path and normalize to prevent traversal
    const resolved = path.resolve(path.normalize(targetPath));

    // Check against each allowed directory
    for (const allowedDir of cache.dirs) {
      const normalized = path.normalize(allowedDir);
      if (resolved === normalized || resolved.startsWith(normalized + path.sep)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    // If path resolution fails, deny access
    return false;
  }
}

async function validateFileSize(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet (for writes), that's ok
      return;
    }
    throw error;
  }
}

export class MCPIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'mcp-local',
    name: 'Local PC (MCP)',
    description: 'Secure local OS control: terminal, files, apps',
    authType: 'basic',
    icon: '🖥️',
  };

  async test(): Promise<boolean> {
    return isEnabled();
  }
}

export const mcpShellExecAction: IntegrationAction<
  { command: string; args?: string[]; timeoutMs?: number; cwd?: string; userId?: string },
  { stdout: string; stderr: string; exitCode: number }
> = {
  name: 'shell.exec',
  description: 'Execute an allowed shell command on the local machine',
  inputSchema: z.object({
    command: z.string().min(1).max(100),
    args: z.array(z.string().max(1000)).max(50).optional(),
    timeoutMs: z.number().int().positive().max(MAX_TIMEOUT).optional(),
    cwd: z.string().optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({ stdout: z.string(), stderr: z.string(), exitCode: z.number().int() }),
  async execute(input, credentials) {
    if (!isEnabled()) throw new Error('MCP disabled');
    checkApiKey(credentials);
    checkRateLimit(input.userId || 'anonymous');

    // Validate command is allowed
    if (!isAllowedCommand(input.command)) {
      throw new Error(`Command not allowed: ${input.command}`);
    }

    // Validate and sanitize cwd
    const cwd = input.cwd || process.cwd();
    if (input.cwd && !isAllowedPath(input.cwd)) {
      throw new Error('Working directory not allowed');
    }

    // Use execFile instead of exec to prevent shell injection
    const timeout = Math.min(input.timeoutMs || DEFAULT_TIMEOUT, MAX_TIMEOUT);

    try {
      const { stdout, stderr } = await execFileAsync(
        input.command,
        input.args || [],
        {
          cwd,
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          windowsHide: true,
        }
      );
      return {
        stdout: stdout.slice(0, 100000), // Limit output size
        stderr: stderr.slice(0, 100000),
        exitCode: 0
      };
    } catch (e: any) {
      const stdout = (e.stdout || '').slice(0, 100000);
      const stderr = (e.stderr || e.message || '').slice(0, 100000);
      const exitCode = typeof e.code === 'number' ? e.code : 1;
      return { stdout, stderr, exitCode };
    }
  },
};

export const mcpReadFileAction: IntegrationAction<
  { filePath: string; encoding?: BufferEncoding; userId?: string },
  { content: string }
> = {
  name: 'fs.read',
  description: 'Read a file from an allowed directory',
  inputSchema: z.object({
    filePath: z.string().min(1).max(1000),
    encoding: z.string().optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({ content: z.string() }),
  async execute(input, credentials) {
    if (!isEnabled()) throw new Error('MCP disabled');
    checkApiKey(credentials);
    checkRateLimit(input.userId || 'anonymous');

    // Validate path
    if (!isAllowedPath(input.filePath)) {
      throw new Error('Path not allowed');
    }

    // Check file size before reading
    await validateFileSize(input.filePath);

    // Read file asynchronously
    const content = await fs.readFile(
      input.filePath,
      (input.encoding as BufferEncoding) || 'utf-8'
    );

    return { content: content.toString() };
  },
};

export const mcpWriteFileAction: IntegrationAction<
  { filePath: string; content: string; encoding?: BufferEncoding; mkdirp?: boolean; userId?: string },
  { success: boolean }
> = {
  name: 'fs.write',
  description: 'Write a file to an allowed directory',
  inputSchema: z.object({
    filePath: z.string().min(1).max(1000),
    content: z.string().max(MAX_FILE_SIZE),
    encoding: z.string().optional(),
    mkdirp: z.boolean().optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  async execute(input, credentials) {
    if (!isEnabled()) throw new Error('MCP disabled');
    checkApiKey(credentials);
    checkRateLimit(input.userId || 'anonymous');

    // Validate path
    if (!isAllowedPath(input.filePath)) {
      throw new Error('Path not allowed');
    }

    // Validate content size
    const contentSize = Buffer.byteLength(input.content, (input.encoding as BufferEncoding) || 'utf-8');
    if (contentSize > MAX_FILE_SIZE) {
      throw new Error(`Content size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Handle directory creation
    const dir = path.dirname(input.filePath);
    if (input.mkdirp) {
      // Validate parent directory is also allowed
      if (!isAllowedPath(dir)) {
        throw new Error('Parent directory not allowed');
      }
      await fs.mkdir(dir, { recursive: true });
    }

    // Write file asynchronously
    await fs.writeFile(
      input.filePath,
      input.content,
      (input.encoding as BufferEncoding) || 'utf-8'
    );

    return { success: true };
  },
};

export const mcpOpenAppAction: IntegrationAction<
  { target: string; args?: string[]; userId?: string },
  { launched: boolean }
> = {
  name: 'app.open',
  description: 'Open an application or file using the OS default handler',
  inputSchema: z.object({
    target: z.string().min(1).max(1000),
    args: z.array(z.string().max(1000)).max(10).optional(),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({ launched: z.boolean() }),
  async execute(input, credentials) {
    if (!isEnabled()) throw new Error('MCP disabled');
    checkApiKey(credentials);
    checkRateLimit(input.userId || 'anonymous');

    const cache = getOrUpdateCache();
    const targetBaseName = path.basename(input.target);

    // Check if allowed by app name or by path
    const allowedByName = cache.apps.has(targetBaseName);
    const allowedByPath = isAllowedPath(input.target);

    if (!allowedByName && !allowedByPath) {
      throw new Error('App/target not allowed');
    }

    // Platform-specific launcher - use execFile to avoid shell injection
    const platform = process.platform;

    try {
      if (platform === 'win32') {
        // Windows: use cmd.exe with /c start
        await execFileAsync(
          'cmd.exe',
          ['/c', 'start', '""', input.target, ...(input.args || [])],
          {
            timeout: 10000,
            windowsHide: false,
          }
        );
      } else if (platform === 'darwin') {
        // macOS: use open
        await execFileAsync(
          'open',
          [input.target, ...(input.args || [])],
          { timeout: 10000 }
        );
      } else {
        // Linux: use xdg-open (no args support for security)
        await execFileAsync('xdg-open', [input.target], { timeout: 10000 });
      }

      return { launched: true };
    } catch (error: any) {
      throw new Error(`Failed to launch: ${error.message}`);
    }
  },
};

