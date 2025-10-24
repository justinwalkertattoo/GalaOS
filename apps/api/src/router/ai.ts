import { router, protectedProcedure } from '../trpc';
import { chatRequestSchema } from '@galaos/types';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const aiRouter = router({
  chat: protectedProcedure.input(chatRequestSchema).mutation(async ({ ctx, input }) => {
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
