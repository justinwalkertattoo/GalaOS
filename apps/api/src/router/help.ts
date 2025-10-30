import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

function loadManual(): string {
  const p = path.join(process.cwd(), 'docs', 'USER_MANUAL.md');
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function searchManual(q: string, text: string): Array<{ heading: string; snippet: string }> {
  const lowerQ = q.toLowerCase();
  const sections = text.split(/\n##\s+/).map((s, i) => (i === 0 ? s : '## ' + s));
  const results: Array<{ heading: string; snippet: string }> = [];
  for (const sec of sections) {
    if (sec.toLowerCase().includes(lowerQ)) {
      const lines = sec.split('\n');
      const heading = lines[0].replace(/^#*\s*/, '').slice(0, 120);
      const snippet = sec.slice(0, 800);
      results.push({ heading, snippet });
    }
  }
  return results.slice(0, 5);
}

export const helpRouter = router({
  // Public search of local manual
  search: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(({ input }) => {
      const manual = loadManual();
      const hits = searchManual(input.q, manual);
      return { hits };
    }),

  // Ask Gala with manual as context (requires API key; falls back to search)
  ask: protectedProcedure
    .input(z.object({ q: z.string().min(1), focus: z.string().optional() }))
    .mutation( async ({ input }) => {
      const ctxText = loadManual();
      const context = ctxText.slice(0, 12000);
      const focus = input.focus ? `\nFocus: ${input.focus}` : '';
      const prompt = `Use the following manual context to answer the user's question clearly and concisely. Include step-by-step instructions if appropriate. If the answer is not in the manual, say what to configure or where to look in GalaOS.\n\nManual Context (may be partial):\n---\n${context}\n---\n\nQuestion: ${input.q}${focus}`;
      try {
        if (process.env.ANTHROPIC_API_KEY) {
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
          const res = await client.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 600, messages: [{ role: 'user', content: prompt }] });
          const text = res.content[0]?.type === 'text' ? res.content[0].text : 'No content';
          return { text, provider: 'anthropic' };
        }
        if (process.env.OPENAI_API_KEY) {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
          const res = await client.chat.completions.create({ model: 'gpt-4-turbo-preview', max_tokens: 600, messages: [{ role: 'user', content: prompt }] });
          const text = res.choices[0]?.message?.content || 'No content';
          return { text, provider: 'openai' };
        }
      } catch (e: any) {
        // fallthrough to search
      }
      const hits = searchManual(input.q, context);
      const suggestion = hits.length > 0 ? `See: ${hits.map(h=>h.heading).join('; ')}` : 'No match in manual. Try configuring keys or integrations.';
      return { text: suggestion, provider: 'heuristic' };
    }),
});

