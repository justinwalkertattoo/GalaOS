import { router, protectedProcedure } from '../trpc';
import { createWorkflowSchema, updateWorkflowSchema } from '@galaos/types';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const workflowRouter = router({
  create: protectedProcedure.input(createWorkflowSchema).mutation(async ({ ctx, input }) => {
    const workflow = await ctx.prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        definition: input.definition,
        trigger: input.trigger,
        workspaceId: input.workspaceId,
        authorId: ctx.user.id,
      },
    });

    return workflow;
  }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const workflows = await ctx.prisma.workflow.findMany({
        where: {
          authorId: ctx.user.id,
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return workflows;
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const workflow = await ctx.prisma.workflow.findFirst({
      where: {
        id: input.id,
        authorId: ctx.user.id,
      },
      include: {
        executions: {
          take: 10,
          orderBy: {
            startedAt: 'desc',
          },
        },
      },
    });

    if (!workflow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
    }

    return workflow;
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateWorkflowSchema }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.update({
        where: { id: input.id },
        data: input.data,
      });

      return workflow;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const workflow = await ctx.prisma.workflow.delete({
      where: { id: input.id },
    });

    return workflow;
  }),

  execute: protectedProcedure
    .input(z.object({ id: z.string(), input: z.any().optional() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findFirst({
        where: {
          id: input.id,
          authorId: ctx.user.id,
        },
      });

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
      }

      // Create execution record
      const execution = await ctx.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          status: 'pending',
          input: input.input,
        },
      });

      // TODO: Implement actual workflow execution engine
      // For now, just return the execution record
      return execution;
    }),

  getExecutions: protectedProcedure
    .input(z.object({ workflowId: z.string(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const executions = await ctx.prisma.workflowExecution.findMany({
        where: {
          workflowId: input.workflowId,
        },
        take: input.limit,
        orderBy: {
          startedAt: 'desc',
        },
      });

      return executions;
    }),
});
