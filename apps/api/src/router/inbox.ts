import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const inboxRouter = router({
  // Submit a task to the universal inbox
  submit: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        files: z.array(z.object({
          name: z.string(),
          url: z.string(),
          type: z.string(),
          size: z.number(),
        })).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create a conversation for this inbox task
      const conversation = await ctx.prisma.conversation.create({
        data: {
          userId: ctx.user.id,
          title: input.message.substring(0, 100),
        },
      });

      // Store the initial message
      await ctx.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: input.message,
          metadata: {
            files: input.files,
            ...input.metadata,
          },
        },
      });

      return {
        conversationId: conversation.id,
        status: 'received',
        message: 'Task received and processing',
      };
    }),

  // Get inbox items (conversations that are tasks)
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversations = await ctx.prisma.conversation.findMany({
        where: {
          userId: ctx.user.id,
        },
        take: input.limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          messages: {
            take: 2,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      return conversations;
    }),

  // Get a specific inbox item
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.conversation.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Inbox item not found' });
      }

      return conversation;
    }),

  // Update inbox item status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Store status in message metadata
      await ctx.prisma.message.create({
        data: {
          conversationId: input.id,
          role: 'system',
          content: `Status updated to: ${input.status}`,
          metadata: {
            statusUpdate: true,
            status: input.status,
          },
        },
      });

      return { success: true, status: input.status };
    }),

  // Delete inbox item
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.conversation.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),
});
