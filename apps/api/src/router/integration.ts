import { router, protectedProcedure } from '../trpc';
import { createIntegrationSchema } from '@galaos/types';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const integrationRouter = router({
  create: protectedProcedure.input(createIntegrationSchema).mutation(async ({ ctx, input }) => {
    // TODO: Implement OAuth flow and token encryption
    const integration = await ctx.prisma.integration.create({
      data: {
        userId: ctx.user.id,
        provider: input.provider,
        accountName: input.accountName,
        accessToken: 'encrypted-token', // TODO: Encrypt
        refreshToken: 'encrypted-refresh-token', // TODO: Encrypt
      },
    });

    return integration;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.prisma.integration.findMany({
      where: {
        userId: ctx.user.id,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        accountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't return tokens
      },
    });

    return integrations;
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const integration = await ctx.prisma.integration.findFirst({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
      select: {
        id: true,
        provider: true,
        accountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration not found' });
    }

    return integration;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const integration = await ctx.prisma.integration.delete({
      where: {
        id: input.id,
      },
    });

    return integration;
  }),

  // Get available integration providers
  getProviders: protectedProcedure.query(async () => {
    // TODO: Load from configuration
    return [
      { id: 'google', name: 'Google', icon: '🔍' },
      { id: 'gmail', name: 'Gmail', icon: '📧' },
      { id: 'slack', name: 'Slack', icon: '💬' },
      { id: 'github', name: 'GitHub', icon: '🐙' },
      { id: 'notion', name: 'Notion', icon: '📝' },
      { id: 'discord', name: 'Discord', icon: '🎮' },
    ];
  }),
});
