import { router, protectedProcedure } from '../trpc';
import { createWorkspaceSchema, createPageSchema, updatePageSchema } from '@galaos/types';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const workspaceRouter = router({
  // Workspaces
  create: protectedProcedure.input(createWorkspaceSchema).mutation(async ({ ctx, input }) => {
    const workspace = await ctx.prisma.workspace.create({
      data: {
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description,
        icon: input.icon,
        members: {
          create: {
            userId: ctx.user.id,
            role: 'owner',
          },
        },
      },
    });

    return workspace;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const workspaces = await ctx.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return workspaces;
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const workspace = await ctx.prisma.workspace.findFirst({
      where: {
        id: input.id,
        members: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        pages: {
          where: {
            parentId: null,
            isArchived: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!workspace) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
    }

    return workspace;
  }),

  // Pages
  createPage: protectedProcedure.input(createPageSchema).mutation(async ({ ctx, input }) => {
    const page = await ctx.prisma.page.create({
      data: {
        title: input.title,
        workspaceId: input.workspaceId,
        parentId: input.parentId,
        content: input.content,
        authorId: ctx.user.id,
      },
    });

    return page;
  }),

  getPage: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const page = await ctx.prisma.page.findUnique({
      where: { id: input.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        children: {
          where: {
            isArchived: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!page) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
    }

    return page;
  }),

  updatePage: protectedProcedure
    .input(z.object({ id: z.string(), data: updatePageSchema }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.prisma.page.update({
        where: { id: input.id },
        data: input.data,
      });

      return page;
    }),

  deletePage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete by archiving
      const page = await ctx.prisma.page.update({
        where: { id: input.id },
        data: { isArchived: true },
      });

      return page;
    }),
});
