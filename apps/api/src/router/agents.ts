import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatar: z.string().optional(),
  provider: z.enum(['anthropic', 'openai', 'ollama', 'docker']),
  model: z.string(),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export const agentsRouter = router({
  // List all agents
  list: protectedProcedure
    .input(
      z.object({
        includePublic: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agents = await ctx.prisma.agent.findMany({
        where: {
          OR: [
            { userId: ctx.user.id },
            ...(input.includePublic ? [{ isPublic: true }] : []),
          ],
        },
        orderBy: [
          { level: 'desc' },
          { usageCount: 'desc' },
        ],
      });

      return agents;
    }),

  // Get single agent
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          OR: [
            { userId: ctx.user.id },
            { isPublic: true },
          ],
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return agent;
    }),

  // Create agent
  create: protectedProcedure
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.create({
        data: {
          ...input,
          userId: ctx.user.id,
          tools: input.tools || [],
          skills: input.skills || [],
        },
      });

      return agent;
    }),

  // Update agent
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: createAgentSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check ownership
      const existing = await ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const agent = await ctx.prisma.agent.update({
        where: { id: input.id },
        data: input.data,
      });

      return agent;
    }),

  // Delete agent
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await ctx.prisma.agent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Add XP to agent (gamification)
  addXP: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        xp: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const newXP = agent.xp + input.xp;
      const xpPerLevel = 1000;
      const newLevel = Math.floor(newXP / xpPerLevel) + 1;

      const updated = await ctx.prisma.agent.update({
        where: { id: input.id },
        data: {
          xp: newXP,
          level: newLevel,
        },
      });

      return {
        agent: updated,
        leveledUp: newLevel > agent.level,
        newLevel,
      };
    }),

  // Award badge
  awardBadge: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        badge: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const badges = [...agent.badges, input.badge];

      await ctx.prisma.agent.update({
        where: { id: input.id },
        data: { badges },
      });

      return { success: true, badges };
    }),

  // Increment usage
  incrementUsage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.agent.update({
        where: { id: input.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Get stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const agents = await ctx.prisma.agent.findMany({
      where: { userId: ctx.user.id },
    });

    return {
      total: agents.length,
      byProvider: agents.reduce((acc, agent) => {
        acc[agent.provider] = (acc[agent.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalXP: agents.reduce((sum, agent) => sum + agent.xp, 0),
      maxLevel: Math.max(...agents.map((a) => a.level), 0),
      totalUsage: agents.reduce((sum, agent) => sum + agent.usageCount, 0),
    };
  }),
});
