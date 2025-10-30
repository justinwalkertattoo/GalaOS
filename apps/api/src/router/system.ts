import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { AIOrchestrator } from "@galaos/ai";
import { decide } from "../services/policy";
import { writeAudit } from "../services/audit-log";
import { prisma } from "@galaos/db";
import IORedis from "ioredis";
import axios from "axios";

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export const systemRouter = router({
  diagnostics: protectedProcedure.query(async ({ ctx }) => {
    const decision = decide(ctx, "system.diagnostics");
    writeAudit(ctx, { action: "system.diagnostics", decision });
    // Basic structural checks
    const root = process.cwd();
    const checks = {
      hasApps: fileExists(path.join(root, 'apps')),
      hasPackages: fileExists(path.join(root, 'packages')),
      apiRouter: fileExists(path.join(root, 'apps', 'api', 'src', 'router', 'index.ts')),
      webApp: fileExists(path.join(root, 'apps', 'web')),
      generatorsConfig: fileExists(path.join(root, 'turbo', 'generators', 'config.ts')),
      dockerCompose: fileExists(path.join(root, 'docker', 'docker-compose.yml')),
    } as const;

    const scripts: Record<string, string> = {};
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      Object.assign(scripts, pkg.scripts || {});
    } catch {}
    // Runtime health (DB/Redis/API)
    const health = { api: false, db: false, redis: false };
    const errors: string[] = [];
    try {
      const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
      await axios.get(`${apiUrl}/health`, { timeout: 3000 });
      health.api = true;
    } catch { errors.push('api'); }
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.db = true;
    } catch { errors.push('db'); }
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const r = new IORedis(redisUrl);
      await r.ping();
      await r.quit();
      health.redis = true;
    } catch { errors.push('redis'); }

    // Env lint (important secrets)
    const envLint = {
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
    };

    return { checks, scripts, health, envLint, errors, timestamp: new Date().toISOString() };
  }),

  selfAudit: protectedProcedure
    .input(z.object({ message: z.string(), context: z.any().optional() }))
    .mutation(async ({ ctx, input }) => {
      const decision = decide(ctx, "system.selfAudit");
      writeAudit(ctx, { action: "system.selfAudit", input, decision });
      const orchestrator = new AIOrchestrator({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        defaultProvider: 'anthropic',
      });

      // Available generators from whitelist in generators router
      const availableGenerators = ['new-package', 'nextjs-feature'];

      const audit = await orchestrator.selfAudit(input.message, input.context, {
        availableGenerators,
        env: {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
      });

      // Map audit suggestions to safe next actions (confirmation required client-side)
      writeAudit(ctx, { action: "system.selfAudit.result", input, result: audit });
      return audit;
    }),
});
