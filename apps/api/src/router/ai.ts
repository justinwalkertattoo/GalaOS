import { router, protectedProcedure } from '../trpc';
import { chatRequestSchema } from '@galaos/types';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { rateLimit } from '../services/rate-limit';
import { checkUserLimits } from '../services/limits';
import { estimateCostUsd } from '../services/cost';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const aiRouter = router({
  chat: protectedProcedure.input(chatRequestSchema).mutation(async ({ ctx, input }) => {
    const key = `ai:chat:${ctx.user?.id || ctx.req.ip}`;
    const rl = await rateLimit(key, 60);
    if (!rl.allowed) {
      throw new Error(`Rate limited. Retry after ${rl.retryAfterMs}ms`);
    }
    if (ctx.user?.id) {
      const lim = await checkUserLimits(ctx.user.id);
      if (!lim.allowed) throw new Error(`Budget/Quota exceeded: ${lim.reason}`);
    }
    let conversationId = input.conversationId;

    // Create or get conversation
    if (!conversationId) {
      const conversation = await ctx.prisma.conversation.create({
        data: {
          userId: ctx.user.id,
          title: input.messages[0]?.content.substring(0, 100) || 'New conversation',
        },
      });
      conversationId = conversation.id;
    }

    // Save user message
    const userMessage = input.messages[input.messages.length - 1];
    await ctx.prisma.message.create({
      data: {
        conversationId,
        role: userMessage.role,
        content: userMessage.content,
      },
    });

    // Get AI response (using Anthropic by default)
    const provider = input.model?.startsWith('gpt') ? 'openai' : 'anthropic';

    let assistantMessage = '';

    if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: input.model || 'claude-3-5-sonnet-20241022',
        max_tokens: input.maxTokens || 4096,
        messages: input.messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      });

      assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
      const usage: any = (response as any).usage || {};
      const inTok = Number(usage.input_tokens || 0);
      const outTok = Number(usage.output_tokens || 0);
      const cost = estimateCostUsd('anthropic', input.model || 'claude-3-5-sonnet-20241022', inTok, outTok);
      await ctx.prisma.usageEvent.create({ data: {
        userId: ctx.user.id,
        provider: 'anthropic',
        model: input.model || 'claude-3-5-sonnet-20241022',
        endpoint: 'messages.create',
        tokensIn: inTok,
        tokensOut: outTok,
        costUsd: cost,
        status: 'ok',
      }});
      await ctx.prisma.observation.create({ data: {
        userId: ctx.user.id,
        type: 'chat',
        source: 'anthropic',
        inputText: input.messages.map(m=>`[${m.role}] ${m.content}`).join('\n'),
        outputText: assistantMessage,
        metadata: { model: input.model || 'claude-3-5-sonnet-20241022' },
        status: 'pending'
      }});
    } else {
      const response = await openai.chat.completions.create({
        model: input.model || 'gpt-4-turbo-preview',
        messages: input.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      });

      assistantMessage = response.choices[0]?.message?.content || '';
      const usage = response.usage as any;
      const inTok = Number(usage?.prompt_tokens || 0);
      const outTok = Number(usage?.completion_tokens || 0);
      const cost = estimateCostUsd('openai', input.model || 'gpt-4-turbo-preview', inTok, outTok);
      await ctx.prisma.usageEvent.create({ data: {
        userId: ctx.user.id,
        provider: 'openai',
        model: input.model || 'gpt-4-turbo-preview',
        endpoint: 'chat.completions',
        tokensIn: inTok,
        tokensOut: outTok,
        costUsd: cost,
        status: 'ok',
      }});
      await ctx.prisma.observation.create({ data: {
        userId: ctx.user.id,
        type: 'chat',
        source: 'openai',
        inputText: input.messages.map(m=>`[${m.role}] ${m.content}`).join('\n'),
        outputText: assistantMessage,
        metadata: { model: input.model || 'gpt-4-turbo-preview' },
        status: 'pending'
      }});
    }

    // Save assistant message
    await ctx.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantMessage,
      },
    });

    return {
      conversationId,
      message: {
        role: 'assistant' as const,
        content: assistantMessage,
      },
    };
  }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await ctx.prisma.conversation.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return conversations;
  }),

  getConversation: protectedProcedure
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

      return conversation;
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.prisma.conversation.delete({
        where: {
          id: input.id,
        },
      });

      return conversation;
    }),
});
