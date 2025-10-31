import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { CodeGenerator } from '@galaos/core/src/code-generator';
import { HotReloadManager } from '@galaos/core/src/file-watcher';

// Singleton instances
let codeGenerator: CodeGenerator;
let hotReloadManager: HotReloadManager;

// Initialize managers
function getManagers() {
  if (!codeGenerator) {
    codeGenerator = new CodeGenerator();
  }
  if (!hotReloadManager) {
    hotReloadManager = new HotReloadManager();
  }
  return { codeGenerator, hotReloadManager };
}

/**
 * Self-Coding Router
 *
 * Enables GalaOS to modify its own codebase in real-time using AI.
 * Supports:
 * - Natural language code generation
 * - File watching and hot reload
 * - Preview before apply
 * - Automatic backups
 * - Rollback capability
 */
export const selfCodingRouter = router({
  /**
   * Generate code from natural language description
   */
  generateCode: protectedProcedure
    .input(
      z.object({
        description: z.string().min(10),
        targetFile: z.string().optional(),
        targetComponent: z.string().optional(),
        context: z
          .object({
            existingCode: z.string().optional(),
            relatedFiles: z.array(z.string()).optional(),
            projectStructure: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can generate code
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { codeGenerator } = getManagers();

      try {
        const result = await codeGenerator.generateCode({
          description: input.description,
          targetFile: input.targetFile,
          targetComponent: input.targetComponent,
          context: input.context,
        });

        // Log to database
        await ctx.prisma.auditLog.create({
          data: {
            type: 'code_generation',
            status: result.success ? 'completed' : 'failed',
            findings: {
              description: input.description,
              filesModified: result.files.length,
              summary: result.summary,
              reasoning: result.aiReasoning,
            },
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Code generation failed: ${error.message}`,
        });
      }
    }),

  /**
   * Preview code changes (show diff)
   */
  previewChanges: protectedProcedure
    .input(
      z.object({
        files: z.array(
          z.object({
            path: z.string(),
            action: z.enum(['create', 'modify', 'delete']),
            content: z.string().optional(),
          })
        ),
        summary: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { codeGenerator } = getManagers();

      const previews = await codeGenerator.previewChanges({
        success: true,
        files: input.files,
        summary: input.summary,
      });

      return previews;
    }),

  /**
   * Apply code changes
   */
  applyChanges: protectedProcedure
    .input(
      z.object({
        files: z.array(
          z.object({
            path: z.string(),
            action: z.enum(['create', 'modify', 'delete']),
            content: z.string().optional(),
            previousContent: z.string().optional(),
          })
        ),
        summary: z.string(),
        skipBackup: z.boolean().default(false),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { codeGenerator } = getManagers();

      try {
        const result = await codeGenerator.applyChanges(
          {
            success: true,
            files: input.files,
            summary: input.summary,
          },
          {
            skipBackup: input.skipBackup,
            dryRun: input.dryRun,
          }
        );

        // Log to database
        await ctx.prisma.auditLog.create({
          data: {
            type: 'code_application',
            status: result.success ? 'completed' : 'failed',
            findings: {
              filesApplied: result.applied,
              errors: result.errors,
              dryRun: input.dryRun,
            },
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to apply changes: ${error.message}`,
        });
      }
    }),

  /**
   * Generate and apply in one step
   */
  generateAndApply: protectedProcedure
    .input(
      z.object({
        description: z.string().min(10),
        targetFile: z.string().optional(),
        targetComponent: z.string().optional(),
        context: z
          .object({
            existingCode: z.string().optional(),
            relatedFiles: z.array(z.string()).optional(),
          })
          .optional(),
        skipBackup: z.boolean().default(false),
        autoReload: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { codeGenerator } = getManagers();

      try {
        // Generate code
        const generated = await codeGenerator.generateCode({
          description: input.description,
          targetFile: input.targetFile,
          targetComponent: input.targetComponent,
          context: input.context,
        });

        if (!generated.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Code generation failed',
          });
        }

        // Apply changes
        const applied = await codeGenerator.applyChanges(generated, {
          skipBackup: input.skipBackup,
        });

        // Log to database
        await ctx.prisma.auditLog.create({
          data: {
            type: 'code_generation_and_application',
            status: applied.success ? 'completed' : 'failed',
            findings: {
              description: input.description,
              filesGenerated: generated.files.length,
              filesApplied: applied.applied.length,
              summary: generated.summary,
              reasoning: generated.aiReasoning,
              errors: applied.errors,
            },
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        return {
          generated,
          applied,
          success: applied.success,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Operation failed: ${error.message}`,
        });
      }
    }),

  /**
   * List code backups
   */
  listBackups: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { codeGenerator } = getManagers();
    const backups = codeGenerator.listBackups();

    return backups;
  }),

  /**
   * Rollback to code backup
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

      const { codeGenerator } = getManagers();

      const success = await codeGenerator.rollbackToBackup(input.backupPath);

      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Rollback failed',
        });
      }

      // Log to database
      await ctx.prisma.auditLog.create({
        data: {
          type: 'code_rollback',
          status: 'completed',
          findings: {
            backupPath: input.backupPath,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Rollback completed successfully',
      };
    }),

  /**
   * Start file watcher (hot reload)
   */
  startWatcher: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { hotReloadManager } = getManagers();

    try {
      hotReloadManager.start();

      return {
        success: true,
        message: 'File watcher started',
        watchedPaths: hotReloadManager.getWatcher().getWatchedPaths(),
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to start watcher: ${error.message}`,
      });
    }
  }),

  /**
   * Stop file watcher
   */
  stopWatcher: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { hotReloadManager } = getManagers();

    try {
      await hotReloadManager.stop();

      return {
        success: true,
        message: 'File watcher stopped',
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to stop watcher: ${error.message}`,
      });
    }
  }),

  /**
   * Get watcher status
   */
  getWatcherStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { hotReloadManager } = getManagers();
    const watcher = hotReloadManager.getWatcher();

    return {
      running: !!watcher,
      watchedPaths: watcher ? watcher.getWatchedPaths() : [],
    };
  }),

  /**
   * Trigger manual rebuild
   */
  rebuild: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { hotReloadManager } = getManagers();
    const watcher = hotReloadManager.getWatcher();

    const result = await watcher.rebuildPackages();

    return result;
  }),

  /**
   * Restart backend services
   */
  restartBackend: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const { hotReloadManager } = getManagers();
    const watcher = hotReloadManager.getWatcher();

    const result = await watcher.restartBackend();

    return result;
  }),

  /**
   * Get code generation history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const history = await ctx.prisma.auditLog.findMany({
        where: {
          type: {
            in: ['code_generation', 'code_application', 'code_generation_and_application'],
          },
        },
        take: input.limit,
        orderBy: {
          startedAt: 'desc',
        },
      });

      return history;
    }),
});
