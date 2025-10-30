import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

export const usageRouter = router({
  setLimits: protectedProcedure
    .input(z.object({
      dailyUsdCap: z.number().nonnegative().default(0),
      monthlyUsdCap: z.number().nonnegative().default(0),
      perMinute: z.number().int().positive().default(60),
      perHour: z.number().int().positive().default(2000),
      perDay: z.number().int().positive().default(20000),
      alertEmail: z.string().email().optional(),
      alertThreshold: z.number().int().min(1).max(100).default(80),
    }))
    .mutation(async ({ ctx, input }) => {
      const limits = await ctx.prisma.usageLimits.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...input },
        update: { ...input },
      });
      return limits;
    }),

  getLimits: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.usageLimits.findUnique({ where: { userId: ctx.user.id } });
  }),

  record: protectedProcedure
    .input(z.object({
      provider: z.string(),
      model: z.string().optional(),
      endpoint: z.string().optional(),
      tokensIn: z.number().int().min(0).default(0),
      tokensOut: z.number().int().min(0).default(0),
      costUsd: z.number().min(0).default(0),
      status: z.enum(["ok", "error", "throttled"]).default("ok"),
      requestId: z.string().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.prisma.usageEvent.create({
        data: { userId: ctx.user.id, ...input },
      });
      return created;
    }),

  summary: protectedProcedure
    .input(z.object({ range: z.enum(["day", "month"]).default("day") }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const from = new Date(now);
      if ((input?.range ?? 'day') === 'day') {
        from.setHours(0, 0, 0, 0);
      } else {
        from.setDate(1); from.setHours(0,0,0,0);
      }
      const events = await ctx.prisma.usageEvent.findMany({
        where: { userId: ctx.user.id, createdAt: { gte: from } },
      });
      const totalUsd = events.reduce((s, e) => s + Number(e.costUsd), 0);
      const tokensIn = events.reduce((s, e) => s + e.tokensIn, 0);
      const tokensOut = events.reduce((s, e) => s + e.tokensOut, 0);
      // Simple monthly forecast: daily avg * days remaining
      let forecast = 0;
      if ((input?.range ?? 'day') === 'month') {
        const day = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
        const avgPerDay = day > 0 ? totalUsd / day : 0;
        forecast = Math.max(0, avgPerDay * daysInMonth);
      }
      return { from, to: now, count: events.length, totalUsd, tokensIn, tokensOut, forecast };
    }),

  breakdown: protectedProcedure
    .input(z.object({ range: z.enum(["day","month"]).default("day") }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const from = new Date(now);
      if ((input?.range ?? 'day') === 'day') from.setHours(0,0,0,0); else { from.setDate(1); from.setHours(0,0,0,0);} 
      const events = await ctx.prisma.usageEvent.findMany({ where: { userId: ctx.user.id, createdAt: { gte: from } } });
      const byProvider: Record<string, { totalUsd: number; models: Record<string, number> }> = {};
      for (const e of events) {
        const prov = e.provider;
        const model = e.model || 'unknown';
        byProvider[prov] = byProvider[prov] || { totalUsd: 0, models: {} };
        byProvider[prov].totalUsd += Number(e.costUsd);
        byProvider[prov].models[model] = (byProvider[prov].models[model] || 0) + Number(e.costUsd);
      }
      return byProvider;
    }),

  series: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(60).default(14) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 14;
      const now = new Date();
      const from = new Date(now.getTime() - days * 86400000);
      const events = await ctx.prisma.usageEvent.findMany({ where: { userId: ctx.user.id, createdAt: { gte: from } } });
      const buckets: Record<string, number> = {};
      for (let i=0;i<=days;i++) {
        const d = new Date(from.getTime() + i * 86400000);
        const key = d.toISOString().slice(0,10);
        buckets[key] = 0;
      }
      for (const e of events) {
        const key = e.createdAt.toISOString().slice(0,10);
        if (buckets[key] !== undefined) buckets[key] += Number(e.costUsd);
      }
      return Object.entries(buckets).map(([date, totalUsd]) => ({ date, totalUsd }));
    }),
});
