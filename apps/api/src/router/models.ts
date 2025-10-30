import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { OllamaProvider, DockerModelProvider } from '@galaos/ai/src/providers';
import { decide } from '../services/policy';
import { writeAudit } from '../services/audit-log';

const createModelProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['cloud', 'ollama', 'docker']),
  provider: z.enum(['anthropic', 'openai', 'ollama', 'docker']),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  containerName: z.string().optional(),
  config: z.record(z.any()).optional(),
});

export const modelsRouter = router({
  // List all model providers
  list: protectedProcedure.query(async ({ ctx }) => {
    const providers = await ctx.prisma.modelProvider.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return providers;
  }),

  // Get single model provider
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.prisma.modelProvider.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return provider;
    }),

  // Create model provider
  create: protectedProcedure
    .input(createModelProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const decision = decide(ctx, 'files.write', 'models.provider');
      writeAudit(ctx, { action: 'models.create', input, decision });
      if (!decision.allow) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
      const provider = await ctx.prisma.modelProvider.create({
        data: {
          ...input,
          userId: ctx.user.id,
          status: 'unknown',
          models: input.config?.models || [],
          config: input.config || {},
        },
      });

      return provider;
    }),

  // Update model provider
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: createModelProviderSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.modelProvider.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const provider = await ctx.prisma.modelProvider.update({
        where: { id: input.id },
        data: input.data,
      });

      return provider;
    }),

  // Delete model provider
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.prisma.modelProvider.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await ctx.prisma.modelProvider.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Test Ollama connection
  testOllama: protectedProcedure
    .input(
      z.object({
        baseUrl: z.string().default('http://localhost:11434'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const ollama = new OllamaProvider(input.baseUrl);
        const isHealthy = await ollama.healthCheck();

        if (!isHealthy) {
          return {
            success: false,
            message: 'Ollama is not responding. Make sure it is running.',
          };
        }

        const models = await ollama.listModels();

        return {
          success: true,
          message: `Connected to Ollama. Found ${models.length} models.`,
          models,
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to connect to Ollama: ${error.message}`,
        };
      }
    }),

  // List Ollama models
  listOllamaModels: protectedProcedure
    .input(
      z.object({
        baseUrl: z.string().default('http://localhost:11434'),
      })
    )
    .query(async ({ input }) => {
      try {
        const ollama = new OllamaProvider(input.baseUrl);
        const models = await ollama.listModels();
        return models;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to list Ollama models: ${error.message}`,
        });
      }
    }),

  // Pull Ollama model
  pullOllamaModel: protectedProcedure
    .input(
      z.object({
        baseUrl: z.string().default('http://localhost:11434'),
        modelName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const decision = decide(ctx, 'packages.install', `ollama:${input.modelName}`);
        writeAudit(ctx, { action: 'models.ollama.pull', input, decision });
        if (!decision.allow) return { success: false, message: decision.reason || 'Denied' };
        const ollama = new OllamaProvider(input.baseUrl);
        await ollama.pullModel(input.modelName);

        return {
          success: true,
          message: `Successfully pulled model ${input.modelName}`,
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to pull model: ${error.message}`,
        };
      }
    }),

  // Test Docker model connection
  testDockerModel: protectedProcedure
    .input(
      z.object({
        containerName: z.string(),
        baseUrl: z.string().default('http://localhost:8000'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const dockerModel = new DockerModelProvider(input.containerName, input.baseUrl);
        const isHealthy = await dockerModel.healthCheck();

        if (!isHealthy) {
          return {
            success: false,
            message: `Docker container "${input.containerName}" is not responding.`,
          };
        }

        return {
          success: true,
          message: `Successfully connected to Docker model in container "${input.containerName}".`,
          info: dockerModel.getContainerInfo(),
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to connect to Docker model: ${error.message}`,
        };
      }
    }),

  // Get model provider statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const providers = await ctx.prisma.modelProvider.findMany({
      where: { userId: ctx.user.id },
    });

    const byType = providers.reduce((acc: Record<string, number>, provider: any) => {
      acc[provider.type] = (acc[provider.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byProvider = providers.reduce((acc: Record<string, number>, provider: any) => {
      acc[provider.provider] = (acc[provider.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: providers.length,
      byType,
      byProvider,
      activeProviders: providers.filter((p: any) => p.status === 'active').length,
    };
  }),
});
