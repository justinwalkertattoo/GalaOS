import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  category: z.string(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
  requirements: z.record(z.any()).optional(),
  effects: z.record(z.any()),
  tier: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
  xpCost: z.number().int().min(0).default(100),
});

export const skillsRouter = router({
  // List all skills (user's + system)
  list: protectedProcedure.query(async ({ ctx }) => {
    const skills = await ctx.prisma.skill.findMany({
      where: {
        OR: [{ userId: ctx.user.id }, { userId: null }], // User's skills + system skills
      },
      orderBy: { createdAt: 'desc' },
    });

    return skills;
  }),

  // Get skill tree (hierarchical structure)
  tree: protectedProcedure.query(async ({ ctx }) => {
    const skills = await ctx.prisma.skill.findMany({
      where: {
        OR: [{ userId: ctx.user.id }, { userId: null }],
      },
      include: {
        children: true,
        parent: true,
      },
    });

    // Build tree structure (root nodes = skills with no parent)
    const rootSkills = skills.filter((s: any) => !s.parentId);

    const buildTree = (parentId: string | null): any[] => {
      return skills
        .filter((s: any) => s.parentId === parentId)
        .map((skill: any) => ({
          ...skill,
          children: buildTree(skill.id),
        }));
    };

    return rootSkills.map((skill: any) => ({
      ...skill,
      children: buildTree(skill.id),
    }));
  }),

  // Get single skill
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const skill = await ctx.prisma.skill.findFirst({
        where: {
          id: input.id,
          OR: [{ userId: ctx.user.id }, { userId: null }],
        },
        include: {
          children: true,
          parent: true,
        },
      });

      if (!skill) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return skill;
    }),

  // Create skill
  create: protectedProcedure
    .input(createSkillSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate parent exists if provided
      if (input.parentId) {
        const parent = await ctx.prisma.skill.findFirst({
          where: {
            id: input.parentId,
            OR: [{ userId: ctx.user.id }, { userId: null }],
          },
        });

        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent skill not found',
          });
        }
      }

      const skill = await ctx.prisma.skill.create({
        data: {
          ...input,
          userId: ctx.user.id,
          requirements: input.requirements || {},
        },
      });

      return skill;
    }),

  // Update skill
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: createSkillSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.skill.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Can only update own skills
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Validate parent exists if provided
      if (input.data.parentId) {
        const parent = await ctx.prisma.skill.findFirst({
          where: {
            id: input.data.parentId,
            OR: [{ userId: ctx.user.id }, { userId: null }],
          },
        });

        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent skill not found',
          });
        }

        // Prevent circular dependencies
        if (input.data.parentId === input.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'A skill cannot be its own parent',
          });
        }
      }

      const skill = await ctx.prisma.skill.update({
        where: { id: input.id },
        data: input.data,
      });

      return skill;
    }),

  // Delete skill
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.prisma.skill.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id, // Can only delete own skills
        },
        include: {
          children: true,
        },
      });

      if (!skill) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Check if skill has children
      if (skill.children.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete skill with children. Delete or reassign children first.',
        });
      }

      await ctx.prisma.skill.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Toggle skill active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const skill = await ctx.prisma.skill.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!skill) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const updated = await ctx.prisma.skill.update({
        where: { id: input.id },
        data: { isActive: !skill.isActive },
      });

      return updated;
    }),

  // Get skills statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const skills = await ctx.prisma.skill.findMany({
      where: { userId: ctx.user.id },
    });

    const byCategory = skills.reduce((acc: Record<string, number>, skill: any) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTier = skills.reduce((acc: Record<string, number>, skill: any) => {
      acc[skill.tier] = (acc[skill.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalXpCost = skills.reduce((sum: number, skill: any) => sum + skill.xpCost, 0);

    return {
      total: skills.length,
      active: skills.filter((s: any) => s.isActive).length,
      byCategory,
      byTier,
      totalXpCost,
      rootSkills: skills.filter((s: any) => !s.parentId).length,
    };
  }),

  // Get skills by category
  byCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      const skills = await ctx.prisma.skill.findMany({
        where: {
          category: input.category,
          OR: [{ userId: ctx.user.id }, { userId: null }],
        },
        include: {
          children: true,
          parent: true,
        },
        orderBy: { tier: 'desc' },
      });

      return skills;
    }),
});
