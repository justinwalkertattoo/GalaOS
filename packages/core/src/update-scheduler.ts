import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { VersionManager, UpdateResult } from './version-manager';
import { DockerUpdateManager } from './docker-update-manager';
import { PrismaClient } from '@galaos/db';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export interface UpdateSchedule {
  id: string;
  enabled: boolean;
  schedule: string; // Cron pattern
  updateType: 'code' | 'docker' | 'both';
  autoApply: boolean; // If false, only check and notify
  notificationChannels?: string[]; // email, slack, etc.
  maintenanceWindow?: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
}

export interface UpdateNotification {
  type: 'update_available' | 'update_started' | 'update_completed' | 'update_failed';
  timestamp: Date;
  updateInfo?: any;
  result?: UpdateResult;
  error?: string;
}

/**
 * Update Scheduler
 *
 * Manages automatic updates for GalaOS:
 * - Scheduled update checks
 * - Automatic updates during maintenance windows
 * - Update notifications
 * - Safe update orchestration
 */
export class UpdateScheduler {
  private versionManager: VersionManager;
  private dockerManager: DockerUpdateManager;
  private updateQueue: Queue;
  private prisma: PrismaClient;
  private worker?: Worker;

  constructor() {
    this.versionManager = new VersionManager();
    this.dockerManager = new DockerUpdateManager();
    this.updateQueue = new Queue('system-updates', { connection });
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize the scheduler
   */
  async initialize(): Promise<void> {
    // Create worker to process update jobs
    this.worker = new Worker(
      'system-updates',
      async (job) => {
        console.log(`Processing update job: ${job.name}`, job.data);

        switch (job.name) {
          case 'check-updates':
            return await this.checkForUpdates(job.data.scheduleId);

          case 'apply-code-update':
            return await this.applyCodeUpdate(job.data.scheduleId, job.data.options);

          case 'apply-docker-update':
            return await this.applyDockerUpdate(job.data.scheduleId, job.data.options);

          case 'apply-full-update':
            return await this.applyFullUpdate(job.data.scheduleId, job.data.options);

          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      },
      {
        connection,
        concurrency: 1, // Only one update at a time
      }
    );

    // Handle worker events
    this.worker.on('completed', (job) => {
      console.log(`Update job completed: ${job.name}`, job.returnvalue);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Update job failed: ${job?.name}`, err);
    });

    // Schedule default update checks
    await this.scheduleDefaultUpdates();

    console.log('Update scheduler initialized');
  }

  /**
   * Schedule default update patterns
   */
  async scheduleDefaultUpdates(): Promise<void> {
    // Check for updates daily at 2 AM
    await this.updateQueue.add(
      'check-updates',
      { scheduleId: 'default-check' },
      {
        repeat: {
          pattern: '0 2 * * *', // Daily at 2 AM
        },
        jobId: 'daily-update-check',
      }
    );

    // Weekly Docker image updates on Sunday at 3 AM
    await this.updateQueue.add(
      'apply-docker-update',
      {
        scheduleId: 'default-docker',
        options: { autoApply: true },
      },
      {
        repeat: {
          pattern: '0 3 * * 0', // Weekly on Sunday at 3 AM
        },
        jobId: 'weekly-docker-update',
      }
    );

    console.log('Default update schedules created');
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(scheduleId: string): Promise<{
    code: any;
    docker: any;
  }> {
    console.log(`Checking for updates (schedule: ${scheduleId})...`);

    // Check for code updates
    const codeUpdates = await this.versionManager.checkForUpdates();

    // Check for Docker image updates
    const dockerUpdates = await this.dockerManager.checkForImageUpdates();

    // Notify if updates available
    if (codeUpdates.available || dockerUpdates.some((u) => u.updateAvailable)) {
      await this.sendNotification({
        type: 'update_available',
        timestamp: new Date(),
        updateInfo: {
          code: codeUpdates,
          docker: dockerUpdates.filter((u) => u.updateAvailable),
        },
      });
    }

    return {
      code: codeUpdates,
      docker: dockerUpdates,
    };
  }

  /**
   * Apply code update (Git pull + dependencies + migrations)
   */
  async applyCodeUpdate(
    scheduleId: string,
    options: {
      branch?: string;
      skipBackup?: boolean;
      skipMigrations?: boolean;
    } = {}
  ): Promise<UpdateResult> {
    console.log(`Applying code update (schedule: ${scheduleId})...`);

    await this.sendNotification({
      type: 'update_started',
      timestamp: new Date(),
    });

    try {
      const result = await this.versionManager.update(options);

      if (result.success) {
        await this.sendNotification({
          type: 'update_completed',
          timestamp: new Date(),
          result,
        });

        // Clean old backups
        this.versionManager.cleanOldBackups(5);
      } else {
        await this.sendNotification({
          type: 'update_failed',
          timestamp: new Date(),
          error: result.errors?.join(', '),
        });
      }

      // Log to database
      await this.logUpdate('code', result);

      return result;
    } catch (error: any) {
      await this.sendNotification({
        type: 'update_failed',
        timestamp: new Date(),
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Apply Docker updates
   */
  async applyDockerUpdate(
    scheduleId: string,
    options: {
      containers?: string[];
      composeFile?: string;
    } = {}
  ): Promise<any> {
    console.log(`Applying Docker update (schedule: ${scheduleId})...`);

    await this.sendNotification({
      type: 'update_started',
      timestamp: new Date(),
    });

    try {
      let result;

      if (options.composeFile) {
        // Update entire stack
        result = await this.dockerManager.updateComposeStack(options.composeFile);
      } else if (options.containers && options.containers.length > 0) {
        // Update specific containers
        result = await this.dockerManager.updateContainers(options.containers);
      } else {
        // Update all GalaOS containers
        const containers = await this.dockerManager.getGalaOSContainers();
        const containerNames = containers.map((c) => c.Names[0].replace(/^\//, ''));
        result = await this.dockerManager.updateContainers(containerNames);
      }

      if (result.success) {
        await this.sendNotification({
          type: 'update_completed',
          timestamp: new Date(),
          result,
        });

        // Prune old images
        await this.dockerManager.pruneImages();
      } else {
        await this.sendNotification({
          type: 'update_failed',
          timestamp: new Date(),
          error: result.errors?.join(', '),
        });
      }

      // Log to database
      await this.logUpdate('docker', result);

      return result;
    } catch (error: any) {
      await this.sendNotification({
        type: 'update_failed',
        timestamp: new Date(),
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Apply full update (code + Docker)
   */
  async applyFullUpdate(
    scheduleId: string,
    options: any = {}
  ): Promise<{
    code: UpdateResult;
    docker: any;
  }> {
    console.log(`Applying full update (schedule: ${scheduleId})...`);

    // First update code
    const codeResult = await this.applyCodeUpdate(scheduleId, options.code || {});

    // Then update Docker containers
    const dockerResult = await this.applyDockerUpdate(scheduleId, options.docker || {});

    return {
      code: codeResult,
      docker: dockerResult,
    };
  }

  /**
   * Send update notification
   */
  async sendNotification(notification: UpdateNotification): Promise<void> {
    console.log('Update notification:', notification);

    // TODO: Implement actual notification channels (email, Slack, etc.)
    // For now, just log to database

    try {
      // You could create a Notification model in Prisma
      // await this.prisma.notification.create({
      //   data: {
      //     type: notification.type,
      //     content: JSON.stringify(notification),
      //     createdAt: notification.timestamp,
      //   },
      // });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Log update to database
   */
  async logUpdate(type: 'code' | 'docker' | 'both', result: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          type: `system_update_${type}`,
          status: result.success ? 'completed' : 'failed',
          findings: result,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log update:', error);
    }
  }

  /**
   * Create custom update schedule
   */
  async createSchedule(schedule: Omit<UpdateSchedule, 'id'>): Promise<UpdateSchedule> {
    const id = `custom-${Date.now()}`;

    const fullSchedule: UpdateSchedule = {
      id,
      ...schedule,
    };

    // Add to queue
    let jobName: string;
    switch (schedule.updateType) {
      case 'code':
        jobName = 'apply-code-update';
        break;
      case 'docker':
        jobName = 'apply-docker-update';
        break;
      case 'both':
        jobName = 'apply-full-update';
        break;
    }

    await this.updateQueue.add(
      jobName,
      {
        scheduleId: id,
        options: { autoApply: schedule.autoApply },
      },
      {
        repeat: {
          pattern: schedule.schedule,
        },
        jobId: id,
      }
    );

    // TODO: Store schedule in database

    return fullSchedule;
  }

  /**
   * Remove schedule
   */
  async removeSchedule(scheduleId: string): Promise<boolean> {
    try {
      await this.updateQueue.removeRepeatableByKey(scheduleId);
      // TODO: Remove from database
      return true;
    } catch (error) {
      console.error('Failed to remove schedule:', error);
      return false;
    }
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<any[]> {
    const repeatableJobs = await this.updateQueue.getRepeatableJobs();
    return repeatableJobs;
  }

  /**
   * Trigger manual update
   */
  async triggerManualUpdate(
    updateType: 'code' | 'docker' | 'both',
    options: any = {}
  ): Promise<any> {
    let jobName: string;
    switch (updateType) {
      case 'code':
        jobName = 'apply-code-update';
        break;
      case 'docker':
        jobName = 'apply-docker-update';
        break;
      case 'both':
        jobName = 'apply-full-update';
        break;
    }

    const job = await this.updateQueue.add(jobName, {
      scheduleId: 'manual',
      options,
    });

    return {
      jobId: job.id,
      message: 'Update job queued',
    };
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.prisma.$disconnect();
    await connection.quit();
  }
}
