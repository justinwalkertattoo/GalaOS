import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { decide, isSuperUser } from '../services/policy';
import { writeAudit } from '../services/audit-log';
import { runCommand } from '../services/exec';
import { safeRead, safeWrite, safeMove, safeDelete } from '../services/fs';
import { isHostAllowed } from '../services/net-policy';
import axios from 'axios';

export const agentExecRouter = router({
  run: protectedProcedure
    .input(z.object({ cmd: z.string().min(1), args: z.array(z.string()).default([]), cwd: z.string().optional(), timeoutMs: z.number().int().positive().max(10*60*1000).default(60000), override: z.boolean().optional() }))
    .mutation( async ({ ctx, input }) => {
      const decision = decide(ctx, 'shell.exec', input.cmd);
      writeAudit(ctx, { action: 'shell.exec', input, decision });
      // Restrict overrides to admins only. Non-admin override is ignored.
      const allow = decision.allow || (Boolean(input.override) && isSuperUser(ctx));
      if (!allow) return { ok: false as const, error: decision.reason || 'Denied' };
      const res = await runCommand(input.cmd, input.args, { cwd: input.cwd, timeoutMs: input.timeoutMs });
      writeAudit(ctx, { action: 'shell.exec.result', input, result: { code: res.code } });
      return { ok: res.code === 0 as const, ...res };
    }),

  readFile: protectedProcedure
    .input(z.object({ path: z.string().min(1), override: z.boolean().optional() }))
    .mutation(({ ctx, input }) => {
      const decision = decide(ctx, 'files.read', input.path);
      writeAudit(ctx, { action: 'files.read', input, decision });
      const allow = decision.allow || (Boolean(input.override) && isSuperUser(ctx));
      if (!allow) return { ok: false as const, error: decision.reason || 'Denied' };
      const res = safeRead(input.path, Boolean(input.override && isSuperUser(ctx)));
      writeAudit(ctx, { action: 'files.read.result', input, result: { ok: res.ok } });
      return res;
    }),

  writeFile: protectedProcedure
    .input(z.object({ path: z.string().min(1), content: z.string(), override: z.boolean().optional() }))
    .mutation(({ ctx, input }) => {
      const decision = decide(ctx, 'files.write', input.path);
      writeAudit(ctx, { action: 'files.write', input: { path: input.path, size: input.content.length }, decision });
      const allow = decision.allow || (Boolean(input.override) && isSuperUser(ctx));
      if (!allow) return { ok: false as const, error: decision.reason || 'Denied' };
      const res = safeWrite(input.path, input.content, Boolean(input.override && isSuperUser(ctx)));
      writeAudit(ctx, { action: 'files.write.result', input: { path: input.path }, result: res });
      return res;
    }),

  move: protectedProcedure
    .input(z.object({ src: z.string().min(1), dest: z.string().min(1), override: z.boolean().optional() }))
    .mutation(({ ctx, input }) => {
      const decision = decide(ctx, 'files.move', `${input.src} -> ${input.dest}`);
      writeAudit(ctx, { action: 'files.move', input, decision });
      const allow = decision.allow || (Boolean(input.override) && isSuperUser(ctx));
      if (!allow) return { ok: false as const, error: decision.reason || 'Denied' };
      const res = safeMove(input.src, input.dest, Boolean(input.override && isSuperUser(ctx)));
      writeAudit(ctx, { action: 'files.move.result', input, result: res });
      return res;
    }),

  remove: protectedProcedure
    .input(z.object({ path: z.string().min(1), override: z.boolean().optional() }))
    .mutation(({ ctx, input }) => {
      const decision = decide(ctx, 'files.delete', input.path);
      writeAudit(ctx, { action: 'files.delete', input, decision });
      const allow = decision.allow || (Boolean(input.override) && isSuperUser(ctx));
      if (!allow) return { ok: false as const, error: decision.reason || 'Denied' };
      const res = safeDelete(input.path, Boolean(input.override && isSuperUser(ctx)));
      writeAudit(ctx, { action: 'files.delete.result', input, result: res });
      return res;
    }),

  fetch: protectedProcedure
    .input(z.object({ url: z.string().url(), method: z.enum(['GET','POST','PUT','DELETE']).default('GET'), body: z.any().optional(), headers: z.record(z.string()).optional(), timeoutMs: z.number().int().positive().max(120000).default(30000), override: z.boolean().optional() }))
    .mutation( async ({ ctx, input }) => {
      const decision = decide(ctx, 'net.fetch', input.url);
      writeAudit(ctx, { action: 'net.fetch', input: { url: input.url, method: input.method }, decision });
      if (!decision.allow && !(input.override && isSuperUser(ctx))) return { ok: false as const, error: decision.reason || 'Denied' };
      try {
        const { hostname } = new URL(input.url);
        const hostPol = isHostAllowed(hostname);
        if (!hostPol.allowed && !(input.override && isSuperUser(ctx))) {
          return { ok: false as const, error: hostPol.reason || 'Host not allowed' };
        }
      } catch {}
      try {
        const res = await axios.request({ url: input.url, method: input.method, data: input.body, headers: input.headers, timeout: input.timeoutMs, responseType: 'text' });
        writeAudit(ctx, { action: 'net.fetch.result', input: { url: input.url }, result: { status: res.status } });
        return { ok: true as const, status: res.status, headers: res.headers, body: String(res.data).slice(0, 1024*128) };
      } catch (e: any) {
        writeAudit(ctx, { action: 'net.fetch.result', input: { url: input.url }, result: { error: e.message } });
        return { ok: false as const, error: e.message };
      }
    }),
});
