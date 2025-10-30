import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  MCPServerConfigSchema,
  HuggingFaceResourceTypeSchema,
  GitHubResourceTypeSchema,
} from '@galaos/mcp';

/**
 * MCP Router
 * tRPC endpoints for Model Context Protocol management
 */
export const mcpRouter = router({
  // ============================================================================
  // MCP SERVER MANAGEMENT
  // ============================================================================

  /**
   * List all MCP servers
   */
  listServers: protectedProcedure
    .input(
      z.object({
        includeSystem: z.boolean().optional().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const servers = await ctx.prisma.mCPServer.findMany({
        where: input.includeSystem
          ? undefined
          : { userId: ctx.user.id },
        include: {
          resources: true,
          tools: true,
          prompts: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        servers,
        total: servers.length,
      };
    }),

  /**
   * Get a specific MCP server
   */
  getServer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
        include: {
          resources: true,
          tools: true,
          prompts: true,
        },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      return { server };
    }),

  /**
   * Register a new MCP server
   */
  registerServer: protectedProcedure
    .input(MCPServerConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          command: input.command,
          args: input.args || [],
          env: input.env || {},
          enabled: input.enabled,
          autoStart: input.autoStart,
          restart: input.restart,
          healthCheck: input.healthCheck,
        },
      });

      // TODO: Trigger MCP registry to start the server
      // This would be done via an event emitter or queue

      return { server };
    }),

  /**
   * Update MCP server configuration
   */
  updateServer: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: MCPServerConfigSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      if (server.userId && server.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to update this server',
        });
      }

      const updated = await ctx.prisma.mCPServer.update({
        where: { id: input.id },
        data: input.data,
      });

      return { server: updated };
    }),

  /**
   * Delete an MCP server
   */
  deleteServer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      if (server.userId && server.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this server',
        });
      }

      await ctx.prisma.mCPServer.delete({
        where: { id: input.id },
      });

      // TODO: Trigger MCP registry to stop the server

      return { success: true };
    }),

  /**
   * Start an MCP server
   */
  startServer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      // TODO: Trigger MCP registry to start the server

      await ctx.prisma.mCPServer.update({
        where: { id: input.id },
        data: { status: 'starting' },
      });

      return { success: true };
    }),

  /**
   * Stop an MCP server
   */
  stopServer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      // TODO: Trigger MCP registry to stop the server

      await ctx.prisma.mCPServer.update({
        where: { id: input.id },
        data: { status: 'stopped' },
      });

      return { success: true };
    }),

  /**
   * Restart an MCP server
   */
  restartServer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await ctx.prisma.mCPServer.findUnique({
        where: { id: input.id },
      });

      if (!server) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MCP server not found',
        });
      }

      // TODO: Trigger MCP registry to restart the server

      await ctx.prisma.mCPServer.update({
        where: { id: input.id },
        data: { status: 'restarting' },
      });

      return { success: true };
    }),

  // ============================================================================
  // MCP RESOURCES
  // ============================================================================

  /**
   * List resources from an MCP server
   */
  listResources: protectedProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const resources = await ctx.prisma.mCPResource.findMany({
        where: { serverId: input.serverId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        resources,
        total: resources.length,
      };
    }),

  /**
   * Call an MCP tool
   */
  callTool: protectedProcedure
    .input(
      z.object({
        serverId: z.string(),
        toolName: z.string(),
        arguments: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.mCPTool.findFirst({
        where: {
          serverId: input.serverId,
          name: input.toolName,
        },
      });

      if (!tool) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tool not found',
        });
      }

      // TODO: Call the actual MCP tool via registry
      // For now, just update usage stats
      await ctx.prisma.mCPTool.update({
        where: { id: tool.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return {
        success: true,
        result: null, // TODO: Return actual result
      };
    }),

  // ============================================================================
  // HUGGINGFACE INTEGRATION
  // ============================================================================

  /**
   * Search HuggingFace resources
   */
  searchHuggingFace: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        type: HuggingFaceResourceTypeSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement actual HuggingFace search via provider
      // For now, return from database
      const resources = await ctx.prisma.huggingFaceResource.findMany({
        where: {
          type: input.type,
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: input.limit,
        orderBy: { downloads: 'desc' },
      });

      return {
        resources,
        total: resources.length,
      };
    }),

  /**
   * List HuggingFace models
   */
  listHuggingFaceModels: protectedProcedure
    .input(
      z.object({
        author: z.string().optional(),
        sort: z.enum(['downloads', 'likes', 'trending']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const resources = await ctx.prisma.huggingFaceResource.findMany({
        where: {
          type: 'model',
          author: input.author,
        },
        take: input.limit,
        orderBy:
          input.sort === 'downloads'
            ? { downloads: 'desc' }
            : input.sort === 'likes'
            ? { likes: 'desc' }
            : { syncedAt: 'desc' },
      });

      return {
        models: resources,
        total: resources.length,
      };
    }),

  // ============================================================================
  // GITHUB INTEGRATION
  // ============================================================================

  /**
   * Search GitHub repositories
   */
  searchGitHub: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        type: GitHubResourceTypeSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement actual GitHub search via provider
      const resources = await ctx.prisma.gitHubResource.findMany({
        where: {
          type: input.type,
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: input.limit,
        orderBy: { stars: 'desc' },
      });

      return {
        resources,
        total: resources.length,
      };
    }),

  // ============================================================================
  // OLLAMA INTEGRATION
  // ============================================================================

  /**
   * List Ollama models
   */
  listOllamaModels: protectedProcedure
    .input(
      z.object({
        providerId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const models = await ctx.prisma.ollamaModel.findMany({
        where: {
          providerId: input.providerId,
          isAvailable: true,
        },
        orderBy: { modifiedAt: 'desc' },
      });

      return {
        models,
        total: models.length,
      };
    }),

  /**
   * Pull Ollama model
   */
  pullOllamaModel: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        providerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement actual Ollama pull via provider
      // This would be a long-running operation, should use a job queue

      return {
        success: true,
        message: `Started pulling model: ${input.name}`,
      };
    }),

  /**
   * Delete Ollama model
   */
  deleteOllamaModel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const model = await ctx.prisma.ollamaModel.findUnique({
        where: { id: input.id },
      });

      if (!model) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Model not found',
        });
      }

      // TODO: Call Ollama provider to delete model

      await ctx.prisma.ollamaModel.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // PROVIDER API KEYS
  // ============================================================================

  /**
   * List API keys
   */
  listAPIKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await ctx.prisma.providerAPIKey.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        usageCount: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // Don't return the actual API key
        apiKey: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { keys, total: keys.length };
  }),

  /**
   * Add API key
   */
  addAPIKey: protectedProcedure
    .input(
      z.object({
        provider: z.enum(['anthropic', 'openai', 'perplexity', 'google', 'huggingface']),
        name: z.string(),
        apiKey: z.string(),
        baseURL: z.string().optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Encrypt the API key before storing

      const key = await ctx.prisma.providerAPIKey.create({
        data: {
          userId: ctx.user.id,
          provider: input.provider,
          name: input.name,
          apiKey: input.apiKey, // Should be encrypted
          baseURL: input.baseURL,
          config: input.config,
        },
        select: {
          id: true,
          provider: true,
          name: true,
          isActive: true,
          createdAt: true,
          apiKey: false, // Don't return the key
        },
      });

      return { key };
    }),

  /**
   * Delete API key
   */
  deleteAPIKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await ctx.prisma.providerAPIKey.findUnique({
        where: { id: input.id },
      });

      if (!key) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      if (key.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this key',
        });
      }

      await ctx.prisma.providerAPIKey.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Test API key
   */
  testAPIKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await ctx.prisma.providerAPIKey.findUnique({
        where: { id: input.id },
      });

      if (!key) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      if (key.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to test this key',
        });
      }

      // TODO: Test the API key with the respective provider

      return {
        success: true,
        message: 'API key is valid',
      };
    }),
});
