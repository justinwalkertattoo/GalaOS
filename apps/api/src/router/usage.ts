import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { rateLimit } from "../services/rate-limit";
import { alertError } from "../services/alerts";

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
      // Budget alerting: if limits set and threshold exceeded, send Slack alert
      try {
        const limits = await ctx.prisma.usageLimits.findUnique({ where: { userId: ctx.user.id } });
        if (limits && limits.alertEmail) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEvents = await ctx.prisma.usageEvent.findMany({ where: { userId: ctx.user.id, createdAt: { gte: startOfMonth } } });
          const monthUsd = monthEvents.reduce((s: number, e: any) => s + Number(e.costUsd), 0);
          const cap = Number(limits.monthlyUsdCap || 0);
          const thresholdPct = limits.alertThreshold || 80;
          if (cap > 0) {
            const pct = (monthUsd / cap) * 100;
            if (pct >= thresholdPct) {
              await alertError(`Monthly spend reached ${pct.toFixed(1)}% of cap`, { userId: ctx.user.id, monthUsd, cap });
            }
          }
        }
      } catch {}
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
      const totalUsd = events.reduce((s: number, e: any) => s + Number(e.costUsd), 0);
      const tokensIn = events.reduce((s: number, e: any) => s + e.tokensIn, 0);
      const tokensOut = events.reduce((s: number, e: any) => s + e.tokensOut, 0);
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

  explain: protectedProcedure
    .input(z.object({ focus: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      // Rate limit: 10/min per user/IP
      const key = `usage:explain:${ctx.user?.id || ctx.req.ip}`;
      const rl = await rateLimit(key, 10);
      if (!rl.allowed) {
        throw new Error(`Please wait ${Math.ceil((rl.retryAfterMs||0)/1000)}s before requesting another explanation.`);
      }
      // Gather 30-day data
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 86400000);
      const events = await ctx.prisma.usageEvent.findMany({ where: { userId: ctx.user.id, createdAt: { gte: from } } });
      const byProv: Record<string, { totalUsd: number; tokensIn: number; tokensOut: number; models: Record<string, { usd: number; inTok: number; outTok: number }> }> = {};
      for (const e of events) {
        const prov = e.provider.toLowerCase();
        const model = e.model || 'unknown';
        byProv[prov] = byProv[prov] || { totalUsd: 0, tokensIn: 0, tokensOut: 0, models: {} };
        byProv[prov].totalUsd += Number(e.costUsd);
        byProv[prov].tokensIn += e.tokensIn;
        byProv[prov].tokensOut += e.tokensOut;
        const m = byProv[prov].models[model] || { usd: 0, inTok: 0, outTok: 0 };
        m.usd += Number(e.costUsd); m.inTok += e.tokensIn; m.outTok += e.tokensOut;
        byProv[prov].models[model] = m;
      }

      const monthly = await ctx.prisma.usageEvent.findMany({ where: { userId: ctx.user.id, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } });
      const monthUsd = monthly.reduce((s: number, e: any) => s + Number(e.costUsd), 0);

      const contextObj = {
        period: { from: from.toISOString(), to: now.toISOString() },
        totalUsd30d: Object.values(byProv).reduce((s: number, v: any)=> s+v.totalUsd, 0),
        totalUsdMonth: monthUsd,
        providers: byProv,
        focus: input?.focus || ''
      };

      const prompt = `You are Gala, an AI architect and cost optimizer.
Given the following usage metrics JSON, explain spending and suggest concrete ways to consolidate and reduce token and cost usage without reducing quality.
Prioritize: batching requests, response truncation, selective model choice, caching, streaming, real max_tokens, temperature adjustments, tool/function use, and reuse of context.
Return:
- A short overview (2-3 sentences)
- Key drivers (bulleted)
- Top 8 optimization actions (bulleted, actionable, with estimated impact)
JSON (do not echo back fully; summarize):\n${JSON.stringify(contextObj).slice(0, 8000)}\n`;

      // Choose provider
      const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
      const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
      try {
        if (hasAnthropic) {
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
          const res = await client.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 800, messages: [{ role: 'user', content: prompt }] });
          const text = res.content[0]?.type === 'text' ? res.content[0].text : 'No content';
          return { text, provider: 'anthropic' };
        }
        if (hasOpenAI) {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
          const res = await client.chat.completions.create({ model: 'gpt-4-turbo-preview', max_tokens: 800, messages: [{ role: 'user', content: prompt }] });
          const text = res.choices[0]?.message?.content || 'No content';
          return { text, provider: 'openai' };
        }
      } catch (e: any) {
        // Fall back to heuristic output below
      }

      // Heuristic fallback if no keys or error
      const topProv = Object.entries(byProv).sort((a,b)=> b[1].totalUsd - a[1].totalUsd)[0]?.[0] || 'n/a';
      const suggestions = [
        'Reduce max_tokens where possible and truncate long outputs.',
        'Prefer smaller/cheaper models for classification or routing steps; reserve premium models for final generation.',
        'Batch related requests and cache identical prompts/responses.',
        'Use tool/function calls to retrieve structured data instead of long generations.',
        'Stream responses and stop early when sufficient.',
        'Consolidate system prompts and reuse context between turns to reduce input tokens.',
        `Audit highest-cost provider: ${topProv}; downshift models where quality is unaffected.`,
        'Add guardrails to avoid retries/looping on tool errors.'
      ];
      const text = `Overview: Total 30d spend $${contextObj.totalUsd30d.toFixed(4)}. Month-to-date $${contextObj.totalUsdMonth.toFixed(4)}.
Top optimization actions:\n- ${suggestions.join('\n- ')}`;
      return { text, provider: 'heuristic' };
    }),
});
