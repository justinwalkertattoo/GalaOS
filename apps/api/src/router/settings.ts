import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { encryptionService } from '../services/encryption';

const apiKeyTypes = [
  'anthropic',
  'openai',
  'buffer',
  'instagram',
  'sendgrid',
  'stripe',
  'other'
] as const;

export const settingsRouter = router({
  // Get all API keys for current user (without actual keys)
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await ctx.prisma.apiKey.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return keys;
  }),

  // Add new API key
  addApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(apiKeyTypes),
        key: z.string().min(1),
        scopes: z.array(z.string()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if key with this name already exists
      const existing = await ctx.prisma.apiKey.findFirst({
        where: {
          userId: ctx.user.id,
          name: input.name,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An API key with this name already exists',
        });
      }

      // Encrypt the key
      const encryptedKey = encryptionService.encrypt(input.key);

      // Create preview (first 8 chars + ...)
      const keyPreview = input.key.substring(0, 8) + '...';

      // Create API key
      const apiKey = await ctx.prisma.apiKey.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          key: encryptedKey,
          keyPreview,
          scopes: input.scopes || [],
          expiresAt: input.expiresAt,
        },
        select: {
          id: true,
          name: true,
          keyPreview: true,
          scopes: true,
          createdAt: true,
        },
      });

      return apiKey;
    }),

  // Test API key
  testApiKey: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      // Decrypt the key
      const decryptedKey = encryptionService.decrypt(apiKey.key);

      // Test based on key name/type
      let testResult = { success: false, message: '' };

      try {
        if (apiKey.name.toLowerCase().includes('anthropic')) {
          // Test Anthropic key
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': decryptedKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });

          testResult = {
            success: response.ok,
            message: response.ok ? 'Anthropic API key is valid' : 'Invalid Anthropic API key',
          };
        } else if (apiKey.name.toLowerCase().includes('openai')) {
          // Test OpenAI key
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              Authorization: `Bearer ${decryptedKey}`,
            },
          });

          testResult = {
            success: response.ok,
            message: response.ok ? 'OpenAI API key is valid' : 'Invalid OpenAI API key',
          };
        } else if (apiKey.name.toLowerCase().includes('buffer')) {
          // Test Buffer key
          const response = await fetch('https://api.bufferapp.com/1/profiles.json', {
            headers: {
              Authorization: `Bearer ${decryptedKey}`,
            },
          });

          testResult = {
            success: response.ok,
            message: response.ok ? 'Buffer API key is valid' : 'Invalid Buffer API key',
          };
        } else if (apiKey.name.toLowerCase().includes('sendgrid')) {
          // Test SendGrid key
          const response = await fetch('https://api.sendgrid.com/v3/scopes', {
            headers: {
              Authorization: `Bearer ${decryptedKey}`,
            },
          });

          testResult = {
            success: response.ok,
            message: response.ok ? 'SendGrid API key is valid' : 'Invalid SendGrid API key',
          };
        } else {
          testResult = {
            success: true,
            message: 'API key stored successfully (test not implemented for this provider)',
          };
        }

        // Update last used timestamp if test was successful
        if (testResult.success) {
          await ctx.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          });
        }
      } catch (error) {
        testResult = {
          success: false,
          message: error instanceof Error ? error.message : 'Test failed',
        };
      }

      return testResult;
    }),

  // Delete API key
  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      await ctx.prisma.apiKey.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get decrypted API key (for internal use only - be careful!)
  getDecryptedKey: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: {
          userId: ctx.user.id,
          name: input.name,
        },
      });

      if (!apiKey) {
        return null;
      }

      // Decrypt and return
      const decryptedKey = encryptionService.decrypt(apiKey.key);

      // Update last used
      await ctx.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return decryptedKey;
    }),
});
