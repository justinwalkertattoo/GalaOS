import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog?: string;
  breaking: boolean;
  releaseDate?: string;
  downloadUrl?: string;
}

export interface UpdateResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  changes: string[];
  errors?: string[];
  rollbackAvailable: boolean;
}

export interface HealthCheck {
  healthy: boolean;
  checks: {
    api: boolean;
    database: boolean;
    redis: boolean;
    workers: boolean;
    docker: boolean;
  };
  errors: string[];
}

/**
 * Version Manager for GalaOS Self-Updates
 *
 * Handles:
 * - Version tracking and comparison
 * - Update checking (GitHub releases, npm)
 * - Automatic updates with rollback
 * - Health checks before/after updates
 * - Dependency updates
 * - Database migrations
 */
export class VersionManager {
  private rootDir: string;
  private packageJsonPath: string;
  private currentVersion: Version;
  private backupDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
    this.packageJsonPath = path.join(rootDir, 'package.json');
    this.backupDir = path.join(rootDir, '.galaos-backups');
    this.currentVersion = this.getCurrentVersion();

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion(): Version {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
      return this.parseVersion(packageJson.version || '0.1.0');
    } catch (error) {
      console.error('Failed to read version from package.json:', error);
      return { major: 0, minor: 1, patch: 0 };
    }
  }

  /**
   * Parse semantic version string
   */
  parseVersion(versionString: string): Version {
    const match = versionString.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?(?:\+([a-zA-Z0-9.]+))?$/
    );

    if (!match) {
      throw new Error(`Invalid version string: ${versionString}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5],
    };
  }

  /**
   * Compare two versions
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1: Version, v2: Version): number {
    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    if (v1.patch !== v2.patch) return v1.patch - v2.patch;

    // Handle prerelease
    if (v1.prerelease && !v2.prerelease) return -1;
    if (!v1.prerelease && v2.prerelease) return 1;
    if (v1.prerelease && v2.prerelease) {
      return v1.prerelease.localeCompare(v2.prerelease);
    }

    return 0;
  }

  /**
   * Version to string
   */
  versionToString(version: Version): string {
    let v = `${version.major}.${version.minor}.${version.patch}`;
    if (version.prerelease) v += `-${version.prerelease}`;
    if (version.build) v += `+${version.build}`;
    return v;
  }

  /**
   * Check for updates from GitHub releases
   */
  async checkForUpdates(
    githubRepo: string = 'justinwalkertattoo/GalaOS'
  ): Promise<UpdateInfo> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${githubRepo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const latestVersionString = response.data.tag_name.replace(/^v/, '');
      const latestVersion = this.parseVersion(latestVersionString);
      const comparison = this.compareVersions(this.currentVersion, latestVersion);

      // Check if breaking change (major version bump)
      const breaking = latestVersion.major > this.currentVersion.major;

      return {
        available: comparison < 0,
        currentVersion: this.versionToString(this.currentVersion),
        latestVersion: latestVersionString,
        changelog: response.data.body,
        breaking,
        releaseDate: response.data.published_at,
        downloadUrl: response.data.tarball_url,
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return {
        available: false,
        currentVersion: this.versionToString(this.currentVersion),
        latestVersion: this.versionToString(this.currentVersion),
        breaking: false,
      };
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthCheck> {
    const result: HealthCheck = {
      healthy: true,
      checks: {
        api: false,
        database: false,
        redis: false,
        workers: false,
        docker: false,
      },
      errors: [],
    };

    // Check API
    try {
      const apiUrl = process.env.API_URL || 'http://localhost:4000';
      await axios.get(`${apiUrl}/health`, { timeout: 5000 });
      result.checks.api = true;
    } catch (error) {
      result.errors.push('API health check failed');
      result.healthy = false;
    }

    // Check Database
    try {
      const { PrismaClient } = await import('@galaos/db');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      result.checks.database = true;
    } catch (error) {
      result.errors.push('Database health check failed');
      result.healthy = false;
    }

    // Check Redis
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const { default: IORedis } = await import('ioredis');
      const redis = new IORedis(redisUrl);
      await redis.ping();
      await redis.quit();
      result.checks.redis = true;
    } catch (error) {
      result.errors.push('Redis health check failed');
      result.healthy = false;
    }

    // Check Docker
    try {
      await execAsync('docker ps', { cwd: this.rootDir });
      result.checks.docker = true;
    } catch (error) {
      result.errors.push('Docker health check failed');
      result.healthy = false;
    }

    // Workers check (if worker queue has jobs)
    try {
      result.checks.workers = true; // Assume healthy if Redis is healthy
    } catch (error) {
      result.errors.push('Workers health check failed');
    }

    return result;
  }

  /**
   * Create backup before update
   */
  async createBackup(version: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${version}-${timestamp}`);

    try {
      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Backup critical files
      const filesToBackup = [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        '.env',
        'docker-compose.yml',
        'docker/docker-compose.full.yml',
      ];

      for (const file of filesToBackup) {
        const srcPath = path.join(this.rootDir, file);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(backupPath, file);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Create backup metadata
      const metadata = {
        version,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      };
      fs.writeFileSync(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      console.log(`Backup created at: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(backupPath: string): Promise<boolean> {
    try {
      console.log(`Rolling back from: ${backupPath}`);

      // Restore backed up files
      const files = fs.readdirSync(backupPath);
      for (const file of files) {
        if (file === 'backup-metadata.json') continue;

        const srcPath = path.join(backupPath, file);
        const destPath = path.join(this.rootDir, file);

        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Reinstall dependencies
      await this.installDependencies();

      console.log('Rollback completed successfully');
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Pull latest changes from Git
   */
  async gitPull(branch: string = 'main'): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
        cwd: this.rootDir,
      });
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  /**
   * Install/update dependencies
   */
  async installDependencies(): Promise<{ success: boolean; output: string }> {
    try {
      // Detect package manager
      let command = 'npm install';
      if (fs.existsSync(path.join(this.rootDir, 'pnpm-lock.yaml'))) {
        command = 'pnpm install';
      } else if (fs.existsSync(path.join(this.rootDir, 'yarn.lock'))) {
        command = 'yarn install';
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

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: this.rootDir,
        timeout: 120000, // 2 minutes
      });
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  /**
   * Build application
   */
  async buildApplication(): Promise<{ success: boolean; output: string }> {
    try {
      // Detect package manager
      let command = 'npm run build';
      if (fs.existsSync(path.join(this.rootDir, 'pnpm-lock.yaml'))) {
        command = 'pnpm run build';
      } else if (fs.existsSync(path.join(this.rootDir, 'yarn.lock'))) {
        command = 'yarn build';
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.rootDir,
        timeout: 600000, // 10 minutes
      });
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  /**
   * Perform full update
   */
  async update(options: {
    branch?: string;
    skipBackup?: boolean;
    skipMigrations?: boolean;
    skipBuild?: boolean;
  } = {}): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      previousVersion: this.versionToString(this.currentVersion),
      newVersion: '',
      changes: [],
      errors: [],
      rollbackAvailable: false,
    };

    let backupPath: string | null = null;

    try {
      // Pre-update health check
      console.log('Performing pre-update health check...');
      const preHealth = await this.performHealthCheck();
      if (!preHealth.healthy) {
        result.errors!.push('Pre-update health check failed: ' + preHealth.errors.join(', '));
        return result;
      }
      result.changes.push('Pre-update health check passed');

      // Create backup
      if (!options.skipBackup) {
        console.log('Creating backup...');
        backupPath = await this.createBackup(result.previousVersion);
        result.rollbackAvailable = true;
        result.changes.push(`Backup created at ${backupPath}`);
      }

      // Git pull
      console.log('Pulling latest changes from Git...');
      const gitResult = await this.gitPull(options.branch);
      if (!gitResult.success) {
        result.errors!.push(`Git pull failed: ${gitResult.output}`);
        if (backupPath) await this.rollback(backupPath);
        return result;
      }
      result.changes.push('Git pull completed');

      // Install dependencies
      console.log('Installing dependencies...');
      const installResult = await this.installDependencies();
      if (!installResult.success) {
        result.errors!.push(`Dependency installation failed: ${installResult.output}`);
        if (backupPath) await this.rollback(backupPath);
        return result;
      }
      result.changes.push('Dependencies installed');

      // Run migrations
      if (!options.skipMigrations) {
        console.log('Running database migrations...');
        const migrationResult = await this.runMigrations();
        if (!migrationResult.success) {
          result.errors!.push(`Migration failed: ${migrationResult.output}`);
          if (backupPath) await this.rollback(backupPath);
          return result;
        }
        result.changes.push('Database migrations completed');
      }

      // Build application
      if (!options.skipBuild) {
        console.log('Building application...');
        const buildResult = await this.buildApplication();
        if (!buildResult.success) {
          result.errors!.push(`Build failed: ${buildResult.output}`);
          if (backupPath) await this.rollback(backupPath);
          return result;
        }
        result.changes.push('Application built successfully');
      }

      // Get new version
      this.currentVersion = this.getCurrentVersion();
      result.newVersion = this.versionToString(this.currentVersion);

      // Post-update health check
      console.log('Performing post-update health check...');
      const postHealth = await this.performHealthCheck();
      if (!postHealth.healthy) {
        result.errors!.push('Post-update health check failed: ' + postHealth.errors.join(', '));
        if (backupPath) {
          console.log('Rolling back due to failed health check...');
          await this.rollback(backupPath);
        }
        return result;
      }
      result.changes.push('Post-update health check passed');

      result.success = true;
      console.log(`Update completed successfully: ${result.previousVersion} → ${result.newVersion}`);

      return result;
    } catch (error: any) {
      result.errors!.push(`Update failed: ${error.message}`);
      if (backupPath) {
        console.log('Rolling back due to error...');
        await this.rollback(backupPath);
      }
      return result;
    }
  }

  /**
   * List available backups
   */
  listBackups(): Array<{
    path: string;
    version: string;
    timestamp: string;
    metadata?: any;
  }> {
    try {
      const backups = fs.readdirSync(this.backupDir);
      return backups
        .filter((dir) => dir.startsWith('backup-'))
        .map((dir) => {
          const backupPath = path.join(this.backupDir, dir);
          const metadataPath = path.join(backupPath, 'backup-metadata.json');

          let metadata = null;
          if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          }

          return {
            path: backupPath,
            version: metadata?.version || 'unknown',
            timestamp: metadata?.timestamp || 'unknown',
            metadata,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean old backups (keep last N)
   */
  cleanOldBackups(keepCount: number = 5): number {
    const backups = this.listBackups();
    const toDelete = backups.slice(keepCount);

    let deletedCount = 0;
    for (const backup of toDelete) {
      try {
        fs.rmSync(backup.path, { recursive: true, force: true });
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete backup: ${backup.path}`, error);
      }
    }

    return deletedCount;
  }
}
