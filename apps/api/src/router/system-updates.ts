import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { VersionManager } from '@galaos/core/src/version-manager';
import { DockerUpdateManager } from '@galaos/core/src/docker-update-manager';
import { UpdateScheduler } from '@galaos/core/src/update-scheduler';

// Singleton instances
let versionManager: VersionManager;
let dockerManager: DockerUpdateManager;
let updateScheduler: UpdateScheduler;

// Initialize managers
async function getManagers() {
  if (!versionManager) {
    versionManager = new VersionManager();
  }
  if (!dockerManager) {
    dockerManager = new DockerUpdateManager();
  }
  if (!updateScheduler) {
    updateScheduler = new UpdateScheduler();
    await updateScheduler.initialize();
  }
  return { versionManager, dockerManager, updateScheduler };
}

/**
 * System Updates Router
 *
 * Manages self-updates for GalaOS:
 * - Version management
 * - Code updates (Git + dependencies)
 * - Docker container updates
 * - Automatic update scheduling
 * - Rollback capabilities
 */
export const systemUpdatesRouter = router({
  /**
   * Get current version
   */
  getCurrentVersion: publicProcedure.query(async () => {
    const { versionManager } = await getManagers();
    const version = versionManager.getCurrentVersion();
    return {
      version: versionManager.versionToString(version),
      ...version,
    };
  }),

  /**
   * Check for available updates
   */
  checkForUpdates: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can check for updates
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    const { versionManager, dockerManager } = await getManagers();

    const [codeUpdates, dockerUpdates] = await Promise.all([
      versionManager.checkForUpdates(),
      dockerManager.checkForImageUpdates(),
    ]);

    return {
      code: codeUpdates,
      docker: dockerUpdates,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Perform health check
   */
  healthCheck: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { versionManager } = await getManagers();
    const health = await versionManager.performHealthCheck();

    return health;
  }),

  /**
   * Apply code update
   */
  applyCodeUpdate: protectedProcedure
    .input(
      z.object({
        branch: z.string().optional(),
        skipBackup: z.boolean().default(false),
        skipMigrations: z.boolean().default(false),
        skipBuild: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { versionManager } = await getManagers();

      try {
        const result = await versionManager.update({
          branch: input.branch,
          skipBackup: input.skipBackup,
          skipMigrations: input.skipMigrations,
          skipBuild: input.skipBuild,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Update failed: ${error.message}`,
        });
      }
    }),

  /**
   * Apply Docker updates
   */
  applyDockerUpdate: protectedProcedure
    .input(
      z.object({
        containers: z.array(z.string()).optional(),
        composeFile: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { dockerManager } = await getManagers();

      try {
        let result;

        if (input.composeFile) {
          result = await dockerManager.updateComposeStack(input.composeFile);
        } else if (input.containers && input.containers.length > 0) {
          result = await dockerManager.updateContainers(input.containers);
        } else {
          // Update all GalaOS containers
          const containers = await dockerManager.getGalaOSContainers();
          const containerNames = containers.map((c) => c.Names[0].replace(/^\//, ''));
          result = await dockerManager.updateContainers(containerNames);
        }

        // Prune old images after successful update
        if (result.success) {
          await dockerManager.pruneImages();
        }

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Docker update failed: ${error.message}`,
        });
      }
    }),

  /**
   * Apply full update (code + Docker)
   */
  applyFullUpdate: protectedProcedure
    .input(
      z.object({
        codeOptions: z
          .object({
            branch: z.string().optional(),
            skipBackup: z.boolean().default(false),
            skipMigrations: z.boolean().default(false),
            skipBuild: z.boolean().default(false),
          })
          .optional(),
        dockerOptions: z
          .object({
            containers: z.array(z.string()).optional(),
            composeFile: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { updateScheduler } = await getManagers();

      try {
        const result = await updateScheduler.applyFullUpdate('manual', {
          code: input.codeOptions || {},
          docker: input.dockerOptions || {},
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Full update failed: ${error.message}`,
        });
      }
    }),

  /**
   * List backups
   */
  listBackups: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { versionManager } = await getManagers();
    const backups = versionManager.listBackups();

    return backups;
  }),

  /**
   * Rollback to backup
   */
  rollback: protectedProcedure
    .input(
      z.object({
        backupPath: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { versionManager } = await getManagers();

      try {
        const success = await versionManager.rollback(input.backupPath);

        if (!success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Rollback failed',
          });
        }

        return {
          success: true,
          message: 'Rollback completed successfully',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Rollback failed: ${error.message}`,
        });
      }
    }),

  /**
   * Clean old backups
   */
  cleanBackups: protectedProcedure
    .input(
      z.object({
        keepCount: z.number().int().min(1).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { versionManager } = await getManagers();
      const deletedCount = versionManager.cleanOldBackups(input.keepCount);

      return {
        deletedCount,
        message: `Deleted ${deletedCount} old backup(s)`,
      };
    }),

  /**
   * Get Docker containers
   */
  listContainers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { dockerManager } = await getManagers();
    const containers = await dockerManager.getGalaOSContainers();

    return containers.map((c) => ({
      id: c.Id,
      name: c.Names[0].replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: new Date(c.Created * 1000),
    }));
  }),

  /**
   * Restart GalaOS containers
   */
  restartContainers: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { dockerManager } = await getManagers();
    const result = await dockerManager.restartGalaOSContainers();

    return result;
  }),

  /**
   * Get Docker system info
   */
  getDockerInfo: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { dockerManager } = await getManagers();
    const info = await dockerManager.getSystemInfo();

    return info;
  }),

  /**
   * Prune Docker images
   */
  pruneImages: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { dockerManager } = await getManagers();
    const result = await dockerManager.pruneImages();

    return {
      ...result,
      message: `Reclaimed ${result.spaceReclaimed} MB`,
    };
  }),

  /**
   * Create update schedule
   */
  createSchedule: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().default(true),
        schedule: z.string(), // Cron pattern
        updateType: z.enum(['code', 'docker', 'both']),
        autoApply: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { updateScheduler } = await getManagers();

      const schedule = await updateScheduler.createSchedule(input);

      return schedule;
    }),

  /**
   * Remove update schedule
   */
  removeSchedule: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { updateScheduler } = await getManagers();
      const success = await updateScheduler.removeSchedule(input.scheduleId);

      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove schedule',
        });
      }

      return {
        success: true,
        message: 'Schedule removed',
      };
    }),

  /**
   * List update schedules
   */
  listSchedules: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { updateScheduler } = await getManagers();
    const schedules = await updateScheduler.listSchedules();

    return schedules;
  }),

  /**
   * Trigger manual update
   */
  triggerUpdate: protectedProcedure
    .input(
      z.object({
        updateType: z.enum(['code', 'docker', 'both']),
        options: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { updateScheduler } = await getManagers();
      const result = await updateScheduler.triggerManualUpdate(
        input.updateType,
        input.options || {}
      );

      return result;
    }),

  /**
   * Get update history (from audit logs)
   */
  getUpdateHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updates = await ctx.prisma.auditLog.findMany({
        where: {
          type: {
            startsWith: 'system_update_',
          },
        },
        take: input.limit,
        orderBy: {
          startedAt: 'desc',
        },
      });

      return updates;
    }),
});
