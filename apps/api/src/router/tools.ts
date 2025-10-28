import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  category: z.enum(['code', 'data', 'api', 'file', 'web', 'ai', 'system', 'other']),
  icon: z.string().optional(),
  functionName: z.string().min(1),
  parameters: z.record(z.any()),
  code: z.string().min(1),
  tier: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
  unlockLevel: z.number().int().min(1).default(1),
});

export const toolsRouter = router({
  // List all tools (user's + system)
  list: protectedProcedure.query(async ({ ctx }) => {
    const tools = await ctx.prisma.tool.findMany({
      where: {
        OR: [{ userId: ctx.user.id }, { userId: null }], // User's tools + system tools
      },
      orderBy: [{ tier: 'desc' }, { createdAt: 'desc' }],
    });

    return tools;
  }),

  // Get single tool
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tool = await ctx.prisma.tool.findFirst({
        where: {
          id: input.id,
          OR: [{ userId: ctx.user.id }, { userId: null }],
        },
      });

      if (!tool) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return tool;
    }),

  // Create tool
  create: protectedProcedure
    .input(createToolSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if function name is unique
      const existing = await ctx.prisma.tool.findUnique({
        where: { functionName: input.functionName },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A tool with this function name already exists',
        });
      }

      const tool = await ctx.prisma.tool.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
      });

      return tool;
    }),

  // Update tool
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: createToolSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.tool.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Can only update own tools
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Check function name uniqueness if changing
      if (input.data.functionName && input.data.functionName !== existing.functionName) {
        const duplicate = await ctx.prisma.tool.findUnique({
          where: { functionName: input.data.functionName },
        });

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A tool with this function name already exists',
          });
        }
      }

      const tool = await ctx.prisma.tool.update({
        where: { id: input.id },
        data: input.data,
      });

      return tool;
    }),

  // Delete tool
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.tool.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Can only delete own tools
        },
      });

      if (!tool) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await ctx.prisma.tool.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Toggle tool active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.tool.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!tool) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const updated = await ctx.prisma.tool.update({
        where: { id: input.id },
        data: { isActive: !tool.isActive },
      });

      return updated;
    }),

  // Get tools statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const tools = await ctx.prisma.tool.findMany({
      where: { userId: ctx.user.id },
    });

    const byCategory = tools.reduce((acc: Record<string, number>, tool: any) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTier = tools.reduce((acc: Record<string, number>, tool: any) => {
      acc[tool.tier] = (acc[tool.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: tools.length,
      active: tools.filter((t: any) => t.isActive).length,
      byCategory,
      byTier,
    };
  }),

  // Get tools by category
  byCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      const tools = await ctx.prisma.tool.findMany({
        where: {
          category: input.category,
          OR: [{ userId: ctx.user.id }, { userId: null }],
        },
        orderBy: { tier: 'desc' },
      });

      return tools;
    }),

  // Get tools by tier
  byTier: protectedProcedure
    .input(z.object({ tier: z.enum(['common', 'rare', 'epic', 'legendary']) }))
    .query(async ({ ctx, input }) => {
      const tools = await ctx.prisma.tool.findMany({
        where: {
          tier: input.tier,
          OR: [{ userId: ctx.user.id }, { userId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });

      return tools;
    }),
});
