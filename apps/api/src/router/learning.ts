import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { processObservation } from '../services/learning';

export const learningRouter = router({
  record: protectedProcedure
    .input(z.object({
      type: z.string(),
      source: z.string(),
      inputText: z.string().optional(),
      outputText: z.string().optional(),
      metadata: z.any().optional(),
      process: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.prisma.observation.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          source: input.source,
          inputText: input.inputText || null,
          outputText: input.outputText || null,
          metadata: input.metadata,
          status: input.process ? 'pending' : 'pending',
        },
      });
      if (input.process) await processObservation(created.id);
      return created;
    }),

  list: protectedProcedure
    .input(z.object({ status: z.enum(['pending','processed','error']).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.observation.findMany({
        where: { userId: ctx.user.id, ...(input?.status ? { status: input.status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }),
});

